/**
 * @digitalforgestudios/minerva-sdk — TypeScript client for the Minerva ZK-STARK Proof Engine
 *
 * @packageDocumentation
 */

export { Minerva } from './minerva';
export { Verifier } from './verifier';
export { Juno } from './juno';
export * as circuits from './circuits';
export type {
  Circuit,
  CircuitMeta,
  Gate,
  GateType,
  MinervaOptions,
  Proof,
  EvaluationResult,
  ShareOptions,
  JunoOptions,
} from './types';
export type { VerificationResult, VerifierOptions } from './verifier';
