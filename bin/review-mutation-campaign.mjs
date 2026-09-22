#!/usr/bin/env node
// @ts-check

/**
 * Owner-local review persistence — behavioural mutation campaign.
 *
 * The hardening bite harness (tests/unit/reviewStoreHardening.test.ts) proves
 * the STRUCTURAL rules fire. This proves something different and, for a
 * durability story, more important: that the TEST SUITES catch a behavioural
 * regression. A guard that only a structural check notices is a guard that
 * disappears the moment someone rewrites the code in a shape the regex does
 * not recognize.
 *
 * Each mutation edits one real source file, runs the suites that should have
 * an opinion about it, and is DETECTED when at least one of them fails.
 * The original bytes are restored in a finally, and the tree is verified
 * byte-identical at the end.
 *
 * Equivalent and control mutations are declared as such with a reason. A
 * survivor that is not explicitly justified is a campaign failure.
 *
 * Local and offline. Reads and writes only this repository's own sources.
 */

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildChildEnvironment } from './child-environment.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const STORE_SUITES = ['tests/unit/reviewStore.test.ts', 'tests/unit/reviewStoreDurability.test.ts'];
const SERVED_SUITES = ['tests/unit/reviewerPersistence.test.ts'];
const LIFECYCLE_SUITES = ['tests/unit/findingReviewLifecycle.test.ts', 'tests/unit/reviewStore.test.ts'];
const IDENTITY_SUITES = ['tests/unit/dossierIdentityPropagation.test.ts'];
const HARDENING_SUITES = ['tests/unit/reviewStoreHardening.test.ts'];
const SAFETY_SUITES = ['tests/unit/safetyEventAccounting.test.ts'];

/**
 * @typedef {{
 *   id: string, title: string, file: string, from: string, to: string,
 *   suites: string[], kind?: 'EQUIVALENT' | 'CONTROL', why?: string
 * }} Mutation
 */

/** @type {Mutation[]} */
const MUTATIONS = [
  {
    id: 'B-01',
    title: 'remove the no-replace guarantee (link -> rename)',
    file: 'src/core/policy/privateArtifacts.ts',
    from: '        fs.linkSync(temporary, destination);',
    to: '        fs.renameSync(temporary, destination);',
    suites: [...STORE_SUITES, 'tests/unit/privateArtifactAtomic.test.ts'],
  },
  {
    id: 'B-02',
    title: 'allow a publication conflict to overwrite instead of refusing',
    file: 'src/core/reviewStore/store.ts',
    from: "        throw new ReviewStoreError('REVIEW_STORE_ALREADY_DECIDED', identity);",
    to: '        return { reviewIdentity: identity, fileName, receipt, record };',
    suites: [...STORE_SUITES, ...SERVED_SUITES],
  },
  {
    id: 'B-03',
    title: 'skip receipt validation on read',
    file: 'src/core/reviewStore/store.ts',
    from: '    binding = verifyReceiptIntegrity(receipt);',
    to: '    binding = receipt.binding as FindingReviewBinding;',
    suites: STORE_SUITES,
  },
  {
    id: 'B-04',
    title: 'skip current-binding verification and call everything current',
    file: 'src/core/reviewStore/store.ts',
    from: '        verifyReviewCurrent(envelope.receipt, current);',
    to: '        void current;',
    suites: [...STORE_SUITES, ...SERVED_SUITES],
  },
  {
    id: 'B-05',
    title: 'trust the finding id without comparing the finding digest',
    file: 'src/core/findingReview/lifecycle.ts',
    from: "  if (findingArtifactDigest(current.finding) !== binding.findingDigest) fail('FINDING_REVIEW_STALE:findingDigest');",
    to: '  void current.finding;',
    suites: LIFECYCLE_SUITES,
  },
  {
    id: 'B-06',
    title: 'accept a stale review as current',
    file: 'src/core/reviewStore/store.ts',
    from: "        if (message.startsWith('FINDING_REVIEW_STALE')) {",
    to: "        if (false && message.startsWith('FINDING_REVIEW_STALE')) {",
    suites: [...STORE_SUITES, ...SERVED_SUITES],
  },
  {
    id: 'B-07',
    title: 'allow a stored receipt to claim organizational authority',
    file: 'src/core/findingReview/lifecycle.ts',
    from: "  if (receipt.organizationalAuthority !== 'NONE_LOCAL_REVIEW_ONLY') fail('FINDING_REVIEW_AUTHORITY_INVALID');",
    to: '  void receipt.organizationalAuthority;',
    suites: LIFECYCLE_SUITES,
  },
  {
    id: 'B-08',
    title: 'allow a second decision on a decided record',
    file: 'src/core/findingReview/lifecycle.ts',
    from: "  if (record.state !== 'REVIEW_PENDING') fail('FINDING_REVIEW_ALREADY_DECIDED');",
    to: '  void record.state;',
    suites: LIFECYCLE_SUITES,
  },
  {
    id: 'B-09',
    title: 'skip the rationale sentinel scan',
    file: 'src/core/findingReview/lifecycle.ts',
    from: '  if (typeof rationale !== \'string\' || rationale.length > RATIONALE_MAX || SENTINEL_RE.test(rationale)) {\n    fail(\'FINDING_REVIEW_INVALID_RATIONALE\');\n  }',
    to: "  if (typeof rationale !== 'string') {\n    fail('FINDING_REVIEW_INVALID_RATIONALE');\n  }",
    suites: [...LIFECYCLE_SUITES, ...SERVED_SUITES],
  },
  {
    id: 'B-10',
    title: 'persist raw dossier content in the envelope',
    file: 'src/core/reviewStore/store.ts',
    from: '      storedAt: input.storedAt,\n    };',
    to: '      storedAt: input.storedAt,\n      rawDossier: input.binding,\n    };',
    suites: STORE_SUITES,
  },
  {
    id: 'B-11',
    title: 'let the review store sit inside the repository',
    file: 'src/core/policy/privateArtifacts.ts',
    from: '  if (injectedRoot === undefined) assertOutsideCanonicalWorkspace(root);',
    to: '  void assertOutsideCanonicalWorkspace;',
    suites: [...STORE_SUITES, 'tests/unit/privateArtifactAtomic.test.ts'],
  },
  {
    id: 'B-12',
    title: 'accept an unsafe file name (path traversal)',
    file: 'src/core/policy/privateArtifacts.ts',
    from: "  if (!FILE_NAME_RE.test(fileName) || fileName.includes('..')) throw new Error('PRIVATE_ARTIFACT_FILE_NAME_UNSAFE');",
    to: '  void fileName;',
    suites: [...STORE_SUITES, 'tests/unit/privateArtifactAtomic.test.ts'],
  },
  {
    id: 'B-13',
    title: 'trust the file-name key instead of recomputing the identity',
    file: 'src/core/reviewStore/store.ts',
    from: "  if (parsedName.identity !== recomputedIdentity) corrupt('REVIEW_STORE_IDENTITY_MISMATCH', 'file name');",
    to: '  void parsedName.identity;',
    suites: STORE_SUITES,
  },
  {
    id: 'B-14',
    title: 'ignore an unknown store schema version',
    file: 'src/core/reviewStore/store.ts',
    from: '  if (record.schemaVersion !== REVIEW_STORE_SCHEMA_VERSION) {\n    throw new ReviewStoreVersionUnsupportedError(\'schemaVersion\', String(record.schemaVersion));\n  }',
    to: '  void record.schemaVersion;',
    suites: STORE_SUITES,
  },
  {
    id: 'B-15',
    title: 'omit the semantic contract identity',
    file: 'src/controlCenter/authorities/findingsAuthority.ts',
    from: "    semanticContractId: projectedIdentity(semanticTriageEvidenceOf(dossier)?.invariantDefinitionId),",
    to: '    semanticContractId: null,',
    suites: IDENTITY_SUITES,
  },
  {
    id: 'B-16',
    title: 'omit the expectation identity',
    file: 'src/controlCenter/authorities/findingsAuthority.ts',
    from: "    expectationId: projectedIdentity(semanticTriageEvidenceOf(dossier)?.expectationId),",
    to: '    expectationId: null,',
    suites: IDENTITY_SUITES,
  },
  {
    id: 'B-17',
    title: 'infer a missing expectation identity from the route',
    file: 'src/controlCenter/authorities/findingsAuthority.ts',
    from: '  const safe = asSafeControlCenterId(value);\n  if (safe === null) return null;',
    to: '  const safe = asSafeControlCenterId(value);\n  if (safe === null) return "inferred.expectation";',
    suites: IDENTITY_SUITES,
  },
  {
    id: 'B-18',
    title: 'drop the privacy screen from the identity projection',
    file: 'src/controlCenter/authorities/findingsAuthority.ts',
    from: '  return containsPrivatePayloadShape(safe) ? null : (safe as string);',
    to: '  return safe as string;',
    suites: IDENTITY_SUITES,
  },
  {
    id: 'B-19',
    title: 'collapse two distinct semantic contracts into one match',
    file: 'src/core/findingIntel/relationships.ts',
    from: '  if (a.semanticContractId !== null && b.semanticContractId !== null && a.semanticContractId !== b.semanticContractId) {',
    to: '  if (false) {',
    suites: [...IDENTITY_SUITES, 'tests/unit/findingIntel.test.ts'],
  },
  {
    id: 'B-20',
    title: 'regress the reviewer read to whole-corpus intelligence',
    file: 'src/controlCenter/authorities/reviewerAuthority.ts',
    from: '  const limit = typeof input.limit === \'number\' && Number.isSafeInteger(input.limit) && input.limit > 0 ? input.limit : Number.MAX_SAFE_INTEGER;',
    to: '  const limit = Number.MAX_SAFE_INTEGER;',
    suites: [...IDENTITY_SUITES, 'tests/unit/reviewerProjection.test.ts'],
  },
  {
    id: 'B-21',
    title: 'let the write authority accept a client-chosen binding',
    file: 'src/controlCenter/authorities/reviewWriteAuthority.ts',
    from: "    if (typeof request.reviewIdentity !== 'string' || request.reviewIdentity !== expected) return refuse('BINDING_MISMATCH');",
    to: '    void expected;',
    suites: SERVED_SUITES,
  },
  {
    id: 'B-22',
    title: 'let the write authority accept an unknown decision',
    file: 'src/controlCenter/authorities/reviewWriteAuthority.ts',
    from: "    if (typeof request.decision !== 'string' || !DECISION_SET.has(request.decision)) return refuse('INVALID_DECISION');",
    to: '    void request.decision;',
    suites: SERVED_SUITES,
  },
  {
    id: 'B-23',
    title: 'accept a partially written envelope (skip the key-set check)',
    file: 'src/core/reviewStore/store.ts',
    from: "  if (JSON.stringify(keys) !== JSON.stringify(ENVELOPE_KEYS)) corrupt('REVIEW_STORE_CORRUPT', `keys ${keys.join(',')}`);",
    to: '  void keys;',
    suites: STORE_SUITES,
  },
  {
    id: 'B-24',
    title: 'let a non-terminal record be stored as a decided review',
    file: 'src/core/reviewStore/store.ts',
    from: "  if (!isTerminalReviewState(stored.state)) corrupt('REVIEW_STORE_STATE_INVALID', stored.state);",
    to: '  void stored.state;',
    suites: STORE_SUITES,
  },
  {
    id: 'B-25',
    title: 'let recovery remove any file in the store root',
    file: 'src/core/policy/privateArtifacts.ts',
    from: "    if (!TEMPORARY_FILE_RE.test(name)) throw new Error('PRIVATE_ARTIFACT_NOT_A_TEMPORARY');",
    to: '    void name;',
    suites: [...STORE_SUITES, ...HARDENING_SUITES],
  },
  {
    id: 'B-26',
    title: 'falsify the safety-event documentation',
    file: '.agent/tasks/nightwatch-reviewer-surface-and-intel-scale-v1/REPORT.md',
    from: '- Safety events: ONE workspace-integrity event, class WORKSPACE_HARNESS,',
    to: '- Safety events: NONE. No workspace-integrity event occurred.\n- Superseded line: ONE workspace-integrity event, class WORKSPACE_HARNESS,',
    suites: SAFETY_SUITES,
  },
  {
    id: 'B-27',
    title: 'let the reviewer surface report a stale review as a live decision',
    file: 'src/controlCenter/adapters/reviewerAdapter.ts',
    from: "  if (currentness !== 'CURRENT') return { epistemicClass: 'UNKNOWN', value, basis: [state] };",
    to: '  void currentness;',
    suites: [...SERVED_SUITES, 'tests/unit/reviewerProjection.test.ts'],
  },
  {
    id: 'B-28',
    title: 'drop the receipt authority re-check at the projection surface',
    file: 'src/controlCenter/adapters/reviewerAdapter.ts',
    from: "  if (receipt !== null && receipt.organizationalAuthority !== 'NONE_LOCAL_REVIEW_ONLY') {\n    fail(`${field}.receipt.organizationalAuthority`);\n  }",
    to: '  void receipt;',
    suites: ['tests/unit/reviewerProjection.test.ts', 'tests/unit/controlCenterAdapters.test.ts'],
  },
  {
    id: 'B-29',
    title: 'store the review keyed by finding id instead of by binding',
    file: 'src/core/reviewStore/identity.ts',
    from: '  return sha256Hex(stableJsonSorted(validateReviewBinding(binding))).slice(0, IDENTITY_LENGTH);',
    to: '  return sha256Hex(validateReviewBinding(binding).findingId).slice(0, IDENTITY_LENGTH);',
    suites: STORE_SUITES,
  },
  {
    id: 'B-32',
    title: 'let a listing surface another finding\'s review',
    file: 'src/core/reviewStore/store.ts',
    from: '      if (envelope.findingId !== findingId) {',
    to: '      if (false) {',
    suites: STORE_SUITES,
  },
  {
    id: 'B-33',
    title: 'take the directory listing per row instead of per request',
    file: 'src/controlCenter/authorities/reviewWriteAuthority.ts',
    from: '      listing = this.store.snapshotListing();',
    to: '      listing = { byDiscoveryKey: new Map() };',
    suites: [...STORE_SUITES, ...SERVED_SUITES],
  },
  {
    id: 'B-30',
    title: 'CONTROL: reword a comment in the store',
    file: 'src/core/reviewStore/store.ts',
    from: '// Owner-local review store.',
    to: '// Owner-local review store (control mutation: comment only).',
    kind: 'CONTROL',
    why:
      'A comment carries no behaviour, so no suite should fail. This is the ' +
      'campaign\'s own calibration: if a control mutation is "detected", the ' +
      'harness is reporting noise and every other detection is suspect.',
    suites: STORE_SUITES,
  },
  {
    id: 'B-31',
    title: 'EQUIVALENT: re-derive the review identity length from the constant',
    file: 'src/core/reviewStore/identity.ts',
    from: 'const IDENTITY_LENGTH = 24;',
    to: 'const IDENTITY_LENGTH = 12 * 2;',
    kind: 'EQUIVALENT',
    why:
      '12 * 2 === 24, so every digest, file name and stored identity is ' +
      'byte-identical. Nothing can detect this, and nothing should: a suite ' +
      'that failed here would be asserting on source text rather than on ' +
      'behaviour.',
    suites: STORE_SUITES,
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
  const pwBin = path.join(root, 'node_modules', '.bin', 'playwright');
  const cmd = process.platform === 'win32' ? `${pwBin}.cmd` : pwBin;
  const result = spawnSync(cmd, ['test', ...suites, '--reporter=line'], {
    cwd: root,
    encoding: 'utf8',
    timeout: 900_000,
    maxBuffer: 64 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: buildChildEnvironment(process.env, { NIGHTWATCH_GATE_ENVIRONMENT: 'REVIEW_MUTATION' }),
  });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  return result.status === 0;
}

function main() {
  const argv = process.argv.slice(2);
  // `--plan` is the bounded, side-effect-free observation surface: it prints
  // the declared mutation inventory without editing a file or starting a
  // suite. `npm run mutation:review` (no arguments) remains the full campaign.
  if (argv.includes('--plan')) {
    console.log(JSON.stringify({
      schemaVersion: 'nightwatch.review-mutation-campaign-plan.v1',
      mutationCount: MUTATIONS.length,
      behavioural: MUTATIONS.filter((mutation) => mutation.kind === undefined).length,
      equivalentOrControl: MUTATIONS.filter((mutation) => mutation.kind !== undefined).length,
      mutations: MUTATIONS.map((mutation) => ({
        id: mutation.id,
        title: mutation.title,
        file: mutation.file,
        kind: mutation.kind ?? 'BEHAVIOURAL',
        suites: mutation.suites,
      })),
    }, null, 2));
    return;
  }
  const receipts = [];
  let introduced = 0;
  let detected = 0;
  let survived = 0;
  const unexplainedSurvivors = [];

  for (const mutation of MUTATIONS) {
    const original = readFile(mutation.file);
    const occurrences = original.split(mutation.from).length - 1;
    if (occurrences !== 1) {
      console.error(`[mutation] ${mutation.id} ANCHOR_NOT_UNIQUE occurrences=${occurrences} file=${mutation.file}`);
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
      file: mutation.file,
      kind: mutation.kind ?? 'BEHAVIOURAL',
      ...(mutation.why === undefined ? {} : { why: mutation.why }),
      suites: mutation.suites,
      result: outcome,
    });
    console.log(`[mutation] ${mutation.id} ${outcome} ${mutation.kind ?? 'BEHAVIOURAL'} — ${mutation.title}`);
  }

  // Restore drift: the tree must be byte-identical to where it started.
  const statusResult = spawnSync('git', ['status', '--porcelain'], {
    cwd: root,
    encoding: 'utf8',
    timeout: 30_000,
    maxBuffer: 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: buildChildEnvironment(process.env),
  });
  const status = (statusResult.stdout ?? '').trim();
  const restoreDrift = status === '' ? 'NONE' : status;

  const receipt = {
    schemaVersion: 'nightwatch.review-mutation-campaign.v1',
    introduced,
    detected,
    survived,
    behavioural: MUTATIONS.filter((mutation) => mutation.kind === undefined).length,
    equivalentOrControl: MUTATIONS.filter((mutation) => mutation.kind !== undefined).length,
    unexplainedSurvivors,
    restoreDrift,
    mutations: receipts,
  };
  console.log(JSON.stringify(receipt, null, 2));

  if (unexplainedSurvivors.length > 0) {
    console.error(`[mutation] FAIL: unexplained survivors: ${unexplainedSurvivors.join(', ')}`);
    process.exitCode = 1;
    return;
  }
  if (restoreDrift !== 'NONE') {
    console.error(`[mutation] FAIL: the tree was not restored:\n${restoreDrift}`);
    process.exitCode = 1;
    return;
  }
  console.log(`[mutation] PASS: ${introduced} introduced, ${detected} detected, ${survived} survived (all declared), restore drift NONE`);
}

main();
