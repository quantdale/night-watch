// @ts-check

// Group 3 — the CI-topology clean gate, pure judgement.
//
// D-110: `gate:clean` clones into a temp directory but runs on the SAME HOST,
// so it certifies checkout cleanliness rather than runner topology and could
// not have caught either defect that reached the exact-head CI checkpoint: an
// absolute sibling source root that cannot exist on a runner, and a Bubblewrap
// binary the ubuntu-24.04 image does not ship.
//
// The gate this module judges executes the authoritative capability lanes
// inside a rootless Bubblewrap envelope in which the runner-absent conditions
// are simulated categorically: the REAL `DEFAULT_SIBLING_ROOT` is made
// unreadable by masking that path, never by editing the constant; `bwrap` is
// made unreachable by masking its own binary; Chrome is made unreachable;
// `$HOME` is a fresh directory. Each absence is independently togglable, so a
// failure names which absence caused it.
//
// Two categorical regressions keep the defect classes from recurring:
//   * no gate suite may depend on an absolute path outside the checkout
//     without an explicit declaration;
//   * no gate suite may invoke a binary without a capability discriminant.
//
// Pure: capabilities, file texts and receipts are inputs. Only
// `describeEnvelopePlan` builds an argv array; it runs nothing.

export const TOPOLOGY_GATE_SCHEMA = 'nightwatch.gate-topology-receipt.v1';
export const TOPOLOGY_REGRESSIONS_SCHEMA = 'nightwatch.topology-regressions.v1';

/** The toolchain commands every checkout and gate run carries. */
export const TOPOLOGY_ALWAYS_AVAILABLE_BINARIES = Object.freeze([
  'node', 'npm', 'npx', 'git', 'sh', 'bash', 'tar', 'true', 'false', 'sleep', 'echo', 'env', 'ls', 'cat',
]);

/** Source markers that count as a declared host capability in a suite. */
export const TOPOLOGY_CAPABILITY_DECLARATIONS = Object.freeze([
  'l6ContainmentAvailability(',
  'assertL6RuntimeCapability(',
  'assertAuthenticatedOopsCapability(',
  'inspectOopsSandbox(',
  'createSiblingSourceAccess(',
  'resolveGitHead(',
  'SOURCE_REPOSITORY_UNAVAILABLE',
  'host-capability:',
]);

const CREDENTIAL_RE = /(?:ghp_|github_pat_|AKIA[0-9A-Z]{16}|Bearer\s+[A-Za-z0-9._-]{20,}|password\s*[:=]\s*\S+)/;
const SHORT_SHA_RE = /^[0-9a-f]{40}$/i;

/**
 * @typedef {object} TopologyAbsence
 * @property {string} id
 * @property {string} title
 * @property {string} capability
 * @property {readonly string[]} blockerCodes
 * @property {readonly string[]} dependentLanes
 * @property {readonly string[]} laneSuites
 * @property {'PASS' | 'NOT_IN_AUTHORITATIVE_GATE'} expectedLane
 * @property {string} expectedClaim
 */

/** @type {readonly TopologyAbsence[]} */
export const TOPOLOGY_ABSENCES = Object.freeze([
  Object.freeze({
    id: 'sibling-root',
    title: 'the real DEFAULT_SIBLING_ROOT is unreadable',
    capability: 'sibling-source-access',
    blockerCodes: Object.freeze(['SOURCE_REPOSITORY_UNAVAILABLE']),
    dependentLanes: Object.freeze(['source-intelligence-census']),
    laneSuites: Object.freeze(['tests/unit/eligibilityCensus.test.ts']),
    expectedLane: 'PASS',
    expectedClaim: 'the census reports the universe UNAVAILABLE and never an empty universe as clean',
  }),
  Object.freeze({
    id: 'bwrap',
    title: 'the Bubblewrap binary is unreachable',
    capability: 'l6-process-network-containment',
    blockerCodes: Object.freeze(['BWRAP_UNAVAILABLE']),
    dependentLanes: Object.freeze(['deepContainmentLane']),
    laneSuites: Object.freeze(['tests/unit/l6Containment.test.ts']),
    expectedLane: 'PASS',
    expectedClaim: 'the capability is UNSUPPORTED with a blocker code and authenticated OOPS refuses',
  }),
  Object.freeze({
    id: 'chrome',
    title: 'system Chrome is unreachable',
    capability: 'system-chrome',
    blockerCodes: Object.freeze(['CHROME_UNAVAILABLE']),
    dependentLanes: Object.freeze(['browser-workflow']),
    laneSuites: Object.freeze([]),
    expectedLane: 'NOT_IN_AUTHORITATIVE_GATE',
    expectedClaim: 'the browser lane is not an authoritative gate lane and no gate lane inherits a Chrome pass',
  }),
  Object.freeze({
    id: 'fresh-home',
    title: '$HOME is a fresh directory',
    capability: 'fresh-home',
    blockerCodes: Object.freeze([]),
    dependentLanes: Object.freeze(['all-gate-lanes']),
    laneSuites: Object.freeze(['tests/unit/eligibilityCensus.test.ts', 'tests/unit/l6Containment.test.ts']),
    expectedLane: 'PASS',
    expectedClaim: 'no lane reads durable state from the invoking account home',
  }),
]);

/**
 * Parse the real sibling-root constant from its source, so the gate masks the
 * path the program actually uses rather than a copy that can drift.
 *
 * @param {string} source
 * @returns {string | null}
 */
export function parseSiblingRoot(source) {
  if (typeof source !== 'string') return null;
  const match = /export\s+const\s+DEFAULT_SIBLING_ROOT\s*=\s*'([^'\n]+)'/.exec(source);
  if (match === null || match[1] === undefined) return null;
  const value = match[1];
  return value.startsWith('/') ? value : null;
}

/**
 * The Bubblewrap candidate list the runtime probes. Kept here as DATA so the
 * plan the gate builds and the check the runtime performs cannot drift
 * silently: `canonicalBwrapCandidates` is asserted against the runtime source
 * by the focused suite.
 */
export function canonicalBwrapCandidates() {
  return Object.freeze(['/usr/bin/bwrap', '/bin/bwrap']);
}

/**
 * Candidate system-Chrome executables. `PLAYWRIGHT_BROWSERS_PATH` (or the
 * per-user Playwright cache) carries the browser bundle separately.
 */
export function chromeCandidates(environment = process.env) {
  const candidates = [
    '/opt/google/chrome/chrome',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
  ];
  const direct = environment.CHROME_BIN;
  if (typeof direct === 'string' && direct.startsWith('/')) candidates.push(direct);
  return Object.freeze([...new Set(candidates)]);
}

/**
 * Build the envelope argv for one absence. The command is appended by the
 * caller; no shell is involved. A directory is masked with an empty tmpfs (a
 * file cannot be bound over a directory); a file is bound to `/dev/null`.
 *
 * @param {{
 *   absence: string,
 *   worktree: string,
 *   siblingRoot?: string | null,
 *   chrome?: readonly string[],
 *   playwrightBrowsersPath?: string | null,
 *   freshHome?: string | null,
 *   bwrapCandidates?: readonly string[],
 *   resolveMaskPath: (candidate: string) => { kind: 'file' | 'directory' | 'other' | 'absent', path: string | null },
 * }} input
 * @returns {readonly string[]}
 */
export function describeEnvelopePlan(input) {
  const args = [
    '--die-with-parent',
    '--new-session',
    '--ro-bind', '/', '/',
    '--dev', '/dev',
    '--proc', '/proc',
    '--bind', '/tmp', '/tmp',
    '--bind', input.worktree, input.worktree,
    '--chdir', input.worktree,
  ];
  const mask = (candidate) => {
    const resolved = input.resolveMaskPath(candidate);
    if (resolved.kind === 'directory' && resolved.path !== null) args.push('--tmpfs', resolved.path);
    else if ((resolved.kind === 'file' || resolved.kind === 'other') && resolved.path !== null) args.push('--ro-bind', '/dev/null', resolved.path);
    return resolved.kind !== 'absent';
  };
  if (input.absence === 'sibling-root') {
    // Mask the path the program would read. A masked directory is empty and a
    // masked file is not a directory, so `createSiblingSourceAccess` reports
    // either the root unusable or every repository missing —
    // `SOURCE_REPOSITORY_UNAVAILABLE` in both cases, the same observable state
    // a runner produces by not having the path at all. The constant is never
    // edited.
    if (typeof input.siblingRoot === 'string') mask(input.siblingRoot);
  } else if (input.absence === 'bwrap') {
    for (const candidate of input.bwrapCandidates ?? canonicalBwrapCandidates()) mask(candidate);
  } else if (input.absence === 'chrome') {
    for (const candidate of input.chrome ?? []) mask(candidate);
    if (typeof input.playwrightBrowsersPath === 'string') mask(input.playwrightBrowsersPath);
  } else if (input.absence === 'fresh-home') {
    if (typeof input.freshHome === 'string' && input.resolveMaskPath(input.freshHome).kind !== 'absent') {
      args.push('--bind', input.freshHome, input.freshHome, '--setenv', 'HOME', input.freshHome);
    }
  }
  return Object.freeze(args);
}

/**
 * Does a capability observation prove the absence took effect?
 *
 * @param {TopologyAbsence} absence
 * @param {any} probe
 * @returns {{ absent: boolean, detail: string }}
 */
export function absenceTookEffect(absence, probe) {
  if (probe === null || typeof probe !== 'object') return { absent: false, detail: 'probe produced no observation' };
  if (absence.id === 'sibling-root') {
    const blocker = probe.blockerCode;
    const entriesAbsent = probe.pathUsable === false || probe.entries === 0 || probe.entries === null;
    return {
      absent: entriesAbsent && (blocker === null || absence.blockerCodes.includes(blocker)),
      detail: `pathUsable=${String(probe.pathUsable)} entries=${String(probe.entries)} blockerCode=${String(blocker)}`,
    };
  }
  if (absence.id === 'bwrap') {
    return {
      absent: probe.available === false && absence.blockerCodes.includes(probe.blockerCode),
      detail: `available=${String(probe.available)} blockerCode=${String(probe.blockerCode)}`,
    };
  }
  if (absence.id === 'chrome') {
    return {
      absent: probe.available === false,
      detail: `available=${String(probe.available)} candidates=${JSON.stringify(probe.found ?? [])}`,
    };
  }
  if (absence.id === 'fresh-home') {
    return {
      absent: typeof probe.home === 'string' && probe.home === probe.expectedHome && probe.writable === true,
      detail: `home=${String(probe.home)} expected=${String(probe.expectedHome)} writable=${String(probe.writable)}`,
    };
  }
  return { absent: false, detail: `unknown absence ${absence.id}` };
}

/**
 * Evaluate one absence against its probe and its lane outcome. Findings name
 * the lane and the absence, so a failure is never anonymous.
 *
 * @param {{
 *   absence: TopologyAbsence,
 *   probe: any,
 *   lane: { status: string, receipts?: Record<string, any> | null } | null,
 * }} input
 * @returns {readonly { code: string, detail: string }[]}
 */
export function evaluateAbsence(input) {
  /** @type {{ code: string, detail: string }[]} */
  const findings = [];
  const effect = absenceTookEffect(input.absence, input.probe);
  if (!effect.absent) {
    findings.push({
      code: 'TOPOLOGY_ABSENCE_NOT_CONSTRUCTED',
      detail: `absence=${input.absence.id}: the simulated condition did not take effect (${effect.detail})`,
    });
    // Without a constructed absence there is nothing to prove, and a green
    // lane here must never be read as fail-closed coverage.
    return findings;
  }
  const lane = input.lane;
  if (input.absence.expectedLane === 'PASS') {
    if (lane === null || lane.status !== 'PASS') {
      findings.push({
        code: 'TOPOLOGY_LANE_FAILED',
        detail: `absence=${input.absence.id}: dependent lane(s) ${input.absence.dependentLanes.join(', ')} did not pass the fail-closed path (status=${lane === null ? 'NOT_RUN' : lane.status})`,
      });
    }
  }
  const inheritance = detectInheritanceClaim(input.absence, lane?.receipts ?? null);
  if (inheritance !== null) {
    findings.push({
      code: 'TOPOLOGY_LANE_PASSED_BY_INHERITANCE',
      detail: `absence=${input.absence.id} lane=${inheritance.lane}: ${inheritance.detail}`,
    });
  }
  return findings;
}

/**
 * The bwrap-less host contract (degraded envelope mode).
 *
 * A host without Bubblewrap cannot mask the runner-absent conditions, so each
 * absence is observed DIRECTLY against the real environment instead of a
 * simulated one. Three outcomes, every one fail-closed or explicitly
 * declared:
 *
 * - no observation → hard TOPOLOGY_PROBE_FAILED finding;
 * - the absence took effect on its own → constructible: the caller evaluates
 *   the dependent lane exactly as the envelope path does (real, not masked);
 * - the absence did not take effect → declared non-exercise carrying the
 *   BWRAP_UNAVAILABLE blocker: nothing is fabricated, no green lane is ever
 *   read as absence coverage, and nothing fails merely because this host
 *   cannot construct the mask.
 *
 * @param {TopologyAbsence} absence
 * @param {any} probe
 * @returns {{ constructible: boolean, notExercised: boolean, detail: string, findings: readonly TopologyDiagnostic[] }}
 */
export function evaluateDirectObservation(absence, probe) {
  if (probe === null || typeof probe !== 'object') {
    return {
      constructible: false,
      notExercised: false,
      detail: 'direct probe produced no observation',
      findings: [{ code: 'TOPOLOGY_PROBE_FAILED', detail: `absence=${absence.id}: the direct probe produced no observation` }],
    };
  }
  const effect = absenceTookEffect(absence, probe);
  if (effect.absent) {
    return { constructible: true, notExercised: false, detail: effect.detail, findings: [] };
  }
  return {
    constructible: false,
    notExercised: true,
    detail: effect.detail,
    findings: [],
  };
}

/**
 * The inverse assertion. A receipt that claims a capability PROVEN while the
 * capability's absence was constructed is a defect: the lane passed by
 * inheritance rather than by proof.
 *
 * @param {TopologyAbsence} absence
 * @param {Record<string, any> | null} receipts
 * @returns {{ lane: string, detail: string } | null}
 */
export function detectInheritanceClaim(absence, receipts) {
  if (receipts === null || typeof receipts !== 'object') return null;
  if (absence.id === 'bwrap') {
    const lane = receipts.deepContainmentLane;
    if (typeof lane === 'string' && lane === 'PROVEN') {
      return { lane: 'deepContainmentLane', detail: 'the lane reported PROVEN while bwrap was unreachable' };
    }
  }
  if (absence.id === 'sibling-root') {
    const population = receipts.sourcePopulation;
    if (Number.isInteger(population) && population > 0) {
      return { lane: 'source-intelligence-census', detail: `the census reported a population of ${population} while the sibling root was unreadable` };
    }
    if (receipts.censusAvailable === true) {
      return { lane: 'source-intelligence-census', detail: 'the census reported available while the sibling root was unreadable' };
    }
  }
  if (absence.id === 'chrome') {
    if (receipts.chromeAvailable === true || receipts.browserLane === 'PROVEN') {
      return { lane: 'browser-workflow', detail: 'the browser capability was claimed PROVEN while Chrome was unreachable' };
    }
  }
  if (absence.id === 'fresh-home') {
    if (receipts.usedInvokingHome === true) {
      return { lane: 'all-gate-lanes', detail: 'a lane read durable state from the invoking account home' };
    }
  }
  return null;
}

const EXTERNAL_ABSOLUTE_PATH_RE = /(['"`])((?:\/(?:home|Users|opt|srv|root|mnt|media|etc)\/[A-Za-z0-9._/-]{3,}))/g;

// X-02 — the literal scan misses imported path constants: a suite that reads
// `DEFAULT_SIBLING_ROOT` (defined in another module and re-exported through
// another) depends on the absolute path without ever quoting it. These three
// clauses keep this module pure: resolution follows named imports and named
// re-exports through the caller-supplied reader, never the filesystem.
const NAMED_FROM_CLAUSE_RE = /(?:import|export)\s*\{([^}]+)\}\s*from\s*['"]([^'"]+)['"]/g;
const CONST_PATH_RE = /\b(?:const|let)\s+([A-Za-z_$][\w$]*)\s*=\s*(['"])((?:\/(?:home|Users|opt|srv|root|mnt|media|etc)\/[A-Za-z0-9._/-]{3,}))\2/;
const PATH_CONSTANT_MAX_DEPTH = 6;

function normalizeModulePath(spec) {
  const segments = [];
  for (const segment of spec.split('/')) {
    if (segment === '' || segment === '.') continue;
    if (segment === '..') segments.pop();
    else segments.push(segment);
  }
  return segments.join('/');
}

function resolveSpecifier(fromFile, specifier) {
  if (!specifier.startsWith('.')) return null;
  const base = fromFile.split('/').slice(0, -1).join('/');
  return normalizeModulePath(`${base}/${specifier}`);
}

function readModuleSource(readFile, modulePath) {
  const candidates = [`${modulePath}.ts`, `${modulePath}.tsx`, `${modulePath}/index.ts`, `${modulePath}.mjs`, modulePath];
  for (const candidate of candidates) {
    const text = readFile(candidate);
    if (typeof text === 'string') return text;
  }
  return null;
}

function modulePathConstants(readFile, cache, modulePath, depth = 0) {
  if (depth > PATH_CONSTANT_MAX_DEPTH) return new Map();
  const memo = cache.get(modulePath);
  if (memo !== undefined) return memo;
  /** @type {Map<string, string>} */
  const symbols = new Map();
  cache.set(modulePath, symbols); // cycle placeholder: recursion reads the partial map
  const source = readModuleSource(readFile, modulePath);
  if (source === null) return symbols;
  for (const line of source.split(/\r?\n/)) {
    const local = CONST_PATH_RE.exec(line);
    if (local !== null) symbols.set(local[1], local[3]);
  }
  for (const match of source.matchAll(NAMED_FROM_CLAUSE_RE)) {
    const target = resolveSpecifier(modulePath, match[2]);
    if (target === null) continue;
    const targetSymbols = modulePathConstants(readFile, cache, target, depth + 1);
    if (targetSymbols.size === 0) continue;
    for (const part of match[1].split(',')) {
      const pieces = part.split(/\s+as\s+/).map((piece) => piece.trim()).filter((piece) => piece !== '');
      if (pieces.length === 0) continue;
      const origin = pieces[0];
      const alias = pieces.length > 1 ? pieces[1] : pieces[0];
      const literal = targetSymbols.get(origin);
      if (literal !== undefined) symbols.set(alias, literal);
    }
  }
  return symbols;
}

/**
 * A path-constant use in a line, or null: the identifier must appear in a
 * path context and never inside a string or regex body (a source-text
 * assertion that merely names the constant is not a path dependency).
 */
function pathConstantUse(line, name) {
  const pattern = new RegExp(`\\b${name.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}\\b`, 'g');
  let match;
  while ((match = pattern.exec(line)) !== null) {
    const before = match.index === 0 ? '' : line[match.index - 1];
    if (before !== '/' && before !== "'" && before !== '"' && before !== '`') return match.index;
  }
  return null;
}

/**
 * Categorical regression: a gate suite may not depend on an absolute path
 * outside the checkout without an explicit declaration. Declarations are data
 * and carry a reason; an undeclared path is a finding naming the file, line
 * and path. This is DEF-CI-01's class generalized away from the one specific
 * sibling path.
 *
 * X-02: `readFile` (optional, caller-supplied) extends the scan to IMPORTED
 * path constants — an identifier imported from another module that resolves to
 * an absolute path is the same dependency as quoting the literal. Without the
 * reader the scan keeps its literal-only behavior.
 *
 * @param {{ files: readonly { path: string, text: string }[], declarations?: readonly { file: string, literal: string }[], readFile?: (modulePath: string) => string | null }} input
 * @returns {readonly { code: string, detail: string, file: string, line: number, literal: string }[]}
 */
export function scanExternalAbsolutePathDependence(input) {
  const declared = new Set((input.declarations ?? []).map((entry) => `${entry.file}\u0000${entry.literal}`));
  const readFile = typeof input.readFile === 'function' ? input.readFile : null;
  const constantCache = new Map();
  /** @type {{ code: string, detail: string, file: string, line: number, literal: string }[]} */
  const findings = [];
  for (const file of input.files) {
    /** @type {Map<string, string>} */
    const importedConstants = new Map();
    if (readFile !== null) {
      for (const match of file.text.matchAll(NAMED_FROM_CLAUSE_RE)) {
        const target = resolveSpecifier(file.path, match[2]);
        if (target === null) continue;
        const targetSymbols = modulePathConstants(readFile, constantCache, target, 0);
        if (targetSymbols.size === 0) continue;
        for (const part of match[1].split(',')) {
          const pieces = part.split(/\s+as\s+/).map((piece) => piece.trim()).filter((piece) => piece !== '');
          if (pieces.length === 0) continue;
          const origin = pieces[0];
          const alias = pieces.length > 1 ? pieces[1] : pieces[0];
          const literal = targetSymbols.get(origin);
          if (literal !== undefined) importedConstants.set(alias, literal);
        }
      }
    }
    const lines = file.text.split(/\r?\n/);
    // Import/export clause regions (including multi-line member lists) never
    // carry a path use: naming a constant in an import statement is not
    // depending on it in this file.
    let inClause = false;
    const clauseRegion = lines.map((line) => {
      const trimmed = line.trim();
      const opensClause = /^(?:import|export)\b[^;]*$/.test(trimmed) && !/from\s*['"]/i.test(trimmed);
      const closesClause = /^(?:import|export)\b.*from\s*['"][^'"]*['"]\s*;?\s*$/.test(trimmed) || (inClause && /;\s*$/.test(trimmed));
      if (inClause) {
        inClause = !closesClause;
        return true;
      }
      if (opensClause) {
        inClause = true;
        return true;
      }
      return closesClause;
    });
    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index] ?? '';
      if (/not\.toContain|not\.toMatch|not\.toBe\(|\.join\(['"]\/['"]\)/.test(line)) continue;
      EXTERNAL_ABSOLUTE_PATH_RE.lastIndex = 0;
      let match;
      while ((match = EXTERNAL_ABSOLUTE_PATH_RE.exec(line)) !== null) {
        const literal = match[2];
        if (literal === undefined) continue;
        if (literal.split('/').filter(Boolean).length < 4) continue;
        if (declared.has(`${file.path}\u0000${literal}`)) continue;
        findings.push({
          code: 'TOPOLOGY_EXTERNAL_PATH_DEPENDENCE',
          detail: `${file.path}:${index + 1} depends on absolute path ${literal} without declaring a host capability`,
          file: file.path,
          line: index + 1,
          literal,
        });
      }
      if (importedConstants.size === 0 || clauseRegion[index] === true) continue;
      for (const [name, literal] of importedConstants) {
        if (pathConstantUse(line, name) === null) continue;
        if (literal.split('/').filter(Boolean).length < 4) continue;
        if (declared.has(`${file.path}\u0000${literal}`)) continue;
        findings.push({
          code: 'TOPOLOGY_EXTERNAL_PATH_DEPENDENCE',
          detail: `${file.path}:${index + 1} depends on absolute path ${literal} via imported constant ${name} without declaring a host capability`,
          file: file.path,
          line: index + 1,
          literal,
        });
      }
    }
  }
  return findings;
}

const BINARY_INVOCATION_RE = /\b(?:spawnSync|spawn|execFileSync|execFile|execSync)\s*\(\s*(['"])([^'"\n]+)\1/g;

/**
 * Categorical regression: a gate suite may not invoke a binary without a
 * capability probe or an explicit declaration. This is DEF-CI-02's class
 * generalized away from Bubblewrap.
 *
 * @param {{ files: readonly { path: string, text: string }[], declarations?: readonly { file: string, command: string }[] }} input
 * @returns {readonly { code: string, detail: string, file: string, line: number, command: string }[]}
 */
export function scanUndeclaredBinaryInvocation(input) {
  const alwaysAvailable = new Set(TOPOLOGY_ALWAYS_AVAILABLE_BINARIES);
  const declared = new Set((input.declarations ?? []).map((entry) => `${entry.file}\u0000${entry.command}`));
  /** @type {{ code: string, detail: string, file: string, line: number, command: string }[]} */
  const findings = [];
  for (const file of input.files) {
    const declaresCapability = TOPOLOGY_CAPABILITY_DECLARATIONS.some((marker) => file.text.includes(marker));
    const lines = file.text.split(/\r?\n/);
    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index] ?? '';
      BINARY_INVOCATION_RE.lastIndex = 0;
      let match;
      while ((match = BINARY_INVOCATION_RE.exec(line)) !== null) {
        const raw = match[2];
        if (raw === undefined) continue;
        const command = raw.split('/').pop() ?? raw;
        if (alwaysAvailable.has(command)) continue;
        if (declared.has(`${file.path}\u0000${command}`)) continue;
        if (declaresCapability) continue;
        findings.push({
          code: 'TOPOLOGY_UNDECLARED_BINARY_INVOCATION',
          detail: `${file.path}:${index + 1} invokes ${raw} with no capability probe in ${file.path}`,
          file: file.path,
          line: index + 1,
          command: raw,
        });
      }
    }
  }
  return findings;
}

/**
 * Registration membership. An unregistered suite does not run (R-12), so the
 * runner, the gate manifest, the validation universe and the package script
 * must all name it.
 *
 * @param {{
 *   packageScripts: Record<string, string>,
 *   universe: any,
 *   gateManifestFiles: readonly string[],
 *   binFile: string,
 *   suiteFiles: readonly string[],
 *   fileExists: (relative: string) => boolean,
 * }} input
 * @returns {readonly { code: string, detail: string }[]}
 */
export function validateTopologyRegistration(input) {
  /** @type {{ code: string, detail: string }[]} */
  const findings = [];
  const script = input.packageScripts?.['gate:topology'];
  if (typeof script !== 'string' || !script.includes(input.binFile)) {
    findings.push({ code: 'TOPOLOGY_GATE_UNREGISTERED', detail: `package.json script gate:topology does not invoke ${input.binFile}` });
  }
  const binFiles = input.universe?.classes?.BIN_SYNTAX?.files;
  if (!Array.isArray(binFiles) || !binFiles.includes(input.binFile)) {
    findings.push({ code: 'TOPOLOGY_GATE_UNREGISTERED', detail: `${input.binFile} is not declared in config/validation-universe.v1.json BIN_SYNTAX` });
  }
  for (const suite of input.suiteFiles) {
    if (!input.gateManifestFiles.includes(suite)) {
      findings.push({ code: 'TOPOLOGY_SUITE_UNREGISTERED', detail: `${suite} is not selected by any authoritative gate manifest` });
    }
    if (!input.fileExists(suite)) {
      findings.push({ code: 'TOPOLOGY_SUITE_MISSING', detail: `${suite} does not exist` });
    }
  }
  if (!input.fileExists(input.binFile)) {
    findings.push({ code: 'TOPOLOGY_GATE_MISSING', detail: `${input.binFile} does not exist` });
  }
  return findings;
}

/**
 * The evidence the project-state certification check needs, as data. A
 * CI-certified status whose observed SHA is not the certified checkpoint is
 * refused with both SHAs named.
 *
 * @param {{ completionStatus?: string | null, certifiedCheckpointSha?: string | null, ciObservedSha?: string | null, ciExecutedSha?: string | null, ciStatus?: string | null }} block
 */
export function certificationReadsRecord(block) {
  return {
    completionStatus: block.completionStatus ?? null,
    certifiedCheckpointSha: SHORT_SHA_RE.test(block.certifiedCheckpointSha ?? '') ? block.certifiedCheckpointSha : null,
    ciObservedSha: block.ciObservedSha ?? 'NONE',
    ciExecutedSha: block.ciExecutedSha ?? 'NONE',
    ciStatus: block.ciStatus ?? 'NOT_OBSERVED',
  };
}

/** A safe, bounded receipt digest over a canonical JSON body. */
export function topologyReceiptDigest(receipt, sha256) {
  return `topology-receipt:sha256:${sha256(JSON.stringify(receipt)).slice(0, 24)}`;
}

/** True when text carries a credential-shaped token (4.8's rule). */
export function containsCredentialShapedToken(text) {
  return CREDENTIAL_RE.test(text);
}
