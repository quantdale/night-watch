// ---------------------------------------------------------------------------
// Nightwatch C-10 / F-16 — request-parameter provenance PRIVACY MODEL.
//
// To issue a meaningful production read you need real customer identifiers
// (`?mspId=`, `/{id}`). Those are customer data, and they would otherwise flow
// into outbound URLs, fetch-guard records, the proxy event log, per-route
// budget keys, replay fingerprints, checkpoints and the reservation ledger —
// every one of which sits OUTSIDE the projection boundary. Retention rules
// ("route template only") do not address construction, logging or keying.
//
// C-10 supplies the privacy side ONLY:
//
//   - values are OWNER-SUPPLIED and stored EXTERNAL-ONLY, like storage state;
//   - Nightwatch state holds an OPAQUE HANDLE and never the value;
//   - the concrete value is resolved only at the narrow FUTURE
//     request-construction boundary, which C-10 deliberately does not create;
//   - no value may enter a log, a budget key, a replay fingerprint, a
//     checkpoint, an error, a receipt or a persisted URL;
//   - retained URL identity uses route templates, never concrete identifiers.
//
// This campaign creates NO production request execution path. There is no
// function here that performs, schedules or authorizes a request.
//
// This module is part of the PURE cone: no fs, no net, no process. It cannot
// read the owner's external value store, by construction.
// ---------------------------------------------------------------------------

import { failProduction } from './errors';
import { ROUTE_TEMPLATE_RE } from './types';

export const PARAMETER_PROVENANCE_VERSION = 'nightwatch.request-parameter-provenance.v1' as const;

/**
 * Where a parameter value lives. There is deliberately no member meaning
 * "inline in Nightwatch state".
 */
export const PARAMETER_VALUE_LOCATIONS = [
  /** Owner-supplied, held in external owner-only storage, like storage state. */
  'OWNER_EXTERNAL_STORE',
] as const;
export type ParameterValueLocation = (typeof PARAMETER_VALUE_LOCATIONS)[number];

/**
 * An opaque handle. This is what Nightwatch state, budgets, fingerprints,
 * checkpoints and receipts are permitted to hold. It is a random label minted
 * by the owner's external store, NOT a digest of the value: a digest of an
 * enumerable identifier (a 12-digit AWS account id, an MSP id, a `YYYYMM`
 * period) is invertible by enumeration and is not anonymization.
 */
export const PARAMETER_HANDLE_RE = /^pph_[0-9a-f]{32}$/;

export interface OpaqueParameterHandle {
  readonly version: typeof PARAMETER_PROVENANCE_VERSION;
  readonly handle: string;
  readonly location: ParameterValueLocation;
  /** The template placeholder this handle satisfies, e.g. `id` or `mspId`. */
  readonly parameterName: string;
}

const PARAMETER_NAME_RE = /^[A-Za-z][A-Za-z0-9_]{0,63}$/;

/**
 * Mint the in-Nightwatch representation of an owner-supplied parameter.
 *
 * Note what this function does NOT take: a value. There is no parameter,
 * overload or option through which a concrete customer identifier can enter
 * Nightwatch state.
 */
export function createOpaqueParameterHandle(input: {
  readonly handle: string;
  readonly parameterName: string;
}): OpaqueParameterHandle {
  if (typeof input.handle !== 'string' || !PARAMETER_HANDLE_RE.test(input.handle)) {
    failProduction('PRODUCTION_PRIVACY_HANDLE_INVALID', 'HANDLE_FORMAT');
  }
  if (typeof input.parameterName !== 'string' || !PARAMETER_NAME_RE.test(input.parameterName)) {
    failProduction('PRODUCTION_PRIVACY_HANDLE_INVALID', 'HANDLE_FORMAT');
  }
  return Object.freeze({
    version: PARAMETER_PROVENANCE_VERSION,
    handle: input.handle,
    location: 'OWNER_EXTERNAL_STORE',
    parameterName: input.parameterName,
  });
}

/**
 * A route identity that is safe to persist, log, key a budget by, fingerprint
 * a replay with, or write into a checkpoint or receipt.
 *
 * It carries the route TEMPLATE plus the opaque handles that would satisfy its
 * placeholders — never the values, and never a query string.
 */
export interface SafeRouteIdentity {
  readonly version: typeof PARAMETER_PROVENANCE_VERSION;
  readonly routeTemplate: string;
  readonly handles: readonly OpaqueParameterHandle[];
}

/** Placeholders declared by a route template, in declaration order. */
export function templatePlaceholders(routeTemplate: string): readonly string[] {
  const found: string[] = [];
  const pattern = /\{([A-Za-z][A-Za-z0-9_]*)\}/g;
  let match = pattern.exec(routeTemplate);
  while (match !== null) {
    found.push(match[1]!);
    match = pattern.exec(routeTemplate);
  }
  return found;
}

/**
 * Build the safe route identity. Fail-closed when the template is not a
 * template, when a placeholder has no handle, or when a handle does not
 * correspond to a placeholder.
 */
export function createSafeRouteIdentity(input: {
  readonly routeTemplate: string;
  readonly handles: readonly OpaqueParameterHandle[];
}): SafeRouteIdentity {
  if (typeof input.routeTemplate !== 'string' || !ROUTE_TEMPLATE_RE.test(input.routeTemplate)) {
    failProduction('PRODUCTION_PRIVACY_PARAMETER_VALUE_EXPOSED', 'ROUTE_TEMPLATE_INVALID');
  }
  const placeholders = new Set(templatePlaceholders(input.routeTemplate));
  const provided = new Set<string>();
  for (const handle of input.handles) {
    if (
      handle === null ||
      typeof handle !== 'object' ||
      handle.version !== PARAMETER_PROVENANCE_VERSION ||
      !PARAMETER_HANDLE_RE.test(handle.handle)
    ) {
      failProduction('PRODUCTION_PRIVACY_HANDLE_INVALID', 'HANDLE_FORMAT');
    }
    if (!placeholders.has(handle.parameterName)) {
      failProduction('PRODUCTION_PRIVACY_HANDLE_INVALID', 'HANDLE_UNKNOWN');
    }
    provided.add(handle.parameterName);
  }
  for (const placeholder of placeholders) {
    if (!provided.has(placeholder)) failProduction('PRODUCTION_PRIVACY_HANDLE_INVALID', 'HANDLE_UNKNOWN');
  }
  return Object.freeze({
    version: PARAMETER_PROVENANCE_VERSION,
    routeTemplate: input.routeTemplate,
    handles: Object.freeze([...input.handles]),
  });
}

/**
 * Validator for every downstream surface that must be value-free: logs, budget
 * keys, replay fingerprints, checkpoints, errors, receipts and persisted URLs.
 *
 * A URL is refused outright if it carries a query string or any path segment
 * that is not a literal template segment or a `{placeholder}` — so a concrete
 * identifier cannot be smuggled through as "the URL we observed".
 */
export function assertNoConcreteParameterValue(candidate: string): void {
  if (typeof candidate !== 'string') {
    failProduction('PRODUCTION_PRIVACY_PARAMETER_VALUE_EXPOSED', 'FIELD_TYPE');
  }
  if (candidate.includes('?') || candidate.includes('#') || candidate.includes('&')) {
    failProduction('PRODUCTION_PRIVACY_PARAMETER_VALUE_EXPOSED', 'CONCRETE_URL_PARAMETER');
  }
}

/**
 * Assert a persisted/keyed string is a route template, not a concrete URL.
 * This is the check budget keys, fingerprints and checkpoints use.
 */
export function assertRouteTemplateOnly(candidate: string): void {
  assertNoConcreteParameterValue(candidate);
  if (!ROUTE_TEMPLATE_RE.test(candidate)) {
    failProduction('PRODUCTION_PRIVACY_PARAMETER_VALUE_EXPOSED', 'ROUTE_TEMPLATE_INVALID');
  }
}

/**
 * Guard for a future request builder: it may accept handles, never values.
 * C-10 exports this so the boundary exists BEFORE C-11/C-13 can be tempted to
 * thread a raw identifier through general Nightwatch state.
 */
export function assertHandleNotValue(candidate: unknown): asserts candidate is OpaqueParameterHandle {
  if (
    candidate === null ||
    typeof candidate !== 'object' ||
    (candidate as OpaqueParameterHandle).version !== PARAMETER_PROVENANCE_VERSION ||
    typeof (candidate as OpaqueParameterHandle).handle !== 'string' ||
    !PARAMETER_HANDLE_RE.test((candidate as OpaqueParameterHandle).handle)
  ) {
    failProduction('PRODUCTION_PRIVACY_PARAMETER_VALUE_EXPOSED', 'VALUE_SUPPLIED_WHERE_HANDLE_REQUIRED');
  }
}
