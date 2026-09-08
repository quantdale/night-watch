// ---------------------------------------------------------------------------
// W7 context lane — provider-backed tool session plus owner-local adapters.
//
// Hermetic: stub providers cover session semantics; temp-directory checkouts
// cover the real owner-local adapters (source scan, snapshot load, miner
// absence). No sibling checkout, network, or model is touched.
// ---------------------------------------------------------------------------

import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { UNTRUSTED_BYTE_CAP } from '../../src/core/agentProtocol/untrusted';
import type { AgentToolCall, AgentToolResult } from '../../src/core/agentRuntime/types';
import type { AgentToolId } from '../../src/core/agentProtocol/tools';
import { bugAtlasFixtureCorpus } from '../../src/core/bugAtlas/fixtures';
import { saveBugAtlasSnapshot } from '../../src/core/bugAtlas/snapshot';
import { createBugAtlasStore } from '../../src/core/bugAtlas/store';
import type {
  DeterministicReproductionProvider,
  LocalInvestigationContext,
  LocalProviderResult,
  LocalReproductionProviderResult,
  LocalSourceIndexEntry,
} from '../../src/core/localInvestigation/types';
import {
  LOCAL_INVESTIGATION_CONTEXT_VERSION,
  LOCAL_INVESTIGATION_HISTORY_VERSION,
} from '../../src/core/localInvestigation/types';
import {
  CURRENT_FAILURE_EVIDENCE_SCHEMA_VERSION,
  deriveCurrentFailureEvidence,
} from '../../src/core/localInvestigation/currentFailureEvidence';
import { createLocalInvestigationToolSession } from '../../src/core/localInvestigation/session';
import {
  createOwnerLocalInvestigationContext,
  createUnavailableLocalInvestigationContext,
  type OwnerLocalEvidenceInput,
} from '../../src/core/localInvestigation/ownerLocal';
import { createRealSourceScanConfig } from '../../src/core/source/scan';
import { OWNER_LOCAL_REPRODUCTION_PROVIDER_ID } from '../../src/core/ownerLocalReproduction/provider';
import { sourceContentDigest } from '../../src/core/source/scanTypes';
import { createSystemAtlasOverlay } from '../../src/core/systemAtlas/overlay';
import { createSystemAtlasRecord } from '../../src/core/systemAtlas/model';
import type { SystemMapInput } from '../../src/core/systemMap/projections';

const SOURCE_TEXT = `export function total(items: number[]): number {
  return items.reduce((sum, item) => sum + item, 0);
}
`;
const SOURCE_SHA = 'a'.repeat(40);
const SOURCE_PATH = 'testorg/testrepo:src/total.ts';

function sourceEntry(): LocalSourceIndexEntry {
  return {
    path: SOURCE_PATH,
    repository: 'testorg/testrepo',
    relativePath: 'src/total.ts',
    sourceSha: SOURCE_SHA,
    language: 'TYPESCRIPT',
    byteCount: Buffer.byteLength(SOURCE_TEXT, 'utf8'),
    contentDigest: sourceContentDigest(SOURCE_TEXT),
  };
}

function call(toolId: AgentToolId, args: Record<string, unknown> = {}): AgentToolCall {
  return { campaignId: 'test-campaign', turnId: 'turn-1', toolId, arguments: args, argumentDigest: 'test-digest' };
}

/** Reasoner-visible payload: the executor surfaces data only via sanitized envelopes. */
function envelopeJson<T>(result: AgentToolResult): T {
  return JSON.parse(result.untrusted[0]?.bytes ?? '') as T;
}

function systemMapInput(): SystemMapInput {
  return {
    operations: [
      {
        operationId: 'op-get-total',
        repoId: 'testorg/testrepo',
        sourceSha: SOURCE_SHA,
        method: 'GET',
        routeTemplate: '/total',
        factCategory: 'SOURCE_FACT',
        readOnlyClassification: 'READ_ONLY_PROVEN',
        routeProof: 'PROVEN',
        protoServiceIdentity: null,
        blockingStage: null,
        blockingReason: null,
      },
    ],
    serviceBindings: [],
    consumerEdges: [],
    findings: [],
    operationPopulationTotal: 1,
    productOfRepository: { 'testorg/testrepo': 'test-product' },
  };
}

interface StubKnobs {
  readonly sourceBlocked?: boolean;
  readonly tamperedText?: string | null;
  readonly systemMapBlocked?: boolean;
  readonly bugAtlasBlocked?: boolean;
  readonly systemAtlasBlocked?: boolean;
  readonly evidenceRecords?: Readonly<Record<string, OwnerLocalEvidenceInput>>;
  readonly reproduction?: DeterministicReproductionProvider;
}

function stubContext(knobs: StubKnobs = {}): LocalInvestigationContext {
  const entry = sourceEntry();
  const texts: Record<string, string> = { [SOURCE_PATH]: knobs.tamperedText ?? SOURCE_TEXT };
  return {
    schemaVersion: LOCAL_INVESTIGATION_CONTEXT_VERSION,
    dataClass: 'REAL_LOCAL',
    source: {
      providerId: 'stub-source',
      async index() {
        if (knobs.sourceBlocked === true) {
          return { status: 'BLOCKED', class: 'SOURCE_UNAVAILABLE', reason: 'stub: no source' };
        }
        return { status: 'AVAILABLE', value: { entries: [entry], total: 1, truncated: false } };
      },
      async read(requestedPath: string) {
        if (knobs.sourceBlocked === true) {
          return { status: 'BLOCKED', class: 'SOURCE_UNAVAILABLE', reason: 'stub: no source' };
        }
        const text = texts[requestedPath];
        if (text === undefined) {
          return { status: 'BLOCKED', class: 'SOURCE_UNAVAILABLE', reason: 'stub: unknown path' };
        }
        // Digest stays honest unless the tamper knob rewrote the bytes.
        return { status: 'AVAILABLE', value: { ...entry, path: requestedPath, text } };
      },
    },
    systemMap: {
      providerId: 'stub-system-map',
      async load() {
        if (knobs.systemMapBlocked === true) {
          return { status: 'BLOCKED', class: 'SOURCE_UNAVAILABLE', reason: 'stub: no map' };
        }
        return { status: 'AVAILABLE', value: systemMapInput() };
      },
    },
    bugAtlas: {
      providerId: 'stub-bug-atlas',
      async load() {
        if (knobs.bugAtlasBlocked === true) {
          return { status: 'BLOCKED', class: 'DATA_BLOCKED', reason: 'stub: no history' };
        }
        return { status: 'AVAILABLE', value: createBugAtlasStore(bugAtlasFixtureCorpus().slice(0, 2)) };
      },
    },
    systemAtlas: {
      providerId: 'stub-system-atlas',
      async load() {
        if (knobs.systemAtlasBlocked === true) {
          return { status: 'BLOCKED', class: 'NOT_CONFIGURED', reason: 'stub: no overlay' };
        }
        return {
          status: 'AVAILABLE',
          value: createSystemAtlasOverlay([
            createSystemAtlasRecord({
              conceptId: 'test.billing',
              kind: 'BUSINESS_ENTITY',
              label: 'Billing (stub record)',
              provenance: {
                category: 'DOCUMENTED_FACT',
                repository: null,
                sourceSha: null,
                locator: 'localInvestigationProviders.test.ts#test.billing',
                confidence: 'MEDIUM',
              },
            }),
          ]),
        };
      },
    },
    evidence: {
      providerId: 'stub-evidence',
      async get(evidenceRef: string) {
        const records: Readonly<Record<string, OwnerLocalEvidenceInput>> = knobs.evidenceRecords ?? {
          'ev:known': { source: 'LOG', record: { status: 200, note: 'clean observation' } },
          'ev:secret': { source: 'LOG', record: { auth: 'Bearer stub-secret-token-value-12345', status: 200 } },
        };
        const found = records[evidenceRef];
        if (found === undefined) {
          return { status: 'BLOCKED', class: 'DATA_BLOCKED', reason: 'stub: unknown ref' };
        }
        return { status: 'AVAILABLE', value: { evidenceRef, source: found.source, record: found.record } };
      },
    },
    reproduction: knobs.reproduction ?? {
      providerId: 'stub-reproduction-absent',
      async run() {
        return { status: 'BLOCKED', class: 'NOT_CONFIGURED', reason: 'stub: no executor' };
      },
    },
  };
}

function stubReproduction(overrides: Partial<LocalReproductionProviderResult> = {}): DeterministicReproductionProvider & { readonly calls: readonly unknown[] } {
  const calls: unknown[] = [];
  return {
    providerId: 'stub-reproduction',
    calls,
    async run(request): Promise<LocalProviderResult<LocalReproductionProviderResult>> {
      calls.push(request);
      return {
        status: 'AVAILABLE',
        value: {
          verdict: 'REPRODUCED',
          reasonerVisible: { template: 'REPRODUCTION_OBSERVED', reproductionId: request.reproductionId },
          evidenceRef: 'ev:stub-repro-1',
          provenanceRefs: [request.sourceEvidenceRef],
          preFix: 'FAIL',
          postFix: 'PASS',
          audit: { marker: 'AUDIT_MARKER_STUB_SECRET', stderr: 'hidden bytes' },
          ...overrides,
        },
      };
    },
  };
}

const tempRoots: string[] = [];
test.afterEach(() => {
  while (tempRoots.length > 0) {
    const root = tempRoots.pop();
    if (typeof root === 'string') fs.rmSync(root, { recursive: true, force: true });
  }
});

function makeTempRoot(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'nw-ctx-'));
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

function fakeScanConfig() {
  return createRealSourceScanConfig({
    approvedRepositories: [
      {
        repoId: 'testorg/testrepo',
        expectedSourceSha: null,
        allowlistedRoots: ['src'],
        allowedExtensions: ['.ts'],
        maxFiles: 100,
        maxFileBytes: 200000,
        maxTotalBytes: 2000000,
      },
    ],
    runtimeMappingNamespace: 'test.local',
  });
}

test.describe('session over stub providers', () => {
  test('exposes one executor and an empty harness-only history', () => {
    const session = createLocalInvestigationToolSession(stubContext());
    expect(typeof session.executor.execute).toBe('function');
    expect(session.snapshot()).toEqual({
      schemaVersion: LOCAL_INVESTIGATION_HISTORY_VERSION,
      observedEvidence: [],
      inspectedSources: [],
      reproductions: [],
      findingProposals: [],
    });
  });

  test('empty source arguments produce a bounded index', async () => {
    const session = createLocalInvestigationToolSession(stubContext());
    const result = await session.executor.execute(call('INSPECT_SOURCE_SURFACE', {}));
    expect(result.ok).toBe(true);
    expect(result.resultClass).toBe('SOURCE_INDEX');
    expect(result.evidenceRefs).toHaveLength(1);
    expect(result.untrusted).toHaveLength(1);
    expect(session.snapshot().observedEvidence).toHaveLength(1);
    expect(session.snapshot().inspectedSources).toEqual([]);
  });

  test('selected reads are exact, digest-verified, and bounded', async () => {
    const session = createLocalInvestigationToolSession(stubContext());
    const result = await session.executor.execute(call('INSPECT_SOURCE_SURFACE', { path: SOURCE_PATH }));
    expect(result.ok).toBe(true);
    expect(result.resultClass).toBe('SOURCE_FILE');
    const data = envelopeJson<{ text: string; tokenCount: number; kindHistogram: Record<string, number>; contentDigest: string }>(result);
    expect(data.text).toBe(SOURCE_TEXT);
    expect(data.contentDigest).toBe(sourceContentDigest(SOURCE_TEXT));
    expect(data.tokenCount).toBeGreaterThan(0);
    expect(data.kindHistogram['IDENTIFIER']).toBeGreaterThan(0);
    const inspected = session.snapshot().inspectedSources;
    expect(inspected).toHaveLength(1);
    expect(inspected[0]?.path).toBe(SOURCE_PATH);
  });

  test('oversized reads stay bounded in reasoner envelopes', async () => {
    const big = `export const big = '${'x'.repeat(20_000)}';\n`;
    const bigEntry: LocalSourceIndexEntry = {
      ...sourceEntry(),
      path: 'testorg/testrepo:src/big.ts',
      relativePath: 'src/big.ts',
      byteCount: Buffer.byteLength(big, 'utf8'),
      contentDigest: sourceContentDigest(big),
    };
    const context = stubContext();
    const sized: LocalInvestigationContext = {
      ...context,
      source: {
        providerId: 'stub-source-big',
        async index() {
          return { status: 'AVAILABLE', value: { entries: [bigEntry], total: 1, truncated: false } };
        },
        async read() {
          return { status: 'AVAILABLE', value: { ...bigEntry, text: big } };
        },
      },
    };
    const session = createLocalInvestigationToolSession(sized);
    const result = await session.executor.execute(call('INSPECT_SOURCE_SURFACE', { path: bigEntry.path }));
    expect(result.ok).toBe(true);
    expect(result.outputBytes).toBeGreaterThan(UNTRUSTED_BYTE_CAP);
    expect(result.untrusted[0]?.bytes.length).toBeLessThanOrEqual(UNTRUSTED_BYTE_CAP);
    expect(session.snapshot().inspectedSources[0]?.path).toBe(bigEntry.path);
  });

  test('unknown and malformed paths fail closed', async () => {
    const session = createLocalInvestigationToolSession(stubContext());
    const unknown = await session.executor.execute(call('INSPECT_SOURCE_SURFACE', { path: 'testorg/testrepo:src/missing.ts' }));
    expect(unknown.ok).toBe(false);
    expect(unknown.resultClass).toBe('ADAPTER_UNAVAILABLE');
    expect(unknown.evidenceRefs).toEqual([]);
    const empty = await session.executor.execute(call('INSPECT_SOURCE_SURFACE', { path: '' }));
    expect(empty.ok).toBe(false);
    expect(empty.resultClass).toBe('MALFORMED_ARGUMENTS');
    const traversal = await session.executor.execute(call('INSPECT_SOURCE_SURFACE', { path: '../outside.ts' }));
    expect(traversal.ok).toBe(false);
    expect(traversal.resultClass).toBe('ADAPTER_UNAVAILABLE');
    expect(session.snapshot().inspectedSources).toEqual([]);
  });

  test('tampered provider bytes fail closed on digest mismatch', async () => {
    const session = createLocalInvestigationToolSession(stubContext({ tamperedText: `${SOURCE_TEXT}// tampered\n` }));
    const result = await session.executor.execute(call('INSPECT_SOURCE_SURFACE', { path: SOURCE_PATH }));
    expect(result.ok).toBe(false);
    expect(result.resultClass).toBe('ADAPTER_UNAVAILABLE');
    expect(session.snapshot().inspectedSources).toEqual([]);
    expect(session.snapshot().observedEvidence).toEqual([]);
  });

  test('every BLOCKED provider is explicit ADAPTER_UNAVAILABLE, never synthetic', async () => {
    const session = createLocalInvestigationToolSession(stubContext({
      sourceBlocked: true,
      systemMapBlocked: true,
      bugAtlasBlocked: true,
      systemAtlasBlocked: true,
      evidenceRecords: {},
    }));
    const calls: Array<[AgentToolId, Record<string, unknown>]> = [
      ['INSPECT_SOURCE_SURFACE', {}],
      ['INSPECT_SOURCE_SURFACE', { path: SOURCE_PATH }],
      ['QUERY_SYSTEM_MAP', { query: 'COMPANY' }],
      ['QUERY_BUG_ATLAS', { terms: ['coupon'] }],
      ['REQUEST_RELATED_HISTORICAL_BUGS', { terms: ['coupon'] }],
      ['QUERY_SYSTEM_ATLAS', { terms: ['billing'] }],
      ['RETRIEVE_SANITIZED_EVIDENCE', { evidenceRef: 'ev:known' }],
      ['REQUEST_ROUTE_CONTRACT_PROOF', { operationId: 'op-get-total' }],
      ['ASK_DETERMINISTIC_ORACLE', { questionId: 'q:anything' }],
    ];
    for (const [toolId, args] of calls) {
      const result = await session.executor.execute(call(toolId, args));
      expect(result.ok).toBe(false);
      expect(result.resultClass).toBe('ADAPTER_UNAVAILABLE');
      expect(result.evidenceRefs).toEqual([]);
      expect(result.untrusted).toEqual([]);
      expect(JSON.stringify(result)).not.toContain('BUGATLAS-FIXTURE');
      expect(JSON.stringify(result)).not.toContain('synthetic.');
    }
    expect(session.snapshot().observedEvidence).toEqual([]);
  });

  test('system map queries use the real projections', async () => {
    const session = createLocalInvestigationToolSession(stubContext());
    const result = await session.executor.execute(call('QUERY_SYSTEM_MAP', { query: 'COMPANY' }));
    expect(result.ok).toBe(true);
    expect(result.resultClass).toBe('SYSTEM_MAP');
    const data = envelopeJson<{ nodes: Array<{ nodeId: string }> }>(result);
    expect(data.nodes.some((node) => node.nodeId === 'company:alphaus')).toBe(true);
    const bad = await session.executor.execute(call('QUERY_SYSTEM_MAP', { query: 'INVENT_TOPOLOGY' }));
    expect(bad.ok).toBe(false);
    expect(bad.resultClass).toBe('MALFORMED_ARGUMENTS');
  });

  test('bug atlas retrieves bounded real records and empty terms retrieve nothing', async () => {
    const session = createLocalInvestigationToolSession(stubContext());
    const empty = await session.executor.execute(call('QUERY_BUG_ATLAS', { terms: [] }));
    expect(empty.ok).toBe(true);
    expect(envelopeJson<{ records: unknown[] }>(empty).records).toEqual([]);
    const found = await session.executor.execute(call('QUERY_BUG_ATLAS', { terms: ['coupon'], limit: 500 }));
    expect(found.ok).toBe(true);
    const data = envelopeJson<{ records: Array<{ bugId: string; provenance: { category: string } }> }>(found);
    expect(data.records.length).toBeGreaterThan(0);
    expect(data.records.length).toBeLessThanOrEqual(8);
    expect(data.records[0]?.provenance.category).toBeTruthy();
    const related = await session.executor.execute(call('REQUEST_RELATED_HISTORICAL_BUGS', { terms: ['coupon'] }));
    expect(related.ok).toBe(true);
    expect(related.resultClass).toBe('BUG_ATLAS');
  });

  test('system atlas retrieves only configured records', async () => {
    const session = createLocalInvestigationToolSession(stubContext());
    const result = await session.executor.execute(call('QUERY_SYSTEM_ATLAS', { terms: ['billing'] }));
    expect(result.ok).toBe(true);
    expect(result.resultClass).toBe('SYSTEM_ATLAS');
    const data = envelopeJson<{ records: Array<{ conceptId: string }> }>(result);
    expect(data.records.some((record) => record.conceptId === 'test.billing')).toBe(true);
    expect(data.records.every((record) => !record.conceptId.startsWith('synthetic.'))).toBe(true);
  });

  test('evidence is re-sanitized before reasoner envelopes', async () => {
    const session = createLocalInvestigationToolSession(stubContext());
    const result = await session.executor.execute(call('RETRIEVE_SANITIZED_EVIDENCE', { evidenceRef: 'ev:secret' }));
    expect(result.ok).toBe(true);
    expect(result.resultClass).toBe('EVIDENCE');
    const bytes = result.untrusted[0]?.bytes ?? '';
    expect(bytes).not.toContain('stub-secret-token-value-12345');
    expect(bytes).toContain('[REDACTED]');
    const missing = await session.executor.execute(call('RETRIEVE_SANITIZED_EVIDENCE', { evidenceRef: 'ev:nope' }));
    expect(missing.ok).toBe(false);
    expect(missing.resultClass).toBe('ADAPTER_UNAVAILABLE');
  });

  test('evidence retrieves sanitized records observed in the current session', async () => {
    const session = createLocalInvestigationToolSession(stubContext({ evidenceRecords: {} }));
    const source = await session.executor.execute(
      call('INSPECT_SOURCE_SURFACE', { path: SOURCE_PATH }),
    );
    const sourceRef = source.evidenceRefs[0];
    expect(sourceRef).toBeDefined();
    const retrieved = await session.executor.execute(
      call('RETRIEVE_SANITIZED_EVIDENCE', { evidenceRef: sourceRef }),
    );
    expect(retrieved.ok).toBe(true);
    expect(retrieved.resultClass).toBe('EVIDENCE');
    expect(retrieved.untrusted[0]?.bytes).toContain('src/total.ts');
  });

  test('reproduction requires the inspected path plus its observed source evidence ref', async () => {
    const reproduction = stubReproduction();
    const session = createLocalInvestigationToolSession(stubContext({ reproduction }));
    const premature = await session.executor.execute(call('RERUN_SAFE_REPRODUCTION', {
      reproductionId: 'r1',
      sourcePath: SOURCE_PATH,
      sourceEvidenceRef: 'ev:forged',
      observedEvidenceRefs: [],
    }));
    expect(premature.ok).toBe(false);
    expect(premature.resultClass).toBe('UNSAFE_INTENT');
    expect(reproduction.calls).toHaveLength(0);
    const inspected = await session.executor.execute(call('INSPECT_SOURCE_SURFACE', { path: SOURCE_PATH }));
    expect(inspected.ok).toBe(true);
    const sourceRef = session.snapshot().inspectedSources[0]?.evidenceRef ?? '';
    expect(sourceRef.length).toBeGreaterThan(0);
    const mismatched = await session.executor.execute(call('RERUN_SAFE_REPRODUCTION', {
      reproductionId: 'r1',
      sourcePath: SOURCE_PATH,
      sourceEvidenceRef: 'ev:wrong',
      observedEvidenceRefs: [],
    }));
    expect(mismatched.ok).toBe(false);
    expect(mismatched.resultClass).toBe('UNSAFE_INTENT');
    expect(reproduction.calls).toHaveLength(0);
    const executed = await session.executor.execute(call('RERUN_SAFE_REPRODUCTION', {
      reproductionId: 'r1',
      candidateId: 'c1',
      sourcePath: SOURCE_PATH,
      sourceEvidenceRef: sourceRef,
      observedEvidenceRefs: [sourceRef],
    }));
    expect(executed.ok).toBe(true);
    expect(executed.resultClass).toBe('REPRODUCED');
    expect(executed.evidenceRefs).toEqual(['ev:stub-repro-1']);
    const receipts = session.snapshot().reproductions;
    expect(receipts).toHaveLength(1);
    expect(receipts[0]).toMatchObject({
      providerId: 'stub-reproduction',
      reproductionId: 'r1',
      candidateId: 'c1',
      sourcePath: SOURCE_PATH,
      sourceEvidenceRef: sourceRef,
      evidenceRef: 'ev:stub-repro-1',
      verdict: 'REPRODUCED',
      preFix: 'FAIL',
      postFix: 'PASS',
    });
  });

  test('reproduction audit bytes never reach tool envelopes or history', async () => {
    const reproduction = stubReproduction();
    const session = createLocalInvestigationToolSession(stubContext({ reproduction }));
    await session.executor.execute(call('INSPECT_SOURCE_SURFACE', { path: SOURCE_PATH }));
    const sourceRef = session.snapshot().inspectedSources[0]?.evidenceRef ?? '';
    const result = await session.executor.execute(call('RERUN_SAFE_REPRODUCTION', {
      reproductionId: 'r2',
      sourcePath: SOURCE_PATH,
      sourceEvidenceRef: sourceRef,
      observedEvidenceRefs: [],
    }));
    expect(result.ok).toBe(true);
    expect(JSON.stringify(result)).not.toContain('AUDIT_MARKER_STUB_SECRET');
    expect(JSON.stringify(session.snapshot())).not.toContain('AUDIT_MARKER_STUB_SECRET');
    expect(JSON.stringify(result.untrusted)).not.toContain('AUDIT_MARKER_STUB_SECRET');
  });

  test('unexecuted reproductions mint no evidence', async () => {
    const reproduction = stubReproduction({ verdict: 'NOT_REPRODUCED', evidenceRef: null });
    const session = createLocalInvestigationToolSession(stubContext({ reproduction }));
    await session.executor.execute(call('INSPECT_SOURCE_SURFACE', { path: SOURCE_PATH }));
    const sourceRef = session.snapshot().inspectedSources[0]?.evidenceRef ?? '';
    const result = await session.executor.execute(call('RERUN_SAFE_REPRODUCTION', {
      reproductionId: 'r3',
      sourcePath: SOURCE_PATH,
      sourceEvidenceRef: sourceRef,
      observedEvidenceRefs: [],
    }));
    expect(result.ok).toBe(true);
    expect(result.resultClass).toBe('NOT_REPRODUCED');
    expect(result.evidenceRefs).toEqual([]);
    expect(session.snapshot().reproductions).toHaveLength(1);
  });

  test('a qualifying current failure reaches the consumer with bounded evidence only', async () => {
    const failureEvidence = deriveCurrentFailureEvidence({
      stdout: '=== RUN   TestTotal\n--- FAIL: TestTotal (0.00s)\n    total_test.go:12: got 3 want 4\nFAIL\n',
      stderr: '',
      failureClass: 'TEST_ASSERTION_FAILURE',
      matchingFreshExecutions: 2,
      packagePath: 'src',
      groundedSourcePaths: ['testorg/testrepo:src/total_test.go'],
    });
    expect(failureEvidence).not.toBeNull();
    const reproduction = stubReproduction({
      verdict: 'REPRODUCED_CURRENT_FAILURE',
      reasonerVisible: {
        harness: 'nightwatch.owner-local-reproduction-observation.v1',
        outcome: 'REPRODUCED_CURRENT_FAILURE',
        package: 'src',
        executions: 2,
        failureClass: 'TEST_ASSERTION_FAILURE',
        failureEvidence,
      },
      evidenceRef: 'ev:stub-current-failure-1',
      provenanceRefs: ['testorg/testrepo:src/total.ts'],
      preFix: 'FAIL',
      postFix: 'NOT_RUN',
      currentSourceProof: null,
    });
    const session = createLocalInvestigationToolSession(stubContext({ reproduction }));
    await session.executor.execute(call('INSPECT_SOURCE_SURFACE', { path: SOURCE_PATH }));
    const sourceRef = session.snapshot().inspectedSources[0]?.evidenceRef ?? '';
    const result = await session.executor.execute(call('RERUN_SAFE_REPRODUCTION', {
      reproductionId: 'r-cfe-1',
      sourcePath: SOURCE_PATH,
      sourceEvidenceRef: sourceRef,
      observedEvidenceRefs: [],
    }));
    expect(result.ok).toBe(true);
    expect(result.resultClass).toBe('REPRODUCED_CURRENT_FAILURE');
    const envelope = envelopeJson<Record<string, unknown>>(result);
    expect(envelope).toHaveProperty('failureEvidence');
    const exposed = envelope['failureEvidence'] as Record<string, unknown>;
    expect(exposed['schemaVersion']).toBe(CURRENT_FAILURE_EVIDENCE_SCHEMA_VERSION);
    expect(exposed['schemaVersion']).toBe('nightwatch.current-failure-evidence.v1');
    expect(exposed['classification']).toBe('TEST_ASSERTION_FAILURE');
    expect(exposed['testName']).toBe('TestTotal');
    // The harness-only audit payload still never reaches the consumer.
    expect(JSON.stringify(result)).not.toContain('AUDIT_MARKER_STUB_SECRET');
    expect(JSON.stringify(session.snapshot())).not.toContain('AUDIT_MARKER_STUB_SECRET');
  });

  test('a non-qualifying session result omits the evidence key', async () => {
    const reproduction = stubReproduction({
      verdict: 'NOT_REPRODUCED',
      reasonerVisible: {
        harness: 'nightwatch.owner-local-reproduction-observation.v1',
        outcome: 'NOT_REPRODUCED',
        package: 'src',
        executions: 2,
        failureClass: null,
      },
      evidenceRef: null,
      preFix: 'PASS',
      postFix: 'NOT_RUN',
    });
    const session = createLocalInvestigationToolSession(stubContext({ reproduction }));
    await session.executor.execute(call('INSPECT_SOURCE_SURFACE', { path: SOURCE_PATH }));
    const sourceRef = session.snapshot().inspectedSources[0]?.evidenceRef ?? '';
    const result = await session.executor.execute(call('RERUN_SAFE_REPRODUCTION', {
      reproductionId: 'r-cfe-2',
      sourcePath: SOURCE_PATH,
      sourceEvidenceRef: sourceRef,
      observedEvidenceRefs: [],
    }));
    expect(result.ok).toBe(true);
    expect(result.resultClass).toBe('NOT_REPRODUCED');
    const envelope = envelopeJson<Record<string, unknown>>(result);
    expect('failureEvidence' in envelope).toBe(false);
  });

  test('finding proposals are captured with frozen authority and no new evidence', async () => {
    const session = createLocalInvestigationToolSession(stubContext());
    const result = await session.executor.execute(call('REQUEST_FINDING_PROPOSAL', {
      candidateId: 'c1',
      evidenceRefs: ['ev:known'],
    }));
    expect(result.ok).toBe(true);
    expect(result.resultClass).toBe('FINDING_PROPOSAL');
    expect(result.evidenceRefs).toEqual([]);
    const data = envelopeJson<{ status: string; authority: { humanReviewRequired: boolean; externalPublication: string } }>(result);
    expect(data.status).toBe('PROPOSAL_CAPTURED_NO_AUTHORITY');
    expect(data.authority.humanReviewRequired).toBe(true);
    expect(data.authority.externalPublication).toBe('PROHIBITED');
    expect(session.snapshot().findingProposals).toEqual([{ candidateId: 'c1', evidenceRefs: ['ev:known'], draft: null }]);
    const refused = await session.executor.execute(call('REQUEST_FINDING_PROPOSAL', { candidateId: 'c1', evidenceRefs: [] }));
    expect(refused.ok).toBe(false);
    expect(refused.resultClass).toBe('MALFORMED_ARGUMENTS');
    const presentationDraft = await session.executor.execute(call('REQUEST_FINDING_PROPOSAL', {
      candidateId: 'c1',
      evidenceRefs: ['ev:known'],
      draft: { title: 'Presentation suggestion only' },
    }));
    expect(presentationDraft.ok).toBe(true);
    expect(presentationDraft.resultClass).toBe('FINDING_PROPOSAL');
    expect(session.snapshot().findingProposals).toHaveLength(2);
  });

  test('draft proposals never build or self-certify a dossier', async () => {
    const session = createLocalInvestigationToolSession(stubContext());
    const result = await session.executor.execute(call('REQUEST_FINDING_PROPOSAL', {
      candidateId: 'c2',
      evidenceRefs: ['ev:known'],
      draft: {
        title: 'Total drifts by one cent',
        description: 'Observed rounding drift in the total pipeline.',
        recommendedSeverity: 'S3',
        severityConfidence: 'MEDIUM',
        severityRationale: 'Observed one-cent drift against the receipt fixture.',
        reproduction: 'Apply a percentage coupon to quantity two.',
        expected: 'Single rounding against the discounted subtotal.',
        actual: 'Double rounding drifts the total by one cent.',
        evidenceRefs: ['ev:known'],
        environment: 'LOCAL',
        confidence: 'MEDIUM',
        falsePositiveChecks: ['Re-ran without coupon: total exact.'],
        reproductionCount: 1,
        provenance: ['ev:known'],
      },
    }));
    expect(result.ok).toBe(true);
    const data = envelopeJson<{ status: string; authority: { humanReviewRequired: boolean; externalPublication: string } }>(result);
    expect(data.status).toBe('PROPOSAL_CAPTURED_NO_AUTHORITY');
    expect(data.authority.humanReviewRequired).toBe(true);
    expect(data.authority.externalPublication).toBe('PROHIBITED');
    expect(JSON.stringify(data)).not.toContain('reproductionCount');
    expect(JSON.stringify(data)).not.toContain('DOSSIER_BUILT');
    expect(session.snapshot().findingProposals).toHaveLength(1);
  });

  test('pure tools delegate and gates stay closed', async () => {
    const session = createLocalInvestigationToolSession(stubContext());
    const compared = await session.executor.execute(call('COMPARE_OBSERVATIONS', {
      browser: {
        failed: true,
        routeClass: '/total',
        structuralState: 'list',
        operationFamily: 'total',
        statusClass: '5xx',
        contentTypeClass: 'html',
        oracleFingerprint: 'fp:1',
        runtimeCategory: 'browser',
      },
      api: {
        available: true,
        failed: false,
        operationFamily: 'total',
        statusClass: '2xx',
        contentTypeClass: 'json',
        parseCategory: 'json-valid',
        oracleFingerprint: 'fp:2',
      },
    }));
    expect(compared.ok).toBe(true);
    expect(compared.resultClass).toBe('OBSERVATION_COMPARISON');
    expect(envelopeJson<{ status: string }>(compared).status).toBe('UI_FAILURE_API_PASS');
    const proof = await session.executor.execute(call('REQUEST_ROUTE_CONTRACT_PROOF', { method: 'GET', routeTemplate: '/total' }));
    expect(proof.ok).toBe(true);
    expect(proof.resultClass).toBe('ROUTE_CONTRACT_PROOF');
    const oracle = await session.executor.execute(call('ASK_DETERMINISTIC_ORACLE', { questionId: 'q:x' }));
    expect(oracle.ok).toBe(false);
    expect(oracle.resultClass).toBe('ADAPTER_UNAVAILABLE');
    for (const toolId of ['REQUEST_BROWSER_OBSERVATION', 'REQUEST_API_OBSERVATION'] as const) {
      const dev = await session.executor.execute(call(toolId, {}));
      expect(dev.ok).toBe(false);
      expect(dev.resultClass).toBe('UNAUTHORIZED_ENVIRONMENT');
    }
    const rawUnknownToolId: string = 'HACK_THE_PLANET';
    const unknown = await session.executor.execute({
      campaignId: 'test-campaign',
      turnId: 'turn-1',
      toolId: rawUnknownToolId as AgentToolId,
      arguments: {},
      argumentDigest: 'test-digest',
    });
    expect(unknown.ok).toBe(false);
    expect(unknown.resultClass).toBe('UNKNOWN_TOOL');
  });
});

test.describe('unavailable context', () => {
  test('every provider is explicit NOT_CONFIGURED and the session fails tools closed', async () => {
    const context = createUnavailableLocalInvestigationContext();
    expect(context.schemaVersion).toBe(LOCAL_INVESTIGATION_CONTEXT_VERSION);
    expect(context.dataClass).toBe('REAL_LOCAL');
    for (const provider of [context.source, context.systemMap, context.bugAtlas, context.systemAtlas, context.evidence]) {
      let loaded: LocalProviderResult<unknown>;
      if ('index' in provider) loaded = await provider.index();
      else if ('get' in provider) loaded = await provider.get('ev:x');
      else loaded = await provider.load();
      expect(loaded.status).toBe('BLOCKED');
      if (loaded.status === 'BLOCKED') expect(loaded.class).toBe('NOT_CONFIGURED');
    }
    const reproduction = await context.reproduction.run({
      reproductionId: 'r',
      candidateId: null,
      sourcePath: 'x',
      sourceEvidenceRef: 'ev:x',
      observedEvidenceRefs: [],
    });
    expect(reproduction.status).toBe('BLOCKED');
    const session = createLocalInvestigationToolSession(context);
    const result = await session.executor.execute(call('INSPECT_SOURCE_SURFACE', {}));
    expect(result.ok).toBe(false);
    expect(result.resultClass).toBe('ADAPTER_UNAVAILABLE');
    const proposal = await session.executor.execute(call('REQUEST_FINDING_PROPOSAL', {
      candidateId: 'c1',
      evidenceRefs: ['ev:known'],
    }));
    expect(proposal.ok).toBe(true);
    expect(createUnavailableLocalInvestigationContext('SYNTHETIC_TEST').dataClass).toBe('SYNTHETIC_TEST');
  });
});

test.describe('owner-local adapters over temp checkouts', () => {
  test('real source index and read round-trip through the scan boundary', async () => {
    const root = makeTempRoot();
    initFakeRepo(root, 'testorg/testrepo', { 'src/a.ts': SOURCE_TEXT });
    const context = createOwnerLocalInvestigationContext({ siblingRoot: root, scanConfig: fakeScanConfig() });
    expect(context.schemaVersion).toBe(LOCAL_INVESTIGATION_CONTEXT_VERSION);
    const index = await context.source.index();
    expect(index.status).toBe('AVAILABLE');
    if (index.status !== 'AVAILABLE') return;
    expect(index.value.total).toBe(1);
    expect(index.value.truncated).toBe(false);
    const found = index.value.entries[0];
    expect(found?.path).toBe('testorg/testrepo:src/a.ts');
    expect(found?.language).toBe('TYPESCRIPT');
    const read = await context.source.read('testorg/testrepo:src/a.ts');
    expect(read.status).toBe('AVAILABLE');
    if (read.status !== 'AVAILABLE') return;
    expect(read.value.text).toBe(SOURCE_TEXT);
    expect(read.value.contentDigest).toBe(sourceContentDigest(SOURCE_TEXT));
    const session = createLocalInvestigationToolSession(context);
    const toolRead = await session.executor.execute(call('INSPECT_SOURCE_SURFACE', { path: 'testorg/testrepo:src/a.ts' }));
    expect(toolRead.ok).toBe(true);
    expect(toolRead.resultClass).toBe('SOURCE_FILE');
    expect(session.snapshot().inspectedSources[0]?.path).toBe('testorg/testrepo:src/a.ts');
  });

  test('absent checkouts fail closed without inventing sources or topology', async () => {
    const root = makeTempRoot();
    const context = createOwnerLocalInvestigationContext({ siblingRoot: root, scanConfig: fakeScanConfig() });
    const index = await context.source.index();
    expect(index.status).toBe('BLOCKED');
    const systemMap = await context.systemMap.load();
    expect(systemMap.status).toBe('BLOCKED');
    const session = createLocalInvestigationToolSession(context);
    expect((await session.executor.execute(call('INSPECT_SOURCE_SURFACE', {}))).resultClass).toBe('ADAPTER_UNAVAILABLE');
    expect((await session.executor.execute(call('QUERY_SYSTEM_MAP', { query: 'COMPANY' }))).resultClass).toBe('ADAPTER_UNAVAILABLE');
  });

  test('bug atlas prefers the owner-private snapshot and never fixtures', async () => {
    const root = makeTempRoot();
    initFakeRepo(root, 'testorg/testrepo', { 'src/a.ts': SOURCE_TEXT });
    const stateDir = path.join(makeTempRoot(), 'bug-atlas');
    saveBugAtlasSnapshot(bugAtlasFixtureCorpus().slice(0, 2), { stateDirectory: stateDir });
    const context = createOwnerLocalInvestigationContext({
      siblingRoot: root,
      scanConfig: fakeScanConfig(),
      bugAtlasStateDirectory: stateDir,
      bugAtlasRepositoriesRoot: root,
    });
    const loaded = await context.bugAtlas.load();
    expect(loaded.status).toBe('AVAILABLE');
    const session = createLocalInvestigationToolSession(context);
    const result = await session.executor.execute(call('QUERY_BUG_ATLAS', { terms: ['coupon'] }));
    expect(result.ok).toBe(true);
    const data = envelopeJson<{ records: Array<{ bugId: string }> }>(result);
    expect(data.records.some((record) => record.bugId === 'BUGATLAS-FIXTURE-001')).toBe(true);
  });

  test('bug atlas is DATA_BLOCKED when neither snapshot nor history exists', async () => {
    const root = makeTempRoot();
    const context = createOwnerLocalInvestigationContext({
      siblingRoot: root,
      scanConfig: fakeScanConfig(),
      bugAtlasStateDirectory: path.join(root, 'no-snapshot'),
      bugAtlasRepositoriesRoot: root,
    });
    const loaded = await context.bugAtlas.load();
    expect(loaded.status).toBe('BLOCKED');
    if (loaded.status === 'BLOCKED') expect(loaded.class).toBe('DATA_BLOCKED');
    const session = createLocalInvestigationToolSession(context);
    const result = await session.executor.execute(call('QUERY_BUG_ATLAS', { terms: ['coupon'] }));
    expect(result.ok).toBe(false);
    expect(result.resultClass).toBe('ADAPTER_UNAVAILABLE');
    expect(JSON.stringify(result)).not.toContain('BUGATLAS-FIXTURE');
  });

  test('system atlas loads only explicit real records', async () => {
    const root = makeTempRoot();
    const plain = createOwnerLocalInvestigationContext({ siblingRoot: root, scanConfig: fakeScanConfig() });
    const blocked = await plain.systemAtlas.load();
    expect(blocked.status).toBe('BLOCKED');
    if (blocked.status === 'BLOCKED') expect(blocked.class).toBe('NOT_CONFIGURED');
    const configured = createOwnerLocalInvestigationContext({
      siblingRoot: root,
      scanConfig: fakeScanConfig(),
      systemAtlasRecords: [
        createSystemAtlasRecord({
          conceptId: 'test.billing',
          kind: 'BUSINESS_ENTITY',
          label: 'Billing (real record)',
          provenance: {
            category: 'DOCUMENTED_FACT',
            repository: null,
            sourceSha: null,
            locator: 'localInvestigationProviders.test.ts#test.billing',
            confidence: 'MEDIUM',
          },
        }),
      ],
    });
    const session = createLocalInvestigationToolSession(configured);
    const result = await session.executor.execute(call('QUERY_SYSTEM_ATLAS', { terms: ['billing'] }));
    expect(result.ok).toBe(true);
    expect(envelopeJson<{ records: Array<{ conceptId: string }> }>(result).records[0]?.conceptId).toBe('test.billing');
    expect(() => createOwnerLocalInvestigationContext({
      siblingRoot: root,
      scanConfig: fakeScanConfig(),
      systemAtlasRecords: [
        createSystemAtlasRecord({
          conceptId: 'synthetic.sneaky',
          kind: 'BUSINESS_ENTITY',
          label: 'Sneaky (synthetic)',
          provenance: {
            category: 'DOCUMENTED_FACT',
            repository: null,
            sourceSha: null,
            locator: 'src/core/systemAtlas/fixtures.ts#synthetic.sneaky',
            confidence: 'MEDIUM',
          },
        }),
      ],
    })).toThrow();
  });

  test('evidence reads only the strict configured mapping', async () => {
    const root = makeTempRoot();
    const context = createOwnerLocalInvestigationContext({
      siblingRoot: root,
      scanConfig: fakeScanConfig(),
      evidence: { 'ev:real': { source: 'LOG', record: { status: 200 } } },
    });
    const known = await context.evidence.get('ev:real');
    expect(known.status).toBe('AVAILABLE');
    const unknown = await context.evidence.get('ev:missing');
    expect(unknown.status).toBe('BLOCKED');
    if (unknown.status === 'BLOCKED') expect(unknown.class).toBe('DATA_BLOCKED');
    const empty = await createOwnerLocalInvestigationContext({
      siblingRoot: root,
      scanConfig: fakeScanConfig(),
    }).evidence.get('ev:real');
    expect(empty.status).toBe('BLOCKED');
  });

  test('the REAL_LOCAL default is the owner-local provider, refusing unapproved paths, and injection still overrides', async () => {
    const root = makeTempRoot();
    const context = createOwnerLocalInvestigationContext({ siblingRoot: root, scanConfig: fakeScanConfig() });
    // W9: a zero-option REAL_LOCAL context reproduces against current source
    // instead of failing closed as unconfigured.
    expect(context.reproduction.providerId).toBe(OWNER_LOCAL_REPRODUCTION_PROVIDER_ID);
    const refused = await context.reproduction.run({
      reproductionId: 'r',
      candidateId: null,
      sourcePath: 'x',
      sourceEvidenceRef: 'ev:x',
      observedEvidenceRefs: [],
    });
    // An unapproved, unparseable source path never reaches discovery or
    // execution: it is a deterministic refusal, not an environment problem.
    expect(refused.status).toBe('BLOCKED');
    if (refused.status === 'BLOCKED') expect(refused.class).toBe('UNSAFE_INPUT');
    // A non-REAL_LOCAL context still has no reproduction authority at all.
    const historical = createOwnerLocalInvestigationContext({
      siblingRoot: root,
      scanConfig: fakeScanConfig(),
      dataClass: 'REAL_HISTORICAL',
    });
    const unavailable = await historical.reproduction.run({
      reproductionId: 'r',
      candidateId: null,
      sourcePath: 'x',
      sourceEvidenceRef: 'ev:x',
      observedEvidenceRefs: [],
    });
    expect(unavailable.status).toBe('BLOCKED');
    if (unavailable.status === 'BLOCKED') expect(unavailable.class).toBe('NOT_CONFIGURED');
    const reproduction = stubReproduction();
    const injected = createOwnerLocalInvestigationContext({
      siblingRoot: root,
      scanConfig: fakeScanConfig(),
      reproduction,
    });
    expect(injected.reproduction.providerId).toBe('stub-reproduction');
  });
});
