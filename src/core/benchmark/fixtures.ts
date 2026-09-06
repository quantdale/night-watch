// ---------------------------------------------------------------------------
// Lane F: representative local synthetic fixture corpus for historical replay.
// These fixtures STAND IN for historical cases per the lane contract: they
// are synthetic, frozen, and MUST NOT be presented as real historical results.
// No sibling checkout, network, or real-history mining is used.
//
// Corpus diversity policy (see lane SPEC): billing / api / backend /
// frontend / data / integration / regression / state-transition, plus one
// negative control (all hidden fields null) that must not admit a finding.
// ---------------------------------------------------------------------------

import { defineBenchmarkCase, type BenchmarkCaseInput, type DefinedBenchmarkCase } from './case';

const FIXTURE_INPUTS: readonly BenchmarkCaseInput[] = [
  {
    caseId: 'bench-billing-rounding-001',
    productFamily: 'ledger-web',
    category: 'billing',
    hidden: {
      fixCommit: '9f3ac21d4e77b1c0a5f2e8d3c6b4a19283746550',
      fixDiff:
        'diff --git a/src/billing/invoice.ts b/src/billing/invoice.ts\n' +
        '--- a/src/billing/invoice.ts\n' +
        '+++ b/src/billing/invoice.ts\n' +
        '@@ -41,7 +41,7 @@ export function totalInvoice(lines: InvoiceLine[]): number {\n' +
        '-  return lines.reduce((sum, line) => sum + roundBankers(line.amount), 0);\n' +
        '+  return roundBankers(lines.reduce((sum, line) => sum + line.amount, 0));\n',
      issueTitle: 'Invoice totals drift by a cent on multi-line orders',
      bugDescription:
        'Merchants noticed order totals occasionally mismatch the sum of displayed line amounts by a single cent when an order carries three or more lines.',
      knownFailingTest: 'invoice-totals-rounding.spec.ts',
      explanation:
        "Per-line banker's rounding accumulated a one-cent error; rounding once over the order total in src/billing/invoice.ts removes the drift.",
    },
    preFix: {
      symptomReport:
        'Support tickets describe checkout charges that differ slightly from the line-item arithmetic shown to shoppers. ' +
        'The mismatch appears only on baskets with several lines and never exceeds the smallest currency unit. ' +
        'Single-line baskets always agree exactly.',
      sourceSnapshot:
        'Module src/billing/invoice.ts exposes totalInvoice(lines). Current implementation folds each line through ' +
        'roundBankers before summing: lines.reduce((sum, line) => sum + roundBankers(line.amount), 0). ' +
        'Line display values are rendered unrounded and summed by the storefront for comparison.',
      reproSteps:
        '1. Build a basket with three lines priced to produce fractional sub-cent amounts. ' +
        '2. Charge the basket and record the captured total. ' +
        '3. Sum the displayed line amounts and compare against the captured total.',
      discriminator: { kind: 'ROUND_THEN_SUM', amounts: [10.125, 10.125, 10.125], scale: 100 },
    },
  },
  {
    caseId: 'bench-api-pagination-002',
    productFamily: 'ledger-web',
    category: 'api',
    hidden: {
      fixCommit: '41bd88f0c2a64e1f9d07b3a5c8e1f2a4b6c9d3e7',
      fixDiff:
        'diff --git a/src/api/pagination.ts b/src/api/pagination.ts\n' +
        '--- a/src/api/pagination.ts\n' +
        '+++ b/src/api/pagination.ts\n' +
        '@@ -18,7 +18,7 @@ export function nextCursor(page: LedgerPage): string {\n' +
        '-  return encodeOffset(page.offset + page.rows.length);\n' +
        '+  return encodeKeyset(page.rows[page.rows.length - 1].ledgerSequence);\n',
      issueTitle: 'Ledger listing skips rows while new entries arrive',
      bugDescription:
        'Operators paging through the ledger during busy periods saw entries vanish between pages; advancing to the next page dropped rows inserted concurrently.',
      knownFailingTest: 'ledger-pagination-cursor.spec.ts',
      explanation:
        'Offset cursors shifted under concurrent inserts; keyset pagination anchored on ledgerSequence in src/api/pagination.ts keeps every row reachable.',
    },
    preFix: {
      symptomReport:
        'During busy periods, operators flipping through the ledger listing report gaps: entries visible in totals ' +
        'never appear on any page. Quiet periods page cleanly from start to finish.',
      sourceSnapshot:
        'Module src/api/pagination.ts exposes nextCursor(page). Current implementation encodes the next window ' +
        'from a positional counter added to the count of rows already returned: encodeOffset(page.offset + page.rows.length). ' +
        'Rows carry a monotone ledgerSequence assigned at insert time.',
      reproSteps:
        '1. Seed a ledger with two hundred entries. ' +
        '2. Page through while a writer appends new entries. ' +
        '3. Collect every returned row id and diff against the full table.',
    },
  },
  {
    caseId: 'bench-backend-retry-003',
    productFamily: 'ledger-web',
    category: 'backend',
    hidden: {
      fixCommit: 'c7d2e1a04b9f4c6d8a3e5b7c9d1f2a4b6c8d0e2',
      fixDiff:
        'diff --git a/src/backend/webhookRetry.ts b/src/backend/webhookRetry.ts\n' +
        '--- a/src/backend/webhookRetry.ts\n' +
        '+++ b/src/backend/webhookRetry.ts\n' +
        '@@ -55,7 +55,7 @@ export function scheduleRetry(attempt: number): number {\n' +
        '-  return BASE_DELAY_MS;\n' +
        '+  return Math.min(MAX_DELAY_MS, BASE_DELAY_MS * 2 ** attempt + jitter(attempt));\n',
      issueTitle: 'Webhook retries hammer downstream on outage',
      bugDescription:
        'When a receiver went down, our retry worker re-fired every delivery on a fixed short delay, amplifying traffic until the receiver recovered.',
      knownFailingTest: 'webhook-retry-backoff.spec.ts',
      explanation:
        'Fixed-delay retries synchronized into a thundering herd; exponential backoff with jitter in src/backend/webhookRetry.ts spreads the load.',
    },
    preFix: {
      symptomReport:
        'Receiver incidents show an odd traffic shape: the moment a downstream endpoint starts failing, outbound ' +
        'delivery attempts climb steeply and stay elevated, then collapse all at once on recovery. Small blips ' +
        'cause disproportionate volume.',
      sourceSnapshot:
        'Module src/backend/webhookRetry.ts exposes scheduleRetry(attempt). Current implementation returns a ' +
        'constant BASE_DELAY_MS regardless of attempt count. Helpers MAX_DELAY_MS, jitter, and attempt counters ' +
        'exist but the scheduler ignores them.',
      reproSteps:
        '1. Point a receiver at a failing stub. ' +
        '2. Queue one hundred deliveries and record attempt timestamps over five minutes. ' +
        '3. Plot attempts per ten-second bucket and inspect the spacing.',
    },
  },
  {
    caseId: 'bench-frontend-cache-004',
    productFamily: 'ledger-web',
    category: 'frontend',
    hidden: {
      fixCommit: 'e4a19c2d7b5f4e08a6c3d9e1f2b4a5c7d8e0f1a',
      fixDiff:
        'diff --git a/src/frontend/accountCache.ts b/src/frontend/accountCache.ts\n' +
        '--- a/src/frontend/accountCache.ts\n' +
        '+++ b/src/frontend/accountCache.ts\n' +
        '@@ -30,7 +30,7 @@ export function switchAccount(id: string): AccountView {\n' +
        '-  return cachedView;\n' +
        '+  return id === cachedAccountId ? cachedView : loadAccountView(id);\n',
      issueTitle: 'Account switcher keeps showing the previous account',
      bugDescription:
        'Users switching between accounts kept seeing the first account dashboard; balances and names only refreshed after a full page reload.',
      knownFailingTest: 'account-switcher-cache.spec.ts',
      explanation:
        'The switcher returned the stale cached view without checking identity; keying the cache on account id in src/frontend/accountCache.ts restores freshness.',
    },
    preFix: {
      symptomReport:
        'Users with access to several accounts report that moving between them leaves the dashboard unchanged: ' +
        'the header name and balances belong to the previously selected account. A manual reload always fixes it.',
      sourceSnapshot:
        'Module src/frontend/accountCache.ts exposes switchAccount(id) backed by module-level cachedView and ' +
        'cachedAccountId slots. Current implementation returns cachedView unconditionally once populated. ' +
        'A loader loadAccountView(id) refreshes both slots when called.',
      reproSteps:
        '1. Sign in with two accessible accounts. ' +
        '2. Open the first account dashboard, then use the switcher to open the second. ' +
        '3. Compare the header name and balances against the second account record.',
    },
  },
  {
    caseId: 'bench-data-timezone-005',
    productFamily: 'ledger-web',
    category: 'data',
    hidden: {
      fixCommit: '28b6d4f1a9c3e5b7a8d0f2c4e6a8b0d2f4a6c8e',
      fixDiff:
        'diff --git a/src/data/csvExport.ts b/src/data/csvExport.ts\n' +
        '--- a/src/data/csvExport.ts\n' +
        '+++ b/src/data/csvExport.ts\n' +
        '@@ -72,7 +72,7 @@ export function formatExportRow(row: LedgerRow): string {\n' +
        '-  return [row.id, row.postedAt.toString(), row.amount].join(",");\n' +
        '+  return [row.id, row.postedAt.toISOString(), row.amount].join(",");\n',
      issueTitle: 'CSV exports shift timestamps across timezones',
      bugDescription:
        'Finance imports of exported ledgers showed postings landing on different calendar days depending on which office machine produced the file.',
      knownFailingTest: 'csv-export-timezone.spec.ts',
      explanation:
        'Locale-dependent timestamp rendering moved postings across midnight; ISO instant formatting in src/data/csvExport.ts pins every export to UTC.',
    },
    preFix: {
      symptomReport:
        'Reconciliation teams in different offices disagree about which calendar day some postings belong to, ' +
        'even though they import the same export file. The day-boundary rows are the ones that move.',
      sourceSnapshot:
        'Module src/data/csvExport.ts exposes formatExportRow(row). Current implementation stringifies the posting ' +
        'instant with the default runtime conversion before joining columns: [row.id, row.postedAt.toString(), row.amount].join(","). ' +
        'postedAt is stored as an absolute instant.',
      reproSteps:
        '1. Export the ledger on a machine set to UTC+9. ' +
        '2. Re-export the same range on a machine set to UTC-5. ' +
        '3. Diff the timestamp columns of both files.',
    },
  },
  {
    caseId: 'bench-integration-webhook-006',
    productFamily: 'ledger-web',
    category: 'integration',
    hidden: {
      fixCommit: 'f0c4a2e6b8d0f1a3c5e7b9d1f3a5c7e9b1d3f5a',
      fixDiff:
        'diff --git a/src/integration/webhookVerify.ts b/src/integration/webhookVerify.ts\n' +
        '--- a/src/integration/webhookVerify.ts\n' +
        '+++ b/src/integration/webhookVerify.ts\n' +
        '@@ -12,7 +12,7 @@ export function verifySignature(rawBody: string, signature: strin\n' +
        '-  return signature === expected;\n' +
        '+  return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));\n',
      issueTitle: 'Webhook signature check leaks timing signal',
      bugDescription:
        'Security review flagged the inbound webhook verifier: rejection latency varied with how much of the signature prefix matched.',
      knownFailingTest: 'webhook-signature-verify.spec.ts',
      explanation:
        'Early-exit string comparison leaked prefix timing; constant-time comparison in src/integration/webhookVerify.ts closes the oracle.',
    },
    preFix: {
      symptomReport:
        'A security review measured the inbound webhook endpoint and found rejection latency correlating with ' +
        'signature prefix length: guesses sharing more leading characters took measurably longer to refuse.',
      sourceSnapshot:
        'Module src/integration/webhookVerify.ts exposes verifySignature(rawBody, signature). Current implementation ' +
        'derives the expected digest then compares with strict equality: signature === expected. ' +
        'Both operands are hex strings of equal length.',
      reproSteps:
        '1. Send forged callbacks with incrementally longer correct prefixes. ' +
        '2. Record rejection latency per prefix length over one thousand samples. ' +
        '3. Test for correlation between prefix length and median latency.',
    },
  },
  {
    caseId: 'bench-regression-redirect-007',
    productFamily: 'ledger-web',
    category: 'regression',
    hidden: {
      fixCommit: '1a3c5e7b9d1f2a4c6e8b0d2f4a6c8e0b2d4f6a8',
      fixDiff:
        'diff --git a/src/auth/loginRedirect.ts b/src/auth/loginRedirect.ts\n' +
        '--- a/src/auth/loginRedirect.ts\n' +
        '+++ b/src/auth/loginRedirect.ts\n' +
        '@@ -24,7 +24,7 @@ export function postLoginTarget(returnTo: string | null): string {\n' +
        '-  return returnTo ?? DEFAULT_LANDING;\n' +
        '+  return isSameOriginPath(returnTo) ? (returnTo as string) : DEFAULT_LANDING;\n',
      issueTitle: 'Login return-to accepts off-site destinations',
      bugDescription:
        'After sign-in, crafted links bounced users to an external lookalike domain instead of back into the product.',
      knownFailingTest: 'login-redirect-regression.spec.ts',
      explanation:
        'Unvalidated return-to targets enabled open redirects; same-origin path checks in src/auth/loginRedirect.ts keep landings inside the product.',
    },
    preFix: {
      symptomReport:
        'Phishing reports include sign-in links that, after successful authentication, land the victim on an ' +
        'external lookalike domain rather than returning into the product. The session itself is unaffected.',
      sourceSnapshot:
        'Module src/auth/loginRedirect.ts exposes postLoginTarget(returnTo). Current implementation trusts the ' +
        'caller-supplied destination outright: return returnTo ?? DEFAULT_LANDING. ' +
        'A predicate isSameOriginPath exists in the module but is never consulted on this path.',
      reproSteps:
        '1. Start sign-in with a return destination pointing at an external domain. ' +
        '2. Complete authentication. ' +
        '3. Record the landing location of the final navigation.',
    },
  },
  {
    caseId: 'bench-state-transition-008',
    productFamily: 'ledger-web',
    category: 'state-transition',
    hidden: {
      fixCommit: '73d9f1b5a7c3e5d9f1b3a5c7e9d1f3b5a7c9e1d',
      fixDiff:
        'diff --git a/src/orders/stateMachine.ts b/src/orders/stateMachine.ts\n' +
        '--- a/src/orders/stateMachine.ts\n' +
        '+++ b/src/orders/stateMachine.ts\n' +
        '@@ -88,7 +88,7 @@ export function transition(order: Order, event: OrderEvent): OrderState {\n' +
        '-  if (event === "CANCEL" && order.state !== "DRAFT") return "CANCELLED";\n' +
        '+  if (event === "CANCEL" && (order.state === "DRAFT" || order.state === "PENDING")) return "CANCELLED";\n',
      issueTitle: 'Settled orders can be cancelled into limbo',
      bugDescription:
        'Support found orders stuck in a cancelled state even though settlement had completed and funds moved; cancellation was accepted after settlement.',
      knownFailingTest: 'order-state-transition.spec.ts',
      explanation:
        'Over-broad cancel guard admitted post-settlement transitions; restricting cancellation to draft and pending in src/orders/stateMachine.ts preserves terminal states.',
    },
    preFix: {
      symptomReport:
        'A handful of orders show funds settled downstream yet carry a cancelled marker in the ledger, and no ' +
        'follow-up transition will move them again. Every affected order was cancelled late in its lifecycle.',
      sourceSnapshot:
        'Module src/orders/stateMachine.ts exposes transition(order, event). Current cancel branch accepts the ' +
        'event from every non-draft state: if (event === "CANCEL" && order.state !== "DRAFT") return "CANCELLED". ' +
        'Settled and refunded markers are terminal everywhere else in the module.',
      reproSteps:
        '1. Drive an order through settlement. ' +
        '2. Issue a cancel event against the settled order. ' +
        '3. Inspect the resulting state and attempt any further transition.',
    },
  },
  {
    caseId: 'bench-negative-quiet-000',
    productFamily: 'ledger-web',
    category: 'regression',
    hidden: {
      fixCommit: null,
      fixDiff: null,
      issueTitle: null,
      bugDescription: null,
      knownFailingTest: null,
      explanation: null,
    },
    preFix: {
      symptomReport:
        'Routine sweep of the health endpoint shows nominal latency and zero error responses over the last window. ' +
        'No customer report is attached to this sweep.',
      sourceSnapshot:
        'Module src/health/status.ts exposes readStatus(). It returns static version metadata plus uptime counters. ' +
        'No branching, no external calls, no persisted state.',
      reproSteps:
        '1. Query the local health endpoint ten times. ' +
        '2. Confirm every response carries the expected version marker. ' +
        '3. Confirm no error responses were recorded.',
      discriminator: { kind: 'HEALTH_OK', version: '1.0' },
    },
  },
];

function buildCorpus(): readonly DefinedBenchmarkCase[] {
  return Object.freeze(FIXTURE_INPUTS.map((input) => defineBenchmarkCase(input)));
}

let cached: readonly DefinedBenchmarkCase[] | null = null;

/** Synthetic stand-in corpus (NOT real historical data). */
export function benchmarkFixtureCorpus(): readonly DefinedBenchmarkCase[] {
  cached ??= buildCorpus();
  return cached;
}

export function benchmarkFixtureById(caseId: string): DefinedBenchmarkCase {
  const found = benchmarkFixtureCorpus().find((item) => item.caseId === caseId);
  if (found === undefined) throw new Error(`unknown benchmark fixture ${caseId}`);
  return found;
}

export const BENCHMARK_FIXTURE_IDS: readonly string[] = Object.freeze([
  'bench-billing-rounding-001',
  'bench-api-pagination-002',
  'bench-backend-retry-003',
  'bench-frontend-cache-004',
  'bench-data-timezone-005',
  'bench-integration-webhook-006',
  'bench-regression-redirect-007',
  'bench-state-transition-008',
  'bench-negative-quiet-000',
]);
