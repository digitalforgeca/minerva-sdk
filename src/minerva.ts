import type { Circuit, MinervaOptions, Proof, EvaluationResult } from './types';

/**
 * Shape of the WASM module loaded from zkesg.com.
 * Must match the #[wasm_bindgen] exports in mwa/src/lib.rs.
 */
interface WasmModule {
  default: (input?: string | URL | RequestInfo) => Promise<unknown>;
  generate_proof: (json: string) => string;
  verify_proof: (json: string) => boolean;
  generate_proof_chain?: (json: string) => string;
  verify_proof_chain?: (json: string) => boolean;
  generate_proof_auto?: (json: string) => string;
  get_system_info?: () => string;
}

/**
 * Minerva — ZK-STARK proof engine client
 *
 * Initializes the WASM proving engine and provides methods for
 * generating and verifying zero-knowledge proofs client-side.
 *
 * @example
 * ```typescript
 * const minerva = await Minerva.init();
 * const proof = await minerva.prove(circuit, inputs);
 * const valid = await minerva.verify(proof);
 * ```
 */
export class Minerva {
  private wasm: WasmModule;
  private options: Required<MinervaOptions>;

  private constructor(wasm: WasmModule, options: Required<MinervaOptions>) {
    this.wasm = wasm;
    this.options = options;
  }

  /**
   * Initialize the Minerva WASM engine.
   *
   * Downloads and instantiates the WASM binary from zkesg.com.
   * This must be called before generating or verifying proofs.
   */
  static async init(options?: MinervaOptions): Promise<Minerva> {
    const resolved: Required<MinervaOptions> = {
      wasmUrl: options?.wasmUrl ?? 'https://zkesg.com/wasm/minerva_wasm_bg.wasm',
      threads: options?.threads ?? 1,
      apiBaseUrl: options?.apiBaseUrl ?? 'https://zkesg.com/api',
    };

    // Derive the JS glue URL from the WASM URL
    const jsGlueUrl = resolved.wasmUrl.replace(/_bg\.wasm$/, '.js');

    // Fetch and load the JS glue as a blob URL to avoid bundler issues
    const script = await fetch(jsGlueUrl).then((r) => {
      if (!r.ok) throw new Error(`Failed to fetch Minerva WASM glue: ${r.status} ${r.statusText}`);
      return r.text();
    });

    const blob = new Blob([script], { type: 'application/javascript' });
    const blobUrl = URL.createObjectURL(blob);

    let mod: WasmModule;
    try {
      mod = await import(/* webpackIgnore: true */ blobUrl) as WasmModule;
      await mod.default(resolved.wasmUrl);
    } finally {
      URL.revokeObjectURL(blobUrl);
    }

    return new Minerva(mod, resolved);
  }

  /**
   * Generate a zero-knowledge proof.
   *
   * Evaluates the circuit with the given inputs and produces a
   * STARK proof. Private inputs are used locally and never transmitted.
   *
   * @param circuit - MinervaFormat circuit definition
   * @param inputs - Optional input overrides (merged with circuit defaults)
   * @returns A Proof object with the cryptographic proof and public inputs
   */
  async prove(
    circuit: Circuit,
    inputs?: { public?: Record<string, unknown>; private?: Record<string, unknown> }
  ): Promise<Proof> {
    const mergedPublic = { ...circuit.inputs.public, ...inputs?.public };
    const mergedPrivate = { ...circuit.inputs.private, ...inputs?.private };

    // Build MinervaFormat JSON for the WASM engine
    const minervaFormat = {
      inputs: {
        public: { data: mergedPublic },
        private: { data: mergedPrivate },
      },
      circuit: circuit.circuit,
      meta: circuit.meta,
    };

    const resultJson = this.wasm.generate_proof_auto
      ? this.wasm.generate_proof_auto(JSON.stringify(minervaFormat))
      : this.wasm.generate_proof(JSON.stringify(minervaFormat));

    const proofOutput = JSON.parse(resultJson);

    const proof: Proof = {
      valid: true,
      hash: proofOutput.circuit_hash ?? '',
      proof: proofOutput.proof ?? '',
      publicOnly: proofOutput.public_inputs?.data ?? proofOutput.public_inputs ?? mergedPublic,
      meta: {
        circuit: circuit.meta.name,
        engine: `minerva-wasm-${this.getVersion()}`,
        security: 128,
        generatedAt: proofOutput.generated_at ?? new Date().toISOString(),
      },
      toJSON() {
        return JSON.stringify({
          proof: this.proof,
          public_inputs: this.publicOnly,
          circuit: circuit.circuit,
          circuit_hash: this.hash,
          generated_at: this.meta.generatedAt,
        });
      },
      toLinkedInShare(options) {
        const text = encodeURIComponent(`${options.title}\n\n${options.description ?? ''}\n\nVerified with Minerva ZK-STARK Engine — https://zkesg.com`);
        return `https://www.linkedin.com/sharing/share-offsite/?text=${text}`;
      },
    };

    return proof;
  }

  /**
   * Verify a proof cryptographically using the WASM engine.
   *
   * @param proof - A Proof object (from prove() or deserialized JSON)
   * @returns true if the proof is cryptographically valid
   */
  async verify(proof: Proof): Promise<boolean> {
    // Convert to the ProofOutput format the WASM verifier expects
    const proofJson = typeof proof.toJSON === 'function'
      ? proof.toJSON()
      : JSON.stringify(proof);

    return this.wasm.verify_proof(proofJson);
  }

  /**
   * Verify a raw ProofOutput JSON string directly.
   *
   * Accepts the native Minerva ProofOutput format (proof, public_inputs, circuit).
   *
   * @param proofOutputJson - Raw ProofOutput JSON string
   * @returns true if the proof is cryptographically valid
   */
  async verifyRaw(proofOutputJson: string): Promise<boolean> {
    return this.wasm.verify_proof(proofOutputJson);
  }

  /**
   * Get the WASM engine version and capabilities.
   */
  getVersion(): string {
    if (this.wasm.get_system_info) {
      try {
        const info = JSON.parse(this.wasm.get_system_info());
        return info.version ?? '0.1.0';
      } catch {
        return '0.1.0';
      }
    }
    return '0.1.0';
  }

  /**
   * Evaluate a circuit locally without generating a cryptographic proof.
   *
   * This is fast and synchronous — useful for testing and UI previews.
   *
   * @param circuit - MinervaFormat circuit definition
   * @param inputs - Input values to evaluate
   * @returns Gate-by-gate evaluation results
   */
  evaluate(
    circuit: Circuit,
    inputs?: { public?: Record<string, unknown>; private?: Record<string, unknown> }
  ): EvaluationResult {
    const allInputs = {
      ...circuit.inputs.public,
      ...circuit.inputs.private,
      ...inputs?.public,
      ...inputs?.private,
    };

    const gateResults = circuit.circuit.gates.map((gate) => {
      const left = Number(allInputs[gate.left] ?? 0);
      const right = Number(allInputs[gate.right] ?? 0);

      let passed = false;
      let explanation = '';

      switch (gate.type) {
        case 'gt':
          passed = left > right;
          explanation = `${gate.left} (${left}) ${passed ? '>' : '≤'} ${gate.right} (${right})`;
          break;
        case 'lt':
          passed = left < right;
          explanation = `${gate.left} (${left}) ${passed ? '<' : '≥'} ${gate.right} (${right})`;
          break;
        case 'eq':
          passed = left === right;
          explanation = `${gate.left} (${left}) ${passed ? '==' : '!='} ${gate.right} (${right})`;
          break;
        case 'add':
          passed = true;
          explanation = `${gate.left} (${left}) + ${gate.right} (${right}) = ${left + right}`;
          break;
        case 'mul':
          passed = true;
          explanation = `${gate.left} (${left}) × ${gate.right} (${right}) = ${left * right}`;
          break;
        case 'hash_eq':
          passed = String(allInputs[gate.left]) === String(allInputs[gate.right]);
          explanation = `hash(${gate.left}) ${passed ? '==' : '!='} ${gate.right}`;
          break;
      }

      return { gate, passed, leftValue: left, rightValue: right, explanation };
    });

    return {
      wouldVerify: gateResults.every((r) => r.passed),
      gateResults,
    };
  }
}
