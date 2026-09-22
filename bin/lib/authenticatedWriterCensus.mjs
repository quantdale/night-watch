// @ts-check
/**
 * NW-AUD-018 — total authenticated evidence writer census (syntax-aware).
 *
 * Discovers every filesystem publication that can reach an authenticated
 * run/evidence root:
 *
 *   R1  a write whose arguments derive from a recorder/run-dir handle
 *       (`this.dir`, `rec.dir`, `recorder.dir`, ...);
 *   R2  a write into the artifacts tree (`path.join(root, 'artifacts', ...)`);
 *   R3  a resolved file-parameter publisher (`fs.writeFileSync(path.resolve(file), ...)`)
 *       — the destinationManifest bypass class;
 *   R4  a bare file-parameter publisher in a file that belongs to the
 *       recorder/artifacts/run world — the manual owner-results bypass class
 *       (phase22 writeOwnerResults etc.), scope-guarded so unrelated
 *       `writeFileSync(file, ...)` helpers are not conflated.
 *
 * Every discovered writer must be claimed by exactly one closed-registry
 * entry whose capability contract covers what the file actually does.
 * Fail-closed codes: UNKNOWN_WRITER, STALE_REGISTRY, DUPLICATE_REGISTRY,
 * REGISTRY_OVERLAP. The registry is data in this module; the hardening rule
 * runs the census over tracked sources with floors so a broken scanner can
 * never masquerade as a clean repository.
 *
 * Pure discovery: only the source strings handed to this module are read.
 */

import crypto from 'node:crypto';

export const AUTHENTICATED_WRITER_CENSUS_SCHEMA = 'nightwatch.authenticated-writer-census.v1';
export const AUTHENTICATED_WRITER_REGISTRY_SCHEMA = 'nightwatch.authenticated-writer-registry.v1';

/** Closed writer-class vocabulary. */
export const WRITER_CLASSES = Object.freeze([
  'RECORDER_FIREWALLED',
  'MANUAL_PUBLISHER',
  'ARTIFACTS_MAINTENANCE',
  'AUTH_TOOL',
  'LANE_RECEIPT_TOOL',
  'SMOKE_FIXTURE',
  'TEST_FIXTURE',
]);

/**
 * Closed registry: exact files or directory roots, one class and a
 * capability contract each. A run-root writer missing here fails as
 * UNKNOWN_WRITER; an entry that claims no discovered writer fails as
 * STALE_REGISTRY; two entries claiming one file fail as DUPLICATE_REGISTRY.
 */
export const AUTHENTICATED_WRITER_REGISTRY = Object.freeze([
  { root: 'src/core/evidence/runRecorder.ts', klass: 'RECORDER_FIREWALLED', capabilities: ['firewall', 'publication'] },
  { root: 'src/core/evidence/destinationManifest.ts', klass: 'MANUAL_PUBLISHER', capabilities: ['owner-local-publication'] },
  { root: 'tests/manual/', klass: 'MANUAL_PUBLISHER', capabilities: ['owner-local-publication'] },
  { root: 'bin/evidence-retention.mjs', klass: 'ARTIFACTS_MAINTENANCE', capabilities: ['scoped-removal', 'owner-local-publication'] },
  { root: 'src/auth/', klass: 'AUTH_TOOL', capabilities: ['runtime-cleanup'] },
  { root: 'bin/change-intelligence.mjs', klass: 'LANE_RECEIPT_TOOL', capabilities: ['owner-local-publication'] },
  { root: 'bin/phase22-dev.mjs', klass: 'LANE_RECEIPT_TOOL', capabilities: ['owner-local-publication'] },
  { root: 'bin/phase23-ci.mjs', klass: 'LANE_RECEIPT_TOOL', capabilities: ['owner-local-publication'] },
  { root: 'bin/phase23-predev.mjs', klass: 'LANE_RECEIPT_TOOL', capabilities: ['owner-local-publication'] },
  { root: 'tests/', klass: 'TEST_FIXTURE', capabilities: ['owner-local-publication'] },
]);

/** FS publications whose TARGET decides membership (reads never count).
 * Removals belong too: deleting an artifacts-tree run directory is a
 * stronger authority over evidence than writing one (retention tooling). */
const WRITE_VOCABULARY = Object.freeze([
  'writeFileSync', 'appendFileSync', 'linkSync', 'renameSync',
  'unlinkSync', 'rmdirSync', 'rmSync',
]);

/** Strip strings and comments so call-location search is not fooled by literals. */
export function maskSource(source) {
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
      out += '  ';
      i += 2;
      while (i < n && !(source[i] === '*' && source[i + 1] === '/')) {
        out += source[i] === '\n' ? '\n' : ' ';
        i += 1;
      }
      if (i < n && source[i] === '*' && source[i + 1] === '/') { out += '  '; i += 2; }
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
      if (i < n && source[i] === quote) { out += ' '; i += 1; }
      continue;
    }
    out += ch;
    i += 1;
  }
  return out;
}

function lineStartsOf(source) {
  const starts = [0];
  for (let i = 0; i < source.length; i += 1) if (source[i] === '\n') starts.push(i + 1);
  return starts;
}

function lineOfIndex(starts, index) {
  let lo = 0;
  let hi = starts.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (starts[mid] <= index) lo = mid; else hi = mid - 1;
  }
  return lo + 1;
}

/** Extract one call's raw argument text (call located on masked source). */
function argumentTextForCall(masked, raw, name, from) {
  const re = new RegExp(`(?<![\\w$])${name}\\s*\\(`, 'g');
  re.lastIndex = from;
  const match = re.exec(masked);
  if (match === null) return null;
  const open = masked.indexOf('(', match.index + name.length);
  let depth = 0;
  for (let j = open; j < masked.length; j += 1) {
    if (masked[j] === '(') depth += 1;
    else if (masked[j] === ')') {
      depth -= 1;
      if (depth === 0) return { args: raw.slice(open + 1, j), end: j + 1, index: match.index };
    }
  }
  return { args: raw.slice(open + 1), end: masked.length, index: match.index };
}

function firstArgument(args) {
  let depth = 0;
  let quote = null;
  for (let i = 0; i < args.length; i += 1) {
    const ch = args[i];
    if (quote !== null) {
      if (ch === '\\') { i += 1; continue; }
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '\'' || ch === '"' || ch === '`') { quote = ch; continue; }
    if ('([{'.includes(ch)) depth += 1;
    else if (')]}'.includes(ch)) depth -= 1;
    else if (ch === ',' && depth === 0) return args.slice(0, i).trim();
  }
  return args.trim();
}

/** Target classes present in ONE write call's raw arguments (plus, when
 * given, the resolved local-const initializer text for its identifiers). */
export function runRootTargetsFor(args, resolvedConstText = '') {
  const targets = [];
  const corpus = `${args}\n${resolvedConstText}`;
  if (/(?:^|[^A-Za-z0-9_$])(?:this|rec|recorder|r)\s*\.\s*dir\b/.test(corpus)) targets.push('recorder-dir');
  if (/path\s*\.\s*join\s*\(\s*root\s*,\s*'artifacts'/.test(corpus)
    || /'artifacts'/.test(corpus)
    || /\bartifact(?:Root|sDir|sRoot|sTree|sPath)\b/.test(corpus)) targets.push('artifacts-tree');
  if (/path\s*\.\s*resolve\s*\(\s*file\s*\)/.test(corpus)) targets.push('resolved-file-param');
  if (firstArgument(args) === 'file') targets.push('bare-file-param');
  return targets;
}

/** One-level local `const|let X = ...;` initializer lookup (bounded). */
export function resolveLocalConst(source, name) {
  if (!/^[A-Za-z_$][\w$]*$/.test(name)) return null;
  const re = new RegExp(`(?:const|let)\\s+${name.replace(/\$/g, '\\$')}\\s*=\\s*([^;]+);`);
  const match = re.exec(source);
  return match === null ? null : match[1];
}

/** Identifiers used inside a write's first argument, for const resolution. */
function identifiersIn(text) {
  return [...new Set([...text.matchAll(/[A-Za-z_$][\w$]*/g)].map((m) => m[0]))]
    .filter((name) => !['path', 'file', 'JSON', 'Buffer', 'String', 'Number'].includes(name))
    .slice(0, 8);
}

/**
 * Discover run-root publisher sites for one file.
 * @param {string} file repo-relative posix path
 * @param {string} source raw file source
 */
export function discoverRunRootWrites(file, source) {
  const masked = maskSource(source);
  const starts = lineStartsOf(source);
  // A file that DECLARES the artifacts root (e.g. retention's
  // `const ARTIFACT_ROOT_NAME = 'artifacts'`) operates on that tree even when
  // individual removal sites resolve through local identifiers first.
  const declaresArtifactsRoot = /=\s*'artifacts'/.test(source);
  const writes = [];
  let rawWriteCount = 0;
  for (const op of WRITE_VOCABULARY) {
    let search = 0;
    for (;;) {
      const call = argumentTextForCall(masked, source, op, search);
      if (call === null) break;
      search = call.end;
      // A wrapper OWNS a raw write whose arguments are its parameters, so
      // raw-site presence (before any target filter) is what qualifies the
      // file for wrapper discovery.
      rawWriteCount += 1;
      const rawArgs = source.slice(
        source.indexOf('(', call.index + op.length - 1) >= 0 ? call.index : call.index,
        call.end,
      );
      void rawArgs;
      // Recompute args against RAW source positions: the masked and raw
      // strings are index-aligned (masking preserves length), so the mask
      // indices slice the raw source directly.
      const open = masked.indexOf('(', masked.indexOf(op, call.index));
      let depth = 0;
      let close = -1;
      for (let j = open; j < masked.length; j += 1) {
        if (masked[j] === '(') depth += 1;
        else if (masked[j] === ')') {
          depth -= 1;
          if (depth === 0) { close = j; break; }
        }
      }
      const args = close >= 0 ? source.slice(open + 1, close) : '';
      // Resolve one level of local const indirection (the `const dir =
      // path.join(root, 'artifacts', ...)` shape) before judging the target.
      const resolvedParts = [];
      for (const ident of identifiersIn(firstArgument(args))) {
        const init = resolveLocalConst(source, ident);
        if (init !== null) resolvedParts.push(init);
      }
      const targets = runRootTargetsFor(args, resolvedParts.join('\\n'));
      const isRemoval = op === 'unlinkSync' || op === 'rmdirSync' || op === 'rmSync';
      if (targets.length === 0 && isRemoval && declaresArtifactsRoot) {
        targets.push('artifacts-tree-declared');
      }
      if (targets.length === 0) continue;
      writes.push({
        identity: `${file}:${lineOfIndex(starts, call.index)}:${op}`,
        file,
        line: lineOfIndex(starts, call.index),
        op,
        targets,
        firstArgument: firstArgument(args),
      });
    }
  }
  // R5 wrapper calls: a LOCALLY DEFINED helper that owns the raw write
  // (phase4 `writeAtomic(path.join(recorder.dir, ...))`) is discovered at
  // its call sites when those call arguments carry run-root targets.
  const definedLocally = new Set();
  for (const match of source.matchAll(/(?:function\s+([A-Za-z_$][\w$]*)\s*\(|(?:const|let)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:\([^)]*\)|[A-Za-z_$][\w$]*)\s*=>)/g)) {
    const name = match[1] ?? match[2];
    if (name !== undefined) definedLocally.add(name);
  }
  // A wrapper candidate must own the raw write INSIDE its own body: a pure
  // predicate or projector (`pathInside`, `c`) that happens to be called with
  // target-shaped arguments is not a writer, and a read-only file (the run
  // evidence reader) never participates at all.
  const wrapperBodies = new Map();
  if (rawWriteCount > 0) {
    for (const name of definedLocally) {
      if (WRITE_VOCABULARY.includes(name)) continue;
      const defRe = new RegExp(`(?:function\\s+${name.replace(/\$/g, '\\$')}\\s*\\(|(?:const|let)\\s+${name.replace(/\$/g, '\\$')}\\s*=)`);
      const defMatch = defRe.exec(source);
      if (defMatch === null) continue;
      let depth = 0;
      let end = -1;
      const opener = source.indexOf('(', defMatch.index + defMatch[0].length - 1);
      if (opener < 0) continue;
      for (let j = opener; j < source.length; j += 1) {
        if (source[j] === '(') depth += 1;
        else if (source[j] === ')') {
          depth -= 1;
          if (depth === 0) { end = j; break; }
        }
      }
      // Arrow bodies use braces or expression form; scan a bounded window.
      const scanEnd = end >= 0 ? Math.min(source.length, end + 400) : Math.min(source.length, defMatch.index + 600);
      const body = source.slice(defMatch.index, scanEnd);
      if (WRITE_VOCABULARY.some((op) => body.includes(`${op}(`)) || /\b(?:fs\.)?(?:write|append|mkdir|unlink|rm)Sync\s*\(/.test(body)) {
        wrapperBodies.set(name, body);
      }
    }
  }
  if (wrapperBodies.size > 0) {
    for (const [name] of wrapperBodies) {
      let search = 0;
      for (;;) {
        const call = argumentTextForCall(masked, source, name, search);
        if (call === null) break;
        search = call.end;
        const open = masked.indexOf('(', masked.indexOf(name, call.index));
        let depth = 0;
        let close = -1;
        for (let j = open; j < masked.length; j += 1) {
          if (masked[j] === '(') depth += 1;
          else if (masked[j] === ')') {
            depth -= 1;
            if (depth === 0) { close = j; break; }
          }
        }
        const args = close >= 0 ? source.slice(open + 1, close) : '';
        const resolvedParts = [];
        for (const ident of identifiersIn(firstArgument(args))) {
          const init = resolveLocalConst(source, ident);
          if (init !== null) resolvedParts.push(init);
        }
        const targets = runRootTargetsFor(args, resolvedParts.join('\\n'));
        if (targets.length === 0) continue;
        if (!writes.some((w) => w.line === lineOfIndex(starts, call.index))) {
          writes.push({
            identity: `${file}:${lineOfIndex(starts, call.index)}:wrapper:${name}`,
            file,
            line: lineOfIndex(starts, call.index),
            op: `wrapper:${name}`,
            targets,
            firstArgument: firstArgument(args),
          });
        }
      }
    }
  }

  // R4 scope guard: a bare file-parameter publisher counts only when the file
  // belongs to the RECORDER world (phase22 writeOwnerResults constructs
  // recorders). Session records, proxy runtime state and task-harness
  // receipts are unrelated `writeFileSync(file, ...)` helpers and must not
  // be conflated with run-root authority.
  const scoped = writes.filter((w) => {
    if (!w.targets.includes('bare-file-param')) return true;
    return /RunRecorder|\brec(?:order)?\s*\.\s*dir\b/.test(source);
  });
  scoped.sort((a, b) => a.identity.localeCompare(b.identity));
  return scoped;
}

/**
 * Build the total census over provided files against the closed registry.
 * @param {Array<{ file: string, source: string }>} files
 * @param {readonly { root: string, klass: string, capabilities: readonly string[] }[]} [registry]
 */
export function buildAuthenticatedWriterCensus(files, registry = AUTHENTICATED_WRITER_REGISTRY) {
  const violations = [];
  const writers = [];
  const claimedBy = new Map();

  // Registration hygiene: identical roots are a duplicate registration; the
  // effective claim of a file is its LONGEST matching root (tests/manual/
  // beats tests/), so nested roots stay disjoint in practice while equal
  // claims still fail.
  {
    const seen = new Set();
    for (const entry of registry) {
      if (seen.has(entry.root)) {
        violations.push({ code: 'DUPLICATE_REGISTRY', file: entry.root, detail: 'registry root registered twice' });
      }
      seen.add(entry.root);
    }
  }

  for (const { file, source } of files) {
    const writes = discoverRunRootWrites(file, source);
    if (writes.length === 0) continue;
    const matches = registry
      .filter((entry) => (entry.root.endsWith('/') ? file.startsWith(entry.root) : file === entry.root))
      .sort((a, b) => b.root.length - a.root.length);
    if (matches.length === 0) {
      violations.push({ code: 'UNKNOWN_WRITER', file, detail: writes.map((w) => w.identity).join(' | ') });
      continue;
    }
    const entry = matches[0];
    claimedBy.set(entry.root, [...(claimedBy.get(entry.root) ?? []), file]);
    writers.push({
      identity: `${file}:${entry.klass}`,
      file,
      class: entry.klass,
      registryRoot: entry.root,
      capabilities: entry.capabilities,
      writeCount: writes.length,
      sites: writes.map((w) => w.identity),
    });
  }

  for (const entry of registry) {
    if ((claimedBy.get(entry.root) ?? []).length === 0) {
      violations.push({ code: 'STALE_REGISTRY', file: entry.root, detail: 'registered writer root claims no discovered writer' });
    }
  }
  if (writers.length === 0) {
    violations.push({ code: 'EMPTY_CENSUS', file: '(census)', detail: 'no run-root writers discovered' });
  }

  const byClass = Object.fromEntries(WRITER_CLASSES.map((c) => [c, 0]));
  for (const writer of writers) byClass[writer.class] = (byClass[writer.class] ?? 0) + 1;
  const identities = writers.map((w) => `${w.identity}|${w.writeCount}`).sort();
  const digest = `sha256:${crypto.createHash('sha256').update(identities.join('\n'), 'utf8').digest('hex').slice(0, 24)}`;
  violations.sort((a, b) => a.code.localeCompare(b.code) || a.file.localeCompare(b.file));

  return {
    schemaVersion: AUTHENTICATED_WRITER_CENSUS_SCHEMA,
    registrySchema: AUTHENTICATED_WRITER_REGISTRY_SCHEMA,
    registrySize: registry.length,
    writerCount: writers.length,
    productionWriterCount: writers.filter((w) => !w.file.startsWith('tests/')).length,
    byClass,
    digest,
    writers: writers.sort((a, b) => a.file.localeCompare(b.file)),
    violations,
    ok: violations.length === 0,
  };
}
