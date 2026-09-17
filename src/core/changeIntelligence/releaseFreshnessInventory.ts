import { approvedRootsFor } from '../source/universe';
import { prefixedDigest24 } from '../identity/canonicalDigest';

export const RELEASE_REF_SCHEMA = 'nightwatch.release-refs.v1' as const;
export interface ReleaseRefRow {
  rowId: string;
  repoId: string;
  fixSha: string;
  integrationRef: string;
  releaseRefs: string[];
  servicePaths: string[];
  exclusions: string[];
  deployFromIntegration: boolean;
  cherryPickModel: boolean;
}
export interface ReleaseRefInventory {
  schemaVersion: typeof RELEASE_REF_SCHEMA;
  rows: ReleaseRefRow[];
}
const record = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === 'object' && !Array.isArray(v);
const exact = (v: Record<string, unknown>, keys: string[]): boolean => Object.keys(v).length === keys.length && keys.every(k => Object.prototype.hasOwnProperty.call(v, k));
const strings = (v: unknown, max: number): v is string[] => Array.isArray(v) && v.length <= max && v.every(x => typeof x === 'string') && new Set(v).size === v.length;
export function safeReleaseRef(v: unknown): v is string {
  return typeof v === 'string' && v.length <= 160 && /^refs\/(heads|remotes)\/[A-Za-z0-9_-][A-Za-z0-9._/-]*$/.test(v) && !v.includes('..') && !v.includes('//') && v.split('/').every(x => x !== '' && !x.startsWith('.') && !x.endsWith('.') && !x.endsWith('.lock'));
}
export function validateReleaseRefRow(v: unknown): v is ReleaseRefRow {
  if (!record(v) || !exact(v, ['rowId', 'repoId', 'fixSha', 'integrationRef', 'releaseRefs', 'servicePaths', 'exclusions', 'deployFromIntegration', 'cherryPickModel'])) return false;
  if (typeof v.rowId !== 'string' || !/^[a-z][a-z0-9-]{0,63}$/.test(v.rowId) || typeof v.repoId !== 'string') return false;
  const roots = approvedRootsFor(v.repoId);
  if (roots === null || typeof v.fixSha !== 'string' || !/^[0-9a-f]{40}$/.test(v.fixSha) || !safeReleaseRef(v.integrationRef)) return false;
  if (!strings(v.releaseRefs, 8) || v.releaseRefs.length === 0 || !v.releaseRefs.every(safeReleaseRef) || v.releaseRefs.includes(v.integrationRef)) return false;
  if (!strings(v.servicePaths, 32) || !v.servicePaths.every(p => p.length <= 240 && /^[A-Za-z0-9_-]+(?:\/[A-Za-z0-9_.-]+)*$/.test(p) && p.split('/').every(s => s !== '.' && s !== '..') && roots.some(r => p === r || p.startsWith(`${r}/`)))) return false;
  return strings(v.exclusions, 8) && v.exclusions.every(r => (v.releaseRefs as string[]).includes(r)) && typeof v.deployFromIntegration === 'boolean' && typeof v.cherryPickModel === 'boolean';
}
export function validateReleaseRefInventory(input: unknown): { ok: true; config: ReleaseRefInventory; inventoryDigest: string } | { ok: false; failure: 'INVENTORY_INVALID' } {
  if (!record(input) || !exact(input, ['schemaVersion', 'rows']) || input.schemaVersion !== RELEASE_REF_SCHEMA || !Array.isArray(input.rows) || input.rows.length > 64 || !input.rows.every(validateReleaseRefRow) || new Set(input.rows.map(r => r.rowId)).size !== input.rows.length) return { ok: false, failure: 'INVENTORY_INVALID' };
  const rows = input.rows.map(r => ({ ...r, releaseRefs: [...r.releaseRefs].sort(), servicePaths: [...r.servicePaths].sort(), exclusions: [...r.exclusions].sort() })).sort((a, b) => a.rowId < b.rowId ? -1 : a.rowId > b.rowId ? 1 : 0);
  const config: ReleaseRefInventory = { schemaVersion: RELEASE_REF_SCHEMA, rows };
  return { ok: true, config, inventoryDigest: prefixedDigest24('rfi', config) };
}
