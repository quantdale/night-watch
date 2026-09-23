// ---------------------------------------------------------------------------
// Nightwatch — immutable semantic request admission (NW-AUD-020, M5).
//
// THE invariant: NO deliberate product API egress without PRE-EFFECT,
// current, source-proven read authority. One pure evaluation decides for
// every transport layer; layers consume the same handle or recompute the
// identical decision from the same frozen snapshot. Timing never grants
// authority (see causalGenerations); navigation never grants ambient
// authority (see bootstrapExemptions).
//
// Privacy (M3/M4 contract): a handle or refusal receipt carries origin,
// method, route TEMPLATE (exact proven path or the categorical
// `<RULE:id>` marker), rule id, source proof, and generation id — never a
// concrete path parameter, query, header, or body.
//
// Pure module: no I/O, no wall clock, no registry side effects.
// ---------------------------------------------------------------------------

import type { EndpointSemanticRule } from './endpointSemantics';
import { ruleHostMatches, rulePathMatches } from './endpointSemantics';
import { safeRuleMarker } from './provenRoutes';
import { AMBIGUOUS_ATTRIBUTION, type Attribution } from './causalGenerations';
import type { BootstrapExemptionTable } from './bootstrapExemptions';

export const SEMANTIC_ADMISSION_SCHEMA = 'nightwatch.semantic-admission.v1' as const;

export type AdmissionTransport =
  | 'PLAYWRIGHT_ROUTE'
  | 'CDP_FETCH'
  | 'WEBSOCKET'
  | 'API_RELAY'
  | 'L5_PROXY';

export type AdmissionRequestClass = 'PROVEN_READ' | 'BOOTSTRAP_EXEMPT_READ';

/** Closed refusal vocabulary. Every non-admitted outcome is one of these. */
export type AdmissionRefusalCode =
  | 'ADMISSION_UNKNOWN'
  | 'ADMISSION_MUTATION'
  | 'ADMISSION_MISSING_PROOF'
  | 'ADMISSION_STALE_PROOF'
  | 'ADMISSION_AMBIGUOUS'
  | 'ADMISSION_METHOD_MISMATCH'
  | 'ADMISSION_ROUTE_MISMATCH'
  | 'ADMISSION_ORIGIN_MISMATCH'
  | 'ADMISSION_ENVIRONMENT_MISMATCH'
  | 'ADMISSION_UNBOUND_GENERATION'
  | 'ADMISSION_GENERATION_CLOSED'
  | 'ADMISSION_TRANSPORT_DISAGREEMENT'
  | 'ADMISSION_BOOTSTRAP_UNREGISTERED'
  | 'ADMISSION_BOOTSTRAP_MISMATCH'
  | 'ADMISSION_BOOTSTRAP_EXHAUSTED'
  | 'ADMISSION_BOOTSTRAP_STALE'
  | 'ADMISSION_UNPARSEABLE';

/** Immutable admitted capability. Frozen at construction. */
export interface AdmissionHandle {
  readonly schemaVersion: typeof SEMANTIC_ADMISSION_SCHEMA;
  readonly environment: string;
  readonly origin: string;
  readonly method: string;
  /** Exact proven static path or the categorical `<RULE:id>` marker. */
  readonly routeTemplate: string;
  readonly ruleId: string;
  readonly classification: AdmissionRequestClass;
  readonly sourceProof: string;
  readonly sourceSnapshot: 'CURRENT';
  readonly generationId: string;
  readonly transport: AdmissionTransport;
}

/** Categorical, privacy-safe refusal receipt: never carries a path. */
export interface AdmissionRefusal {
  readonly schemaVersion: typeof SEMANTIC_ADMISSION_SCHEMA;
  readonly code: AdmissionRefusalCode;
  readonly environment: string;
  readonly origin: string;
  readonly method: string;
  readonly ruleId: string | null;
  readonly attribution: string;
  readonly transport: AdmissionTransport;
}

export type AdmissionDecision =
  | { readonly admitted: true; readonly handle: AdmissionHandle }
  | { readonly admitted: false; readonly refusal: AdmissionRefusal };

export interface AdmissionRequest {
  readonly method: string;
  readonly url: string;
  readonly environment: string;
  readonly transport: AdmissionTransport;
  /** Resolved causal attribution (explicit at L1, implicit at backstops). */
  readonly attribution: Attribution;
}

/** One rule bound to its source proof inside a frozen snapshot. */
export interface AdmissionRuleBinding {
  readonly rule: EndpointSemanticRule;
  readonly sourceProof: string;
  readonly sourceCurrent: boolean;
}

export interface AdmissionSnapshot {
  /** The one environment this snapshot speaks for. */
  readonly environment: string;
  /** Frozen, source-proven bindings (registry + proof + currentness). */
  readonly bindings: readonly AdmissionRuleBinding[];
  /** Single authority predicate over causal generations. */
  readonly isActiveGeneration: (generationId: string) => boolean;
  /** Finite bootstrap exemption table (may be empty — refusal is fine). */
  readonly bootstrap: BootstrapExemptionTable;
  /** Current navigation generation, required for any bootstrap consumption. */
  readonly navigationGeneration: string | null;
}

function normalizeMethod(method: string): string {
  return method.trim().toUpperCase();
}

function pathOf(url: URL): string {
  try {
    return decodeURIComponent(url.pathname);
  } catch {
    return url.pathname;
  }
}

function refusal(
  code: AdmissionRefusalCode,
  request: AdmissionRequest,
  parsed: URL | null,
  ruleId: string | null,
  attributionLabel: string,
): AdmissionDecision {
  return {
    admitted: false,
    refusal: Object.freeze({
      schemaVersion: SEMANTIC_ADMISSION_SCHEMA,
      code,
      environment: request.environment,
      origin: parsed?.origin ?? 'unparseable:',
      method: normalizeMethod(request.method),
      ruleId,
      attribution: attributionLabel,
      transport: request.transport,
    }),
  };
}

function attributionLabel(attribution: Attribution): string {
  return attribution.kind === 'GENERATION' ? attribution.id : attribution.kind;
}

function provenTemplate(rule: EndpointSemanticRule): string {
  return rule.path ?? safeRuleMarker(rule.id) ?? '<UNKNOWN_ROUTE>';
}

/**
 * THE single semantic decision. Deterministic for one frozen snapshot:
 * transport identity never changes the verdict — only the handle's recorded
 * issuing layer differs.
 */
export function evaluateAdmission(
  request: AdmissionRequest,
  snapshot: AdmissionSnapshot,
): AdmissionDecision {
  const label = attributionLabel(request.attribution);
  let parsed: URL;
  try {
    parsed = new URL(request.url);
  } catch {
    return refusal('ADMISSION_UNPARSEABLE', request, null, null, label);
  }
  if (request.environment !== snapshot.environment) {
    return refusal('ADMISSION_ENVIRONMENT_MISMATCH', request, parsed, null, label);
  }
  const method = normalizeMethod(request.method);
  const pathname = pathOf(parsed);

  // Route-level rule resolution: host + path first, then method. A registered
  // path whose method differs is METHOD drift (or the mutation twin of a
  // proven read) — never an unknown, never an implicit allow.
  const pathFamily = snapshot.bindings.filter(
    (binding) => ruleHostMatches(parsed, binding.rule.host) && rulePathMatches(binding.rule, pathname),
  );
  const binding = pathFamily.find((candidate) => normalizeMethod(candidate.rule.method) === method) ?? null;

  if (binding === null) {
    if (pathFamily.length > 0) {
      const twin = pathFamily[0];
      if (twin !== undefined) {
        // A known path with the wrong method: if ANY twin of this exact route
        // is mutation-capable, refuse as mutation (303/307 method drift can
        // never smuggle a write into an admitted read); otherwise method drift.
        const mutationTwin = twin.rule.classification === 'KNOWN_MUTATION'
          || pathFamily.some((candidate) => candidate.rule.classification === 'KNOWN_MUTATION');
        if (mutationTwin) {
          return refusal('ADMISSION_MUTATION', request, parsed, twin.rule.id, label);
        }
        return refusal('ADMISSION_METHOD_MISMATCH', request, parsed, twin.rule.id, label);
      }
    }
    // Unknown route for this host: the ONLY remaining authority is a finite
    // bootstrap exemption (navigation-scoped, budgeted, source-proven).
    const consumption = snapshot.bootstrap.consume(snapshot.navigationGeneration, {
      method,
      url: request.url,
      environment: request.environment,
    });
    if (!consumption.granted) {
      const code: AdmissionRefusalCode =
        consumption.code === 'BOOTSTRAP_MISMATCH' ? 'ADMISSION_BOOTSTRAP_MISMATCH'
          : consumption.code === 'BOOTSTRAP_EXHAUSTED' ? 'ADMISSION_BOOTSTRAP_EXHAUSTED'
            : consumption.code === 'BOOTSTRAP_STALE' ? 'ADMISSION_BOOTSTRAP_STALE'
              : 'ADMISSION_BOOTSTRAP_UNREGISTERED';
      return refusal(code, request, parsed, null, label);
    }
    if (request.attribution.kind === 'NONE') {
      return refusal('ADMISSION_UNBOUND_GENERATION', request, parsed, null, label);
    }
    if (request.attribution.kind === AMBIGUOUS_ATTRIBUTION) {
      return refusal('ADMISSION_AMBIGUOUS', request, parsed, null, label);
    }
    if (!snapshot.isActiveGeneration(consumption.navigationGeneration)
      || !snapshot.isActiveGeneration(request.attribution.id)) {
      return refusal('ADMISSION_GENERATION_CLOSED', request, parsed, null, label);
    }
    const handle: AdmissionHandle = Object.freeze({
      schemaVersion: SEMANTIC_ADMISSION_SCHEMA,
      environment: snapshot.environment,
      origin: parsed.origin,
      method,
      routeTemplate: consumption.routeTemplate,
      ruleId: consumption.exemptionId,
      classification: 'BOOTSTRAP_EXEMPT_READ',
      sourceProof: consumption.sourceProof,
      sourceSnapshot: 'CURRENT',
      generationId: consumption.navigationGeneration,
      transport: request.transport,
    });
    return { admitted: true, handle };
  }

  if (binding.rule.classification === 'KNOWN_MUTATION') {
    return refusal('ADMISSION_MUTATION', request, parsed, binding.rule.id, label);
  }
  if (binding.rule.classification !== 'KNOWN_READ') {
    return refusal('ADMISSION_UNKNOWN', request, parsed, binding.rule.id, label);
  }
  if (binding.sourceProof === '') {
    return refusal('ADMISSION_MISSING_PROOF', request, parsed, binding.rule.id, label);
  }
  if (!binding.sourceCurrent) {
    return refusal('ADMISSION_STALE_PROOF', request, parsed, binding.rule.id, label);
  }
  if (request.attribution.kind === 'NONE') {
    return refusal('ADMISSION_UNBOUND_GENERATION', request, parsed, binding.rule.id, label);
  }
  if (request.attribution.kind === AMBIGUOUS_ATTRIBUTION) {
    return refusal('ADMISSION_AMBIGUOUS', request, parsed, binding.rule.id, label);
  }
  if (!snapshot.isActiveGeneration(request.attribution.id)) {
    return refusal('ADMISSION_GENERATION_CLOSED', request, parsed, binding.rule.id, label);
  }
  const handle: AdmissionHandle = Object.freeze({
    schemaVersion: SEMANTIC_ADMISSION_SCHEMA,
    environment: snapshot.environment,
    origin: parsed.origin,
    method,
    routeTemplate: provenTemplate(binding.rule),
    ruleId: binding.rule.id,
    classification: 'PROVEN_READ',
    sourceProof: binding.sourceProof,
    sourceSnapshot: 'CURRENT',
    generationId: request.attribution.id,
    transport: request.transport,
  });
  return { admitted: true, handle };
}

/**
 * Cross-layer consumption check: a layer holding a handle recomputes the
 * decision from the same snapshot; any divergence (refusal where the handle
 * admits, or a different rule/generation/identity) is a hard
 * TRANSPORT_DISAGREEMENT — no layer may downgrade a denial into an allow.
 */
export function consumeAdmission(
  handle: AdmissionHandle,
  request: AdmissionRequest,
  snapshot: AdmissionSnapshot,
): AdmissionDecision {
  const decision = evaluateAdmission(request, snapshot);
  if (!decision.admitted) {
    if (decision.refusal.code === 'ADMISSION_UNKNOWN' || decision.refusal.code.startsWith('ADMISSION_BOOTSTRAP')) {
      return refusal('ADMISSION_TRANSPORT_DISAGREEMENT', request, safeParse(request.url), handle.ruleId, attributionLabel(request.attribution));
    }
    return decision;
  }
  const fresh = decision.handle;
  const agrees = fresh.ruleId === handle.ruleId
    && fresh.generationId === handle.generationId
    && fresh.method === handle.method
    && fresh.origin === handle.origin
    && fresh.routeTemplate === handle.routeTemplate
    && fresh.sourceProof === handle.sourceProof;
  if (!agrees) {
    return refusal('ADMISSION_TRANSPORT_DISAGREEMENT', request, safeParse(request.url), handle.ruleId, attributionLabel(request.attribution));
  }
  // The consuming layer stamps its own transport onto an identical decision.
  return {
    admitted: true,
    handle: Object.freeze({ ...handle, transport: request.transport }),
  };
}

function safeParse(url: string): URL | null {
  try {
    return new URL(url);
  } catch {
    return null;
  }
}

/** The closed refusal vocabulary, for hardening/test enumeration. */
export const ADMISSION_REFUSAL_CODES: readonly AdmissionRefusalCode[] = Object.freeze([
  'ADMISSION_UNKNOWN',
  'ADMISSION_MUTATION',
  'ADMISSION_MISSING_PROOF',
  'ADMISSION_STALE_PROOF',
  'ADMISSION_AMBIGUOUS',
  'ADMISSION_METHOD_MISMATCH',
  'ADMISSION_ROUTE_MISMATCH',
  'ADMISSION_ORIGIN_MISMATCH',
  'ADMISSION_ENVIRONMENT_MISMATCH',
  'ADMISSION_UNBOUND_GENERATION',
  'ADMISSION_GENERATION_CLOSED',
  'ADMISSION_TRANSPORT_DISAGREEMENT',
  'ADMISSION_BOOTSTRAP_UNREGISTERED',
  'ADMISSION_BOOTSTRAP_MISMATCH',
  'ADMISSION_BOOTSTRAP_EXHAUSTED',
  'ADMISSION_BOOTSTRAP_STALE',
  'ADMISSION_UNPARSEABLE',
]);
