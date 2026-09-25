// G1 — open-work report for the local status surface (`npm run status:local`).
//
// Derives the answer to "what is open" from the shared ledger parser
// (`bin/lib/openspec-ledger.mjs`); every field is derived, none is
// hand-maintained. Pure: no filesystem, network, child process, clock,
// environment access or persistence. Terminal ledgers are omitted here — a
// terminal task with open boxes is already a failure of the completion-ledger
// agreement check, not a status row.

export const OPEN_WORK_REPORT_MODEL_VERSION = 'nightwatch.open-work-report.v1';

export type OpenWorkBlockerClass = 'NONE' | 'INTERNAL' | 'EXTERNAL';

export interface OpenWorkEntryInput {
  readonly changeId: string;
  readonly taskStatus: string;
  readonly openCount: number;
  readonly declaredNotInScope: number;
  readonly undispositionedCount?: number;
  readonly doneCount: number;
  readonly blocker: string | null;
  readonly blockerClass: OpenWorkBlockerClass;
}

export interface OpenWorkCampaign {
  readonly changeId: string;
  readonly taskStatus: string;
  readonly openCount: number;
  readonly declaredNotInScope: number;
  readonly undispositionedCount: number;
  readonly doneCount: number;
  readonly blocker: string | null;
  readonly blockerClass: OpenWorkBlockerClass;
}

export interface OpenWorkReport {
  readonly modelVersion: typeof OPEN_WORK_REPORT_MODEL_VERSION;
  readonly derived: true;
  readonly campaigns: readonly OpenWorkCampaign[];
  readonly totals: {
    readonly campaigns: number;
    readonly openItems: number;
    readonly undispositionedItems: number;
    readonly blockedCampaigns: number;
    readonly externallyBlocked: number;
  };
}

/** Pure, deterministic derivation from already-collected per-change input. */
export function deriveOpenWorkReport(entries: readonly OpenWorkEntryInput[]): OpenWorkReport {
  const campaigns: OpenWorkCampaign[] = [...entries]
    .map((entry) => ({
      changeId: entry.changeId,
      taskStatus: entry.taskStatus,
      openCount: entry.openCount,
      declaredNotInScope: entry.declaredNotInScope,
      undispositionedCount: entry.undispositionedCount ?? 0,
      doneCount: entry.doneCount,
      blocker: entry.blocker,
      blockerClass: entry.blockerClass,
    }))
    .sort((left, right) => left.changeId.localeCompare(right.changeId));
  const totals = {
    campaigns: campaigns.length,
    openItems: campaigns.reduce((sum, campaign) => sum + campaign.openCount, 0),
    undispositionedItems: campaigns.reduce((sum, campaign) => sum + campaign.undispositionedCount, 0),
    blockedCampaigns: campaigns.filter((campaign) => campaign.taskStatus === 'BLOCKED').length,
    externallyBlocked: campaigns.filter((campaign) => campaign.blockerClass === 'EXTERNAL').length,
  };
  return { modelVersion: OPEN_WORK_REPORT_MODEL_VERSION, derived: true, campaigns, totals };
}

/** Machine-readable rendering of the derived report. */
export function renderOpenWorkJson(report: OpenWorkReport): string {
  return `${JSON.stringify(report, null, 2)}\n`;
}

/** Concise text rendering, derived only from the report model. */
export function renderOpenWorkText(report: OpenWorkReport): string {
  const lines: string[] = [
    `open work ${report.modelVersion}: campaigns=${report.totals.campaigns}` +
      ` open-items=${report.totals.openItems} undispositioned=${report.totals.undispositionedItems}` +
      ` blocked-campaigns=${report.totals.blockedCampaigns} externally-blocked=${report.totals.externallyBlocked}`,
  ];
  for (const campaign of report.campaigns) {
    const blocker = campaign.blocker === null ? '' : ` blocker=${campaign.blockerClass}: ${campaign.blocker}`;
    lines.push(
      `  - ${campaign.changeId} status=${campaign.taskStatus} open=${campaign.openCount}` +
        ` declared_not_in_scope=${campaign.declaredNotInScope} undispositioned=${campaign.undispositionedCount}` +
        ` done=${campaign.doneCount}${blocker}`,
    );
  }
  return `${lines.join('\n')}\n`;
}
