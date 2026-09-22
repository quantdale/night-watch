// @ts-check
/**
 * NW-AUD-019 — total private-payload consumer census (syntax-aware).
 *
 * Discovers every call site of the shared private-screening API and every
 * direct PrivateArtifactStore writer/reader/constructor in the repository,
 * classifies each consuming file under a closed consumer class, and binds the
 * result to a closed registry of disjoint roots with per-root capability
 * contracts. Fail-closed outcomes, all categorical:
 *
 *   UNKNOWN_CONSUMER   a consumer file exists outside every registered root
 *   STALE_REGISTRY     a registered root claims no consumer file
 *   DUPLICATE_REGISTRY a file is claimed by more than one registered root
 *   CAPABILITY_BYPASS  a consumer exercises an activity its root forbids
 *   EMPTY_CENSUS       discovery found no consumers at all (vacuous proof)
 *
 * The census is pure discovery: this module reads only the source strings
 * handed to it and never touches the filesystem or network.
 */

import crypto from 'node:crypto';

export const PRIVATE_CONSUMER_CENSUS_SCHEMA = 'nightwatch.private-consumer-census.v1';
export const PRIVATE_CONSUMER_REGISTRY_SCHEMA = 'nightwatch.private-consumer-registry.v1';

/** Closed consumer-class vocabulary. */
export const CONSUMER_CLASSES = Object.freeze([
  'SCREENING_LIBRARY',
  'STORE_LIBRARY',
  'STORE_WRITER',
  'STORE_READER',
  'SCREENING_CALLER',
  'HARDENING_RULE',
  'SYNTHETIC_FIXTURE',
  'TEST_ONLY',
]);

/** Closed activity vocabulary (per file, subset-checked against the registry). */
export const CONSUMER_ACTIVITIES = Object.freeze(['screen', 'write', 'read']);

/** Shared screening API whose call sites must all be accounted for. */
export const SCREENING_API = Object.freeze([
  'containsPrivatePayload',
  'containsPrivatePayloadShape',
  'containsStructuralPrivateShape',
  'findStructuralPrivateFailure',
  'containsLabeledPrivateValue',
  'containsSecretOrSentinelShape',
]);

/** Replacement-capable and immutable private-store writers. */
export const STORE_WRITE_API = Object.freeze(['writeJson', 'writeIncomplete', 'writeImmutableJson']);
/** Private-store readers (store-level revalidation entry points). */
export const STORE_READ_API = Object.freeze(['readJson']);

/**
 * Closed registry: disjoint roots, one class and a capability contract each.
 * A new private-payload consumer MUST be registered here (or it fails as
 * UNKNOWN_CONSUMER), an abandoned root fails as STALE_REGISTRY, overlapping
 * roots fail as DUPLICATE_REGISTRY, and an activity outside the contract
 * fails as CAPABILITY_BYPASS.
 */
export const PRIVATE_CONSUMER_REGISTRY = Object.freeze([
  { root: 'src/core/policy/privateScreening.ts', klass: 'SCREENING_LIBRARY', capabilities: ['screen'] },
  { root: 'src/core/policy/privateArtifacts.ts', klass: 'STORE_LIBRARY', capabilities: ['screen', 'write', 'read'] },
  { root: 'src/core/reviewStore/', klass: 'STORE_WRITER', capabilities: ['write', 'read'] },
  { root: 'src/core/aiReview/', klass: 'STORE_WRITER', capabilities: ['write', 'read'] },
  { root: 'src/core/campaign/', klass: 'STORE_WRITER', capabilities: ['write', 'read'] },
  { root: 'src/core/triage/', klass: 'STORE_WRITER', capabilities: ['write'] },
  { root: 'src/core/selfDev/', klass: 'STORE_WRITER', capabilities: ['write', 'read'] },
  { root: 'src/core/selfDevSandbox/', klass: 'STORE_WRITER', capabilities: ['write', 'read'] },
  { root: 'src/core/selfDevPromotion/', klass: 'STORE_WRITER', capabilities: ['write', 'read'] },
  { root: 'src/core/prodEvidence/', klass: 'SCREENING_CALLER', capabilities: ['screen'] },
  { root: 'src/controlCenter/authorities/', klass: 'SCREENING_CALLER', capabilities: ['screen'] },
  { root: 'corpus/', klass: 'SYNTHETIC_FIXTURE', capabilities: ['screen', 'write', 'read'] },
  { root: 'tests/', klass: 'TEST_ONLY', capabilities: ['screen', 'write', 'read'] },
]);

/** Strip strings and comments so call-site search is not fooled by literals. */
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

function callCount(masked, name) {
  // Identifier-head only: `store.writeJson(` counts (the dot is not a word
  // character), `awriteJson(` does not, and a backslash between name and
  // paren (a rule pattern that merely mentions the API) is not a call site.
  const re = new RegExp(`(?<![\\w])${name.replace(/\\./g, '\\\\.') }\\s*\\(`, 'g');
  return [...masked.matchAll(re)].length;
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

function callSites(masked, starts, name) {
  const re = new RegExp(`(?<![\\w])${name.replace(/\\./g, '\\\\.') }\\s*\\(`, 'g');
  const lines = [];
  for (const match of masked.matchAll(re)) lines.push(lineOfIndex(starts, match.index));
  return lines;
}

/**
 * Discover privacy-relevant activity for one file.
 * @param {string} file repo-relative posix path
 * @param {string} source raw file source
 */
export function discoverConsumerActivity(file, source) {
  const masked = maskSource(source);
  const starts = lineStartsOf(source);
  const screenSites = [];
  for (const name of SCREENING_API) {
    for (const line of callSites(masked, starts, name)) screenSites.push({ api: name, line });
  }
  const writeSites = [];
  for (const name of STORE_WRITE_API) {
    for (const line of callSites(masked, starts, name)) writeSites.push({ api: name, line });
  }
  const readSites = [];
  for (const name of STORE_READ_API) {
    for (const line of callSites(masked, starts, name)) readSites.push({ api: name, line });
  }
  const constructsStore = callCount(masked, 'new PrivateArtifactStore') > 0
    || /new\s+PrivateArtifactStore\s*\(/.test(masked);
  const referencesStore = /PrivateArtifactStore/.test(masked);
  // Store read/write activity is only attributed when the file binds the
  // store type itself; a coincidental `x.readJson(` elsewhere is not a
  // private-store consumer.
  const activities = new Set();
  if (screenSites.length > 0) activities.add('screen');
  if (referencesStore && (writeSites.length > 0 || constructsStore)) activities.add('write');
  if (referencesStore && readSites.length > 0) activities.add('read');
  return {
    file,
    activities: [...activities].sort(),
    screenSites: screenSites.sort((a, b) => a.line - b.line || a.api.localeCompare(b.api)),
    writeSites: writeSites.sort((a, b) => a.line - b.line || a.api.localeCompare(b.api)),
    readSites: readSites.sort((a, b) => a.line - b.line || a.api.localeCompare(b.api)),
    referencesStore,
    constructsStore,
  };
}

/** Exact-file registry entries are consumers by DEFINITION when present. */
function isDefinitionalRoot(file, registry) {
  return registry.some((entry) => entry.root === file && !entry.root.endsWith('/'));
}

/**
 * Build the total census over provided files against a closed registry.
 * The registry parameter exists so adversarial tests can inject unknown,
 * stale, duplicate and capability-bypass registries; production callers use
 * the closed PRIVATE_CONSUMER_REGISTRY default.
 * @param {Array<{ file: string, source: string }>} files
 * @param {readonly { root: string, klass: string, capabilities: readonly string[] }[]} [registry]
 */
export function buildPrivateConsumerCensus(files, registry = PRIVATE_CONSUMER_REGISTRY) {
  const violations = [];
  const consumers = [];
  const claimedBy = new Map(); // registry root -> consumer files

  for (const { file, source } of files) {
    const activity = discoverConsumerActivity(file, source);
    if (activity.activities.length === 0 && !isDefinitionalRoot(file, registry)) continue;
    const matches = registry.filter((entry) => file.startsWith(entry.root));
    if (matches.length === 0) {
      violations.push({ code: 'UNKNOWN_CONSUMER', file, detail: 'outside every registered root' });
      continue;
    }
    if (matches.length > 1) {
      violations.push({ code: 'DUPLICATE_REGISTRY', file, detail: matches.map((m) => m.root).join(' | ') });
      continue;
    }
    const entry = matches[0];
    const klass = entry.klass;
    claimedBy.set(entry.root, [...(claimedBy.get(entry.root) ?? []), file]);
    const unauthorized = activity.activities.filter((a) => !entry.capabilities.includes(a));
    if (unauthorized.length > 0) {
      violations.push({ code: 'CAPABILITY_BYPASS', file, detail: `${unauthorized.join(',')} not in [${entry.capabilities.join(',')}]` });
      continue;
    }
    consumers.push({
      identity: `${file}:${klass}`,
      file,
      class: klass,
      registryRoot: entry.root,
      activities: activity.activities,
      screenCalls: activity.screenSites.length,
      writeCalls: activity.writeSites.length,
      readCalls: activity.readSites.length,
    });
  }

  for (const entry of registry) {
    if ((claimedBy.get(entry.root) ?? []).length === 0) {
      violations.push({ code: 'STALE_REGISTRY', file: entry.root, detail: 'registered root claims no consumer' });
    }
  }
  if (consumers.length === 0) {
    violations.push({ code: 'EMPTY_CENSUS', file: '(census)', detail: 'no private-payload consumers discovered' });
  }

  const byClass = Object.fromEntries(CONSUMER_CLASSES.map((c) => [c, 0]));
  for (const consumer of consumers) byClass[consumer.class] = (byClass[consumer.class] ?? 0) + 1;
  const identities = consumers.map((c) => `${c.identity}|${c.activities.join('+')}`).sort();
  const digest = `sha256:${crypto.createHash('sha256').update(identities.join('\n'), 'utf8').digest('hex').slice(0, 24)}`;

  violations.sort((a, b) => a.code.localeCompare(b.code) || a.file.localeCompare(b.file));
  return {
    schemaVersion: PRIVATE_CONSUMER_CENSUS_SCHEMA,
    registrySchema: PRIVATE_CONSUMER_REGISTRY_SCHEMA,
    registrySize: registry.length,
    consumerCount: consumers.length,
    productionConsumerCount: consumers.filter((c) => !c.file.startsWith('tests/')).length,
    writerCount: consumers.filter((c) => c.activities.includes('write') && !c.file.startsWith('tests/')).length,
    screenCallCount: consumers.reduce((total, c) => total + c.screenCalls, 0),
    byClass,
    digest,
    consumers: consumers.sort((a, b) => a.file.localeCompare(b.file)),
    violations,
    ok: violations.length === 0,
  };
}
