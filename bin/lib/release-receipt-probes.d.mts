// Types for the receipt-consuming release probes (`bin/lib/release-receipt-probes.mjs`).
export interface ProbeOutput { state: string; detail: string }
export function probeAccessibility(root: string, certifiedCheckpointSha: string | null): ProbeOutput;
export function probeUiErrorTaxonomy(root: string, certifiedCheckpointSha: string | null): ProbeOutput;
export function probeYieldCampaignResult(root: string, certifiedCheckpointSha: string | null): ProbeOutput;
