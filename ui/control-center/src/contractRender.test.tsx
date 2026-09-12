import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import ts from 'typescript';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { App } from './App';
import { CONTROL_CENTER_API_PATHS, ControlCenterApiError, describeApiError } from './api';
import { ErrorState } from './shared';
import { API_ERROR_KINDS } from './types';
import type {
  ApiErrorKind,
  CampaignCoverageSnapshot,
  CampaignSummarySnapshot,
  DataLoadState,
  HealthSnapshot,
  OverviewSourceStates,
  RunListSnapshot,
} from './types';
import { CampaignView } from './views/CampaignView';
import { ExecutionGraphView } from './views/ExecutionGraphView';
import { FindingsView } from './views/FindingsView';
import { OverviewPartialView } from './views/OverviewView';
import { ReviewerView } from './views/ReviewerView';
import { RunsView } from './views/RunsView';

/**
 * Every field the Control Center fetches must change what the operator sees.
 *
 * The placement guard (`contractCoverage.test.ts`) proves a field NAME occurs
 * inside a component that can receive its contract. It is static: a field read
 * only in a branch the default state never takes, computed into a variable no
 * render consumes, or used only as a React key satisfies it while rendering
 * nothing.
 *
 * This suite proves the runtime half. Fixtures are generated from the
 * declared TypeScript contracts; one scalar leaf at a time is flipped to an
 * alternative value, the view is re-rendered, and the DOM must change. A
 * field whose value never changes the DOM in any view that can receive its
 * contract is either rendered in its owning view or listed here with the
 * reason it is not.
 *
 * SCOPE AND LIMIT. It proves a field affects the DOM in the maximally
 * revealing generated fixture state, not that the result is visually correct,
 * laid out, or reached by every conditional branch. `schemaVersion` is
 * written from the contract table instead of being flipped, because the API
 * layer refuses a mismatched identity before any view renders; flipping it
 * would exercise the error state, not the view. An unresolvable type shape
 * becomes an explicit sentinel and is counted in the non-vacuity assertions
 * rather than silently skipped.
 */
const TYPES = readFileSync(resolve(process.cwd(), 'src/types.ts'), 'utf8');

const source = ts.createSourceFile('types.ts', TYPES, ts.ScriptTarget.Latest, true);
const interfaces = new Map<string, ts.InterfaceDeclaration>();
source.forEachChild((node) => {
  if (ts.isInterfaceDeclaration(node)) interfaces.set(node.name.text, node);
});

const EMPTY_BINDINGS: ReadonlyMap<string, ts.TypeNode> = new Map();

const aliases = new Map<string, ts.TypeNode>();
source.forEachChild((node) => {
  if (ts.isTypeAliasDeclaration(node)) aliases.set(node.name.text, node.type);
});

/** The identity the API layer enforces per snapshot contract. */
const CONTRACT_VERSIONS: Readonly<Record<string, string>> = Object.freeze({
  HealthSnapshot: 'nightwatch.control-center.health.v1',
  MetaSnapshot: 'nightwatch.control-center.meta.v1',
  ReadinessSnapshot: 'nightwatch.control-center.readiness.v1',
  SafetySnapshot: 'nightwatch.control-center.safety.v1',
  SourceSummarySnapshot: 'nightwatch.control-center.source-summary.v3',
  RunListSnapshot: 'nightwatch.control-center.run-list.v1',
  RunDetailSnapshot: 'nightwatch.control-center.run-detail.v1',
  TimelineSnapshot: 'nightwatch.control-center.timeline.v1',
  ExecutionGraphSnapshot: 'nightwatch.control-center.execution-graph.v1',
  CampaignSummarySnapshot: 'nightwatch.control-center.campaign.v1',
  CampaignCoverageSnapshot: 'nightwatch.control-center.campaign-coverage.v1',
  FindingsSnapshot: 'nightwatch.control-center.findings.v1',
  ReviewerSnapshot: 'nightwatch.control-center.reviewer.v1',
  SourceSurfacesSnapshot: 'nightwatch.control-center.source-surfaces.v1',
  SourceGraphSnapshot: 'nightwatch.control-center.source-graph.v1',
  SystemMapSnapshot: 'nightwatch.control-center.system-map.v2',
});

interface Leaf {
  readonly contract: string;
  readonly path: readonly (string | number)[];
  readonly key: string;
  readonly value: unknown;
  readonly alternatives: readonly unknown[];
}

interface Generated {
  readonly value: unknown;
  readonly alternatives: readonly unknown[];
}

interface ArrayPath {
  readonly contract: string;
  readonly path: readonly (string | number)[];
  readonly key: string;
}

let sentinelCounter = 0;
function nextSentinel(path: readonly (string | number)[]): string {
  sentinelCounter += 1;
  return `SNT${String(sentinelCounter).padStart(4, '0')}${path.join('').replace(/[^A-Za-z0-9]/g, '')}`;
}

function isDateShaped(fieldName: string): boolean {
  return /At$|timestamp|date/i.test(fieldName);
}

function valueForType(
  type: ts.TypeNode,
  path: readonly (string | number)[],
  leaves: Leaf[],
  contract: string,
  fieldName = '',
  bindings: ReadonlyMap<string, ts.TypeNode> = EMPTY_BINDINGS,
): Generated {
  const leaf = (value: unknown, alternatives: readonly unknown[]): Generated => {
    leaves.push({ contract, path, key: `${contract}.${path.join('.')}`, value, alternatives });
    return { value, alternatives };
  };
  if (ts.isParenthesizedTypeNode(type)) return valueForType(type.type, path, leaves, contract, fieldName, bindings);
  if (ts.isTypeOperatorNode(type)) return valueForType(type.type, path, leaves, contract, fieldName, bindings);
  if (ts.isIntersectionTypeNode(type)) {
    return {
      value: Object.assign({}, ...type.types.map((entry) => valueForType(entry, path, leaves, contract, fieldName, bindings).value)),
      alternatives: [],
    };
  }
  if (ts.isTupleTypeNode(type)) {
    return {
      value: type.elements.map((entry, index) => valueForType(entry, [...path, index], leaves, contract, fieldName, bindings).value),
      alternatives: [],
    };
  }
  if (ts.isTypeReferenceNode(type)) {
    const name = type.typeName.getText();
    if (bindings.has(name)) {
      return valueForType(bindings.get(name)!, path, leaves, contract, fieldName, bindings);
    }
    if (aliases.has(name)) {
      return valueForType(aliases.get(name)!, path, leaves, contract, fieldName, bindings);
    }
    if (name === 'Readonly' || name === 'ReadonlyArray' || name === 'Array') {
      const argument = type.typeArguments?.[0];
      if (argument === undefined) return leaf(nextSentinel(path), [`ZZALT${nextSentinel(path)}`]);
      if (ts.isTypeReferenceNode(argument) && argument.typeName.getText() === 'Record') {
        return recordFor(argument, path, leaves, contract, bindings);
      }
      return valueForType(argument, path, leaves, contract, fieldName, bindings);
    }
    if (name === 'Record') return recordFor(type, path, leaves, contract, bindings);
    if (name === 'Date') return leaf('2026-09-10T00:00:00.000Z', ['2026-09-11T01:02:03.000Z']);
    const declaration = interfaces.get(name);
    if (declaration !== undefined) {
      const nextBindings = new Map(bindings);
      if (declaration.typeParameters !== undefined && type.typeArguments !== undefined) {
        declaration.typeParameters.forEach((parameter, index) => {
          const argument = type.typeArguments![index];
          if (argument !== undefined) nextBindings.set(parameter.name.text, argument);
        });
      }
      return { value: objectForMembers(declaration.members, path, leaves, contract, nextBindings), alternatives: [] };
    }
    return leaf(nextSentinel(path), [`ZZALT${nextSentinel(path)}`]);
  }
  if (ts.isArrayTypeNode(type)) {
    return { value: [valueForType(type.elementType, [...path, 0], leaves, contract, fieldName, bindings).value], alternatives: [] };
  }
  if (ts.isTypeLiteralNode(type)) {
    return { value: objectForMembers(type.members, path, leaves, contract, bindings), alternatives: [] };
  }
  if (ts.isIndexedAccessTypeNode(type)) {
    return valueForType(type.indexType, path, leaves, contract, fieldName, bindings);
  }
  if (type.kind === ts.SyntaxKind.StringKeyword) {
    if (isDateShaped(fieldName)) return leaf('2026-09-10T00:00:00.000Z', ['2026-09-11T01:02:03.000Z']);
    const value = nextSentinel(path);
    return leaf(value, [`ZZALT${value}`]);
  }
  if (type.kind === ts.SyntaxKind.NumberKeyword) {
    sentinelCounter += 1;
    const value = 700000 + sentinelCounter;
    return leaf(value, [value + 101]);
  }
  if (type.kind === ts.SyntaxKind.BooleanKeyword) return leaf(true, [false]);
  if (type.kind === ts.SyntaxKind.AnyKeyword || type.kind === ts.SyntaxKind.UnknownKeyword) {
    const value = nextSentinel(path);
    return leaf(value, [`ZZALT${value}`]);
  }
  if (type.kind === ts.SyntaxKind.NullKeyword) return { value: null, alternatives: [] };
  if (ts.isLiteralTypeNode(type)) {
    const literal = type.literal;
    if (ts.isStringLiteral(literal)) return leaf(literal.text, [`ZZALT${literal.text}`]);
    if (literal.kind === ts.SyntaxKind.TrueKeyword) return leaf(true, [false]);
    if (literal.kind === ts.SyntaxKind.FalseKeyword) return leaf(false, [true]);
    if (ts.isNumericLiteral(literal)) return leaf(Number(literal.text), [Number(literal.text) + 1]);
    return leaf(nextSentinel(path), [`ZZALT${nextSentinel(path)}`]);
  }
  if (ts.isUnionTypeNode(type)) {
    const nullable = type.types.some(
      (entry) =>
        (ts.isLiteralTypeNode(entry) && entry.literal.kind === ts.SyntaxKind.NullKeyword) ||
        entry.kind === ts.SyntaxKind.UndefinedKeyword,
    );
    const useful = type.types.filter(
      (entry) =>
        !(ts.isLiteralTypeNode(entry) && entry.literal.kind === ts.SyntaxKind.NullKeyword) &&
        entry.kind !== ts.SyntaxKind.UndefinedKeyword,
    );
    const literalStrings = useful.filter(
      (entry): entry is ts.LiteralTypeNode => ts.isLiteralTypeNode(entry) && ts.isStringLiteral(entry.literal),
    );
    if (literalStrings.length === useful.length && literalStrings.length > 0) {
      const values = literalStrings.map((entry) => (entry.literal as ts.StringLiteral).text);
      const alternatives = [...values.slice(1), ...(nullable ? [null] : [])];
      leaves.push({ contract, path, key: `${contract}.${path.join('.')}`, value: values[0], alternatives });
      return { value: values[0], alternatives };
    }
    const before = leaves.length;
    const generated = valueForType(useful[0] ?? type.types[0]!, path, leaves, contract, fieldName, bindings);
    if (nullable && leaves.length > before) {
      const last = leaves[leaves.length - 1]!;
      leaves[leaves.length - 1] = { ...last, alternatives: [...last.alternatives, null] };
      return { value: generated.value, alternatives: [...generated.alternatives, null] };
    }
    return generated;
  }
  return leaf(nextSentinel(path), [`ZZALT${nextSentinel(path)}`]);
}

function recordFor(
  node: ts.TypeReferenceNode,
  path: readonly (string | number)[],
  leaves: Leaf[],
  contract: string,
  bindings: ReadonlyMap<string, ts.TypeNode>,
): Generated {
  const argument = node.typeArguments?.[0];
  const keys: string[] = [];
  if (argument !== undefined) {
    const collect = (entry: ts.TypeNode): void => {
      if (ts.isUnionTypeNode(entry)) { entry.types.forEach(collect); return; }
      if (ts.isLiteralTypeNode(entry) && ts.isStringLiteral(entry.literal)) { keys.push(entry.literal.text); return; }
      if (entry.kind === ts.SyntaxKind.StringKeyword) { sentinelCounter += 1; keys.push(`key${sentinelCounter}`); }
    };
    collect(argument);
  }
  if (keys.length === 0) { sentinelCounter += 1; keys.push(`key${sentinelCounter}`); }
  const valueType = node.typeArguments?.[1];
  const value: Record<string, unknown> = {};
  for (const key of keys) {
    value[key] = valueType === undefined
      ? 1
      : valueForType(valueType, [...path, key], leaves, contract, key, bindings).value;
  }
  return { value, alternatives: [] };
}

function objectForMembers(
  members: readonly ts.TypeElement[],
  path: readonly (string | number)[],
  leaves: Leaf[],
  contract: string,
  bindings: ReadonlyMap<string, ts.TypeNode>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const member of members) {
    if (!ts.isPropertySignature(member) || member.type === undefined) continue;
    const name = member.name.getText().replace(/['"]/g, '');
    if (name === 'schemaVersion') {
      out[name] = CONTRACT_VERSIONS[contract] ?? 'nightwatch.control-center.unknown.v1';
      continue;
    }
    out[name] = valueForType(member.type, [...path, name], leaves, contract, name, bindings).value;
  }
  return out;
}

interface GeneratedContract {
  readonly value: Record<string, unknown>;
  readonly leaves: readonly Leaf[];
  /** Every array the generated value carries, for the absence pass. */
  readonly arrays: readonly ArrayPath[];
}

const generatedCache = new Map<string, GeneratedContract>();

/** Make generated graphs internally coherent: an edge endpoint must name a
 *  node the same snapshot carries, or every edge is filtered out before any
 *  view can render it. */
function correlateGraphEndpoints(value: Record<string, unknown>): void {
  const nodes = value.nodes;
  const edges = value.edges;
  if (!Array.isArray(nodes) || !Array.isArray(edges) || nodes.length === 0) return;
  const first = nodes[0] as Record<string, unknown>;
  const second = (nodes.length > 1 ? nodes[1] : nodes[0]) as Record<string, unknown>;
  for (const edge of edges as Record<string, unknown>[]) {
    if (typeof first.nodeId === 'string' && 'fromNodeId' in edge) edge.fromNodeId = first.nodeId;
    if (typeof second.nodeId === 'string' && 'toNodeId' in edge) edge.toNodeId = second.nodeId;
  }
}

/** Every array the generated fixture carries, at every depth. */
function collectArrayPaths(value: unknown, path: readonly (string | number)[], contract: string, out: ArrayPath[]): void {
  if (Array.isArray(value)) {
    out.push({ contract, path, key: `${contract}.${path.join('.')}` });
    value.forEach((entry, index) => collectArrayPaths(entry, [...path, index], contract, out));
    return;
  }
  if (value !== null && typeof value === 'object') {
    for (const [name, entry] of Object.entries(value)) collectArrayPaths(entry, [...path, name], contract, out);
  }
}

function generatedFor(contract: string): GeneratedContract {
  const cached = generatedCache.get(contract);
  if (cached !== undefined) return cached;
  const declaration = interfaces.get(contract);
  if (declaration === undefined) throw new Error(`CONTRACT_UNKNOWN:${contract}`);
  const leaves: Leaf[] = [];
  const value = objectForMembers(declaration.members, [], leaves, contract, EMPTY_BINDINGS);
  correlateGraphEndpoints(value);
  const arrays: ArrayPath[] = [];
  collectArrayPaths(value, [], contract, arrays);
  const generated: GeneratedContract = { value, leaves, arrays };
  generatedCache.set(contract, generated);
  return generated;
}

function arraysFor(contracts: readonly string[]): readonly ArrayPath[] {
  return contracts.flatMap((contract) => generatedFor(contract).arrays);
}

function fixturesFor(contracts: readonly string[]): Map<string, Record<string, unknown>> {
  const fixtures = new Map<string, Record<string, unknown>>();
  for (const contract of contracts) fixtures.set(contract, structuredClone(generatedFor(contract).value));
  return fixtures;
}

function setPath(root: unknown, path: readonly (string | number)[], next: unknown): void {
  let cursor = root as Record<string | number, unknown>;
  for (let index = 0; index < path.length - 1; index += 1) {
    cursor = cursor[path[index] as string | number] as Record<string | number, unknown>;
  }
  cursor[path[path.length - 1] as string | number] = next;
}

const OVERVIEW_CONTRACTS = [
  'HealthSnapshot',
  'MetaSnapshot',
  'ReadinessSnapshot',
  'SafetySnapshot',
  'SourceSummarySnapshot',
] as const;

const REMAINING_CONTRACTS = [
  'RunListSnapshot',
  'RunDetailSnapshot',
  'TimelineSnapshot',
  'ExecutionGraphSnapshot',
  'CampaignSummarySnapshot',
  'CampaignCoverageSnapshot',
  'FindingsSnapshot',
  'ReviewerSnapshot',
  'SourceSurfacesSnapshot',
  'SourceGraphSnapshot',
  'SystemMapSnapshot',
] as const;

const ALL_CONTRACTS = [...OVERVIEW_CONTRACTS, ...REMAINING_CONTRACTS];

interface ViewCase {
  readonly name: string;
  readonly contracts: readonly string[];
  readonly marker: string | RegExp;
  readonly activate?: () => void | Promise<void>;
}

const RUN_DETAIL_MARKER = /RUN DETAIL \//;

async function openRunsList(): Promise<void> {
  window.location.hash = '#runs';
  await screen.findByText('Inspect what happened, in order.');
}

async function inspectFirstRun(): Promise<void> {
  await openRunsList();
  fireEvent.click(await screen.findByRole('button', { name: 'Inspect' }));
  await screen.findByText(RUN_DETAIL_MARKER);
}

const VIEWS: readonly ViewCase[] = [
  { name: 'overview', contracts: OVERVIEW_CONTRACTS, marker: 'Know the posture before the next run.' },
  {
    name: 'safety',
    contracts: OVERVIEW_CONTRACTS,
    marker: 'Safety is a posture, not a green badge.',
    activate: () => { window.location.hash = '#safety'; },
  },
  {
    name: 'runs',
    contracts: ['RunListSnapshot'],
    marker: 'Inspect what happened, in order.',
    activate: () => { window.location.hash = '#runs'; },
  },
  {
    name: 'run-detail',
    contracts: ['RunDetailSnapshot', 'TimelineSnapshot'],
    marker: RUN_DETAIL_MARKER,
    activate: inspectFirstRun,
  },
  {
    name: 'execution-graph',
    contracts: ['ExecutionGraphSnapshot'],
    marker: 'Trace the bounded run shape.',
    activate: async () => {
      await inspectFirstRun();
      window.location.hash = '#execution-graph';
    },
  },
  {
    name: 'campaigns',
    contracts: ['CampaignSummarySnapshot', 'CampaignCoverageSnapshot'],
    marker: 'See the shape of coverage.',
    activate: () => { window.location.hash = '#campaigns'; },
  },
  {
    name: 'findings',
    contracts: ['FindingsSnapshot'],
    marker: 'Keep the signal, lose the raw evidence.',
    activate: () => { window.location.hash = '#findings'; },
  },
  {
    name: 'reviewer',
    contracts: ['ReviewerSnapshot'],
    marker: 'Separate what was proved from what is suggested.',
    activate: () => { window.location.hash = '#reviewer'; },
  },
  {
    name: 'source-intelligence',
    contracts: ['SourceSummarySnapshot', 'SourceSurfacesSnapshot', 'SourceGraphSnapshot'],
    marker: 'Follow proof, currentness, and capability.',
    activate: async () => {
      window.location.hash = '#source-intelligence';
      await screen.findByText('Follow proof, currentness, and capability.');
      // The graph control lives on a surface row; an empty surface page has
      // none, which is exactly the absence case this matrix must exercise.
      const graphButton = screen.queryByRole('button', { name: 'Graph' });
      if (graphButton !== null) {
        fireEvent.click(graphButton);
        await screen.findByRole('img', { name: 'Bounded source intelligence graph' });
      }
    },
  },
  {
    name: 'system-map',
    contracts: ['SystemMapSnapshot'],
    marker: 'Company',
    activate: () => { window.location.hash = '#system-map'; },
  },
];

/**
 * Reasons a field does not affect the DOM in any view that can receive its
 * contract. The placement guard carries the same five fields for its own
 * reasons; this list must stay small and every entry must still be
 * unobservable, or the suite fails.
 */
const NOT_OBSERVABLE: Readonly<Record<string, string>> = Object.freeze({
  'TimelineSnapshot.afterSeq': 'request echo; the timeline carries position and truncation',
  'RunListItemSnapshot.passed': 'boolean projection of status; the runs views render the status',
  'ReviewerSnapshot.items.0.localReview.value.affectedRecordCount': 'state-gated to bindingCurrentness VERSION_UNSUPPORTED; the dedicated unsupported-review render test proves the distinction',
  'ReviewerSnapshot.items.0.localReview.value.currentSchema': 'state-gated to bindingCurrentness VERSION_UNSUPPORTED; the dedicated unsupported-review render test proves the distinction',
  'ReviewerSnapshot.items.0.localReview.value.foundVersions.0': 'state-gated to bindingCurrentness VERSION_UNSUPPORTED; the dedicated unsupported-review render test proves the distinction',
  'ReviewerSnapshot.items.0.localReview.value.migration': 'state-gated to bindingCurrentness VERSION_UNSUPPORTED; the dedicated unsupported-review render test proves the distinction',
});

function isExempt(key: string): boolean {
  return key in NOT_OBSERVABLE || key.endsWith('.schemaVersion') || key.includes('.advisoryOnly') || key.endsWith('.passed');
}

function endpointPayloads(fixtures: Map<string, Record<string, unknown>>): Map<string, unknown> {
  const payloads = new Map<string, unknown>();
  const put = (key: string, contract: string): void => {
    const fixture = fixtures.get(contract);
    if (fixture !== undefined) payloads.set(key, fixture);
  };
  put(CONTROL_CENTER_API_PATHS.health, 'HealthSnapshot');
  put(CONTROL_CENTER_API_PATHS.meta, 'MetaSnapshot');
  put(CONTROL_CENTER_API_PATHS.readiness, 'ReadinessSnapshot');
  put(CONTROL_CENTER_API_PATHS.safety, 'SafetySnapshot');
  put(CONTROL_CENTER_API_PATHS.sourceSummary, 'SourceSummarySnapshot');
  put('/api/v1/runs?limit=20', 'RunListSnapshot');
  put('/api/v1/campaign/coverage?limit=50', 'CampaignCoverageSnapshot');
  put(CONTROL_CENTER_API_PATHS.campaignSummary, 'CampaignSummarySnapshot');
  put('/api/v1/source/surfaces?limit=50', 'SourceSurfacesSnapshot');
  put('/api/v1/reviewer?limit=50', 'ReviewerSnapshot');
  put('/api/v1/findings?limit=50', 'FindingsSnapshot');
  const runs = fixtures.get('RunListSnapshot');
  const firstRun = runs === undefined ? undefined : (runs.items as readonly Record<string, unknown>[])[0];
  if (firstRun !== undefined) {
    const runId = String(firstRun.runId);
    put(`/api/v1/runs/${runId}`, 'RunDetailSnapshot');
    put(`/api/v1/runs/${runId}/timeline?afterSeq=0&limit=100`, 'TimelineSnapshot');
    put(`/api/v1/runs/${runId}/execution-graph`, 'ExecutionGraphSnapshot');
  }
  const surfaces = fixtures.get('SourceSurfacesSnapshot');
  const firstSurface = surfaces === undefined ? undefined : (surfaces.items as readonly Record<string, unknown>[])[0];
  if (firstSurface !== undefined) {
    put(`/api/v1/source/graph?depth=2&surface=${String(firstSurface.surfaceId)}`, 'SourceGraphSnapshot');
  }
  put('/api/v2/system-map/l1', 'SystemMapSnapshot');
  return payloads;
}

interface MountResult {
  readonly html: string;
  readonly requests: readonly string[];
}

async function mount(view: ViewCase, fixtures: Map<string, Record<string, unknown>>): Promise<MountResult> {
  const payloads = endpointPayloads(fixtures);
  const requests: string[] = [];
  vi.stubGlobal('fetch', vi.fn((input: RequestInfo | URL) => {
    const path = String(input);
    requests.push(path);
    const payload = payloads.get(path);
    if (payload === undefined) {
      return Promise.reject(new Error(`UNEXPECTED_REQUEST:${path}`));
    }
    return Promise.resolve({ ok: true, status: 200, json: async () => payload } as Response);
  }));
  window.location.hash = '';
  const rendered = render(<App />);
  try {
    await view.activate?.();
    await screen.findByText(view.marker);
    return { html: rendered.container.ownerDocument.body.innerHTML, requests };
  } finally {
    // `unmount` leaves the container div in the document, and a stale empty
    // container would make every later render differ from the baseline.
    cleanup();
    vi.unstubAllGlobals();
  }
}

function leavesFor(contracts: readonly string[]): readonly Leaf[] {
  return contracts.flatMap((contract) => generatedFor(contract).leaves);
}

describe('control center render truth', () => {
  it('generates a non-vacuous fixture universe', () => {
    const contracts = [...interfaces.keys()];
    let leaves = 0;
    for (const contract of ALL_CONTRACTS) leaves += generatedFor(contract).leaves.length;
    expect(contracts.length).toBeGreaterThan(30);
    expect(ALL_CONTRACTS.length).toBe(16);
    expect(leaves).toBeGreaterThan(300);
    // A known scalar leaf exists with a real alternative; a generator that
    // silently produced strings for every shape would fail these.
    const meta = generatedFor('MetaSnapshot');
    expect(meta.value.schemaVersion).toBe('nightwatch.control-center.meta.v1');
    expect(typeof (meta.value.readOnly)).toBe('boolean');
    expect(typeof (meta.value.limits)).toBe('object');
    const readiness = generatedFor('ReadinessSnapshot');
    expect(Array.isArray(readiness.value.unresolvedBlockers)).toBe(true);
    const safety = generatedFor('SafetySnapshot');
    expect(Array.isArray(safety.value.checks)).toBe(true);
  });

  it('renders identically for identical fixtures', async () => {
    const contracts = [...OVERVIEW_CONTRACTS, ...REMAINING_CONTRACTS];
    const first = await mount(VIEWS[0]!, fixturesFor(contracts));
    const second = await mount(VIEWS[0]!, fixturesFor(contracts));
    expect(first.html).toBe(second.html);
    expect(first.html.length).toBeGreaterThan(5_000);
  });

  it('observably renders every non-exempt field of every covered view', async () => {
    // Contracts whose observability is asserted at this milestone. The
    // source-view-only fields of SourceSummarySnapshot are asserted when the
    // source view is added to VIEWS.
    const ASSERTED_CONTRACTS = [
      'HealthSnapshot',
      'MetaSnapshot',
      'ReadinessSnapshot',
      'SafetySnapshot',
      'RunListSnapshot',
      'RunDetailSnapshot',
      'TimelineSnapshot',
      'ExecutionGraphSnapshot',
      'CampaignSummarySnapshot',
      'CampaignCoverageSnapshot',
      'FindingsSnapshot',
      'ReviewerSnapshot',
      'SourceSummarySnapshot',
      'SourceSurfacesSnapshot',
      'SourceGraphSnapshot',
      'SystemMapSnapshot',
    ];
    const coveredContracts = [...new Set(VIEWS.flatMap((view) => [...view.contracts]))].sort();
    // The views and the asserted contract list must agree exactly; a view
    // added without asserting its contracts (or the reverse) would otherwise
    // leave fields outside the matrix silently.
    expect(coveredContracts).toEqual([...ASSERTED_CONTRACTS].sort());
    const covered = leavesFor(ASSERTED_CONTRACTS);
    expect(covered.length).toBeGreaterThan(60);
    const observable = new Set<string>();
    const baselineLengths: Record<string, number> = {};
    const baselinesByView = new Map<string, string>();
    const flips: Record<string, number> = {};
    for (const view of VIEWS) {
      const base = await mount(view, fixturesFor(ALL_CONTRACTS));
      baselineLengths[view.name] = base.html.length;
      baselinesByView.set(view.name, base.html);
      flips[view.name] = 0;
      for (const leaf of leavesFor(view.contracts)) {
        if (observable.has(leaf.key)) continue;
        const alternatives = leaf.alternatives.slice(0, 2);
        for (const alternative of alternatives) {
          const fixtures = fixturesFor(ALL_CONTRACTS);
          setPath(fixtures.get(leaf.contract), leaf.path, alternative);
          flips[view.name] += 1;
          const mutated = await mount(view, fixtures);
          if (mutated.html !== base.html) { observable.add(leaf.key); break; }
        }
      }
    }

    const exemptKeys = covered.filter((leaf) => isExempt(leaf.key)).map((leaf) => leaf.key);
    for (const key of exemptKeys) {
      expect(NOT_OBSERVABLE[key] ?? 'api-validated identity or prose constant').toBeTruthy();
    }
    const staleExemptions = exemptKeys.filter((key) => observable.has(key));
    expect(staleExemptions, 'exempt fields are now observable; remove the exemption').toEqual([]);
    const missing = covered.filter((leaf) => !isExempt(leaf.key) && !observable.has(leaf.key)).map((leaf) => leaf.key).sort();
    expect(missing, 'declared fields that change no view DOM').toEqual([]);
    // Non-vacuity: the matrix actually flipped leaves and rendered large views.
    const totalFlips = Object.values(flips).reduce((sum, value) => sum + value, 0);
    expect(totalFlips).toBeGreaterThan(100);
    expect(baselineLengths.overview).toBeGreaterThan(5_000);
    expect(observable.size).toBeGreaterThanOrEqual(covered.length - exemptKeys.length);

    // A-03. Absence observability: emptying any collection must change the
    // DOM of a view that can receive it, or state why it cannot. An empty
    // list that renders like a short one is the defect this pass exists for.
    const arrays = arraysFor(ASSERTED_CONTRACTS);
    expect(arrays.length, 'the generator recorded no arrays; the pass would be vacuous').toBeGreaterThan(20);
    const arrayExemptions: Readonly<Record<string, string>> = {
      'ReviewerSnapshot.items.0.localReview.value.foundVersions': 'state-gated to bindingCurrentness VERSION_UNSUPPORTED; the dedicated unsupported-review render test proves the distinction',
    };
    const observableArrays = new Set<string>();
    const absentArrays: string[] = [];
    for (const array of arrays) {
      const candidateViews = VIEWS.filter((view) => view.contracts.includes(array.contract));
      let changed = false;
      for (const view of candidateViews) {
        const baseline = baselinesByView.get(view.name) ?? (await mount(view, fixturesFor(ALL_CONTRACTS))).html;
        const fixtures = fixturesFor(ALL_CONTRACTS);
        setPath(fixtures.get(array.contract), array.path, []);
        const mutated = await mount(view, fixtures);
        if (mutated.html !== baseline) { changed = true; break; }
      }
      if (changed) observableArrays.add(array.key);
      else if (!(array.key in arrayExemptions)) absentArrays.push(array.key);
    }
    expect(absentArrays, 'collections whose emptiness changes no view DOM').toEqual([]);
    const staleArrayExemptions = Object.keys(arrayExemptions).filter((key) => observableArrays.has(key));
    expect(staleArrayExemptions, 'collection exemptions are now observable; remove them').toEqual([]);
  }, 900_000);

  /**
   * Group 19.12. The App.tsx decomposition into one module per view plus a
   * shared module must change nothing an operator sees. The baseline below was
   * generated from the pre-decomposition App.tsx under this same fixture
   * matrix, and every view's rendered DOM is compared byte-for-byte against
   * it. Regenerate only when an intended DOM change is made, and record why in
   * the task STATE.md.
   */
  const VIEW_DOM_BASELINE = resolve(process.cwd(), 'src', '__baselines__', 'view-dom-baseline.json');

  it('preserves the rendered DOM of every view across the decomposition', async () => {
    const contracts = [...OVERVIEW_CONTRACTS, ...REMAINING_CONTRACTS];
    const observed: Record<string, { readonly sha256: string; readonly length: number }> = {};
    for (const view of VIEWS) {
      const mounted = await mount(view, fixturesFor(contracts));
      observed[view.name] = {
        sha256: createHash('sha256').update(mounted.html).digest('hex'),
        length: mounted.html.length,
      };
    }
    if (process.env.NIGHTWATCH_UPDATE_VIEW_DOM_BASELINE === '1') {
      mkdirSync(dirname(VIEW_DOM_BASELINE), { recursive: true });
      writeFileSync(VIEW_DOM_BASELINE, `${JSON.stringify(observed, null, 2)}\n`);
      return;
    }
    const baseline = JSON.parse(readFileSync(VIEW_DOM_BASELINE, 'utf8')) as typeof observed;
    // A view missing from either side fails: a removed view must not silently
    // shrink the proof, and a new view must not escape it.
    expect(Object.keys(observed).sort()).toEqual(Object.keys(baseline).sort());
    for (const view of VIEWS) {
      expect(observed[view.name], `${view.name} DOM drifted from the pre-decomposition baseline`).toEqual(baseline[view.name]);
    }
  }, 900_000);
});

/**
 * F-18. The failure path, held to the same differential standard as the
 * success path.
 *
 * The four success-path campaigns never produced an error kind: `ApiErrorKind`
 * exists only on the failure path, so a five-value taxonomy could be rendered
 * as one state while every guard stayed green. This harness drives each view
 * into each member of `ApiErrorKind` and requires the DOM to differ between
 * kinds. Two kinds that legitimately render identically must be declared in
 * `ERROR_KIND_EXEMPTIONS` with a reason, and the list fails in BOTH
 * directions: an unexempted identical pair fails, and an exemption for a pair
 * that now renders differently fails as stale.
 *
 * The member list is `API_ERROR_KINDS`, and a source assertion below proves
 * `ApiErrorKind` is DERIVED from it, so the assertion cannot drift from the
 * type: adding a sixth kind reaches the harness and fails until a view renders
 * it distinguishably.
 */
const ERROR_KIND_EXEMPTIONS: Readonly<Record<string, string>> = Object.freeze({});

/**
 * The list above is EMPTY today, and that is the assertion rather than an
 * omission: every member carries its own kind label, status and derived
 * operator action, so all ten pairs per view render differently. A pair that
 * legitimately renders identically belongs in the list with its reason; the
 * comparator fails BOTH ways — an unexempted identical pair is a silent
 * conflation, and an exemption whose pair now renders differently is stale
 * bookkeeping.
 *
 * The system map view is owned by the concurrent system-map/styles worker and
 * has not yet been converted to carry the taxonomy into its error state. Its
 * exclusion is honest in both directions: the check at the end of this block
 * fails the moment its source starts consuming the taxonomy, so the exclusion
 * cannot outlive its reason.
 */
const HARNESS_VIEW_EXCLUSIONS: Readonly<Record<string, string>> = Object.freeze({
  'system-map': 'owned by the concurrent system-map/styles worker; its error state still renders one generic panel. The staleness check fails when that changes.',
});

interface FailureView {
  readonly name: string;
  readonly render: (error: ControlCenterApiError) => string;
}

function htmlOf(element: ReactElement): string {
  const rendered = render(element);
  try {
    return rendered.container.innerHTML;
  } finally {
    cleanup();
  }
}

function noop(): void {
  // The harness asserts the affordance, not the navigation.
}

/** The representative error per kind: HTTP is driven at 404, the capability case. */
function kindCase(kind: ApiErrorKind): ControlCenterApiError {
  if (kind === 'HTTP') return new ControlCenterApiError('HTTP', 404);
  if (kind === 'INVALID_RESPONSE') return new ControlCenterApiError('INVALID_RESPONSE', null, 'nightwatch.control-center.failure-harness.v1');
  return new ControlCenterApiError(kind);
}

/**
 * Generated LAZILY. The fixture generator numbers sentinels from a shared
 * counter, so generating one here at module load would shift every sentinel
 * generated afterwards and break the frozen DOM baseline. The baseline test
 * itself determines the canonical generation order.
 */
function readyRunList(): RunListSnapshot {
  return generatedFor('RunListSnapshot').value as unknown as RunListSnapshot;
}

const FAILURE_VIEWS: readonly FailureView[] = [
  // The Overview, Safety and Source Intelligence whole-view error is the
  // App-level decision when every source they need has failed; the shared
  // panel is exactly what the shell renders there.
  { name: 'overview', render: (error) => htmlOf(<ErrorState error={error} onRetry={noop} />) },
  { name: 'safety', render: (error) => htmlOf(<ErrorState error={error} onRetry={noop} />) },
  { name: 'source-intelligence', render: (error) => htmlOf(<ErrorState error={error} onRetry={noop} />) },
  {
    name: 'runs',
    render: (error) => htmlOf(<RunsView state={{ kind: 'error', error }} selectedRunId={null} detailState={{ kind: 'idle' }} timelineState={{ kind: 'idle' }} onSelectRun={noop} onRetry={noop} />),
  },
  {
    name: 'run-detail',
    render: (error) => htmlOf(<RunsView state={{ kind: 'ready', data: readyRunList() }} selectedRunId="run-1" detailState={{ kind: 'error', error }} timelineState={{ kind: 'error', error }} onSelectRun={noop} onRetry={noop} />),
  },
  {
    name: 'execution-graph',
    render: (error) => htmlOf(<ExecutionGraphView selectedRunId="run-1" state={{ kind: 'error', error }} onRetry={noop} />),
  },
  {
    name: 'campaigns',
    render: (error) => htmlOf(<CampaignView summaryState={{ kind: 'error', error }} coverageState={{ kind: 'error', error }} onRetry={noop} />),
  },
  { name: 'findings', render: (error) => htmlOf(<FindingsView state={{ kind: 'error', error }} onRetry={noop} />) },
  { name: 'reviewer', render: (error) => htmlOf(<ReviewerView state={{ kind: 'error', error }} capability="UNKNOWN" onRetry={noop} />) },
];

function pairKey(left: string, right: string): string {
  return [left, right].sort().join('|');
}

/**
 * The differential judgement itself, pure so the mutation proof can feed it a
 * deliberately collapsed rendering set and require the failure to name the
 * view and the kinds it conflated.
 */
function differentialViolations(
  view: string,
  renderings: ReadonlyMap<string, string>,
  exemptions: Readonly<Record<string, string>>,
): readonly string[] {
  const violations: string[] = [];
  const kinds = [...renderings.keys()].sort();
  for (let i = 0; i < kinds.length; i += 1) {
    for (let j = i + 1; j < kinds.length; j += 1) {
      const left = kinds[i] as string;
      const right = kinds[j] as string;
      const key = pairKey(left, right);
      const exempted = Object.prototype.hasOwnProperty.call(exemptions, key);
      const identical = renderings.get(left) === renderings.get(right);
      if (identical && !exempted) {
        violations.push(`${view}: ${left} and ${right} render identically and no exemption declares why`);
      }
      if (!identical && exempted) {
        violations.push(`${view}: exemption ${key} is stale; ${left} and ${right} now render differently`);
      }
    }
  }
  return violations;
}

describe('F-18 failure-path differential render harness', () => {
  it('drives every view through every ApiErrorKind member and requires distinct renderings', () => {
    const allViolations: string[] = [];
    for (const view of FAILURE_VIEWS) {
      const renderings = new Map<string, string>();
      for (const kind of API_ERROR_KINDS) renderings.set(kind, view.render(kindCase(kind)));
      // ABORTED is normal navigation: no error state at all.
      expect(renderings.get('ABORTED'), `${view.name} rendered an error state for ABORTED`).not.toContain('data-error-kind');
      expect(renderings.get('ABORTED'), `${view.name} rendered an alert for ABORTED`).not.toContain('role="alert"');
      for (const kind of API_ERROR_KINDS) {
        if (kind === 'ABORTED') continue;
        expect(renderings.get(kind), `${view.name} did not render kind ${kind}`).toContain(`data-error-kind="${kind}"`);
      }
      allViolations.push(...differentialViolations(view.name, renderings, ERROR_KIND_EXEMPTIONS));
    }
    expect(allViolations).toEqual([]);
  });

  it('derives the coverage assertion from the members of ApiErrorKind, with no fallback', () => {
    // The type is DERIVED from the runtime list, so the two cannot drift: a
    // sixth member added to the list reaches the matrix above immediately.
    expect(TYPES).toMatch(/export const API_ERROR_KINDS = \[[^\]]+\] as const;/);
    expect(TYPES).toMatch(/export type ApiErrorKind = \(typeof API_ERROR_KINDS\)\[number\];/);
    for (const kind of API_ERROR_KINDS) {
      const status = kind === 'HTTP' ? 404 : null;
      const presentation = describeApiError({ kind, status, contract: null });
      // A kind with no explicit presentation falls through to the
      // unclassified default, which is how a sixth kind would silently
      // render as "some failure" instead of failing this harness.
      expect(presentation.kindLabel, `${kind} has no explicit operator presentation`).not.toBe('Unclassified');
      if (kind === 'ABORTED') continue;
      const html = htmlOf(<ErrorState error={{ kind, status, contract: null }} onRetry={noop} />);
      expect(html, `${kind} did not reach the DOM with its own kind`).toContain(`data-error-kind="${kind}"`);
    }
  });

  it('offers retry only for NETWORK, TIMEOUT, 408 and 429', () => {
    const retryable: ReadonlyArray<readonly [string, ControlCenterApiError]> = [
      ['NETWORK', new ControlCenterApiError('NETWORK')],
      ['TIMEOUT', new ControlCenterApiError('TIMEOUT')],
      ['HTTP 408', new ControlCenterApiError('HTTP', 408)],
      ['HTTP 429', new ControlCenterApiError('HTTP', 429)],
    ];
    const notRetryable: ReadonlyArray<readonly [string, ControlCenterApiError]> = [
      ['INVALID_RESPONSE', new ControlCenterApiError('INVALID_RESPONSE', null, 'nightwatch.control-center.failure-harness.v1')],
      ['HTTP 404', new ControlCenterApiError('HTTP', 404)],
      ['HTTP 400', new ControlCenterApiError('HTTP', 400)],
      ['HTTP 500', new ControlCenterApiError('HTTP', 500)],
    ];
    for (const [label, error] of retryable) {
      expect(htmlOf(<ErrorState error={error} onRetry={noop} />), label).toContain('Try again');
    }
    for (const [label, error] of notRetryable) {
      expect(htmlOf(<ErrorState error={error} onRetry={noop} />), label).not.toContain('Try again');
    }
    // A failure the client cannot classify never claims a retry can help.
    const unclassified = htmlOf(<ErrorState error={{ kind: null, status: null, contract: null }} onRetry={noop} />);
    expect(unclassified).toContain('Failure class: Unclassified');
    expect(unclassified).not.toContain('Try again');
  });

  it('presents INVALID_RESPONSE as a contract mismatch naming the contract, with no retry', () => {
    const html = htmlOf(<ErrorState error={new ControlCenterApiError('INVALID_RESPONSE', null, 'nightwatch.control-center.campaign.v1')} onRetry={noop} />);
    expect(html).toContain('nightwatch.control-center.campaign.v1');
    expect(html).toContain('contract mismatch');
    expect(html).toContain('Retrying cannot succeed');
    expect(html).not.toContain('Try again');
  });

  it('presents a deliberate 404 as a capability that is not enabled, not an outage', () => {
    const html = htmlOf(<ErrorState error={new ControlCenterApiError('HTTP', 404)} onRetry={noop} />);
    expect(html).toContain('not enabled');
    expect(html).toContain('configuration');
    expect(html).toContain('data-error-status="404"');
    expect(html).not.toContain('Try again');
  });

  it('renders no server-supplied message, stack, header or path in any failure state', () => {
    const sentinels = ['SENTINEL_SERVER_MESSAGE', 'SENTINEL_STACK', 'x-nightwatch-error', '/etc/nightwatch/secret-path.php'];
    for (const view of FAILURE_VIEWS) {
      for (const kind of API_ERROR_KINDS) {
        const html = view.render(kindCase(kind));
        for (const sentinel of sentinels) {
          expect(html, `${view.name}/${kind} rendered ${sentinel}`).not.toContain(sentinel);
        }
        expect(html, `${view.name}/${kind} rendered a URL`).not.toMatch(/https?:\/\//);
      }
    }
  });

  it('renders the successful source and names the failed one in a partial composition', () => {
    const summary = generatedFor('CampaignSummarySnapshot').value as unknown as CampaignSummarySnapshot;
    const coverage = generatedFor('CampaignCoverageSnapshot').value as unknown as CampaignCoverageSnapshot;
    const coverageFailure = new ControlCenterApiError('INVALID_RESPONSE', null, 'nightwatch.control-center.campaign-coverage.v1');
    const summaryHtml = htmlOf(<CampaignView summaryState={{ kind: 'ready', data: summary }} coverageState={{ kind: 'error', error: coverageFailure }} onRetry={noop} />);
    expect(summaryHtml).toContain('Campaign coverage unavailable');
    expect(summaryHtml).toContain('nightwatch.control-center.campaign-coverage.v1');
    expect(summaryHtml).toContain(`data-status-value="${summary.planState}"`);
    expect(summaryHtml).not.toContain('Contract-stage coverage');

    const summaryFailure = new ControlCenterApiError('TIMEOUT');
    const coverageHtml = htmlOf(<CampaignView summaryState={{ kind: 'error', error: summaryFailure }} coverageState={{ kind: 'ready', data: coverage }} onRetry={noop} />);
    expect(coverageHtml).toContain('Campaign summary unavailable');
    expect(coverageHtml).toContain('Failure class: Timeout');
    expect(coverageHtml).toContain('Try again');
    expect(coverageHtml).toContain('Contract-stage coverage');
  });

  it('reserves the Campaign whole-view error for the case where nothing answered', () => {
    const error = new ControlCenterApiError('TIMEOUT');
    const total = htmlOf(<CampaignView summaryState={{ kind: 'error', error }} coverageState={{ kind: 'error', error }} onRetry={noop} />);
    expect(total).toContain('Campaign intelligence unavailable');
    expect(total).toContain('data-error-kind="TIMEOUT"');
    expect(total).not.toContain('Campaign summary unavailable');
    expect(total).not.toContain('Campaign coverage unavailable');
  });

  it('renders the successful Overview sources and names each failed source', () => {
    const health = generatedFor('HealthSnapshot').value as unknown as HealthSnapshot;
    const sources: OverviewSourceStates = {
      health: { kind: 'ready', data: health },
      meta: { kind: 'error', error: new ControlCenterApiError('TIMEOUT') },
      readiness: { kind: 'error', error: new ControlCenterApiError('INVALID_RESPONSE', null, 'nightwatch.control-center.readiness.v1') },
      safety: { kind: 'idle' },
      source: { kind: 'idle' },
    };
    const html = htmlOf(<OverviewPartialView sources={sources} onRefresh={noop} />);
    expect(html).toContain('Partial snapshot');
    expect(html).toContain('Service meta unavailable');
    expect(html).toContain('Readiness unavailable');
    expect(html).toContain('nightwatch.control-center.readiness.v1');
    // The successful health source still renders its data.
    expect(html).toContain(`data-status-value="${health.status}"`);
  });

  it('mutation proof: a collapsed generic error state fails naming the view and the conflated kinds', () => {
    const collapsed = new Map(API_ERROR_KINDS.map((kind) => [kind, '<div class="state-panel state-panel-error" role="alert"></div>']));
    const violations = differentialViolations('campaigns', collapsed, ERROR_KIND_EXEMPTIONS).join('\n');
    expect(violations).toContain('campaigns');
    for (const kind of API_ERROR_KINDS) expect(violations, `the conflation does not name ${kind}`).toContain(kind);
    // Ten pairs among five kinds, each reported.
    expect(differentialViolations('campaigns', collapsed, ERROR_KIND_EXEMPTIONS)).toHaveLength(10);
  });

  it('mutation proof: an exemption for a pair that renders differently fails as stale', () => {
    const different = new Map<string, string>([['NETWORK', '<div>network</div>'], ['TIMEOUT', '<div>timeout</div>']]);
    const stale = differentialViolations('runs', different, { 'NETWORK|TIMEOUT': 'claimed to render identically' });
    expect(stale).toHaveLength(1);
    expect(stale[0]).toContain('runs');
    expect(stale[0]).toContain('NETWORK|TIMEOUT');
    expect(stale[0]).toContain('stale');
  });

  it('keeps the system-map harness exclusion honest in both directions', () => {
    const systemMap = readFileSync(resolve(process.cwd(), 'src/views/SystemMapView.tsx'), 'utf8');
    // If the concurrent system-map change lands the taxonomy in its error
    // state, this exclusion is stale and must be removed, not left to shrink
    // the failure matrix silently.
    expect(systemMap, 'system-map now carries the error taxonomy; remove HARNESS_VIEW_EXCLUSIONS and add the view to FAILURE_VIEWS').not.toMatch(/data-error-kind|describeApiError|toApiErrorInfo/);
    expect(HARNESS_VIEW_EXCLUSIONS['system-map']?.length ?? 0).toBeGreaterThan(20);
  });
});
