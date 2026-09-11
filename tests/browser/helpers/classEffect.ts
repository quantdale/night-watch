import type { Page } from '@playwright/test';

/**
 * Rendered classes that deliberately change no computed property on the
 * elements that carry them, each with the reason. An entry is valid only
 * while the class remains ineffective: if it gains a computed effect, the
 * lane fails and the entry must be removed. A class observed ineffective and
 * not listed here fails the lane too.
 */
export const BASE_ONLY_CLASSES: Readonly<Record<string, string>> = Object.freeze({
  'status-neutral': 'neutral is the base .status-pill treatment; a rule would only restate it',
  'stage-neutral': 'neutral is the base .stage-chip treatment; a rule would only restate it',
  'text-neutral': 'neutral is the inherited colour; a rule would only restate it',
  'graph-node-neutral': 'neutral restates the base .graph-node stroke; a rule would only restate it',
});

/**
 * Browser-side structural types. The root TypeScript program deliberately
 * excludes the DOM lib, so the browser globals this check needs are named
 * locally rather than by widening the whole program.
 */
interface DomStyle {
  readonly length: number;
  item(index: number): string;
  getPropertyValue(property: string): string;
}
interface DomElement {
  readonly tagName: string;
  readonly classList: { readonly length: number; item(index: number): string | null };
  getAttribute(name: string): string | null;
  setAttribute(name: string, value: string): void;
  querySelectorAll(selector: string): { readonly length: number; item(index: number): DomElement | null };
}
interface DomSheet {
  insertRule(rule: string, index: number): number;
  deleteRule(index: number): void;
}
interface DomRoot {
  readonly document: {
    createElement(tag: string): { textContent: string; remove(): void };
    readonly head: { appendChild(node: unknown): void };
    readonly styleSheets: { readonly length: number; item(index: number): DomSheet | null };
    querySelectorAll(selector: string): { readonly length: number; item(index: number): DomElement | null };
  };
  getComputedStyle(element: unknown): DomStyle;
}

export interface ClassEffectSweep {
  /** Every class observed in the swept DOM. */
  readonly observed: readonly string[];
  /** Observed classes that changed no computed property on any carrier. */
  readonly ineffective: readonly string[];
}

/**
 * Provenance of a class's computed effect: toggle it off on the element that
 * carries it, read the full computed style, restore, read again, and compare.
 * The element is compared with itself, so ancestor, descendant and sibling
 * selectors keep matching; transitions and animations are disabled so no
 * interpolated value is read. `setAttribute` is used because an SVG element's
 * `className` is not a plain string.
 */
export async function sweepClassEffects(page: Page): Promise<ClassEffectSweep> {
  // Park the pointer: a hovered element keeps its :hover declarations, which
  // can mask the class under test.
  await page.mouse.move(0, 0);
  return page.evaluate(() => {
    const dom = globalThis as unknown as DomRoot;
    // Disable transitions and animations without injecting a <style> element:
    // the page's style-src CSP blocks inline style, but a same-origin sheet
    // loaded from 'self' accepts a CSSOM rule. Without this a toggle reads
    // the transition's START value and every tone class looks inert.
    const sheets = dom.document.styleSheets;
    let transitionSheet: DomSheet | null = null;
    for (let index = 0; index < sheets.length; index += 1) {
      const candidate = sheets.item(index);
      if (candidate === null) continue;
      try {
        candidate.insertRule('* { transition: none !important; animation: none !important; }', 0);
        transitionSheet = candidate;
        break;
      } catch {
        // Try the next sheet; a cross-origin sheet refuses by design.
      }
    }
    const effective = new Map<string, boolean>();
    const styleOfOne = (element: DomElement): string => {
      const computed = dom.getComputedStyle(element);
      const parts: string[] = [];
      for (let index = 0; index < computed.length; index += 1) {
        const property = computed.item(index);
        parts.push(`${property}:${computed.getPropertyValue(property)}`);
      }
      return parts.join(';');
    };
    // A class may carry no declarations of its own and still style its
    // children (a descendant-selector anchor). Compare a bounded number of
    // descendants as well, so such a class is not called inert.
    const styleOf = (element: DomElement): string => {
      const parts = [styleOfOne(element)];
      const descendants = element.querySelectorAll('*');
      const limit = Math.min(descendants.length, 12);
      for (let index = 0; index < limit; index += 1) {
        const child = descendants.item(index);
        if (child !== null) parts.push(styleOfOne(child));
      }
      return parts.join('|');
    };
    // Native form controls whose computed colours are controlled by the
    // browser's form theme in this environment (a freshly created button with
    // inline colour, border and background computes the theme values). Their
    // classes are covered statically by the stylesheet guard; they cannot be
    // measured here and are excluded rather than reported as ineffective.
    const themeControlled = new Set(['BUTTON', 'INPUT', 'SELECT', 'TEXTAREA']);
    const elements = dom.document.querySelectorAll('[class]');
    for (let elementIndex = 0; elementIndex < elements.length; elementIndex += 1) {
      const element = elements.item(elementIndex);
      if (element === null || themeControlled.has(element.tagName)) continue;
      const classes: string[] = [];
      for (let classIndex = 0; classIndex < element.classList.length; classIndex += 1) {
        const name = element.classList.item(classIndex);
        if (name !== null && !classes.includes(name)) classes.push(name);
      }
      for (const name of classes) {
        if (effective.get(name) === true) continue;
        const saved = element.getAttribute('class') ?? '';
        element.setAttribute('class', classes.filter((entry) => entry !== name).join(' '));
        const without = styleOf(element);
        element.setAttribute('class', saved);
        const withClass = styleOf(element);
        if (without !== withClass) effective.set(name, true);
        else if (!effective.has(name)) effective.set(name, false);
      }
    }
    if (transitionSheet !== null) {
      try { transitionSheet.deleteRule(0); } catch { /* already gone */ }
    }
    const observed = [...effective.keys()].sort();
    return {
      observed,
      ineffective: observed.filter((name) => effective.get(name) === false),
    };
  });
}

/**
 * Compare every sweep against the declared base-only list. `undeclared` names
 * classes that changed no computed property and carry no reason; `stale`
 * names declared base-only classes that did change a computed property.
 */
export function classEffectViolations(
  sweeps: readonly ClassEffectSweep[],
): { readonly undeclared: readonly string[]; readonly stale: readonly string[] } {
  const ineffective = new Set<string>();
  const effective = new Set<string>();
  for (const sweep of sweeps) {
    for (const name of sweep.ineffective) ineffective.add(name);
    for (const name of sweep.observed) if (!sweep.ineffective.includes(name)) effective.add(name);
  }
  return {
    undeclared: [...ineffective].filter((name) => !(name in BASE_ONLY_CLASSES)).sort(),
    stale: [...effective].filter((name) => name in BASE_ONLY_CLASSES).sort(),
  };
}

