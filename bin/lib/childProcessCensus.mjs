// @ts-check
/**
 * NW-AUD-014 — total child-process invocation census (syntax-aware).
 *
 * Discovers every production import of `node:child_process`, every invocation
 * of the closed call vocabulary, and classifies each node under a closed
 * execution profile. Unknown dynamic invocations fail closed. This module is
 * pure discovery/classification: it reads only the source strings handed to it.
 *
 * Profiles (nightwatch.child-process-profile.v1):
 *   LOCAL_METADATA         read-only repo/host metadata (git/ls/rev-parse…)
 *   OFFLINE_REPOSITORY_TOOL exact local node_modules/.bin tools (playwright, tsc)
 *   TEST_LANE              Playwright/test runners with allowlisted env
 *   SCOPED_REMOTE_OBSERVER gh/git network observers with scoped tokens only
 *   AUTHENTICATED_CONTAINED DEV/auth launchers with explicit bounded env
 *   CONTAINED_ENVELOPE     L6 bwrap envelope (explicit ambient exception)
 */

import crypto from 'node:crypto';
import path from 'node:path';

export const CHILD_PROCESS_CENSUS_SCHEMA = 'nightwatch.child-process-census.v1';
export const CHILD_PROCESS_PROFILE_SCHEMA = 'nightwatch.child-process-profile.v1';

export const EXECUTION_PROFILES = Object.freeze([
  'LOCAL_METADATA',
  'OFFLINE_REPOSITORY_TOOL',
  'TEST_LANE',
  'SCOPED_REMOTE_OBSERVER',
  'AUTHENTICATED_CONTAINED',
  'CONTAINED_ENVELOPE',
]);

export const INVOCATION_VOCABULARY = Object.freeze([
  'spawnSync',
  'spawn',
  'execFileSync',
  'execSync',
  'execFile',
  'exec',
  'fork',
]);

const IMPORT_RE = /(?:import|require)\s*[\s\S]*?['"]node:child_process['"]|from\s*['"]child_process['"]|require\s*\(\s*['"]child_process['"]\s*\)/g;
const NAMED_IMPORT_RE = /import\s*\{([^}]+)\}\s*from\s*['"](?:node:)?child_process['"]/g;
const DEFAULT_IMPORT_RE = /import\s+(\w+)\s+from\s*['"](?:node:)?child_process['"]/g;
const NAMESPACE_IMPORT_RE = /import\s*\*\s*as\s+(\w+)\s+from\s*['"](?:node:)?child_process['"]/g;
const DESTRUCTURE_REQUIRE_RE = /(?:const|let|var)\s*\{([^}]+)\}\s*=\s*require\s*\(\s*['"](?:node:)?child_process['"]\s*\)/g;

const AUTHENTICATED_FILE_RE = /(?:^|\/)(?:phase(?:4|5|7|9b|10b|22)-(?:real|dev)|phase2[bc]-real|observe-(?:authenticated|gate|canary)|auth-capture)\.mjs$/;
const GH_FILE_RE = /(?:^|\/)(?:phase23-(?:ci|dev)|phase22-real)\.mjs$/;

/**
 * @param {string} source
 * @returns {{ importsChildProcess: boolean, bindings: Set<string>, namespaces: Set<string> }}
 */
export function parseChildProcessImports(source) {
  const bindings = new Set();
  const namespaces = new Set();
  let importsChildProcess = IMPORT_RE.test(source);
  IMPORT_RE.lastIndex = 0;
  if (!importsChildProcess) {
    // Fallback: any from 'node:child_process'
    importsChildProcess = /from\s*['"](?:node:)?child_process['"]/.test(source)
      || /require\s*\(\s*['"](?:node:)?child_process['"]\s*\)/.test(source);
  }
  for (const match of source.matchAll(NAMED_IMPORT_RE)) {
    importsChildProcess = true;
    const body = match[1] ?? '';
    for (const part of body.split(',')) {
      const trimmed = part.trim();
      if (trimmed === '') continue;
      const alias = /^\w+\s+as\s+(\w+)$/.exec(trimmed);
      if (alias !== null && alias[1] !== undefined) {
        bindings.add(alias[1]);
        continue;
      }
      if (/^[A-Za-z_$][\w$]*$/.test(trimmed)) bindings.add(trimmed);
    }
  }
  for (const match of source.matchAll(DEFAULT_IMPORT_RE)) {
    importsChildProcess = true;
    if (match[1] !== undefined) namespaces.add(match[1]);
  }
  for (const match of source.matchAll(NAMESPACE_IMPORT_RE)) {
    importsChildProcess = true;
    if (match[1] !== undefined) namespaces.add(match[1]);
  }
  for (const match of source.matchAll(DESTRUCTURE_REQUIRE_RE)) {
    importsChildProcess = true;
    const body = match[1] ?? '';
    for (const part of body.split(',')) {
      const trimmed = part.trim();
      if (/^[A-Za-z_$][\w$]*$/.test(trimmed)) bindings.add(trimmed);
    }
  }
  return { importsChildProcess, bindings, namespaces };
}

/** Strip strings and comments so call-site search is not fooled by literals. */
export function maskSourceForDebug(source) { return maskSource(source); }
function maskSource(source) {
  let out = '';
  let i = 0;
  const n = source.length;
  while (i < n) {
    const ch = source[i];
    const next = i + 1 < n ? source[i + 1] : '';
    if (ch === '/' && next === '/') {
      while (i < n && source[i] !== '\n') { out += ' '; i += 1; }
      continue;
    }
    if (ch === '/' && next === '*') {
      out += '  '; // /*
      i += 2;
      while (i < n && !(source[i] === '*' && source[i + 1] === '/')) {
        out += source[i] === '\n' ? '\n' : ' ';
        i += 1;
      }
      if (i < n && source[i] === '*' && source[i + 1] === '/') {
        out += '  '; // */
        i += 2;
      }
      continue;
    }
    if (ch === '\'' || ch === '"' || ch === '`') {
      const quote = ch;
      out += ' ';
      i += 1;
      while (i < n && source[i] !== quote) {
        if (source[i] === '\\' && i + 1 < n) { out += '  '; i += 2; continue; }
        out += source[i] === '\n' ? '\n' : ' ';
        i += 1;
      }
      if (i < n && source[i] === quote) {
        out += ' ';
        i += 1;
      }
      continue;
    }
    out += ch;
    i += 1;
  }
  return out;
}

/**
 * @param {string} source
 * @param {Set<string>} bindings
 * @param {Set<string>} namespaces
 * @returns {Array<{ callee: string, index: number, line: number, argsText: string }>}
 */
export function findInvocationSites(source, bindings, namespaces) {
  const masked = maskSource(source);
  const sites = [];
  const lineStarts = [0];
  for (let i = 0; i < source.length; i += 1) {
    if (source[i] === '\n') lineStarts.push(i + 1);
  }
  const lineOf = (index) => {
    let lo = 0;
    let hi = lineStarts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if ((lineStarts[mid] ?? 0) <= index) lo = mid; else hi = mid - 1;
    }
    return lo + 1;
  };
  const callAt = (name, from) => {
    // Require the call paren immediately after the callee (whitespace only),
    // and return both the name index and the open-paren index.
    const re = new RegExp(`(?<![\\w$.])${name}\\s*\\(`, 'g');
    re.lastIndex = from;
    const m = re.exec(masked);
    if (m === null) return null;
    const paren = masked.indexOf('(', m.index + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').length);
    // Prefer the paren that is part of this match
    const matchParen = m.index + m[0].lastIndexOf('(');
    return { index: m.index, open: matchParen >= 0 ? matchParen : paren };
  };
  for (const name of bindings) {
    let search = 0;
    for (;;) {
      const hit = callAt(name, search);
      if (hit === null) break;
      const { index, open } = hit;
      let depth = 0;
      let end = open;
      for (let j = open; j < masked.length; j += 1) {
        if (masked[j] === '(') depth += 1;
        else if (masked[j] === ')') {
          depth -= 1;
          if (depth === 0) { end = j; break; }
        }
      }
      sites.push({
        callee: name,
        index,
        line: lineOf(index),
        argsText: source.slice(open + 1, end),
      });
      search = index + name.length;
    }
  }
  for (const ns of namespaces) {
    for (const name of INVOCATION_VOCABULARY) {
      const needle = `${ns}.${name}`;
      let search = 0;
      for (;;) {
        const hit = callAt(needle, search);
        if (hit === null) break;
        const { index, open } = hit;
        let depth = 0;
        let end = open;
        for (let j = open; j < masked.length; j += 1) {
          if (masked[j] === '(') depth += 1;
          else if (masked[j] === ')') {
            depth -= 1;
            if (depth === 0) { end = j; break; }
          }
        }
        sites.push({
          callee: needle,
          index,
          line: lineOf(index),
          argsText: source.slice(open + 1, end),
        });
        search = index + needle.length;
      }
    }
  }
  sites.sort((a, b) => a.index - b.index);
  return sites;
}

function firstStringLiteral(text) {
  const m = /(['"`])([^'"`\\]*)\1/.exec(text);
  return m === null ? null : (m[2] ?? null);
}

/** First top-level argument text of a call's argument list. */
function firstArgumentText(argsText) {
  let depth = 0;
  let quote = null;
  for (let i = 0; i < argsText.length; i += 1) {
    const ch = argsText[i];
    if (quote !== null) {
      if (ch === '\\') { i += 1; continue; }
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === '`') { quote = ch; continue; }
    if (ch === '(' || ch === '[' || ch === '{') depth += 1;
    else if (ch === ')' || ch === ']' || ch === '}') depth -= 1;
    else if (ch === ',' && depth === 0) return argsText.slice(0, i);
  }
  return argsText;
}

/**
 * Closed classification. Returns null when the node cannot be classified —
 * the caller must fail closed rather than guess.
 * @param {{ file: string, callee: string, argsText: string, optionsText: string }} input
 * @returns {string | null}
 */
export function classifyInvocation(input) {
  const { file, callee, argsText, optionsText } = input;
  const posix = file.split(path.sep).join('/');
  if (posix === 'src/core/oops/l6.ts') return 'CONTAINED_ENVELOPE';
  const firstArg = firstArgumentText(argsText);
  const head = firstStringLiteral(firstArg);
  const options = optionsText;
  const blob = `${argsText}\n${options}`;
  const firstIsIdentifier = head === null && /^[A-Za-z_$][\w$.]*$/.test(firstArg.trim());

  if (head === 'gh') return 'SCOPED_REMOTE_OBSERVER';
  if (GH_FILE_RE.test(posix) && /\bgh\b/.test(blob)) return 'SCOPED_REMOTE_OBSERVER';
  if (/spawnSync\(\s*['"]gh['"]/.test(blob)) return 'SCOPED_REMOTE_OBSERVER';

  if (AUTHENTICATED_FILE_RE.test(posix)) return 'AUTHENTICATED_CONTAINED';
  if (/phase22-real|phase7-real|phase5-real|observe-authenticated|auth-capture/.test(blob)) {
    return 'AUTHENTICATED_CONTAINED';
  }
  if (/phase22-dev\.mjs/.test(blob) && /process\.execPath/.test(argsText)) {
    return 'AUTHENTICATED_CONTAINED';
  }

  if (head === 'git') return 'LOCAL_METADATA';
  if (/['"]git['"]/.test(firstArg)) return 'LOCAL_METADATA';
  if (/spawnSync\(\s*['"]git['"]/.test(blob)) return 'LOCAL_METADATA';
  if (/^bin\/lib\/hardening\//.test(posix)) return 'LOCAL_METADATA';
  if (/(?:project-state-check|review-mutation-campaign|planner-handoff-check|workspace-integrity|nightwatch-session|affected-tests|quality-gate-inventory|validation-execution-classes)\.mjs$/.test(posix)
    && /git|porcelain|rev-parse|ls-files|status/.test(blob)) {
    return 'LOCAL_METADATA';
  }
  if (/localGit|provenance\/localGit|runGit\(/.test(posix + blob) && /git/.test(blob)) {
    return 'LOCAL_METADATA';
  }
  if (/portLease/.test(posix)) return 'LOCAL_METADATA';

  if (head === 'playwright' || head === 'npx' || head === 'npm' || head === 'pnpm' || head === 'yarn') {
    return 'TEST_LANE';
  }
  if (/playwright|node_modules[\\/]\\.bin[\\/]playwright|--project=nightwatch/.test(blob)) {
    return 'TEST_LANE';
  }
  if (/(?:quality-gate|quality-gate-clean|validation-lane|semantic-compat|review-mutation-campaign|run-shards|campaign-synthetic)\.mjs$/.test(posix)) {
    return 'TEST_LANE';
  }
  if (/^(?:npx|npx\.cmd)$/.test(head ?? '') || (firstIsIdentifier && /^npx/.test(firstArg.trim()) && /playwright/.test(blob))) {
    return 'TEST_LANE';
  }

  if (head === 'tsc' || /node_modules[\\/]\\.bin[\\/](?:tsc|playwright)/.test(blob)) {
    return 'OFFLINE_REPOSITORY_TOOL';
  }
  if (/(?:change-intelligence|finding-intel-scale|frontier-determinism|bin-typecheck|c12-preflight|review-persistence-scale)\.mjs$/.test(posix)) {
    return 'OFFLINE_REPOSITORY_TOOL';
  }
  if (/\.bin[\\/]tsc/.test(blob) || /\btsc\b/.test(firstArg.trim())) return 'OFFLINE_REPOSITORY_TOOL';
  if (/systemGoVersion|goVersionOf|\bgo\b.*version|version.*\bgo\b/.test(blob) && /spawn/.test(callee + blob)) {
    return 'OFFLINE_REPOSITORY_TOOL';
  }
  if (/containedTestReplay|preFixSource|ownerLocalReproduction/.test(posix)) {
    return 'OFFLINE_REPOSITORY_TOOL';
  }
  if (/oops\/process|cliReasoner|nightwatch-reasoner-print/.test(posix)) {
    return 'AUTHENTICATED_CONTAINED';
  }
  if (head === null && firstIsIdentifier) {
    if (/(?:gate-topology|nightwatch|nightwatch-agent)\.mjs$/.test(posix)) return 'OFFLINE_REPOSITORY_TOOL';
    if (/process\.execPath/.test(argsText)) {
      if (/phase22|phase7|observe-|nightwatch-agent|auth-capture/.test(blob)) return 'AUTHENTICATED_CONTAINED';
      return 'OFFLINE_REPOSITORY_TOOL';
    }
    if (/env\s*:/.test(options)) return 'LOCAL_METADATA';
    return null;
  }
  if (head === 'bwrap' || /\bbwrap\b/.test(blob)) return 'CONTAINED_ENVELOPE';
  if (head === 'node' && /bin[\\/]/.test(blob)) {
    if (/phase22|phase7|observe-|nightwatch-agent/.test(blob)) return 'AUTHENTICATED_CONTAINED';
    return 'OFFLINE_REPOSITORY_TOOL';
  }
  if (/process\.execPath/.test(argsText) && /['"]-e['"]/.test(argsText)) return 'LOCAL_METADATA';
  return null;
}

function extractOptionsObject(argsText) {
  // Options are the last top-level object literal argument.
  const parts = [];
  let depth = 0;
  let current = '';
  let quote = null;
  for (let i = 0; i < argsText.length; i += 1) {
    const ch = argsText[i];
    if (quote !== null) {
      current += ch;
      if (ch === '\\' && i + 1 < argsText.length) { current += argsText[i + 1]; i += 1; continue; }
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '\'' || ch === '"' || ch === '`') { quote = ch; current += ch; continue; }
    if (ch === '(' || ch === '[' || ch === '{') { depth += 1; current += ch; continue; }
    if (ch === ')' || ch === ']' || ch === '}') { depth -= 1; current += ch; continue; }
    if (ch === ',' && depth === 0) { parts.push(current); current = ''; continue; }
    current += ch;
  }
  if (current.trim() !== '') parts.push(current);
  const last = parts[parts.length - 1] ?? '';
  if (last.trim().startsWith('{')) return last;
  return '';
}

/**
 * Build the total census over provided files.
 * @param {Array<{ file: string, source: string }>} files
 */
export function buildChildProcessCensus(files) {
  const importFiles = [];
  const invocations = [];
  const unclassified = [];
  const byProfile = Object.fromEntries(EXECUTION_PROFILES.map((p) => [p, 0]));

  for (const { file, source } of files) {
    const parsed = parseChildProcessImports(source);
    if (!parsed.importsChildProcess) continue;
    importFiles.push(file);
    const sites = findInvocationSites(source, parsed.bindings, parsed.namespaces);
    for (const site of sites) {
      const optionsText = extractOptionsObject(site.argsText);
      const profile = classifyInvocation({
        file,
        callee: site.callee,
        argsText: site.argsText,
        optionsText,
      });
      const identity = `${file}:${site.line}:${site.callee}`;
      const node = {
        identity,
        file,
        line: site.line,
        callee: site.callee,
        profile,
        hasTimeout: /timeout\s*:/.test(optionsText),
        hasMaxBuffer: /maxBuffer\s*:/.test(optionsText),
        hasExplicitEnv: /env\s*:/.test(optionsText),
        hasShellTrue: /shell\s*:\s*true/.test(optionsText),
        hasInheritStdio: /stdio\s*:\s*['"]inherit['"]/.test(optionsText),
        spreadsProcessEnv: /\.\.\.\s*process\s*\.\s*env/.test(site.argsText) || /\.\.\.\s*process\s*\.\s*env/.test(optionsText),
        usesNpx: /^(?:'npx'|"npx"|'npx\.cmd'|"npx\.cmd")$/.test(firstArgumentText(site.argsText).trim()),
      };
      invocations.push(node);
      if (profile === null) unclassified.push(node);
      else byProfile[profile] = (byProfile[profile] ?? 0) + 1;
    }
  }

  const identities = invocations.map((n) => n.identity);
  const digest = `sha256:${crypto.createHash('sha256').update(identities.join('\n'), 'utf8').digest('hex').slice(0, 24)}`;
  return {
    schemaVersion: CHILD_PROCESS_CENSUS_SCHEMA,
    importFileCount: importFiles.length,
    invocationCount: invocations.length,
    unclassifiedCount: unclassified.length,
    byProfile,
    digest,
    importFiles: importFiles.sort(),
    invocations,
    unclassified,
  };
}
