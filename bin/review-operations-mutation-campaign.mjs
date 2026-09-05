#!/usr/bin/env node
// @ts-check

/**
 * Review operations, history and filing — behavioural mutation campaign.
 *
 * The hardening bite harness proves the STRUCTURAL rules fire. This proves
 * something different and, for an operator-facing read surface, more
 * important: that the TEST SUITES catch a behavioural regression. A guard
 * only a regex notices is a guard that disappears the moment someone
 * rewrites the code in a shape the regex does not recognize.
 *
 * Each mutation edits one real source file, runs the suites that should have
 * an opinion about it, and is DETECTED when at least one of them fails. The
 * original bytes are restored in a `finally`, and the tree is verified
 * byte-identical at the end.
 *
 * Equivalent and control mutations are declared as such with a reason. A
 * survivor that is not explicitly justified is a campaign failure.
 *
 * Two items from the campaign brief's list have no mutation here, and the
 * receipt says so rather than inventing one: "trust a derived index over
 * canonical files" and "hide index corruption" describe a derived index that
 * this campaign measured and deliberately did not build. Directory scans are
 * linear and adequate at 50,000 reviews, so there is no index to distrust.
 *
 * Local and offline. Reads and writes only this repository's own sources.
 */

import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const INVENTORY_SUITES = ['tests/unit/reviewStoreInventory.test.ts'];
const OPS_SUITES = ['tests/unit/reviewStoreAuthority.test.ts'];
const PROJECTION_SUITES = ['tests/unit/reviewStoreProjection.test.ts'];
const INTEGRITY_SUITES = ['tests/unit/reviewOperationsIntegrity.test.ts'];
const FILING_SUITES = ['tests/unit/filingReportReviewState.test.ts', 'tests/unit/humanFilingReport.test.ts'];
const IDENTITY_SUITES = ['tests/unit/historicalIdentityPropagation.test.ts', 'tests/unit/findingIntel.test.ts'];
const CLI_SUITES = ['tests/unit/reviewCli.test.ts'];
const HARDENING_SUITES = ['tests/unit/reviewOperationsHardening.test.ts'];
const ANCHOR_SUITES = ['tests/unit/terminalAnchorTruth.test.ts'];

/**
 * @typedef {{
 *   id: string, title: string, brief?: number, file: string, from: string, to: string,
 *   suites: string[], kind?: 'EQUIVALENT' | 'CONTROL', why?: string
 * }} Mutation
 */

/** @type {Mutation[]} */
const MUTATIONS = [
  {
    id: 'RO-B-01',
    brief: 1,
    title: 'hide a corrupt review when a valid sibling exists',
    file: 'src/core/reviewStore/inventory.ts',
    from: "    if ('corruption' in inspected) {\n      counts.corruptArtifacts += 1;",
    to: "    if ('corruption' in inspected) {\n      if (counts.validArtifacts > 0) continue;\n      counts.corruptArtifacts += 1;",
    suites: [...INVENTORY_SUITES, ...INTEGRITY_SUITES],
  },
  {
    id: 'RO-B-02',
    brief: 2,
    title: 'classify a stale review as current',
    file: 'src/controlCenter/authorities/reviewStoreAuthority.ts',
    from: "        return (error as Error).message.startsWith('FINDING_REVIEW_STALE') ? 'STALE' : 'UNKNOWN';",
    to: "        return (error as Error).message.startsWith('FINDING_REVIEW_STALE') ? 'CURRENT' : 'UNKNOWN';",
    suites: OPS_SUITES,
  },
  {
    id: 'RO-B-03',
    brief: 3,
    title: 'count an interrupted-publish temporary as a canonical review',
    file: 'src/core/reviewStore/inventory.ts',
    from: "    if (entry.kind === 'TEMPORARY') {\n      counts.temporaryArtifacts += 1;",
    to: "    if (entry.kind === 'TEMPORARY') {\n      counts.canonicalArtifacts += 1;",
    suites: [...INVENTORY_SUITES, ...INTEGRITY_SUITES],
  },
  {
    id: 'RO-B-04',
    brief: 4,
    title: 'treat an unrecognized entry as canonical instead of preserving it categorically',
    file: 'src/core/reviewStore/inventory.ts',
    from: "    if (entry.kind !== 'JSON' || parseReviewFileName(entry.name) === null) {",
    to: "    if (false && entry.kind !== 'JSON') {",
    suites: [...INVENTORY_SUITES, ...INTEGRITY_SUITES],
  },
  {
    id: 'RO-B-05',
    brief: 5,
    title: 'derive the current generation from listing order instead of proving it',
    file: 'src/core/reviewStore/history.ts',
    from: "  const currentIdentity = result.state === 'CURRENT' && result.envelope !== null ? result.envelope.reviewIdentity : null;",
    to: "  const currentIdentity = result.generations.length > 0 ? (result.generations[0] as { reviewIdentity: string }).reviewIdentity : null;",
    suites: [...INVENTORY_SUITES, ...OPS_SUITES],
  },
  {
    id: 'RO-B-06',
    brief: 6,
    title: 'fabricate a source SHA for finding history again',
    file: 'src/controlCenter/authorities/reviewerAuthority.ts',
    from: "    ? input.sourceSha\n    : CONTROL_CENTER_REVIEW_NO_SOURCE;",
    to: "    ? input.sourceSha\n    : '0'.repeat(40);",
    suites: [...IDENTITY_SUITES, ...HARDENING_SUITES],
  },
  {
    id: 'RO-B-07',
    brief: 7,
    title: 'borrow the current artifact expectation identity onto a historical generation',
    file: 'src/core/reviewStore/history.ts',
    from: '    expectationId: null,\n    semanticContractId: null,\n    identityAbsenceReason: REVIEW_HISTORY_IDENTITY_ABSENCE,',
    to: "    expectationId: 'expectation.borrowed' as never,\n    semanticContractId: null,\n    identityAbsenceReason: REVIEW_HISTORY_IDENTITY_ABSENCE,",
    suites: [...INVENTORY_SUITES, ...OPS_SUITES, ...PROJECTION_SUITES],
  },
  {
    id: 'RO-B-08',
    brief: 8,
    title: 'infer a semantic identity from the dossier content digest',
    file: 'src/controlCenter/authorities/reviewerAuthority.ts',
    from: '    semanticContractId: dossier.semanticContractId ?? null,',
    to: "    semanticContractId: dossier.semanticContractId ?? `inv:derived.${dossier.contentDigest.slice(-8)}`,",
    suites: IDENTITY_SUITES,
  },
  {
    id: 'RO-B-09',
    brief: 9,
    title: 'let the review-store surface claim organizational authority',
    file: 'src/controlCenter/adapters/reviewStoreAdapter.ts',
    from: "    readOnly: true,\n    retentionPolicy: 'NONE_OWNER_DECISION_PENDING',\n    organizationalAuthority: 'NONE_LOCAL_REVIEW_ONLY',\n  };\n}\n\nfunction projectGeneration",
    to: "    readOnly: true,\n    retentionPolicy: 'NONE_OWNER_DECISION_PENDING',\n    organizationalAuthority: 'LESLIE_GENUINE' as never,\n  };\n}\n\nfunction projectGeneration",
    suites: PROJECTION_SUITES,
  },
  {
    id: 'RO-B-10',
    brief: 10,
    title: 'render a stale review with the current-decision heading',
    file: 'src/core/findingReview/report.ts',
    from: "    section(lines, 'Local review (HISTORICAL — DOES NOT BIND TO THIS GENERATION)', [",
    to: "    section(lines, 'Local review (FACT: current local decision, not organizational sign-off)', [",
    suites: FILING_SUITES,
  },
  {
    id: 'RO-B-11',
    brief: 11,
    title: 'drop the local-review non-equivalence block',
    file: 'src/core/findingReview/report.ts',
    from: "const NOT_EQUIVALENT_TO: readonly string[] = [\n  '- This is a Nightwatch LOCAL review only. It is NOT:',",
    to: "const NOT_EQUIVALENT_TO: readonly string[] = [\n  '- Local review.',",
    suites: FILING_SUITES,
  },
  {
    id: 'RO-B-12',
    brief: 13,
    title: 'omit the surface privacy screen on the filing markdown',
    file: 'src/controlCenter/adapters/reviewStoreAdapter.ts',
    from: "  if (SENTINEL_RE.test(markdown)) fail('filing.markdown');",
    to: '  void markdown;',
    suites: PROJECTION_SUITES,
  },
  {
    id: 'RO-B-13',
    brief: 14,
    title: 'leak the rejected value through the projection error',
    file: 'src/controlCenter/adapters/reviewStoreAdapter.ts',
    from: '    super(`REVIEW_STORE_PROJECTION_INVALID:${field}`);',
    to: '    super(`REVIEW_STORE_PROJECTION_INVALID:${field}`);\n    this.message = `${this.message}:${String((globalThis as { __lastRejected?: unknown }).__lastRejected ?? field)}`;',
    kind: 'CONTROL',
    why:
      'The error class has no access to the rejected VALUE by construction — ' +
      'fail() is called with a field name and nothing else — so this mutation ' +
      'cannot leak one and no suite should fail. It is the campaign asserting ' +
      'that the no-value-in-errors property is structural rather than a habit.',
    suites: PROJECTION_SUITES,
  },
  {
    id: 'RO-B-14',
    brief: 15,
    title: 'make the inventory depend on filesystem enumeration order',
    file: 'src/core/reviewStore/inventory.ts',
    from: '  const entries = [...scanner.entries()].sort((left, right) => left.name.localeCompare(right.name));',
    to: '  const entries = [...scanner.entries()];',
    suites: [...INVENTORY_SUITES, ...INTEGRITY_SUITES],
  },
  {
    id: 'RO-B-15',
    brief: 16,
    title: 'order the inventory by filesystem mtime instead of by content',
    file: 'src/core/reviewStore/inventory.ts',
    from: '  const entries = [...scanner.entries()].sort((left, right) => left.name.localeCompare(right.name));',
    to: '  const entries = [...scanner.entries()].sort((left, right) => left.mtimeMs - right.mtimeMs);',
    suites: [...INVENTORY_SUITES, ...INTEGRITY_SUITES],
  },
  {
    id: 'RO-B-16',
    brief: 19,
    title: 'count a corrupt review as a valid one',
    file: 'src/core/reviewStore/inventory.ts',
    from: '      counts.corruptArtifacts += 1;',
    to: '      counts.corruptArtifacts += 1;\n      counts.validArtifacts += 1;',
    suites: [...INVENTORY_SUITES, ...INTEGRITY_SUITES],
  },
  {
    id: 'RO-B-17',
    brief: 20,
    title: 'treat the existence of a review as proof of a prior fix',
    file: 'src/controlCenter/authorities/reviewerAuthority.ts',
    from: "    priorOutcome: 'UNKNOWN',\n  };\n}",
    to: "    priorOutcome: 'RESOLVED_FIXED',\n  };\n}",
    suites: IDENTITY_SUITES,
  },
  {
    id: 'RO-B-18',
    brief: 21,
    title: 'make the regression rule ignore source lineage',
    file: 'src/core/findingIntel/analysis.ts',
    from: '  const sourceMoved = candidateSourceSha !== null && latest.sourceSha !== candidateSourceSha;',
    to: '  const sourceMoved = true;',
    suites: [...IDENTITY_SUITES, ...HARDENING_SUITES],
  },
  {
    id: 'RO-B-19',
    brief: 22,
    title: 'over-collapse defect classes by falling back to the finding id',
    file: 'src/core/findingIntel/analysis.ts',
    from: '    const invariant = member.semanticContractId ?? member.expectationId;\n    if (invariant === null) continue;',
    to: "    const invariant = member.semanticContractId ?? member.expectationId ?? 'ALL';",
    suites: IDENTITY_SUITES,
  },
  {
    id: 'RO-B-20',
    brief: 23,
    title: 'collapse the history current/stale distinction to one label',
    file: 'src/core/reviewStore/history.ts',
    from: "    const currentness: ReviewArtifactCurrentness = envelope.reviewIdentity === currentIdentity ? 'CURRENT' : 'STALE';",
    to: "    const currentness: ReviewArtifactCurrentness = 'CURRENT';",
    suites: [...INVENTORY_SUITES, ...OPS_SUITES],
  },
  {
    id: 'RO-B-21',
    brief: 29,
    title: 'classify ordinary stale history as corruption',
    file: 'src/core/reviewStore/inventory.ts',
    from: "  if (input.corruptArtifacts > 0) conditions.push('CORRUPTION_PRESENT');",
    to: "  if (input.corruptArtifacts > 0 || input.staleArtifacts > 0) conditions.push('CORRUPTION_PRESENT');",
    suites: [...INVENTORY_SUITES, ...OPS_SUITES],
  },
  {
    id: 'RO-B-22',
    brief: 30,
    title: 'let the inventory hold a writable handle and touch the store',
    file: 'src/controlCenter/authorities/reviewStoreAuthority.ts',
    from: 'this.store = new ReviewStore({ root: options.root, createIfMissing: false });',
    to: 'this.store = new ReviewStore({ root: options.root });',
    suites: [...OPS_SUITES, ...HARDENING_SUITES],
  },
  {
    id: 'RO-B-23',
    brief: 28,
    title: 'permit a live-authority marker as a terminal implementation anchor',
    file: 'bin/agent-continuity-protocol.mjs',
    from: '  if (isLiveAuthorityMarker(claim.value)) {',
    to: '  if (false && isLiveAuthorityMarker(claim.value)) {',
    suites: ANCHOR_SUITES,
  },
  {
    id: 'RO-B-24',
    title: 'report the raw name of an unrecognized store entry',
    file: 'src/core/reviewStore/inventory.ts',
    from: 'export function unknownEntryNameDigest(name: string): string {\n  return sha256Hex(`review-store-unknown-entry:${name}`).slice(0, NAME_DIGEST_LENGTH);',
    to: 'export function unknownEntryNameDigest(name: string): string {\n  return name;',
    suites: [...INVENTORY_SUITES, ...INTEGRITY_SUITES, ...CLI_SUITES],
  },
  {
    id: 'RO-B-25',
    title: 'project the validator detail alongside the corruption code',
    file: 'src/core/reviewStore/inventory.ts',
    from: "      corruption.push({ fileName: inspected.corruption.fileName, code: inspected.corruption.code });",
    to: "      corruption.push({ fileName: inspected.corruption.fileName, code: inspected.corruption.code, detail: inspected.corruption.detail } as never);",
    suites: [...INVENTORY_SUITES, ...INTEGRITY_SUITES],
  },
  {
    id: 'RO-B-26',
    title: 'claim currentness was resolved when no resolver was supplied',
    file: 'src/core/reviewStore/inventory.ts',
    from: '    currentnessResolved: resolveCurrentness !== null,',
    to: '    currentnessResolved: true,',
    suites: [...INVENTORY_SUITES, ...OPS_SUITES, ...CLI_SUITES],
  },
  {
    id: 'RO-B-27',
    title: 'break the total order on generations by dropping the identity tiebreak',
    file: 'src/core/reviewStore/history.ts',
    from: '  return left.reviewIdentity < right.reviewIdentity ? -1 : left.reviewIdentity > right.reviewIdentity ? 1 : 0;',
    to: '  return 0;',
    suites: [...INVENTORY_SUITES, ...INTEGRITY_SUITES],
  },
  {
    id: 'RO-B-28',
    title: 'let a corrupt store state contribute a decision to the filing report',
    file: 'src/controlCenter/authorities/filingReportAuthority.ts',
    from: "    case 'CORRUPT':\n      return { ...absent, state: 'CORRUPT' };",
    to: "    case 'CORRUPT':\n      return { ...absent, state: 'NO_REVIEW' };",
    suites: FILING_SUITES,
  },
  {
    id: 'RO-B-29',
    title: 'drop the unbounded-row guard on the inventory',
    file: 'src/core/reviewStore/inventory.ts',
    from: '  return Math.min(requested, REVIEW_INVENTORY_MAX_ROWS);',
    to: '  return requested;',
    suites: INVENTORY_SUITES,
  },
  {
    id: 'RO-B-30',
    title: 'silently drop a review whose finding left the current snapshot',
    file: 'src/controlCenter/authorities/reviewStoreAuthority.ts',
    from: "      if (current === undefined) return 'UNKNOWN';",
    to: "      if (current === undefined) return 'STALE';",
    suites: OPS_SUITES,
  },
  {
    id: 'RO-B-31',
    title: 'compute whole-corpus intelligence for one filing report',
    file: 'src/controlCenter/authorities/reviewStoreAuthority.ts',
    from: '      onlyFindingIds: [findingId],\n      limit: 1,',
    to: '      limit: context.dossiers.length,',
    suites: [...OPS_SUITES, ...HARDENING_SUITES],
  },
  {
    id: 'RO-B-32',
    title: 'widen the absence return value with an empty generations list',
    file: 'src/controlCenter/authorities/reviewStoreAuthority.ts',
    from: "    if (dossier === undefined) return { absent: 'FINDING_NOT_IN_CURRENT_SNAPSHOT' };\n    const current = currentReviewArtifacts(dossier",
    to: "    if (dossier === undefined) return { absent: 'FINDING_NOT_IN_CURRENT_SNAPSHOT' as never, generations: [] } as never;\n    const current = currentReviewArtifacts(dossier",
    why:
      'Predicted EQUIVALENT on the reasoning that callers branch on the ' +
      '`absent` discriminant rather than on object shape, and DETECTED. The ' +
      'prediction was wrong: the widened return value stops satisfying the ' +
      "declared type, so the cone fails to build. Reclassified BEHAVIOURAL " +
      'rather than relabelled away — a mispredicted equivalence is evidence ' +
      'about the contract, and hiding it would make the campaign useless as a ' +
      'record of what was actually learned.',
    suites: OPS_SUITES,
  },
  {
    id: 'RO-B-33',
    title: 'CONTROL: reword a comment in the inventory',
    file: 'src/core/reviewStore/inventory.ts',
    from: '// Owner-local review store — read-only operator inventory.',
    to: '// Owner-local review store — read-only operator inventory (control mutation).',
    kind: 'CONTROL',
    why:
      'A comment carries no behaviour, so no suite should fail. This is the ' +
      "campaign's own calibration: if a control mutation is \"detected\", the " +
      'harness is reporting noise and every other detection is suspect.',
    suites: INVENTORY_SUITES,
  },
  {
    id: 'RO-B-34',
    title: 'EQUIVALENT: express the unknown-name digest length as a product',
    file: 'src/core/reviewStore/inventory.ts',
    from: 'const NAME_DIGEST_LENGTH = 24;',
    to: 'const NAME_DIGEST_LENGTH = 8 * 3;',
    kind: 'EQUIVALENT',
    why:
      '8 * 3 === 24, so every digest is byte-identical. Nothing can detect ' +
      'this, and nothing should: a suite that failed here would be asserting ' +
      'on source text rather than on behaviour.',
    suites: INVENTORY_SUITES,
  },
];

/** Brief items with no mutation, and why. Recorded rather than quietly skipped. */
const NOT_APPLICABLE = [
  {
    brief: 17,
    item: 'trust a derived index over canonical files',
    why:
      'No derived index exists. Measurement at 10k/25k/50k showed directory ' +
      'scans linear and adequate (discovery 26/80/142 ms), and the campaign ' +
      'brief permits an index only after measuring, so none was built. There ' +
      'is nothing to trust over the canonical files.',
  },
  {
    brief: 18,
    item: 'hide index corruption',
    why: 'Same reason: there is no index, so there is no index corruption to hide.',
  },
];

function readFile(file) {
  return fs.readFileSync(path.join(root, file), 'utf8');
}

function writeFile(file, contents) {
  fs.writeFileSync(path.join(root, file), contents, 'utf8');
}

/** Run one suite set. Returns true when ALL suites pass. */
function suitesPass(suites) {
  const result = spawnSync('npx', ['playwright', 'test', ...suites, '--reporter=line'], {
    cwd: root,
    encoding: 'utf8',
    timeout: 1_800_000,
    env: { ...process.env, CI: '1' },
  });
  return result.status === 0;
}

function main() {
  const receipts = [];
  let introduced = 0;
  let detected = 0;
  let survived = 0;
  const unexplainedSurvivors = [];

  for (const mutation of MUTATIONS) {
    const original = readFile(mutation.file);
    const occurrences = original.split(mutation.from).length - 1;
    if (occurrences !== 1) {
      console.error(`[review-ops:mutation] ${mutation.id} ANCHOR_NOT_UNIQUE occurrences=${occurrences} file=${mutation.file}`);
      process.exitCode = 1;
      receipts.push({ id: mutation.id, title: mutation.title, result: 'ANCHOR_NOT_UNIQUE' });
      continue;
    }
    introduced += 1;
    let caught = false;
    try {
      writeFile(mutation.file, original.replace(mutation.from, mutation.to));
      caught = !suitesPass(mutation.suites);
    } finally {
      writeFile(mutation.file, original);
    }

    const expectedDetection = mutation.kind === undefined;
    const outcome = caught ? 'DETECTED' : 'SURVIVED';
    if (caught) detected += 1;
    else survived += 1;

    if (expectedDetection && !caught) unexplainedSurvivors.push(mutation.id);
    if (!expectedDetection && caught) unexplainedSurvivors.push(`${mutation.id} (${mutation.kind} was detected)`);

    receipts.push({
      id: mutation.id,
      title: mutation.title,
      ...(mutation.brief === undefined ? {} : { briefItem: mutation.brief }),
      file: mutation.file,
      kind: mutation.kind ?? 'BEHAVIOURAL',
      ...(mutation.why === undefined ? {} : { why: mutation.why }),
      suites: mutation.suites,
      result: outcome,
    });
    console.log(`[review-ops:mutation] ${mutation.id} ${outcome} ${mutation.kind ?? 'BEHAVIOURAL'} — ${mutation.title}`);
  }

  // Restore drift: the tree must be byte-identical to where it started.
  const status = execFileSync('git', ['status', '--porcelain'], { cwd: root, encoding: 'utf8' }).trim();
  const restoreDrift = status === '' ? 'NONE' : status;

  const receipt = {
    schemaVersion: 'nightwatch.review-operations-mutation-campaign.v1',
    introduced,
    detected,
    survived,
    behavioural: MUTATIONS.filter((mutation) => mutation.kind === undefined).length,
    equivalentOrControl: MUTATIONS.filter((mutation) => mutation.kind !== undefined).length,
    unexplainedSurvivors,
    notApplicable: NOT_APPLICABLE,
    restoreDrift,
    mutations: receipts,
  };
  console.log(JSON.stringify(receipt, null, 2));

  if (unexplainedSurvivors.length > 0) {
    console.error(`[review-ops:mutation] FAIL: unexplained survivors: ${unexplainedSurvivors.join(', ')}`);
    process.exitCode = 1;
    return;
  }
  if (restoreDrift !== 'NONE') {
    console.error(`[review-ops:mutation] FAIL: the tree was not restored:\n${restoreDrift}`);
    process.exitCode = 1;
    return;
  }
  console.log(`[review-ops:mutation] PASS: ${introduced} introduced, ${detected} detected, ${survived} survived (all declared), restore drift NONE`);
}

main();
