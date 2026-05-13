import type { Proof } from './types';

/**
 * Shape of the WASM module loaded from zkesg.com.
 * Must match the #[wasm_bindgen] exports in mwa/src/lib.rs.
 */
interface WasmModule {
  default: (input?: string | URL | RequestInfo) => Promise<unknown>;
  verify_proof: (json: string) => boolean;
  get_system_info?: () => string;
}

/**
 * Standalone proof verifier — works without the full Minerva engine.
 *
 * Downloads the same WASM binary as the Minerva engine but only uses
 * the verification path. Performs real Winterfell STARK verification.
 *
 * @example
 * ```typescript
 * import { Verifier } from '@digitalforgestudios/minerva-sdk/verifier';
 *
 * const verifier = await Verifier.init();
 * const result = await verifier.check(proofJson);
 *
 * console.log(result.valid);        // true
 * console.log(result.publicInputs); // { threshold: 10000 }
 * ```
 */

/** Result of a verification check */
export interface VerificationResult {
  /** Whether the proof is cryptographically valid */
  valid: boolean;
  /** Human-readable status message */
  status: 'verified' | 'invalid' | 'malformed' | 'error';
  /** Public inputs (safe to display) */
  publicInputs: Record<string, unknown>;
  /** Circuit hash from proof metadata */
  circuitHash: string;
  /** When the proof was generated (ISO-8601) */
  generatedAt: string;
  /** Verification duration in milliseconds */
  verifiedInMs: number;
  /** Error message (only when status is 'malformed' or 'error') */
  error?: string;
}

/** Options for initializing the standalone verifier */
export interface VerifierOptions {
  /** Custom URL for the WASM binary (default: https://zkesg.com/wasm/minerva_wasm_bg.wasm) */
  wasmUrl?: string;
}

export class Verifier {
  private wasm: WasmModule;

  private constructor(wasm: WasmModule) {
    this.wasm = wasm;
  }

  /**
   * Initialize the standalone verifier.
   *
   * Downloads the Minerva WASM binary from zkesg.com.
   */
  static async init(options?: VerifierOptions): Promise<Verifier> {
    const wasmUrl = options?.wasmUrl ?? 'https://zkesg.com/wasm/minerva_wasm_bg.wasm';
    const jsGlueUrl = wasmUrl.replace(/_bg\.wasm$/, '.js');

    const script = await fetch(jsGlueUrl).then((r) => {
      if (!r.ok) throw new Error(`Failed to fetch Minerva WASM glue: ${r.status} ${r.statusText}`);
      return r.text();
    });

    const blob = new Blob([script], { type: 'application/javascript' });
    const blobUrl = URL.createObjectURL(blob);

    let mod: WasmModule;
    try {
      mod = await import(/* webpackIgnore: true */ blobUrl) as WasmModule;
      await mod.default(wasmUrl);
    } finally {
      URL.revokeObjectURL(blobUrl);
    }

    return new Verifier(mod);
  }

  /**
   * Verify a Minerva proof with full cryptographic verification.
   *
   * Accepts either a Proof object, a raw ProofOutput JSON string,
   * or a parsed ProofOutput object.
   *
   * @param proof - Proof object, ProofOutput JSON string, or ProofOutput object
   * @returns Detailed verification result
   */
  async check(proof: Proof | string | Record<string, unknown>): Promise<VerificationResult> {
    const start = performance.now();

    let proofJson: string;

    if (typeof proof === 'string') {
      proofJson = proof;
    } else if ('toJSON' in proof && typeof (proof as Proof).toJSON === 'function') {
      proofJson = (proof as Proof).toJSON();
    } else {
      proofJson = JSON.stringify(proof);
    }

    // Validate it parses at all
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(proofJson);
    } catch {
      return {
        valid: false,
        status: 'malformed',
        publicInputs: {},
        circuitHash: '',
        generatedAt: '',
        verifiedInMs: performance.now() - start,
        error: 'Invalid JSON',
      };
    }

    // Check required fields
    const proofBlob = parsed.proof as string | undefined;
    if (!proofBlob || typeof proofBlob !== 'string' || !proofBlob.startsWith('WINTERFELL_PROOF_')) {
      return {
        valid: false,
        status: 'malformed',
        publicInputs: {},
        circuitHash: '',
        generatedAt: '',
        verifiedInMs: performance.now() - start,
        error: 'Missing or invalid proof blob (expected WINTERFELL_PROOF_ prefix)',
      };
    }

    // Run real WASM verification
    try {
      const isValid = this.wasm.verify_proof(proofJson);
      const elapsed = performance.now() - start;

      const rawInputs = parsed.public_inputs as Record<string, unknown> | undefined;
      const publicInputs: Record<string, unknown> = (rawInputs?.data as Record<string, unknown>) ?? rawInputs ?? {};

      return {
        valid: isValid,
        status: isValid ? 'verified' : 'invalid',
        publicInputs,
        circuitHash: (parsed.circuit_hash as string) ?? '',
        generatedAt: (parsed.generated_at as string) ?? '',
        verifiedInMs: elapsed,
      };
    } catch (e) {
      return {
        valid: false,
        status: 'error',
        publicInputs: {},
        circuitHash: '',
        generatedAt: '',
        verifiedInMs: performance.now() - start,
        error: `Verification error: ${e}`,
      };
    }
  }

  /**
   * Verify a proof and return a simple boolean.
   *
   * Convenience method for CI/CD pipelines and simple checks.
   */
  async isValid(proof: Proof | string | Record<string, unknown>): Promise<boolean> {
    const result = await this.check(proof);
    return result.valid;
  }

  /**
   * Batch-verify multiple proofs.
   *
   * @param proofs - Array of Proof objects or JSON strings
   * @returns Array of verification results (same order as input)
   */
  async checkBatch(proofs: (Proof | string | Record<string, unknown>)[]): Promise<VerificationResult[]> {
    return Promise.all(proofs.map((p) => this.check(p)));
  }
}
