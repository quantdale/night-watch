// D19 / 4.5 — sanitized failure locations with an assertion class.
//
// CI receipts already carry `file:line` and never a raw message. The class
// adds WHAT KIND of assertion failed without carrying any assertion text:
// a closed enum, so a receipt can be triaged (timeout vs expectation vs
// throw) without ever transporting received/expected values, stack frames or
// user data. Every consumer shares this one classifier so the three
// extraction sites cannot drift.

/** The closed, sanitized assertion classes. Nothing else may appear. */
export const FAILURE_LOCATION_CLASSES = Object.freeze([
  'TIMEOUT',
  'EXPECT_EQUAL',
  'EXPECT_MATCH',
  'EXPECT_THROW',
  'UNCLASSIFIED',
]);

const LOCATION_PATTERN = /^\s*\d+\)\s+\[[^\]]+\]\s+›\s+(tests\/(?:unit|smoke)\/[A-Za-z0-9._/-]+\.test\.ts):(\d+)(?::\d+)?\s+›/gm;

/**
 * Classify the failure block that follows one location marker. Only shape is
 * read: matcher names and timeout markers, never message content.
 * @param {string} block
 * @returns {'TIMEOUT' | 'EXPECT_EQUAL' | 'EXPECT_MATCH' | 'EXPECT_THROW' | 'UNCLASSIFIED'}
 */
export function classifyAssertionBlock(block) {
  const text = String(block ?? '');
  if (/Timeout \d+\s*ms|timed out|test timeout/i.test(text)) return 'TIMEOUT';
  if (/expect\(received\)\.(?:toContain|toContainEqual|toMatch|toMatchObject|toBeCloseTo)/.test(text)) return 'EXPECT_MATCH';
  if (/expect\(received\)\.toThrow|threw instead of throwing|rejected/i.test(text)) return 'EXPECT_THROW';
  if (/expect\(received\)|Expected\b|\+ Received\b|toEqual\(|toBe\(/.test(text)) return 'EXPECT_EQUAL';
  return 'UNCLASSIFIED';
}

/**
 * Extract `file:line:CLASS` entries from a Playwright `list` reporter output.
 * The class is derived from the failure block between this marker and the
 * next; raw assertion text never survives.
 * @param {string} output
 * @param {number} [limit]
 * @returns {string[]}
 */
export function extractSanitizedFailedLocations(output, limit = 16) {
  const text = String(output ?? '');
  const matches = [...text.matchAll(LOCATION_PATTERN)];
  const seen = new Set();
  const locations = [];
  for (let index = 0; index < matches.length; index += 1) {
    const match = matches[index];
    const end = index + 1 < matches.length ? matches[index + 1].index : text.length;
    const block = text.slice(match.index, end);
    const location = `${match[1]}:${match[2]}:${classifyAssertionBlock(block)}`;
    if (seen.has(location)) continue;
    seen.add(location);
    locations.push(location);
    if (locations.length >= limit) break;
  }
  return locations;
}
