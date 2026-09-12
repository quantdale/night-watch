// F-11 / group 9 — dependency and supply-chain currency, LOCAL ONLY.
//
// This module is pure: no filesystem, process, network, Git or clock
// authority. The caller supplies the versioned record, the observed runtime,
// the tracked sources and governed documents, and the current date. Every
// judgement that would otherwise be prose is derived from those inputs:
//
//   1. the EOL Vue fixture's three mechanically checkable review conditions:
//      call-site count, literal-only template content, and declared
//      `require.resolve` specifier resolvability (DEF-FC-03);
//   2. the online advisory lane's UNAVAILABLE state — no current-answer
//      document (README.md or a CURRENT_TRUTH document) may state or imply a
//      clean dependency result while no scan ran; append-only historical
//      archives are not judged as current truth;
//   3. the fixture review date carried with an interval, so an elapsed review
//      is reported rather than remembered;
//   4. the declared `engines.node` range separated from the qualified points,
//      so an unqualified runtime is reported instead of inheriting a pass;
//   5. the disposable `npm ci --offline` lockfile verification, re-dated at
//      each checkpoint, so a stale date or a drifted lockfile fails.
//
// `bin/project-state-check.mjs` performs the I/O and feeds the release
// certification condition `dependency-supply-chain-currency`. Tests exercise
// this module directly; `tests/unit/nw14HostCapabilityMatrix.test.ts` holds
// the live-record and negative-probe cases.

export const DEPENDENCY_CURRENCY_VERSION = 'nightwatch.dependency-currency.v1' as const;
export const DEPENDENCY_CURRENCY_RECORD_PATH = 'config/dependency-currency.v1.json' as const;

export interface DependencyCurrencyFinding {
  readonly code: string;
  readonly detail: string;
}

export interface SourceDocument {
  readonly path: string;
  readonly text: string;
}

export interface QualifiedOs {
  readonly platform: string;
  readonly arch: string;
  readonly kernelMarker: string;
}

export interface RuntimeRecord {
  readonly declaredRange: string;
  readonly qualifiedNode: readonly string[];
  readonly qualifiedOs: QualifiedOs;
}

export interface VueReviewRecord {
  readonly dependency: string;
  readonly version: string;
  readonly fixturePath: string;
  readonly specifier: string;
  readonly reviewDate: string;
  readonly reviewIntervalDays: number;
}

export interface LockfileVerificationRecord {
  readonly command: string;
  readonly date: string;
  readonly intervalDays: number;
  readonly result: string;
  readonly lockfileSha256: string;
}

export interface DependencyCurrencyRecord {
  readonly advisoryLaneId: string;
  readonly runtime: RuntimeRecord;
  readonly vueReview: VueReviewRecord;
  readonly lockfileVerification: LockfileVerificationRecord;
}

export interface DependencyCurrencyProbe {
  readonly id: string;
  readonly target: string;
  readonly expectedFinding: string;
}

export interface RuntimeObservation {
  readonly nodeVersion: string;
  readonly platform: string;
  readonly arch: string;
  readonly kernelRelease: string;
}

export type RuntimeQualificationState = 'QUALIFIED' | 'UNQUALIFIED_RUNTIME' | 'UNQUALIFIED_OS';

export interface RuntimeQualification {
  readonly state: RuntimeQualificationState;
  readonly detail: string;
}

export interface DependencyReviewDue {
  readonly id: string;
  readonly dueDate: string;
  readonly reviewDate: string;
  readonly intervalDays: number;
  readonly condition: string;
}

export interface DependencyCurrencyInput {
  readonly record: unknown;
  readonly today: string;
  readonly packageJson: {
    readonly dependencies?: Readonly<Record<string, string>>;
    readonly devDependencies?: Readonly<Record<string, string>>;
    readonly engines?: { readonly node?: string };
  };
  readonly sources: readonly SourceDocument[];
  readonly documents: readonly SourceDocument[];
  readonly matrixText: string;
  readonly observed: RuntimeObservation;
  readonly observedLockfileSha256: string | null;
  readonly advisoryLaneClass: string;
  readonly resolveSpecifier: (specifier: string) => boolean;
}

export interface DependencyCurrencyResult {
  readonly ok: boolean;
  readonly findings: readonly DependencyCurrencyFinding[];
  readonly runtimeQualification: RuntimeQualification | null;
  readonly vueReviewDue: boolean;
  readonly vueReviewDueDate: string | null;
  readonly lockfileVerificationDueDate: string | null;
}

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const LITERAL_STRING_RE = /^(?:'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|`[^`$]*`)$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function asPositiveInt(value: unknown): number | null {
  return typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : null;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Days since the Unix epoch for a strict `YYYY-MM-DD` date, or null. */
function daysSinceEpoch(date: string): number | null {
  const match = DATE_RE.exec(date);
  if (match === null) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const milliseconds = Date.UTC(year, month - 1, day);
  const check = new Date(milliseconds);
  if (check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) return null;
  return Math.floor(milliseconds / 86_400_000);
}

/** `date + intervalDays` rendered as `YYYY-MM-DD`, or null on a bad date. */
export function computeDueDate(date: string, intervalDays: number): string | null {
  const base = daysSinceEpoch(date);
  if (base === null || !Number.isInteger(intervalDays) || intervalDays <= 0) return null;
  const result = new Date((base + intervalDays) * 86_400_000);
  const year = result.getUTCFullYear();
  const month = String(result.getUTCMonth() + 1).padStart(2, '0');
  const day = String(result.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function lineOf(text: string, index: number): number {
  let line = 1;
  for (let cursor = 0; cursor < index && cursor < text.length; cursor += 1) {
    if (text[cursor] === '\n') line += 1;
  }
  return line;
}

/**
 * Blank out comments while preserving line structure. String literals are
 * kept intact, because the specifier under inspection is itself a string
 * literal; only comments can carry a look-alike that must not count.
 */
export function stripComments(text: string): string {
  let output = '';
  let index = 0;
  let quote: string | null = null;
  while (index < text.length) {
    const character = text[index] ?? '';
    if (quote !== null) {
      output += character;
      if (character === '\\') {
        output += text[index + 1] ?? '';
        index += 2;
        continue;
      }
      if (character === quote) quote = null;
      index += 1;
      continue;
    }
    if (character === "'" || character === '"' || character === '`') {
      quote = character;
      output += character;
      index += 1;
      continue;
    }
    if (character === '/' && text[index + 1] === '/') {
      const end = text.indexOf('\n', index);
      index = end === -1 ? text.length : end;
      continue;
    }
    if (character === '/' && text[index + 1] === '*') {
      const end = text.indexOf('*/', index + 2);
      const stop = end === -1 ? text.length : end + 2;
      output += text.slice(index, stop).replace(/[^\n]/g, ' ');
      index = stop;
      continue;
    }
    output += character;
    index += 1;
  }
  return output;
}

/** Parse the versioned record, failing closed on any malformed field. */
export function parseDependencyCurrencyRecord(raw: unknown): {
  readonly ok: boolean;
  readonly record: DependencyCurrencyRecord | null;
  readonly probes: readonly DependencyCurrencyProbe[];
  readonly findings: readonly DependencyCurrencyFinding[];
} {
  const findings: DependencyCurrencyFinding[] = [];
  if (!isRecord(raw)) {
    return { ok: false, record: null, probes: [], findings: [{ code: 'DEPENDENCY_RECORD_INVALID', detail: 'the dependency-currency record is not an object' }] };
  }
  if (raw.schemaVersion !== DEPENDENCY_CURRENCY_VERSION) {
    findings.push({ code: 'DEPENDENCY_RECORD_SCHEMA_UNSUPPORTED', detail: String(raw.schemaVersion ?? 'ABSENT') });
  }
  const advisoryLaneId = asString(raw.advisoryLaneId);
  if (advisoryLaneId === null) findings.push({ code: 'DEPENDENCY_RECORD_INVALID', detail: 'advisoryLaneId is missing' });

  const runtimeRaw = isRecord(raw.runtime) ? raw.runtime : null;
  const qualifiedOsRaw = runtimeRaw !== null && isRecord(runtimeRaw.qualifiedOs) ? runtimeRaw.qualifiedOs : null;
  const declaredRange = runtimeRaw === null ? null : asString(runtimeRaw.declaredRange);
  const qualifiedNode = runtimeRaw !== null && Array.isArray(runtimeRaw.qualifiedNode)
    ? runtimeRaw.qualifiedNode.filter((entry): entry is string => typeof entry === 'string' && entry.length > 0)
    : [];
  const qualifiedOs = qualifiedOsRaw === null
    ? null
    : {
        platform: asString(qualifiedOsRaw.platform),
        arch: asString(qualifiedOsRaw.arch),
        kernelMarker: asString(qualifiedOsRaw.kernelMarker),
      };
  if (declaredRange === null) findings.push({ code: 'DEPENDENCY_RECORD_INVALID', detail: 'runtime.declaredRange is missing' });
  if (qualifiedNode.length === 0) findings.push({ code: 'DEPENDENCY_RECORD_INVALID', detail: 'runtime.qualifiedNode declares no point' });
  if (qualifiedOs === null || qualifiedOs.platform === null || qualifiedOs.arch === null || qualifiedOs.kernelMarker === null) {
    findings.push({ code: 'DEPENDENCY_RECORD_INVALID', detail: 'runtime.qualifiedOs is incomplete' });
  }

  const vueRaw = isRecord(raw.vueReview) ? raw.vueReview : null;
  const dependency = vueRaw === null ? null : asString(vueRaw.dependency);
  const version = vueRaw === null ? null : asString(vueRaw.version);
  const fixturePath = vueRaw === null ? null : asString(vueRaw.fixturePath);
  const specifier = vueRaw === null ? null : asString(vueRaw.specifier);
  const reviewDate = vueRaw === null ? null : asString(vueRaw.reviewDate);
  const reviewIntervalDays = vueRaw === null ? null : asPositiveInt(vueRaw.reviewIntervalDays);
  if (dependency === null || version === null || fixturePath === null || specifier === null) {
    findings.push({ code: 'DEPENDENCY_RECORD_INVALID', detail: 'vueReview is incomplete' });
  }
  if (reviewDate === null || daysSinceEpoch(reviewDate) === null) findings.push({ code: 'DEPENDENCY_RECORD_INVALID', detail: `vueReview.reviewDate is invalid: ${String(reviewDate)}` });
  if (reviewIntervalDays === null) findings.push({ code: 'DEPENDENCY_RECORD_INVALID', detail: 'vueReview.reviewIntervalDays is not a positive integer' });

  const lockfileRaw = isRecord(raw.lockfileVerification) ? raw.lockfileVerification : null;
  const command = lockfileRaw === null ? null : asString(lockfileRaw.command);
  const lockfileDate = lockfileRaw === null ? null : asString(lockfileRaw.date);
  const lockfileIntervalDays = lockfileRaw === null ? null : asPositiveInt(lockfileRaw.intervalDays);
  const result = lockfileRaw === null ? null : asString(lockfileRaw.result);
  const lockfileSha256 = lockfileRaw === null ? null : asString(lockfileRaw.lockfileSha256);
  if (command === null || result === null) findings.push({ code: 'DEPENDENCY_RECORD_INVALID', detail: 'lockfileVerification command/result is missing' });
  if (lockfileDate === null || daysSinceEpoch(lockfileDate) === null) findings.push({ code: 'DEPENDENCY_RECORD_INVALID', detail: `lockfileVerification.date is invalid: ${String(lockfileDate)}` });
  if (lockfileIntervalDays === null) findings.push({ code: 'DEPENDENCY_RECORD_INVALID', detail: 'lockfileVerification.intervalDays is not a positive integer' });
  if (lockfileSha256 === null || !/^sha256:[0-9a-f]{64}$/.test(lockfileSha256)) findings.push({ code: 'DEPENDENCY_RECORD_INVALID', detail: `lockfileVerification.lockfileSha256 is invalid: ${String(lockfileSha256)}` });

  const probes: DependencyCurrencyProbe[] = [];
  if (Array.isArray(raw.probes)) {
    for (const entry of raw.probes) {
      if (!isRecord(entry)) continue;
      const id = asString(entry.id);
      const target = asString(entry.target);
      const expectedFinding = asString(entry.expectedFinding);
      if (id !== null && target !== null && expectedFinding !== null) probes.push({ id, target, expectedFinding });
    }
  }
  if (probes.length === 0) findings.push({ code: 'DEPENDENCY_RECORD_PROBES_MISSING', detail: 'the record registers no negative probe' });

  if (
    findings.length > 0
    || advisoryLaneId === null
    || declaredRange === null
    || qualifiedOs === null
    || qualifiedOs.platform === null
    || qualifiedOs.arch === null
    || qualifiedOs.kernelMarker === null
    || dependency === null || version === null || fixturePath === null || specifier === null
    || reviewDate === null || reviewIntervalDays === null
    || command === null || lockfileDate === null || lockfileIntervalDays === null || result === null || lockfileSha256 === null
  ) {
    return { ok: false, record: null, probes, findings };
  }
  return {
    ok: true,
    record: {
      advisoryLaneId,
      runtime: {
        declaredRange,
        qualifiedNode,
        qualifiedOs: { platform: qualifiedOs.platform, arch: qualifiedOs.arch, kernelMarker: qualifiedOs.kernelMarker },
      },
      vueReview: { dependency, version, fixturePath, specifier, reviewDate, reviewIntervalDays },
      lockfileVerification: { command, date: lockfileDate, intervalDays: lockfileIntervalDays, result, lockfileSha256 },
    },
    probes,
    findings,
  };
}

/** `20.x` matches any 20.* release; `22.22.1` matches that exact release. */
export function nodeVersionMatchesPoint(version: string, point: string): boolean {
  const observed = version.replace(/^v/, '');
  const normalized = point.replace(/^v/, '');
  if (normalized.endsWith('.x')) {
    const major = normalized.slice(0, -2);
    return observed === major || observed.split('.')[0] === major;
  }
  return observed === normalized;
}

/** Declared range vs qualified points: a point the declaration does not own. */
export function qualifyRuntime(runtime: RuntimeRecord, observed: RuntimeObservation): RuntimeQualification {
  const nodeQualified = runtime.qualifiedNode.some((point) => nodeVersionMatchesPoint(observed.nodeVersion, point));
  if (!nodeQualified) {
    return {
      state: 'UNQUALIFIED_RUNTIME',
      detail: `node ${observed.nodeVersion.replace(/^v/, '')} is outside the qualified points [${runtime.qualifiedNode.join(', ')}]; the declared range ${runtime.declaredRange} does not confer qualification`,
    };
  }
  const os = runtime.qualifiedOs;
  if (observed.platform !== os.platform || observed.arch !== os.arch || !observed.kernelRelease.includes(os.kernelMarker)) {
    return {
      state: 'UNQUALIFIED_OS',
      detail: `host ${observed.platform}/${observed.arch} kernel ${observed.kernelRelease} is outside the qualified OS points; the declared range does not confer qualification`,
    };
  }
  return {
    state: 'QUALIFIED',
    detail: `node ${observed.nodeVersion.replace(/^v/, '')} on ${observed.platform}/${observed.arch} (${observed.kernelRelease}) is a qualified point`,
  };
}

interface VueCallSite {
  readonly path: string;
  readonly count: number;
}

function vueCallSites(sources: readonly SourceDocument[], dependency: string, specifier: string): readonly VueCallSite[] {
  const exact = new RegExp(`(?<!['"\`\\w])require\\.resolve\\(\\s*['"]${escapeRegExp(specifier)}['"]\\s*\\)`, 'g');
  const imported = new RegExp(
    `(?:import\\s+(?:[^'"]+\\s+from\\s+)?|require\\s*\\(\\s*|import\\s*\\(\\s*)['"]${escapeRegExp(dependency)}(?:\\/[^'"]*)?['"]`,
    'g',
  );
  const sites: VueCallSite[] = [];
  for (const source of sources) {
    const code = stripComments(source.text);
    const count = [...code.matchAll(exact)].length + [...code.matchAll(imported)].length;
    if (count > 0) sites.push({ path: source.path, count });
  }
  return sites;
}

/** Read the expression starting after `template:` up to its comma or close. */
function readOptionValue(code: string, start: number): string | null {
  let depth = 0;
  let quote: string | null = null;
  let index = start;
  for (; index < code.length; index += 1) {
    const character = code[index] ?? '';
    if (quote !== null) {
      if (character === '\\') {
        index += 1;
        continue;
      }
      if (character === quote) quote = null;
      continue;
    }
    if (character === "'" || character === '"' || character === '`') {
      quote = character;
      continue;
    }
    if (character === '(' || character === '[' || character === '{') depth += 1;
    else if (character === ')' || character === ']') depth -= 1;
    else if (character === '}') {
      if (depth === 0) break;
      depth -= 1;
    } else if (character === ',' && depth === 0) break;
  }
  if (index > code.length) return null;
  return code.slice(start, index);
}

function isLiteralString(value: string): boolean {
  return LITERAL_STRING_RE.test(value.trim());
}

function findTemplateFindings(fixture: SourceDocument): readonly DependencyCurrencyFinding[] {
  const findings: DependencyCurrencyFinding[] = [];
  const code = stripComments(fixture.text);
  for (const match of code.matchAll(/template\s*:/g)) {
    const value = readOptionValue(code, (match.index ?? 0) + match[0].length);
    if (value === null || !isLiteralString(value)) {
      findings.push({
        code: 'DEPENDENCY_VUE_TEMPLATE_NON_LITERAL',
        detail: `${fixture.path}:${lineOf(code, match.index ?? 0)} passes a non-literal value to the Vue template option; the review condition reopens`,
      });
    }
  }
  for (const match of code.matchAll(/Vue\s*\.\s*compile\s*\(/g)) {
    const argument = readOptionValue(code, (match.index ?? 0) + match[0].length);
    if (argument === null || !isLiteralString(argument)) {
      findings.push({
        code: 'DEPENDENCY_VUE_TEMPLATE_NON_LITERAL',
        detail: `${fixture.path}:${lineOf(code, match.index ?? 0)} compiles a Vue template from a non-literal argument; the review condition reopens`,
      });
    }
  }
  return findings;
}

export interface VueReviewInput {
  readonly sources: readonly SourceDocument[];
  readonly dependency: string;
  readonly version: string;
  readonly fixturePath: string;
  readonly specifier: string;
  readonly declaredDependencies: readonly string[];
  readonly resolveSpecifier: (specifier: string) => boolean;
}

/**
 * The three mechanically checkable Vue review conditions. A second call site,
 * a compiled non-literal template, or a removed/undeclared/unresolvable
 * dependency each fail with the review condition named.
 */
export function evaluateVueReviewConditions(input: VueReviewInput): readonly DependencyCurrencyFinding[] {
  const findings: DependencyCurrencyFinding[] = [];
  const declared = new Set(input.declaredDependencies);
  const sites = vueCallSites(input.sources, input.dependency, input.specifier);
  if (sites.length === 0) {
    findings.push({
      code: 'DEPENDENCY_VUE_CALL_SITE_MISSING',
      detail: `no tracked source reaches ${input.dependency}@${input.version} through ${input.specifier}; the reachability argument that retains the EOL fixture no longer holds`,
    });
  } else if (sites.length > 1 || sites.some((site) => site.count > 1)) {
    findings.push({
      code: 'DEPENDENCY_VUE_SECOND_CALL_SITE',
      detail: `${input.dependency}@${input.version} now has ${sites.reduce((total, site) => total + site.count, 0)} call sites (${sites.map((site) => `${site.path}x${site.count}`).join(', ')}); the review condition "the fixture's single call site grows a second consumer" reopens`,
    });
  }
  const fixture = input.sources.find((source) => source.path === input.fixturePath);
  if (fixture === undefined) {
    findings.push({
      code: 'DEPENDENCY_VUE_FIXTURE_MISSING',
      detail: `the recorded fixture ${input.fixturePath} is not a tracked source; re-review the retention decision`,
    });
  } else {
    findings.push(...findTemplateFindings(fixture));
  }
  if (!declared.has(input.dependency)) {
    findings.push({
      code: 'DEPENDENCY_VUE_UNDECLARED',
      detail: `${input.dependency} is reached by tracked source but is not a declared dependency; a package tracked source reaches is used and must stay declared`,
    });
  }
  const requireResolve = /require\.resolve\(\s*['"]([^'"]+)['"]\s*\)/g;
  const reported = new Set<string>();
  for (const source of input.sources) {
    const code = stripComments(source.text);
    for (const match of code.matchAll(requireResolve)) {
      const specifier = match[1] ?? '';
      if (specifier.startsWith('.') || specifier.startsWith('/') || specifier.startsWith('node:')) continue;
      if (specifier.includes('${')) continue;
      const packageName = specifier.startsWith('@') ? specifier.split('/').slice(0, 2).join('/') : specifier.split('/')[0] ?? '';
      if (packageName === '') continue;
      if (!declared.has(packageName) && !reported.has(`undeclared:${packageName}`)) {
        reported.add(`undeclared:${packageName}`);
        findings.push({
          code: 'DEPENDENCY_REQUIRE_RESOLVE_UNDECLARED',
          detail: `${source.path}:${lineOf(code, match.index ?? 0)} resolves '${specifier}' but '${packageName}' is not a declared dependency`,
        });
        continue;
      }
      if (!input.resolveSpecifier(specifier) && !reported.has(`unresolvable:${specifier}`)) {
        reported.add(`unresolvable:${specifier}`);
        findings.push({
          code: 'DEPENDENCY_REQUIRE_RESOLVE_UNRESOLVABLE',
          detail: `${source.path}:${lineOf(code, match.index ?? 0)} resolves '${specifier}' but the declared dependency does not resolve on disk; a fresh install would fail (DEF-FC-03)`,
        });
      }
    }
  }
  return findings;
}

const CLEAN_CLAIM_PATTERNS: readonly RegExp[] = [
  /\b(?:npm\s+audit|advisory\s+(?:scan|query|assessment)|dependency\s+scan|vulnerability\s+scan)\b[^\n]{0,80}\b(?:clean|passed|pass(?:es)?|no\s+(?:known\s+)?(?:advisories|vulnerabilities)|0\s+(?:known\s+)?(?:advisories|vulnerabilities))\b/i,
  /\b(?:no\s+(?:known\s+)?(?:advisories|vulnerabilities)|0\s+(?:known\s+)?(?:advisories|vulnerabilities))\b[^\n]{0,80}\b(?:npm\s+audit|advisory|dependency|vulnerability)\b/i,
  /\bdependenc(?:y|ies)\b[^\n]{0,40}\b(?:are|is)\s+clean\b/i,
  /\baudit\s+(?:is\s+)?clean\b/i,
];

const CLEAN_CLAIM_EXEMPTIONS = /UNAVAILABLE|not clean|never a passing|not a passing|absent scan|not (?:been )?performed|has not been|cannot run|could not run|not run|unexecuted|not executed|no scan|no current|never executed|not claimed|no online/i;

export interface AdvisoryCleanClaimInput {
  readonly documents: readonly SourceDocument[];
  readonly advisoryLaneClass: string;
}

/**
 * While the advisory lane is not PROVEN, no governed document may state or
 * imply a clean result. Lines that state the unavailability are the honest
 * form and are never findings.
 */
export function evaluateAdvisoryCleanClaims(input: AdvisoryCleanClaimInput): readonly DependencyCurrencyFinding[] {
  if (input.advisoryLaneClass === 'PROVEN') return [];
  const findings: DependencyCurrencyFinding[] = [];
  if (input.documents.length === 0) {
    findings.push({
      code: 'DEPENDENCY_DOCUMENT_SET_EMPTY',
      detail: 'no governed document was supplied to the clean-claim scan; an empty scan is not a clean document set',
    });
    return findings;
  }
  for (const document of input.documents) {
    const lines = document.text.split(/\r?\n/);
    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index] ?? '';
      if (CLEAN_CLAIM_EXEMPTIONS.test(line)) continue;
      if (CLEAN_CLAIM_PATTERNS.some((pattern) => pattern.test(line))) {
        findings.push({
          code: 'DEPENDENCY_ADVISORY_CLEAN_CLAIM_WHILE_UNAVAILABLE',
          detail: `${document.path}:${index + 1} states "${line.trim().slice(0, 120)}" while the dependency-advisory lane is ${input.advisoryLaneClass}; an absent scan is never a passing scan`,
        });
        break;
      }
    }
  }
  return findings;
}

export interface LockfileVerificationResult {
  readonly findings: readonly DependencyCurrencyFinding[];
  readonly dueDate: string | null;
  readonly stale: boolean;
}

/** A stale verification date or a lockfile that no longer matches fails. */
export function evaluateLockfileVerification(
  record: LockfileVerificationRecord,
  today: string,
  observedSha256: string | null,
): LockfileVerificationResult {
  const findings: DependencyCurrencyFinding[] = [];
  const dueDate = computeDueDate(record.date, record.intervalDays);
  if (dueDate === null) {
    findings.push({ code: 'DEPENDENCY_LOCKFILE_DATE_INVALID', detail: `verification date ${record.date} with interval ${record.intervalDays} is not a valid due date` });
  } else if (today > dueDate) {
    findings.push({
      code: 'DEPENDENCY_LOCKFILE_VERIFICATION_STALE',
      detail: `verified ${record.date} + ${record.intervalDays}d = ${dueDate} but today is ${today}; re-run: ${record.command}`,
    });
  }
  if (observedSha256 !== null && observedSha256 !== record.lockfileSha256) {
    findings.push({
      code: 'DEPENDENCY_LOCKFILE_DRIFT',
      detail: `package-lock.json is ${observedSha256} but the verification recorded ${record.lockfileSha256}; a resolution change is a reproducibility failure`,
    });
  }
  return { findings, dueDate, stale: dueDate !== null && today > dueDate };
}

/** Review entries whose `reviewDate + intervalDays` has elapsed. */
export function collectDependencyReviewDue(record: DependencyCurrencyRecord, today: string): readonly DependencyReviewDue[] {
  const review = record.vueReview;
  const dueDate = computeDueDate(review.reviewDate, review.reviewIntervalDays);
  if (dueDate === null || today <= dueDate) return [];
  return [{
    id: `${review.dependency}@${review.version}`,
    dueDate,
    reviewDate: review.reviewDate,
    intervalDays: review.reviewIntervalDays,
    condition: 're-review the EOL fixture retention decision, restate the reachability argument, and re-date the record',
  }];
}

/**
 * `collectDependencyReviewDue` over the raw record, for callers that do not
 * parse first (bin/agent-state.mjs reports the due state alongside the lane
 * revisit record). An unreadable record yields no entries; project:check is
 * the surface that fails closed on a malformed record.
 */
export function collectDependencyReviewDueFromRecord(raw: unknown, today: string): readonly DependencyReviewDue[] {
  const parsed = parseDependencyCurrencyRecord(raw);
  if (!parsed.ok || parsed.record === null) return [];
  return collectDependencyReviewDue(parsed.record, today);
}

/** The complete group-9 judgement over one supplied snapshot. */
export function evaluateDependencyCurrency(input: DependencyCurrencyInput): DependencyCurrencyResult {
  const parsed = parseDependencyCurrencyRecord(input.record);
  if (!parsed.ok || parsed.record === null) {
    return { ok: false, findings: parsed.findings, runtimeQualification: null, vueReviewDue: false, vueReviewDueDate: null, lockfileVerificationDueDate: null };
  }
  const record = parsed.record;
  const findings: DependencyCurrencyFinding[] = [];

  const enginesNode = input.packageJson.engines?.node ?? null;
  if (enginesNode !== record.runtime.declaredRange) {
    findings.push({
      code: 'DEPENDENCY_RUNTIME_RANGE_DRIFT',
      detail: `package.json engines.node is ${enginesNode ?? 'ABSENT'} but ${DEPENDENCY_CURRENCY_RECORD_PATH} declares ${record.runtime.declaredRange}`,
    });
  }
  if (!input.matrixText.includes(record.runtime.declaredRange)) {
    findings.push({ code: 'DEPENDENCY_RUNTIME_MATRIX_DRIFT', detail: `docs/HOST-CAPABILITY-MATRIX.md does not state the declared range ${record.runtime.declaredRange}` });
  }
  for (const point of record.runtime.qualifiedNode) {
    if (!input.matrixText.includes(point)) {
      findings.push({ code: 'DEPENDENCY_RUNTIME_MATRIX_DRIFT', detail: `docs/HOST-CAPABILITY-MATRIX.md does not state the qualified point ${point}` });
    }
  }

  const runtimeQualification = qualifyRuntime(record.runtime, input.observed);
  if (runtimeQualification.state !== 'QUALIFIED') {
    findings.push({
      code: runtimeQualification.state === 'UNQUALIFIED_RUNTIME' ? 'DEPENDENCY_RUNTIME_UNQUALIFIED_RUNTIME' : 'DEPENDENCY_RUNTIME_UNQUALIFIED_OS',
      detail: runtimeQualification.detail,
    });
  }

  const declaredDependencies = [
    ...Object.keys(input.packageJson.dependencies ?? {}),
    ...Object.keys(input.packageJson.devDependencies ?? {}),
  ];
  findings.push(...evaluateVueReviewConditions({
    sources: input.sources,
    dependency: record.vueReview.dependency,
    version: record.vueReview.version,
    fixturePath: record.vueReview.fixturePath,
    specifier: record.vueReview.specifier,
    declaredDependencies,
    resolveSpecifier: input.resolveSpecifier,
  }));

  const due = collectDependencyReviewDue(record, input.today);
  if (due.length > 0) {
    findings.push({ code: 'DEPENDENCY_REVIEW_DUE', detail: due.map((entry) => `${entry.id} due ${entry.dueDate} (reviewed ${entry.reviewDate} + ${entry.intervalDays}d); ${entry.condition}`).join('; ') });
  }

  findings.push(...evaluateAdvisoryCleanClaims({ documents: input.documents, advisoryLaneClass: input.advisoryLaneClass }));

  const lockfile = evaluateLockfileVerification(record.lockfileVerification, input.today, input.observedLockfileSha256);
  findings.push(...lockfile.findings);

  return {
    ok: findings.length === 0,
    findings,
    runtimeQualification,
    vueReviewDue: due.length > 0,
    vueReviewDueDate: computeDueDate(record.vueReview.reviewDate, record.vueReview.reviewIntervalDays),
    lockfileVerificationDueDate: lockfile.dueDate,
  };
}
