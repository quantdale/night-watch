import type { Page } from '@playwright/test';

/**
 * Group 8.1-8.4 — whole-stylesheet selector reachability.
 *
 * The existing stylesheet guards run one way only: every rendered class must
 * have a rule. The reverse — every rule must have a class that can produce it
 * — is unguarded, and four dead `.map-node.node-*` rules survived until they
 * were found by hand. A rule no selector can match is dead code in the built
 * bundle.
 *
 * The check extracts every selector from the BUILT stylesheet (through the
 * browser's own CSSOM, not a hand-rolled parser), then accumulates the
 * selectors that match at least one element across the qualification walk.
 * Every extracted selector must match, be covered by a declared state
 * exemption, or appear in the reasoned unreachable list. The list fails in
 * both directions: a listed selector that becomes reachable (or that no
 * longer exists) is stale, and an unlisted unreachable selector is
 * undeclared.
 */

export interface StylesheetSelector {
  readonly selector: string;
  /** Media conditions the selector appears under; empty for a top-level rule. */
  readonly media: readonly string[];
}

/**
 * Stateful pseudo-classes and pseudo-elements the sweep cannot hold or enter.
 * Each is declared BY NAME with its reason; a selector that only matches
 * after one of these is stripped is covered by the declaration rather than
 * silently skipped. Structural pseudo-classes (`:not`, `:disabled`,
 * `:first-child`, ...) are matchable by `querySelectorAll` and are not here.
 */
export const PSEUDO_STATE_EXEMPTIONS: Readonly<Record<string, string>> = Object.freeze({
  ':hover': 'a hovered state cannot be held across a sweep that parks the pointer before comparing computed styles',
  ':focus-visible': 'keyboard focus is transient in the walk; the rule is covered by stripping the token and matching its base selector',
  ':focus': 'focus is transient in the walk; the rule is covered by stripping the token and matching its base selector',
  ':active': 'a pointer-held active state cannot be held across the computed-style walk',
  '::placeholder': 'pseudo-element text cannot be selected by querySelectorAll; the originating input is matched instead',
  '::before': 'pseudo-elements cannot be selected by querySelectorAll; the originating element is matched instead',
  '::after': 'pseudo-elements cannot be selected by querySelectorAll; the originating element is matched instead',
});

/**
 * Media conditions the sweep cannot legitimately enter, declared BY NAME
 * with the reason. `print` is not present in the stylesheet today; when it
 * is added it must be declared here, exactly as `prefers-reduced-motion` is.
 * A declaration that no selector carries is stale and fails.
 */
export const MEDIA_EXEMPTIONS: Readonly<Record<string, string>> = Object.freeze({
  '(prefers-reduced-motion: reduce)': 'the lane does not emulate a reduced-motion reader; every selector under it is otherwise reachable and the rule only shortens animation durations',
});

/**
 * Selectors that genuinely cannot be produced by the qualification
 * composition, each with the surface that does exercise it. The list fails in
 * BOTH directions: an unlisted unreachable selector fails, and a listed
 * selector that becomes reachable (or disappears from the stylesheet) is
 * stale and must be removed.
 */
export const UNREACHABLE_SELECTORS: Readonly<Record<string, string>> = Object.freeze({
  // Crash boundary. It renders only when a component throws; a rendering
  // error boundary is a failure, not a composition state the walk can enter.
  '.crash-screen': 'rendered only by the ControlCenterErrorBoundary, which the qualification walk must not trigger',
  '.crash-mark': 'rendered only by the ControlCenterErrorBoundary crash screen',
  '.crash-screen h1': 'rendered only by the ControlCenterErrorBoundary crash screen',
  '.crash-screen .button': 'rendered only by the ControlCenterErrorBoundary crash screen',
  '.muted-copy': 'crash-screen copy; the error boundary is not a walk state',
  // Loading and error fallbacks. The walk waits for ready content; the
  // failure path is driven in the built bundle by the F-18 error harness in
  // this same suite file.
  '.loader': 'loading is transient; the qualification walk waits for ready content',
  '.state-panel': 'loading/error fallback panel; the walk waits for ready content',
  '.state-panel strong': 'loading/error fallback panel; the walk waits for ready content',
  '.state-panel p': 'loading/error fallback panel; the walk waits for ready content',
  '.state-panel-error': 'per-source failure fallback; the F-18 harness drives the failure path',
  '.state-icon': 'per-source failure fallback; the F-18 harness drives the failure path',
  '.button-secondary': 'the retry control on a loading/error fallback; the F-18 harness drives the failure path',
  '.button-primary': 'the crash-screen return control; the error boundary is not a walk state',
  '.button-primary:hover': 'the crash-screen return control; the error boundary is not a walk state',
  // Bounded-empty surfaces the walk's fixtures never produce.
  '.empty-table': 'rendered only when the bounded runs page is empty; the qualification composition serves one run',
  '.empty-table .empty-mark': 'the empty-runs table fallback; the qualification composition serves one run',
  '.empty-table h2': 'the empty-runs table fallback; the qualification composition serves one run',
  '.empty-table p': 'the empty-runs table fallback; the qualification composition serves one run',
  // Tone families whose state is not in this composition. The classes are
  // still exercised through the concrete-family assertions in
  // ui/control-center/src/styles.test.ts, and the class-effect sweep covers
  // the tones this composition does render.
  '.stage-warning': 'the synthetic coverage matrix reports no warning stage',
  '.stage-blocked': 'the synthetic coverage matrix reports no blocked stage',
  '.text-blocked': 'no status in the synthetic composition tones a text carrier blocked',
  '.code-chip-neutral': 'rendered only when the readiness compared-key set is non-empty; the synthetic readiness contract reports none',
  '.code-chip-ready': 'no composition surface renders CodeChips with a ready tone',
  // Reviewer write controls. The qualification composition is read-only;
  // tests/browser/reviewPersistence.browser.ts drives the write surface.
  '.review-rationale': 'owner review decision control; disabled in the read-only qualification composition and exercised by reviewPersistence.browser.ts',
  '.review-actions': 'owner review decision controls; disabled in the read-only qualification composition and exercised by reviewPersistence.browser.ts',
  '.review-action': 'owner review decision control; disabled in the read-only qualification composition and exercised by reviewPersistence.browser.ts',
  '.review-action:disabled': 'owner review decision control; disabled in the read-only qualification composition and exercised by reviewPersistence.browser.ts',
  '.review-outcome-ok': 'owner review outcome label; exercised by reviewPersistence.browser.ts',
  '.review-outcome-warn': 'owner review outcome label; exercised by reviewPersistence.browser.ts and by the paginated-continuation failure state',
  '.visually-hidden': 'the rationale label exists only with the owner review decision control',
});

/** Stateful tokens whose absence from the declarations is named explicitly. */
const KNOWN_PSEUDO_TOKENS = Object.freeze([
  ':hover', ':focus-visible', ':focus', ':active', ':visited', ':target',
  '::placeholder', '::before', '::after',
]);

export interface SelectorMatchResult {
  readonly matched: readonly string[];
  readonly strippedMatched: Readonly<Record<string, string>>;
  readonly errors: readonly string[];
}

interface DomCssRule {
  readonly type: number;
  readonly selectorText?: string;
  readonly conditionText?: string;
  readonly cssRules?: { readonly length: number; item(index: number): DomCssRule | null };
}
interface DomStyleSheet {
  readonly href: string | null;
  readonly cssRules: { readonly length: number; item(index: number): DomCssRule | null };
}
interface DomStylesheetRoot {
  readonly document: {
    readonly styleSheets: { readonly length: number; item(index: number): DomStyleSheet | null };
    querySelectorAll(selector: string): { readonly length: number };
  };
}

/**
 * Every distinct selector in the page's same-origin stylesheets, with the
 * media conditions each appears under. Uses the browser's CSS parser so
 * grouped selectors, media blocks and at-rules behave exactly as they ship.
 */
export async function collectStylesheetSelectors(page: Page): Promise<readonly StylesheetSelector[]> {
  return page.evaluate(() => {
    const dom = globalThis as unknown as DomStylesheetRoot;
    const collected = new Map<string, Set<string>>();
    const splitSelectors = (text: string): string[] => {
      const parts: string[] = [];
      let depth = 0;
      let current = '';
      for (const character of text) {
        if (character === '(' || character === '[') depth += 1;
        if (character === ')' || character === ']') depth = Math.max(0, depth - 1);
        if (character === ',' && depth === 0) {
          if (current.trim().length > 0) parts.push(current.trim());
          current = '';
          continue;
        }
        current += character;
      }
      if (current.trim().length > 0) parts.push(current.trim());
      return parts;
    };
    const walk = (rules: { readonly length: number; item(index: number): DomCssRule | null }, media: readonly string[]): void => {
      for (let index = 0; index < rules.length; index += 1) {
        const rule = rules.item(index);
        if (rule === null) continue;
        if (typeof rule.selectorText === 'string') {
          for (const selector of splitSelectors(rule.selectorText)) {
            const conditions = collected.get(selector) ?? new Set<string>();
            for (const condition of media) conditions.add(condition);
            collected.set(selector, conditions);
          }
          continue;
        }
        if (typeof rule.conditionText === 'string' && rule.cssRules !== undefined) {
          const condition = rule.conditionText.replace(/\s*:\s*/g, ': ').replace(/\s+/g, ' ').trim();
          walk(rule.cssRules, [...media, condition]);
        }
      }
    };
    const sheets = dom.document.styleSheets;
    for (let index = 0; index < sheets.length; index += 1) {
      const sheet = sheets.item(index);
      if (sheet === null) continue;
      try {
        walk(sheet.cssRules, []);
      } catch {
        // A cross-origin or otherwise unreadable sheet is not part of the
        // built bundle; the built stylesheet is same-origin by construction.
      }
    }
    return [...collected.entries()]
      .map(([selector, conditions]) => ({ selector, media: [...conditions].sort() }))
      .sort((left, right) => left.selector.localeCompare(right.selector));
  });
}

/**
 * Match the selectors against the live composition. A full match is used
 * where it exists; otherwise each declared stateful token is stripped
 * (longest token first) and the base selector is tried, which is how a rule
 * like `.chip:hover:not(:disabled)` is proven reachable without holding a
 * hover.
 */
export async function matchStylesheetSelectors(
  page: Page,
  selectors: readonly string[],
  pseudoTokens: readonly string[],
): Promise<SelectorMatchResult> {
  return page.evaluate(({ selectors: candidates, pseudoTokens: tokens }) => {
    const dom = globalThis as unknown as DomStylesheetRoot;
    const orderedTokens = [...tokens].sort((left, right) => right.length - left.length);
    const matched: string[] = [];
    const strippedMatched: Record<string, string> = {};
    const errors: string[] = [];
    for (const selector of candidates) {
      try {
        if (dom.document.querySelectorAll(selector).length > 0) {
          matched.push(selector);
          continue;
        }
      } catch (error) {
        errors.push(`${selector}: ${error instanceof Error ? error.message : String(error)}`);
        continue;
      }
      let reduced = selector;
      for (const token of orderedTokens) reduced = reduced.split(token).join('');
      reduced = reduced.trim();
      if (reduced.length === 0 || reduced === selector) continue;
      try {
        if (dom.document.querySelectorAll(reduced).length > 0) strippedMatched[selector] = reduced;
      } catch {
        // The stripped selector is malformed; the full-selector failure above
        // already reports the rule, and the evaluator will name it.
      }
    }
    return { matched, strippedMatched, errors };
  }, { selectors: [...selectors], pseudoTokens: [...pseudoTokens] });
}

/**
 * Replace one live rule's selector in the page's CSSOM, reversibly. Used for
 * the mutation proof: a live rule's selector is altered so nothing matches,
 * and the reachability evaluation must report it.
 */
export async function replaceStylesheetSelector(page: Page, from: string, to: string): Promise<boolean> {
  return page.evaluate(({ from: source, to: target }) => {
    const dom = globalThis as unknown as DomStylesheetRoot;
    const visit = (rules: { readonly length: number; item(index: number): DomCssRule | null }): boolean => {
      for (let index = 0; index < rules.length; index += 1) {
        const rule = rules.item(index);
        if (rule === null) continue;
        if (rule.selectorText === source) {
          (rule as { selectorText: string }).selectorText = target;
          return true;
        }
        if (rule.cssRules !== undefined && visit(rule.cssRules)) return true;
      }
      return false;
    };
    const sheets = dom.document.styleSheets;
    for (let index = 0; index < sheets.length; index += 1) {
      const sheet = sheets.item(index);
      if (sheet === null) continue;
      try {
        if (visit(sheet.cssRules)) return true;
      } catch {
        // Unreadable sheet; the built bundle is same-origin.
      }
    }
    return false;
  }, { from, to });
}

export interface ReachabilityInput {
  readonly selectors: readonly StylesheetSelector[];
  readonly matched: readonly string[];
  readonly strippedMatched: readonly string[];
  readonly pseudoDeclarations: Readonly<Record<string, string>>;
  readonly mediaDeclarations: Readonly<Record<string, string>>;
  readonly unreachable: Readonly<Record<string, string>>;
}

export interface ReachabilityReport {
  readonly selectorCount: number;
  readonly reachable: number;
  readonly joinedByPseudo: number;
  readonly joinedByMedia: number;
  readonly listedUnreachable: number;
  readonly undeclared: readonly string[];
  readonly staleListings: readonly string[];
  readonly undeclaredPseudo: readonly string[];
  readonly undeclaredMedia: readonly string[];
  readonly staleDeclarations: readonly string[];
}

function declared(table: Readonly<Record<string, string>>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(table, key);
}

/**
 * The pure judgement. `selectors` is what the built stylesheet declares;
 * `matched`/`strippedMatched` are what the qualification walk observed. The
 * report names dead-but-unlisted selectors (`undeclared`), unreachable-list
 * entries that are no longer true (`staleListings`), exemption names that are
 * absent or surplus, and media conditions a dead selector carries.
 */
export function evaluateStylesheetReachability(input: ReachabilityInput): ReachabilityReport {
  const matched = new Set(input.matched);
  const stripped = new Set(input.strippedMatched);
  const declaredUnreachable = new Set(Object.keys(input.unreachable));
  const seen = new Set<string>();
  const undeclared: string[] = [];
  const undeclaredPseudo = new Set<string>();
  const undeclaredMedia = new Set<string>();
  let reachable = 0;
  let joinedByPseudo = 0;
  let joinedByMedia = 0;

  for (const entry of input.selectors) {
    if (seen.has(entry.selector)) continue;
    seen.add(entry.selector);
    if (matched.has(entry.selector)) { reachable += 1; continue; }
    if (stripped.has(entry.selector)) { joinedByPseudo += 1; continue; }
    if (entry.media.some((condition) => declared(input.mediaDeclarations, condition))) { joinedByMedia += 1; continue; }
    if (declaredUnreachable.has(entry.selector)) continue;
    undeclared.push(entry.selector);
    for (const token of KNOWN_PSEUDO_TOKENS) {
      if (entry.selector.includes(token) && !declared(input.pseudoDeclarations, token)) undeclaredPseudo.add(token);
    }
    for (const condition of entry.media) {
      if (!declared(input.mediaDeclarations, condition)) undeclaredMedia.add(condition);
    }
  }

  const staleListings = Object.keys(input.unreachable).filter((selector) => {
    if (!seen.has(selector)) return true;
    if (matched.has(selector) || stripped.has(selector)) return true;
    const entry = input.selectors.find((candidate) => candidate.selector === selector);
    if (entry !== undefined && entry.media.some((condition) => declared(input.mediaDeclarations, condition))) return true;
    return false;
  });

  const allMedia = new Set<string>();
  for (const entry of input.selectors) for (const condition of entry.media) allMedia.add(condition);
  const allText = [...seen, ...allMedia].join(',');
  const staleDeclarations = [...Object.keys(input.pseudoDeclarations), ...Object.keys(input.mediaDeclarations)]
    .filter((token) => !allText.includes(token));

  return {
    selectorCount: seen.size,
    reachable,
    joinedByPseudo,
    joinedByMedia,
    listedUnreachable: declaredUnreachable.size,
    undeclared: undeclared.sort(),
    staleListings: staleListings.sort(),
    undeclaredPseudo: [...undeclaredPseudo].sort(),
    undeclaredMedia: [...undeclaredMedia].sort(),
    staleDeclarations: staleDeclarations.sort(),
  };
}
