// @ts-check
// The canonical JSON computation shared by the receipt producers and the verifier: object keys
// sorted, arrays in order. Kept in its own module so a receipt schema can validate a body without
// importing the verifier (which imports the schema table).

/**
 * The quality gate's canonical computation: object keys sorted, arrays in
 * order. Exported for the verifier and its tests.
 * @param {unknown} value
 * @returns {string}
 */
export function stableCanonical(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null';
  if (Array.isArray(value)) return `[${value.map(stableCanonical).join(',')}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableCanonical(/** @type {Record<string, unknown>} */ (value)[key])}`).join(',')}}`;
}
