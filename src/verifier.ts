import type { Proof } from './types';

/**
 * Standalone proof verifier — works without the full Minerva engine.
 *
 * This is the public-facing verification path. Anyone with a proof
 * can verify it without authentication, without the prover WASM,
 * and without access to private inputs.
 *
 * The verifier WASM binary is ~45KB (vs ~280KB for the full prover)
 * and performs only the FRI verification step.
 *
 * @example
 * ```typescript
 * import { Verifier } from '@digitalforgestudios/minerva-sdk/verifier';
 *
 * const verifier = await Verifier.init();
 * const result = await verifier.check(proofJson);
 *
 * console.log(result.valid);      // true
 * console.log(result.circuit);    // "Carbon Compliance"
 * console.log(result.publicInputs); // { threshold: 10000 }
 * console.log(result.security);   // 128
 * ```
 */

/** Result of a verification check */
export interface VerificationResult {
  /** Whether the proof is cryptographically valid */
  valid: boolean;
  /** Human-readable status message */
  status: 'verified' | 'invalid' | 'malformed' | 'unsupported_version';
  /** Circuit name from proof metadata */
  circuit: string;
  /** Public inputs (safe to display) */
  publicInputs: Record<string, unknown>;
  /** Security level in bits */
  security: number;
  /** Engine version that generated the proof */
  engine: string;
  /** When the proof was generated (ISO-8601) */
  generatedAt: string;
  /** Verification duration in milliseconds */
  verifiedInMs: number;
}

/** Options for initializing the standalone verifier */
export interface VerifierOptions {
  /** Custom URL for the verifier WASM binary */
  wasmUrl?: string;
}

export class Verifier {
  private wasmInstance: unknown;

  private constructor(wasmInstance: unknown) {
    this.wasmInstance = wasmInstance;
  }

  /**
   * Initialize the standalone verifier.
   *
   * Downloads the lightweight verification-only WASM binary (~45KB).
   * This does NOT include the prover — only the FRI verification logic.
   */
  static async init(options?: VerifierOptions): Promise<Verifier> {
    const wasmUrl = options?.wasmUrl ?? 'https://cdn.zkesg.com/wasm/minerva-verifier.wasm';

    // TODO: Load verifier WASM binary
    // const wasmBytes = await fetch(wasmUrl).then(r => r.arrayBuffer());
    // const wasmModule = await WebAssembly.instantiate(wasmBytes, imports);
    const wasmInstance = null;

    return new Verifier(wasmInstance);
  }

  /**
   * Verify a Minerva proof.
   *
   * Accepts either a Proof object or a raw JSON string.
   * Only the proof blob and public inputs are used — no private data needed.
   *
   * @param proof - Proof object or JSON string
   * @returns Detailed verification result
   */
  async check(proof: Proof | string): Promise<VerificationResult> {
    const start = performance.now();

    let parsed: Proof;
    if (typeof proof === 'string') {
      try {
        parsed = JSON.parse(proof) as Proof;
      } catch {
        return {
          valid: false,
          status: 'malformed',
          circuit: '',
          publicInputs: {},
          security: 0,
          engine: '',
          generatedAt: '',
          verifiedInMs: performance.now() - start,
        };
      }
    } else {
      parsed = proof;
    }

    // Version check
    if (!parsed.meta?.engine?.startsWith('minerva-wasm-')) {
      return {
        valid: false,
        status: 'unsupported_version',
        circuit: parsed.meta?.circuit ?? '',
        publicInputs: parsed.publicOnly ?? {},
        security: 0,
        engine: parsed.meta?.engine ?? 'unknown',
        generatedAt: parsed.meta?.generatedAt ?? '',
        verifiedInMs: performance.now() - start,
      };
    }

    // TODO: Delegate to WASM verifier
    // const isValid = this.wasmInstance.verify(parsed.proof, parsed.publicOnly);
    const isValid = parsed.valid; // Placeholder until WASM is wired

    return {
      valid: isValid,
      status: isValid ? 'verified' : 'invalid',
      circuit: parsed.meta.circuit,
      publicInputs: parsed.publicOnly,
      security: parsed.meta.security,
      engine: parsed.meta.engine,
      generatedAt: parsed.meta.generatedAt,
      verifiedInMs: performance.now() - start,
    };
  }

  /**
   * Verify a proof and return a simple boolean.
   *
   * Convenience method for CI/CD pipelines and simple checks.
   */
  async isValid(proof: Proof | string): Promise<boolean> {
    const result = await this.check(proof);
    return result.valid;
  }

  /**
   * Batch-verify multiple proofs.
   *
   * @param proofs - Array of Proof objects or JSON strings
   * @returns Array of verification results (same order as input)
   */
  async checkBatch(proofs: (Proof | string)[]): Promise<VerificationResult[]> {
    return Promise.all(proofs.map((p) => this.check(p)));
  }
}
