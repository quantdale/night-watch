import type { Page } from '@playwright/test';

// ---------------------------------------------------------------------------
// Accessibility evidence for the built Control Center composition.
//
// Four independent measurements live here, all consumed by
// `tests/browser/accessibilityCertification.browser.ts`:
//
//   1. Status distinctions: every element annotated with
//      `data-status-family`/`data-status-value` is paired within its family.
//      Two different status values must differ in accessible text or in a
//      non-colour computed property. A colour-only pair fails naming both
//      values.
//   2. Contrast: foreground/background pairs and non-text status boundaries
//      are enumerated from the rendered DOM and measured against WCAG 2.2 AA
//      for the computed size and weight. Exemptions are reasoned and fail in
//      both directions.
//   3. Structural audit: a standard structural subset (document language and
//      title, landmarks, heading order, control/link names, form labels,
//      image names, duplicate ids, aria-hidden focus, positive tabindex,
//      aria references, table headers, named navigation). Exemptions fail in
//      both directions. This is NOT certification; the lane states its limit.
//   4. Keyboard: a DOM-ordered list of focusable elements drives a real Tab
//      walk that asserts reading order, visible focus at each step, no
//      pointer-only control, and no unintended focus trap.
//
// The root TypeScript program deliberately excludes the DOM lib, so the
// browser globals these callbacks touch are named through local structural
// types instead of widening the whole program (the same discipline as
// `classEffect.ts`).
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Colour math (pure, Node side).
// ---------------------------------------------------------------------------

export interface Rgba {
  readonly r: number;
  readonly g: number;
  readonly b: number;
  readonly a: number;
}

/** Parse a computed `rgb()`/`rgba()` colour. Returns null for `none` etc. */
export function parseCssColour(value: string): Rgba | null {
  const match = /^rgba?\(\s*([0-9.]+)[,\s]+([0-9.]+)[,\s]+([0-9.]+)(?:[,\s/]+([0-9.]+))?\s*\)$/i.exec(value.trim());
  if (match === null) return null;
  const r = Number(match[1]);
  const g = Number(match[2]);
  const b = Number(match[3]);
  const a = match[4] === undefined ? 1 : Number(match[4]);
  if (![r, g, b, a].every((entry) => Number.isFinite(entry))) return null;
  return { r, g, b, a };
}

/** Composite `foreground` (with its own alpha) over an opaque `background`. */
export function compositeOver(foreground: Rgba, background: Rgba): Rgba {
  const alpha = foreground.a + background.a * (1 - foreground.a);
  if (alpha <= 0) return { r: 0, g: 0, b: 0, a: 0 };
  const channel = (front: number, back: number): number =>
    (front * foreground.a + back * background.a * (1 - foreground.a)) / alpha;
  return {
    r: channel(foreground.r, background.r),
    g: channel(foreground.g, background.g),
    b: channel(foreground.b, background.b),
    a: alpha,
  };
}

/**
 * Composite a painting stack. `layers[0]` is the element's own background and
 * later entries are its ancestors; the list is truncated at the first opaque
 * layer, which becomes the base. A browser canvas (html/body) is opaque, so a
 * stack with no opaque layer is unresolvable rather than defaulted to white.
 */
export function resolveBackground(layers: readonly string[]): Rgba | null {
  const parsed: Rgba[] = [];
  let baseIndex = -1;
  for (let index = 0; index < layers.length; index += 1) {
    const colour = parseCssColour(layers[index] as string);
    if (colour === null) continue;
    parsed.push(colour);
    if (colour.a >= 0.999) {
      baseIndex = parsed.length - 1;
      break;
    }
  }
  if (baseIndex < 0) return null;
  let result = parsed[baseIndex] as Rgba;
  for (let index = baseIndex - 1; index >= 0; index -= 1) {
    result = compositeOver(parsed[index] as Rgba, result);
  }
  return { r: result.r, g: result.g, b: result.b, a: 1 };
}

export function relativeLuminance(colour: Rgba): number {
  const channel = (value: number): number => {
    const scaled = Math.min(255, Math.max(0, value)) / 255;
    return scaled <= 0.04045 ? scaled / 12.92 : ((scaled + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(colour.r) + 0.7152 * channel(colour.g) + 0.0722 * channel(colour.b);
}

export function contrastRatio(left: Rgba, right: Rgba): number {
  const leftLuminance = relativeLuminance(left);
  const rightLuminance = relativeLuminance(right);
  const [high, low] = leftLuminance > rightLuminance
    ? [leftLuminance, rightLuminance]
    : [rightLuminance, leftLuminance];
  return (high + 0.05) / (low + 0.05);
}

/**
 * WCAG 2.2 1.4.3 "large text": 18pt (24px) at any weight, or 14pt (18.66px)
 * at bold (700+) weight.
 */
export function isLargeText(fontSizePx: number, fontWeight: number): boolean {
  return fontSizePx >= 24 || (fontSizePx >= 18.66 && fontWeight >= 700);
}

export const NON_TEXT_STATUS_CONTRAST = 3;
export const NORMAL_TEXT_CONTRAST = 4.5;
export const LARGE_TEXT_CONTRAST = 3;

// ---------------------------------------------------------------------------
// Status distinction sweep.
// ---------------------------------------------------------------------------

export interface StatusObservation {
  readonly family: string;
  readonly value: string;
  readonly accessibleText: string;
  readonly toneClasses: readonly string[];
  /** Computed properties outside the colour set, element plus descendants. */
  readonly signature: string;
  readonly descriptor: string;
}

export interface StatusSweep {
  readonly observations: readonly StatusObservation[];
  /** Every tone-classed element seen, annotated or not. */
  readonly toneCarrierCount: number;
  /** Tone-classed elements with no `[data-status-family]` ancestor. */
  readonly unannotated: readonly string[];
}

export interface StatusViolation {
  readonly family: string;
  readonly valueA: string;
  readonly valueB: string;
  readonly text: string;
  readonly toneA: string;
  readonly toneB: string;
}

export interface StatusReport {
  readonly families: readonly string[];
  readonly values: number;
  /** Element pairs with two different status values in one family. */
  readonly pairsEvaluated: number;
  readonly colourOnly: readonly StatusViolation[];
}

export function statusDistinctionViolations(sweep: StatusSweep): StatusReport {
  const families = new Map<string, StatusObservation[]>();
  for (const observation of sweep.observations) {
    const members = families.get(observation.family) ?? [];
    members.push(observation);
    families.set(observation.family, members);
  }
  const colourOnly: StatusViolation[] = [];
  let pairsEvaluated = 0;
  let values = 0;
  for (const [family, members] of families) {
    values += new Set(members.map((entry) => entry.value)).size;
    for (let left = 0; left < members.length; left += 1) {
      for (let right = left + 1; right < members.length; right += 1) {
        const observationA = members[left] as StatusObservation;
        const observationB = members[right] as StatusObservation;
        if (observationA.value === observationB.value) continue;
        pairsEvaluated += 1;
        // A differing accessible text is a non-colour channel. Only a pair
        // that reads identically but computes identically outside colour is
        // distinguishable by nothing but tone.
        if (observationA.accessibleText !== observationB.accessibleText) continue;
        if (observationA.signature !== observationB.signature) continue;
        colourOnly.push({
          family,
          valueA: observationA.value,
          valueB: observationB.value,
          text: observationA.accessibleText,
          toneA: observationA.toneClasses.join(' '),
          toneB: observationB.toneClasses.join(' '),
        });
      }
    }
  }
  return { families: [...families.keys()].sort(), values, pairsEvaluated, colourOnly };
}

export async function sweepStatusDistinctions(page: Page): Promise<StatusSweep> {
  return page.evaluate(() => {
    const dom = globalThis as unknown as {
      document: DomDocument;
      getComputedStyle(element: unknown): DomStyle;
    };
    const elements = dom.document.querySelectorAll('[data-status-family]');
    const observations: Array<{
      family: string; value: string; accessibleText: string; toneClasses: string[]; signature: string; descriptor: string;
    }> = [];
    const tonePattern = /(?:^| )(?:status|stage|graph-node|code-chip|text)-(ready|warning|blocked|neutral)(?:$| )/;
    const classNames = (element: DomElement): string[] => {
      const names: string[] = [];
      for (let index = 0; index < element.classList.length; index += 1) {
        const name = element.classList.item(index);
        if (name !== null) names.push(name);
      }
      return names;
    };
    const signatureOf = (element: DomElement): string => {
      const parts: string[] = [];
      const visit = (current: DomElement, depth: number): void => {
        const computed = dom.getComputedStyle(current);
        const entries: string[] = [];
        for (let index = 0; index < computed.length; index += 1) {
          const property = computed.item(index);
          const lower = property.toLowerCase();
          if (lower.includes('color') || lower.includes('background') || lower.includes('shadow')
            || lower === 'stroke' || lower === 'fill') continue;
          entries.push(`${property}:${computed.getPropertyValue(property)}`);
        }
        parts.push(entries.sort().join(';'));
        if (depth >= 1) return;
        const descendants = current.querySelectorAll('*');
        const limit = Math.min(descendants.length, 8);
        for (let index = 0; index < limit; index += 1) {
          const child = descendants.item(index);
          if (child !== null) visit(child, depth + 1);
        }
      };
      visit(element, 0);
      return parts.join('|');
    };
    const textOf = (element: DomElement): string => {
      const label = element.getAttribute('aria-label');
      if (label !== null && label.trim() !== '') return label.trim().replace(/\s+/g, ' ').slice(0, 80);
      return (element.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 80);
    };
    for (let index = 0; index < elements.length; index += 1) {
      const element = elements.item(index);
      if (element === null) continue;
      const family = element.getAttribute('data-status-family');
      const value = element.getAttribute('data-status-value');
      if (family === null || value === null) continue;
      observations.push({
        family,
        value,
        accessibleText: textOf(element),
        toneClasses: classNames(element).filter((name) => tonePattern.test(` ${name} `)),
        signature: signatureOf(element),
        descriptor: `${element.tagName.toLowerCase()}${classNames(element).map((name) => `.${name}`).join('')}`,
      });
    }
    // Completeness: every element that carries a tone class must sit inside an
    // annotated carrier, so a new colour-encoded status cannot escape the
    // check. The tone classes here are only the four status tones; class
    // families such as `graph-node-dimmed` are interaction state, not status.
    const toneCarrierPattern = /^(?:status|stage|graph-node|code-chip|text)-(ready|warning|blocked|neutral)$/;
    const carriers = dom.document.querySelectorAll('[class]');
    const unannotated: string[] = [];
    let toneCarrierCount = 0;
    for (let index = 0; index < carriers.length; index += 1) {
      const element = carriers.item(index);
      if (element === null) continue;
      const names = classNames(element);
      if (!names.some((name) => toneCarrierPattern.test(name))) continue;
      toneCarrierCount += 1;
      if (element.closest('[data-status-family]') !== null) continue;
      unannotated.push(`${element.tagName.toLowerCase()}${names.map((name) => `.${name}`).join('')}`);
    }
    return { observations, toneCarrierCount, unannotated: unannotated.slice(0, 50) };
  });
}

// ---------------------------------------------------------------------------
// Contrast sweep.
// ---------------------------------------------------------------------------

export interface TextObservation {
  readonly descriptor: string;
  readonly text: string;
  readonly colour: string;
  readonly backgrounds: readonly string[];
  readonly fontSizePx: number;
  readonly fontWeight: number;
  readonly opacity: number;
  readonly inactive: boolean;
}

export interface BoundaryObservation {
  readonly role: string;
  readonly descriptor: string;
  readonly colour: string;
  /** Background stack under the boundary paint (the element's own fill). */
  readonly backgrounds: readonly string[];
  /** Background stack the boundary sits against (the adjacent surface). */
  readonly adjacentBackgrounds: readonly string[];
  readonly opacity: number;
}

export interface ContrastSweep {
  readonly text: readonly TextObservation[];
  readonly boundaries: readonly BoundaryObservation[];
}

export interface MeasuredPair {
  readonly id: string;
  readonly kind: 'text-normal' | 'text-large' | 'non-text-status';
  readonly element: string;
  readonly text: string;
  readonly foreground: string;
  readonly background: string;
  readonly ratio: number;
  readonly required: number;
  readonly inactive: boolean;
}

export interface ContrastExclusion {
  readonly id: string;
  readonly reason: string;
}

export interface ContrastReport {
  readonly pairs: readonly MeasuredPair[];
  readonly exclusions: readonly ContrastExclusion[];
}

export function measureContrast(sweep: ContrastSweep): ContrastReport {
  const pairs: MeasuredPair[] = [];
  const exclusions: ContrastExclusion[] = [];
  for (const observation of sweep.text) {
    const background = resolveBackground(observation.backgrounds);
    if (background === null) {
      exclusions.push({ id: `text|${observation.descriptor}`, reason: 'NO_OPAQUE_BACKGROUND' });
      continue;
    }
    const parsed = parseCssColour(observation.colour);
    if (parsed === null || parsed.a <= 0) {
      exclusions.push({ id: `text|${observation.descriptor}`, reason: 'NO_OPAQUE_FOREGROUND' });
      continue;
    }
    const foreground = compositeOver({ ...parsed, a: parsed.a * observation.opacity }, background);
    const kind = isLargeText(observation.fontSizePx, observation.fontWeight) ? 'text-large' : 'text-normal';
    const ratio = contrastRatio(foreground, background);
    pairs.push({
      id: `text|${observation.descriptor}|${observation.colour}`,
      kind,
      element: observation.descriptor,
      text: observation.text,
      foreground: observation.colour,
      background: `rgb(${Math.round(background.r)}, ${Math.round(background.g)}, ${Math.round(background.b)})`,
      ratio,
      required: kind === 'text-large' ? LARGE_TEXT_CONTRAST : NORMAL_TEXT_CONTRAST,
      inactive: observation.inactive,
    });
  }
  for (const observation of sweep.boundaries) {
    const background = resolveBackground(observation.backgrounds);
    const adjacent = resolveBackground(observation.adjacentBackgrounds);
    const parsed = parseCssColour(observation.colour);
    if (background === null || adjacent === null || parsed === null || parsed.a <= 0) {
      exclusions.push({ id: `boundary|${observation.descriptor}`, reason: 'UNRESOLVED_BOUNDARY' });
      continue;
    }
    const boundary = compositeOver({ ...parsed, a: parsed.a * observation.opacity }, background);
    pairs.push({
      id: `boundary|${observation.role}|${observation.descriptor}|${observation.colour}`,
      kind: 'non-text-status',
      element: observation.role,
      text: '',
      foreground: observation.colour,
      background: `rgb(${Math.round(adjacent.r)}, ${Math.round(adjacent.g)}, ${Math.round(adjacent.b)})`,
      ratio: contrastRatio(boundary, adjacent),
      required: NON_TEXT_STATUS_CONTRAST,
      inactive: false,
    });
  }
  return { pairs, exclusions };
}

export interface ContrastExemption {
  readonly reason: string;
}

export interface ContrastFindings {
  readonly undeclared: readonly MeasuredPair[];
  readonly stale: readonly string[];
  readonly measured: number;
  readonly satisfied: number;
  readonly exclusions: readonly ContrastExclusion[];
}

/**
 * Both directions: a measured pair below its ratio with no reasoned
 * exemption fails; an exemption that names no currently-failing pair (pair
 * fixed, pair gone, or pair never measured) also fails. `id` is the stable
 * identity printed with each measurement.
 */
export function contrastViolations(
  report: ContrastReport,
  exemptions: Readonly<Record<string, ContrastExemption>>,
): ContrastFindings {
  const failing = report.pairs.filter((pair) => pair.ratio < pair.required);
  const failingIds = new Set(failing.map((pair) => pair.id));
  const undeclared = failing.filter((pair) => !(pair.id in exemptions));
  const stale = Object.keys(exemptions).filter((id) => !failingIds.has(id)).sort();
  return {
    undeclared,
    stale,
    measured: report.pairs.length,
    satisfied: report.pairs.length - failing.length,
    exclusions: report.exclusions,
  };
}

/**
 * Enumerate rendered foreground/background pairs from the DOM. Text pairs are
 * every visible element with rendered text (or a form control's editable
 * value); boundary pairs are the tone-coded non-text status boundaries:
 * status dots, status-pill borders, stage-chip borders, code-chip borders and
 * graph-node strokes. Neutral/base boundaries are deliberately not enumerated
 * because they carry no distinct status meaning beyond the default.
 */
export async function enumerateContrast(page: Page): Promise<ContrastSweep> {
  return page.evaluate(() => {
    const dom = globalThis as unknown as {
      document: DomDocument;
      getComputedStyle(element: unknown): DomStyle;
    };
    const text: Array<{
      descriptor: string; text: string; colour: string; backgrounds: string[]; fontSizePx: number; fontWeight: number; opacity: number; inactive: boolean;
    }> = [];
    const boundaries: Array<{ role: string; descriptor: string; colour: string; backgrounds: string[]; adjacentBackgrounds: string[]; opacity: number }> = [];
    const classNames = (element: DomElement): string[] => {
      const names: string[] = [];
      for (let index = 0; index < element.classList.length; index += 1) {
        const name = element.classList.item(index);
        if (name !== null) names.push(name);
      }
      return names;
    };
    const visible = (element: DomElement): boolean => {
      const style = dom.getComputedStyle(element);
      if (style.getPropertyValue('display') === 'none') return false;
      if (style.getPropertyValue('visibility') === 'hidden') return false;
      const rect = element.getBoundingClientRect();
      return rect.width > 0.5 && rect.height > 0.5;
    };
    const cumulativeOpacity = (element: DomElement): number => {
      let value = 1;
      let current: DomElement | null = element;
      while (current !== null) {
        const opacity = dom.getComputedStyle(current).getPropertyValue('opacity');
        if (opacity !== '') value *= Number(opacity);
        current = current.parentElement;
      }
      return value;
    };
    const backgroundsOf = (element: DomElement | null): string[] => {
      const layers: string[] = [];
      let current = element;
      while (current !== null) {
        const colour = dom.getComputedStyle(current).getPropertyValue('background-color');
        layers.push(colour);
        const parsedAlpha = /rgba?\(\s*[^)]*?,\s*([0-9.]+)\s*\)$/i.exec(colour);
        const alpha = parsedAlpha === null ? 1 : Number(parsedAlpha[1]);
        if (alpha >= 0.999) break;
        current = current.parentElement;
      }
      return layers;
    };
    const descriptorOf = (element: DomElement, extra?: string): string => {
      const base = `${element.tagName.toLowerCase()}${classNames(element).map((name) => `.${name}`).join('')}`;
      return extra === undefined ? base : `${base}${extra}`;
    };
    const eligible = new Set(['SCRIPT', 'STYLE', 'HEAD', 'META', 'LINK', 'TITLE', 'NOSCRIPT', 'TEMPLATE', 'DEFS', 'MARKER', 'SYMBOL', 'OPTION', 'DATALIST']);
    const all = dom.document.querySelectorAll('*');
    for (let index = 0; index < all.length; index += 1) {
      const element = all.item(index);
      if (element === null || eligible.has(element.tagName)) continue;
      const names = classNames(element);
      if (names.includes('sr-only') || names.includes('visually-hidden')) continue;
      if (!visible(element)) continue;
      const style = dom.getComputedStyle(element);
      // Rendered text: a direct non-whitespace text node. Form controls count
      // because their value is rendered text even without a text child.
      let hasText = false;
      const childNodes = element.childNodes;
      for (let nodeIndex = 0; nodeIndex < childNodes.length; nodeIndex += 1) {
        const node = childNodes.item(nodeIndex);
        if (node !== null && node.nodeType === 3 && (node.nodeValue ?? '').trim() !== '') { hasText = true; break; }
      }
      const formControl = element.tagName === 'INPUT' || element.tagName === 'SELECT' || element.tagName === 'TEXTAREA';
      if (!hasText && !formControl) continue;
      const rawText = (element.textContent ?? '').trim().replace(/\s+/g, ' ');
      if (formControl && rawText === '') continue;
      const isSvgText = element.tagName === 'text' || element.tagName === 'tspan';
      const fill = style.getPropertyValue('fill');
      const colour = isSvgText && fill !== '' && fill !== 'none' ? fill : style.getPropertyValue('color');
      if (colour === 'transparent' || colour === 'none' || colour === '') continue;
      const font = style.getPropertyValue('font-size');
      const sizeMatch = /([0-9.]+)px/.exec(font);
      const weightValue = style.getPropertyValue('font-weight');
      const weight = weightValue === 'bold' ? 700 : weightValue === 'normal' ? 400 : Number(weightValue);
      const inactive = element.closest('button[disabled], input[disabled], select[disabled], textarea[disabled], [aria-disabled="true"]') !== null;
      text.push({
        descriptor: descriptorOf(element, ` "${rawText.slice(0, 40)}"`),
        text: rawText.slice(0, 80),
        colour,
        backgrounds: backgroundsOf(element),
        fontSizePx: sizeMatch === null ? 16 : Number(sizeMatch[1]),
        fontWeight: Number.isFinite(weight) ? weight : 400,
        opacity: cumulativeOpacity(element),
        inactive,
      });
    }
    const boundarySelectors: ReadonlyArray<{ role: string; selector: string; property: string }> = [
      { role: 'status-dot', selector: '.status-ready .status-dot, .status-warning .status-dot, .status-blocked .status-dot', property: 'background-color' },
      { role: 'status-pill-border', selector: '.status-ready, .status-warning, .status-blocked', property: 'border-top-color' },
      { role: 'stage-chip-border', selector: '.stage-ready, .stage-warning, .stage-blocked', property: 'border-top-color' },
      { role: 'code-chip-border', selector: '.code-chip-blocked, .code-chip-warning, .code-chip-ready', property: 'border-top-color' },
      { role: 'graph-node-stroke', selector: 'rect.graph-node-ready, rect.graph-node-warning, rect.graph-node-blocked', property: 'stroke' },
    ];
    for (const boundary of boundarySelectors) {
      const matches = dom.document.querySelectorAll(boundary.selector);
      for (let index = 0; index < matches.length; index += 1) {
        const element = matches.item(index);
        if (element === null) continue;
        const style = dom.getComputedStyle(element);
        const colour = style.getPropertyValue(boundary.property);
        if (colour === '' || colour === 'none' || colour === 'transparent') continue;
        boundaries.push({
          role: boundary.role,
          descriptor: descriptorOf(element),
          colour,
          backgrounds: backgroundsOf(element),
          adjacentBackgrounds: backgroundsOf(element.parentElement),
          opacity: cumulativeOpacity(element),
        });
      }
    }
    return { text, boundaries };
  });
}

// ---------------------------------------------------------------------------
// Structural audit (standard subset, not certification).
// ---------------------------------------------------------------------------

export interface StructuralViolation {
  readonly check: string;
  readonly element: string;
  readonly detail: string;
}

export interface StructuralAuditResult {
  readonly violations: readonly StructuralViolation[];
  readonly checks: readonly string[];
  readonly elementsChecked: number;
  readonly view: string;
}

export interface StructuralExemption {
  readonly reason: string;
}

export interface StructuralFindings {
  readonly undeclared: readonly StructuralViolation[];
  readonly stale: readonly string[];
  readonly checks: readonly string[];
  readonly elementsChecked: number;
}

export const STRUCTURAL_AUDIT_CHECKS = [
  'document-language',
  'document-title',
  'single-main-landmark',
  'page-heading-one',
  'heading-order',
  'control-accessible-name',
  'link-accessible-name',
  'form-control-label',
  'image-accessible-name',
  'duplicate-id',
  'aria-hidden-focus',
  'positive-tabindex',
  'aria-reference-resolves',
  'table-has-header',
  'named-navigation',
] as const;

export const STRUCTURAL_AUDIT_LIMIT =
  'structural subset only, not certification: automated rules cannot see reading meaning, colour, '
  + 'motion, or assistive-technology behaviour';

/**
 * Run the structural subset in the page. Zero violations mean this subset is
 * clean, nothing more; the lane prints the limit alongside the result.
 */
export async function auditStructure(page: Page, view: string): Promise<StructuralAuditResult> {
  return page.evaluate((viewName: string) => {
    const dom = globalThis as unknown as {
      document: DomDocument;
      getComputedStyle(element: unknown): DomStyle;
    };
    const violations: Array<{ check: string; element: string; detail: string }> = [];
    const checks = [
      'document-language', 'document-title', 'single-main-landmark', 'page-heading-one', 'heading-order',
      'control-accessible-name', 'link-accessible-name', 'form-control-label', 'image-accessible-name',
      'duplicate-id', 'aria-hidden-focus', 'positive-tabindex', 'aria-reference-resolves', 'table-has-header',
      'named-navigation',
    ];
    const classNames = (element: DomElement): string[] => {
      const names: string[] = [];
      for (let index = 0; index < element.classList.length; index += 1) {
        const name = element.classList.item(index);
        if (name !== null) names.push(name);
      }
      return names;
    };
    const describe = (element: DomElement): string => `${element.tagName.toLowerCase()}${classNames(element).map((name) => `.${name}`).join('')}`;
    const visible = (element: DomElement): boolean => {
      const style = dom.getComputedStyle(element);
      if (style.getPropertyValue('display') === 'none') return false;
      if (style.getPropertyValue('visibility') === 'hidden') return false;
      const rect = element.getBoundingClientRect();
      return rect.width > 0.5 && rect.height > 0.5;
    };
    const accessibleName = (element: DomElement): string => {
      const direct = element.getAttribute('aria-label');
      if (direct !== null && direct.trim() !== '') return direct.trim();
      const labelledBy = element.getAttribute('aria-labelledby');
      if (labelledBy !== null && labelledBy.trim() !== '') {
        const joined = labelledBy.split(/\s+/).map((id) => dom.document.getElementById(id)?.textContent ?? '').join(' ').trim();
        if (joined !== '') return joined;
      }
      const title = element.getAttribute('title');
      if (title !== null && title.trim() !== '') return title.trim();
      return (element.textContent ?? '').trim();
    };
    let elementsChecked = 0;
    const each = (selector: string, visit: (element: DomElement) => void): void => {
      const nodes = dom.document.querySelectorAll(selector);
      for (let index = 0; index < nodes.length; index += 1) {
        const element = nodes.item(index);
        if (element !== null) { elementsChecked += 1; visit(element); }
      }
    };

    // document-language
    const lang = dom.document.documentElement.getAttribute('lang');
    if (lang === null || lang.trim() === '') {
      violations.push({ check: 'document-language', element: 'html', detail: 'no lang attribute' });
    }
    // document-title
    if (dom.document.title.trim() === '') {
      violations.push({ check: 'document-title', element: 'title', detail: 'empty document title' });
    }
    // single-main-landmark
    const mains = dom.document.querySelectorAll('main, [role="main"]');
    if (mains.length !== 1) {
      violations.push({ check: 'single-main-landmark', element: 'main', detail: `${mains.length} main landmarks` });
    }
    // page-heading-one
    const headings = dom.document.querySelectorAll('h1, h2, h3, h4, h5, h6, [role="heading"]');
    const levels: Array<{ level: number; element: string }> = [];
    for (let index = 0; index < headings.length; index += 1) {
      const element = headings.item(index);
      if (element === null) continue;
      const explicit = element.getAttribute('aria-level');
      const level = explicit === null
        ? Number(element.tagName.slice(1))
        : Number(explicit);
      if (Number.isFinite(level)) levels.push({ level, element: describe(element) });
    }
    if (!levels.some((entry) => entry.level === 1)) {
      violations.push({ check: 'page-heading-one', element: 'main', detail: 'no h1 heading rendered' });
    }
    // heading-order
    let previous = 0;
    for (const entry of levels) {
      if (previous > 0 && entry.level > previous + 1) {
        violations.push({ check: 'heading-order', element: entry.element, detail: `h${entry.level} after h${previous}` });
      }
      previous = entry.level;
    }
    // control-accessible-name
    each('button, [role="button"]', (element) => {
      if (element.hasAttribute('disabled') || !visible(element)) return;
      if (accessibleName(element) === '') {
        violations.push({ check: 'control-accessible-name', element: describe(element), detail: 'button without accessible name' });
      }
    });
    // link-accessible-name
    each('a[href], [role="link"]', (element) => {
      if (!visible(element)) return;
      if (accessibleName(element) === '') {
        violations.push({ check: 'link-accessible-name', element: describe(element), detail: 'link without accessible name' });
      }
    });
    // form-control-label
    each('input:not([type="hidden"]), select, textarea', (element) => {
      if (!visible(element) || element.hasAttribute('disabled')) return;
      let labelled = accessibleName(element) !== '';
      const wrapped = element.closest('label');
      if (!labelled && wrapped !== null && (wrapped.textContent ?? '').trim() !== '') labelled = true;
      const id = element.getAttribute('id');
      if (!labelled && id !== null && id !== '' && dom.document.querySelector(`label[for="${id}"]`) !== null) labelled = true;
      if (!labelled) {
        violations.push({ check: 'form-control-label', element: describe(element), detail: 'form control without label' });
      }
    });
    // image-accessible-name: an svg is decorative when aria-hidden; otherwise
    // it must carry role="img" and a name.
    each('svg', (element) => {
      if (element.getAttribute('aria-hidden') === 'true') return;
      if (!visible(element)) return;
      const role = element.getAttribute('role');
      if (role !== 'img') {
        violations.push({ check: 'image-accessible-name', element: describe(element), detail: 'visible svg without aria-hidden or role="img"' });
        return;
      }
      if (accessibleName(element) === '') {
        violations.push({ check: 'image-accessible-name', element: describe(element), detail: 'role="img" svg without accessible name' });
      }
    });
    each('img', (element) => {
      if (!element.hasAttribute('alt')) {
        violations.push({ check: 'image-accessible-name', element: describe(element), detail: 'img without alt attribute' });
      }
    });
    // duplicate-id
    const idCounts = new Map<string, number>();
    each('[id]', (element) => {
      const id = element.getAttribute('id');
      if (id === null || id === '') return;
      idCounts.set(id, (idCounts.get(id) ?? 0) + 1);
    });
    for (const [id, count] of idCounts) {
      if (count > 1) violations.push({ check: 'duplicate-id', element: `#${id}`, detail: `${count} elements share this id` });
    }
    // aria-hidden-focus
    each('[aria-hidden="true"]', (container) => {
      const focusable = container.querySelectorAll('a[href], button, input, select, textarea, [tabindex]');
      for (let index = 0; index < focusable.length; index += 1) {
        const element = focusable.item(index);
        if (element === null) continue;
        const tabindex = element.getAttribute('tabindex');
        if (tabindex !== null && Number(tabindex) >= 0) {
          violations.push({ check: 'aria-hidden-focus', element: describe(element), detail: 'focusable element inside aria-hidden container' });
          return;
        }
      }
    });
    // positive-tabindex
    each('[tabindex]', (element) => {
      const value = Number(element.getAttribute('tabindex'));
      if (Number.isFinite(value) && value > 0) {
        violations.push({ check: 'positive-tabindex', element: describe(element), detail: `tabindex=${value}` });
      }
    });
    // aria-reference-resolves
    each('[aria-labelledby], [aria-describedby]', (element) => {
      for (const attribute of ['aria-labelledby', 'aria-describedby']) {
        const reference = element.getAttribute(attribute);
        if (reference === null || reference.trim() === '') continue;
        for (const id of reference.split(/\s+/)) {
          const target = dom.document.getElementById(id);
          if (target === null || (target.textContent ?? '').trim() === '') {
            violations.push({ check: 'aria-reference-resolves', element: describe(element), detail: `${attribute}="${id}" resolves to nothing` });
          }
        }
      }
    });
    // table-has-header
    each('table', (table) => {
      const headers = table.querySelectorAll('th, [role="columnheader"], [role="rowheader"]');
      if (headers.length === 0) {
        violations.push({ check: 'table-has-header', element: describe(table), detail: 'table without header cells' });
      }
    });
    // named-navigation
    each('nav, [role="navigation"]', (element) => {
      if (accessibleName(element) === '') {
        violations.push({ check: 'named-navigation', element: describe(element), detail: 'navigation landmark without a name' });
      }
    });
    return { violations, checks, elementsChecked, view: viewName };
  }, view);
}

export function structuralViolations(
  audits: readonly StructuralAuditResult[],
  exemptions: Readonly<Record<string, StructuralExemption>>,
): StructuralFindings {
  const observed: StructuralViolation[] = audits.flatMap((audit) => audit.violations);
  const observedKeys = new Set(observed.map((violation) => `${violation.check}|${violation.element}`));
  const undeclared = observed.filter((violation) => !(`${violation.check}|${violation.element}` in exemptions));
  const stale = Object.keys(exemptions).filter((key) => !observedKeys.has(key)).sort();
  return {
    undeclared,
    stale,
    checks: [...new Set(audits.flatMap((audit) => audit.checks))].sort(),
    elementsChecked: audits.reduce((total, audit) => total + audit.elementsChecked, 0),
  };
}

// ---------------------------------------------------------------------------
// Keyboard tab-order walk.
// ---------------------------------------------------------------------------

export interface FocusableEntry {
  readonly index: number;
  readonly descriptor: string;
  readonly name: string;
  readonly signature: string;
  readonly pointerOnly: boolean;
}

export interface FocusInventory {
  readonly entries: readonly FocusableEntry[];
  readonly pointerOnly: readonly string[];
  /** Index of the currently focused element among the entries, or -1. */
  readonly activeIndex: number;
}

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'summary',
  'audio[controls]',
  'video[controls]',
  '[contenteditable="true"]',
  '[tabindex]',
].join(', ');

const POINTER_SELECTOR = [
  'a[href]',
  'button',
  'input:not([type="hidden"])',
  'select',
  'textarea',
  '[role="button"]',
  '[role="link"]',
  '[role="checkbox"]',
  '[role="radio"]',
  '[role="switch"]',
  '[role="tab"]',
  '[role="menuitem"]',
].join(', ');

export async function focusInventory(page: Page): Promise<FocusInventory> {
  return page.evaluate((selectors: { readonly focusable: string; readonly pointer: string }) => {
    const dom = globalThis as unknown as {
      document: DomDocument;
      getComputedStyle(element: unknown): DomStyle;
    };
    const FOCUSABLE = selectors.focusable;
    const POINTER = selectors.pointer;
    const classNames = (element: DomElement): string[] => {
      const names: string[] = [];
      for (let index = 0; index < element.classList.length; index += 1) {
        const name = element.classList.item(index);
        if (name !== null) names.push(name);
      }
      return names;
    };
    const describe = (element: DomElement): string => `${element.tagName.toLowerCase()}${classNames(element).map((name) => `.${name}`).join('')}`;
    const nameOf = (element: DomElement): string =>
      (element.getAttribute('aria-label') ?? element.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 60);
    const visible = (element: DomElement): boolean => {
      const style = dom.getComputedStyle(element);
      if (style.getPropertyValue('display') === 'none') return false;
      if (style.getPropertyValue('visibility') === 'hidden') return false;
      const rect = element.getBoundingClientRect();
      return rect.width > 0.5 && rect.height > 0.5;
    };
    const signatureOf = (element: DomElement): string => {
      const parts: string[] = [];
      const visit = (current: DomElement, depth: number): void => {
        const computed = dom.getComputedStyle(current);
        const entries: string[] = [];
        for (let index = 0; index < computed.length; index += 1) {
          const property = computed.item(index);
          entries.push(`${property}:${computed.getPropertyValue(property)}`);
        }
        parts.push(entries.join(';'));
        if (depth >= 1) return;
        const descendants = current.querySelectorAll('*');
        const limit = Math.min(descendants.length, 6);
        for (let index = 0; index < limit; index += 1) {
          const child = descendants.item(index);
          if (child !== null) visit(child, depth + 1);
        }
      };
      visit(element, 0);
      return parts.join('|');
    };
    const focusables: DomElement[] = [];
    const all = dom.document.querySelectorAll('*');
    for (let index = 0; index < all.length; index += 1) {
      const element = all.item(index);
      if (element === null) continue;
      if (!element.matches(FOCUSABLE)) continue;
      if (element.hasAttribute('disabled')) continue;
      // `[tabindex]` also matches -1 (programmatically focusable only), which
      // is never part of sequential tab order.
      if (element.tabIndex < 0) continue;
      if (!visible(element)) continue;
      focusables.push(element);
    }
    const compositeRoles = '[role="application"], [role="listbox"], [role="grid"], [role="tree"], [role="menu"], [role="tablist"], [role="radiogroup"]';
    const entries = focusables.map((element, index) => ({
      index,
      descriptor: describe(element),
      name: nameOf(element),
      signature: signatureOf(element),
      pointerOnly: false,
    }));
    const activeIndex = focusables.indexOf(dom.document.activeElement);
    const pointerOnly: string[] = [];
    const pointerCandidates = dom.document.querySelectorAll(POINTER);
    for (let index = 0; index < pointerCandidates.length; index += 1) {
      const element = pointerCandidates.item(index);
      if (element === null || element.hasAttribute('disabled')) continue;
      if (!visible(element)) continue;
      if (element.getAttribute('tabindex') !== null && Number(element.getAttribute('tabindex')) < 0) {
        // A negative-tabindex control is still keyboard-reachable when it is
        // a member of a focusable composite widget (the system map's nodes
        // inside its `role="application"` canvas are the one instance).
        const composite = element.closest(compositeRoles);
        const compositeFocusable = composite !== null && focusables.includes(composite);
        if (compositeFocusable) continue;
      }
      const tabbable = focusables.includes(element);
      if (!tabbable) {
        pointerOnly.push(describe(element));
      }
    }
    return { entries, pointerOnly, activeIndex };
  }, { focusable: FOCUSABLE_SELECTOR, pointer: POINTER_SELECTOR });
}

export interface ActiveFocus {
  readonly descriptor: string;
  readonly name: string;
  readonly tag: string;
  readonly focusVisible: boolean;
  readonly visible: boolean;
  readonly signature: string;
  readonly outline: string;
  readonly boxShadow: string;
}

export interface FocusProbe extends ActiveFocus {
  /** Position of the focused element among the sequential focusables, or -1. */
  readonly index: number;
}

/**
 * Read the focused element together with its exact sequential position. The
 * position is computed in the page against a freshly filtered focusable list,
 * so twenty buttons with identical accessible names cannot confuse the walk.
 */
export async function probeFocus(page: Page): Promise<FocusProbe | null> {
  return page.evaluate((focusableSelector: string) => {
    const dom = globalThis as unknown as {
      document: DomDocument;
      getComputedStyle(element: unknown): DomStyle;
    };
    const element = dom.document.activeElement;
    if (element === null) return null;
    const classNames = (target: DomElement): string[] => {
      const names: string[] = [];
      for (let index = 0; index < target.classList.length; index += 1) {
        const name = target.classList.item(index);
        if (name !== null) names.push(name);
      }
      return names;
    };
    const styleOf = (target: DomElement): string => {
      const computed = dom.getComputedStyle(target);
      const entries: string[] = [];
      for (let index = 0; index < computed.length; index += 1) {
        const property = computed.item(index);
        entries.push(`${property}:${computed.getPropertyValue(property)}`);
      }
      const descendants = target.querySelectorAll('*');
      const limit = Math.min(descendants.length, 6);
      for (let index = 0; index < limit; index += 1) {
        const child = descendants.item(index);
        if (child === null) continue;
        const childStyle = dom.getComputedStyle(child);
        for (let propertyIndex = 0; propertyIndex < childStyle.length; propertyIndex += 1) {
          const property = childStyle.item(propertyIndex);
          entries.push(`${property}:${childStyle.getPropertyValue(property)}`);
        }
      }
      return entries.join(';');
    };
    const focusables: DomElement[] = [];
    const all = dom.document.querySelectorAll('*');
    for (let index = 0; index < all.length; index += 1) {
      const candidate = all.item(index);
      if (candidate === null) continue;
      if (!candidate.matches(focusableSelector)) continue;
      if (candidate.hasAttribute('disabled')) continue;
      if (candidate.tabIndex < 0) continue;
      const style = dom.getComputedStyle(candidate);
      if (style.getPropertyValue('display') === 'none' || style.getPropertyValue('visibility') === 'hidden') continue;
      const rect = candidate.getBoundingClientRect();
      if (rect.width <= 0.5 || rect.height <= 0.5) continue;
      focusables.push(candidate);
    }
    const style = dom.getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return {
      descriptor: `${element.tagName.toLowerCase()}${classNames(element).map((name) => `.${name}`).join('')}`,
      name: (element.getAttribute('aria-label') ?? element.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 60),
      tag: element.tagName.toLowerCase(),
      focusVisible: element.matches(':focus-visible'),
      visible: rect.width > 0.5 && rect.height > 0.5,
      signature: styleOf(element),
      outline: `${style.getPropertyValue('outline-style')} ${style.getPropertyValue('outline-width')} ${style.getPropertyValue('outline-color')}`,
      boxShadow: style.getPropertyValue('box-shadow'),
      index: focusables.indexOf(element),
    };
  }, FOCUSABLE_SELECTOR);
}

export interface TabStep {
  readonly index: number;
  readonly descriptor: string;
  readonly name: string;
  readonly focusVisible: boolean;
  readonly visible: boolean;
  readonly indicatorChanged: boolean;
  readonly orderOk: boolean;
  readonly escaped: boolean;
}

export interface TabWalk {
  readonly steps: readonly TabStep[];
  readonly pointerOnly: readonly string[];
  readonly trap: string | null;
  readonly escaped: boolean;
  readonly orderViolation: string | null;
  readonly focusFailures: readonly string[];
  readonly direction: 'forward' | 'backward';
}

export interface TabWalkOptions {
  readonly limit?: number;
  readonly direction?: 'forward' | 'backward';
  readonly stopWhen?: (step: { readonly descriptor: string; readonly name: string }) => boolean;
}

/**
 * Drive a real Tab (or Shift+Tab) walk from the current focus.
 *
 * The inventory is captured once, in document order (which is tab order when
 * no positive tabindex exists; the structural audit separately forbids those).
 * Each keypress must land on the next inventory entry in the walked direction,
 * the focused element must be visible, `:focus-visible` must match, and its
 * computed style must differ from the unfocused signature captured at the
 * start, which is the visible-focus-indicator proof. A keypress that does not
 * move (or moves against the direction) is a trap/order violation; running off
 * the end focuses the document body and is the escape proof.
 */
export async function driveTabWalk(page: Page, options: TabWalkOptions = {}): Promise<TabWalk> {
  const limit = options.limit ?? 300;
  const direction = options.direction ?? 'forward';
  const step = direction === 'forward' ? 1 : -1;
  const key = direction === 'forward' ? 'Tab' : 'Shift+Tab';
  const inventory = await focusInventory(page);
  const steps: TabStep[] = [];
  const focusFailures: string[] = [];
  // Seed from the actual focused element where it is in the inventory, so
  // duplicate descriptors (twenty identical "Inspect" buttons) never desync
  // the expected index.
  let previousIndex = inventory.activeIndex;
  let anchored = previousIndex >= 0;
  let trap: string | null = null;
  let orderViolation: string | null = null;
  let escaped = false;
  const entryAt = (index: number): FocusableEntry | null =>
    index >= 0 && index < inventory.entries.length ? (inventory.entries[index] as FocusableEntry) : null;
  for (let stepIndex = 0; stepIndex < limit; stepIndex += 1) {
    await page.keyboard.press(key);
    const active = await probeFocus(page);
    if (active === null || active.tag === 'body' || active.tag === 'html') {
      escaped = true;
      steps.push({
        index: stepIndex,
        descriptor: active?.descriptor ?? 'document',
        name: active?.name ?? '',
        focusVisible: active?.focusVisible ?? false,
        visible: active?.visible ?? false,
        indicatorChanged: false,
        orderOk: previousIndex === (direction === 'forward' ? inventory.entries.length - 1 : 0),
        escaped: true,
      });
      break;
    }
    const index = active.index;
    const expected = anchored ? previousIndex + step : null;
    const entry = entryAt(index);
    const orderOk = !anchored || index === expected;
    if (!orderOk && index === previousIndex && trap === null) trap = active.descriptor;
    if (!orderOk && index !== previousIndex && orderViolation === null) {
      const skipped = expected === null ? null : entryAt(expected);
      orderViolation = `${active.descriptor} (inventory index ${index}, expected ${expected}`
        + `${skipped === null ? '' : ` = ${skipped.descriptor} "${skipped.name}"`}`
        + `${entryAt(previousIndex) === null ? '' : `; previous ${entryAt(previousIndex)?.descriptor} "${entryAt(previousIndex)?.name}"`})`;
    }
    const indicatorChanged = entry !== null && active.signature !== entry.signature;
    steps.push({
      index: stepIndex,
      descriptor: active.descriptor,
      name: active.name,
      focusVisible: active.focusVisible,
      visible: active.visible,
      indicatorChanged,
      orderOk,
      escaped: false,
    });
    if (index >= 0) { previousIndex = index; anchored = true; }
    if (!active.focusVisible) focusFailures.push(`${active.descriptor}: no :focus-visible`);
    if (!active.visible) focusFailures.push(`${active.descriptor}: focused but not rendered`);
    if (!indicatorChanged) focusFailures.push(`${active.descriptor}: no visible focus indicator`);
    if (options.stopWhen !== undefined && options.stopWhen({ descriptor: active.descriptor, name: active.name })) break;
  }
  return { steps, pointerOnly: inventory.pointerOnly, trap, escaped, orderViolation, focusFailures, direction };
}

// ---------------------------------------------------------------------------
// Small DOM structural types. The root TS program has no DOM lib.
// ---------------------------------------------------------------------------

interface DomClassList {
  readonly length: number;
  item(index: number): string | null;
  contains(name: string): boolean;
}

interface DomStyle {
  readonly length: number;
  item(index: number): string;
  getPropertyValue(property: string): string;
}

interface DomNode {
  readonly nodeType: number;
  readonly nodeValue: string | null;
  readonly textContent: string | null;
}

interface DomNodeList {
  readonly length: number;
  item(index: number): DomElement | null;
}

interface DomNodeListNode {
  readonly length: number;
  item(index: number): DomNode | null;
}

interface DomRect {
  readonly width: number;
  readonly height: number;
}

interface DomElement {
  readonly tagName: string;
  readonly id: string;
  readonly tabIndex: number;
  readonly classList: DomClassList;
  readonly childNodes: DomNodeListNode;
  readonly parentElement: DomElement | null;
  readonly textContent: string | null;
  getAttribute(name: string): string | null;
  hasAttribute(name: string): boolean;
  matches(selector: string): boolean;
  closest(selector: string): DomElement | null;
  querySelectorAll(selector: string): DomNodeList;
  querySelector(selector: string): DomElement | null;
  getBoundingClientRect(): DomRect;
  focus(): void;
}

interface DomDocument {
  readonly title: string;
  readonly activeElement: DomElement;
  readonly documentElement: DomElement;
  readonly body: DomElement;
  querySelectorAll(selector: string): DomNodeList;
  querySelector(selector: string): DomElement | null;
  getElementById(id: string): DomElement | null;
}
