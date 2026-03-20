# @digitalforgestudios/minerva-sdk

> TypeScript/JavaScript SDK for the [Minerva ZK-STARK Proof Engine](https://zkesg.com)

Interact with the Minerva platform from any JavaScript environment. The SDK provides typed access to circuit templates, proof generation, verification, and the Juno AI circuit design oracle.

## Features

- 📐 **MinervaFormat circuits** — Load from templates or build programmatically
- ✅ **Proof verification** — Verify any Minerva proof structurally
- 🤖 **Juno integration** — Generate circuits from natural language via the Juno API
- 📤 **Export & share** — JSON and portable proof formats
- 🏢 **Enterprise-ready** — TypeScript-first, tree-shakeable, zero runtime dependencies

## Installation

```bash
npm install @digitalforgestudios/minerva-sdk
```

## Quick Start

```typescript
import { Minerva, circuits } from '@digitalforgestudios/minerva-sdk';

// Connect to the Minerva platform
const minerva = new Minerva({ apiKey: 'mzk_your_key_here' });

// Load a built-in circuit template
const circuit = circuits.ageVerification({
  minimumAge: 18
});

// Generate a proof via the platform
const proof = await minerva.prove(circuit, {
  public: { minimum_age: 18 },
  private: { user_age: 25 }
});

console.log(proof.valid);      // true
console.log(proof.hash);       // "a1b2c3..."
console.log(proof.publicOnly); // { minimum_age: 18, result: true }

// Verify a proof
const verified = await minerva.verify(proof);
console.log(verified); // true
```

## Circuit Templates

The SDK ships with 10 production-ready circuit templates:

| Template | Category | Description |
|----------|----------|-------------|
| `ageVerification` | Identity | Prove age meets minimum threshold |
| `incomeThreshold` | Finance | Prove income exceeds requirement |
| `creditRange` | Finance | Prove credit score within range |
| `documentAuthenticity` | Legal | Prove document is authentic |
| `balanceProof` | Finance | Prove account balances sum correctly |
| `kycAttestation` | Identity | Prove KYC without re-sharing docs |
| `supplyChain` | Logistics | Prove supplier certification |
| `voteEligibility` | Governance | Prove voter eligibility |
| `financialAudit` | Finance | Prove financial compliance |
| `carbonCompliance` | ESG | Prove emissions below threshold |

## Custom Circuits

Build circuits programmatically using MinervaFormat:

```typescript
import { Minerva, Circuit } from '@digitalforgestudios/minerva-sdk';

const circuit: Circuit = {
  version: '2.0',
  meta: {
    name: 'Salary Band Proof',
    description: 'Prove salary falls within a band',
    tags: ['hr', 'finance']
  },
  circuit: {
    gates: [
      { type: 'gt', left: 'salary', right: 'band_min' },
      { type: 'gt', left: 'band_max', right: 'salary' }
    ]
  },
  inputs: {
    public: { band_min: 80000, band_max: 120000 },
    private: { salary: 95000 }
  }
};

const minerva = new Minerva({ apiKey: 'mzk_your_key_here' });
const proof = await minerva.prove(circuit);
```

## Juno AI Circuit Generation

Generate circuits from natural language:

```typescript
import { Juno } from '@digitalforgestudios/minerva-sdk';

const juno = new Juno({ apiKey: 'mzk_your_key_here' });

const circuit = await juno.design(
  'Prove my company has fewer than 500 employees without revealing the exact count'
);

console.log(circuit.gates);
console.log(circuit.inputs);
```

## MinervaFormat Specification

All circuits use the MinervaFormat JSON schema (v2.0):

```json
{
  "version": "2.0",
  "meta": {
    "name": "string",
    "description": "string",
    "author": "string",
    "created_at": "ISO-8601",
    "tags": ["string"]
  },
  "circuit": {
    "gates": [
      {
        "type": "gt | lt | eq | add | mul | hash_eq",
        "left": "input_name",
        "right": "input_name"
      }
    ]
  },
  "inputs": {
    "public": { "key": "value" },
    "private": { "key": "value" }
  }
}
```

### Gate Types

| Gate | Operation | Description |
|------|-----------|-------------|
| `gt` | Greater than | `left > right` |
| `lt` | Less than | `left < right` |
| `eq` | Equals | `left == right` |
| `add` | Addition | `left + right` |
| `mul` | Multiplication | `left * right` |
| `hash_eq` | Hash equality | `hash(left) == right` |

## API Reference

### `new Minerva(options)`

Connect to the Minerva platform.

```typescript
const minerva = new Minerva({
  apiKey: string;      // Your Minerva API key (mzk_ prefix)
  baseUrl?: string;    // API endpoint (default: https://zkesg.com/api)
});
```

### `minerva.prove(circuit, inputs?)`

Generate a zero-knowledge proof.

```typescript
const proof = await minerva.prove(circuit, {
  public: { threshold: 100 },
  private: { value: 42 }
});
// Returns: { valid, hash, proof, publicOnly, meta }
```

### `minerva.verify(proof)`

Verify a proof.

```typescript
const isValid = await minerva.verify(proof);
// Returns: boolean
```

### `Juno(options)`

Connect to the Juno AI circuit design oracle.

```typescript
const juno = new Juno({
  apiKey: string;      // Your Minerva API key
  baseUrl?: string;    // API endpoint (default: https://zkesg.com/api)
});
```

### `juno.design(prompt)`

Generate a circuit from natural language.

```typescript
const circuit = await juno.design('Prove X without revealing Y');
// Returns: Circuit (MinervaFormat)
```

## Standalone Verifier

The SDK includes a lightweight standalone verifier for structural proof validation. Anyone can check a Minerva proof — no authentication or account needed.

```typescript
import { Verifier } from '@digitalforgestudios/minerva-sdk/verifier';

const verifier = new Verifier();

const result = await verifier.check(proofJsonString);

console.log(result.valid);        // true
console.log(result.status);       // "verified"
console.log(result.circuit);      // "Carbon Compliance"
console.log(result.publicInputs); // { threshold: 10000 }
console.log(result.security);     // 128
console.log(result.verifiedInMs); // 12

// Simple boolean check
const ok = await verifier.isValid(proofJson);

// Batch verification
const results = await verifier.checkBatch([proof1, proof2, proof3]);
```

For full cryptographic verification, use the [Minerva platform API](https://zkesg.com/api/v1/proofs/verify) or the [web verifier](https://zkesg.com/verify).

### CLI Verifier

A standalone CLI verifier is available at [`digitalforgeca/minerva-verify`](https://github.com/digitalforgeca/minerva-verify):

```bash
# Verify a proof file
minerva-verify proof.json
# ✅ Verified: Carbon Compliance (128-bit security)
```

## Security

- Private inputs are **never transmitted** to third parties during proof generation
- No trusted setup required (STARK-based)
- API keys use the `mzk_` prefix with argon2id storage

## Requirements

- **Node.js:** 18+
- **Browser:** Chrome 89+, Firefox 89+, Safari 15+, Edge 89+

## Links

- 🌐 [Minerva Platform](https://zkesg.com)
- 💬 [Juno AI Oracle](https://zkesg.com/chat)
- 📐 [Circuit Templates](https://zkesg.com/templates)
- 📖 [Guides](https://zkesg.com/guides)
- 🏢 [Digital Forge Studios](https://dforge.ca)

## License

Proprietary — see [LICENSE](./LICENSE)
