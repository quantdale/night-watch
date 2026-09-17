// ---------------------------------------------------------------------------
// NW-PROJ-010 (Wave 2, stage 1) — static test-oracle quality classification.
//
// One question, answered mechanically and statically: does a test file's test
// method provide real oracle quality for a declared production symbol, or only
// an assurance-shaped surface (mirror, skip, early return, empty assertions)?
//
// Stage 1 boundary (permanent): NO product test executes, no product source is
// mutated, no live infrastructure is contacted. The output is an
// ASSURANCE-GAP ARTIFACT, never a defect finding.
//
// Linkage rule: the production symbol must be DECLARED (owner declaration);
// method-name similarity, comments, and shared literals are never evidence.
// The PHP tokenizer drops comments, so a symbol named only in documentation
// cannot be mistaken for an invocation.
// ---------------------------------------------------------------------------

import { prefixedDigest24 } from '../identity/canonicalDigest';
import type { RealSourceCurrentness, RealSourceReader } from '../../oracles/expectations/recipes/types';
import { tokenizePhp, type PhpToken } from '../../oracles/expectations/extract/php';
import { approvedRootsFor } from './universe';

export const TEST_ORACLE_QUALITY_SCHEMA = 'nightwatch.test-oracle-quality.v1' as const;
export const TEST_ASSURANCE_REPORT_SCHEMA = 'nightwatch.test-assurance-report.v1' as const;

export const MAX_TEST_ORACLE_TARGETS = 16;
export const MAX_TEST_ORACLE_SKIPS = 64;
export const MAX_TEST_ORACLE_FILE_CHARS = 256_000;
export const MAX_TEST_ORACLE_METHODS = 64;

export const TEST_ORACLE_CLASSIFICATIONS = [
  'DEFECT_ORACLE_PROVEN',
  'EXECUTING_BUT_ORACLE_UNPROVEN',
  'MIRROR_ONLY',
  'DECLARED_SKIP',
  'UNDECLARED_SKIP',
  'EARLY_RETURN_DISABLED',
  'ASSERTION_SURFACE_ABSENT',
  'LIVE_INFRA_DEPENDENCY',
  'HELPER_OR_FIXTURE_ONLY',
  'CLASSIFICATION_AMBIGUOUS',
] as const;
export type TestOracleClassification = (typeof TEST_ORACLE_CLASSIFICATIONS)[number];

export const TEST_ORACLE_REASON_CODES = [
  'SKIP_MARKER_DECLARED',
  'SKIP_MARKER_UNDECLARED',
  'EARLY_RETURN_FIRST_STATEMENT',
  'NO_ASSERTION_SURFACE',
  'LIVE_INFRA_TOKEN',
  'PRODUCTION_SYMBOL_INVOKED',
  'PRODUCTION_SYMBOL_IN_ASSERTION',
  'MIRROR_WITHOUT_PRODUCTION_SYMBOL',
  'HELPER_ONLY_FILE',
  'PARSE_LIMIT',
  'NO_TEST_METHODS',
] as const;
export type TestOracleReasonCode = (typeof TEST_ORACLE_REASON_CODES)[number];

const REPO_PATH_RE = /^[A-Za-z0-9_-]+(?:\/[A-Za-z0-9_.-]+)*$/;
const SYMBOL_RE = /^[A-Za-z_][A-Za-z0-9_]{0,127}$/;
const SHA_RE = /^[0-9a-f]{40}$/;
const ASSERTION_PREFIX = 'assert';
const EXTRA_ASSERTION_TOKENS = ['expectException', 'expectOutputString', 'expectOutputRegex', 'expectExceptionMessage'];
const LIVE_INFRA_TOKENS = ['Redis', 'DynamoDbClient', 'DynamoDb', 'S3Client', 'Ec2Client', 'MongoClient', 'PDO', 'mysqli', 'GuzzleHttp'];
const SKIP_MARKERS = ['markTestIncomplete', 'markTestSkipped'];

export interface TestOracleTarget {
  readonly repoId: string;
  readonly sha: string;
  readonly path: string;
  readonly declaredProductionSymbols: readonly string[];
}

export interface TestOracleDeclaredSkip {
  readonly path: string;
  readonly symbol: string;
  readonly reason: string;
}

export interface TestOracleQualityConfig {
  readonly schemaVersion: typeof TEST_ORACLE_QUALITY_SCHEMA;
  readonly targets: readonly TestOracleTarget[];
  readonly declaredSkips: readonly TestOracleDeclaredSkip[];
}

export type TestOracleQualityValidation =
  | { readonly ok: true; readonly config: TestOracleQualityConfig }
  | { readonly ok: false; readonly failure: 'DECLARATION_INVALID'; readonly detail: string };

export interface TestOracleMethodRow {
  readonly symbol: string;
  readonly classification: TestOracleClassification;
  readonly reasonCodes: readonly TestOracleReasonCode[];
}

export interface TestOracleTargetReport {
  readonly repoId: string;
  readonly sha: string;
  readonly snapshotSha: string | null;
  readonly path: string;
  readonly declaredProductionSymbols: readonly string[];
  readonly verdict: TestOracleClassification | 'SOURCE_STALE' | 'SOURCE_UNAVAILABLE' | 'DECLARATION_INVALID';
  readonly methods: readonly TestOracleMethodRow[];
}

export interface TestAssuranceReport {
  readonly schemaVersion: typeof TEST_ASSURANCE_REPORT_SCHEMA;
  readonly finding: 'NONE';
  readonly assuranceGapOnly: true;
  readonly targets: readonly TestOracleTargetReport[];
  readonly reportDigest: string;
}

const CLASS_CONCERN: Readonly<Record<TestOracleClassification, number>> = Object.freeze({
  CLASSIFICATION_AMBIGUOUS: 0,
  EARLY_RETURN_DISABLED: 1,
  UNDECLARED_SKIP: 2,
  ASSERTION_SURFACE_ABSENT: 3,
  MIRROR_ONLY: 4,
  LIVE_INFRA_DEPENDENCY: 5,
  EXECUTING_BUT_ORACLE_UNPROVEN: 6,
  DECLARED_SKIP: 7,
  DEFECT_ORACLE_PROVEN: 8,
  HELPER_OR_FIXTURE_ONLY: 9,
});

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  return Object.keys(value).length === keys.length && keys.every((key) => Object.prototype.hasOwnProperty.call(value, key));
}

function isStringArray(value: unknown, max: number): value is readonly string[] {
  return Array.isArray(value) && value.length <= max && value.every((entry) => typeof entry === 'string') && new Set(value).size === value.length;
}

function pathUnderApprovedRoot(path: string): boolean {
  const separator = path.indexOf('/');
  const root = separator === -1 ? path : path.slice(0, separator);
  for (const repoId of ['mobingilabs/ripple-api', 'mobingilabs/wave-api']) {
    const roots = approvedRootsFor(repoId);
    if (roots !== null && roots.includes(root)) return true;
  }
  return false;
}

function validateTarget(value: unknown): value is TestOracleTarget {
  if (!isRecord(value) || !hasExactKeys(value, ['repoId', 'sha', 'path', 'declaredProductionSymbols'])) return false;
  if (typeof value.repoId !== 'string' || approvedRootsFor(value.repoId) === null) return false;
  if (typeof value.sha !== 'string' || !SHA_RE.test(value.sha)) return false;
  if (typeof value.path !== 'string' || value.path.length > 240 || !REPO_PATH_RE.test(value.path)) return false;
  if (!value.path.split('/').every((segment) => segment !== '.' && segment !== '..')) return false;
  if (!pathUnderApprovedRoot(value.path)) return false;
  const symbols = value.declaredProductionSymbols;
  if (!isStringArray(symbols, 8)) return false;
  return symbols.every((symbol) => SYMBOL_RE.test(symbol));
}

function validateSkip(value: unknown): value is TestOracleDeclaredSkip {
  if (!isRecord(value) || !hasExactKeys(value, ['path', 'symbol', 'reason'])) return false;
  if (typeof value.path !== 'string' || value.path.length > 240 || !REPO_PATH_RE.test(value.path) || !pathUnderApprovedRoot(value.path)) return false;
  if (typeof value.symbol !== 'string' || !SYMBOL_RE.test(value.symbol)) return false;
  return typeof value.reason === 'string' && value.reason.length > 0 && value.reason.length <= 200;
}

/** Strict validation of the declared test-oracle quality configuration. */
export function validateTestOracleQualityConfig(input: unknown): TestOracleQualityValidation {
  if (!isRecord(input) || !hasExactKeys(input, ['schemaVersion', 'targets', 'declaredSkips'])) {
    return { ok: false, failure: 'DECLARATION_INVALID', detail: 'CONFIG_SHAPE' };
  }
  if (input.schemaVersion !== TEST_ORACLE_QUALITY_SCHEMA) return { ok: false, failure: 'DECLARATION_INVALID', detail: 'SCHEMA_VERSION' };
  if (!Array.isArray(input.targets) || input.targets.length === 0 || input.targets.length > MAX_TEST_ORACLE_TARGETS) {
    return { ok: false, failure: 'DECLARATION_INVALID', detail: 'TARGET_COUNT' };
  }
  if (!input.targets.every(validateTarget)) return { ok: false, failure: 'DECLARATION_INVALID', detail: 'TARGET_SHAPE' };
  if (!Array.isArray(input.declaredSkips) || input.declaredSkips.length > MAX_TEST_ORACLE_SKIPS) {
    return { ok: false, failure: 'DECLARATION_INVALID', detail: 'SKIP_COUNT' };
  }
  if (!input.declaredSkips.every(validateSkip)) return { ok: false, failure: 'DECLARATION_INVALID', detail: 'SKIP_SHAPE' };
  return {
    ok: true,
    config: {
      schemaVersion: TEST_ORACLE_QUALITY_SCHEMA,
      targets: [...(input.targets as TestOracleTarget[])].sort((left, right) => (left.path < right.path ? -1 : left.path > right.path ? 1 : 0)),
      declaredSkips: [...(input.declaredSkips as TestOracleDeclaredSkip[])].sort((left, right) => {
        const leftKey = `${left.path}|${left.symbol}`;
        const rightKey = `${right.path}|${right.symbol}`;
        return leftKey < rightKey ? -1 : leftKey > rightKey ? 1 : 0;
      }),
    },
  };
}

function findMethodBodies(tokens: readonly PhpToken[]): { symbol: string; start: number; end: number }[] {
  const found: { symbol: string; start: number; end: number }[] = [];
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index]!;
    if (token.t !== 'WORD' || token.v !== 'function') continue;
    const name = tokens[index + 1];
    if (name === undefined || name.t !== 'WORD') continue;
    let open = index + 2;
    if (tokens[open] === undefined || tokens[open]!.t !== 'PUNCT' || tokens[open]!.v !== '(') continue;
    let depth = 0;
    for (; open < tokens.length; open += 1) {
      if (tokens[open]!.v === '(') depth += 1;
      if (tokens[open]!.v === ')') {
        depth -= 1;
        if (depth === 0) { open += 1; break; }
      }
    }
    let brace = -1;
    for (let scan = open; scan < Math.min(tokens.length, open + 16); scan += 1) {
      if (tokens[scan]!.t === 'PUNCT' && tokens[scan]!.v === '{') { brace = scan; break; }
    }
    if (brace === -1) continue;
    depth = 0;
    for (let scan = brace; scan < tokens.length; scan += 1) {
      if (tokens[scan]!.t === 'PUNCT' && tokens[scan]!.v === '{') depth += 1;
      if (tokens[scan]!.t === 'PUNCT' && tokens[scan]!.v === '}') {
        depth -= 1;
        if (depth === 0) {
          found.push({ symbol: name.v, start: brace, end: scan });
          index = scan;
          break;
        }
      }
    }
  }
  return found;
}

interface MethodSignals {
  readonly skipMarker: boolean;
  readonly earlyReturn: boolean;
  readonly assertions: number;
  readonly liveInfra: boolean;
  readonly productionInvoked: boolean;
  readonly productionInAssertion: boolean;
}

function analyzeMethodBody(body: readonly PhpToken[], productionSymbols: readonly string[]): MethodSignals {
  let skipMarker = false;
  let assertions = 0;
  let liveInfra = false;
  let productionInvoked = false;
  let productionInAssertion = false;
  const inside = body.slice(1, -1);
  // First-statement return: the first meaningful token inside the body.
  const first = inside.find((token) => token.t !== 'PUNCT' || (token.v !== '{' && token.v !== '}'));
  const earlyReturn = first !== undefined && first.t === 'WORD' && first.v === 'return';
  let statementHasAssertion = false;
  let statementHasProduction = false;
  const flushStatement = (): void => {
    if (statementHasAssertion && statementHasProduction) productionInAssertion = true;
    statementHasAssertion = false;
    statementHasProduction = false;
  };
  for (const token of inside) {
    if (token.t === 'PUNCT' && token.v === ';') {
      flushStatement();
      continue;
    }
    if (token.t !== 'WORD') continue;
    if (SKIP_MARKERS.includes(token.v)) skipMarker = true;
    if (LIVE_INFRA_TOKENS.includes(token.v)) liveInfra = true;
    const isAssertion = token.v.startsWith(ASSERTION_PREFIX) || EXTRA_ASSERTION_TOKENS.includes(token.v);
    if (isAssertion) {
      assertions += 1;
      statementHasAssertion = true;
      continue;
    }
    if (productionSymbols.includes(token.v)) {
      productionInvoked = true;
      statementHasProduction = true;
    }
  }
  flushStatement();
  return { skipMarker, earlyReturn, assertions, liveInfra, productionInvoked, productionInAssertion };
}

/** Classify the test methods of one PHP test file, statically. */
export function classifyPhpTestFile(
  source: string,
  options: { readonly path: string; readonly declaredProductionSymbols: readonly string[]; readonly declaredSkips: readonly TestOracleDeclaredSkip[] },
): { readonly rows: readonly TestOracleMethodRow[]; readonly ambiguous: boolean } {
  if (source.length > MAX_TEST_ORACLE_FILE_CHARS) {
    return {
      rows: [{ symbol: '', classification: 'CLASSIFICATION_AMBIGUOUS', reasonCodes: ['PARSE_LIMIT'] }],
      ambiguous: true,
    };
  }
  const tokens = tokenizePhp(source);
  const methods = findMethodBodies(tokens);
  const testMethods = methods.filter((method) => /^test/i.test(method.symbol));
  if (testMethods.length === 0) {
    const rows: TestOracleMethodRow[] = methods.length === 0
      ? [{ symbol: '', classification: 'CLASSIFICATION_AMBIGUOUS', reasonCodes: ['NO_TEST_METHODS'] }]
      : [{ symbol: methods[0]!.symbol, classification: 'HELPER_OR_FIXTURE_ONLY', reasonCodes: ['HELPER_ONLY_FILE'] }];
    return { rows, ambiguous: methods.length === 0 };
  }
  const rows: TestOracleMethodRow[] = [];
  for (const method of testMethods.slice(0, MAX_TEST_ORACLE_METHODS)) {
    const body = tokens.slice(method.start, method.end + 1);
    const signals = analyzeMethodBody(body, options.declaredProductionSymbols);
    const declaredSkip = options.declaredSkips.some((skip) => skip.path === options.path && skip.symbol === method.symbol);
    let classification: TestOracleClassification;
    let reasonCodes: TestOracleReasonCode[];
    if (declaredSkip) {
      classification = 'DECLARED_SKIP';
      reasonCodes = ['SKIP_MARKER_DECLARED'];
    } else if (signals.skipMarker) {
      classification = 'UNDECLARED_SKIP';
      reasonCodes = ['SKIP_MARKER_UNDECLARED'];
    } else if (signals.earlyReturn) {
      classification = 'EARLY_RETURN_DISABLED';
      reasonCodes = ['EARLY_RETURN_FIRST_STATEMENT'];
    } else if (signals.assertions === 0) {
      classification = 'ASSERTION_SURFACE_ABSENT';
      reasonCodes = ['NO_ASSERTION_SURFACE'];
    } else if (signals.liveInfra) {
      classification = 'LIVE_INFRA_DEPENDENCY';
      reasonCodes = ['LIVE_INFRA_TOKEN'];
    } else if (options.declaredProductionSymbols.length > 0) {
      if (signals.productionInAssertion) {
        classification = 'DEFECT_ORACLE_PROVEN';
        reasonCodes = ['PRODUCTION_SYMBOL_IN_ASSERTION'];
      } else if (signals.productionInvoked) {
        classification = 'EXECUTING_BUT_ORACLE_UNPROVEN';
        reasonCodes = ['PRODUCTION_SYMBOL_INVOKED'];
      } else {
        classification = 'MIRROR_ONLY';
        reasonCodes = ['MIRROR_WITHOUT_PRODUCTION_SYMBOL'];
      }
    } else {
      classification = 'EXECUTING_BUT_ORACLE_UNPROVEN';
      reasonCodes = ['PRODUCTION_SYMBOL_INVOKED'];
    }
    rows.push({ symbol: method.symbol, classification, reasonCodes });
  }
  return { rows, ambiguous: false };
}

function fileVerdict(rows: readonly TestOracleMethodRow[]): TestOracleClassification {
  return rows.reduce(
    (worst, row) => (CLASS_CONCERN[row.classification] < CLASS_CONCERN[worst] ? row.classification : worst),
    'HELPER_OR_FIXTURE_ONLY' as TestOracleClassification,
  );
}

/** Sanitized assurance-gap report over the declared targets. */
export function runTestOracleQuality(input: {
  readonly config: unknown;
  readonly reader: RealSourceReader;
  readonly currentness: RealSourceCurrentness;
}): TestAssuranceReport {
  const validation = validateTestOracleQualityConfig(input.config);
  const targets: readonly TestOracleTargetReport[] = validation.ok
    ? validation.config.targets.map((target) => {
        const snapshot = input.currentness.currentSnapshot(target.repoId);
        if (snapshot === null || !/^[0-9a-f]{40}$/.test(snapshot.sha)) {
          return { repoId: target.repoId, sha: target.sha, snapshotSha: null, path: target.path, declaredProductionSymbols: target.declaredProductionSymbols, verdict: 'SOURCE_UNAVAILABLE' as const, methods: [] };
        }
        if (snapshot.sha !== target.sha) {
          return { repoId: target.repoId, sha: target.sha, snapshotSha: snapshot.sha, path: target.path, declaredProductionSymbols: target.declaredProductionSymbols, verdict: 'SOURCE_STALE' as const, methods: [] };
        }
        const source = input.reader.readFile(target.repoId, target.path);
        if (source === null) {
          return { repoId: target.repoId, sha: target.sha, snapshotSha: snapshot.sha, path: target.path, declaredProductionSymbols: target.declaredProductionSymbols, verdict: 'SOURCE_UNAVAILABLE' as const, methods: [] };
        }
        const classified = classifyPhpTestFile(source, {
          path: target.path,
          declaredProductionSymbols: target.declaredProductionSymbols,
          declaredSkips: validation.config.declaredSkips,
        });
        return {
          repoId: target.repoId,
          sha: target.sha,
          snapshotSha: snapshot.sha,
          path: target.path,
          declaredProductionSymbols: target.declaredProductionSymbols,
          verdict: fileVerdict(classified.rows),
          methods: classified.rows,
        };
      })
    : [{
        repoId: '',
        sha: '',
        snapshotSha: null,
        path: '',
        declaredProductionSymbols: [],
        verdict: 'DECLARATION_INVALID' as const,
        methods: [],
      }];
  const report = {
    schemaVersion: TEST_ASSURANCE_REPORT_SCHEMA,
    finding: 'NONE' as const,
    assuranceGapOnly: true as const,
    targets,
  };
  return { ...report, reportDigest: prefixedDigest24('tqa', report) };
}
