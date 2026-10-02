// R5-12 / R5-13 / review-5 task B6.1 — the reachability proof.
//
// Question: can the release certification honestly reach 16/16 MET from COMMITTED evidence that a
// clean clone verifies? The proof drives the REAL producers (`certify:evidence` for 15 conditions
// plus a verbatim import of the host UI-harness receipt), the REAL documentary classifier, the REAL
// receipt verifier, the REAL evidence inputs and the REAL pure evaluator, over a synthetic Git
// repository whose commit S is certified and whose descendant D carries the evidence.
//
// DECLARED LIMIT: the sixteen LIVE checks (the measurements themselves) are a stand-in — a verdict
// stub that reports each check MET at S. Each check is a separate, separately-tested measurement;
// what this proof establishes is that when every check is MET, the EVIDENCE path (producer ->
// committed receipt -> documentary descendant -> clean clone -> evaluator) reaches MET for every
// condition, and that removing, tampering with or mis-binding any one receipt removes exactly that
// condition. The real tree's own per-condition status is recorded in the review-5 REPORT.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { test, expect } from '@playwright/test';
import { evaluateReleaseCertification, parseReleaseCertificationDefinition } from '../../src/core/releaseCertification';
import { checkpointRoleViolations } from '../../bin/lib/checkpoint-role.mjs';
import { consumeCommittedMeasurement } from '../../bin/lib/committed-measurement.mjs';
import { buildEvidenceEvaluationInputs } from '../../bin/lib/evidence-evaluation-inputs.mjs';
import { loadReleaseEvidenceBindings, productionBindingReceiptVerifier, resolveEvidenceShaForSubject } from '../../bin/lib/release-evidence.mjs';
import { UI_HARNESS_FILE, buildUiHarnessReceipt } from '../../bin/lib/ui-harness-receipt.mjs';

const ROOT = path.join(__dirname, '..', '..');
const CLI = path.join(ROOT, 'bin', 'certify-evidence.mjs');
const definitionRecord = JSON.parse(fs.readFileSync(path.join(ROOT, 'config', 'release-certification.v1.json'), 'utf8')) as { conditions: Array<{ id: string; check: string }> };
const evidenceRecord = JSON.parse(fs.readFileSync(path.join(ROOT, 'config', 'release-evidence.v1.json'), 'utf8')) as { bindings: Array<Record<string, unknown>> };
const CONDITIONS = definitionRecord.conditions;
const UI_CONDITION = 'ui-error-taxonomy-rendering';
/** The four conditions whose live check only the qualified host can run: a clean clone consumes the committed receipt. */
const HOST_BOUND_CHECKS: Record<string, string> = {
  'ci-block-record': 'exact-head-ci-authority',
  'dependency-advisory-lane': 'dependency-supply-chain-currency',
  'accessibility-certification': 'accessibility-certification',
  'yield-campaign-result': 'autonomous-yield-proof',
};

const environment = (root: string) => ({ PATH: process.env.PATH ?? '', HOME: root, GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_NOSYSTEM: '1', GIT_AUTHOR_NAME: 'nw', GIT_AUTHOR_EMAIL: 'nw@example.invalid', GIT_COMMITTER_NAME: 'nw', GIT_COMMITTER_EMAIL: 'nw@example.invalid' });

interface Proof {
  readonly root: string;
  readonly cloneRoot: string;
  readonly s: string;
  readonly d: string;
  git(args: string[], cwd?: string): string;
  evaluate(root: string, options?: { liveForHostBound?: 'MET' | 'UNMET'; certifiedCheckpoint?: string }): ReturnType<typeof evaluateReleaseCertification>;
  cleanup(): void;
}

function buildProof(): Proof {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'nw-reach-'));
  const git = (args: string[], cwd = root): string => {
    const result = spawnSync('git', args, { cwd, env: environment(root), encoding: 'utf8', shell: false });
    if (result.status !== 0) throw new Error(`git ${args.join(' ')} failed: ${result.stderr}`);
    return (result.stdout ?? '').trim();
  };
  git(['init', '--quiet', '-b', 'main']);
  fs.writeFileSync(path.join(root, '.gitignore'), 'artifacts/\n');
  fs.appendFileSync(path.join(root, '.git', 'info', 'exclude'), 'verdict.json\n');
  // The bindings file: the real bindings, with the sixteen condition bindings unbound at S.
  const bindings = evidenceRecord.bindings.map((binding) => (CONDITIONS.some((c) => c.id === binding.subject) ? { ...binding, evidenceSha: null, receiptDigest: null } : binding));
  fs.mkdirSync(path.join(root, 'config'), { recursive: true });
  fs.writeFileSync(path.join(root, 'config', 'release-evidence.v1.json'), `${JSON.stringify({ schemaVersion: 'nightwatch.release-evidence.v1', bindings }, null, 2)}\n`);
  // Every declared evidence artifact exists at S.
  for (const binding of bindings) {
    for (const artifact of (binding.artifactPaths as string[] | undefined) ?? []) {
      fs.mkdirSync(path.dirname(path.join(root, artifact)), { recursive: true });
      fs.writeFileSync(path.join(root, artifact), 'x\n');
    }
  }
  fs.mkdirSync(path.join(root, 'bin'), { recursive: true });
  fs.writeFileSync(path.join(root, 'bin', 'project-state-check.mjs'), "import fs from 'node:fs'; process.stdout.write(fs.readFileSync(new URL('../verdict.json', import.meta.url), 'utf8'));\n");
  git(['add', '--all']);
  git(['commit', '--quiet', '--no-gpg-sign', '-m', 'S: the certified checkpoint']);
  const s = git(['rev-parse', 'HEAD']);
  fs.writeFileSync(path.join(root, 'verdict.json'), JSON.stringify({ releaseVerdict: { certifiedCheckpointSha: s, conditions: CONDITIONS.map((c) => ({ id: c.id, check: c.check, checkState: 'MET' })) } }));
  const cli = (args: string[]) => spawnSync(process.execPath, [CLI, ...args, '--root', root], { cwd: ROOT, encoding: 'utf8', timeout: 120_000 });

  // 1. The producers (15 conditions through their live check; the UI receipt is a host receipt imported verbatim).
  for (const condition of CONDITIONS.filter((c) => c.id !== UI_CONDITION)) {
    const produced = cli(['produce', '--subject', condition.id]);
    if (produced.status !== 0) throw new Error(`produce ${condition.id} -> ${produced.status}: ${produced.stdout}${produced.stderr}`);
  }
  const harnessFile = { filepath: `/repo/ui/control-center/${UI_HARNESS_FILE}`, tasks: [{ type: 'suite', name: 'suite', tasks: [{ type: 'test', name: 'renders', result: { state: 'pass' } }] }] };
  const uiReceipt = buildUiHarnessReceipt({ files: [harnessFile], headSha: s, treeClean: true, typesSource: null, harnessSource: 'it(\'renders\')', executedAt: '2026-10-03T00:00:00.000Z' });
  fs.mkdirSync(path.join(root, 'artifacts', 'receipts'), { recursive: true });
  fs.writeFileSync(path.join(root, 'artifacts', 'receipts', 'ui-harness-receipt.v1.json'), `${JSON.stringify(uiReceipt, null, 2)}\n`);
  const imported = cli(['import', '--subject', UI_CONDITION]);
  if (imported.status !== 0) throw new Error(`import -> ${imported.status}: ${imported.stdout}${imported.stderr}`);
  const published = cli(['publish']);
  if (published.status !== 0) throw new Error(`publish -> ${published.status}: ${published.stdout}${published.stderr}`);

  // 2. `bind` rewrites only the value keys of the sixteen bindings; D commits the evidence and the rebind.
  const bound = cli(['bind']);
  if (bound.status !== 0) throw new Error(`bind -> ${bound.status}: ${bound.stdout}${bound.stderr}`);
  git(['add', '--all']);
  git(['commit', '--quiet', '--no-gpg-sign', '-m', 'D: the evidence, in a documentary descendant of S']);
  const d = git(['rev-parse', 'HEAD']);
  const cloneRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'nw-reach-clone-'));
  git(['clone', '--quiet', '--no-hardlinks', root, cloneRoot], os.tmpdir());

  const parsed = parseReleaseCertificationDefinition(definitionRecord);
  if (!parsed.ok || parsed.definition === null) throw new Error('the real release definition does not parse');
  const definition = parsed.definition;
  return {
    root,
    cloneRoot,
    s,
    d,
    git,
    evaluate: (target, options = {}) => {
      const live = options.liveForHostBound ?? 'MET';
      const bySubject = loadReleaseEvidenceBindings(target).bySubject;
      const inputs = buildEvidenceEvaluationInputs({ root: target, bySubject });
      const checkOutputs: Record<string, { state: string; detail: string }> = {};
      for (const condition of CONDITIONS) {
        const measured = { state: HOST_BOUND_CHECKS[condition.check] === undefined ? 'MET' : live, detail: 'stand-in live measurement' };
        const subject = HOST_BOUND_CHECKS[condition.check];
        checkOutputs[condition.check] = subject === undefined ? measured : consumeCommittedMeasurement(target, subject, options.certifiedCheckpoint ?? s, measured);
      }
      return evaluateReleaseCertification({
        definition: { ...definition, conditions: definition.conditions.map((c) => ({ ...c, evidenceSha: resolveEvidenceShaForSubject(target, c.id) })) },
        checkOutputs: checkOutputs as never,
        certifiedCheckpointSha: options.certifiedCheckpoint ?? s,
        liveHeadSha: d,
        projectCompletionStatus: 'OPERATIONALLY_ACCEPTED',
        laneCounts: { proven: 0, externallyBlocked: 0, neverAttempted: 0, staleEvidence: 0 },
        externalTrack: { id: 'production-path', stages: [], state: 'EXTERNAL_PREREQUISITE_UNMET', detail: 'out of scope of this proof' },
        resolveEvidenceArtifactAtSha: inputs.resolveEvidenceArtifactAtSha,
        evidenceArtifactPaths: inputs.evidenceArtifactPaths,
        evidenceReceiptDigests: inputs.evidenceReceiptDigests,
        evidenceCertifying: inputs.evidenceCertifying,
        verifyEvidenceReceipt: inputs.verifyEvidenceReceipt,
        resolveEvidenceRelation: (sha: string, checkpoint: string) => (sha === checkpoint ? 'EXACT' : 'STALE_ANCESTOR'),
      } as never);
    },
    cleanup: () => {
      fs.rmSync(root, { recursive: true, force: true });
      fs.rmSync(cloneRoot, { recursive: true, force: true });
    },
  };
}

test.describe('the certification reachability proof (real producers, classifier, verifier and evaluator)', () => {
  test.describe.configure({ mode: 'serial' });
  let proof: Proof;
  test.beforeAll(() => { proof = buildProof(); });
  test.afterAll(() => { proof.cleanup(); });

  test('the evidence commit is a DOCUMENTARY descendant of S (the real classifier judges every touched path)', () => {
    const files = proof.git(['diff', '--name-only', '--no-renames', `${proof.s}..${proof.d}`]).split('\n').filter(Boolean);
    expect(files).toContain('config/release-evidence.v1.json');
    expect(files.filter((file) => file.startsWith('evidence/certification/'))).toHaveLength(16);
    const violations = checkpointRoleViolations(proof.root, files, { kind: 'range', from: proof.s, to: proof.d, verifyBindingReceipt: productionBindingReceiptVerifier(proof.root) });
    expect(violations).toEqual([]);
  });

  test('from a CLEAN CLONE (no artifacts directory) the evaluator reaches 16/16 MET with every condition at EXACT evidence', () => {
    expect(fs.existsSync(path.join(proof.cloneRoot, 'artifacts'))).toBe(false);
    const verdict = proof.evaluate(proof.cloneRoot, { liveForHostBound: 'UNMET' });
    expect(verdict.conditions.map((c) => `${c.id}:${c.state}`)).toEqual(CONDITIONS.map((c) => `${c.id}:MET`));
    expect(verdict.conditionsMet).toBe(16);
    expect(verdict.certificationRefused).toBe(false);
    expect(verdict.conditions.every((c) => c.evidenceRelation === 'EXACT')).toBe(true);
  });

  test('the host (artifacts present, live checks MET) and the clean clone reach the same verdict', () => {
    const host = proof.evaluate(proof.root, { liveForHostBound: 'MET' });
    const clone = proof.evaluate(proof.cloneRoot, { liveForHostBound: 'UNMET' });
    expect(host.conditions.map((c) => [c.id, c.state, c.evidenceRelation])).toEqual(clone.conditions.map((c) => [c.id, c.state, c.evidenceRelation]));
    expect(host.conditionsMet).toBe(16);
  });

  test('removing, tampering with, or mis-binding ONE receipt removes exactly that condition (and the host-bound four are not consumed from nothing)', () => {
    const only = (verdict: ReturnType<Proof['evaluate']>, id: string, state: string) => {
      expect(verdict.conditionsMet).toBe(15);
      expect(verdict.conditions.filter((c) => c.state !== 'MET').map((c) => `${c.id}:${c.state}`)).toEqual([`${id}:${state}`]);
    };
    const copy = (name: string) => {
      const target = fs.mkdtempSync(path.join(os.tmpdir(), `nw-reach-${name}-`));
      fs.rmSync(target, { recursive: true, force: true });
      proof.git(['clone', '--quiet', '--no-hardlinks', proof.root, target], os.tmpdir());
      return target;
    };
    const evidenceFile = (target: string, id: string) => path.join(target, 'evidence', 'certification', proof.s, `${id}.json`);
    const removed = copy('removed');
    const tampered = copy('tampered');
    const hostBound = copy('hostbound');
    const misbound = copy('misbound');
    try {
      fs.rmSync(evidenceFile(removed, 'completion-ledger-truth'));
      only(proof.evaluate(removed, { liveForHostBound: 'UNMET' }), 'completion-ledger-truth', 'EVIDENCE_RECEIPT_ABSENT');
      const body = JSON.parse(fs.readFileSync(evidenceFile(tampered, 'documentation-currency'), 'utf8')) as Record<string, unknown>;
      fs.writeFileSync(evidenceFile(tampered, 'documentation-currency'), JSON.stringify({ ...body, checkId: 'edited-after-emit' }));
      only(proof.evaluate(tampered, { liveForHostBound: 'UNMET' }), 'documentation-currency', 'EVIDENCE_RECEIPT_ABSENT');
      // A host-bound condition with NO committed receipt cannot be consumed: the live UNMET stands.
      fs.rmSync(evidenceFile(hostBound, 'autonomous-yield-proof'));
      only(proof.evaluate(hostBound, { liveForHostBound: 'UNMET' }), 'autonomous-yield-proof', 'UNMET');
      // The receipts of S do not certify another checkpoint.
      const verdict = proof.evaluate(misbound, { liveForHostBound: 'UNMET', certifiedCheckpoint: 'e'.repeat(40) });
      expect(verdict.conditionsMet).toBe(0);
    } finally {
      for (const target of [removed, tampered, hostBound, misbound]) fs.rmSync(target, { recursive: true, force: true });
    }
  });
});
