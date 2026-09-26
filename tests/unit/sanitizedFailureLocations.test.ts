// 4.5 — sanitized failure locations carry an assertion class, never a raw
// message. The closed class set and the extractor are the shared source the
// three CI extraction sites use, so a receipt can be triaged (timeout vs
// expectation vs throw) while received/expected values, stack frames and user
// data never cross the boundary.

import { expect, test } from '@playwright/test';
import {
  FAILURE_LOCATION_CLASSES,
  classifyAssertionBlock,
  extractSanitizedFailedLocations,
} from '../../bin/lib/sanitized-failure-locations.mjs';

const PLAYWRIGHT_LIST_OUTPUT = `
  1) [nightwatch] › tests/unit/example.test.ts:42:7 › suite › an expectation fails
    Error: expect(received).toBe(expected)

    Expected: 3
    Received: 5

      42 |     expect(value).toBe(3);
  2) [nightwatch] › tests/unit/other.test.ts:7:5 › suite › a wait gives up
    Error: Timeout 5000ms exceeded.

  3) [nightwatch] › tests/unit/example.test.ts:42:7 › suite › an expectation fails
    Error: expect(received).toBe(expected)

  4) [nightwatch] › tests/unit/throwing.test.ts:9:3 › suite › a throw is expected
    Error: expect(received).toThrow(error)

    Error: boom
`;

test.describe('4.5 — sanitized assertion classes', () => {
  test('the class vocabulary is a closed, message-free enum', () => {
    expect([...FAILURE_LOCATION_CLASSES].sort()).toEqual(['EXPECT_EQUAL', 'EXPECT_MATCH', 'EXPECT_THROW', 'TIMEOUT', 'UNCLASSIFIED']);
    for (const name of FAILURE_LOCATION_CLASSES) expect(name).toMatch(/^[A-Z_]+$/);
  });

  test('each failure shape classifies without reading message content', () => {
    expect(classifyAssertionBlock('Error: Timeout 5000ms exceeded.')).toBe('TIMEOUT');
    expect(classifyAssertionBlock('timed out after 10s')).toBe('TIMEOUT');
    expect(classifyAssertionBlock('Error: expect(received).toBe(expected)')).toBe('EXPECT_EQUAL');
    expect(classifyAssertionBlock('Error: expect(received).toContain(item)')).toBe('EXPECT_MATCH');
    expect(classifyAssertionBlock('Error: expect(received).toThrow(error)')).toBe('EXPECT_THROW');
    expect(classifyAssertionBlock('some opaque failure')).toBe('UNCLASSIFIED');
  });

  test('extraction yields file:line:CLASS, deduplicates, limits, and never carries raw text', () => {
    const locations = extractSanitizedFailedLocations(PLAYWRIGHT_LIST_OUTPUT, 16);
    expect(locations).toEqual([
      'tests/unit/example.test.ts:42:EXPECT_EQUAL',
      'tests/unit/other.test.ts:7:TIMEOUT',
      'tests/unit/throwing.test.ts:9:EXPECT_THROW',
    ]);
    const serialized = JSON.stringify(locations);
    expect(serialized).not.toContain('Expected');
    expect(serialized).not.toContain('Received');
    expect(serialized).not.toContain('boom');
    expect(serialized).not.toContain('5000ms');
    // limit honoured
    expect(extractSanitizedFailedLocations(PLAYWRIGHT_LIST_OUTPUT, 1)).toHaveLength(1);
  });

  test('no failure markers yields no locations rather than fabricating any', () => {
    expect(extractSanitizedFailedLocations('  1 passed (2.0s)\n')).toEqual([]);
  });
});
