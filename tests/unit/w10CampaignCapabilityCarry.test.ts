// W10 — reproduction capability must survive the campaign boundary.
//
// The first W10 live campaign exposed this: 31 successful source-surface
// actions, 32 learned targets, and a persisted checkpoint reporting NO
// capability at all. The runtime learned the annotation correctly inside each
// investigation, but the campaign accumulator copied `knownTargets` and not
// the annotation beside it, so `campaignStateOf` emitted a state with no
// `reproductionSurface`. Every fresh investigation then rediscovered
// executability from zero — precisely the cross-investigation amnesia W10
// exists to remove.
//
// Deterministic and offline: an out-of-process fake reasoner over a synthetic
// investigation context. No network, no sibling access, no credentials.
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { REASONER_TURN_RESPONSE_VERSION } from '../../src/core/agentProtocol';
import { runLocalCliCampaign, loadLocalCampaignCheckpoint } from '../../src/core/agentRuntime/localCampaign';
import { sourceContentDigest } from '../../src/core/source/scanTypes';
import {
  LOCAL_INVESTIGATION_CONTEXT_VERSION,
  type LocalInvestigationContext,
} from '../../src/core/localInvestigation/types';
import type { ReproductionSurfaceEntry } from '../../src/core/reproductionSurface/contracts';

const NODE = process.execPath;
const V = REASONER_TURN_RESPONSE_VERSION;

let scratchDirs: string[] = [];

function scratchDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nw-w10-carry-'));
  scratchDirs.push(dir);
  return dir;
}

test.afterEach(() => {
  for (const dir of scratchDirs) fs.rmSync(dir, { recursive: true, force: true });
  scratchDirs = [];
});

const FILES: Record<string, string> = {
  'alpha.go': 'package alpha\n\nfunc Alpha(n int) int { return n - 1 }\n',
  'beta.go': 'package beta\n\nfunc Beta(n int) int { return n * 2 }\n',
};

const SURFACE: readonly ReproductionSurfaceEntry[] = Object.freeze([
  Object.freeze({
    sourcePath: 'alpha.go',
    readiness: 'EXECUTABLE_NOW' as const,
    executorClass: 'GO_VENDORED_PACKAGE_TEST' as const,
    refusal: null,
    targetId: 'surface:aaaaaaaaaaaaaaaaaaaaaaaa',
  }),
  Object.freeze({
    sourcePath: 'beta.go',
    readiness: 'NOT_EXECUTABLE' as const,
    executorClass: null,
    refusal: 'PACKAGE_TEST_FILES_ABSENT' as const,
    targetId: null,
  }),
]);

function makeContext(): LocalInvestigationContext {
  const entries = Object.entries(FILES).map(([filePath, text]) => ({
    path: filePath,
    repository: 'test-repo',
    relativePath: filePath,
    sourceSha: 'a'.repeat(40),
    language: 'GO' as const,
    byteCount: Buffer.byteLength(text, 'utf8'),
    contentDigest: sourceContentDigest(text),
  }));
  const blocked = (reason: string) =>
    ({ status: 'BLOCKED' as const, class: 'NOT_CONFIGURED' as const, reason });
  return {
    schemaVersion: LOCAL_INVESTIGATION_CONTEXT_VERSION,
    dataClass: 'SYNTHETIC_TEST',
    source: {
      providerId: 'test-source',
      async index() {
        return {
          status: 'AVAILABLE' as const,
          value: { entries, total: entries.length, truncated: false, surface: SURFACE },
        };
      },
      async read(target: string) {
        const text = FILES[target];
        const entry = entries.find((item) => item.path === target);
        if (text === undefined || entry === undefined) return blocked(`unknown test path: ${target}`);
        return { status: 'AVAILABLE' as const, value: { ...entry, text } };
      },
    },
    systemMap: { providerId: 'test-system-map', async load() { return blocked('none'); } },
    bugAtlas: { providerId: 'test-bug-atlas', async load() { return blocked('none'); } },
    systemAtlas: { providerId: 'test-system-atlas', async load() { return blocked('none'); } },
    evidence: { providerId: 'test-evidence', async get() { return blocked('none'); } },
    reproduction: { providerId: 'test-reproduction', async run() { return blocked('none'); } },
  };
}


/**
 * Investigation 0 enumerates the index and completes; investigation 1 pauses,
 * which persists a campaign checkpoint. The capability was learned in inv 0,
 * so a checkpoint written during inv 1 can only carry it if the campaign
 * accumulator folded it across the investigation boundary.
 */
function indexThenPauseScript(dir: string): string {
  const file = path.join(dir, 'reasoner.mjs');
  fs.writeFileSync(
    file,
    `let raw = '';
for await (const chunk of process.stdin) raw += chunk;
const req = JSON.parse(raw);
const inv = Number(String(req.campaignId).split(':inv:')[1]);
const turn = Number(String(req.turnId).split(':turn:')[1]);
const V = ${JSON.stringify(V)};
if (inv === 0 && turn === 1) {
  process.stdout.write(JSON.stringify({ schemaVersion: V, hypotheses: [], intents: [
    { kind: 'CALL_TOOL', toolId: 'INSPECT_SOURCE_SURFACE', arguments: {} },
  ] }));
} else if (inv === 0) {
  process.stdout.write(JSON.stringify({ schemaVersion: V, hypotheses: [], intents: [
    { kind: 'TERMINATE', reason: 'COMPLETE_NO_FINDING' },
  ] }));
} else {
  process.stdout.write(JSON.stringify({ schemaVersion: V, hypotheses: [], intents: [{ kind: 'PAUSE' }] }));
}
`,
    'utf8',
  );
  return file;
}

test('capability learned in one investigation survives into the campaign checkpoint', async () => {
  const dir = scratchDir();
  const result = await runLocalCliCampaign({
    campaignId: 'camp-w10-capability-carry',
    ceilingName: 'HOUR_1',
    executable: NODE,
    args: [indexThenPauseScript(dir)],
    provider: 'test-provider',
    model: 'fake-1',
    maxTurns: 3,
    stateDirectory: dir,
    investigationContext: makeContext(),
  });

  // Investigation 0 completed and investigation 1 paused, so the checkpoint is
  // written strictly after the boundary the capability has to cross.
  expect(result.terminationReason).toBe('PAUSED');
  expect(result.investigationsCompleted).toBe(1);

  const checkpoint = loadLocalCampaignCheckpoint('camp-w10-capability-carry', dir);
  const surface = checkpoint.state.reproductionSurface ?? [];

  // Before the fix this array was empty: the annotation died with the
  // investigation that learned it.
  expect(surface.length).toBe(SURFACE.length);

  const executable = surface.filter((entry) => entry.readiness === 'EXECUTABLE_NOW');
  expect(executable.map((entry) => entry.sourcePath)).toEqual(['alpha.go']);
  expect(executable[0]?.executorClass).toBe('GO_VENDORED_PACKAGE_TEST');

  const refused = surface.filter((entry) => entry.readiness === 'NOT_EXECUTABLE');
  expect(refused.map((entry) => entry.refusal)).toEqual(['PACKAGE_TEST_FILES_ABSENT']);

  // Targets and capability describe the same universe.
  expect([...checkpoint.state.knownTargets].sort()).toEqual(['alpha.go', 'beta.go']);
});

test('a campaign that learns no capability omits the field entirely', async () => {
  const dir = scratchDir();
  const context = makeContext();
  const bare: LocalInvestigationContext = {
    ...context,
    source: {
      ...context.source,
      async index() {
        const resolved = await context.source.index();
        if (!('value' in resolved)) return resolved;
        const { surface: _omitted, ...rest } = resolved.value;
        return { status: 'AVAILABLE' as const, value: rest };
      },
    },
  };
  await runLocalCliCampaign({
    campaignId: 'camp-w10-capability-absent',
    ceilingName: 'HOUR_1',
    executable: NODE,
    args: [indexThenPauseScript(dir)],
    provider: 'test-provider',
    model: 'fake-1',
    maxTurns: 3,
    stateDirectory: dir,
    investigationContext: bare,
  });

  const checkpoint = loadLocalCampaignCheckpoint('camp-w10-capability-absent', dir);
  // Absent, not an empty array: a pre-W10 checkpoint must stay byte-identical.
  expect('reproductionSurface' in checkpoint.state).toBe(false);
  expect([...checkpoint.state.knownTargets].sort()).toEqual(['alpha.go', 'beta.go']);
});
