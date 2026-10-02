// @ts-check

import typescript from 'typescript';

/**
 * R5-02 / review-5 task A2.1 — the rename-blind name-listing TOTALITY rule.
 *
 * Git's rename detection (on by default for `git diff`/`git log`, via
 * `diff.renames`) reports a moved file as ONE entry at its destination, so a
 * name listing that feeds a classification or a deletion check cannot see the
 * source disappear. Every name listing therefore passes `--no-renames`: a
 * `git mv` of a tracked source is a deletion plus an addition. The review found
 * the declared-deletion gate without it while D-150 CLAIMED a totality rule that
 * was only two text anchors; this rule is the real one.
 *
 * The scan is syntactic (parsed, not regex-over-lines): EVERY string literal
 * that is a name-listing flag must sit inside an argument-vector array literal
 * that also holds `--no-renames`; a flag appearing anywhere else (a `push`, an
 * alias constant, a concatenation) is itself a violation, because the rule
 * cannot prove its argv; shell-string commands are checked the same way. The one
 * deliberate exception is a rename-AWARE listing that names `--find-renames`
 * explicitly and is declared below with its reason.
 */
const NAME_LISTING_FLAG_RE = /^--(?:name-only|name-status|raw|numstat|diff-filter=.*)$/;
const SHELL_LISTING_RE = /\bgit\b[^\n]*\b(?:diff|diff-tree|log|show)\b[^\n]*--(?:name-only|name-status|raw|numstat|diff-filter)/;
const RENAME_AWARE_FLAGS = new Set(['--find-renames', '--find-copies']);

/** @type {Readonly<Record<string, string>>} file -> why a rename-aware listing is intended there */
export const RENAME_AWARE_LISTINGS = Object.freeze({
  'src/core/changeIntelligence/git.ts': 'change intelligence reads --name-status --find-renames deliberately to attribute a moved file to its source; it feeds no classification or deletion check',
});

/**
 * @param {typescript.Node} node
 * @returns {string | null} the literal text of a string-like node, else null
 */
function literalText(node) {
  return typescript.isStringLiteral(node) || typescript.isNoSubstitutionTemplateLiteral(node) ? node.text : null;
}

/**
 * Pure scanner (exported for the unit tests and the rule's own self-test).
 * @param {string} sourceText
 * @param {string} fileName
 * @param {Partial<{ renameAware: boolean }>} [options]
 * @returns {{ violations: Array<{ line: number, detail: string }>, listings: number, renameAwareListings: number }}
 */
export function scanRenameBlindListings(sourceText, fileName, options = {}) {
  const kind = fileName.endsWith('.ts') ? typescript.ScriptKind.TS : typescript.ScriptKind.JS;
  const sourceFile = typescript.createSourceFile(fileName, sourceText, typescript.ScriptTarget.Latest, true, kind);
  /** @type {Array<{ line: number, detail: string }>} */
  const violations = [];
  let listings = 0;
  let renameAwareListings = 0;
  /** @param {typescript.Node} node */
  const lineOf = (node) => sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
  /** @param {typescript.Node} node */
  const visit = (node) => {
    const text = literalText(node);
    if (text !== null && NAME_LISTING_FLAG_RE.test(text)) {
      listings += 1;
      const parent = node.parent;
      if (!typescript.isArrayLiteralExpression(parent)) {
        violations.push({ line: lineOf(node), detail: `the name-listing flag ${text} is not an element of a literal argv array, so --no-renames cannot be proven beside it` });
      } else {
        const siblings = parent.elements.map(literalText).filter((entry) => entry !== null);
        if (siblings.includes('--no-renames')) {
          // proven
        } else if (options.renameAware === true && siblings.some((entry) => RENAME_AWARE_FLAGS.has(String(entry)))) {
          renameAwareListings += 1;
        } else {
          violations.push({ line: lineOf(node), detail: `the name listing (${text}) carries no --no-renames, so a rename hides the deleted source` });
        }
      }
    } else if (text !== null && SHELL_LISTING_RE.test(text) && !text.includes('--no-renames')) {
      listings += 1;
      violations.push({ line: lineOf(node), detail: 'a shell-string git name listing carries no --no-renames' });
    }
    typescript.forEachChild(node, visit);
  };
  visit(sourceFile);
  return { violations, listings, renameAwareListings };
}

/** Known-bad and known-good shapes the scanner must classify exactly (a stubbed scanner fails these). */
export const RENAME_SCAN_SELF_TEST = Object.freeze([
  { name: 'bare listing', code: "run(['diff', '--name-only', base]);", expect: 1 },
  { name: 'deletion filter without the flag', code: "git(root, ['diff', '--diff-filter=D', '--name-only', base]);", expect: 2 },
  { name: 'proven listing', code: "run(['diff', '--name-only', '--no-renames', base]);", expect: 0 },
  { name: 'spread plus listing', code: "run(['diff', ...extra, '--name-status']);", expect: 1 },
  { name: 'push of the flag', code: "const args = ['diff', '--no-renames']; args.push('--name-only');", expect: 1 },
  { name: 'alias constant', code: "const FLAG = '--name-only'; run(['diff', FLAG, '--no-renames']);", expect: 1 },
  { name: 'shell string', code: "execSync('git diff --name-only HEAD~1');", expect: 1 },
  { name: 'proven shell string', code: "execSync('git diff --name-only --no-renames HEAD~1');", expect: 0 },
  { name: 'non-listing diff', code: "run(['diff', '--check']);", expect: 0 },
]);

