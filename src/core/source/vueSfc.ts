// ---------------------------------------------------------------------------
// Nightwatch C-04 — bounded Vue SFC `<script>` extraction.
//
// A Single File Component is not JavaScript, so the script has to be lifted
// out before any JS rule sees the file. Everything outside the script blocks —
// the template markup and the styles — is discarded here and is therefore
// invisible downstream, which is what stops a call-looking attribute in
// markup from becoming an edge.
//
// Deliberately NOT `@vue/compiler-sfc`. What this campaign needs from an SFC
// is the text between two tags; a compiler would add a large dependency and a
// template AST with no use here, and the repository's policy is to prefer the
// tooling already present.
//
// Data-in / data-out. No filesystem, process, or network authority.
// ---------------------------------------------------------------------------

export const VUE_SFC_VERSION = 'nightwatch.vue-sfc-extract.v1' as const;

export const VUE_SFC_MAX_BYTES = 2_000_000;
export const VUE_SFC_MAX_BLOCKS = 8;

export const VUE_SFC_STATES = ['COMPLETE', 'UNTERMINATED_SCRIPT', 'BYTE_BUDGET_EXHAUSTED', 'BLOCK_CEILING_REACHED'] as const;
export type VueSfcState = (typeof VUE_SFC_STATES)[number];

export interface VueScriptBlock {
  readonly content: string;
  /** `setup`, `lang="ts"` and friends, kept as raw attribute text for
   * classification only; never interpreted. */
  readonly attributes: string;
}

export interface VueSfcExtraction {
  readonly schemaVersion: typeof VUE_SFC_VERSION;
  readonly state: VueSfcState;
  readonly blocks: readonly VueScriptBlock[];
}

const OPEN = '<script';
const CLOSE = '</script';

/** Extract every `<script>` block. Bounded by byte count and block count, and
 * an unterminated block fails closed rather than yielding the rest of the file
 * as if it were script. */
export function extractVueScripts(sourceText: string): VueSfcExtraction {
  if (sourceText.length > VUE_SFC_MAX_BYTES) {
    return { schemaVersion: VUE_SFC_VERSION, state: 'BYTE_BUDGET_EXHAUSTED', blocks: [] };
  }

  const blocks: VueScriptBlock[] = [];
  let index = 0;
  while (index < sourceText.length) {
    const open = sourceText.indexOf(OPEN, index);
    if (open === -1) break;
    const openEnd = sourceText.indexOf('>', open);
    if (openEnd === -1) return { schemaVersion: VUE_SFC_VERSION, state: 'UNTERMINATED_SCRIPT', blocks: [] };
    const attributes = sourceText.slice(open + OPEN.length, openEnd);
    // `<scriptFoo>` is not a script block.
    if (attributes.length > 0 && /^[A-Za-z0-9_-]/.test(attributes)) {
      index = openEnd + 1;
      continue;
    }
    // A self-closing `<script src="…"/>` carries no body to read.
    if (attributes.trimEnd().endsWith('/')) {
      index = openEnd + 1;
      continue;
    }
    const close = sourceText.indexOf(CLOSE, openEnd);
    if (close === -1) return { schemaVersion: VUE_SFC_VERSION, state: 'UNTERMINATED_SCRIPT', blocks: [] };
    if (blocks.length >= VUE_SFC_MAX_BLOCKS) {
      return { schemaVersion: VUE_SFC_VERSION, state: 'BLOCK_CEILING_REACHED', blocks };
    }
    blocks.push({ content: sourceText.slice(openEnd + 1, close), attributes: attributes.trim() });
    index = close + CLOSE.length;
  }

  return { schemaVersion: VUE_SFC_VERSION, state: 'COMPLETE', blocks };
}
