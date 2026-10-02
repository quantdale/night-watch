// @ts-check
// R5-08 / review-5 task A6.2 — the structure of an operator-CLI entry point, by AST.
//
// The 10.3 shared-parser rule asked `/cli\.stop/.test(code)` of the WHOLE file: a
// comment, a string or a dead branch satisfied it. This analysis parses the entry
// and answers the three structural questions the rule needs, about SYNTAX:
//   1. does it call `defineOperatorCli(...)`, and with its own `CLI_METADATA`?
//   2. is the dispatcher gated on the parser's `.stop` result — i.e. does a `.stop`
//      read of the parser's return value reach an `if` / conditional / logical
//      condition (directly, or through a variable the condition uses)?
//   3. is it a DECLARATION-ONLY entry (the parser call itself sits behind a
//      direct-invocation check on `process.argv[1]`)?
// The behavioural half (no module effect under --help / --print-metadata / an
// unknown flag) is proved by running every bin in a scratch repository
// (tests/unit/operatorCliHelpSweep.test.ts) and by the registered mutants.
// Pure: no filesystem, process or network authority.

import typescript from 'typescript';

/**
 * @typedef {object} OperatorCliStructure
 * @property {boolean} callsDefine the entry calls defineOperatorCli(...)
 * @property {boolean} passesOwnMetadata the first argument is the identifier CLI_METADATA
 * @property {boolean} stopGated a `.stop` read of the parser result reaches a condition
 * @property {boolean} declarationOnly the parser call sits behind a process.argv[1] check
 */

/** @param {typescript.Node} node @returns {typescript.Node} */
function strip(node) {
  let current = node;
  while (typescript.isParenthesizedExpression(current) || typescript.isAwaitExpression(current) || typescript.isAsExpression(current)) current = current.expression;
  return current;
}

/** @param {typescript.Node} node @param {(candidate: typescript.Node) => boolean} predicate */
function contains(node, predicate) {
  let found = false;
  /** @param {typescript.Node} candidate */
  const visit = (candidate) => {
    if (found) return;
    if (predicate(candidate)) { found = true; return; }
    typescript.forEachChild(candidate, visit);
  };
  visit(node);
  return found;
}

/**
 * @param {string} code
 * @param {string} [fileName]
 * @returns {OperatorCliStructure}
 */
export function analyzeOperatorCliStructure(code, fileName = 'entry.mjs') {
  const sourceFile = typescript.createSourceFile(fileName, code, typescript.ScriptTarget.Latest, true, typescript.ScriptKind.JS);
  /** @type {typescript.CallExpression[]} */
  const defineCalls = [];
  /** @param {typescript.Node} node */
  const collect = (node) => {
    if (typescript.isCallExpression(node) && typescript.isIdentifier(node.expression) && node.expression.text === 'defineOperatorCli') defineCalls.push(node);
    typescript.forEachChild(node, collect);
  };
  collect(sourceFile);
  const callsDefine = defineCalls.length > 0;
  const passesOwnMetadata = defineCalls.some((call) => call.arguments[0] !== undefined && typescript.isIdentifier(call.arguments[0]) && call.arguments[0].text === 'CLI_METADATA');

  // The names the parser's result is bound to, and the calls themselves.
  /** @type {Set<string>} */
  const cliNames = new Set();
  for (const call of defineCalls) {
    let parent = call.parent;
    // The bound result may sit behind a direct-invocation conditional or a `??`/`||` default.
    while (typescript.isParenthesizedExpression(parent) || typescript.isAwaitExpression(parent) || typescript.isConditionalExpression(parent) || typescript.isBinaryExpression(parent)) parent = parent.parent;
    if (typescript.isVariableDeclaration(parent) && typescript.isIdentifier(parent.name)) cliNames.add(parent.name.text);
  }
  /** @param {typescript.Node} node */
  const isStopRead = (node) => {
    if (!typescript.isPropertyAccessExpression(node) || node.name.text !== 'stop') return false;
    const base = strip(node.expression);
    if (typescript.isIdentifier(base)) return cliNames.has(base.text);
    return typescript.isCallExpression(base) && defineCalls.includes(base);
  };
  /** Identifiers a condition reads. @param {typescript.Node} node @returns {Set<string>} */
  const identifiersIn = (node) => {
    /** @type {Set<string>} */
    const names = new Set();
    /** @param {typescript.Node} candidate */
    const visit = (candidate) => {
      if (typescript.isIdentifier(candidate)) names.add(candidate.text);
      typescript.forEachChild(candidate, visit);
    };
    visit(node);
    return names;
  };
  /** The condition expressions of every if / conditional / logical short-circuit. */
  /** @type {typescript.Node[]} */
  const conditions = [];
  /** @param {typescript.Node} node */
  const gather = (node) => {
    if (typescript.isIfStatement(node)) conditions.push(node.expression);
    else if (typescript.isConditionalExpression(node)) conditions.push(node.condition);
    else if (typescript.isBinaryExpression(node) && (node.operatorToken.kind === typescript.SyntaxKind.AmpersandAmpersandToken || node.operatorToken.kind === typescript.SyntaxKind.BarBarToken)) conditions.push(node.left);
    typescript.forEachChild(node, gather);
  };
  gather(sourceFile);
  const conditionNames = new Set(conditions.flatMap((condition) => [...identifiersIn(condition)]));
  let stopGated = false;
  /** @param {typescript.Node} node */
  const findStop = (node) => {
    if (stopGated) return;
    if (isStopRead(node)) {
      // (a) the read sits inside a condition itself;
      let cursor = node.parent;
      while (cursor !== undefined && !typescript.isSourceFile(cursor)) {
        if (conditions.includes(cursor)) { stopGated = true; return; }
        if (typescript.isVariableDeclaration(cursor) && typescript.isIdentifier(cursor.name) && conditionNames.has(cursor.name.text)) { stopGated = true; return; }
        cursor = cursor.parent;
      }
      // (b) a condition contains the read directly (an `if (cli.stop)` / `!cli.stop &&`).
      if (conditions.some((condition) => contains(condition, (candidate) => candidate === node))) stopGated = true;
    }
    typescript.forEachChild(node, findStop);
  };
  findStop(sourceFile);
  const declarationOnly = defineCalls.some((call) => {
    let cursor = call.parent;
    while (cursor !== undefined && !typescript.isSourceFile(cursor)) {
      if (typescript.isIfStatement(cursor) && contains(cursor.expression, (candidate) => typescript.isElementAccessExpression(candidate)
        && typescript.isPropertyAccessExpression(candidate.expression) && candidate.expression.name.text === 'argv'
        && typescript.isNumericLiteral(candidate.argumentExpression) && candidate.argumentExpression.text === '1')) return true;
      cursor = cursor.parent;
    }
    return false;
  });
  return { callsDefine, passesOwnMetadata, stopGated, declarationOnly };
}
