import type { Circuit } from '../types';

/**
 * Built-in circuit templates — production-ready MinervaFormat definitions.
 *
 * Each factory function returns a Circuit with sensible defaults.
 * Override public input values by passing options.
 */

/** Prove age meets minimum threshold */
export function ageVerification(opts?: { minimumAge?: number }): Circuit {
  return {
    version: '2.0',
    meta: { name: 'Age Verification', description: 'Prove age >= minimum', author: 'minerva', tags: ['identity'] },
    circuit: { gates: [{ type: 'gt', left: 'user_age', right: 'minimum_age' }] },
    inputs: { public: { minimum_age: opts?.minimumAge ?? 18 }, private: { user_age: 0 } },
  };
}

/** Prove income exceeds a required minimum */
export function incomeThreshold(opts?: { minimum?: number }): Circuit {
  return {
    version: '2.0',
    meta: { name: 'Income Threshold', description: 'Prove income exceeds minimum', author: 'minerva', tags: ['finance'] },
    circuit: { gates: [{ type: 'gt', left: 'income', right: 'minimum_income' }] },
    inputs: { public: { minimum_income: opts?.minimum ?? 50000 }, private: { income: 0 } },
  };
}

/** Prove credit score falls within a range */
export function creditRange(opts?: { min?: number; max?: number }): Circuit {
  return {
    version: '2.0',
    meta: { name: 'Credit Score Range', description: 'Prove credit score in range', author: 'minerva', tags: ['finance'] },
    circuit: {
      gates: [
        { type: 'gt', left: 'credit_score', right: 'min_score' },
        { type: 'gt', left: 'max_score', right: 'credit_score' },
      ],
    },
    inputs: { public: { min_score: opts?.min ?? 650, max_score: opts?.max ?? 850 }, private: { credit_score: 0 } },
  };
}

/** Prove a document is authentic via hash comparison */
export function documentAuthenticity(): Circuit {
  return {
    version: '2.0',
    meta: { name: 'Document Authenticity', description: 'Prove document authenticity via hash', author: 'minerva', tags: ['legal'] },
    circuit: { gates: [{ type: 'hash_eq', left: 'document_data', right: 'known_hash' }] },
    inputs: { public: { known_hash: '' }, private: { document_data: '' } },
  };
}

/** Prove account balances sum to a claimed total */
export function balanceProof(opts?: { claimedTotal?: number }): Circuit {
  return {
    version: '2.0',
    meta: { name: 'Account Balance Proof', description: 'Prove balances sum to total', author: 'minerva', tags: ['finance'] },
    circuit: {
      gates: [
        { type: 'add', left: 'account_a', right: 'account_b' },
        { type: 'eq', left: 'total', right: 'claimed_total' },
      ],
    },
    inputs: { public: { claimed_total: opts?.claimedTotal ?? 0 }, private: { account_a: 0, account_b: 0, total: 0 } },
  };
}

/** Prove identity verification without re-sharing documents */
export function kycAttestation(): Circuit {
  return {
    version: '2.0',
    meta: { name: 'KYC Attestation', description: 'Prove KYC without re-sharing docs', author: 'minerva', tags: ['identity'] },
    circuit: { gates: [{ type: 'hash_eq', left: 'kyc_data', right: 'attestation_hash' }] },
    inputs: { public: { attestation_hash: '' }, private: { kyc_data: '' } },
  };
}

/** Prove supplier certification and quality thresholds */
export function supplyChain(opts?: { qualityThreshold?: number }): Circuit {
  return {
    version: '2.0',
    meta: { name: 'Supply Chain Certification', description: 'Prove supplier certification', author: 'minerva', tags: ['logistics'] },
    circuit: {
      gates: [
        { type: 'hash_eq', left: 'supplier_cert', right: 'known_cert_hash' },
        { type: 'gt', left: 'quality_score', right: 'quality_threshold' },
      ],
    },
    inputs: { public: { known_cert_hash: '', quality_threshold: opts?.qualityThreshold ?? 80 }, private: { supplier_cert: '', quality_score: 0 } },
  };
}

/** Prove voter eligibility */
export function voteEligibility(opts?: { minimumAge?: number }): Circuit {
  return {
    version: '2.0',
    meta: { name: 'Voting Eligibility', description: 'Prove voter eligibility', author: 'minerva', tags: ['governance'] },
    circuit: {
      gates: [
        { type: 'eq', left: 'is_registered', right: 'required_registration' },
        { type: 'gt', left: 'voter_age', right: 'minimum_age' },
      ],
    },
    inputs: { public: { required_registration: 1, minimum_age: opts?.minimumAge ?? 18 }, private: { is_registered: 0, voter_age: 0 } },
  };
}

/** Prove financial metrics meet regulatory requirements */
export function financialAudit(opts?: { minimumRevenue?: number }): Circuit {
  return {
    version: '2.0',
    meta: { name: 'Financial Audit', description: 'Prove financial compliance', author: 'minerva', tags: ['finance'] },
    circuit: { gates: [{ type: 'gt', left: 'revenue', right: 'minimum_revenue' }] },
    inputs: { public: { minimum_revenue: opts?.minimumRevenue ?? 1000000 }, private: { revenue: 0 } },
  };
}

/** Prove carbon emissions are below regulatory threshold */
export function carbonCompliance(opts?: { threshold?: number }): Circuit {
  return {
    version: '2.0',
    meta: { name: 'Carbon Compliance', description: 'Prove emissions below threshold', author: 'minerva', tags: ['esg'] },
    circuit: { gates: [{ type: 'gt', left: 'threshold', right: 'actual_emissions' }] },
    inputs: { public: { threshold: opts?.threshold ?? 10000 }, private: { actual_emissions: 0 } },
  };
}
