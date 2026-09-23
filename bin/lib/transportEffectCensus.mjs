// @ts-check
/**
 * NW-AUD-020 Step 7 — TOTAL transport-effect census (syntax-aware).
 *
 * Discovers every authority-bearing product-effect site in the repository:
 * browser route continuation, WebSocket establishment, CDP Fetch
 * continuation, upstream dials (net/tls), relay fetch/forwarding, and
 * http(s) request clients. Every discovered site must be claimed by exactly
 * one closed registry entry whose class states WHICH semantic authority
 * governs it. Fail-closed codes: UNKNOWN_EFFECT, STALE_REGISTRY,
 * DUPLICATE_REGISTRY, EMPTY_CENSUS. Pure discovery — source strings only.
 */

import crypto from 'node:crypto';

export const TRANSPORT_CENSUS_SCHEMA = 'nightwatch.transport-effect-census.v1';
export const TRANSPORT_REGISTRY_SCHEMA = 'nightwatch.transport-effect-registry.v1';

/** Closed effect-site vocabulary (what discovery recognizes). */
export const EFFECT_VOCABULARY = Object.freeze([
  'route.continue',
  'connectToServer',
  'cdp:Fetch.continue',
  'net.connect',
  'net.createConnection',
  'tls.connect',
  'fetch',
  'fetcher',
  'http.request',
  'https.request',
]);

/** Closed authority classes (what may govern a discovered site). */
export const EFFECT_CLASSES = Object.freeze([
  'SEMANTIC_ADMISSION',
  'PROXY_UPSTREAM_DIAL',
  'CONTAINED_ENVELOPE',
  'SEMANTIC_COMPOSED',
  'LOCAL_LOOPBACK_CLIENT',
  // Reserved: a fixture-side EFFECT site forces an explicit registration
  // decision (current fixture fetches live only inside masked page templates).
  'FIXTURE_SUPPORT',
  'MANUAL_LANE',
  'TEST_FIXTURE',
]);

/**
 * Closed registry: disjoint roots (longest wins), one authority class each.
 * A new effect site outside every root fails as UNKNOWN_EFFECT; a root that
 * claims no discovered site fails as STALE_REGISTRY.
 */
export const TRANSPORT_EFFECT_REGISTRY = Object.freeze([
  { root: 'src/browser/observers/networkObserver.ts', klass: 'SEMANTIC_ADMISSION' },
  { root: 'src/browser/network/fetchGuard.ts', klass: 'SEMANTIC_ADMISSION' },
  { root: 'src/proxy/server.ts', klass: 'PROXY_UPSTREAM_DIAL' },
  { root: 'src/core/oops/l6.ts', klass: 'CONTAINED_ENVELOPE' },
  { root: 'src/api/phase5/relay.ts', klass: 'SEMANTIC_COMPOSED' },
  { root: 'src/core/aiReview/loopbackProvider.ts', klass: 'LOCAL_LOOPBACK_CLIENT' },
  { root: 'src/proxy/runtime.ts', klass: 'LOCAL_LOOPBACK_CLIENT' },
  { root: 'tests/manual/', klass: 'MANUAL_LANE' },
  { root: 'tests/', klass: 'TEST_FIXTURE' },
]);

/** Block-aware mask: strips strings/comments so call LOCATION survives. */
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

function lineOf(starts, index) {
  let lo = 0;
  let hi = starts.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (starts[mid] <= index) lo = mid; else hi = mid - 1;
  }
  return lo + 1;
}

const IDENTIFIER_PATTERNS = Object.freeze([
  { name: 'route.continue', re: /(?<![\w$.])route\s*\.\s*continue\s*\(/g },
  { name: 'connectToServer', re: /(?<![\w$.])\w*\s*\.\s*connectToServer\s*\(|(?<![\w$.])connectToServer\s*\(/g },
  { name: 'net.connect', re: /(?<![\w$.])net\s*\.\s*connect\s*\(/g },
  { name: 'net.createConnection', re: /(?<![\w$.])(?:net|tls)\s*\.\s*createConnection\s*\(/g },
  { name: 'tls.connect', re: /(?<![\w$.])tls\s*\.\s*connect\s*\(/g },
  { name: 'fetch', re: /(?<![\w$.])fetch\s*\(/g },
  { name: 'fetcher', re: /(?<![\w$.])fetcher\s*\(/g },
  { name: 'http.request', re: /(?<![\w$.])http\s*\.\s*request\s*\(/g },
  { name: 'https.request', re: /(?<![\w$.])https\s*\.\s*request\s*\(/g },
  // CDP effect continuation lives in STRING arguments to session.send —
  // located on masked source, classified on the RAW argument text.
  { name: 'cdp:Fetch.continue', re: /(?<![\w$])send\s*\(/g },
]);

const CDP_EFFECT_RE = /['"]Fetch\.(?:continueRequest|continueResponse|followRedirectRequest)['"]/;

/**
 * Discover effect sites for one file. Returns [] for files with none.
 * @param {string} file
 * @param {string} source
 */
export function discoverEffectSites(file, source) {
  const masked = maskSource(source);
  const starts = (() => {
    const arr = [0];
    for (let i = 0; i < source.length; i += 1) if (source[i] === '\n') arr.push(i + 1);
    return arr;
  })();
  const sites = [];
  for (const { name, re } of IDENTIFIER_PATTERNS) {
    const rx = new RegExp(re.source, re.flags);
    let match;
    while ((match = rx.exec(masked)) !== null) {
      if (name === 'cdp:Fetch.continue') {
        // Classify from the RAW argument list (strings were masked).
        const open = masked.indexOf('(', match.index + match[0].length - 1);
        if (open < 0) continue;
        let depth = 0;
        let end = -1;
        for (let j = open; j < masked.length; j += 1) {
          if (masked[j] === '(') depth += 1;
          else if (masked[j] === ')') { depth -= 1; if (depth === 0) { end = j; break; } }
        }
        const rawArgs = end >= 0 ? source.slice(open + 1, end) : '';
        if (!CDP_EFFECT_RE.test(rawArgs)) continue;
      }
      sites.push({
        identity: `${file}:${lineOf(starts, match.index)}:${name}`,
        file,
        line: lineOf(starts, match.index),
        effect: name,
      });
    }
  }
  // net/tls double-count: 'net.connect' and 'tls.connect' share a pattern
  // above via alternation — dedupe by identity.
  const seen = new Set();
  return sites.filter((site) => (seen.has(site.identity) ? false : (seen.add(site.identity), true)));
}

function matchesRoot(file, root) {
  return root.endsWith('/') ? file.startsWith(root) : file === root;
}

/**
 * Build the total census over provided files against the closed registry.
 * @param {{file: string, source: string}[]} files
 * @param {{root: string, klass: string}[]} [registry]
 */
export function buildTransportEffectCensus(files, registry = TRANSPORT_EFFECT_REGISTRY) {
  const violations = [];
  const sites = [];
  for (const { file, source } of files) {
    for (const site of discoverEffectSites(file, source)) sites.push(site);
  }

  const claimed = new Map();
  const writers = [];
  for (const site of sites) {
    const matches = registry
      .filter((entry) => matchesRoot(site.file, entry.root))
      .sort((a, b) => b.root.length - a.root.length);
    if (matches.length === 0) {
      violations.push({ code: 'UNKNOWN_EFFECT', file: site.file, detail: site.identity });
      continue;
    }
    const entry = matches[0];
    claimed.set(entry.root, (claimed.get(entry.root) ?? 0) + 1);
    writers.push({ ...site, klass: entry.klass, registryRoot: entry.root });
  }

  for (const entry of registry) {
    if ((claimed.get(entry.root) ?? 0) === 0) {
      violations.push({ code: 'STALE_REGISTRY', file: entry.root, detail: 'registered root claims no discovered effect site' });
    }
  }
  const rootSet = new Set(registry.map((entry) => entry.root));
  if (rootSet.size !== registry.length) {
    violations.push({ code: 'DUPLICATE_REGISTRY', file: '(registry)', detail: 'duplicate root registration' });
  }
  if (sites.length === 0) {
    violations.push({ code: 'EMPTY_CENSUS', file: '(census)', detail: 'no effect sites discovered' });
  }

  const byClass = Object.fromEntries(EFFECT_CLASSES.map((c) => [c, 0]));
  for (const site of writers) byClass[site.klass] = (byClass[site.klass] ?? 0) + 1;
  const byEffect = Object.fromEntries(EFFECT_VOCABULARY.map((v) => [v, 0]));
  for (const site of sites) byEffect[site.effect] = (byEffect[site.effect] ?? 0) + 1;
  const identities = sites.map((site) => site.identity).sort();
  const digest = `sha256:${crypto.createHash('sha256').update(identities.join('\n'), 'utf8').digest('hex').slice(0, 24)}`;
  violations.sort((a, b) => a.code.localeCompare(b.code) || a.file.localeCompare(b.file));

  return {
    schemaVersion: TRANSPORT_CENSUS_SCHEMA,
    registrySchema: TRANSPORT_REGISTRY_SCHEMA,
    registrySize: registry.length,
    siteCount: sites.length,
    classifiedCount: writers.length,
    byClass,
    byEffect,
    digest,
    sites: writers.sort((a, b) => a.identity.localeCompare(b.identity)),
    violations,
    ok: violations.length === 0,
  };
}
