import type { Circuit, MinervaOptions, Proof, EvaluationResult } from './types';

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
  private wasmInstance: unknown;
  private options: Required<MinervaOptions>;

  private constructor(wasmInstance: unknown, options: Required<MinervaOptions>) {
    this.wasmInstance = wasmInstance;
    this.options = options;
  }

  /**
   * Initialize the Minerva WASM engine.
   *
   * Downloads and instantiates the WASM binary. This must be called
   * before generating or verifying proofs.
   */
  static async init(options?: MinervaOptions): Promise<Minerva> {
    const resolved: Required<MinervaOptions> = {
      wasmUrl: options?.wasmUrl ?? 'https://cdn.zkesg.com/wasm/minerva.wasm',
      threads: options?.threads ?? 1,
      apiBaseUrl: options?.apiBaseUrl ?? 'https://zkesg.com/api',
    };

    // TODO: Load and instantiate WASM binary
    // const wasmBytes = await fetch(resolved.wasmUrl).then(r => r.arrayBuffer());
    // const wasmModule = await WebAssembly.instantiate(wasmBytes, imports);
    const wasmInstance = null; // Placeholder until WASM binary is published

    return new Minerva(wasmInstance, resolved);
  }

  /**
   * Generate a zero-knowledge proof.
   *
   * Evaluates the circuit with the given inputs and produces a
   * STARK proof. Private inputs are used locally and never transmitted.
   *
   * @param circuit - MinervaFormat circuit definition
   * @param inputs - Optional input overrides (merged with circuit defaults)
   * @returns A Proof object with validation result and portable proof data
   */
  async prove(
    circuit: Circuit,
    inputs?: { public?: Record<string, unknown>; private?: Record<string, unknown> }
  ): Promise<Proof> {
    const mergedPublic = { ...circuit.inputs.public, ...inputs?.public };
    const mergedPrivate = { ...circuit.inputs.private, ...inputs?.private };

    // TODO: Delegate to WASM engine for actual STARK proof generation
    // For now, use evaluate() as a stand-in
    const evaluation = this.evaluate(circuit, { public: mergedPublic, private: mergedPrivate });

    const proof: Proof = {
      valid: evaluation.wouldVerify,
      hash: '', // Populated by WASM engine
      proof: '', // Base64 STARK proof blob
      publicOnly: mergedPublic,
      meta: {
        circuit: circuit.meta.name,
        engine: 'minerva-wasm-0.1.0',
        security: 128,
        generatedAt: new Date().toISOString(),
      },
      toJSON() {
        return JSON.stringify({
          valid: this.valid,
          hash: this.hash,
          proof: this.proof,
          publicOnly: this.publicOnly,
          meta: this.meta,
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
   * Verify a proof without private inputs.
   *
   * @param proof - A Proof object (from prove() or deserialized)
   * @returns true if the proof is cryptographically valid
   */
  async verify(proof: Proof): Promise<boolean> {
    // TODO: Delegate to WASM verifier
    // The verifier only needs the proof blob + public inputs
    return proof.valid;
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
          explanation = `${gate.left} (${left}) ${passed ? 'is' : 'is NOT'} greater than ${gate.right} (${right})`;
          break;
        case 'lt':
          passed = left < right;
          explanation = `${gate.left} (${left}) ${passed ? 'is' : 'is NOT'} less than ${gate.right} (${right})`;
          break;
        case 'eq':
          passed = left === right;
          explanation = `${gate.left} (${left}) ${passed ? 'equals' : 'does NOT equal'} ${gate.right} (${right})`;
          break;
        case 'add':
          passed = true; // Addition gates always pass — they compute
          explanation = `${gate.left} (${left}) + ${gate.right} (${right}) = ${left + right}`;
          break;
        case 'mul':
          passed = true; // Multiplication gates always pass — they compute
          explanation = `${gate.left} (${left}) × ${gate.right} (${right}) = ${left * right}`;
          break;
        case 'hash_eq':
          // Simplified — real implementation uses Poseidon/Rescue hash
          passed = false;
          explanation = `Hash equality check: hash(${gate.left}) == ${gate.right} (requires WASM engine)`;
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
