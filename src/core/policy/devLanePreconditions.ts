/**
 * M8 (task 9.1) — the DEV-lane precondition registry and the launcher refusal
 * it authorizes.
 *
 * Six audited over-claims are still OPEN (NW-AUD-016 full, NW-AUD-022 task 2.1
 * / R2-47, NW-AUD-025 full, NW-AUD-026, NW-AUD-037, NW-AUD-038). While any of
 * them is OPEN the DEV lane is not trustworthy enough to launch: every
 * DEV-lane launcher refuses with `DEV_LANE_PRECONDITION_OPEN` BEFORE external
 * contact, auth validation or child creation.
 *
 * The refusal is not bypassable by a flag. Clearing it requires an owner token
 * that cites a DECISIONS entry the registry explicitly authorizes, and the
 * registry ships with NO standing authorization — so the honest state today is
 * a hard refusal, and any future acceptance run needs a deliberate,
 * reviewable registry change plus a fresh owner token.
 */
import fs from 'node:fs';
import path from 'node:path';

export const DEV_LANE_PRECONDITION_REGISTRY_PATH = 'config/dev-lane-preconditions.v1.json';
export const DEV_LANE_PRECONDITION_SCHEMA_VERSION = 'nightwatch.dev-lane-preconditions.v1';
export const DEV_LANE_PRECONDITION_OPEN = 'DEV_LANE_PRECONDITION_OPEN';
export const DEV_LANE_OWNER_TOKEN_UNRECOGNIZED = 'DEV_LANE_OWNER_TOKEN_UNRECOGNIZED';
export const DEV_LANE_OWNER_TOKEN_ENV = 'NIGHTWATCH_DEV_LANE_OWNER_TOKEN';
export const DEV_LANE_REGISTRY_INVALID = 'DEV_LANE_REGISTRY_INVALID';
/**
 * Test/owner seam: an explicit registry path. The SHIPPED default is the
 * repository registry, which refuses unconditionally — the seam exists so a
 * launcher's own argument validation stays testable and so an owner-authorized
 * run can be pointed at a registry that names its DECISIONS citation.
 */
export const DEV_LANE_REGISTRY_PATH_ENV = 'NIGHTWATCH_DEV_LANE_REGISTRY_PATH';

export interface DevLanePrecondition {
  readonly id: string;
  readonly scope: string;
  readonly status: 'OPEN' | 'CLOSED';
  readonly summary: string;
}

export interface DevLanePreconditionState {
  readonly schemaVersion: string;
  readonly refusalCode: typeof DEV_LANE_PRECONDITION_OPEN;
  readonly open: readonly DevLanePrecondition[];
  readonly closed: readonly DevLanePrecondition[];
  readonly ownerAuthorizations: readonly string[];
}

const SAFE_ID = /^[A-Z][A-Za-z0-9-]{2,63}$/;
const SAFE_SCOPE = /^[A-Za-z0-9 ()./-]{1,64}$/;

function invalid(reason: string): never {
  throw new Error(`${DEV_LANE_REGISTRY_INVALID}:${reason}`);
}

/** Parse the registry, failing closed on any shape it does not fully recognise. */
export function parseDevLanePreconditions(text: string): DevLanePreconditionState {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    invalid('JSON');
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) invalid('ROOT');
  const record = parsed as Record<string, unknown>;
  if (record.schemaVersion !== DEV_LANE_PRECONDITION_SCHEMA_VERSION) invalid('SCHEMA_VERSION');
  if (record.refusalCode !== DEV_LANE_PRECONDITION_OPEN) invalid('REFUSAL_CODE');
  const raw = record.preconditions;
  if (!Array.isArray(raw) || raw.length === 0) invalid('PRECONDITIONS');
  const preconditions: DevLanePrecondition[] = [];
  const seen = new Set<string>();
  for (const entry of raw) {
    if (entry === null || typeof entry !== 'object' || Array.isArray(entry)) invalid('PRECONDITION');
    const item = entry as Record<string, unknown>;
    const id = item.id;
    const scope = item.scope;
    const status = item.status;
    const summary = item.summary;
    if (typeof id !== 'string' || !SAFE_ID.test(id)) invalid('PRECONDITION_ID');
    if (seen.has(id)) invalid('DUPLICATE_PRECONDITION');
    seen.add(id);
    if (typeof scope !== 'string' || !SAFE_SCOPE.test(scope)) invalid('PRECONDITION_SCOPE');
    if (status !== 'OPEN' && status !== 'CLOSED') invalid('PRECONDITION_STATUS');
    if (typeof summary !== 'string' || summary.length === 0 || summary.length > 400) invalid('PRECONDITION_SUMMARY');
    preconditions.push({ id, scope, status, summary });
  }
  const authorizations = record.ownerAuthorizations;
  if (!Array.isArray(authorizations)) invalid('OWNER_AUTHORIZATIONS');
  for (const entry of authorizations) {
    if (typeof entry !== 'string' || !/^D-[0-9]{1,4}$/.test(entry)) invalid('OWNER_AUTHORIZATION');
  }
  return {
    schemaVersion: DEV_LANE_PRECONDITION_SCHEMA_VERSION,
    refusalCode: DEV_LANE_PRECONDITION_OPEN,
    open: preconditions.filter((entry) => entry.status === 'OPEN'),
    closed: preconditions.filter((entry) => entry.status === 'CLOSED'),
    ownerAuthorizations: [...(authorizations as readonly string[])],
  };
}

/** Read the registry from a checkout root. */
export function loadDevLanePreconditions(root: string, registryPath?: string | undefined): DevLanePreconditionState {
  const file = registryPath !== undefined && registryPath.trim() !== ''
    ? registryPath
    : path.join(root, DEV_LANE_PRECONDITION_REGISTRY_PATH);
  let text: string;
  try {
    text = fs.readFileSync(file, 'utf8');
  } catch {
    invalid('UNREADABLE');
  }
  return parseDevLanePreconditions(text);
}

export interface DevLaneRefusalInput {
  readonly root: string;
  readonly launcher: string;
  readonly ownerToken?: string | undefined;
  readonly registryPath?: string | undefined;
}

/**
 * The refusal itself: throws `DEV_LANE_PRECONDITION_OPEN` while any
 * precondition is OPEN and no authorized owner token clears it.
 */
export function assertDevLanePreconditionClear(input: DevLaneRefusalInput): DevLanePreconditionState {
  const state = loadDevLanePreconditions(input.root, input.registryPath);
  if (state.open.length === 0) return state;
  const token = (input.ownerToken ?? '').trim();
  if (token !== '') {
    if (!/^D-[0-9]{1,4}$/.test(token)) {
      throw new Error(`${DEV_LANE_OWNER_TOKEN_UNRECOGNIZED}:${input.launcher}:${DEV_LANE_OWNER_TOKEN_ENV}-must-cite-a-DECISIONS-entry`);
    }
    if (!state.ownerAuthorizations.includes(token)) {
      throw new Error(`${DEV_LANE_OWNER_TOKEN_UNRECOGNIZED}:${input.launcher}:${token}`);
    }
    return state;
  }
  const listed = state.open.map((entry) => `${entry.id} (${entry.scope})`).join(', ');
  throw new Error(
    `${DEV_LANE_PRECONDITION_OPEN}:${input.launcher}: ${listed} — the DEV lane refuses until each precondition is closed or an owner token citing an authorized DECISIONS entry is supplied (${DEV_LANE_OWNER_TOKEN_ENV})`,
  );
}
