/**
 * MinervaFormat v2.0 — Circuit definition schema
 */

/** Supported gate types in Minerva circuits */
export type GateType = 'gt' | 'lt' | 'eq' | 'add' | 'mul' | 'hash_eq';

/** A single arithmetic gate in a circuit */
export interface Gate {
  /** The gate operation */
  type: GateType;
  /** Left operand — must reference an input name */
  left: string;
  /** Right operand — must reference an input name */
  right: string;
}

/** Circuit metadata */
export interface CircuitMeta {
  /** Human-readable circuit name */
  name: string;
  /** Description of what this circuit proves */
  description: string;
  /** Circuit author */
  author?: string;
  /** ISO-8601 creation timestamp */
  created_at?: string;
  /** Categorization tags */
  tags?: string[];
}

/** Complete MinervaFormat circuit definition */
export interface Circuit {
  /** Schema version — must be "2.0" */
  version: '2.0';
  /** Circuit metadata */
  meta: CircuitMeta;
  /** Circuit definition with gates */
  circuit: {
    gates: Gate[];
  };
  /** Input definitions with default values */
  inputs: {
    /** Public inputs — visible to verifier */
    public: Record<string, number | string>;
    /** Private inputs — never revealed */
    private: Record<string, number | string>;
  };
}

/** Options for initializing the Minerva engine */
export interface MinervaOptions {
  /** Custom URL for the WASM binary */
  wasmUrl?: string;
  /** Number of worker threads for proof generation */
  threads?: number;
  /** Minerva API base URL (default: https://zkesg.com/api) */
  apiBaseUrl?: string;
}

/** A generated zero-knowledge proof */
export interface Proof {
  /** Whether the proof is valid */
  valid: boolean;
  /** Proof hash (hex string) */
  hash: string;
  /** Raw proof bytes (base64) */
  proof: string;
  /** Public inputs only (safe to share) */
  publicOnly: Record<string, unknown>;
  /** Proof metadata */
  meta: {
    circuit: string;
    engine: string;
    security: number;
    generatedAt: string;
  };
  /** Serialize to portable JSON */
  toJSON(): string;
  /** Generate a LinkedIn share URL */
  toLinkedInShare(options: ShareOptions): string;
}

/** Options for social sharing */
export interface ShareOptions {
  /** Share title */
  title: string;
  /** Share description */
  description?: string;
}

/** Result of evaluating a circuit without proof generation */
export interface EvaluationResult {
  /** Whether the circuit would produce a valid proof */
  wouldVerify: boolean;
  /** Per-gate evaluation results */
  gateResults: {
    gate: Gate;
    passed: boolean;
    leftValue: number | string;
    rightValue: number | string;
    explanation: string;
  }[];
}

/** Options for the Juno AI client */
export interface JunoOptions {
  /** Your Minerva API key */
  apiKey: string;
  /** API base URL (default: https://zkesg.com/api) */
  baseUrl?: string;
}
