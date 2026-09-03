// Types for R-12's campaign certification registry validation. The validator
// is pure and takes every input as data, so the same function that enforces
// the repository in `bin/hardening-check.mjs` is negative-probed on synthetic
// input by `tests/unit/r12CampaignCertification.test.ts`.

export interface CampaignCertificationInput {
  /** Parsed `config/campaign-certification.v1.json`. */
  readonly registry: unknown;
  /** Parsed `config/quality-gate.v1.json`; supplies which groups are REQUIRED. */
  readonly gate: unknown;
  /** Lane manifest path -> parsed manifest. An absent key means unreadable. */
  readonly lanes: ReadonlyMap<string, unknown>;
  /** Every directory name in the campaign task ledger, unfiltered. */
  readonly campaignTasks: readonly string[];
  readonly suiteExists: (suite: string) => boolean;
}

/** Every violation found, deterministically ordered. Empty means the three conjuncts hold. */
export function validateCampaignCertification(input: CampaignCertificationInput): string[];

/** Every suite path a lane manifest causes its gate group to execute. */
export function laneSuites(manifest: unknown): string[];

export const LANE_GATE_COMMANDS: Readonly<Record<string, string>>;
export const CAMPAIGN_CERTIFICATION_SCHEMA_VERSION: 'nightwatch.campaign-certification.v1';
