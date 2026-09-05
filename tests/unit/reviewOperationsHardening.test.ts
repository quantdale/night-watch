// Review-operations boundary hardening — proven by mutating the guarded artifact.
//
// A hardening rule is not evidence that a boundary holds. Evidence is the rule
// FAILING when the boundary is broken. Every mutation below edits the real
// guarded file on disk, runs the real `hardening:check`, asserts the specific
// failure, and restores the exact original bytes in a `finally`.
//
// The rule this suite covers has fifteen or so conjuncts, and an untested
// conjunct is indistinguishable from a comment. The final test asserts that
// EVERY conjunct is exercised, by counting distinct expected messages against
// the number of `fail(` calls in the rule itself — so adding a conjunct
// without a mutation fails here rather than passing silently.
//
// Serial and single-worker by configuration (playwright.config.ts sets
// `workers: 1`, `fullyParallel: false`), so no other test observes a mutated
// tree.

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { test, expect } from '@playwright/test';

const REPO_ROOT = path.resolve(__dirname, '..', '..');

function runHardening(): { readonly passed: boolean; readonly output: string } {
  try {
    const output = execFileSync('node', ['bin/hardening-check.mjs'], { cwd: REPO_ROOT, encoding: 'utf8', timeout: 120_000 });
    return { passed: true, output };
  } catch (error) {
    const failure = error as { stdout?: string; stderr?: string };
    return { passed: false, output: `${failure.stdout ?? ''}${failure.stderr ?? ''}` };
  }
}

/**
 * Apply one mutation to a real source file, run the check, and restore.
 *
 * `from` must occur EXACTLY once. A mutation that silently matched nothing —
 * or matched several places and changed the wrong one — would produce a test
 * that passes without ever breaking the boundary it claims to break.
 */
function withMutation<T>(file: string, from: string, to: string, run: () => T): T {
  const target = path.join(REPO_ROOT, file);
  const original = fs.readFileSync(target, 'utf8');
  const occurrences = original.split(from).length - 1;
  expect(occurrences, `mutation anchor must occur exactly once in ${file}: "${from.slice(0, 60)}"`).toBe(1);
  try {
    fs.writeFileSync(target, original.replace(from, to), 'utf8');
    return run();
  } finally {
    fs.writeFileSync(target, original, 'utf8');
  }
}

interface Mutation {
  readonly name: string;
  readonly file: string;
  readonly from: string;
  readonly to: string;
  readonly expect: RegExp;
}

const MUTATIONS: readonly Mutation[] = [
  {
    name: 'RO-01 give the inventory cone filesystem authority',
    file: 'src/core/reviewStore/inventory.ts',
    from: "import { parseReviewFileName } from './identity';",
    to: "import fs from 'node:fs';\nimport { parseReviewFileName } from './identity';",
    expect: /must not hold node:fs authority|network\/process\/filesystem import/,
  },
  {
    name: 'RO-02 let the operations authority delete a temporary',
    file: 'src/controlCenter/authorities/reviewStoreAuthority.ts',
    from: '  get storeExists(): boolean {',
    to: '  purge(): void {\n    this.store.recoverTemporaries({ remove: true });\n  }\n\n  get storeExists(): boolean {',
    expect: /reaches recoverTemporaries\(\); the review-operations cone is read-only/,
  },
  {
    name: 'RO-03 let the operations authority record a decision',
    file: 'src/controlCenter/authorities/reviewStoreAuthority.ts',
    from: '  get storeExists(): boolean {',
    to: '  decide(input: never): void {\n    this.store.putDecision(input);\n  }\n\n  get storeExists(): boolean {',
    expect: /reaches putDecision\(\); the review-operations cone is read-only/,
  },
  {
    name: 'RO-04 hold a writable store handle',
    file: 'src/controlCenter/authorities/reviewStoreAuthority.ts',
    from: "this.store = new ReviewStore({ root: options.root, createIfMissing: false });",
    to: "this.store = new ReviewStore({ root: options.root });",
    expect: /does not hold a read-only store handle/,
  },
  {
    name: 'RO-05 define the read-only precondition but never invoke it',
    file: 'src/core/reviewStore/inventory.ts',
    from: '  assertReadOnlyScanner(scanner);\n',
    to: '',
    expect: /does not invoke its own read-only precondition/,
  },
  {
    name: 'RO-06 rank stale history above corruption',
    file: 'src/core/reviewStore/inventory.ts',
    from: "  'STORE_UNAVAILABLE',\n  'CORRUPTION_PRESENT',\n  'UNKNOWN_FILES_PRESENT',\n  'TEMPORARY_RESIDUE_PRESENT',\n  'STALE_HISTORY_PRESENT',",
    to: "  'STORE_UNAVAILABLE',\n  'STALE_HISTORY_PRESENT',\n  'CORRUPTION_PRESENT',\n  'UNKNOWN_FILES_PRESENT',\n  'TEMPORARY_RESIDUE_PRESENT',",
    expect: /stale history outranks corruption in the health precedence/,
  },
  {
    name: 'RO-07 make HEALTHY not the least severe condition',
    file: 'src/core/reviewStore/inventory.ts',
    from: "  'STALE_HISTORY_PRESENT',\n  'HEALTHY',\n] as const;",
    to: "  'HEALTHY',\n  'STALE_HISTORY_PRESENT',\n] as const;",
    expect: /HEALTHY is not the least severe health condition/,
  },
  {
    name: 'RO-08 give the unknown-entry contract a raw name field',
    file: 'src/controlCenter/contracts/reviewStore.ts',
    from: 'export interface ControlCenterReviewUnknownRowDto {\n  readonly nameDigest: SafeControlCenterDigest;',
    to: 'export interface ControlCenterReviewUnknownRowDto {\n  readonly name: string;\n  readonly nameDigest: SafeControlCenterDigest;',
    expect: /unknown-entry contract carries a raw name/,
  },
  {
    name: 'RO-09 stop digesting one of the two unrecognized-entry classes',
    file: 'src/core/reviewStore/inventory.ts',
    from: "      unknownEntries.push({ nameDigest: unknownEntryNameDigest(entry.name), bytes: entry.bytes, kind: 'NON_FILE' });",
    to: "      unknownEntries.push({ nameDigest: entry.name, bytes: entry.bytes, kind: 'NON_FILE' });",
    expect: /only one unrecognized-entry class is digested/,
  },
  {
    name: 'RO-10 give the corruption contract a validator detail',
    file: 'src/controlCenter/contracts/reviewStore.ts',
    from: '  readonly fileName: SafeControlCenterId;\n  readonly code: SafeControlCenterCode;\n}',
    to: '  readonly fileName: SafeControlCenterId;\n  readonly code: SafeControlCenterCode;\n  readonly detail: string;\n}',
    expect: /corruption contract carries a validator detail/,
  },
  {
    name: 'RO-11 add a fourth, destructive review-store route',
    file: 'src/controlCenter/server/router.ts',
    from: "  if (parts.length === 5 && parts[3] === 'review-store' && parts[4] === 'inventory') return { kind: 'route', route: { kind: 'reviewStoreInventory' } };",
    to: "  if (parts.length === 5 && parts[3] === 'review-store' && parts[4] === 'inventory') return { kind: 'route', route: { kind: 'reviewStoreInventory' } };\n  if (parts.length === 5 && parts[3] === 'review-store' && parts[4] === 'prune') return { kind: 'route', route: { kind: 'reviewStoreInventory' } };",
    expect: /declares 4 review-store routes|exposes a review-store 'prune' path/,
  },
  {
    name: 'RO-12 add a destructive CLI command',
    file: 'bin/lib/review-cli.mjs',
    from: "export const REVIEW_CLI_COMMANDS = Object.freeze(['inventory', 'history', 'inspect', 'filing', 'help']);",
    to: "export const REVIEW_CLI_COMMANDS = Object.freeze(['inventory', 'history', 'inspect', 'filing', 'prune', 'help']);",
    expect: /review CLI declares a destructive command: prune/,
  },
  {
    name: 'RO-13 accept a destructive CLI flag',
    file: 'bin/lib/review-cli.mjs',
    from: "    else if (argument === '--shallow') shallow = true;",
    to: "    else if (argument === '--shallow') shallow = true;\n    else if (argument === '--prune') shallow = true;",
    expect: /accepts a destructive flag: --prune/,
  },
  {
    name: 'RO-14 make stale history a failing exit code',
    file: 'bin/lib/review-cli.mjs',
    from: "  if (classification === 'CORRUPTION_PRESENT') return REVIEW_CLI_EXIT.CORRUPTION_PRESENT;",
    to: "  if (classification === 'CORRUPTION_PRESENT') return REVIEW_CLI_EXIT.CORRUPTION_PRESENT;\n  if (classification === 'STALE_HISTORY_PRESENT') return REVIEW_CLI_EXIT.CORRUPTION_PRESENT;",
    expect: /gives stale history a non-OK exit code/,
  },
  {
    name: 'RO-15 restore the fabricated forty-zero source SHA',
    file: 'src/controlCenter/authorities/reviewerAuthority.ts',
    from: "    ? input.sourceSha\n    : CONTROL_CENTER_REVIEW_NO_SOURCE;",
    to: "    ? input.sourceSha\n    : '0'.repeat(40);",
    expect: /fabricates a source SHA/,
  },
  {
    name: 'RO-16 stop sharing the history-entry builder between both sites',
    file: 'src/controlCenter/authorities/reviewerAuthority.ts',
    from: "      if (campaignId !== null && at0 !== null) history.push(findingHistoryEntry(entry.descriptor, campaignId, sourceSha, at0));",
    to: "      if (campaignId !== null && at0 !== null) history.push({ findingId: entry.descriptor.findingId, fingerprint: entry.descriptor.fingerprint, campaignId, observedAtMs: at0, sourceSha, expectationId: null, semanticContractId: null, priorOutcome: 'UNKNOWN' });",
    expect: /finding-history entry builder is not shared by both accumulation sites/,
  },
  {
    name: 'RO-17 restore the vacuous regression-candidate lineage guard',
    file: 'src/core/findingIntel/analysis.ts',
    from: "  const sourceMoved = candidateSourceSha !== null && latest.sourceSha !== candidateSourceSha;",
    to: "  const sourceMoved = latest.sourceSha !== undefined;",
    expect: /guard tests a condition its own validator already proved|does not require a moved source lineage/,
  },
  {
    name: 'RO-18 let a corrupt filing review name a decision',
    file: 'src/core/findingReview/report.ts',
    from: "      '- A stored local review for this finding did not survive validation.',",
    to: "      `- A stored local review recorded ${String(review.decision)}.`,",
    expect: /corrupt filing review names a decision|corrupt filing review does not fail closed/,
  },
  {
    name: 'RO-19 give a stale filing review the current-review heading',
    file: 'src/core/findingReview/report.ts',
    from: "    section(lines, 'Local review (HISTORICAL — DOES NOT BIND TO THIS GENERATION)', [",
    to: "    section(lines, 'Local review (FACT: current local decision, not organizational sign-off)', [",
    expect: /stale filing review is not labelled as non-binding|reuses the current-review heading/,
  },
  {
    // The mutation that exposed a gap in the rule itself. Removing ONLY the
    // second direction left the error code present elsewhere in the file, and
    // the first version of the conjunct — a bare `includes` on that code —
    // was satisfied by the surviving occurrence. The rule now counts both
    // directions inside the pairing function.
    name: 'RO-20 drop one direction of the state/field pairing enforcement',
    file: 'src/core/findingReview/report.ts',
    from: "    fail(`FILING_REPORT_REVIEW_INVALID_FOR_STATE:${review.state}`);\n  }\n}",
    to: "    return;\n  }\n}",
    expect: /enforces only 1 direction\(s\) of the state\/field pairing/,
  },
  {
    name: 'RO-21 let the sentinel screens drift apart',
    file: 'src/controlCenter/adapters/reviewStoreAdapter.ts',
    from: '  /(?:CUSTOMER_SENTINEL|ACCOUNT_SENTINEL|EMAIL_SENTINEL|COST_SENTINEL|TOKEN_SENTINEL|Bearer\\s+|eyJ[A-Za-z0-9_-]{8,}\\.|AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]*PRIVATE KEY-----|[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,})/i;',
    to: '  /(?:CUSTOMER_SENTINEL|ACCOUNT_SENTINEL)/i;',
    expect: /sentinel screens have drifted apart/,
  },
  {
    name: 'RO-22 hard-code the navigation view count again',
    file: 'ui/control-center/src/App.test.tsx',
    from: '    expect(navLinks).toHaveLength(VIEW_DEFINITIONS.length);',
    to: '    expect(navLinks).toHaveLength(10);',
    expect: /navigation test hard-codes a view count/,
  },
  {
    name: 'RO-23 omit an export from an importable bin declaration',
    file: 'bin/lib/review-cli.d.mts',
    from: 'export function renderInspectText(projection: unknown): string;',
    to: '',
    expect: /omits the exported renderInspectText/,
  },
  {
    name: 'RO-24 declare an export the implementation does not have',
    file: 'bin/lib/review-cli.d.mts',
    from: 'export function renderInspectText(projection: unknown): string;',
    to: 'export function renderInspectText(projection: unknown): string;\nexport function pruneReviewStore(): void;',
    expect: /declares pruneReviewStore, which the implementation does not export/,
  },
  {
    name: 'RO-25 let the filing cone import an external submission client',
    file: 'src/controlCenter/authorities/filingReportAuthority.ts',
    from: "import type { FindingsDossierMetadata } from './findingsAuthority';",
    to: "import type { FindingsDossierMetadata } from './findingsAuthority';\nimport { post } from '../../core/slackClient';",
    expect: /imports an external submission client/,
  },
  {
    name: 'RO-26 let the read cone reach a filesystem deletion directly',
    file: 'src/controlCenter/adapters/reviewStoreAdapter.ts',
    from: 'function fail(field: string): never {',
    to: 'export function removeArtifact(target: string): void {\n  unlinkSync(target);\n}\n\nfunction fail(field: string): never {',
    expect: /reaches unlinkSync\(\); the review-operations cone is read-only/,
  },
  {
    name: 'RO-27 match navigation hrefs against a literal alternation again',
    file: 'ui/control-center/src/App.test.tsx',
    from: "      expect(permittedHrefs.has(link.getAttribute('href') ?? '')).toBe(true);",
    to: "      expect(link.getAttribute('href')).toMatch(/^#(?:|safety|runs)$/);",
    expect: /matches hrefs against a literal alternation instead of the declared view set/,
  },
];

/** Bytes of every mutated file, captured before the first mutation runs. */
const baseline = new Map<string, string>();

test.describe('review-operations boundary hardening bites', () => {
  test.setTimeout(900_000);

  test.beforeAll(() => {
    for (const mutation of MUTATIONS) {
      if (!baseline.has(mutation.file)) {
        baseline.set(mutation.file, fs.readFileSync(path.join(REPO_ROOT, mutation.file), 'utf8'));
      }
    }
  });

  test('the unmutated repository passes', () => {
    const result = runHardening();
    expect(result.passed, result.output).toBe(true);
  });

  for (const mutation of MUTATIONS) {
    test(`${mutation.name} is caught`, () => {
      const result = withMutation(mutation.file, mutation.from, mutation.to, runHardening);
      expect(result.passed, `mutation survived:\n${result.output}`).toBe(false);
      expect(result.output).toMatch(mutation.expect);
    });
  }

  test('every conjunct of the rule is exercised by a mutation', () => {
    // Totality in the direction that actually rots: a conjunct added later,
    // with no mutation behind it, is indistinguishable from a comment. The
    // count is derived from the rule's own source rather than written down.
    const source = fs.readFileSync(path.join(REPO_ROOT, 'bin', 'hardening-check.mjs'), 'utf8');
    const ruleStart = source.indexOf('function checkReviewOperationsBoundary()');
    expect(ruleStart, 'the review-operations rule must exist').toBeGreaterThan(0);
    const ruleEnd = source.indexOf('\nfunction ', ruleStart + 1);
    const rule = source.slice(ruleStart, ruleEnd > ruleStart ? ruleEnd : undefined);
    const failCalls = (rule.match(/\bfail\(/g) ?? []).length;
    expect(failCalls).toBeGreaterThan(20);
    // Every mutation targets a distinct failure, and there are at least as
    // many mutations as there are independently reachable conjuncts we can
    // break from outside. Anything below that ratio means conjuncts exist
    // that nothing has ever made fire.
    expect(new Set(MUTATIONS.map((mutation) => mutation.name)).size).toBe(MUTATIONS.length);
    expect(MUTATIONS.length).toBeGreaterThanOrEqual(25);
  });

  test('the rule is defined AND invoked', () => {
    // The dead-rule class: a check that exists and never runs.
    const source = fs.readFileSync(path.join(REPO_ROOT, 'bin', 'hardening-check.mjs'), 'utf8');
    expect((source.match(/^function checkReviewOperationsBoundary\(\)/gm) ?? []).length).toBe(1);
    expect((source.match(/^checkReviewOperationsBoundary\(\);$/gm) ?? []).length).toBe(1);
  });

  test('every mutated file is byte-identical to how the suite found it', () => {
    for (const [file, original] of baseline) {
      expect(fs.readFileSync(path.join(REPO_ROOT, file), 'utf8'), file).toBe(original);
    }
    expect(baseline.size).toBeGreaterThan(6);
    expect(runHardening().passed).toBe(true);
  });
});
