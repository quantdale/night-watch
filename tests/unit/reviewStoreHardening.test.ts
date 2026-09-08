// Review-store boundary hardening — proven by mutating the guarded artifact.
//
// Three recent campaigns exposed the same shape of defect: a check exists, and
// it does not prove what it claims. DEF-FC-04 was a rule that read structured
// fields while the prose beside them drifted; R-12 was six hand-written loops
// where three campaigns simply never wrote one; the `includes(literal)` trap
// was a rule satisfied by one safe occurrence while another line went unsafe.
//
// So a hardening rule is not evidence that a boundary holds. Evidence is the
// rule FAILING when the boundary is broken. Every mutation below edits the
// real guarded file on disk, runs the real `hardening:check`, asserts the
// specific failure, and restores the exact original bytes in a `finally`.
//
// Serial and single-worker by configuration (playwright.config.ts sets
// `workers: 1`, `fullyParallel: false`), so no other test observes a mutated
// tree. The restore writes back bytes captured before the edit, so a failed
// assertion still restores.

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { test, expect } from '@playwright/test';

const REPO_ROOT = path.resolve(__dirname, '..', '..');

// NOT `mode: 'serial'`: playwright's serial mode SKIPS the remaining tests
// after a failure, so one surviving mutation would hide every mutation after
// it — which is exactly the reporting failure this campaign is guarding
// against. Ordering is already guaranteed by `workers: 1`.


/** Run the real hardening check. Returns its combined output and verdict. */
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
    name: 'M-01 publish through a replacement-capable write',
    file: 'src/core/reviewStore/store.ts',
    from: 'this.artifacts.writeImmutableJson(fileName, envelope);',
    to: 'this.artifacts.writeJson(fileName, envelope);',
    expect: /replacement-capable write|non-allowlisted private-store method|atomic no-replace primitive/,
  },
  {
    name: 'M-02 skip the canonical currentness check',
    file: 'src/core/reviewStore/store.ts',
    from: 'verifyReviewCurrent(envelope.receipt, current);',
    to: 'void envelope;',
    expect: /imports verifyReviewCurrent without invoking it/,
  },
  {
    name: 'M-03 skip receipt integrity validation',
    file: 'src/core/reviewStore/store.ts',
    from: 'binding = verifyReceiptIntegrity(receipt);',
    to: 'binding = receipt.binding;',
    expect: /imports verifyReceiptIntegrity without invoking it/,
  },
  {
    name: 'M-04 publish before validating the bytes',
    file: 'src/core/reviewStore/store.ts',
    from: "    validateStoredReviewEnvelope({ ...envelope, status: 'READY' }, fileName);",
    to: '',
    expect: /publishes before validating the bytes it will write/,
  },
  {
    name: 'M-05 reintroduce a raceable read-then-write check',
    file: 'src/core/reviewStore/store.ts',
    from: '    const identity = reviewIdentity(binding);',
    to: "    if (this.fileNamesFor(binding.findingId).length > 0) throw new ReviewStoreError('REVIEW_STORE_ALREADY_DECIDED');\n    const identity = reviewIdentity(binding);",
    expect: /raceable read-then-write existence check/,
  },
  {
    name: 'M-06 recompute a receipt digest in the persistence layer',
    file: 'src/core/reviewStore/store.ts',
    from: "const INSTANT_RE = /^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(\\.\\d{1,6})?Z$/;",
    to: "const INSTANT_RE = /^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(\\.\\d{1,6})?Z$/;\nconst recomputed = (value: string): string => sha256Hex(value);",
    expect: /recomputes a digest instead of using the canonical validator/,
  },
  {
    name: 'M-07 give the store its own filesystem authority',
    file: 'src/core/reviewStore/store.ts',
    from: "import { stableJsonSorted } from '../identity/canonicalDigest';",
    to: "import { stableJsonSorted } from '../identity/canonicalDigest';\nimport nodeFs from 'node:fs';",
    expect: /must not hold node:fs authority/,
  },
  {
    name: 'M-08 add an external publication destination to the store',
    file: 'src/core/reviewStore/store.ts',
    from: "const ENVELOPE_KEYS =",
    to: "const LESLIE_ENDPOINT = 'https://leslie.example.com/file';\nconst ENVELOPE_KEYS =",
    expect: /references an external publication destination/,
  },
  {
    name: 'M-09 key the identity on the finding id instead of the binding',
    file: 'src/core/reviewStore/identity.ts',
    from: 'return sha256Hex(stableJsonSorted(validateReviewBinding(binding))).slice(0, IDENTITY_LENGTH);',
    to: 'return sha256Hex(validateReviewBinding(binding).findingId).slice(0, IDENTITY_LENGTH);',
    expect: /review identity is not the digest of the complete validated binding/,
  },
  {
    name: 'M-10 widen the file-name shape so a caller value could reach it',
    file: 'src/core/reviewStore/identity.ts',
    from: "export const REVIEW_FILE_NAME_RE = /^review\\.([0-9a-f]{12})\\.([0-9a-f]{24})\\.json$/;",
    to: "export const REVIEW_FILE_NAME_RE = /^review\\.(.{12})\\.(.{24})\\.json$/;",
    expect: /review file name shape is not the pinned hex-only pattern/,
  },
  {
    name: 'M-11 declare an error code the store can never raise',
    file: 'src/core/reviewStore/types.ts',
    from: "  'REVIEW_STORE_NO_REPLACE_UNSUPPORTED',",
    to: "  'REVIEW_STORE_NO_REPLACE_UNSUPPORTED',\n  'REVIEW_STORE_NEVER_RAISED',",
    expect: /declares an error code it can never raise: REVIEW_STORE_NEVER_RAISED/,
  },
  {
    name: 'M-12 let a derived root sit inside the repository',
    file: 'src/core/policy/privateArtifacts.ts',
    from: '  if (injectedRoot === undefined) assertOutsideCanonicalWorkspace(root);',
    to: '  if (false) assertOutsideCanonicalWorkspace(root);',
    expect: /derived private artifact root is not held to the outside-the-repository contract/,
  },
  {
    name: 'M-13 open the subtree vocabulary to any caller-supplied name',
    file: 'src/core/policy/privateArtifacts.ts',
    from: "export const PRIVATE_ARTIFACT_SUBTREES = ['findings', 'reviews'] as const;",
    to: "export const PRIVATE_ARTIFACT_SUBTREES = ['findings', 'reviews', 'anything'] as const;",
    expect: /closed two-member union/,
  },
  {
    name: 'M-14 let recovery remove a file it did not create',
    file: 'src/core/policy/privateArtifacts.ts',
    from: "    if (!TEMPORARY_FILE_RE.test(name)) throw new Error('PRIVATE_ARTIFACT_NOT_A_TEMPORARY');",
    to: '',
    expect: /temporary removal does not require the pinned temporary name shape/,
  },
  {
    name: 'M-15 give the write authority filesystem authority',
    file: 'src/controlCenter/authorities/reviewWriteAuthority.ts',
    from: "import { currentReviewArtifacts, reviewBindingFor } from './reviewBinding';",
    to: "import { currentReviewArtifacts, reviewBindingFor } from './reviewBinding';\nimport nodeFs from 'node:fs';",
    expect: /review write authority must not hold node:fs authority/,
  },
  {
    name: 'M-16 let the write authority bypass the store',
    file: 'src/controlCenter/authorities/reviewWriteAuthority.ts',
    from: "    this.store = new ReviewStore({ root: options.root });",
    to: "    this.store = new ReviewStore({ root: options.root });\n    void PrivateArtifactStore;",
    expect: /bypasses the review store to reach the raw private store/,
  },
  {
    name: 'M-17 let the write authority reach a production connector',
    file: 'src/controlCenter/authorities/reviewWriteAuthority.ts',
    from: "import type { FindingsDossierMetadata } from './findingsAuthority';",
    to: "import type { FindingsDossierMetadata } from './findingsAuthority';\nimport type { ProductionFindingsStore } from '../../core/prodEvidence/productionFindingsStore';",
    expect: /reaches outside its cone/,
  },
  {
    name: 'M-18 give the reviewer read authority persistence authority',
    file: 'src/controlCenter/authorities/reviewerAuthority.ts',
    // NW-10 added `boundedCursorOffset` to this import, so the anchor moved
    // with it. The mutation itself is unchanged: inject persistence authority
    // and require the hardening rule to catch it.
    from: "import { boundedCursorOffset, safePublicId } from '../adapters/common';",
    to: "import { boundedCursorOffset, safePublicId } from '../adapters/common';\nimport { ReviewStore } from '../../core/reviewStore';",
    expect: /reviewer authority holds persistence authority instead of receiving a lookup/,
  },
  {
    name: 'M-19 move the persisted-review lookup off the per-row path',
    file: 'src/controlCenter/authorities/reviewerAuthority.ts',
    from: '    const localReview = lookupLocalReview === null ? null : lookupLocalReview(entry.dossier);',
    to: '    const localReview = null;',
    expect: /persisted review lookup is not performed per rendered row/,
  },
  {
    // The first attempt at this mutation only ADDED AN IMPORT, and it
    // survived — correctly, because an unused import derives nothing. The
    // rule was widened to refuse the import as well, and the mutation split
    // in two so both the precursor and the act are proven caught.
    name: 'M-20a let the collector reach a binding digest primitive',
    file: 'src/controlCenter/server/defaultCollector.ts',
    from: "import type { ControlCenterReviewAuthority } from '../authorities/reviewWriteAuthority';",
    to: "import type { ControlCenterReviewAuthority } from '../authorities/reviewWriteAuthority';\nimport { findingArtifactDigest } from '../../core/findingReview';",
    expect: /collector reaches a review-binding digest primitive of its own/,
  },
  {
    name: 'M-20b let the collector actually derive a second binding',
    file: 'src/controlCenter/server/defaultCollector.ts',
    from: "import type { ControlCenterReviewAuthority } from '../authorities/reviewWriteAuthority';",
    to: "import type { ControlCenterReviewAuthority } from '../authorities/reviewWriteAuthority';\nimport { reviewBindingFor } from '../authorities/reviewBinding';\nconst secondBinding = (dossier: never) => reviewBindingFor(dossier, { campaignId: null });",
    expect: /collector derives a review binding of its own/,
  },
];

/** Bytes of every mutated file, captured before the first mutation runs. */
const baseline = new Map<string, string>();

test.describe('review-store boundary hardening bites', () => {
  test.setTimeout(600_000);

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

  test('every mutated file is byte-identical to how the suite found it', () => {
    // A mutation harness that left the tree dirty would poison every later
    // suite and, worse, could be committed.
    //
    // Scoped to the files this suite actually touches, and compared against
    // the bytes captured before the first mutation — NOT against a clean
    // working tree. Requiring a clean tree would make this fail for unrelated
    // uncommitted work, and the obvious way to "fix" that would be to commit
    // during a mutation window, which is the failure mode itself.
    for (const [file, original] of baseline) {
      expect(fs.readFileSync(path.join(REPO_ROOT, file), 'utf8'), file).toBe(original);
    }
    expect(baseline.size).toBeGreaterThan(4);
    expect(runHardening().passed).toBe(true);
  });
});
