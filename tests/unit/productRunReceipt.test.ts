// M5 task 6.13 (C-26/C-28) — the minimal product run receipt.
import { test, expect } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  buildProductRunReceipt,
  emitProductRunReceipt,
  observeSiblings,
  scanForLeaks,
  validateProductRunReceipt,
} from '../../src/core/agentRuntime/productRunReceipt';
import { attributeProviderFailures } from '../../src/core/agentRuntime/providerAttribution';

let roots: string[] = [];
test.afterEach(() => {
  for (const root of roots) fs.rmSync(root, { recursive: true, force: true });
  roots = [];
});

function scratch(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'nw-product-receipt-'));
  roots.push(root);
  return root;
}

function git(repoRoot: string, args: string[]): string {
  return execFileSync('git', ['-C', repoRoot, ...args], { encoding: 'utf8' }).trim();
}

function makeRepo(siblingRoot: string, repository: string): string {
  const repoRoot = path.join(siblingRoot, ...repository.split('/'));
  fs.mkdirSync(repoRoot, { recursive: true });
  git(repoRoot, ['init', '--quiet', '-b', 'main']);
  git(repoRoot, ['config', 'user.email', 'synthetic@example.invalid']);
  git(repoRoot, ['config', 'user.name', 'Synthetic Fixture']);
  fs.writeFileSync(path.join(repoRoot, 'seed.txt'), 'seed\n');
  git(repoRoot, ['add', '--all']);
  git(repoRoot, ['commit', '--quiet', '--no-gpg-sign', '-m', 'synthetic base']);
  return repoRoot;
}

const REPOSITORY = 'example/ledger';

function attribution(failures: number, calls: number) {
  return attributeProviderFailures({
    actionLog: Array.from({ length: failures }, () => ({ intentKind: 'REASONER_CALL', resultClass: 'REASONER_NONZERO_EXIT' })),
    reasonerCalls: calls,
    providerFailures: failures,
  });
}

function runResult(failures: number, calls: number) {
  return {
    terminationReason: 'NO_PROGRESS',
    providerAttribution: attribution(failures, calls),
    persistedFindings: [{ dossierId: 'afr:sha256:aaaaaaaaaaaaaaaaaaaaaaaa' }],
    reproductionCount: 1,
    toolActionCount: 4,
  };
}

test.describe('product run receipt (6.13)', () => {
  test('the leak scan counts findings and never echoes a value', () => {
    const clean = scanForLeaks(JSON.stringify({ note: 'ordinary campaign result text' }));
    expect(clean.result).toBe('CLEAN');
    expect(clean.findings).toBe(0);
    const leaked = scanForLeaks('token=Bearer abcdefghijklmnopqrstuvwxyz012345');
    expect(leaked.result).toBe('LEAKS_FOUND');
    expect(leaked.findings).toBeGreaterThan(0);
    expect(JSON.stringify(leaked)).not.toContain('abcdefghijklmnop');
  });

  test('sibling identity observes HEAD, porcelain and diff digests and detects movement', async () => {
    const root = scratch();
    const siblingRoot = path.join(root, 'repos');
    const repoRoot = makeRepo(siblingRoot, REPOSITORY);

    const before = await observeSiblings([REPOSITORY], siblingRoot);
    expect(before).toHaveLength(1);
    expect(before[0]?.headSha).toBe(git(repoRoot, ['rev-parse', 'HEAD']));
    // A clean tree has an EMPTY diff, which digests to a stable value rather
    // than to null, so "no movement" is comparable across runs.
    expect(before[0]?.diffDigest).toMatch(/^sibdiff:sha256:[0-9a-f]{24}$/);
    const cleanDiffDigest = before[0]?.diffDigest;

    // A tracked modification moves BOTH the porcelain and the diff digest.
    fs.writeFileSync(path.join(repoRoot, 'seed.txt'), 'changed\n');
    const after = await observeSiblings([REPOSITORY], siblingRoot);
    expect(after[0]?.statusDigest).not.toBe(before[0]?.statusDigest);
    expect(after[0]?.diffDigest).not.toBe(cleanDiffDigest);

    const receipt = buildProductRunReceipt({
      campaignId: 'camp-receipt',
      generatedAt: new Date().toISOString(),
      result: runResult(0, 2),
      before,
      after,
      leakScan: { result: 'CLEAN', findings: 0, scannedChars: 10 },
    });
    expect(receipt.siblingIdentityChanged).toBe(true);
    expect(receipt.terminationClass).toBe('VALID_PROVIDER_RUN');
    expect(receipt.persistedAdmissionIds).toEqual(['afr:sha256:aaaaaaaaaaaaaaaaaaaaaaaa']);
    expect(validateProductRunReceipt(receipt).ok).toBe(true);

    // An unchanged observation set reports no movement.
    const stable = buildProductRunReceipt({
      campaignId: 'camp-receipt',
      generatedAt: new Date().toISOString(),
      result: runResult(0, 2),
      before: after,
      after,
      leakScan: { result: 'CLEAN', findings: 0, scannedChars: 10 },
    });
    expect(stable.siblingIdentityChanged).toBe(false);

    // Tampering is refused.
    expect(validateProductRunReceipt({ ...receipt, siblingsAfter: [] }).ok).toBe(false);
    expect(validateProductRunReceipt({ ...receipt, leakScan: { result: 'MAYBE', findings: 0 } }).ok).toBe(false);
    expect(validateProductRunReceipt({ ...receipt, terminationClass: 'PROVIDER_OK' }).ok).toBe(false);
  });

  test('emitting writes the D-7 run identity and the receipt beside it', async () => {
    const root = scratch();
    const siblingRoot = path.join(root, 'repos');
    makeRepo(siblingRoot, REPOSITORY);
    const before = await observeSiblings([REPOSITORY], siblingRoot);

    const emitted = await emitProductRunReceipt({
      root,
      campaignId: 'camp-receipt-emit',
      result: runResult(1, 2),
      repositoryIds: [REPOSITORY],
      siblingRoot,
      before,
      now: () => new Date('2026-09-27T00:00:00.000Z'),
    });

    // The G12 probe's shape: artifacts/nightwatch-*/manifest.json with a
    // 40-hex nightwatchSha and summary.json with a boolean passed + counts.
    expect(fs.existsSync(emitted.manifestFile)).toBe(true);
    expect(fs.existsSync(emitted.summaryFile)).toBe(true);
    expect(fs.existsSync(emitted.receiptFile)).toBe(true);
    const manifest = JSON.parse(fs.readFileSync(emitted.manifestFile, 'utf8')) as Record<string, unknown>;
    const summary = JSON.parse(fs.readFileSync(emitted.summaryFile, 'utf8')) as Record<string, unknown>;
    expect(manifest['runId']).toBe(emitted.runId);
    expect(typeof summary['passed']).toBe('boolean');
    expect(typeof summary['counts']).toBe('object');
    // A degraded provider run is not certified as passed.
    expect(summary['passed']).toBe(true);

    const persisted = JSON.parse(fs.readFileSync(emitted.receiptFile, 'utf8')) as Record<string, unknown>;
    expect(validateProductRunReceipt(persisted).ok).toBe(true);
    expect(persisted['siblingIdentityChanged']).toBe(false);
    expect((persisted['providerHealth'] as Record<string, unknown>)['failures']).toBe(1);
  });
});
