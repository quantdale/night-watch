// R5-12 / review-5 task B2.1 — the certification producers, driven through the REAL CLI
// against a synthetic Git repository. The project-state verdict source is a declared
// stand-in (`bin/project-state-check.mjs` printing a fixture verdict); everything the
// producer does with it — the measurement, the receipt, the staging, the publication —
// is the real code, and the resulting receipts are checked by the REAL verifier.
// The full-machinery end-to-end proof is the B6 reachability test.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { test, expect } from '@playwright/test';
import { buildCertificationReceipt } from '../../bin/lib/certification-evidence.mjs';
import { commandDigest, produceCertificationReceipt, selectCiObservation } from '../../bin/lib/certify-producers.mjs';
import { verifyPersistedReceipt } from '../../bin/lib/release-evidence.mjs';

const ROOT = path.join(__dirname, '..', '..');
const CLI = path.join(ROOT, 'bin', 'certify-evidence.mjs');

interface Fixture { readonly root: string; readonly head: string; git(args: string[]): string; verdict(conditions: Array<Record<string, unknown>>, checkpoint?: string): void; run(args: string[]): { status: number | null; json: Record<string, unknown> | null; stderr: string }; cleanup(): void }

function fixture(scripts: Record<string, string> = { typecheck: 'node -e "process.exit(0)"' }): Fixture {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'nw-certify-'));
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
  const fx: Fixture = {
    root,
    head,
    git,
    verdict: (conditions, checkpoint = head) => {
      // Not tracked content of the fixture commit's tree: written ignored via info/exclude.
      fs.appendFileSync(path.join(root, '.git', 'info', 'exclude'), fs.existsSync(path.join(root, 'verdict.json')) ? '' : 'verdict.json\n');
      fs.writeFileSync(path.join(root, 'verdict.json'), JSON.stringify({ releaseVerdict: { certifiedCheckpointSha: checkpoint, conditions } }));
    },
    run: (args) => {
      const result = spawnSync(process.execPath, [CLI, ...args, '--root', root], { cwd: ROOT, encoding: 'utf8', timeout: 120_000 });
      let json: Record<string, unknown> | null = null;
      try { json = JSON.parse(result.stdout ?? '') as Record<string, unknown>; } catch { json = null; }
      return { status: result.status, json, stderr: result.stderr ?? '' };
    },
    cleanup: () => fs.rmSync(root, { recursive: true, force: true }),
  };
  return fx;
}

const condition = (id: string, check: string, checkState: string) => ({ id, check, checkState });

test.describe('certify-evidence produce / publish / verify (real CLI, synthetic repository)', () => {
  test('a passing command subject stages a PASS receipt that the real verifier accepts, then publishes and verifies offline', () => {
    const fx = fixture();
    try {
      fx.verdict([]);
      const produced = fx.run(['produce', '--subject', 'root-compile']);
      expect(produced.status, produced.stderr).toBe(0);
      expect(produced.json).toMatchObject({ ok: true, code: 'CERTIFY_PASS', result: 'PASS', sourceHead: fx.head });
      const staged = path.join(fx.root, 'artifacts', 'certification-staging', fx.head, 'root-compile.json');
      const body = JSON.parse(fs.readFileSync(staged, 'utf8')) as Record<string, unknown>;
      expect(body).toMatchObject({ subject: 'root-compile', producer: 'COMMAND', checkState: 'MET', sourceRootCleanAtEmit: true, commandDigest: commandDigest(['npm', 'run', '--silent', 'typecheck']) });
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
      const produced = fx.run(['produce', '--subject', 'root-compile']);
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

  test('every refusal is categorical and exits 3: HEAD not S, dirty tree, unresolved checkpoint, non-producible subject, missing subject', () => {
    const fx = fixture();
    try {
      fx.verdict([], 'f'.repeat(40));
      expect(fx.run(['produce', '--subject', 'root-compile']).json).toMatchObject({ ok: false, code: 'CERTIFY_HEAD_NOT_CHECKPOINT' });
      expect(fx.run(['produce', '--subject', 'root-compile']).status).toBe(3);
      fx.verdict([]);
      for (const subject of ['owner-manual', 'authoritative-gate', 'clean-checkout', 'ui-error-taxonomy-rendering', 'no-such-subject']) {
        expect(fx.run(['produce', '--subject', subject]).json, subject).toMatchObject({ ok: false, code: 'CERTIFY_SUBJECT_NOT_PRODUCIBLE' });
      }
      expect(fx.run(['produce']).status).toBe(2);
      fs.writeFileSync(path.join(fx.root, 'dirty.txt'), 'x');
      expect(fx.run(['produce', '--subject', 'root-compile']).json).toMatchObject({ ok: false, code: 'CERTIFY_TREE_DIRTY' });
      fs.rmSync(path.join(fx.root, 'dirty.txt'));
      fs.writeFileSync(path.join(fx.root, 'verdict.json'), '{}');
      expect(fx.run(['produce', '--subject', 'root-compile']).json).toMatchObject({ ok: false, code: 'CERTIFY_CHECKPOINT_UNRESOLVED' });
    } finally {
      fx.cleanup();
    }
  });

  test('publish never overwrites a different tracked receipt, and verify catches a tampered one', () => {
    const fx = fixture();
    try {
      fx.verdict([]);
      expect(fx.run(['produce', '--subject', 'root-compile']).status).toBe(0);
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
      expect(fx.run(['produce', '--subject', 'root-compile']).status).toBe(0);
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
  const verdict = (checkpoint = S) => ({ releaseVerdict: { certifiedCheckpointSha: checkpoint, conditions: [condition('documentation-currency', 'documentation-currency-rules', 'MET')] } });
  const io = (head: string, overrides: Record<string, unknown> = {}) => ({
    git: (args: string[]) => (args[0] === 'rev-parse' ? `${head}\n` : args[0] === 'status' ? '' : args[0] === 'merge-base' ? '' : null),
    projectVerdict: () => verdict(),
    runCommand: () => ({ status: 0 }),
    observeCi: () => null,
    ...overrides,
  });

  test('a CI observation needs S to be an ancestor of HEAD and is MET only for a success conclusion', () => {
    const passing = produceCertificationReceipt({ subject: 'exact-checkpoint-ci', io: io(D, { observeCi: () => ({ runId: '42', conclusion: 'success' }) }) });
    expect(passing.receipt).toMatchObject({ result: 'PASS', ciRunId: '42', ciConclusion: 'success', sourceHead: S, observedAtHead: D });
    const failing = produceCertificationReceipt({ subject: 'exact-checkpoint-ci', io: io(D, { observeCi: () => ({ runId: '43', conclusion: 'failure' }) }) });
    expect(failing.receipt).toMatchObject({ result: 'NOT_MET', ciConclusion: 'failure' });
    const detached = produceCertificationReceipt({ subject: 'exact-checkpoint-ci', io: io(D, { git: (args: string[]) => (args[0] === 'rev-parse' ? `${D}\n` : args[0] === 'status' ? '' : null) }) });
    expect(detached).toMatchObject({ ok: false, code: 'CERTIFY_CHECKPOINT_NOT_ANCESTOR' });
  });

  test('a PROJECT_CHECK subject is judged at a documentary descendant by the check itself; a COMMAND subject needs HEAD == S', () => {
    expect(produceCertificationReceipt({ subject: 'documentation-currency', io: io(D) }).receipt).toMatchObject({ result: 'PASS', observedAtHead: D });
    expect(produceCertificationReceipt({ subject: 'root-compile', io: io(D) })).toMatchObject({ ok: false, code: 'CERTIFY_HEAD_NOT_CHECKPOINT' });
    expect(produceCertificationReceipt({ subject: 'root-compile', io: io(S) }).receipt).toMatchObject({ result: 'PASS' });
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
});
