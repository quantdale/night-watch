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
 * Native form controls are swept on their NON-forced computed properties.
 *
 * The browser's form theme forces a control's colour, background and border
 * colour, so a toggle-and-compare over the full computed style reads no
 * difference and the whole element used to be excluded. Excluding the element
 * is how an inert class on a `<select>` or `<input>` escapes detection. These
 * properties are instead excluded BY NAME, on native controls only; geometry,
 * spacing, border width/style, font and layout remain observable. An
 * undeclared exclusion has no path into this list.
 */
export const FORCED_NATIVE_PROPERTIES: Readonly<Record<string, string>> = Object.freeze({
  color: 'the Chromium form theme forces control text colour, so a class colour is not observable here',
  'background-color': 'the Chromium form theme forces the control background, so a class background is not observable here',
  'border-top-color': 'the Chromium form theme forces the control border colour',
  'border-right-color': 'the Chromium form theme forces the control border colour',
  'border-bottom-color': 'the Chromium form theme forces the control border colour',
  'border-left-color': 'the Chromium form theme forces the control border colour',
  'outline-color': 'the focus ring colour is drawn by the theme, not the class under test',
  'text-decoration-color': 'forced by the theme on native controls',
  'text-emphasis-color': 'forced by the theme on native controls',
  'caret-color': 'forced by the theme on native controls',
  'accent-color': 'forced by the theme on native controls',
  'column-rule-color': 'forced by the theme on native controls',
  '-webkit-text-fill-color': 'the Chromium text fill is forced on native controls and overrides `color`',
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

export interface NativeIneffectiveClass {
  /** The class that changed no non-forced property on this carrier. */
  readonly class: string;
  /** The native control that carries it, as `tag.class.names`. */
  readonly element: string;
}

export interface ClassEffectSweep {
  /** Every class observed in the swept DOM. */
  readonly observed: readonly string[];
  /** Observed classes that changed no computed property on any carrier. */
  readonly ineffective: readonly string[];
  /** Classes observed on native form controls during this sweep. */
  readonly nativeObserved: readonly string[];
  /** Per-carrier native-control inertness: the class and the control. */
  readonly nativeIneffective: readonly NativeIneffectiveClass[];
  /** The forced properties excluded on native controls, declared by name. */
  readonly forcedProperties: readonly string[];
}

/**
 * Provenance of a class's computed effect: toggle it off on the element that
 * carries it, read the computed style, restore, read again, and compare.
 * The element is compared with itself, so ancestor, descendant and sibling
 * selectors keep matching; transitions and animations are disabled so no
 * interpolated value is read. `setAttribute` is used because an SVG element's
 * `className` is not a plain string.
 *
 * Native controls are compared on the non-forced property set only; every
 * other element keeps the full computed style (colour is a real effect
 * there). A native carrier whose class changes nothing is reported per
 * element, because a class inert on a control must fail even if the same
 * class happens to be effective on some other element.
 */
export async function sweepClassEffects(page: Page): Promise<ClassEffectSweep> {
  // Park the pointer: a hovered element keeps its :hover declarations, which
  // can mask the class under test.
  await page.mouse.move(0, 0);
  return page.evaluate((forcedPropertyNames) => {
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
    const nativeObserved = new Set<string>();
    const nativeIneffective: Array<{ class: string; element: string }> = [];
    const nativeTested = new Set<string>();
    const forced = new Set<string>((forcedPropertyNames as readonly string[]).map((name) => name.toLowerCase()));
    const isNative = (tag: string): boolean => tag === 'BUTTON' || tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA';
    const styleOfOne = (element: DomElement, native: boolean): string => {
      const computed = dom.getComputedStyle(element);
      const parts: string[] = [];
      for (let index = 0; index < computed.length; index += 1) {
        const property = computed.item(index);
        if (native && forced.has(property.toLowerCase())) continue;
        parts.push(`${property}:${computed.getPropertyValue(property)}`);
      }
      return parts.join(';');
    };
    // A class may carry no declarations of its own and still style its
    // children (a descendant-selector anchor). Compare a bounded number of
    // descendants as well, so such a class is not called inert.
    const styleOf = (element: DomElement, native: boolean): string => {
      const parts = [styleOfOne(element, native)];
      const descendants = element.querySelectorAll('*');
      const limit = Math.min(descendants.length, 12);
      for (let index = 0; index < limit; index += 1) {
        const child = descendants.item(index);
        if (child !== null) parts.push(styleOfOne(child, native));
      }
      return parts.join('|');
    };
    const elements = dom.document.querySelectorAll('[class]');
    for (let elementIndex = 0; elementIndex < elements.length; elementIndex += 1) {
      const element = elements.item(elementIndex);
      if (element === null) continue;
      const native = isNative(element.tagName);
      const classes: string[] = [];
      for (let classIndex = 0; classIndex < element.classList.length; classIndex += 1) {
        const name = element.classList.item(classIndex);
        if (name !== null && !classes.includes(name)) classes.push(name);
      }
      for (const name of classes) {
        if (native) nativeObserved.add(name);
        // The same class on the same control shape is tested once per sweep;
        // non-native carriers are skipped once the class is known effective.
        if (native) {
          const key = `${element.tagName}.${classes.join('.')}:${name}`;
          if (nativeTested.has(key)) continue;
          nativeTested.add(key);
        } else if (effective.get(name) === true) continue;
        const saved = element.getAttribute('class') ?? '';
        element.setAttribute('class', classes.filter((entry) => entry !== name).join(' '));
        const without = styleOf(element, native);
        element.setAttribute('class', saved);
        const withClass = styleOf(element, native);
        const changed = without !== withClass;
        if (changed) effective.set(name, true);
        else if (!effective.has(name)) effective.set(name, false);
        if (native && !changed) {
          nativeIneffective.push({ class: name, element: `${element.tagName.toLowerCase()}.${classes.join('.')}` });
        }
      }
    }
    if (transitionSheet !== null) {
      try { transitionSheet.deleteRule(0); } catch { /* already gone */ }
    }
    const observed = [...effective.keys()].sort();
    return {
      observed,
      ineffective: observed.filter((name) => effective.get(name) === false),
      nativeObserved: [...nativeObserved].sort(),
      nativeIneffective: nativeIneffective.sort((left, right) => left.class.localeCompare(right.class) || left.element.localeCompare(right.element)),
      forcedProperties: [...(forcedPropertyNames as readonly string[])].sort(),
    };
  }, Object.keys(FORCED_NATIVE_PROPERTIES));
}

/**
 * Compare every sweep against the declared base-only list. `undeclared` names
 * classes that changed no computed property and carry no reason; `stale`
 * names declared base-only classes that did change a computed property.
 * `nativeUndeclared` names a class that changed nothing on a native form
 * control, with the element it was found on; base-only declarations cover
 * those too.
 */
export function classEffectViolations(
  sweeps: readonly ClassEffectSweep[],
  baseOnly: Readonly<Record<string, string>> = BASE_ONLY_CLASSES,
): {
  readonly undeclared: readonly string[];
  readonly stale: readonly string[];
  readonly nativeUndeclared: readonly NativeIneffectiveClass[];
} {
  const ineffective = new Set<string>();
  const effective = new Set<string>();
  const nativeIneffective = new Map<string, NativeIneffectiveClass>();
  for (const sweep of sweeps) {
    for (const name of sweep.ineffective) ineffective.add(name);
    for (const name of sweep.observed) if (!sweep.ineffective.includes(name)) effective.add(name);
    for (const entry of sweep.nativeIneffective) nativeIneffective.set(`${entry.class}:${entry.element}`, entry);
  }
  return {
    undeclared: [...ineffective].filter((name) => !(name in baseOnly)).sort(),
    stale: [...effective].filter((name) => name in baseOnly).sort(),
    nativeUndeclared: [...nativeIneffective.values()]
      .filter((entry) => !(entry.class in baseOnly))
      .sort((left, right) => left.class.localeCompare(right.class) || left.element.localeCompare(right.element)),
  };
}
