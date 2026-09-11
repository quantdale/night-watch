// ---------------------------------------------------------------------------
// C-08b — bounded deployment-manifest reader (deployment fact acquisition).
//
// This module is the ONLY route from a `mochi` ingress manifest to a
// `DEPLOYMENT_FACT`. It exists so that, once the owner obtains read-only
// access at exactly:
//
//     services/{env}/{appproxy,serviceproxy}/ingress.yaml
//
// the derivation is mechanical and reviewable rather than an assertion:
//
//   - a BOUNDED reader over already-read text (no filesystem, process or
//     network authority: the confined sibling-source reader performs the read);
//   - a deterministic `ev:sha256:<24>` evidence digest over the NORMALIZED
//     structure used to derive, so reformatting is not a change while a
//     semantic change is;
//   - provenance bound to `repo @ SHA : path`, so a changed manifest requires
//     fresh derivation and a fact is never silently re-bound;
//   - fail-closed behaviour on ambiguity: an ambiguous, multi-match, templated
//     or environment-conditional mapping yields an explicit unknown and NO
//     fact.
//
// A manifest supplied from any other route (another repository, another path,
// a checkout copy, a hand-written fixture passed as real data) is REFUSED. The
// module cannot tell where its caller obtained the text, so it refuses
// everything except the exact approved repository and exact bounded path, and
// requires the caller to present the SHA the text was read at.
//
// U-1 (host → service) and U-2 (service → deployed) stay EXPLICITLY UNKNOWN in
// `src/core/source/deploymentBinding.ts`; this reader produces separately
// named facts and does not rewrite that module's typed-unresolved projection.
//
// Data-only: no I/O anywhere in this file.
// ---------------------------------------------------------------------------

import crypto from 'node:crypto';

export const DEPLOYMENT_MANIFEST_READER_VERSION = 'nightwatch.deployment-manifest-reader.v1' as const;

/** The ONLY repository whose manifests are approved evidence. */
export const DEPLOYMENT_MANIFEST_REPO_ID = 'mochi' as const;

export const DEPLOYMENT_MANIFEST_PROXIES = ['appproxy', 'serviceproxy'] as const;
export type DeploymentManifestProxy = (typeof DEPLOYMENT_MANIFEST_PROXIES)[number];

/**
 * The environments this reader may reason about. Kept a closed set: an
 * unknown `{env}` segment is a refusal, never a wildcard.
 */
export const DEPLOYMENT_MANIFEST_ENVIRONMENTS = ['dev', 'next', 'prod'] as const;
export type DeploymentManifestEnvironment = (typeof DEPLOYMENT_MANIFEST_ENVIRONMENTS)[number];

export const DEPLOYMENT_MANIFEST_MAX_BYTES = 2_000_000;
export const DEPLOYMENT_MANIFEST_MAX_ENTRIES = 4096;

/** The exact bounded path for an environment and proxy. */
export function deploymentManifestPath(
  environment: DeploymentManifestEnvironment,
  proxy: DeploymentManifestProxy,
): string {
  return `services/${environment}/${proxy}/ingress.yaml`;
}

export const DEPLOYMENT_MANIFEST_REFUSAL_CODES = [
  /** The evidence did not come from the approved repository. */
  'MANIFEST_SOURCE_NOT_APPROVED',
  /** The presented SHA is not a full 40-hex commit id. */
  'MANIFEST_SHA_INVALID',
  'MANIFEST_ENVIRONMENT_UNKNOWN',
  'MANIFEST_PROXY_UNKNOWN',
  /** The path is not exactly the bounded `services/{env}/{proxy}/ingress.yaml`. */
  'MANIFEST_PATH_NOT_ALLOWED',
  'MANIFEST_TOO_LARGE',
  /** `{{ }}`, `${ }` or another template marker: the mapping is not static. */
  'MANIFEST_TEMPLATED',
  'MANIFEST_MULTI_DOCUMENT',
  /** Anchors, aliases, merge keys or tab indentation: outside the bounded subset. */
  'MANIFEST_UNPARSEABLE',
  /** The document is not an Ingress. */
  'MANIFEST_KIND_UNSUPPORTED',
] as const;
export type DeploymentManifestRefusalCode = (typeof DEPLOYMENT_MANIFEST_REFUSAL_CODES)[number];

export const DEPLOYMENT_MANIFEST_UNKNOWN_CODES = [
  /** A rule with no `host:` applies to every host name, so route → host is ambiguous. */
  'HOST_UNSPECIFIED',
  /** The host carries a template/conditional segment. */
  'HOST_TEMPLATED',
  /** The route carries a template/conditional segment. */
  'ROUTE_TEMPLATED',
  /** The path has no backend service. */
  'SERVICE_BACKEND_MISSING',
  /** More than one backend service claims the same host and path. */
  'SERVICE_BACKEND_AMBIGUOUS',
  /** Both a port `name` and a port `number` are present, or the port is malformed. */
  'PORT_AMBIGUOUS',
  /** The bounded entry budget was reached; the remainder was not guessed. */
  'ENTRY_BUDGET_EXCEEDED',
] as const;
export type DeploymentManifestUnknownCode = (typeof DEPLOYMENT_MANIFEST_UNKNOWN_CODES)[number];

export interface DeploymentManifestProvenance {
  readonly repoId: string;
  readonly sourceSha: string;
  readonly path: string;
  readonly environment: DeploymentManifestEnvironment;
  readonly proxy: DeploymentManifestProxy;
}

/** `repo @ SHA : path`, the only identity a derived fact is bound to. */
export function deploymentManifestProvenanceIdentity(provenance: DeploymentManifestProvenance): string {
  return `${provenance.repoId}@${provenance.sourceSha}:${provenance.path}`;
}

export interface DeploymentManifestFact {
  readonly factCategory: 'DEPLOYMENT_FACT';
  readonly hop: 'HOST_TO_SERVICE';
  readonly environment: DeploymentManifestEnvironment;
  readonly proxy: DeploymentManifestProxy;
  readonly host: string;
  readonly routePath: string;
  readonly service: string;
  readonly servicePort: string | null;
  readonly provenanceIdentity: string;
  readonly evidenceDigest: string;
  readonly readerVersion: typeof DEPLOYMENT_MANIFEST_READER_VERSION;
}

export interface DeploymentManifestUnknown {
  readonly code: DeploymentManifestUnknownCode;
  readonly environment: DeploymentManifestEnvironment;
  readonly proxy: DeploymentManifestProxy;
  readonly host: string | null;
  readonly routePath: string | null;
}

export interface DeploymentManifestReadSuccess {
  readonly ok: true;
  readonly provenanceIdentity: string;
  readonly evidenceDigest: string;
  readonly facts: readonly DeploymentManifestFact[];
  readonly unknowns: readonly DeploymentManifestUnknown[];
}

export interface DeploymentManifestReadRefusal {
  readonly ok: false;
  readonly refusalCode: DeploymentManifestRefusalCode;
}

export type DeploymentManifestReadResult = DeploymentManifestReadSuccess | DeploymentManifestReadRefusal;

export interface DeploymentManifestReadInput {
  /** Presented by the caller; validated here against the bounded allowlist. */
  readonly provenance: {
    readonly repoId: string;
    readonly sourceSha: string;
    readonly path: string;
    readonly environment: string;
    readonly proxy: string;
  };
  /** Already-read manifest text. This module performs no read itself. */
  readonly text: string;
}

const SHA_RE = /^[0-9a-f]{40}$/;
const UNSAFE_VALUE_RE = /[{}<>$]/;

function canonical(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null';
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${canonical(record[key])}`).join(',')}}`;
}

function evidenceDigest(value: unknown): string {
  return `ev:sha256:${crypto.createHash('sha256').update(canonical(value), 'utf8').digest('hex').slice(0, 24)}`;
}

function stripQuotes(value: string): string {
  if (value.length >= 2 && ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'")))) {
    return value.slice(1, -1);
  }
  return value;
}

interface PendingRoute {
  host: string | null;
  routePath: string;
  service: string | null;
  portNumber: string | null;
  portName: string | null;
}

type YamlSection = 'NONE' | 'SERVICE' | 'PORT';

/**
 * Read one bounded manifest.
 *
 * Refuses before parsing whenever the provenance is not the approved source or
 * the text exceeds the bound. Within the bounded subset, every mapping that is
 * not provably unique becomes an explicit unknown; no best guess is produced.
 */
export function readDeploymentManifest(input: DeploymentManifestReadInput): DeploymentManifestReadResult {
  const provenance = input.provenance;
  if (provenance.repoId !== DEPLOYMENT_MANIFEST_REPO_ID) return { ok: false, refusalCode: 'MANIFEST_SOURCE_NOT_APPROVED' };
  if (typeof provenance.sourceSha !== 'string' || !SHA_RE.test(provenance.sourceSha)) {
    return { ok: false, refusalCode: 'MANIFEST_SHA_INVALID' };
  }
  if (!(DEPLOYMENT_MANIFEST_ENVIRONMENTS as readonly string[]).includes(provenance.environment)) {
    return { ok: false, refusalCode: 'MANIFEST_ENVIRONMENT_UNKNOWN' };
  }
  if (!(DEPLOYMENT_MANIFEST_PROXIES as readonly string[]).includes(provenance.proxy)) {
    return { ok: false, refusalCode: 'MANIFEST_PROXY_UNKNOWN' };
  }
  const environment = provenance.environment as DeploymentManifestEnvironment;
  const proxy = provenance.proxy as DeploymentManifestProxy;
  const expectedPath = deploymentManifestPath(environment, proxy);
  if (provenance.path !== expectedPath) return { ok: false, refusalCode: 'MANIFEST_PATH_NOT_ALLOWED' };

  if (typeof input.text !== 'string') return { ok: false, refusalCode: 'MANIFEST_UNPARSEABLE' };
  if (Buffer.byteLength(input.text, 'utf8') > DEPLOYMENT_MANIFEST_MAX_BYTES) {
    return { ok: false, refusalCode: 'MANIFEST_TOO_LARGE' };
  }
  if (/\t/.test(input.text)) return { ok: false, refusalCode: 'MANIFEST_UNPARSEABLE' };
  // Template and environment-conditional markers make the mapping non-static.
  if (/\{\{|\}\}|\$\{/.test(input.text)) return { ok: false, refusalCode: 'MANIFEST_TEMPLATED' };
  let firstContentSeen = false;
  for (const line of input.text.split(/\r?\n/)) {
    if (line.trim() === '' || /^\s*#/.test(line)) continue;
    if (/^\s*---\s*$/.test(line)) {
      // A single leading document marker is inert; a second one means multiple
      // documents, which this reader does not merge silently.
      if (firstContentSeen) return { ok: false, refusalCode: 'MANIFEST_MULTI_DOCUMENT' };
      firstContentSeen = true;
      continue;
    }
    firstContentSeen = true;
    // Anchors, aliases and merge keys are outside the bounded subset: a merge
    // could relocate a backend without this reader seeing it.
    if (/^\s*[&*][A-Za-z_]/.test(line) || /^\s*<<\s*:/.test(line) || /:\s*[&*][A-Za-z_]/.test(line)) {
      return { ok: false, refusalCode: 'MANIFEST_UNPARSEABLE' };
    }
  }

  const typedProvenance: DeploymentManifestProvenance = {
    repoId: provenance.repoId,
    sourceSha: provenance.sourceSha,
    path: provenance.path,
    environment,
    proxy,
  };
  const provenanceIdentity = deploymentManifestProvenanceIdentity(typedProvenance);

  const unknown = (code: DeploymentManifestUnknownCode, route: PendingRoute | null): DeploymentManifestUnknown => ({
    code,
    environment,
    proxy,
    host: route === null ? null : route.host,
    routePath: route === null ? null : route.routePath,
  });

  const facts: DeploymentManifestFact[] = [];
  const unknowns: DeploymentManifestUnknown[] = [];
  /** First fact seen per host|path, so a conflicting duplicate can invalidate it. */
  const seen = new Map<string, DeploymentManifestFact>();
  const keysWithUnknowns = new Set<string>();
  let kindSeen = false;
  let section: YamlSection = 'NONE';
  let pending: PendingRoute | null = null;
  /** The host of the rule currently being read; paths inherit it. */
  let currentHost: string | null = null;
  /** Non-rule container whose indented body is not evidence (metadata, tls...). */
  let skipBlockIndent: number | null = null;
  let budgetExceeded = false;

  const factCount = (): number => facts.length + unknowns.length;

  const flush = (): void => {
    if (pending === null) return;
    const route = pending;
    pending = null;
    if (factCount() >= DEPLOYMENT_MANIFEST_MAX_ENTRIES) {
      budgetExceeded = true;
      return;
    }
    if (UNSAFE_VALUE_RE.test(route.routePath)) {
      unknowns.push(unknown('ROUTE_TEMPLATED', route));
      return;
    }
    if (route.host === null) {
      // A rule with no host applies to EVERY host name. That is not a
      // route → host fact, so it is an explicit unknown rather than a
      // wildcard binding.
      unknowns.push(unknown('HOST_UNSPECIFIED', route));
      return;
    }
    if (UNSAFE_VALUE_RE.test(route.host)) {
      unknowns.push(unknown('HOST_TEMPLATED', route));
      return;
    }
    if (route.service === null) {
      unknowns.push(unknown('SERVICE_BACKEND_MISSING', route));
      return;
    }
    if (route.portNumber !== null && route.portName !== null) {
      unknowns.push(unknown('PORT_AMBIGUOUS', route));
      return;
    }
    if (route.portNumber !== null && !/^\d{1,5}$/.test(route.portNumber)) {
      unknowns.push(unknown('PORT_AMBIGUOUS', route));
      return;
    }
    const key = `${route.host}\u0000${route.routePath}`;
    const candidate: DeploymentManifestFact = {
      factCategory: 'DEPLOYMENT_FACT',
      hop: 'HOST_TO_SERVICE',
      environment,
      proxy,
      host: route.host,
      routePath: route.routePath,
      service: route.service,
      servicePort: route.portNumber ?? route.portName,
      provenanceIdentity,
      evidenceDigest: '',
      readerVersion: DEPLOYMENT_MANIFEST_READER_VERSION,
    };
    const existing = seen.get(key);
    if (existing !== undefined) {
      // Two entries claim the same route. If they agree, it is a duplicate and
      // yields one fact; if they disagree, the evidence contradicts itself and
      // no fact is produced for that route.
      if (existing.service !== candidate.service || existing.servicePort !== candidate.servicePort) {
        seen.delete(key);
        keysWithUnknowns.add(key);
        const index = facts.indexOf(existing);
        if (index >= 0) facts.splice(index, 1);
        unknowns.push(unknown('SERVICE_BACKEND_AMBIGUOUS', route));
      }
      return;
    }
    if (keysWithUnknowns.has(key)) return;
    seen.set(key, candidate);
    facts.push(candidate);
  };

  const lines = input.text.split(/\r?\n/);
  for (const line of lines) {
    if (budgetExceeded) break;
    if (line.trim() === '' || /^\s*#/.test(line)) continue;
    const indent = (line.match(/^\s*/) ?? [''])[0].length;

    // A skipped container body (metadata, annotations, tls, status...) ends at
    // the first line at or above its own indentation; that line is processed
    // normally so the skip cannot swallow a sibling rule.
    if (skipBlockIndent !== null) {
      // List items may sit at the container's own indentation; they are part
      // of the skipped body. Anything shallower ends the skip.
      if (indent > skipBlockIndent || (indent === skipBlockIndent && /^\s*-/.test(line))) continue;
      skipBlockIndent = null;
    }

    const kindMatch = /^\s*kind:\s*([^\s#]+)/.exec(line);
    if (kindMatch !== null) {
      if (!kindSeen) {
        kindSeen = true;
        if (stripQuotes(kindMatch[1] ?? '') !== 'Ingress') {
          return { ok: false, refusalCode: 'MANIFEST_KIND_UNSUPPORTED' };
        }
      }
      continue;
    }

    // Top-level metadata (and common inert containers) are not route evidence.
    if (/^\s*(?:metadata|annotations|labels|status|tls|defaultBackend):\s*$/.test(line)) {
      skipBlockIndent = indent;
      continue;
    }

    const specMatch = /^\s*spec:\s*$/.exec(line);
    if (specMatch !== null) continue;
    if (/^\s*rules:\s*$/.test(line)) continue;
    if (/^\s*(?:ingressClassName|apiVersion):\s*/.test(line)) continue;

    const hostMatch = /^\s*(?:-\s+)?host:\s*([^\s#]+)/.exec(line);
    if (hostMatch !== null) {
      // The host is rule context, not a route by itself: paths inherit it.
      // A host line creates no pending route, so a host with no path claims
      // nothing rather than producing a spurious ROUTE_UNSPECIFIED.
      flush();
      currentHost = stripQuotes(hostMatch[1] ?? '');
      section = 'NONE';
      continue;
    }

    const pathMatch = /^\s*(?:-\s+)?path:\s*([^\s#]+)/.exec(line);
    if (pathMatch !== null) {
      flush();
      pending = { host: currentHost, routePath: stripQuotes(pathMatch[1] ?? ''), service: null, portNumber: null, portName: null };
      section = 'NONE';
      continue;
    }

    if (/^\s*(?:-\s+)?service:\s*$/.test(line)) {
      section = 'SERVICE';
      continue;
    }
    if (/^\s*(?:-\s+)?port:\s*$/.test(line)) {
      if (section !== 'SERVICE') return { ok: false, refusalCode: 'MANIFEST_UNPARSEABLE' };
      section = 'PORT';
      continue;
    }

    const nameMatch = /^\s*name:\s*([^\s#]+)/.exec(line);
    if (nameMatch !== null) {
      if (pending === null) return { ok: false, refusalCode: 'MANIFEST_UNPARSEABLE' };
      const value = stripQuotes(nameMatch[1] ?? '');
      if (UNSAFE_VALUE_RE.test(value)) return { ok: false, refusalCode: 'MANIFEST_TEMPLATED' };
      if (section === 'SERVICE') pending.service = value;
      else if (section === 'PORT') pending.portName = value;
      else return { ok: false, refusalCode: 'MANIFEST_UNPARSEABLE' };
      continue;
    }

    const numberMatch = /^\s*number:\s*([^\s#]+)/.exec(line);
    if (numberMatch !== null) {
      if (section !== 'PORT' || pending === null) return { ok: false, refusalCode: 'MANIFEST_UNPARSEABLE' };
      pending.portNumber = stripQuotes(numberMatch[1] ?? '');
      continue;
    }

    if (/^\s*(?:-\s+)?backend:\s*$/.test(line)) {
      section = 'SERVICE';
      continue;
    }
    if (/^\s*pathType:\s*/.test(line)) continue;
    if (/^\s*(?:-\s+)?(?:http|paths):\s*$/.test(line)) continue;
    if (/^\s*---\s*$/.test(line)) continue;

    // An unrecognised non-empty line inside a bounded subset is not silently
    // skipped: the manifest may contain structure this reader cannot prove, so
    // the whole document is refused rather than partially interpreted.
    return { ok: false, refusalCode: 'MANIFEST_UNPARSEABLE' };
  }
  flush();
  if (!kindSeen) return { ok: false, refusalCode: 'MANIFEST_UNPARSEABLE' };
  if (budgetExceeded) unknowns.push(unknown('ENTRY_BUDGET_EXCEEDED', null));

  const normalizedFacts = [...facts].sort((left, right) =>
    `${left.host}\u0000${left.routePath}\u0000${left.service}\u0000${left.servicePort ?? ''}`
      .localeCompare(`${right.host}\u0000${right.routePath}\u0000${right.service}\u0000${right.servicePort ?? ''}`));
  const normalizedUnknowns = [...unknowns].sort((left, right) =>
    `${left.code}\u0000${left.host ?? ''}\u0000${left.routePath ?? ''}`.localeCompare(`${right.code}\u0000${right.host ?? ''}\u0000${right.routePath ?? ''}`));

  const digest = evidenceDigest({
    readerVersion: DEPLOYMENT_MANIFEST_READER_VERSION,
    provenanceIdentity,
    facts: normalizedFacts.map((fact) => ({
      host: fact.host,
      routePath: fact.routePath,
      service: fact.service,
      servicePort: fact.servicePort,
    })),
    unknowns: normalizedUnknowns.map((entry) => ({
      code: entry.code,
      host: entry.host,
      routePath: entry.routePath,
    })),
  });

  return {
    ok: true,
    provenanceIdentity,
    evidenceDigest: digest,
    facts: Object.freeze(normalizedFacts.map((fact) => Object.freeze({ ...fact, evidenceDigest: digest }))),
    unknowns: Object.freeze(normalizedUnknowns.map((entry) => Object.freeze(entry))),
  };
}

/**
 * Is a recorded fact still current? A provenance or digest mismatch means the
 * manifest changed, which requires FRESH derivation. It is never re-bound: a
 * fact carrying a new SHA without re-derivation is refused.
 */
export function deploymentFactIsCurrent(
  fact: DeploymentManifestFact,
  current: { readonly provenanceIdentity: string; readonly evidenceDigest: string },
): boolean {
  return fact.provenanceIdentity === current.provenanceIdentity
    && fact.evidenceDigest === current.evidenceDigest
    && fact.readerVersion === DEPLOYMENT_MANIFEST_READER_VERSION;
}

export const DEPLOYMENT_FACT_REBIND_REFUSED = 'DEPLOYMENT_FACT_REBIND_REFUSED' as const;

/**
 * Fail-closed guard for a consumer holding a previously derived fact. A changed
 * manifest makes the old fact stale; relabelling it with the new provenance is
 * refused outright.
 */
export function assertDeploymentFactCurrent(
  fact: DeploymentManifestFact,
  current: { readonly provenanceIdentity: string; readonly evidenceDigest: string },
): void {
  if (!deploymentFactIsCurrent(fact, current)) throw new Error(DEPLOYMENT_FACT_REBIND_REFUSED);
}
