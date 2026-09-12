import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Every field a view fetches must render in the view that owns it.
 *
 * The predecessor's check asserted that each contract field NAME appears
 * somewhere in `App.tsx`. That is reachability of the file, not placement in a
 * view: `RunListItemSnapshot.passed` satisfied it only because the Safety
 * Center contains the sentence "A route that is off is not a route that
 * passed.", while no runs view ever reads the field.
 *
 * This check scopes the search to the code that can receive the contract. For
 * each `function` component it builds a carrier text — the component's body,
 * plus the bodies of functions it invokes with explicit type arguments, so
 * `usePagedCollection<RunListSnapshot, …>` makes the generic paged collection
 * part of the view it serves — and it closes carriage transitively over
 * containment: a component that carries `OverviewSnapshot` and reads `safety`
 * also carries `SafetySnapshot`. A field passes when a carrier of a contract
 * that declares it contains the field name.
 *
 * SCOPE AND LIMIT OF THIS CHECK. It is a textual, carrier-scoped comparison.
 * It proves a field name occurs inside a component that can receive its
 * contract; it does not prove the field is conditionally rendered, reachable
 * in every branch, or visually correct. Comments are stripped before the
 * search, because a comment is not a render. Generic callees are resolved one
 * level of type arguments deep, which is what the paged collection needs.
 * Anything the check cannot prove is listed below with a reason, so the exempt
 * set is small, explicit and auditable rather than implied by silence.
 */
const TYPES = readFileSync(resolve(process.cwd(), 'src/types.ts'), 'utf8');

/**
 * Group 19.13. The guard reads one module per view plus the shared module and
 * the shell, and attributes every component to the module that defines it, so
 * a field can be carried only by a component inside the view it belongs to.
 */
const SRC = resolve(process.cwd(), 'src');
const COMPONENT_MODULES: ReadonlyArray<readonly [string, string]> = [
  ['App.tsx', readFileSync(join(SRC, 'App.tsx'), 'utf8')],
  ['shared.tsx', readFileSync(join(SRC, 'shared.tsx'), 'utf8')],
  ...readdirSync(join(SRC, 'views'))
    .filter((file) => file.endsWith('.tsx'))
    .sort()
    .map((file) => [`views/${file}`, readFileSync(join(SRC, 'views', file), 'utf8')] as const),
];
/** A comment is not a render. Strip block and line comments before any search. */
const stripComments = (text: string): string =>
  text.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/.*$/gm, '$1');
const APP = COMPONENT_MODULES.map(([, text]) => stripComments(text)).join('\n');
const COMPONENT_MODULE = new Map<string, string>();

/**
 * Fields that are deliberately never rendered. Each entry states why. A field
 * may only be added here for a reason an operator would accept out loud, and
 * the entry is only valid while the field is absent from every carrier of
 * every contract that declares it.
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
  // The boolean projection of `status`, which the runs views render. Showing
  // both would state one fact twice and invite them to disagree on screen.
  passed: 'boolean projection of status; the runs views render the status',
};

interface ContractField {
  readonly contract: string;
  readonly field: string;
  readonly type: string;
}

function contractFields(): readonly ContractField[] {
  const fields: ContractField[] = [];
  for (const [, contract, body] of TYPES.matchAll(/export interface (\w+) \{(.*?)\n\}/gs)) {
    for (const [, field, type] of (body as string).matchAll(/readonly (\w+)\??:\s*([^;\n]+)/g)) {
      fields.push({ contract: contract as string, field: field as string, type: (type as string).trim() });
    }
  }
  return fields;
}

const CONTRACT_FIELDS = contractFields();
const CONTRACT_NAMES = [...new Set(CONTRACT_FIELDS.map((entry) => entry.contract))];

function containsWord(text: string, word: string): boolean {
  return new RegExp(`\\b${word}\\b`).test(text);
}

/**
 * The body of every `function` declaration in the component file, including
 * generic declarations such as `usePagedCollection<S extends …>`.
 */
function componentBodies(): ReadonlyMap<string, string> {
  const bodies = new Map<string, string>();
  for (const [module, rawText] of COMPONENT_MODULES) {
    const text = stripComments(rawText);
    const declaration = /\n(?:export )?function (\w+)/g;
    let match: RegExpExecArray | null;
    while ((match = declaration.exec(text)) !== null) {
      const name = match[1] as string;
      let cursor = match.index + match[0].length;
      if (text[cursor] === '<') {
        // Skip the declaration's own type parameters, e.g. `<S, T>`.
        let angleDepth = 0;
        for (; cursor < text.length; cursor += 1) {
          if (text[cursor] === '<') angleDepth += 1;
          else if (text[cursor] === '>') {
            angleDepth -= 1;
            if (angleDepth === 0) { cursor += 1; break; }
          }
        }
      }
      if (text[cursor] !== '(') continue;
      let parenDepth = 0;
      let afterParams = -1;
      for (; cursor < text.length; cursor += 1) {
        if (text[cursor] === '(') parenDepth += 1;
        else if (text[cursor] === ')') {
          parenDepth -= 1;
          if (parenDepth === 0) { afterParams = cursor; break; }
        }
      }
      if (afterParams === -1) continue;
      const open = text.indexOf('{', afterParams);
      if (open === -1) continue;
      let braceDepth = 0;
      let end = -1;
      for (let index = open; index < text.length; index += 1) {
        if (text[index] === '{') braceDepth += 1;
        else if (text[index] === '}') {
          braceDepth -= 1;
          if (braceDepth === 0) { end = index; break; }
        }
      }
      if (end === -1) continue;
      bodies.set(name, text.slice(match.index, end + 1));
      if (!COMPONENT_MODULE.has(name)) COMPONENT_MODULE.set(name, module);
    }
  }
  return bodies;
}

const COMPONENT_BODIES = componentBodies();

/**
 * A component's carrier text is its own body plus the bodies of functions it
 * invokes with explicit type arguments. The invocation binds the generic
 * consumer to the contract, so the consumer's body is part of the view.
 */
function carrierTexts(): ReadonlyMap<string, string> {
  const texts = new Map<string, string>();
  for (const [name, body] of COMPONENT_BODIES) {
    const collected: string[] = [body];
    const seen = new Set<string>([name]);
    for (let index = 0; index < collected.length; index += 1) {
      for (const call of (collected[index] as string).matchAll(/\b(\w+)<([^>\n]*)>\s*\(/g)) {
        const callee = call[1] as string;
        if (seen.has(callee)) continue;
        const calleeBody = COMPONENT_BODIES.get(callee);
        if (calleeBody === undefined) continue;
        seen.add(callee);
        collected.push(calleeBody);
      }
    }
    texts.set(name, collected.join('\n'));
  }
  return texts;
}

const CARRIER_TEXTS = carrierTexts();

/**
 * Contract -> components that can receive it: a direct name mention, a
 * generic consumer bound at the call site, or a containment path from a
 * parent contract through the field that holds it, to a fixpoint.
 */
function carriersByContract(): ReadonlyMap<string, ReadonlySet<string>> {
  const result = new Map<string, Set<string>>();
  for (const [component, text] of CARRIER_TEXTS) {
    const carried = new Set(CONTRACT_NAMES.filter((contract) => containsWord(text, contract)));
    let grew = true;
    while (grew) {
      grew = false;
      for (const parent of [...carried]) {
        for (const entry of CONTRACT_FIELDS) {
          if (entry.contract !== parent || carried.has(entry.type)) continue;
          for (const target of CONTRACT_NAMES) {
            if (carried.has(target) || !containsWord(entry.type, target)) continue;
            if (containsWord(text, entry.field)) { carried.add(target); grew = true; }
          }
        }
      }
    }
    for (const contract of carried) {
      const carriers = result.get(contract) ?? new Set<string>();
      carriers.add(component);
      result.set(contract, carriers);
    }
  }
  return result;
}

const CARRIERS = carriersByContract();

function renderedInCarrier(contract: string, field: string): boolean {
  const carriers = CARRIERS.get(contract);
  if (carriers === undefined) return false;
  return [...carriers].some((component) => containsWord(CARRIER_TEXTS.get(component) ?? '', field));
}

describe('control center contract placement coverage', () => {
  it('extracts contracts, fields, components and each carriage mechanism', () => {
    // A parser that silently matched nothing would make every assertion below
    // vacuous, so each extraction is measured first.
    expect(CONTRACT_NAMES.length).toBeGreaterThan(30);
    expect(CONTRACT_FIELDS.length).toBeGreaterThan(150);
    expect(COMPONENT_BODIES.size).toBeGreaterThan(30);
    // Generic consumer bound at the call site: the paged collection body is
    // folded into the dashboard that binds it to the concrete list contract.
    expect(CARRIER_TEXTS.get('DashboardApp')).toContain('snapshot.page.nextCursor');
    expect(CARRIERS.get('RunListSnapshot')?.has('DashboardApp')).toBe(true);
    expect(renderedInCarrier('RunListSnapshot', 'nextCursor')).toBe(true);
    // Containment: `SafetyView` never names `SafetySnapshot`; it receives it
    // through `OverviewSnapshot.safety`, which it does read.
    expect(CARRIERS.get('SafetySnapshot')?.has('SafetyView')).toBe(true);
    expect(renderedInCarrier('SafetySnapshot', 'checks')).toBe(true);
  });

  it('renders every declared field inside a carrier of its contract', () => {
    const unrendered = [...new Set(
      CONTRACT_FIELDS
        .filter((entry) => !(entry.field in NOT_RENDERED))
        .filter((entry) => !renderedInCarrier(entry.contract, entry.field))
        .map((entry) => `${entry.contract}.${entry.field}`),
    )].sort();
    expect(unrendered).toEqual([]);
  });

  it('keeps the exempt set honest in both directions', () => {
    // An exemption for a field no contract declares is stale bookkeeping, and
    // an exemption for a field that IS now rendered in one of its carriers is
    // a claim the code no longer supports. Stale bookkeeping is how an exempt
    // list grows into a blanket.
    for (const [field, reason] of Object.entries(NOT_RENDERED)) {
      expect(reason.length).toBeGreaterThan(20);
      const declared = CONTRACT_FIELDS.filter((entry) => entry.field === field);
      expect(declared.length, `exempt field ${field} is declared by no contract`).toBeGreaterThan(0);
      const renderedSomewhere = declared.some((entry) => renderedInCarrier(entry.contract, entry.field));
      expect(renderedSomewhere, `exempt field ${field} is now rendered; remove the exemption`).toBe(false);
    }
  });

  it('scopes the search to carriers: a colliding word elsewhere does not count', () => {
    // The field name appears in the file, so the predecessor's file-level
    // search accepted it, but it appears in no component that can receive
    // `RunListItemSnapshot`. This is the defect class the placement check
    // exists to catch, kept as an executable statement of the difference.
    expect(APP).toContain('passed');
    expect(renderedInCarrier('RunListSnapshot', 'passed')).toBe(false);
  });

  it('carries every view contract inside the owning view module', () => {
    // Group 19.13. The decomposition gives each view its own module, so the
    // carrier of a contract must live in the module that owns the view. A
    // field rendered only in a non-owning view cannot satisfy its owner.
    const VIEW_MODULE_CONTRACTS: Readonly<Record<string, readonly string[]>> = {
      'views/OverviewView.tsx': ['OverviewSnapshot', 'ReadinessSnapshot'],
      'views/RunsView.tsx': ['RunListSnapshot', 'RunDetailSnapshot', 'TimelineSnapshot'],
      'views/ExecutionGraphView.tsx': ['ExecutionGraphSnapshot'],
      'views/SourceView.tsx': ['SourceSurfacesSnapshot', 'SourceGraphSnapshot'],
      'views/FindingsView.tsx': ['FindingsSnapshot'],
      'views/ReviewerView.tsx': ['ReviewerSnapshot'],
      'views/CampaignView.tsx': ['CampaignSummarySnapshot', 'CampaignCoverageSnapshot'],
      'views/SafetyView.tsx': ['SafetySnapshot'],
      'views/SystemMapView.tsx': ['SystemMapSnapshot'],
    };
    for (const [module, contracts] of Object.entries(VIEW_MODULE_CONTRACTS)) {
      for (const contract of contracts) {
        const owners = [...(CARRIERS.get(contract) ?? [])].filter((component) => COMPONENT_MODULE.get(component) === module);
        expect(owners.length, `${contract} has no carrier in ${module}; it is rendered in a non-owning view`).toBeGreaterThan(0);
      }
    }
  });
});
