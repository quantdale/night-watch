import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Design-system integrity.
 *
 * The stylesheet declares one token block and every rule consumes it. Two
 * classes of defect are guarded here, and neither is visible to any check the
 * repository already had:
 *
 *   1. AN UNDEFINED TOKEN RENDERS ITS FALLBACK. `var(--ready, #1d7a4c)` with
 *      no `--ready` is not a missing colour — it is a DIFFERENT colour, and it
 *      renders silently. The style-and-absence campaign found exactly this:
 *      three undefined tokens whose light-theme fallbacks were what a dark
 *      console actually painted, one of them at 1.08:1. Those three are gone,
 *      but nothing forbade the SHAPE, so it could return unannounced.
 *
 *   2. A DIVERGENT FALLBACK IS A SECOND THEME. `var(--accent, #6ea8fe)` is
 *      inert while `--accent` is defined — and the sheet carried ten such
 *      fallbacks describing a blue-on-white theme that would appear the moment
 *      a token was renamed or scoped away. A rendered-contrast check cannot
 *      see this: it measures the amber and reports success. The guard has to
 *      read DECLARED values, which is why it lives here and not in the browser
 *      lane.
 *
 * Both assertions are preceded by a non-vacuity check on the extraction
 * itself, because a parser that quietly matched nothing would satisfy every
 * "no violations" expectation below while proving nothing at all.
 */
const STYLES = readFileSync(resolve(process.cwd(), 'src/styles.css'), 'utf8');

/** Comments are stripped so a token named in prose is never read as a declaration. */
function code(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '');
}

const CODE = code(STYLES);

/** The `:root` block is the token block; nothing else may declare a token. */
function rootBlock(): string {
  const start = CODE.indexOf(':root {');
  expect(start, ':root token block must exist').toBeGreaterThanOrEqual(0);
  const end = CODE.indexOf('\n}', start);
  expect(end, ':root token block must be closed').toBeGreaterThan(start);
  return CODE.slice(start, end);
}

function definedTokens(): Map<string, string> {
  const found = new Map<string, string>();
  for (const match of rootBlock().matchAll(/(--[a-zA-Z0-9-]+)\s*:\s*([^;]+);/g)) {
    found.set(match[1] as string, (match[2] as string).trim());
  }
  return found;
}

interface Reference { token: string; fallback: string | null }

/**
 * Every `var()` reference in the sheet, with its fallback when it has one.
 * Written as a scanner rather than a regex because a fallback may itself
 * contain parentheses — `var(--x, rgba(0, 0, 0, 0.2))` — which a naive
 * `[^)]*` would truncate and then silently compare the wrong text.
 */
function references(): Reference[] {
  const found: Reference[] = [];
  const pattern = /var\(\s*(--[a-zA-Z0-9-]+)\s*(,?)/g;
  for (const match of CODE.matchAll(pattern)) {
    const token = match[1] as string;
    if (match[2] !== ',') { found.push({ token, fallback: null }); continue; }
    let index = (match.index ?? 0) + match[0].length;
    let depth = 1;
    let text = '';
    while (index < CODE.length && depth > 0) {
      const character = CODE[index] as string;
      if (character === '(') depth += 1;
      else if (character === ')') { depth -= 1; if (depth === 0) break; }
      text += character;
      index += 1;
    }
    found.push({ token, fallback: text.trim() });
  }
  return found;
}

describe('design system — token integrity', () => {
  it('extracts a non-vacuous token block and reference set', () => {
    // Guards every assertion below. An empty extraction satisfies each of them.
    const defined = definedTokens();
    const used = references();
    expect(defined.size, 'the token block must declare tokens').toBeGreaterThanOrEqual(40);
    expect(used.length, 'the sheet must reference tokens').toBeGreaterThanOrEqual(150);
    // A colour, a type step, a spacing step, a radius, a shadow and a motion
    // step must each be present, so a block that lost a whole dimension fails
    // here rather than passing a bare count.
    for (const required of [
      '--bg', '--surface', '--accent', '--border-interactive',
      '--text-micro', '--text-body', '--space-4', '--radius-panel',
      '--shadow-overlay', '--motion-base', '--font-mono',
    ]) {
      expect(defined.has(required), `${required} must be declared`).toBe(true);
    }
  });

  it('defines every custom property the sheet references', () => {
    const defined = definedTokens();
    const undefinedTokens = [...new Set(
      references().map((reference) => reference.token).filter((token) => !defined.has(token)),
    )].sort();
    expect(
      undefinedTokens,
      `referenced but never defined — these render their fallback: ${undefinedTokens.join(', ')}`,
    ).toEqual([]);
  });

  it('never lets a var() fallback disagree with its token', () => {
    const defined = definedTokens();
    const divergent = references()
      .filter((reference) => reference.fallback !== null && defined.has(reference.token))
      .filter((reference) => defined.get(reference.token) !== reference.fallback)
      .map((reference) => `var(${reference.token}, ${reference.fallback}) — token is ${defined.get(reference.token)}`);
    expect(
      [...new Set(divergent)].sort(),
      'a fallback that differs from its token is a second theme waiting for a rename',
    ).toEqual([]);
  });

  it('references every token it declares', () => {
    // A token nothing uses is either dead or a rename that half-landed.
    const used = new Set(references().map((reference) => reference.token));
    // `--text-floor-px` is the numeric floor the BROWSER lane reads; it is
    // declared for that reader rather than consumed by a rule here.
    const declaredForExternalReaders = new Set(['--text-floor-px']);
    const unused = [...definedTokens().keys()]
      .filter((token) => !used.has(token) && !declaredForExternalReaders.has(token))
      .sort();
    expect(unused, `declared but never referenced: ${unused.join(', ')}`).toEqual([]);
  });
});

/**
 * Literal freedom.
 *
 * The token block is only a design system while everything else consumes it.
 * The sheet previously carried 84 `font-size` declarations across 19 values,
 * 37 radii across 12 values, 85 distinct spacing values and 54 distinct colour
 * literals — all of which read as deliberate until you count them.
 *
 * The exemption list below is the load-bearing part, and it fails in BOTH
 * directions on purpose. An unlisted literal fails, which is obvious; a listed
 * exemption that no longer appears ALSO fails, which is not. Without the second
 * direction an exemption list only ever grows, and a stale entry quietly widens
 * the hole it was granted for long after the reason expired.
 */
describe('design system — literal freedom', () => {
  /** Everything after the `:root` token block. */
  function styleBody(): string {
    const end = CODE.indexOf('\n}');
    expect(end, 'token block must be closed').toBeGreaterThan(0);
    return CODE.slice(end + 2);
  }

  /**
   * Structural values that are not design-system steps and never will be. Each
   * entry states WHY, and each is asserted to still occur.
   */
  const STRUCTURAL_EXEMPTIONS: ReadonlyArray<{ literal: string; reason: string }> = [
    { literal: '50%', reason: 'a circle (status dot, seal, orbit, loader) — a ratio, not a radius step' },
    { literal: '3px 0 0 3px', reason: 'the one-sided active-nav bar cap; a single-corner shape has no scale step' },
    { literal: '100%', reason: 'fill-the-parent sizing' },
    { literal: '1px', reason: 'hairline border width — the sheet has exactly one border weight' },
    { literal: '2px', reason: 'focus-ring width, deliberately thicker than a hairline so focus is never mistaken for a border' },
  ];

  it('scans a non-vacuous stylesheet body', () => {
    const body = styleBody();
    expect(body.length).toBeGreaterThan(10_000);
    expect(body).toContain('var(--');
  });

  it('resolves every font-size through the type scale', () => {
    const offenders = [...styleBody().matchAll(/font-size:\s*([^;]+);/g)]
      .map((match) => (match[1] as string).trim())
      .filter((value) => !value.startsWith('var(--text-'));
    expect(offenders, `font-size outside the type scale: ${offenders.join(', ')}`).toEqual([]);
  });

  it('resolves every border-radius through a radius role', () => {
    const exempt = new Set(STRUCTURAL_EXEMPTIONS.map((entry) => entry.literal));
    const offenders = [...styleBody().matchAll(/border-radius:\s*([^;]+);/g)]
      .map((match) => (match[1] as string).trim())
      .filter((value) => !value.startsWith('var(--radius-') && !exempt.has(value));
    expect(offenders, `border-radius outside the radius roles: ${offenders.join(', ')}`).toEqual([]);
  });

  it('carries no palette literal outside the token block', () => {
    const offenders = [...new Set(
      [...styleBody().matchAll(/#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)/g)].map((match) => match[0]),
    )].sort();
    expect(
      offenders,
      `colour literals outside the token block: ${offenders.join(', ')}`,
    ).toEqual([]);
  });

  it('resolves every spacing step through the spacing scale', () => {
    const offenders: string[] = [];
    for (const match of styleBody().matchAll(/(?:padding|margin|gap|row-gap|column-gap)(?:-top|-right|-bottom|-left)?:\s*([^;]+);/g)) {
      const value = (match[1] as string).trim();
      // A clamp()/calc() is a deliberate fluid bound, not a scale step.
      if (value.includes('clamp(') || value.includes('calc(')) continue;
      for (const part of value.split(/\s+/)) {
        if (/^\d+px$/.test(part)) offenders.push(`${(match[0] as string).trim()}`);
      }
    }
    expect([...new Set(offenders)], `spacing outside the scale: ${offenders.join(' | ')}`).toEqual([]);
  });

  it('keeps every structural exemption still needed', () => {
    // The second direction. A stale exemption is a hole nobody is watching.
    const body = styleBody();
    const stale = STRUCTURAL_EXEMPTIONS
      .filter((entry) => !body.includes(entry.literal))
      .map((entry) => `${entry.literal} (${entry.reason})`);
    expect(stale, `exemptions that are no longer needed and must be removed: ${stale.join(', ')}`).toEqual([]);
  });
});

/**
 * The declared media-query removal list.
 *
 * Hiding an element at a breakpoint is a product decision, not a layout tidy.
 * Two of them used to remove POSTURE — `.sidebar-footer` carried "Local only"
 * and "External egress disabled", and `.read-only-tag` was clamped until it
 * read "RE" — which is how a safety statement disappears without anyone
 * deciding it should.
 *
 * So every `display: none` inside a media query must be declared here with its
 * reason, and the list fails in BOTH directions: an undeclared removal fails,
 * and a declared entry whose rule no longer exists fails as stale. The second
 * direction is what stops the list from becoming a graveyard that silently
 * permits whatever was once added to it.
 */
describe('design system — declared breakpoint removals', () => {
  const DECLARED_REMOVALS: ReadonlyArray<{ selector: string; query: string; reason: string }> = [
    {
      selector: '.hero-orbit',
      query: '(max-width: 820px)',
      reason: 'aria-hidden decorative orbit; it carries no text and no control, and the hero states the same posture in chips beside it',
    },
    {
      selector: '.safety-seal',
      query: '(max-width: 820px)',
      reason: 'aria-hidden decorative seal; the Safety Center states every guardrail as text in the panel below it',
    },
  ];

  /** Every `display: none` rule inside a media query, with its query. */
  function breakpointRemovals(): { selector: string; query: string }[] {
    const found: { selector: string; query: string }[] = [];
    for (const media of CODE.matchAll(/@media([^{]+)\{/g)) {
      let depth = 1;
      let index = media.index + media[0].length;
      const start = index;
      while (index < CODE.length && depth > 0) {
        if (CODE[index] === '{') depth += 1;
        else if (CODE[index] === '}') depth -= 1;
        index += 1;
      }
      const block = CODE.slice(start, index);
      const query = (media[1] as string).trim();
      for (const rule of block.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
        if (!/display:\s*none/.test(rule[2] as string)) continue;
        for (const selector of (rule[1] as string).split(',')) {
          found.push({ selector: selector.trim(), query });
        }
      }
    }
    return found;
  }

  it('declares every element a breakpoint removes', () => {
    const declared = new Set(DECLARED_REMOVALS.map((entry) => `${entry.selector}@${entry.query}`));
    const undeclared = breakpointRemovals()
      .map((entry) => `${entry.selector}@${entry.query}`)
      .filter((key) => !declared.has(key));
    expect(
      [...new Set(undeclared)].sort(),
      `removed at a breakpoint with no declared reason: ${undeclared.join(', ')}`,
    ).toEqual([]);
  });

  it('keeps no stale entry in the removal list', () => {
    const actual = new Set(breakpointRemovals().map((entry) => `${entry.selector}@${entry.query}`));
    const stale = DECLARED_REMOVALS
      .map((entry) => `${entry.selector}@${entry.query}`)
      .filter((key) => !actual.has(key));
    expect(stale, `declared removals that no longer exist and must be deleted: ${stale.join(', ')}`).toEqual([]);
  });

  it('never removes a posture carrier at any breakpoint', () => {
    // These carry the read-only / loopback-only statements. Both were once on
    // the removal side of a media query; neither may return there.
    const posture = ['.sidebar-footer', '.read-only-tag', '.page-footer', '.scope-lock'];
    const removed = breakpointRemovals().filter((entry) => posture.includes(entry.selector));
    expect(
      removed.map((entry) => `${entry.selector}@${entry.query}`),
      'a posture carrier must never be display:none at a breakpoint',
    ).toEqual([]);
  });
});
