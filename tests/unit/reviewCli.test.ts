// ---------------------------------------------------------------------------
// The owner-local review operations CLI.
//
// Two things are being proved. First, the shell contract: stable exit codes,
// bounded rows, machine-readable output, and a refusal to invent a flag it
// does not have. Second, and more important, that the command has no way to
// change the store — enforced by spawning it against a real store and
// comparing the directory byte for byte afterwards, and by asserting that no
// destructive verb exists in its argument grammar at all.
//
// Stale history exits 0. A store full of stale generations is the store
// working as designed, and an exit code that called it a failure would train
// an operator to ignore the one that means corruption.
// ---------------------------------------------------------------------------

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { test, expect } from '@playwright/test';
import {
  REVIEW_CLI_EXIT,
  inventoryExitCode,
  inventoryStatusToken,
  parseReviewCliArgs,
  renderHistoryText,
  renderInventoryText,
} from '../../bin/lib/review-cli.mjs';
import { ReviewStore } from '../../src/core/reviewStore';
import { reviewBindingFor } from '../../src/controlCenter/authorities/reviewBinding';
import { reviewerCorpus, type CorpusFinding } from '../helpers/reviewerCorpus';

const CLI = path.join(__dirname, '..', '..', 'bin', 'nightwatch-review.mjs');

function tempDir(prefix: string): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  fs.chmodSync(root, 0o700);
  return root;
}

interface Run {
  readonly status: number;
  readonly stdout: string;
  readonly stderr: string;
}

/**
 * Run the CLI against injected owner-local roots.
 *
 * The findings root is injected too and left empty, so the command sees an
 * empty findings snapshot and cannot reach the operator's real one.
 */
function runCli(args: readonly string[], reviewStoreDir: string, findingsDir: string): Run {
  const result = spawnSync(process.execPath, [CLI, ...args], {
    encoding: 'utf8',
    timeout: 120_000,
    env: {
      ...process.env,
      NIGHTWATCH_REVIEW_STORE_DIR: reviewStoreDir,
      NIGHTWATCH_PRIVATE_STATE_DIR: findingsDir,
    },
  });
  return { status: result.status ?? -1, stdout: result.stdout ?? '', stderr: result.stderr ?? '' };
}

function directorySnapshot(root: string): string {
  if (!fs.existsSync(root)) return 'ABSENT';
  return JSON.stringify(
    fs.readdirSync(root).sort().map((name) => {
      const stat = fs.lstatSync(path.join(root, name));
      return { name, size: stat.size, mode: stat.mode, mtimeMs: stat.mtimeMs, ino: stat.ino };
    })
  );
}

function seedStore(root: string, dossiers: readonly CorpusFinding[]): void {
  const writer = new ReviewStore({ root });
  for (const [index, dossier] of dossiers.entries()) {
    writer.putDecision({
      binding: reviewBindingFor(dossier, { campaignId: 'campaign/c1' }),
      decision: 'ACCEPT_EVIDENCE',
      reviewedAt: `2026-09-05T10:00:${String(index % 60).padStart(2, '0')}Z`,
      storedAt: `2026-09-05T10:00:${String(index % 60).padStart(2, '0')}Z`,
      rationale: 'local triage',
    });
  }
}

test.describe('argument grammar', () => {
  test('the four read commands are the whole vocabulary', () => {
    for (const command of ['inventory', 'help']) {
      expect(parseReviewCliArgs([command]).command).toBe(command);
    }
    for (const command of ['history', 'inspect', 'filing']) {
      expect(parseReviewCliArgs([command, 'finding/1']).command).toBe(command);
    }
    // No destructive verb exists to be typed.
    for (const verb of ['prune', 'delete', 'clean', 'repair', 'archive', 'retain', 'gc', 'compact']) {
      expect(() => parseReviewCliArgs([verb]), verb).toThrow(/REVIEW_CLI_USAGE/);
    }
  });

  test('an unknown flag is refused rather than ignored', () => {
    for (const flag of ['--prune', '--force', '--delete-stale', '--repair', '--yes']) {
      expect(() => parseReviewCliArgs(['inventory', flag]), flag).toThrow(/REVIEW_CLI_USAGE/);
    }
  });

  test('bounds are enforced at parse time', () => {
    expect(parseReviewCliArgs(['inventory']).limit).toBe(50);
    expect(parseReviewCliArgs(['inventory', '--limit=200']).limit).toBe(200);
    for (const bad of ['--limit=0', '--limit=201', '--limit=-1', '--limit=abc', '--offset=-1']) {
      expect(() => parseReviewCliArgs(['inventory', bad]), bad).toThrow(/REVIEW_CLI_USAGE/);
    }
  });

  test('a finding-scoped command requires exactly one finding', () => {
    expect(() => parseReviewCliArgs(['history'])).toThrow(/REVIEW_CLI_USAGE/);
    expect(() => parseReviewCliArgs(['history', 'a', 'b'])).toThrow(/REVIEW_CLI_USAGE/);
    expect(() => parseReviewCliArgs(['inventory', 'finding/1'])).toThrow(/REVIEW_CLI_USAGE/);
  });
});

test.describe('status tokens and exit codes', () => {
  test('every health classification maps to a token and a code', () => {
    const rows: readonly [string, string, number][] = [
      ['STORE_UNAVAILABLE', 'REVIEW_STORE_NOT_CONFIGURED', REVIEW_CLI_EXIT.STORE_UNAVAILABLE],
      ['CORRUPTION_PRESENT', 'REVIEW_STORE_HAS_CORRUPTION', REVIEW_CLI_EXIT.CORRUPTION_PRESENT],
      ['UNKNOWN_FILES_PRESENT', 'REVIEW_STORE_HAS_UNKNOWN_ENTRIES', REVIEW_CLI_EXIT.OK],
      ['TEMPORARY_RESIDUE_PRESENT', 'REVIEW_STORE_HAS_TEMPORARY_RESIDUE', REVIEW_CLI_EXIT.OK],
      ['STALE_HISTORY_PRESENT', 'REVIEW_STORE_HAS_STALE', REVIEW_CLI_EXIT.OK],
      ['HEALTHY', 'REVIEW_STORE_HEALTHY', REVIEW_CLI_EXIT.OK],
    ];
    for (const [classification, token, code] of rows) {
      expect(inventoryStatusToken(classification), classification).toBe(token);
      expect(inventoryExitCode(classification), classification).toBe(code);
    }
  });

  test('stale history is not a failure exit', () => {
    // Deliberate. Stale generations are the store preserving evidence, and an
    // exit code that called that a failure would train an operator to ignore
    // the code that means corruption.
    expect(inventoryExitCode('STALE_HISTORY_PRESENT')).toBe(0);
    expect(inventoryExitCode('CORRUPTION_PRESENT')).not.toBe(0);
  });
});

test.describe('the command cannot change the store', () => {
  test('every command leaves the store byte-identical', () => {
    const reviewDir = tempDir('nw-cli-store-');
    const findingsDir = tempDir('nw-cli-findings-');
    seedStore(reviewDir, reviewerCorpus(4));
    fs.writeFileSync(path.join(reviewDir, 'stranger-CUSTOMER_SENTINEL.json'), '{"x":1}', { mode: 0o600 });
    fs.writeFileSync(path.join(reviewDir, `.nightwatch-99-${'a'.repeat(32)}.tmp`), 'partial', { mode: 0o600 });
    const before = directorySnapshot(reviewDir);
    for (const args of [
      ['inventory'],
      ['inventory', '--json'],
      ['inventory', '--shallow'],
      ['history', 'corpus-finding-000000'],
      ['inspect', 'corpus-finding-000000'],
      ['filing', 'corpus-finding-000000'],
    ]) {
      runCli(args, reviewDir, findingsDir);
    }
    expect(directorySnapshot(reviewDir)).toBe(before);
  });

  test('an unknown store entry survives every command and is never named', () => {
    const reviewDir = tempDir('nw-cli-store-');
    const findingsDir = tempDir('nw-cli-findings-');
    seedStore(reviewDir, reviewerCorpus(2));
    const stranger = 'customer-CUSTOMER_SENTINEL-invoice.json';
    fs.writeFileSync(path.join(reviewDir, stranger), '{"secret":"CUSTOMER_SENTINEL"}', { mode: 0o600 });
    const run = runCli(['inventory', '--json'], reviewDir, findingsDir);
    expect(run.status).toBe(REVIEW_CLI_EXIT.OK);
    expect(fs.existsSync(path.join(reviewDir, stranger))).toBe(true);
    expect(run.stdout).not.toContain('CUSTOMER_SENTINEL');
    expect(run.stdout).not.toContain('invoice');
    expect(run.stdout).toContain('"kind": "UNKNOWN"');
    const text = runCli(['inventory'], reviewDir, findingsDir);
    expect(text.stdout).not.toContain('CUSTOMER_SENTINEL');
    expect(text.stdout).toContain('never opened, never named, never removed');
  });
});

test.describe('output', () => {
  test('an absent store reports NOT_CONFIGURED and exits 2', () => {
    const reviewDir = path.join(tempDir('nw-cli-'), 'never-created');
    const findingsDir = tempDir('nw-cli-findings-');
    const run = runCli(['inventory'], reviewDir, findingsDir);
    expect(run.status).toBe(REVIEW_CLI_EXIT.STORE_UNAVAILABLE);
    expect(run.stdout).toContain('STATUS REVIEW_STORE_NOT_CONFIGURED');
  });

  test('a healthy seeded store reports HEALTHY and exits 0', () => {
    const reviewDir = tempDir('nw-cli-store-');
    const findingsDir = tempDir('nw-cli-findings-');
    seedStore(reviewDir, reviewerCorpus(5));
    const run = runCli(['inventory'], reviewDir, findingsDir);
    expect(run.status).toBe(REVIEW_CLI_EXIT.OK);
    expect(run.stdout).toContain('STATUS REVIEW_STORE_HEALTHY');
    expect(run.stdout).toContain('canonical reviews 5');
    // No findings snapshot is available, so currentness is not claimed.
    expect(run.stdout).toContain('currentness       NOT RESOLVED');
    expect(run.stdout).toContain('Retention is an owner decision.');
  });

  test('corruption is reported truthfully and exits 3', () => {
    const reviewDir = tempDir('nw-cli-store-');
    const findingsDir = tempDir('nw-cli-findings-');
    seedStore(reviewDir, reviewerCorpus(3));
    const name = fs.readdirSync(reviewDir).find((candidate) => candidate.startsWith('review.')) as string;
    fs.writeFileSync(path.join(reviewDir, name), '{"truncated":', { mode: 0o600 });
    const run = runCli(['inventory'], reviewDir, findingsDir);
    expect(run.status).toBe(REVIEW_CLI_EXIT.CORRUPTION_PRESENT);
    expect(run.stdout).toContain('STATUS REVIEW_STORE_HAS_CORRUPTION');
    expect(run.stdout).toContain('corruption (1 total');
    // The corrupt file is still there.
    expect(fs.existsSync(path.join(reviewDir, name))).toBe(true);
  });

  test('a finding outside the current snapshot exits NOT_FOUND without a body', () => {
    const reviewDir = tempDir('nw-cli-store-');
    const findingsDir = tempDir('nw-cli-findings-');
    seedStore(reviewDir, reviewerCorpus(2));
    for (const command of ['history', 'inspect', 'filing']) {
      const run = runCli([command, 'corpus-finding-000000'], reviewDir, findingsDir);
      expect(run.status, command).toBe(REVIEW_CLI_EXIT.NOT_FOUND);
      expect(run.stderr, command).toContain('REVIEW_FINDING_NOT_IN_CURRENT_SNAPSHOT');
      expect(run.stdout, command).toBe('');
    }
  });

  test('--json emits parseable output with a status token', () => {
    const reviewDir = tempDir('nw-cli-store-');
    const findingsDir = tempDir('nw-cli-findings-');
    seedStore(reviewDir, reviewerCorpus(3));
    const run = runCli(['inventory', '--json'], reviewDir, findingsDir);
    const parsed = JSON.parse(run.stdout) as { status: string; inventory: { counts: { canonicalArtifacts: number } } };
    expect(parsed.status).toBe('REVIEW_STORE_HEALTHY');
    expect(parsed.inventory.counts.canonicalArtifacts).toBe(3);
  });

  test('rows are bounded while counts stay global', () => {
    const reviewDir = tempDir('nw-cli-store-');
    const findingsDir = tempDir('nw-cli-findings-');
    seedStore(reviewDir, reviewerCorpus(30));
    const run = runCli(['inventory', '--json', '--limit=5'], reviewDir, findingsDir);
    const parsed = JSON.parse(run.stdout) as {
      inventory: { counts: { uniqueFindings: number }; findings: unknown[]; findingsPage: { total: number; truncated: boolean } };
    };
    expect(parsed.inventory.counts.uniqueFindings).toBe(30);
    expect(parsed.inventory.findings).toHaveLength(5);
    expect(parsed.inventory.findingsPage).toMatchObject({ total: 30, truncated: true });
  });

  test('--shallow opens nothing and says so', () => {
    const reviewDir = tempDir('nw-cli-store-');
    const findingsDir = tempDir('nw-cli-findings-');
    seedStore(reviewDir, reviewerCorpus(3));
    const run = runCli(['inventory', '--shallow', '--json'], reviewDir, findingsDir);
    const parsed = JSON.parse(run.stdout) as { inventory: { depth: string; counts: { canonicalArtifacts: number; validArtifacts: number } } };
    expect(parsed.inventory.depth).toBe('SHALLOW');
    expect(parsed.inventory.counts.canonicalArtifacts).toBe(3);
    expect(parsed.inventory.counts.validArtifacts).toBe(0);
  });

  test('a bad invocation prints usage and exits 1', () => {
    const reviewDir = tempDir('nw-cli-store-');
    const findingsDir = tempDir('nw-cli-findings-');
    const run = runCli(['--prune'], reviewDir, findingsDir);
    expect(run.status).toBe(REVIEW_CLI_EXIT.USAGE);
    expect(run.stderr).toContain('This command is READ-ONLY');
  });
});

test.describe('renderers', () => {
  test('the inventory renderer states the retention position and never guesses currentness', () => {
    const rendered = renderInventoryText({
      schemaVersion: 'nightwatch.review-store-inventory.v1',
      exists: true,
      depth: 'DEEP',
      currentnessResolved: false,
      counts: {
        entries: 1,
        canonicalArtifacts: 1,
        validArtifacts: 1,
        corruptArtifacts: 0,
        unreadableArtifacts: 0,
        temporaryArtifacts: 0,
        unknownEntries: 0,
        nonFileEntries: 0,
        uniqueFindings: 1,
        generations: 1,
        findingsWithMultipleGenerations: 0,
        byCurrentness: { CURRENT: 0, STALE: 0, UNKNOWN: 1 },
        byDecision: { ACCEPT_EVIDENCE: 1 },
        byResultingState: { REVIEWED: 1 },
      },
      bytes: { total: 10, canonical: 10, temporary: 0, unknown: 0, nonFile: 0 },
      health: { conditions: ['HEALTHY'], classification: 'HEALTHY' },
      oldestStoredAt: '2026-09-05T10:00:00Z',
      newestStoredAt: '2026-09-05T10:00:00Z',
      oldestReviewedAt: '2026-09-05T10:00:00Z',
      newestReviewedAt: '2026-09-05T10:00:00Z',
      corruption: [],
      corruptionPage: { offset: 0, limit: 50, total: 0, truncated: false },
      unknownEntries: [],
      unknownEntriesPage: { offset: 0, limit: 50, total: 0, truncated: false },
      temporaries: [],
      temporariesPage: { offset: 0, limit: 50, total: 0, truncated: false },
      findings: [],
      findingsPage: { offset: 0, limit: 50, total: 0, truncated: false },
      inventoryDigest: 'aaaaaaaaaaaaaaaaaaaaaaaa',
      organizationalAuthority: 'NONE_LOCAL_REVIEW_ONLY',
    } as never);
    expect(rendered).toContain('currentness       NOT RESOLVED');
    expect(rendered).toContain('This store is never pruned automatically. Retention is an owner decision.');
  });

  test('the history renderer labels the current generation and disclaims authority', () => {
    const rendered = renderHistoryText({
      schemaVersion: 'nightwatch.review-store-history.v1',
      findingId: 'finding/1',
      state: 'CURRENT',
      generations: [
        {
          reviewIdentity: 'a'.repeat(24),
          findingId: 'finding/1',
          sourceSha: 'synthetic.no-source-evidence',
          campaignId: 'campaign/c1',
          dossierDigest: 'b'.repeat(24),
          findingDigest: 'c'.repeat(24),
          reviewedAt: '2026-09-05T10:00:00Z',
          storedAt: '2026-09-05T10:00:00Z',
          decision: 'ACCEPT_EVIDENCE',
          resultingState: 'REVIEWED',
          currentness: 'CURRENT',
          staleReason: null,
          expectationId: null,
          semanticContractId: null,
          identityAbsenceReason: 'REVIEW_BINDING_CARRIES_NO_SEMANTIC_IDENTITY',
          organizationalAuthority: 'NONE_LOCAL_REVIEW_ONLY',
        },
      ],
      page: { offset: 0, limit: 50, total: 1, truncated: false },
      currentGeneration: 'a'.repeat(24),
      staleGenerationCount: 0,
      corruption: [],
      decisionChangedAcrossGenerations: false,
      currentArtifactIdentity: { expectationId: null, semanticContractId: null },
      organizationalAuthority: 'NONE_LOCAL_REVIEW_ONLY',
    } as never);
    expect(rendered).toContain('* CURRENT');
    expect(rendered).not.toContain('  HISTORICAL');
    expect(rendered).toContain('A local review is not a Leslie verdict, a Pondr approval, or organizational sign-off.');
  });
});
