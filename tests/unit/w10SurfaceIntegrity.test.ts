// W10 surface-integrity lane — index preservation beyond the probe ceiling and
// fail-closed readiness-tuple enforcement.
//
// Hermetic: temp-directory checkouts cover the real owner-local source index;
// hand-built entries cover normalization; a stub reasoner/driver covers the
// checkpoint parser. No sibling checkout, network, or model is touched.
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createOwnerLocalInvestigationContext } from '../../src/core/localInvestigation/ownerLocal';
import { createRealSourceScanConfig } from '../../src/core/source/scan';
import { normalizeToolMemoryFacts } from '../../src/core/agentRuntime/types';
import {
  surfaceTargetId,
  type ReproductionSurfaceEntry,
} from '../../src/core/reproductionSurface/contracts';
import { AgentRuntime, parseCheckpoint } from '../../src/core/agentRuntime';
import {
  defaultAgentBudgetPolicy,
  REASONER_TURN_RESPONSE_VERSION,
  type AgentBudgetPolicy,
  type ReasonerCallResult,
  type ReasonerProvenance,
  type ReasonerTurnRequest,
} from '../../src/core/agentProtocol';
import type { AgentRuntimeDeps, AgentToolCall, AgentToolExecutor } from '../../src/core/agentRuntime';

const tempRoots: string[] = [];
test.afterEach(() => {
  for (const root of tempRoots.splice(0)) fs.rmSync(root, { recursive: true, force: true });
});

function makeTempRoot(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'nw-surface-integrity-'));
  tempRoots.push(root);
  return root;
}

function initFakeRepo(root: string, repoId: string, files: Readonly<Record<string, string>>): void {
  const repoRoot = path.join(root, ...repoId.split('/'));
  fs.mkdirSync(path.join(repoRoot, '.git', 'refs', 'heads'), { recursive: true });
  fs.writeFileSync(path.join(repoRoot, '.git', 'HEAD'), 'ref: refs/heads/main\n');
  fs.writeFileSync(path.join(repoRoot, '.git', 'refs', 'heads', 'main'), `${'b'.repeat(40)}\n`);
  for (const [relative, text] of Object.entries(files)) {
    const file = path.join(repoRoot, ...relative.split('/'));
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, text);
  }
}

function scanConfigFor(repoIds: readonly string[]) {
  return createRealSourceScanConfig({
    approvedRepositories: repoIds.map((repoId) => ({
      repoId,
      expectedSourceSha: null,
      allowlistedRoots: ['src'],
      allowedExtensions: ['.ts'],
      maxFiles: 500,
      maxFileBytes: 200000,
      maxTotalBytes: 8000000,
    })),
    runtimeMappingNamespace: 'test.local',
  });
}

function seedUniverse(root: string): { readonly repoIds: readonly string[]; readonly expectedPaths: readonly string[] } {
  const repoIds = ['testorg/repo-a', 'testorg/repo-b'] as const;
  const expectedPaths: string[] = [];
  for (const repoId of repoIds) {
    const files: Record<string, string> = {};
    for (let index = 0; index < 150; index += 1) {
      const relative = `src/file-${String(index).padStart(3, '0')}.ts`;
      files[relative] = `export const v${String(index)} = ${String(index)};\n`;
      expectedPaths.push(`${repoId}:${relative}`);
    }
    initFakeRepo(root, repoId, files);
  }
  return { repoIds: [...repoIds], expectedPaths };
}

function assertCoherentTuple(entry: ReproductionSurfaceEntry): void {
  if (entry.readiness === 'EXECUTABLE_NOW') {
    expect(entry.executorClass).not.toBeNull();
    expect(entry.refusal).toBeNull();
    expect(entry.targetId).toMatch(/^surface:sha256:[0-9a-f]{24}$/);
  } else if (entry.readiness === 'NOT_EXECUTABLE') {
    expect(entry.executorClass).toBeNull();
    expect(entry.refusal).not.toBeNull();
    expect(entry.targetId).toBeNull();
  } else {
    expect(entry.readiness).toBe('UNKNOWN');
    expect(entry.executorClass).toBeNull();
    expect(entry.refusal).toBeNull();
    expect(entry.targetId).toBeNull();
  }
}

test.describe('W10 index preserves the full eligible set beyond the probe ceiling', () => {
  test('a 300-entry universe with limit 400 returns all 300 with UNKNOWN for unprobed entries', async () => {
    const root = makeTempRoot();
    const { repoIds, expectedPaths } = seedUniverse(root);
    const config = scanConfigFor(repoIds);
    const context = createOwnerLocalInvestigationContext({
      siblingRoot: root,
      scanConfig: config,
      sourceIndexLimit: 400,
    });
    const index = await context.source.index();
    expect(index.status).toBe('AVAILABLE');
    if (index.status !== 'AVAILABLE') return;
    // The regression returned 256 (the probe ceiling) here instead of 300.
    expect(index.value.entries).toHaveLength(300);
    expect(index.value.total).toBe(300);
    expect(index.value.truncated).toBe(false);
    expect(index.value.surface).toHaveLength(300);
    const surface = index.value.surface ?? [];
    expect(new Set(index.value.entries.map((entry) => entry.path))).toEqual(new Set(expectedPaths));
    for (let position = 0; position < index.value.entries.length; position += 1) {
      expect(surface[position]?.sourcePath).toBe(index.value.entries[position]?.path);
      assertCoherentTuple(surface[position]!);
    }
    // At most 256 entries could have been classified; the rest must be
    // visible as UNKNOWN rather than omitted.
    const unknown = surface.filter((entry) => entry.readiness === 'UNKNOWN');
    expect(unknown.length).toBeGreaterThanOrEqual(300 - 256);
    for (const entry of unknown) {
      expect(entry.executorClass).toBeNull();
      expect(entry.refusal).toBeNull();
      expect(entry.targetId).toBeNull();
    }
    // Diversity survives: both repositories stay represented.
    expect(new Set(index.value.entries.map((entry) => entry.repository))).toEqual(new Set(repoIds));
    // Deterministic: a fresh context over the same root yields the same order.
    const again = createOwnerLocalInvestigationContext({ siblingRoot: root, scanConfig: config, sourceIndexLimit: 400 });
    const second = await again.source.index();
    expect(second.status).toBe('AVAILABLE');
    if (second.status !== 'AVAILABLE') return;
    expect(second.value.entries.map((entry) => entry.path)).toEqual(index.value.entries.map((entry) => entry.path));
    expect(JSON.stringify(second.value.surface)).toBe(JSON.stringify(surface));
  });

  test('a caller limit below the universe still bounds the window with honest truncation', async () => {
    const root = makeTempRoot();
    const { repoIds } = seedUniverse(root);
    const config = scanConfigFor(repoIds);
    const context = createOwnerLocalInvestigationContext({
      siblingRoot: root,
      scanConfig: config,
      sourceIndexLimit: 200,
    });
    const index = await context.source.index();
    expect(index.status).toBe('AVAILABLE');
    if (index.status !== 'AVAILABLE') return;
    expect(index.value.entries).toHaveLength(200);
    expect(index.value.total).toBe(300);
    expect(index.value.truncated).toBe(true);
    expect(index.value.surface).toHaveLength(200);
    const surface = index.value.surface ?? [];
    for (let position = 0; position < index.value.entries.length; position += 1) {
      expect(surface[position]?.sourcePath).toBe(index.value.entries[position]?.path);
      assertCoherentTuple(surface[position]!);
    }
  });
});

test.describe('W10 fail-closed surface tuple', () => {
  const EXECUTOR = 'GO_VENDORED_PACKAGE_TEST' as const;
  const DIGEST = surfaceTargetId('testorg/repo-a', 'src', 'src');
  const base = (sourcePath: string): ReproductionSurfaceEntry => ({
    sourcePath,
    readiness: 'UNKNOWN',
    executorClass: null,
    refusal: null,
    targetId: null,
  });
  const validExecutable: ReproductionSurfaceEntry = {
    ...base('testorg/repo-a:src/exec.ts'),
    readiness: 'EXECUTABLE_NOW',
    executorClass: EXECUTOR,
    targetId: DIGEST,
  };
  const validNotExecutable: ReproductionSurfaceEntry = {
    ...base('testorg/repo-a:src/legacy.ts'),
    readiness: 'NOT_EXECUTABLE',
    refusal: 'VENDOR_DIRECTORY_ABSENT',
  };
  const validUnknown = base('testorg/repo-a:src/mystery.ts');

  test('valid tuples survive normalization', () => {
    const facts = normalizeToolMemoryFacts({ reproductionSurface: [validExecutable, validNotExecutable, validUnknown] });
    expect(facts?.reproductionSurface).toHaveLength(3);
    expect(facts?.reproductionSurface?.[0]).toEqual(validExecutable);
  });

  test('every incoherent tuple is dropped before memory use', () => {
    const cases: ReadonlyArray<readonly [string, unknown]> = [
      ['EXECUTABLE_NOW with null executor', { ...validExecutable, sourcePath: 't:src/e1.ts', executorClass: null }],
      ['EXECUTABLE_NOW with non-null refusal', { ...validExecutable, sourcePath: 't:src/e2.ts', refusal: 'VENDOR_DIRECTORY_ABSENT' }],
      ['EXECUTABLE_NOW with null targetId', { ...validExecutable, sourcePath: 't:src/e3.ts', targetId: null }],
      ['EXECUTABLE_NOW with malformed targetId', { ...validExecutable, sourcePath: 't:src/e4.ts', targetId: 'not-a-digest' }],
      ['EXECUTABLE_NOW with empty targetId', { ...validExecutable, sourcePath: 't:src/e5.ts', targetId: '' }],
      ['EXECUTABLE_NOW with oversize targetId', { ...validExecutable, sourcePath: 't:src/e6.ts', targetId: 'x'.repeat(201) }],
      ['EXECUTABLE_NOW with secret-shaped targetId', { ...validExecutable, sourcePath: 't:src/e7.ts', targetId: 'Bearer faketoken1234567890abcdef' }],
      ['EXECUTABLE_NOW with numeric targetId', { ...validExecutable, sourcePath: 't:src/e8.ts', targetId: 42 }],
      ['EXECUTABLE_NOW with object targetId', { ...validExecutable, sourcePath: 't:src/e9.ts', targetId: {} }],
      ['EXECUTABLE_NOW with invalid executor', { ...validExecutable, sourcePath: 't:src/e10.ts', executorClass: 'NOPE' }],
      ['NOT_EXECUTABLE with non-null executor', { ...validNotExecutable, sourcePath: 't:src/n1.ts', executorClass: EXECUTOR }],
      ['NOT_EXECUTABLE with non-null targetId', { ...validNotExecutable, sourcePath: 't:src/n2.ts', targetId: DIGEST }],
      ['NOT_EXECUTABLE with coerced numeric targetId', { ...validNotExecutable, sourcePath: 't:src/n3.ts', targetId: 42 }],
      ['NOT_EXECUTABLE with null refusal', { ...validNotExecutable, sourcePath: 't:src/n4.ts', refusal: null }],
      ['NOT_EXECUTABLE with invalid refusal', { ...validNotExecutable, sourcePath: 't:src/n5.ts', refusal: 'NOPE' }],
      ['UNKNOWN with non-null executor', { ...validUnknown, sourcePath: 't:src/u1.ts', executorClass: EXECUTOR }],
      ['UNKNOWN with non-null refusal', { ...validUnknown, sourcePath: 't:src/u2.ts', refusal: 'VENDOR_DIRECTORY_ABSENT' }],
      ['UNKNOWN with non-null targetId', { ...validUnknown, sourcePath: 't:src/u3.ts', targetId: DIGEST }],
      ['invalid readiness', { ...validUnknown, sourcePath: 't:src/u4.ts', readiness: 'SOMETIMES' }],
    ];
    for (const [name, bad] of cases) {
      expect(normalizeToolMemoryFacts({ reproductionSurface: [bad] }), name).toBeUndefined();
    }
    // A valid entry beside an incoherent one keeps only the valid entry.
    const mixed = normalizeToolMemoryFacts({
      reproductionSurface: [{ ...validExecutable, sourcePath: 't:src/mixed-bad.ts', targetId: null }, validUnknown],
    });
    expect(mixed?.reproductionSurface).toEqual([validUnknown]);
  });

  test('malformed surface tuples fail checkpoint parsing', async () => {
    const provenance: ReasonerProvenance = { transport: 'CLI', executableBasename: 'stub', provider: 'stub', model: 'stub-1' };
    const okTurn = (intents: unknown[]): ReasonerCallResult => ({
      ok: true,
      response: { schemaVersion: REASONER_TURN_RESPONSE_VERSION, intents, hypotheses: [] } as never,
      provenance,
      stdoutBytes: 64,
      stderrBytes: 0,
    });
    const driver: AgentRuntimeDeps['reasoner'] = {
      protocolVersion: 'nightwatch.reasoner-driver.v1',
      transport: 'CLI',
      provenance,
      async complete(_request: ReasonerTurnRequest): Promise<ReasonerCallResult> {
        return okTurn([{ kind: 'PAUSE' }]);
      },
    };
    const tools: AgentToolExecutor = {
      async execute(_call: AgentToolCall) {
        return { ok: true, resultClass: 'OBSERVATION', evidenceRefs: [], outputBytes: 8, untrusted: [] };
      },
    };
    const policy: AgentBudgetPolicy = {
      ...defaultAgentBudgetPolicy('HOUR_1'),
      wallTimeMs: 600_000,
      reasonerCalls: 10,
      inputBytes: 10_000_000,
      outputBytes: 10_000_000,
      toolActions: 10,
      candidateCap: 5,
      retries: 5,
      consecutiveFailures: 5,
      providerFailures: 5,
    };
    const runtime = new AgentRuntime({ campaignId: 'campaign-surface-integrity', budgetPolicy: policy, reasoner: driver, tools });
    const result = await runtime.run({ maxTurns: 2 });
    expect(result.terminationReason).toBe('PAUSED');
    const good = result.checkpoint;
    expect(good).not.toBeNull();
    if (good === null) return;
    expect(() =>
      parseCheckpoint({ ...good, state: { ...good.state, reproductionSurface: [validExecutable, validNotExecutable, validUnknown] } }),
    ).not.toThrow();
    const badEntries: unknown[] = [
      { ...validExecutable, targetId: null },
      { ...validExecutable, refusal: 'VENDOR_DIRECTORY_ABSENT' },
      { ...validExecutable, targetId: 'not-a-digest' },
      { ...validExecutable, targetId: 42 },
      { ...validNotExecutable, refusal: null },
      { ...validNotExecutable, targetId: DIGEST },
      { ...validNotExecutable, executorClass: EXECUTOR },
      { ...validUnknown, refusal: 'VENDOR_DIRECTORY_ABSENT' },
      { ...validUnknown, executorClass: EXECUTOR },
      { ...validUnknown, targetId: DIGEST },
    ];
    for (const bad of badEntries) {
      expect(() => parseCheckpoint({ ...good, state: { ...good.state, reproductionSurface: [bad] } })).toThrow(
        /AGENT_CHECKPOINT_CORRUPT/,
      );
    }
  });
});
