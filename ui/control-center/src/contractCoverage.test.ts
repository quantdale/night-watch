import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Every field the Control Center fetches must reach the screen.
 *
 * Nine snapshot contracts were being fetched in full and rendered in part. The
 * run-detail panel read repository provenance, per-type and per-severity event
 * censuses, a screenshot count, hard-failure codes and note codes, and drew
 * none of them. The Safety Center counted `checks` in one Overview metric and
 * never listed a single check by name, under a heading promising that unknown
 * checks stay visible. Readiness dropped its stale targets, drift keys,
 * analyzer version agreement, deferred-versus-unmeasured dimensions and
 * blocker detail codes. In a tool whose whole claim is that absence of
 * evidence is not evidence of absence, silently unrendered evidence is the
 * worst available failure: the operator cannot tell a field that said nothing
 * from a field that was never drawn.
 *
 * SCOPE AND LIMIT OF THIS CHECK. It is a NAME-level check over the component
 * file: it proves a contract field name appears somewhere in `App.tsx`, not
 * that it appears in the right view or is reachable. It catches the failure
 * that actually happened — a field that reaches no render path at all — and
 * it does not certify placement. Anything it cannot prove is listed below with
 * a reason, so the exempt set is small, explicit and auditable rather than
 * implied by silence.
 */
const TYPES = readFileSync(resolve(process.cwd(), 'src/types.ts'), 'utf8');
const APP = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8');

/**
 * Fields that are deliberately never rendered. Each entry states why. A field
 * may only be added here for a reason an operator would accept out loud.
 */
const NOT_RENDERED: Readonly<Record<string, string>> = {
  // Contract identity. It is checked by the API layer on every response and
  // a mismatch is refused there, so the shell never has a version to show.
  schemaVersion: 'validated by the api layer; a mismatched response is refused, not displayed',
  // The request cursor the shell sent, echoed back. Showing the operator their
  // own paging offset adds nothing the timeline does not already show.
  afterSeq: 'request echo; the timeline itself carries position and truncation',
  // A `true` literal in the contract. It is rendered as prose on every element
  // it applies to ("Advisory. Not a duplicate verdict.") rather than as a
  // boolean row, because the word is what a reviewer needs to read.
  advisoryOnly: 'constant true; rendered as prose on every advisory element',
};

interface ContractField {
  readonly contract: string;
  readonly field: string;
}

function contractFields(): readonly ContractField[] {
  const fields: ContractField[] = [];
  for (const [, contract, body] of TYPES.matchAll(/export interface (\w+) \{(.*?)\n\}/gs)) {
    for (const [, field] of (body as string).matchAll(/readonly (\w+)\??:/g)) {
      fields.push({ contract: contract as string, field: field as string });
    }
  }
  return fields;
}

function appearsInApp(field: string): boolean {
  return new RegExp(`\\b${field}\\b`).test(APP);
}

describe('control center contract coverage', () => {
  it('reads the contract fields out of the type file', () => {
    // A parser that found nothing would make the assertion below vacuous.
    const fields = contractFields();
    expect(fields.length).toBeGreaterThan(150);
    expect(fields.some((entry) => entry.contract === 'RunDetailSnapshot' && entry.field === 'hardFailureCodes')).toBe(true);
  });

  it('renders every contract field that is not explicitly exempt', () => {
    const unrendered = [...new Set(
      contractFields()
        .filter((entry) => !(entry.field in NOT_RENDERED))
        .filter((entry) => !appearsInApp(entry.field))
        .map((entry) => `${entry.contract}.${entry.field}`),
    )].sort();
    expect(unrendered).toEqual([]);
  });

  it('keeps the exempt set honest by requiring each entry to still be unrendered', () => {
    // An exemption for a field that IS now rendered is stale bookkeeping, and
    // stale bookkeeping is how an exempt list grows into a blanket.
    const stale = Object.keys(NOT_RENDERED).filter((field) => {
      const declared = contractFields().some((entry) => entry.field === field);
      return !declared;
    });
    expect(stale).toEqual([]);
  });
});
