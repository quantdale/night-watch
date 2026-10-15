// R5-12 / review-5 task B2.1 — the certification producers, driven through the REAL CLI
// against a synthetic Git repository. The project-state verdict source is a declared
// stand-in (`bin/project-state-check.mjs` printing a fixture verdict); everything the
// producer does with it — the measurement, the receipt, the staging, the publication —
// is the real code, and the resulting receipts are checked by the REAL verifier.
// The full-machinery end-to-end proof is the B6 reachability test.
//
// R5-15 / D-173 correction: a COMMAND subject no longer pretends the observing
// checkout can be AT the checkpoint its own anchor names (a SHA-1 fixed point). It
// measures against a GUARDED MEASUREMENT ROOT — an exact, clean checkout of the
// substantive source checkpoint S — and the receipt records `sourceHead: S`
// (measured) with the observer as `observedAtHead`. These tests prove the corrected
// invariant with real Git repositories and real command execution: the positive
// route, every wrong-identity and tampered-checkout refusal, the observer
// ancestry/range rules, the ignored-input policy, the time-of-check/time-of-use
// guard, and the impossibility of a PASS receipt without an executed command.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { test, expect } from '@playwright/test';
import { buildCertificationReceipt, validateCertificationReceipt } from '../../bin/lib/certification-evidence.mjs';
import { commandDigest, produceCertificationReceipt, selectCiObservation } from '../../bin/lib/certify-producers.mjs';
import { verifyPersistedReceipt } from '../../bin/lib/release-evidence.mjs';
import { UI_HARNESS_FILE, buildUiHarnessReceipt } from '../../bin/lib/ui-harness-receipt.mjs';

const ROOT = path.join(__dirname, '..', '..');
const CLI = path.join(ROOT, 'bin', 'certify-evidence.mjs');
const TMP_BASE = fs.realpathSync(os.tmpdir());

interface Fixture { readonly root: string; readonly head: string; git(args: string[]): string; verdict(conditions: Array<Record<string, unknown>>, checkpoint?: string): void; measurement(sha?: string): string; run(args: string[]): { status: number | null; json: Record<string, unknown> | null; stderr: string }; cleanup(): void }

function fixture(scripts: Record<string, string> = { typecheck: 'node -e "process.exit(0)"' }): Fixture {
  const root = fs.mkdtempSync(path.join(TMP_BASE, 'nw-certify-'));
  const environment = { PATH: process.env.PATH ?? '', HOME: root, GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_NOSYSTEM: '1', GIT_AUTHOR_NAME: 'nw', GIT_AUTHOR_EMAIL: 'nw@example.invalid', GIT_COMMITTER_NAME: 'nw', GIT_COMMITTER_EMAIL: 'nw@example.invalid' };
  const git = (args: string[]) => (spawnSync('git', args, { cwd: root, env: environment, encoding: 'utf8', shell: false }).stdout ?? '').trim();
  git(['init', '--quiet', '-b', 'main']);
  fs.writeFileSync(path.join(root, '.gitignore'), 'artifacts/\n');
  fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({ name: 'fixture', version: '0.0.0', scripts }));
  fs.mkdirSync(path.join(root, 'bin'), { recursive: true });
  // Declared stand-in verdict source: prints verdict.json (the project-state-check JSON shape).
  fs.writeFileSync(path.join(root, 'bin', 'project-state-check.mjs'), "import fs from 'node:fs'; process.stdout.write(fs.readFileSync(new URL('../verdict.json', import.meta.url), 'utf8'));\n");
  git(['add', '--all']);
  git(['commit', '--quiet', '--no-gpg-sign', '-m', 'fixture']);
  const head = git(['rev-parse', 'HEAD']);
  /** @type {string[]} */
  const worktrees: string[] = [];
  const fx: Fixture = {
    root,
    head,
    git,
    verdict: (conditions, checkpoint = head) => {
      // Not tracked content of the fixture commit's tree: written ignored via info/exclude.
      fs.appendFileSync(path.join(root, '.git', 'info', 'exclude'), fs.existsSync(path.join(root, 'verdict.json')) ? '' : 'verdict.json\n');
      fs.writeFileSync(path.join(root, 'verdict.json'), JSON.stringify({ releaseVerdict: { certifiedCheckpointSha: checkpoint, conditions } }));
    },
    measurement: (sha = head) => {
      const target = path.join(fs.mkdtempSync(path.join(TMP_BASE, 'nw-certify-m-')), 'measurement');
      const result = spawnSync('git', ['worktree', 'add', '--detach', '--quiet', target, sha], { cwd: root, env: environment, encoding: 'utf8', shell: false });
      expect(result.status, result.stderr ?? '').toBe(0);
      worktrees.push(path.dirname(target));
      return target;
    },
    run: (args) => {
      const result = spawnSync(process.execPath, [CLI, ...args, '--root', root], { cwd: ROOT, encoding: 'utf8', timeout: 120_000 });
      let json: Record<string, unknown> | null = null;
      try { json = JSON.parse(result.stdout ?? '') as Record<string, unknown>; } catch { json = null; }
      return { status: result.status, json, stderr: result.stderr ?? '' };
    },
    cleanup: () => {
      fs.rmSync(root, { recursive: true, force: true });
      for (const worktree of worktrees) fs.rmSync(worktree, { recursive: true, force: true });
    },
  };
  return fx;
}

const condition = (id: string, check: string, checkState: string) => ({ id, check, checkState });

test.describe('certify-evidence produce / publish / verify (real CLI, synthetic repository)', () => {
  test('a passing command subject stages a PASS receipt that the real verifier accepts, then publishes and verifies offline', () => {
    const fx = fixture();
    try {
      fx.verdict([]);
      const produced = fx.run(['produce', '--subject', 'root-compile', '--measurement-root', fx.measurement()]);
      expect(produced.status, produced.stderr).toBe(0);
      expect(produced.json).toMatchObject({ ok: true, code: 'CERTIFY_PASS', result: 'PASS', sourceHead: fx.head });
      const staged = path.join(fx.root, 'artifacts', 'certification-staging', fx.head, 'root-compile.json');
      const body = JSON.parse(fs.readFileSync(staged, 'utf8')) as Record<string, unknown>;
      expect(body).toMatchObject({ subject: 'root-compile', producer: 'COMMAND', checkState: 'MET', sourceRootCleanAtEmit: true, sourceHead: fx.head, observedAtHead: fx.head, commandDigest: commandDigest(['npm', 'run', '--silent', 'typecheck']) });
      expect(validateCertificationReceipt(body)).toEqual([]);
      // The real verifier reads the host directory: place the staged receipt there.
      fs.mkdirSync(path.join(fx.root, 'artifacts', 'receipts'), { recursive: true });
      fs.copyFileSync(staged, path.join(fx.root, 'artifacts', 'receipts', 'root-compile.json'));
      expect(verifyPersistedReceipt(fx.root, 'root-compile', String(body.receiptDigest), fx.head)).toEqual({ verified: true, reason: 'VERIFIED' });
      const published = fx.run(['publish']);
      expect(published.status, published.stderr).toBe(0);
      expect(published.json).toMatchObject({ ok: true, published: ['root-compile'], skipped: [] });
      expect(fs.existsSync(path.join(fx.root, 'evidence', 'certification', fx.head, 'root-compile.json'))).toBe(true);
      expect(fx.run(['verify']).json).toMatchObject({ ok: true, valid: ['root-compile'], invalid: [] });
    } finally {
      fx.cleanup();
    }
  });

  test('a failing command is an honest NOT_MET (exit 1), never published', () => {
    const fx = fixture({ typecheck: 'node -e "process.exit(1)"' });
    try {
      fx.verdict([]);
      const produced = fx.run(['produce', '--subject', 'root-compile', '--measurement-root', fx.measurement()]);
      expect(produced.status).toBe(1);
      expect(produced.json).toMatchObject({ ok: true, code: 'CERTIFY_NOT_MET', result: 'NOT_MET' });
      const published = fx.run(['publish']);
      expect(published.status).toBe(1);
      expect(published.json).toMatchObject({ published: [], skipped: ['root-compile'] });
      expect(fs.existsSync(path.join(fx.root, 'evidence'))).toBe(false);
    } finally {
      fx.cleanup();
    }
  });

  test('a PROJECT_CHECK subject takes its state from the live check of the verdict (MET passes, UNMET does not)', () => {
    const fx = fixture();
    try {
      fx.verdict([condition('documentation-currency', 'documentation-currency-rules', 'MET'), condition('dependency-supply-chain-currency', 'dependency-advisory-lane', 'UNMET')]);
      expect(fx.run(['produce', '--subject', 'documentation-currency']).json).toMatchObject({ result: 'PASS' });
      expect(fx.run(['produce', '--subject', 'dependency-supply-chain-currency']).status).toBe(1);
      // The lane `dependency-advisory` derives from the same condition check.
      const lane = fx.run(['produce', '--subject', 'dependency-advisory']);
      expect(lane.status).toBe(1);
      expect(JSON.parse(fs.readFileSync(path.join(fx.root, 'artifacts', 'certification-staging', fx.head, 'dependency-advisory.json'), 'utf8'))).toMatchObject({ checkId: 'dependency-advisory-lane', checkState: 'UNMET', result: 'NOT_MET' });
    } finally {
      fx.cleanup();
    }
  });

  test('every refusal is categorical and exits 3: missing measurement root, dirty tree, unresolved checkpoint, non-producible subject, missing subject', () => {
    const fx = fixture();
    try {
      // A COMMAND subject never measures without its guarded measurement root.
      fx.verdict([]);
      expect(fx.run(['produce', '--subject', 'root-compile']).json).toMatchObject({ ok: false, code: 'CERTIFY_MEASUREMENT_ROOT_REQUIRED' });
      expect(fx.run(['produce', '--subject', 'root-compile']).status).toBe(3);
      // A measurement root can never be smuggled onto a non-COMMAND subject.
      expect(fx.run(['produce', '--subject', 'documentation-currency', '--measurement-root', fx.measurement()]).json).toMatchObject({ ok: false, code: 'CERTIFY_MEASUREMENT_ROOT_UNEXPECTED' });
      for (const subject of ['owner-manual', 'authoritative-gate', 'clean-checkout', 'ui-error-taxonomy-rendering', 'no-such-subject']) {
        expect(fx.run(['produce', '--subject', subject]), subject).toMatchObject({ status: 3, json: { ok: false, code: 'CERTIFY_SUBJECT_NOT_PRODUCIBLE' } });
      }
      expect(fx.run(['produce']).status).toBe(2);
      // The observer tree must be clean before anything is measured.
      const measurement = fx.measurement();
      fs.writeFileSync(path.join(fx.root, 'dirty.txt'), 'x');
      expect(fx.run(['produce', '--subject', 'root-compile', '--measurement-root', measurement]).json).toMatchObject({ ok: false, code: 'CERTIFY_TREE_DIRTY' });
      fs.rmSync(path.join(fx.root, 'dirty.txt'));
      // The declared checkpoint must be a resolvable commit of the observer's repository.
      fx.verdict([], 'f'.repeat(40));
      expect(fx.run(['produce', '--subject', 'root-compile', '--measurement-root', measurement]).json).toMatchObject({ ok: false, code: 'CERTIFY_CHECKPOINT_UNRESOLVED' });
    } finally {
      fx.cleanup();
    }
  });

  test('publish never overwrites a different tracked receipt, and verify catches a tampered one', () => {
    const fx = fixture();
    try {
      fx.verdict([]);
      expect(fx.run(['produce', '--subject', 'root-compile', '--measurement-root', fx.measurement()]).status).toBe(0);
      expect(fx.run(['publish']).status).toBe(0);
      const tracked = path.join(fx.root, 'evidence', 'certification', fx.head, 'root-compile.json');
      const original = fs.readFileSync(tracked, 'utf8');
      // A republish of identical bytes is idempotent.
      expect(fx.run(['publish']).status).toBe(0);
      fs.writeFileSync(tracked, original.replace('"MET"', '"UNMET"'));
      expect(fx.run(['publish']).json).toMatchObject({ ok: false, code: 'CERTIFY_PUBLISH_WOULD_OVERWRITE' });
      expect(fx.run(['verify']).json).toMatchObject({ ok: false, invalid: ['root-compile'] });
      expect(fx.run(['verify']).status).toBe(1);
    } finally {
      fx.cleanup();
    }
  });

  test('verify rejects a valid receipt filed under another subject name or bound to another checkpoint', () => {
    const fx = fixture();
    try {
      fx.verdict([]);
      expect(fx.run(['produce', '--subject', 'root-compile', '--measurement-root', fx.measurement()]).status).toBe(0);
      expect(fx.run(['publish']).status).toBe(0);
      const directory = path.join(fx.root, 'evidence', 'certification', fx.head);
      // The same valid receipt copied under a different subject file name.
      fs.copyFileSync(path.join(directory, 'root-compile.json'), path.join(directory, 'bin-parse.json'));
      expect(fx.run(['verify']).json).toMatchObject({ ok: false, valid: ['root-compile'], invalid: ['bin-parse'] });
      fs.rmSync(path.join(directory, 'bin-parse.json'));
      // A receipt that validates but is bound to ANOTHER checkpoint, filed in this one's directory.
      const other = buildCertificationReceipt({ subject: 'root-compile', sourceHead: 'c'.repeat(40), observedAtHead: fx.head, sourceRootCleanAtEmit: true, checkId: 'cmd-root-compile', checkState: 'MET', producer: 'COMMAND' });
      fs.writeFileSync(path.join(directory, 'root-compile.json'), `${JSON.stringify(other, null, 2)}\n`);
      expect(fx.run(['verify']).json).toMatchObject({ ok: false, invalid: ['root-compile'] });
    } finally {
      fx.cleanup();
    }
  });

  // R5-13 — the evidence must verify from a CLEAN clone: the host-local ignored directories do not
  // exist there, so the tracked directory alone has to carry both a produced certification receipt and
  // a verbatim copy of a host receipt.
  test('a host UI-harness receipt is imported verbatim, published, and both receipts verify with NO host-local directory', () => {
    const fx = fixture();
    try {
      fx.verdict([]);
      const harnessFile = { filepath: `/repo/ui/control-center/${UI_HARNESS_FILE}`, tasks: [{ type: 'suite', name: 'suite', tasks: [{ type: 'test', name: 'renders', result: { state: 'pass' } }] }] };
      const host = buildUiHarnessReceipt({ files: [harnessFile], headSha: fx.head, treeClean: true, typesSource: null, harnessSource: 'it(\'renders\')', executedAt: '2026-10-03T00:00:00.000Z' }) as Record<string, unknown>;
      fs.mkdirSync(path.join(fx.root, 'artifacts', 'receipts'), { recursive: true });
      const hostFile = path.join(fx.root, 'artifacts', 'receipts', 'ui-harness-receipt.v1.json');
      fs.writeFileSync(hostFile, `${JSON.stringify(host, null, 2)}\n`);
      expect(fx.run(['produce', '--subject', 'root-compile', '--measurement-root', fx.measurement()]).status).toBe(0);
      const imported = fx.run(['import', '--subject', 'ui-error-taxonomy-rendering']);
      expect(imported.status, imported.stderr).toBe(0);
      expect(imported.json).toMatchObject({ ok: true, code: 'CERTIFY_IMPORTED', digest: host.receiptDigest });
      const published = fx.run(['publish']);
      expect(published.json).toMatchObject({ ok: true, skipped: [] });
      expect((published.json as { published: string[] }).published.sort()).toEqual(['root-compile', 'ui-error-taxonomy-rendering']);
      const tracked = path.join(fx.root, 'evidence', 'certification', fx.head, 'ui-error-taxonomy-rendering.json');
      expect(fs.readFileSync(tracked, 'utf8')).toBe(fs.readFileSync(hostFile, 'utf8'));
      expect(fx.run(['verify']).json).toMatchObject({ ok: true, invalid: [] });
      // A "clean clone": only the TRACKED evidence directory exists.
      const clone = fs.mkdtempSync(path.join(TMP_BASE, 'nw-certify-clone-'));
      try {
        fs.cpSync(path.join(fx.root, 'evidence'), path.join(clone, 'evidence'), { recursive: true });
        expect(fs.existsSync(path.join(clone, 'artifacts'))).toBe(false);
        const rootReceipt = JSON.parse(fs.readFileSync(path.join(clone, 'evidence', 'certification', fx.head, 'root-compile.json'), 'utf8')) as Record<string, unknown>;
        expect(verifyPersistedReceipt(clone, 'root-compile', String(rootReceipt.receiptDigest), fx.head)).toEqual({ verified: true, reason: 'VERIFIED' });
        expect(verifyPersistedReceipt(clone, 'ui-error-taxonomy-rendering', String(host.receiptDigest), fx.head)).toEqual({ verified: true, reason: 'VERIFIED' });
        // The tracked receipt of one SHA never verifies at another.
        expect(verifyPersistedReceipt(clone, 'root-compile', String(rootReceipt.receiptDigest), 'd'.repeat(40)).verified).toBe(false);
      } finally {
        fs.rmSync(clone, { recursive: true, force: true });
      }
    } finally {
      fx.cleanup();
    }
  });

  test('import refuses a non-importable subject and a host receipt that does not verify', () => {
    const fx = fixture();
    try {
      fx.verdict([]);
      expect(fx.run(['import', '--subject', 'root-compile']).json).toMatchObject({ ok: false, code: 'CERTIFY_SUBJECT_NOT_IMPORTABLE' });
      expect(fx.run(['import', '--subject', 'root-compile']).status).toBe(3);
      expect(fx.run(['import']).status).toBe(2);
      // No host receipt at all, then one bound to ANOTHER checkpoint: neither is importable.
      expect(fx.run(['import', '--subject', 'ui-error-taxonomy-rendering']).status).toBe(1);
      const harnessFile = { filepath: `/repo/ui/control-center/${UI_HARNESS_FILE}`, tasks: [{ type: 'suite', name: 'suite', tasks: [{ type: 'test', name: 'renders', result: { state: 'pass' } }] }] };
      const other = buildUiHarnessReceipt({ files: [harnessFile], headSha: 'e'.repeat(40), treeClean: true, typesSource: null, harnessSource: 'it(\'renders\')', executedAt: '2026-10-03T00:00:00.000Z' });
      fs.mkdirSync(path.join(fx.root, 'artifacts', 'receipts'), { recursive: true });
      fs.writeFileSync(path.join(fx.root, 'artifacts', 'receipts', 'ui-harness-receipt.v1.json'), JSON.stringify(other));
      expect(fx.run(['import', '--subject', 'ui-error-taxonomy-rendering']).json).toMatchObject({ ok: false, code: 'CERTIFY_IMPORT_NO_VERIFIED_RECEIPT' });
    } finally {
      fx.cleanup();
    }
  });

  test('bind rewrites only the value keys of bindings that have a verified tracked receipt', () => {
    const fx = fixture({ typecheck: 'node -e "process.exit(0)"', 'typecheck:bin': 'node -e "process.exit(0)"' });
    try {
      const binding = (subject: string) => ({ subject, evidenceSha: null, receiptDigest: null, observedAt: null, executor: null, artifactPaths: ['tsconfig.json'], certifying: true });
      const file = path.join(fx.root, 'config', 'release-evidence.v1.json');
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, `${JSON.stringify({ schemaVersion: 'nightwatch.release-evidence.v1', bindings: [binding('root-compile'), binding('structural-invariants')] }, null, 2)}\n`);
      fx.git(['add', '--all']);
      fx.git(['-c', 'user.name=nw', '-c', 'user.email=nw@example.invalid', 'commit', '--quiet', '--no-gpg-sign', '-m', 'bindings']);
      const head = fx.git(['rev-parse', 'HEAD']);
      fx.verdict([], head);
      expect(fx.run(['produce', '--subject', 'root-compile', '--measurement-root', fx.measurement(head)]).status).toBe(0);
      expect(fx.run(['produce', '--subject', 'bin-parse', '--measurement-root', fx.measurement(head)]).status).toBe(0);
      expect(fx.run(['publish']).status).toBe(0);
      const bound = fx.run(['bind']);
      // bin-parse has a verified receipt but no binding; structural-invariants has a binding but no receipt.
      expect(bound.json).toMatchObject({ ok: false, bound: ['root-compile'], unbound: ['bin-parse'] });
      const document = JSON.parse(fs.readFileSync(file, 'utf8')) as { bindings: Array<Record<string, unknown>> };
      const rootCompile = document.bindings.find((entry) => entry.subject === 'root-compile')!;
      const tracked = JSON.parse(fs.readFileSync(path.join(fx.root, 'evidence', 'certification', head, 'root-compile.json'), 'utf8')) as { receiptDigest: string };
      expect(rootCompile).toMatchObject({ evidenceSha: head, receiptDigest: tracked.receiptDigest, executor: 'certify-evidence', artifactPaths: ['tsconfig.json'], certifying: true });
      expect(String(rootCompile.observedAt)).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      expect(document.bindings.find((entry) => entry.subject === 'structural-invariants')).toMatchObject({ evidenceSha: null, receiptDigest: null });
      // A tampered tracked receipt is never bound.
      const trackedFile = path.join(fx.root, 'evidence', 'certification', head, 'root-compile.json');
      fs.writeFileSync(trackedFile, fs.readFileSync(trackedFile, 'utf8').replace('"MET"', '"UNMET"'));
      fs.writeFileSync(file, `${JSON.stringify({ schemaVersion: 'nightwatch.release-evidence.v1', bindings: [binding('root-compile')] }, null, 2)}\n`);
      expect(fx.run(['bind']).json).toMatchObject({ ok: false, bound: [], unbound: expect.arrayContaining(['root-compile']) });
      expect((JSON.parse(fs.readFileSync(file, 'utf8')) as { bindings: Array<Record<string, unknown>> }).bindings[0]).toMatchObject({ evidenceSha: null });
    } finally {
      fx.cleanup();
    }
  });

  test('the CI observation subject is NOT_MET without a GitHub run at S (never fabricated)', () => {
    const fx = fixture();
    try {
      fx.verdict([]);
      const produced = fx.run(['produce', '--subject', 'exact-checkpoint-ci']);
      // No reachable GitHub run for a synthetic SHA: an honest, unavailable observation.
      expect(produced.status).toBe(1);
      expect(JSON.parse(fs.readFileSync(path.join(fx.root, 'artifacts', 'certification-staging', fx.head, 'exact-checkpoint-ci.json'), 'utf8'))).toMatchObject({ producer: 'OBSERVE_CI', result: 'NOT_MET' });
    } finally {
      fx.cleanup();
    }
  });
});

test.describe('the producer decision logic (injected effects)', () => {
  const S = 'a'.repeat(40);
  const D = 'b'.repeat(40);
  const TREE = 'c'.repeat(40);
  const verdict = (checkpoint = S) => ({ releaseVerdict: { certifiedCheckpointSha: checkpoint, conditions: [condition('documentation-currency', 'documentation-currency-rules', 'MET')] } });
  /** Answers keyed by the space-joined git argv; anything absent fails closed (null). */
  const gitStub = (answers: Record<string, string | null>) => (args: string[]): string | null => answers[args.join(' ')] ?? null;
  const observerAnswers = (head: string, ancestor = true): Record<string, string | null> => ({
    'rev-parse HEAD': `${head}\n`,
    'status --porcelain': '',
    [`cat-file -e ${S}^{commit}`]: '',
    [`merge-base --is-ancestor ${S} ${head}`]: ancestor ? '' : null,
    [`rev-parse ${S}^{tree}`]: `${TREE}\n`,
  });
  const measurementAnswers: Record<string, string | null> = {
    [`cat-file -e ${S}^{commit}`]: '',
    'rev-parse HEAD': `${S}\n`,
    'rev-parse HEAD^{tree}': `${TREE}\n`,
    [`rev-parse ${S}^{tree}`]: `${TREE}\n`,
    'status --porcelain': '',
    'status --porcelain --ignored': '',
  };
  const measurement = (overrides: Record<string, unknown> = {}) => ({
    root: '/measurement',
    realpath: '/measurement',
    rootIsSymlink: false,
    topLevel: '/measurement',
    git: gitStub(measurementAnswers),
    runCommand: () => ({ status: 0, preVerified: true }),
    ...overrides,
  });
  const io = (head: string, overrides: Record<string, unknown> = {}) => ({
    git: gitStub(observerAnswers(head)),
    projectVerdict: () => verdict(),
    observeCi: () => null,
    checkpointRangeClass: () => 'DOCUMENTARY_DESCENDANT',
    measurement: null,
    ...overrides,
  });

  test('a CI observation needs S to be an ancestor of HEAD and is MET only for a success conclusion', () => {
    const passing = produceCertificationReceipt({ subject: 'exact-checkpoint-ci', io: io(D, { observeCi: () => ({ runId: '42', conclusion: 'success' }) }) });
    expect(passing.receipt).toMatchObject({ result: 'PASS', ciRunId: '42', ciConclusion: 'success', sourceHead: S, observedAtHead: D });
    const failing = produceCertificationReceipt({ subject: 'exact-checkpoint-ci', io: io(D, { observeCi: () => ({ runId: '43', conclusion: 'failure' }) }) });
    expect(failing.receipt).toMatchObject({ result: 'NOT_MET', ciConclusion: 'failure' });
    const detached = produceCertificationReceipt({ subject: 'exact-checkpoint-ci', io: io(D, { git: gitStub(observerAnswers(D, false)) }) });
    expect(detached).toMatchObject({ ok: false, code: 'CERTIFY_CHECKPOINT_NOT_ANCESTOR' });
  });

  test('a PROJECT_CHECK subject is judged at a documentary descendant by the check itself; a COMMAND subject measures only through a verified measurement root', () => {
    expect(produceCertificationReceipt({ subject: 'documentation-currency', io: io(D) }).receipt).toMatchObject({ result: 'PASS', observedAtHead: D });
    // No measurement root: no command is ever executed and no receipt exists.
    expect(produceCertificationReceipt({ subject: 'root-compile', io: io(D) })).toMatchObject({ ok: false, code: 'CERTIFY_MEASUREMENT_ROOT_REQUIRED' });
    // A verified measurement root at S: the documentary descendant D legitimately measures S.
    const receipted = produceCertificationReceipt({ subject: 'root-compile', io: io(D, { measurement: measurement() }) });
    expect(receipted.receipt).toMatchObject({ result: 'PASS', sourceHead: S, observedAtHead: D, producer: 'COMMAND', checkState: 'MET', commandDigest: commandDigest(['npm', 'run', '--silent', 'typecheck']) });
    expect(validateCertificationReceipt(receipted.receipt)).toEqual([]);
    expect(produceCertificationReceipt({ subject: 'completion-ledger-truth', io: io(S) })).toMatchObject({ ok: false, code: 'CERTIFY_CONDITION_UNKNOWN' });
  });

  test('selectCiObservation takes only a COMPLETED run at exactly the requested SHA', () => {
    const runs = [
      { databaseId: 3, headSha: S, status: 'in_progress', conclusion: '' },
      { databaseId: 2, headSha: D, status: 'completed', conclusion: 'success' },
      { databaseId: 1, headSha: S.toUpperCase(), status: 'completed', conclusion: 'success' },
    ];
    expect(selectCiObservation(runs, S)).toEqual({ runId: '1', conclusion: 'success' });
    expect(selectCiObservation(runs.slice(0, 2), S)).toBeNull();
    expect(selectCiObservation('nope', S)).toBeNull();
    expect(selectCiObservation([{ databaseId: -1, headSha: S, status: 'completed', conclusion: 'success' }], S)).toBeNull();
  });

  // BM-118 / BM-120 / BM-122 detection: a forged measurement repository, a
  // mis-placed observer and a substituted execution are all refused by name.
  test('a forged tree identity, a mis-placed observer and a substituted execution are each refused categorically', () => {
    // Tree identity: the measurement repository claims S but presents another tree.
    expect(produceCertificationReceipt({
      subject: 'root-compile',
      io: io(D, { measurement: measurement({ git: gitStub({ ...measurementAnswers, 'rev-parse HEAD^{tree}': `${'d'.repeat(40)}\n`, [`rev-parse ${S}^{tree}`]: `${'d'.repeat(40)}\n` }) }) }),
    })).toMatchObject({ ok: false, code: 'CERTIFY_MEASUREMENT_TREE_MISMATCH' });
    // Observer ancestry: S is not reachable from the observing HEAD.
    expect(produceCertificationReceipt({
      subject: 'root-compile',
      io: io(D, { git: gitStub(observerAnswers(D, false)), measurement: measurement() }),
    })).toMatchObject({ ok: false, code: 'CERTIFY_CHECKPOINT_NOT_ANCESTOR' });
    // Observer range: a SUBSTANTIVE descendant of S may not re-earn evidence at S.
    expect(produceCertificationReceipt({
      subject: 'root-compile',
      io: io(D, { checkpointRangeClass: () => 'SUBSTANTIVE_DESCENDANT', measurement: measurement() }),
    })).toMatchObject({ ok: false, code: 'CERTIFY_CHECKPOINT_RANGE_INVALID' });
    // An unclassifiable range fails closed, never open.
    expect(produceCertificationReceipt({
      subject: 'root-compile',
      io: io(D, { checkpointRangeClass: () => null, measurement: measurement() }),
    })).toMatchObject({ ok: false, code: 'CERTIFY_CHECKPOINT_RANGE_INVALID' });
    // Time-of-check/time-of-use: a root that no longer measures S refuses instead of executing.
    expect(produceCertificationReceipt({
      subject: 'root-compile',
      io: io(D, { measurement: measurement({ runCommand: () => ({ status: 0, preVerified: false }) }) }),
    })).toMatchObject({ ok: false, code: 'CERTIFY_MEASUREMENT_RACE' });
  });

  test('a command that times out or exits non-zero is never MET, and PASS requires one real execution', () => {
    let calls = 0;
    const counted = measurement({ runCommand: () => { calls += 1; return { status: 0, preVerified: true }; } });
    const passed = produceCertificationReceipt({ subject: 'root-compile', io: io(D, { measurement: counted }) });
    expect(passed.receipt).toMatchObject({ result: 'PASS' });
    expect(calls).toBe(1);
    // A killed/timed-out command reports status null and can never be MET.
    expect(produceCertificationReceipt({ subject: 'root-compile', io: io(D, { measurement: measurement({ runCommand: () => ({ status: null, preVerified: true }) }) }) }).receipt).toMatchObject({ checkState: 'NOT_MET', result: 'NOT_MET' });
    expect(produceCertificationReceipt({ subject: 'root-compile', io: io(D, { measurement: measurement({ runCommand: () => ({ status: 2, preVerified: true }) }) }) }).receipt).toMatchObject({ checkState: 'NOT_MET', result: 'NOT_MET' });
    // A receipt that claimed a measurement pair it did not measure does not re-derive.
    const forged = { ...(passed.receipt ?? {}), observedAtHead: 'e'.repeat(40) } as Record<string, unknown>;
    expect(validateCertificationReceipt(forged).some((error) => error.startsWith('CERT_RECEIPT_DIGEST_MISMATCH'))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// R5-15 / D-173 — the COMMAND-producer checkpoint cycle (owner DEFECT B),
// proven, not asserted, and then CORRECTED by the guarded measurement root.
//
// A COMMAND receipt is the only evidence that re-earns the six command lanes
// (`root-compile`, `bin-parse`, `structural-invariants`, `full-regression`,
// `ui`, `browser-workflow`) and it therefore decides release condition #1.
// Its OLD guard was `head === checkpoint`, where BOTH values come from the SAME
// root: HEAD from Git, and the checkpoint from the verdict the real
// `bin/project-state-check.mjs` derives from that root's
// `docs/CURRENT_STATE.md` `LAST_SUBSTANTIVE_IMPLEMENTATION_SHA`.
//
// The authoritative choreography (session worktree -> substantive commit S ->
// documentary anchor-advance commit -> evidence commits) therefore puts HEAD at
// S while the tree at S still declares the PREVIOUS anchor, or puts the anchor
// at S while HEAD is the documentary descendant. The two facts can never be
// equal in a real repository, because a commit that declared its own SHA as the
// anchor would be a SHA-1 fixed point of its own tree.
//
// These tests reproduce that contradiction against a REAL synthetic Git
// repository (no stubbed verifier), pin the structural facts that make the old
// guard unsatisfiable, and prove the corrected invariant: a COMMAND receipt is
// produced only against a verified exact-checkpoint measurement root.
// ---------------------------------------------------------------------------

const ANCHOR_FIELD = 'LAST_SUBSTANTIVE_IMPLEMENTATION_SHA';
const ENVIRONMENT = { PATH: process.env.PATH ?? '', HOME: TMP_BASE, GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_NOSYSTEM: '1', GIT_AUTHOR_NAME: 'nw', GIT_AUTHOR_EMAIL: 'nw@example.invalid', GIT_COMMITTER_NAME: 'nw', GIT_COMMITTER_EMAIL: 'nw@example.invalid' };

interface CycleRepo {
  readonly root: string;
  declaredAnchor(): string;
  commit(message: string, mutate?: () => void): string;
  worktree(name: string, sha: string): string;
  produce(observerRoot: string, subject: string, extra?: string[]): { status: number | null; json: Record<string, unknown> | null };
  cleanup(): void;
}

/** A real Git repository carrying a real docs/CURRENT_STATE.md anchor and a REAL project-state-check. */
function cycleRepo(scripts: Record<string, string> = { typecheck: 'node -e "process.exit(0)"' }): CycleRepo {
  const root = fs.mkdtempSync(path.join(TMP_BASE, 'nw-cycle-'));
  fs.writeFileSync(path.join(root, '.gitignore'), 'artifacts/\n*.local.json\n');
  fs.mkdirSync(path.join(root, 'config'), { recursive: true });
  fs.mkdirSync(path.join(root, 'bin'), { recursive: true });
  // A verdict source that derives the certified checkpoint the SAME way the
  // real one does — from this root's docs/CURRENT_STATE.md anchor field — so
  // the identity guard is exercised for real rather than stubbed away.
  fs.writeFileSync(path.join(root, 'bin', 'project-state-check.mjs'), "import fs from 'node:fs';\nconst text = fs.readFileSync(new URL('../docs/CURRENT_STATE.md', import.meta.url), 'utf8');\nconst sha = /^LAST_SUBSTANTIVE_IMPLEMENTATION_SHA: ([0-9a-f]{40})$/m.exec(text)?.[1] ?? '';\nprocess.stdout.write(JSON.stringify({ releaseVerdict: { certifiedCheckpointSha: sha, conditions: [] } }));\n");
  fs.writeFileSync(path.join(root, 'config', 'release-certification.v1.json'), JSON.stringify({ schemaVersion: 'nightwatch.release-certification.v1', definitionName: 'fixture', certifiedCheckpointField: ANCHOR_FIELD, advanceStatuses: [], nextStatus: { state: 'DECIDED', safeDefault: 'OPERATIONALLY_ACCEPTED', ownerDecision: 'fixture', decidedBy: 'D-1', statement: 'fixture' }, externalTrack: { id: 'x', stages: [], excludedFromAdvanceConditions: true, checks: [], statement: 'fixture' }, presentationSurfaces: [], conditions: [] }));
  fs.writeFileSync(path.join(root, 'tsconfig.json'), '{}\n');
  fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({ name: 'fixture', version: '0.0.0', scripts }));
  fs.mkdirSync(path.join(root, 'docs'), { recursive: true });
  fs.writeFileSync(path.join(root, 'docs', 'CURRENT_STATE.md'), `## block\n${ANCHOR_FIELD}: ${'0'.repeat(40)}\nPROJECT_COMPLETION_STATUS: OPERATIONALLY_ACCEPTED\n`);
  const git = (args: string[], cwd = root) => spawnSync('git', args, { cwd, env: ENVIRONMENT, encoding: 'utf8', shell: false, timeout: 60_000 });
  git(['init', '--quiet']);
  git(['add', '--all']);
  git(['commit', '--quiet', '--no-gpg-sign', '-m', 'base']);
  /** Marker bytes so every commit in this fixture carries a real change. */
  let generation = 0;
  const commit = (message: string, mutate?: () => void): string => {
    if (mutate !== undefined) mutate();
    else fs.writeFileSync(path.join(root, 'generation.txt'), `generation ${String(generation += 1)}\n`);
    git(['add', '--all']);
    const result = git(['commit', '--quiet', '--no-gpg-sign', '-m', message]);
    expect(result.status).toBe(0);
    return git(['rev-parse', 'HEAD']).stdout.trim();
  };
  /** @type {string[]} */
  const worktrees: string[] = [];
  return {
    root,
    declaredAnchor: () => new RegExp(`^${ANCHOR_FIELD}: ([0-9a-f]{40})$`, 'm').exec(fs.readFileSync(path.join(root, 'docs', 'CURRENT_STATE.md'), 'utf8'))?.[1] ?? '',
    commit,
    worktree: (name: string, sha: string) => {
      const target = path.join(fs.mkdtempSync(path.join(TMP_BASE, 'nw-cycle-wt-')), name);
      const result = git(['worktree', 'add', '--detach', '--quiet', target, sha]);
      expect(result.status).toBe(0);
      worktrees.push(path.dirname(target));
      return target;
    },
    produce: (observerRoot: string, subject: string, extra: string[] = []) => {
      const result = spawnSync(process.execPath, [path.join(ROOT, 'bin', 'certify-evidence.mjs'), 'produce', '--subject', subject, '--root', observerRoot, ...extra], { cwd: observerRoot, encoding: 'utf8', timeout: 120_000, env: ENVIRONMENT });
      /** @type {Record<string, unknown> | null} */
      let json = null;
      try {
        json = JSON.parse(result.stdout ?? '');
      } catch {
        json = null;
      }
      return { status: result.status, json };
    },
    cleanup: () => {
      fs.rmSync(root, { recursive: true, force: true });
      for (const worktree of worktrees) fs.rmSync(worktree, { recursive: true, force: true });
    },
  };
}

const advanceAnchor = (repo: CycleRepo, sha: string): void => {
  const file = path.join(repo.root, 'docs', 'CURRENT_STATE.md');
  const text = fs.readFileSync(file, 'utf8');
  fs.writeFileSync(file, text.replace(new RegExp(`^${ANCHOR_FIELD}: [0-9a-f]{40}$`, 'm'), `${ANCHOR_FIELD}: ${sha}`));
};

test.describe('the command-lane checkpoint cycle (R5-15 / D-173)', () => {
  test('14. the live repository never produces a COMMAND receipt without its measurement root, whatever else it says', () => {
    // A COMMAND receipt is produced only from a verified measurement checkout
    // of the certified checkpoint. The live checkout supplies none, so NO
    // receipt is produced and the CLI exits 3.
    const result = spawnSync(process.execPath, [CLI, 'produce', '--subject', 'root-compile'], { cwd: ROOT, encoding: 'utf8', timeout: 120_000 });
    expect(result.status).toBe(3);
    const parsed = JSON.parse(result.stdout) as { ok: boolean; code: string };
    expect(parsed.ok).toBe(false);
    expect(['CERTIFY_MEASUREMENT_ROOT_REQUIRED', 'CERTIFY_TREE_DIRTY', 'CERTIFY_CHECKPOINT_UNRESOLVED']).toContain(parsed.code);
    // And nothing was staged for the live HEAD: no SHA was measured, so no
    // receipt may exist for it. (The staging directory itself is a host-local
    // ignored artefact of earlier runs, so only the HEAD-specific file matters.)
    const liveHead = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).stdout.trim();
    expect(fs.existsSync(path.join(ROOT, 'artifacts', 'certification-staging', liveHead, 'root-compile.json'))).toBe(false);
  });

  test('15. no commit in the certify-evidence era declares its own SHA as the anchor', () => {
    // Bounded to the range in which bin/lib/certify-producers.mjs exists, so the
    // check stays decisive without scanning the whole history.
    const introduced = spawnSync('git', ['log', '--diff-filter=A', '--format=%H', '--reverse', '--', 'bin/lib/certify-producers.mjs'], { cwd: ROOT, encoding: 'utf8', timeout: 60_000 }).stdout.trim().split('\n').filter(Boolean);
    const floor = introduced[0] ?? 'HEAD';
    const commits = spawnSync('git', ['rev-list', `${floor}..HEAD`], { cwd: ROOT, encoding: 'utf8', timeout: 120_000 }).stdout.trim().split('\n').filter(Boolean);
    expect(commits.length).toBeGreaterThan(0);
    for (const sha of [...commits, floor]) {
      const declared = spawnSync('git', ['show', `${sha}:docs/CURRENT_STATE.md`], { cwd: ROOT, encoding: 'utf8', timeout: 30_000 });
      if (declared.status !== 0) continue;
      const anchor = new RegExp(`^${ANCHOR_FIELD}: ([0-9a-f]{40})$`, 'm').exec(declared.stdout)?.[1] ?? '';
      expect(anchor === sha ? sha : 'declared-other').toBe('declared-other');
    }
  });

  test('16. amending the anchor to the commit SHA changes the SHA, forever', () => {
    // The fixpoint the OLD command producer needed does not converge: the SHA is
    // a hash of the tree that contains the SHA. This is why the correction is a
    // measurement root, not a clever anchor edit.
    const repo = cycleRepo();
    try {
      const first = repo.commit('substantive-1');
      advanceAnchor(repo, first);
      const second = repo.commit('anchor-advance-1');
      expect(second).not.toBe(first);
      advanceAnchor(repo, second);
      const third = repo.commit('anchor-advance-2');
      expect(third).not.toBe(second);
      expect(third).not.toBe(first);
      // And the anchor still never names the commit that carries it.
      expect(repo.declaredAnchor()).toBe(second);
    } finally {
      repo.cleanup();
    }
  });

  test('17. the documentary descendant produces a COMMAND receipt ONLY against a verified measurement root at the substantive checkpoint', () => {
    const repo = cycleRepo();
    try {
      // The substantive fix: a real source change.
      fs.writeFileSync(path.join(repo.root, 'tsconfig.json'), '{ "compilerOptions": {} }\n');
      const substantive = repo.commit('fix: substantive');
      // The documentary anchor advance (the approved documentation-only path).
      advanceAnchor(repo, substantive);
      const anchor = repo.commit('docs: advance the anchor to the substantive checkpoint', () => {});
      const measurement = repo.worktree('substantive', substantive);
      // (a) Without a measurement root, both checkouts refuse: the old guard is
      //     not silently replaced by a weaker one.
      expect(repo.produce(repo.root, 'root-compile')).toMatchObject({ status: 3, json: { code: 'CERTIFY_MEASUREMENT_ROOT_REQUIRED' } });
      // (b) The substantive checkout itself: its own tree declares the PREVIOUS
      //     anchor, so there is no resolvable checkpoint to measure at.
      expect(repo.produce(repo.worktree('substantive-self', substantive), 'root-compile', ['--measurement-root', measurement])).toMatchObject({ status: 3, json: { code: 'CERTIFY_CHECKPOINT_UNRESOLVED' } });
      // (c) THE CORRECTION: the anchor-advance descendant D observes S through
      //     the verified measurement root and produces a real PASS receipt.
      const produced = repo.produce(repo.root, 'root-compile', ['--measurement-root', measurement]);
      expect(produced.status).toBe(0);
      expect(produced.json).toMatchObject({ ok: true, code: 'CERTIFY_PASS', result: 'PASS', sourceHead: substantive });
      const staged = JSON.parse(fs.readFileSync(path.join(repo.root, 'artifacts', 'certification-staging', substantive, 'root-compile.json'), 'utf8')) as Record<string, unknown>;
      expect(staged).toMatchObject({ subject: 'root-compile', producer: 'COMMAND', sourceHead: substantive, observedAtHead: anchor, checkState: 'MET', sourceRootCleanAtEmit: true, commandDigest: commandDigest(['npm', 'run', '--silent', 'typecheck']) });
      expect(validateCertificationReceipt(staged)).toEqual([]);
      // (d) The measurement root itself is never the measurement: a checkout AT
      //     the anchor-advance descendant cannot claim S.
      expect(repo.produce(repo.root, 'root-compile', ['--measurement-root', repo.worktree('anchor-self', anchor)])).toMatchObject({ status: 3, json: { code: 'CERTIFY_MEASUREMENT_NOT_CHECKPOINT' } });
    } finally {
      repo.cleanup();
    }
  });

  test('18. a receipt that claimed a measurement it did not make is refused by the verifier', () => {
    // The receipt schema ALREADY carries sourceHead and observedAtHead
    // separately, so the two-phase measurement needed no schema change; what it
    // must never do is claim a sourceHead the command did not run against.
    const fx = fixture();
    try {
      fx.verdict([]);
      expect(fx.run(['produce', '--subject', 'root-compile', '--measurement-root', fx.measurement()]).status).toBe(0);
      const staged = JSON.parse(fs.readFileSync(path.join(fx.root, 'artifacts', 'certification-staging', fx.head, 'root-compile.json'), 'utf8')) as Record<string, unknown>;
      const claimed = { ...staged, observedAtHead: 'c'.repeat(40) } as Record<string, unknown>;
      // The digest covers observedAtHead, so the forged pair does not re-derive.
      expect(staged.sourceHead).toBe(fx.head);
      expect(verifyPersistedReceipt(fx.root, 'root-compile', String(claimed.receiptDigest), fx.head).verified).toBe(false);
    } finally {
      fx.cleanup();
    }
  });
});

// ---------------------------------------------------------------------------
// The guarded measurement root — the corrected invariant (D-173), attacked.
//
// Every test here drives the REAL CLI against a REAL synthetic Git repository:
// real commits, real worktrees, real command execution. The adversarial set
// proves: wrong source identity, dirty or tampered checkouts, unexpected
// ignored inputs, untrusted or symlinked paths, an observer that cannot certify
// the checkpoint it observes, and the honesty of the emitted receipt.
// ---------------------------------------------------------------------------

test.describe('the guarded measurement root (D-173 correction)', () => {
  test('19. all six command lanes are reproducible at S from the documentary descendant, and a failing lane is never MET', () => {
    const repo = cycleRepo({
      typecheck: 'node -e "process.exit(0)"',
      'typecheck:bin': 'node -e "process.exit(0)"',
      'hardening:check': 'node -e "process.exit(0)"',
      test: 'node -e "process.exit(0)"',
      'gate:ui': 'node -e "process.exit(0)"',
      'control-center:ui:browser': 'node -e "process.exit(0)"',
    });
    try {
      fs.writeFileSync(path.join(repo.root, 'tsconfig.json'), '{ "compilerOptions": { "strict": true } }\n');
      const substantive = repo.commit('fix: substantive');
      advanceAnchor(repo, substantive);
      const anchor = repo.commit('docs: advance the anchor to the substantive checkpoint', () => {});
      const measurement = repo.worktree('measure', substantive);
      for (const subject of ['root-compile', 'bin-parse', 'structural-invariants', 'full-regression', 'ui', 'browser-workflow']) {
        const produced = repo.produce(repo.root, subject, ['--measurement-root', measurement]);
        expect(produced.status, subject).toBe(0);
        expect(produced.json, subject).toMatchObject({ ok: true, code: 'CERTIFY_PASS', result: 'PASS', sourceHead: substantive });
        const receipt = JSON.parse(fs.readFileSync(path.join(repo.root, 'artifacts', 'certification-staging', substantive, `${subject}.json`), 'utf8')) as Record<string, unknown>;
        expect(receipt, subject).toMatchObject({ subject, producer: 'COMMAND', sourceHead: substantive, observedAtHead: anchor, checkState: 'MET', result: 'PASS' });
      }
      // An honest failure: the same lane with a failing command is NOT_MET.
      const failing = cycleRepo({ typecheck: 'node -e "process.exit(1)"' });
      try {
        fs.writeFileSync(path.join(failing.root, 'tsconfig.json'), '{ "compilerOptions": {} }\n');
        const substantive2 = failing.commit('fix: substantive');
        advanceAnchor(failing, substantive2);
        failing.commit('docs: advance the anchor', () => {});
        const produced = failing.produce(failing.root, 'root-compile', ['--measurement-root', failing.worktree('measure', substantive2)]);
        expect(produced.status).toBe(1);
        expect(produced.json).toMatchObject({ ok: true, code: 'CERTIFY_NOT_MET', result: 'NOT_MET' });
      } finally {
        failing.cleanup();
      }
    } finally {
      repo.cleanup();
    }
  });

  test('20. wrong source identity is refused: wrong SHA, different branch tip, foreign repository, untrusted path', () => {
    const repo = cycleRepo();
    try {
      fs.writeFileSync(path.join(repo.root, 'tsconfig.json'), '{ "compilerOptions": {} }\n');
      const substantive = repo.commit('fix: substantive');
      advanceAnchor(repo, substantive);
      const anchor = repo.commit('docs: advance the anchor to the substantive checkpoint', () => {});
      // (a) A checkout at the anchor-advance descendant (wrong SHA).
      expect(repo.produce(repo.root, 'root-compile', ['--measurement-root', repo.worktree('anchor-self', anchor)])).toMatchObject({ status: 3, json: { code: 'CERTIFY_MEASUREMENT_NOT_CHECKPOINT' } });
      // (b) A checkout at a different branch tip (committed inside a detached
      //     worktree so the observer itself does not move).
      const tipRoot = repo.worktree('tip', anchor);
      fs.writeFileSync(path.join(tipRoot, 'tsconfig.json'), '{ "compilerOptions": { "target": "es2022" } }\n');
      const tipCommit = spawnSync('git', ['-c', 'user.name=nw', '-c', 'user.email=nw@example.invalid', 'commit', '--quiet', '--no-gpg-sign', '--all', '-m', 'feat: unrelated tip'], { cwd: tipRoot, env: ENVIRONMENT, encoding: 'utf8', shell: false });
      expect(tipCommit.status).toBe(0);
      expect(repo.produce(repo.root, 'root-compile', ['--measurement-root', tipRoot])).toMatchObject({ status: 3, json: { code: 'CERTIFY_MEASUREMENT_NOT_CHECKPOINT' } });
      // (c) An unrelated repository cannot present the authorized source's objects.
      const foreign = cycleRepo();
      try {
        expect(repo.produce(repo.root, 'root-compile', ['--measurement-root', foreign.root])).toMatchObject({ status: 3, json: { code: 'CERTIFY_MEASUREMENT_FOREIGN' } });
      } finally {
        foreign.cleanup();
      }
      // (d) An arbitrary untrusted directory is refused, never measured.
      const untrusted = fs.mkdtempSync(path.join(TMP_BASE, 'nw-cycle-untrusted-'));
      try {
        expect(repo.produce(repo.root, 'root-compile', ['--measurement-root', untrusted])).toMatchObject({ status: 3, json: { code: 'CERTIFY_MEASUREMENT_ROOT_UNSAFE' } });
      } finally {
        fs.rmSync(untrusted, { recursive: true, force: true });
      }
      // (e) A symlinked measurement root is refused (substitution cannot execute).
      const real = repo.worktree('real', substantive);
      const link = path.join(fs.mkdtempSync(path.join(TMP_BASE, 'nw-cycle-link-')), 'link');
      fs.symlinkSync(real, link);
      try {
        expect(repo.produce(repo.root, 'root-compile', ['--measurement-root', link])).toMatchObject({ status: 3, json: { code: 'CERTIFY_MEASUREMENT_ROOT_UNSAFE' } });
      } finally {
        fs.rmSync(path.dirname(link), { recursive: true, force: true });
      }
    } finally {
      repo.cleanup();
    }
  });

  test('21. a substantive descendant of S can never re-earn evidence at S (the observer range is part of the invariant)', () => {
    const repo = cycleRepo();
    try {
      fs.writeFileSync(path.join(repo.root, 'tsconfig.json'), '{ "compilerOptions": {} }\n');
      const substantive = repo.commit('fix: substantive');
      advanceAnchor(repo, substantive);
      repo.commit('docs: advance the anchor to the substantive checkpoint', () => {});
      const measurement = repo.worktree('measure', substantive);
      // A further SUBSTANTIVE commit beyond the documentary descendant: the
      // observer's range S..HEAD now contains real source change, so the
      // checkpoint will move and no evidence may be earned at S any more.
      const moved = repo.commit('fix: more substantive', () => fs.writeFileSync(path.join(repo.root, 'tsconfig.json'), '{ "compilerOptions": { "strict": true } }\n'));
      expect(moved).not.toBe(substantive);
      expect(repo.produce(repo.root, 'root-compile', ['--measurement-root', measurement])).toMatchObject({ status: 3, json: { code: 'CERTIFY_CHECKPOINT_RANGE_INVALID' } });
    } finally {
      repo.cleanup();
    }
  });

  test('22. a dirty or tampered measurement checkout is refused; disposable inputs alone are tolerated', () => {
    const repo = cycleRepo();
    try {
      fs.writeFileSync(path.join(repo.root, 'tsconfig.json'), '{ "compilerOptions": {} }\n');
      const substantive = repo.commit('fix: substantive');
      advanceAnchor(repo, substantive);
      repo.commit('docs: advance the anchor to the substantive checkpoint', () => {});
      // (a) A tampered tracked file (a replaced fixture) is refused.
      const tampered = repo.worktree('tampered', substantive);
      fs.writeFileSync(path.join(tampered, 'tsconfig.json'), '{ "compilerOptions": { "evil": true } }\n');
      expect(repo.produce(repo.root, 'root-compile', ['--measurement-root', tampered])).toMatchObject({ status: 3, json: { code: 'CERTIFY_MEASUREMENT_DIRTY' } });
      // (b) An untracked source overlay is refused.
      const overlay = repo.worktree('overlay', substantive);
      fs.writeFileSync(path.join(overlay, 'injected-fixture.ts'), 'export const evil = true;\n');
      expect(repo.produce(repo.root, 'root-compile', ['--measurement-root', overlay])).toMatchObject({ status: 3, json: { code: 'CERTIFY_MEASUREMENT_DIRTY' } });
      // (c) An ignored input OUTSIDE the disposable allowlist (a local override)
      //     is refused even though Git itself considers it ignorable.
      const overridden = repo.worktree('overridden', substantive);
      fs.writeFileSync(path.join(overridden, 'override.local.json'), '{"injected": true}\n');
      expect(repo.produce(repo.root, 'root-compile', ['--measurement-root', overridden])).toMatchObject({ status: 3, json: { code: 'CERTIFY_MEASUREMENT_IGNORED_INPUT' } });
      // (d) A disposable build/staging input is TOLERATED: the qualified
      //     checkout may carry its dependency and staging classes.
      const disposable = repo.worktree('disposable', substantive);
      fs.mkdirSync(path.join(disposable, 'artifacts'), { recursive: true });
      fs.writeFileSync(path.join(disposable, 'artifacts', 'scratch.txt'), 'build output\n');
      expect(repo.produce(repo.root, 'root-compile', ['--measurement-root', disposable])).toMatchObject({ status: 0, json: { code: 'CERTIFY_PASS' } });
    } finally {
      repo.cleanup();
    }
  });
});
