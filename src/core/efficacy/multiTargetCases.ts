// ---------------------------------------------------------------------------
// W8 efficacy depth: multi-target leak-isolated cases.
//
// The frozen 9-fixture corpus exposes exactly ONE approved source path per
// case (a single prose `sourceSnapshot` with no `--- path` chunks falls back
// to `visible-context.md`). That makes target diversity and repeat-avoidance
// unmeasurable: the baseline inspects its one target and stops, and the
// candidate inspects the same one target and proceeds. These four additional
// cases use the multi-chunk `--- <relative/path>\n<body>` format understood
// by `parsePreFixSnapshotFiles`, so each exposes 5-6 distinct approved source
// paths through the same historical adapters and the same executor gating.
//
// Three defect cases carry a reproducing visible discriminator and real hidden
// ground truth; one negative control carries all-null hidden fields and a
// non-mismatching discriminator. `defineBenchmarkCase` fails closed if a
// fixture embeds its own answer, so hidden strings are kept out of the visible
// blobs by construction (distinct wording, no test names or SHAs visible).
//
// Pure data selection. No I/O.
// ---------------------------------------------------------------------------

import { defineBenchmarkCase, type BenchmarkCaseInput, type DefinedBenchmarkCase } from '../benchmark/case';

const MULTI_TARGET_INPUTS: readonly BenchmarkCaseInput[] = [
  {
    caseId: 'efficacy-billing-multifile-001',
    productFamily: 'ledger-web',
    category: 'billing',
    hidden: {
      fixCommit: 'b7c1d9e2f3a44567890abcdef1234567890abcd12',
      fixDiff:
        'diff --git a/src/billing/invoice.ts b/src/billing/invoice.ts\n' +
        '--- a/src/billing/invoice.ts\n' +
        '+++ b/src/billing/invoice.ts\n' +
        '@@ -51,7 +51,7 @@ export function totalInvoice(lines: InvoiceLine[]): number {\n' +
        '-  return lines.reduce((sum, line) => sum + roundBankers(line.amount), 0);\n' +
        '+  return roundBankers(lines.reduce((sum, line) => sum + line.amount, 0));\n',
      issueTitle: 'Composite invoice total drifts when discounts and tax combine',
      bugDescription:
        'Checkout totals for baskets mixing percentage discounts with regional tax rules settle a cent away from receipt arithmetic on multi-line orders.',
      knownFailingTest: 'composite-invoice-settlement.spec.ts',
      explanation:
        'Rounding each discounted line before taxation stacked fractional errors; computing the basket subtotal first and rounding once at settlement in src/billing/invoice.ts restores cent-exact totals.',
    },
    preFix: {
      symptomReport:
        'Shoppers report the charged amount differs from adding up the displayed receipt lines. ' +
        'The gap shows up on baskets carrying several lines with mixed adjustments and never exceeds the smallest currency unit. ' +
        'Baskets with a single line always agree exactly.',
      sourceSnapshot:
        '--- src/billing/money.ts\n' +
        'Module money.ts exposes formatCents(cents) and parseDollars(text). Amounts are stored as integer minor units; ' +
        'display helpers padCurrency and trimTrailingZeros render them for receipts. No rounding happens here.\n' +
        '--- src/billing/discounts.ts\n' +
        'Module discounts.ts exposes applyPercentageDiscount(subtotal, percent) and applyFixedDiscount(subtotal, minorUnits). ' +
        'Helpers clampDiscountPercent and distributeRemainder keep each adjustment bounded. Results stay in minor units.\n' +
        '--- src/billing/invoice.ts\n' +
        'Module src/billing/invoice.ts exposes totalInvoice(lines). Current implementation folds each line through ' +
        'roundBankers before summing: lines.reduce((sum, line) => sum + roundBankers(line.amount), 0). ' +
        'Helpers sumLineAmounts and formatReceiptLine render the unrounded display values summed by the storefront.\n' +
        '--- src/billing/taxTable.ts\n' +
        'Module taxTable.ts exposes lookupRegionalTaxRate(postalCode) and computeTaxAmount(subtotal, rate). ' +
        'Helpers normalizePostalCode and selectTaxBracket resolve the band; callers pass already-rounded subtotals.\n' +
        '--- src/billing/receiptRender.ts\n' +
        'Module receiptRender.ts exposes renderReceiptLines(lines) and renderGrandTotal(cents). ' +
        'Helpers alignReceiptColumns and abbreviateProductName format the shopper-visible arithmetic.\n' +
        '--- src/billing/ledgerPost.ts\n' +
        'Module ledgerPost.ts exposes postLedgerEntries(invoiceId, cents) and voidLedgerEntries(invoiceId). ' +
        'Helpers buildLedgerPayload and verifyLedgerBalance record the settled figure downstream.\n',
      reproSteps:
        '1. Assemble a basket with three lines priced to leave fractional minor units after adjustment. ' +
        '2. Settle the basket and record the captured total. ' +
        '3. Add the displayed receipt lines and compare against the captured total.',
      discriminator: { kind: 'ROUND_THEN_SUM', amounts: [19.995, 4.115, 7.335], scale: 100 },
    },
  },
  {
    caseId: 'efficacy-frontend-multisurface-002',
    productFamily: 'ledger-web',
    category: 'frontend',
    hidden: {
      fixCommit: 'd3e4f5a6b7c8491092837465a6b7c8d9e0f1a2b3',
      fixDiff:
        'diff --git a/src/frontend/accountCache.ts b/src/frontend/accountCache.ts\n' +
        '--- a/src/frontend/accountCache.ts\n' +
        '+++ b/src/frontend/accountCache.ts\n' +
        '@@ -30,7 +30,7 @@ export function switchAccount(id: string): AccountView {\n' +
        '-  return cachedView;\n' +
        '+  return id === cachedAccountId ? cachedView : loadAccountView(id);\n',
      issueTitle: 'Workspace switcher retains prior account dashboard',
      bugDescription:
        'Members belonging to several workspaces keep seeing the previous workspace boards after switching; only a full reload refreshes the view.',
      knownFailingTest: 'workspace-switcher-freshness.spec.ts',
      explanation:
        'The switcher served the cached board without comparing workspace identity; gating the cache on the requested identifier in src/frontend/accountCache.ts returns the correct dashboard.',
    },
    preFix: {
      symptomReport:
        'People who can open more than one account describe the switcher leaving the screen unchanged: ' +
        'headings and figures still belong to the earlier account. Reloading the page always corrects the display.',
      sourceSnapshot:
        '--- src/frontend/router.ts\n' +
        'Module router.ts exposes resolveRoute(pathname) and buildAccountRoute(accountId, section). ' +
        'Helpers normalizeRoutePath and extractRouteParams map locations to sections without touching cached data.\n' +
        '--- src/frontend/sessionStore.ts\n' +
        'Module sessionStore.ts exposes readSessionToken() and refreshSessionExpiry(nowMs). ' +
        'Helpers decodeSessionPayload and isSessionExpired guard navigation; account content lives elsewhere.\n' +
        '--- src/frontend/themeCache.ts\n' +
        'Module themeCache.ts exposes resolveThemePreference(accountId) and applyThemeVariables(theme). ' +
        'Helpers readStoredTheme and mergeThemeOverrides only affect presentation tokens.\n' +
        '--- src/frontend/accountCache.ts\n' +
        'Module src/frontend/accountCache.ts exposes switchAccount(id) backed by module-level cachedView and ' +
        'cachedAccountId slots. Current implementation returns cachedView unconditionally once populated. ' +
        'A loader loadAccountView(id) refreshes both slots when called; helpers describeAccountHeader and ' +
        'summarizeAccountBalances read from whatever view is resident.\n' +
        '--- src/frontend/profileView.ts\n' +
        'Module profileView.ts exposes renderProfileHeader(view) and renderBalanceSummary(view). ' +
        'Helpers formatDisplayName and formatBalanceFigure present whichever view the caller supplies.\n' +
        '--- src/frontend/notificationCenter.ts\n' +
        'Module notificationCenter.ts exposes listAccountNotices(accountId) and dismissAccountNotice(noticeId). ' +
        'Helpers filterVisibleNotices and sortNoticesByRecency scope banners per account when given the right id.\n',
      reproSteps:
        '1. Sign in with two reachable accounts. ' +
        '2. Open the first account board, then use the switcher to open the second. ' +
        '3. Compare the shown heading and figures against the second account record.',
      discriminator: { kind: 'STALE_CACHE', cachedId: 7, requestedId: 9 },
    },
  },
  {
    caseId: 'efficacy-auth-multisurface-003',
    productFamily: 'ledger-web',
    category: 'regression',
    hidden: {
      fixCommit: '89ab01cd23ef4567890123456789abcdef01234567',
      fixDiff:
        'diff --git a/src/auth/loginRedirect.ts b/src/auth/loginRedirect.ts\n' +
        '--- a/src/auth/loginRedirect.ts\n' +
        '+++ b/src/auth/loginRedirect.ts\n' +
        '@@ -24,7 +24,7 @@ export function postLoginTarget(returnTo: string | null): string {\n' +
        '-  return returnTo ?? DEFAULT_LANDING;\n' +
        '+  return isSameOriginPath(returnTo) ? (returnTo as string) : DEFAULT_LANDING;\n',
      issueTitle: 'Sign-in continuation follows external destinations',
      bugDescription:
        'Crafted sign-in links send users to an outside lookalike site after authentication instead of returning inside the product.',
      knownFailingTest: 'signin-continuation-guard.spec.ts',
      explanation:
        'The continuation handler trusted the caller destination without origin checks; restricting landings to same-origin paths in src/auth/loginRedirect.ts blocks external hops.',
    },
    preFix: {
      symptomReport:
        'Abuse reports describe entry links that finish authentication and then place the user on an unfamiliar ' +
        'outside domain rather than back in the product. The authenticated session itself is otherwise normal.',
      sourceSnapshot:
        '--- src/auth/sessionToken.ts\n' +
        'Module sessionToken.ts exposes mintSessionToken(subject) and verifySessionToken(token). ' +
        'Helpers encodeTokenPayload and checkTokenExpiry guard session integrity; navigation targets are out of scope.\n' +
        '--- src/auth/passwordReset.ts\n' +
        'Module passwordReset.ts exposes requestPasswordReset(loginId) and completePasswordReset(token, secret). ' +
        'Helpers generateResetToken and validateResetWindow bound the flow lifetime without choosing landings.\n' +
        '--- src/auth/loginRedirect.ts\n' +
        'Module src/auth/loginRedirect.ts exposes postLoginTarget(returnTo). Current implementation trusts the ' +
        'caller-supplied destination outright: return returnTo ?? DEFAULT_LANDING. ' +
        'A predicate isSameOriginPath exists in the module but is never consulted on this path; helpers ' +
        'resolveDefaultLanding and sanitizeLandingFragment shape only the fallback.\n' +
        '--- src/auth/mfaChallenge.ts\n' +
        'Module mfaChallenge.ts exposes startMfaChallenge(subject) and verifyMfaResponse(challengeId, code). ' +
        'Helpers generateChallengeCode and checkChallengeExpiry gate the second factor independently.\n' +
        '--- src/auth/auditLog.ts\n' +
        'Module auditLog.ts exposes recordAuthEvent(event) and listRecentAuthEvents(subject). ' +
        'Helpers serializeAuthEvent and redactSensitiveFields keep the trail queryable after navigation.\n',
      reproSteps:
        '1. Begin authentication with a continuation pointing at an outside domain. ' +
        '2. Finish the credential check. ' +
        '3. Note where the final navigation lands.',
      discriminator: { kind: 'OPEN_REDIRECT', returnTo: 'https://evil-mirror.test' },
    },
  },
  {
    caseId: 'efficacy-negative-multisurface-000',
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
        'Scheduled sweep of the status surface shows steady latency and no error responses across the window. ' +
        'No user report accompanies this sweep.',
      sourceSnapshot:
        '--- src/health/status.ts\n' +
        'Module status.ts exposes readStatus() returning static version metadata plus uptimeCounters. ' +
        'Helpers formatVersionBanner and summarizeUptimeWindows read only local counters.\n' +
        '--- src/health/readiness.ts\n' +
        'Module readiness.ts exposes checkReadiness() combining dependencyProbes into a single flag. ' +
        'Helpers evaluateProbeResults and describeDegradedReasons report current state without side effects.\n' +
        '--- src/health/metrics.ts\n' +
        'Module metrics.ts exposes collectHealthMetrics() and resetHealthMetrics(). ' +
        'Helpers aggregateLatencyBuckets and countErrorResponses summarize the window honestly.\n' +
        '--- src/health/uptime.ts\n' +
        'Module uptime.ts exposes readUptimeSeconds() and readLastRestartMarker(). ' +
        'Helpers convertMonotonicTicks and formatDurationComponents derive display values from the clock.\n' +
        '--- src/health/version.ts\n' +
        'Module version.ts exposes readBuildVersion() and readReleaseChannel(). ' +
        'Helpers parseVersionString and compareVersionCounters back the status banner.\n',
      reproSteps:
        '1. Query the local status surface ten times. ' +
        '2. Confirm each reply carries the expected version marker. ' +
        '3. Confirm the window holds zero error responses.',
      discriminator: { kind: 'HEALTH_OK', version: '2.4.1' },
    },
  },
];

function buildCases(): readonly DefinedBenchmarkCase[] {
  return Object.freeze(MULTI_TARGET_INPUTS.map((input) => defineBenchmarkCase(input)));
}

let cached: readonly DefinedBenchmarkCase[] | null = null;

/** Leak-isolated multi-target cases (5-6 approved paths each). */
export function multiTargetEfficacyCases(): readonly DefinedBenchmarkCase[] {
  cached ??= buildCases();
  return cached;
}

/** Case ids in declaration order. */
export const MULTI_TARGET_EFFICACY_CASE_IDS: readonly string[] = Object.freeze(
  MULTI_TARGET_INPUTS.map((input) => input.caseId),
);
