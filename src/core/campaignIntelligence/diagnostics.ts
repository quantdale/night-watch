// Phase 19 — stable, safe diagnostics for local campaign operators.

export const CAMPAIGN_DIAGNOSTIC_VERSION = "nightwatch.campaign-diagnostic.v1" as const;

export type CampaignDiagnosticCode =
  | "LOCAL_PREREQUISITE_MISSING"
  | "CONFIG_INVALID"
  | "SOURCE_SNAPSHOT_MISSING"
  | "SOURCE_DRIFT"
  | "EXPECTATION_STALE"
  | "PROXY_UNAVAILABLE"
  | "BROWSER_UNSUPPORTED"
  | "ARTIFACT_CORRUPT"
  | "REPLAY_FAILED"
  | "AUTHORITY_REJECTED"
  | "EMPTY_CAMPAIGN"
  | "COVERAGE_GRAPH_INCOMPLETE";

export interface CampaignDiagnostic {
  readonly schemaVersion: typeof CAMPAIGN_DIAGNOSTIC_VERSION;
  readonly code: CampaignDiagnosticCode;
  readonly context: readonly string[];
  readonly remediation: string;
}

const HINTS: Readonly<Record<CampaignDiagnosticCode, string>> = Object.freeze({
  LOCAL_PREREQUISITE_MISSING: "Install the local synthetic prerequisite and rerun the readiness command.",
  CONFIG_INVALID: "Use the checked-in local configuration vocabulary and rerun the command.",
  SOURCE_SNAPSHOT_MISSING: "Provide an exact approved local source snapshot before deriving expectations.",
  SOURCE_DRIFT: "Re-derive source-bound expectations from the current approved snapshot.",
  EXPECTATION_STALE: "Refresh the source-bound expectation; do not promote the result as current.",
  PROXY_UNAVAILABLE: "Start the contained local proxy or keep the campaign in planning-only mode.",
  BROWSER_UNSUPPORTED: "Use the repository-supported browser channel for local synthetic execution.",
  ARTIFACT_CORRUPT: "Discard the invalid local artifact and regenerate it from sanitized inputs.",
  REPLAY_FAILED: "Inspect the replay outcome taxonomy; treat divergence as unresolved rather than green.",
  AUTHORITY_REJECTED: "Remain in local/source/synthetic scope and obtain separate owner authorization only through the approved process.",
  EMPTY_CAMPAIGN: "Inspect coverage gaps and source impact; an empty plan is not evidence of a clean product.",
  COVERAGE_GRAPH_INCOMPLETE: "Add or repair the missing bounded contract-to-scenario coverage binding.",
});

function safeContext(value: string): string {
  if (!/^[A-Z0-9_.:/-]{1,160}$/.test(value)) throw new Error("CAMPAIGN_DIAGNOSTIC_CONTEXT_UNSAFE");
  if (/(?:CUSTOMER_SENTINEL|ACCOUNT_SENTINEL|EMAIL_SENTINEL|COST_SENTINEL|TOKEN_SENTINEL|Bearer|eyJ[A-Za-z0-9_-]{8,}\.|AKIA[0-9A-Z]{16})/i.test(value)) throw new Error("CAMPAIGN_DIAGNOSTIC_CONTEXT_PRIVACY");
  return value;
}

/** Build a diagnostic without echoing arbitrary input or raw evidence. */
export function campaignDiagnostic(code: CampaignDiagnosticCode, context: readonly string[] = []): CampaignDiagnostic {
  if (!Object.prototype.hasOwnProperty.call(HINTS, code)) throw new Error("CAMPAIGN_DIAGNOSTIC_CODE_UNKNOWN");
  if (!Array.isArray(context) || context.length > 8) throw new Error("CAMPAIGN_DIAGNOSTIC_CONTEXT_INVALID");
  return Object.freeze({ schemaVersion: CAMPAIGN_DIAGNOSTIC_VERSION, code, context: [...new Set(context.map(safeContext))].sort(), remediation: HINTS[code] });
}

export function renderCampaignDiagnostic(diagnostic: CampaignDiagnostic): string {
  return `${diagnostic.code} context=${diagnostic.context.join(",") || "NONE"} remediation=${diagnostic.remediation}`;
}
