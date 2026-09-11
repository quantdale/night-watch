// Nightwatch — CLI-to-implementation contract analysis (pure judgement).
//
// This module is the structural authority for the boundary between a
// `bin/*.mjs` entry point and the TypeScript implementation it reaches through
// `bin/lib/typescript-runtime-loader.mjs`. It performs NO filesystem, Git,
// child-process, network, clock or environment access: the caller supplies the
// bin sources, a read callback, an existence callback, and the on-disk loader
// declaration text. That keeps every judgement deterministic and unit-testable.
//
// The measured baseline (F-15): 62 entry points, 53 distinct loader-passed
// module paths, and 199 distinct `src/**`/`corpus/**` `.ts` string literals in
// bin sources. The specification's "198 distinct paths" and "82 call sites"
// were textual measurements that counted wrapper declarations; this module
// counts *effective* call sites — the calls that actually hand a path to the
// loader, after a one-level wrapper (for example a per-bin `{ root }` binder)
// forwards its parameter.
//
// Findings are data. The hardening rule renders them; the unit tests
// negative-probe them.

import typescript from 'typescript';

export const CLI_IMPLEMENTATION_CONTRACT_SCHEMA = 'nightwatch.cli-implementation-contract.v1';

const LITERAL_TS_PATH_PATTERN = /['"]((?:src|corpus)\/[A-Za-z0-9_./-]+\.ts)['"]/g;

/**
 * @typedef {{ file: string, source: string }} ContractSourceFile
 * @typedef {{ path: string, symbols: string[] | null, unsupported: string | null }} LoaderBinding
 * @typedef {{
 *   file: string,
 *   line: number,
 *   callee: string,
 *   kind: 'SINGLE' | 'LIST',
 *   expression: string,
 *   bindings: LoaderBinding[],
 * }} LoaderCallSite
 * @typedef {{ code: string, detail: string }} ContractFinding
 * @typedef {{ readSource: (relativePath: string) => string | null, fileExists: (relativePath: string) => boolean }} ContractAccess
 */

/** @param {string} value */
function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** @param {string} value */
function isStringLiteralLike(value) {
  return typescript.isStringLiteral(value) || typescript.isNoSubstitutionTemplateLiteral(value);
}

/**
 * Parse one source file as JavaScript. `setParentNodes` is required because
 * binding/scope analysis walks parents.
 * @param {ContractSourceFile} file
 */
function parse(file) {
  return typescript.createSourceFile(file.file, file.source, typescript.ScriptTarget.Latest, true, typescript.ScriptKind.JS);
}

/**
 * Discover which local names refer to the runtime loader, and which local
 * functions forward a parameter into it. A wrapper exists so bins that want a
 * fixed `{ root }` do not repeat it at every call site; a wrapper body is not
 * itself an effective call site, but every caller of the wrapper is.
 * @param {typescript.SourceFile} sourceFile
 */
function loaderBindings(sourceFile) {
  /** @type {Set<string>} */
  const bindings = new Set();
  for (const statement of sourceFile.statements) {
    if (!typescript.isImportDeclaration(statement)) continue;
    if (!statement.moduleSpecifier.getText(sourceFile).includes('typescript-runtime-loader')) continue;
    const clause = statement.importClause;
    if (clause && clause.namedBindings && typescript.isNamedImports(clause.namedBindings)) {
      for (const element of clause.namedBindings.elements) bindings.add(element.name.text);
    }
  }
  return bindings;
}

/**
 * @param {typescript.SourceFile} sourceFile
 * @param {Set<string>} bindings
 * @returns {Map<string, { paramIndex: number, paramName: string, kind: 'SINGLE' | 'LIST' }>}
 */
function wrapperFunctions(sourceFile, bindings) {
  /** @type {Map<string, { paramIndex: number, paramName: string, kind: 'SINGLE' | 'LIST' }>} */
  const wrappers = new Map();
  /** @param {typescript.Node} node */
  const visitFunctions = (node) => {
    if (typescript.isFunctionDeclaration(node) && node.name && node.body) {
      const parameters = node.parameters.map((parameter) => (typescript.isIdentifier(parameter.name) ? parameter.name.text : null));
      /** @type {{ paramIndex: number, paramName: string, kind: 'SINGLE' | 'LIST' } | null} */
      let found = null;
      /** @param {typescript.Node} innerNode */
      const inner = (innerNode) => {
        if (found) return;
        if (typescript.isCallExpression(innerNode) && typescript.isIdentifier(innerNode.expression) && bindings.has(innerNode.expression.text)) {
          /** @type {typescript.Identifier[]} */
          const candidates = [];
          for (const argument of innerNode.arguments) {
            if (typescript.isIdentifier(argument)) candidates.push(argument);
            if (
              typescript.isCallExpression(argument)
              && typescript.isPropertyAccessExpression(argument.expression)
              && argument.expression.getText(sourceFile) === 'path.join'
            ) {
              for (const segment of argument.arguments) {
                if (typescript.isIdentifier(segment)) candidates.push(segment);
              }
            }
          }
          for (const candidate of candidates) {
            if (!parameters.includes(candidate.text)) continue;
            const rootOption = innerNode.arguments.some(
              (argument) => typescript.isObjectLiteralExpression(argument)
                && argument.properties.some(
                  (property) => typescript.isShorthandPropertyAssignment(property) && property.name.text === candidate.text,
                ),
            );
            if (rootOption) continue;
            const kind = innerNode.expression.text.includes('Modules') ? 'LIST' : 'SINGLE';
            found = { paramIndex: parameters.indexOf(candidate.text), paramName: candidate.text, kind };
            break;
          }
        }
        typescript.forEachChild(innerNode, inner);
      };
      inner(node.body);
      if (found) wrappers.set(node.name.text, found);
    }
    typescript.forEachChild(node, visitFunctions);
  };
  visitFunctions(sourceFile);
  return wrappers;
}

/**
 * The lexical scope that owns a node: the nearest enclosing function or the
 * source file. Symbol reads are collected per scope so a reused binding name in
 * a sibling function cannot be attributed to the wrong module.
 * @param {typescript.Node} node
 */
function scopeOf(node) {
  let current = node;
  while (
    current
    && !typescript.isFunctionDeclaration(current)
    && !typescript.isFunctionExpression(current)
    && !typescript.isArrowFunction(current)
    && !typescript.isSourceFile(current)
  ) {
    current = current.parent;
  }
  return current;
}

/**
 * @param {string} name
 * @param {typescript.Node} callNode
 * @param {typescript.SourceFile} sourceFile
 * @returns {{ symbols: string[] | null, unsupported: string | null }}
 */
function identifierBindingFacts(name, callNode, sourceFile) {
  const scope = scopeOf(callNode);
  if (!scope) return { symbols: null, unsupported: 'SCOPE_UNAVAILABLE' };
  /** @type {Set<string>} */
  const symbols = new Set();
  /** @type {string | null} */
  let unsupported = null;
  const visit = (node) => {
    if (unsupported) return;
    if (node.getStart(sourceFile) > callNode.getStart(sourceFile)) {
      if (
        typescript.isPropertyAccessExpression(node)
        && typescript.isIdentifier(node.expression)
        && node.expression.text === name
      ) {
        symbols.add(node.name.text);
      }
      if (
        typescript.isElementAccessExpression(node)
        && typescript.isIdentifier(node.expression)
        && node.expression.text === name
      ) {
        const index = node.argumentExpression;
        if (typescript.isStringLiteral(index) || typescript.isNumericLiteral(index)) {
          unsupported = 'ELEMENT_ACCESS_UNSUPPORTED';
        } else {
          unsupported = 'DYNAMIC_SYMBOL_ACCESS';
        }
      }
    }
    typescript.forEachChild(node, visit);
  };
  visit(scope);
  return { symbols: [...symbols], unsupported };
}

/**
 * @param {typescript.Node} node
 * @param {typescript.SourceFile} sourceFile
 * @returns {{ binding: typescript.Node | null, kind: 'NONE' | 'VARIABLE' | 'ASSIGNMENT' }}
 */
function bindingNodeFor(node, sourceFile) {
  let current = node;
  while (
    current
    && current.parent
    && !typescript.isVariableDeclaration(current.parent)
    && !typescript.isAssignmentExpression(current.parent)
    && !typescript.isSourceFile(current.parent)
  ) {
    current = current.parent;
  }
  if (current && current.parent && typescript.isVariableDeclaration(current.parent)) {
    return { binding: current.parent.name, kind: 'VARIABLE' };
  }
  if (current && current.parent && typescript.isAssignmentExpression(current.parent)) {
    return { binding: current.parent.left, kind: 'ASSIGNMENT' };
  }
  return { binding: null, kind: 'NONE' };
}

/**
 * Read the symbols a call site reads from its module result. Returns `null`
 * symbols when the result is unused (nothing to verify).
 * @param {typescript.Node} call, the loader call expression
 * @param {typescript.SourceFile} sourceFile
 * @param {'SINGLE' | 'LIST'} kind
 * @param {number} pathCount
 * @returns {LoaderBinding[] | { unsupported: string, symbols: null, path: null }}
 */
function bindingFacts(call, sourceFile, kind, pathCount) {
  const { binding, kind: bindingKind } = bindingNodeFor(call, sourceFile);
  if (binding === null) return [];
  const unsupported = (/** @type {string} */ code) => ({ path: /** @type {string} */ (null), symbols: null, unsupported: code });
  if (typescript.isObjectBindingPattern(binding)) {
    if (kind === 'LIST') return unsupported('LIST_OBJECT_BINDING_UNSUPPORTED');
    /** @type {string[]} */
    const names = [];
    for (const element of binding.elements) {
      if (typescript.isOmittedExpression(element) || element.dotDotDotToken) return unsupported('OBJECT_BINDING_UNSUPPORTED');
      const property = element.propertyName ?? element.name;
      if (typescript.isIdentifier(property)) names.push(property.text);
      else if (typescript.isStringLiteral(property)) names.push(property.text);
      else return unsupported('OBJECT_BINDING_UNSUPPORTED');
      if (typescript.isObjectBindingPattern(element.name) || typescript.isArrayBindingPattern(element.name)) {
        return unsupported('NESTED_BINDING_UNSUPPORTED');
      }
    }
    return [{ path: '', symbols: names, unsupported: null }];
  }
  if (typescript.isArrayBindingPattern(binding)) {
    if (kind === 'SINGLE') return unsupported('ARRAY_BINDING_ON_SINGLE_MODULE');
    /** @type {LoaderBinding[]} */
    const facts = [];
    const elements = binding.elements;
    if (elements.length !== pathCount) return unsupported('LIST_BINDING_ARITY');
    for (const element of elements) {
      if (typescript.isOmittedExpression(element) || element.dotDotDotToken || !typescript.isIdentifier(element.name)) {
        return unsupported('ARRAY_BINDING_UNSUPPORTED');
      }
      facts.push({ path: '', symbols: identifierBindingFacts(element.name.text, call, sourceFile).symbols, unsupported: identifierBindingFacts(element.name.text, call, sourceFile).unsupported });
    }
    return facts;
  }
  if (typescript.isIdentifier(binding)) {
    if (kind === 'LIST') {
      const scope = scopeOf(call);
      let used = false;
      const visit = (node) => {
        if (typescript.isIdentifier(node) && node.text === binding.text && node.getStart(sourceFile) > call.getStart(sourceFile) && node !== binding) used = true;
        typescript.forEachChild(node, visit);
      };
      if (scope) visit(scope);
      if (used) return unsupported('LIST_IDENTIFIER_BINDING_UNSUPPORTED');
      return [];
    }
    const facts = identifierBindingFacts(binding.text, call, sourceFile);
    return [{ path: '', symbols: facts.symbols, unsupported: facts.unsupported }];
  }
  if (bindingKind === 'ASSIGNMENT' && typescript.isPropertyAccessExpression(binding)) {
    return unsupported('ASSIGNMENT_TARGET_UNSUPPORTED');
  }
  return unsupported('BINDING_UNSUPPORTED');
}

/**
 * Extract every effective loader call site.
 *
 * A call is effective when it hands a path directly to a loader binding or to
 * a local wrapper whose path parameter is forwarded. The path argument must be
 * statically resolvable: a string literal, or a list literal whose elements are
 * all string literals. Anything else is a finding, not a silently skipped site.
 *
 * @param {ContractSourceFile[]} files
 * @returns {{ callSites: LoaderCallSite[], findings: ContractFinding[] }}
 */
export function extractLoaderCallSites(files) {
  /** @type {LoaderCallSite[]} */
  const callSites = [];
  /** @type {ContractFinding[]} */
  const findings = [];
  for (const file of files) {
    const sourceFile = parse(file);
    const bindings = loaderBindings(sourceFile);
    if (bindings.size === 0) continue;
    const wrappers = wrapperFunctions(sourceFile, bindings);
    const lineOf = (node) => sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
    const visit = (node) => {
      if (typescript.isCallExpression(node)) {
        const callee = typescript.isIdentifier(node.expression) ? node.expression.text : null;
        /** @type {typescript.Expression | undefined} */
        let pathArgument;
        /** @type {LoaderCallSite['callee'] | null} */
        let effectiveCallee = null;
        /** @type {'SINGLE' | 'LIST'} */
        let kind = 'SINGLE';
        if (callee && bindings.has(callee) && !callee.includes('Modules') && !callee.startsWith('loadTypeScriptModules')) {
          const first = node.arguments[0];
          const forwards = first && typescript.isIdentifier(first) && [...wrappers.values()].some((wrapper) => wrapper.paramName === first.text);
          const forwardsJoin = first
            && typescript.isCallExpression(first)
            && typescript.isPropertyAccessExpression(first.expression)
            && first.expression.getText(sourceFile) === 'path.join'
            && first.arguments.some((segment) => typescript.isIdentifier(segment) && [...wrappers.values()].some((wrapper) => wrapper.paramName === segment.text));
          if (!forwards && !forwardsJoin) {
            pathArgument = first;
            effectiveCallee = callee;
            kind = 'SINGLE';
          }
        } else if (callee && bindings.has(callee)) {
          const first = node.arguments[0];
          const forwards = first && typescript.isIdentifier(first) && [...wrappers.values()].some((wrapper) => wrapper.paramName === first.text);
          if (!forwards) {
            pathArgument = first;
            effectiveCallee = callee;
            kind = 'LIST';
          }
        } else if (callee && wrappers.has(callee)) {
          const wrapper = wrappers.get(callee);
          pathArgument = node.arguments[wrapper.paramIndex];
          effectiveCallee = callee;
          kind = wrapper.kind;
        }
        if (effectiveCallee !== null) {
          const line = lineOf(node);
          /** @type {string[]} */
          let paths = [];
          if (pathArgument === undefined) {
            findings.push({ code: 'CLI_CONTRACT_PATH_NOT_LITERAL', detail: `${file.file}:${line} ${effectiveCallee} <missing argument>` });
          } else if (isStringLiteralLike(pathArgument)) {
            paths = [pathArgument.text];
          } else if (typescript.isArrayLiteralExpression(pathArgument)) {
            if (pathArgument.elements.length === 0) {
              findings.push({ code: 'CLI_CONTRACT_LIST_EMPTY', detail: `${file.file}:${line} ${effectiveCallee}` });
            } else {
              /** @type {boolean} */
              let allLiteral = true;
              for (const element of pathArgument.elements) {
                if (!isStringLiteralLike(element)) { allLiteral = false; break; }
                paths.push(element.text);
              }
              if (!allLiteral) {
                paths = [];
                findings.push({
                  code: 'CLI_CONTRACT_PATH_NOT_LITERAL',
                  detail: `${file.file}:${line} ${effectiveCallee} ${pathArgument.getText(sourceFile).replace(/\s+/g, ' ').slice(0, 120)}`,
                });
              }
            }
          } else {
            findings.push({
              code: 'CLI_CONTRACT_PATH_NOT_LITERAL',
              detail: `${file.file}:${line} ${effectiveCallee} ${pathArgument.getText(sourceFile).replace(/\s+/g, ' ').slice(0, 120)}`,
            });
          }
          if (paths.length > 0 || pathArgument === undefined) {
            const rawFacts = bindingFacts(node, sourceFile, kind, paths.length);
            if (!Array.isArray(rawFacts)) {
              // A binding form the extractor cannot verify is a finding, not a
              // silent gap; fail closed.
              findings.push({ code: `CLI_CONTRACT_${rawFacts.unsupported}`, detail: `${file.file}:${line} ${effectiveCallee}` });
              /** @type {LoaderBinding[]} */
              const bindingsForPaths = paths.map((path) => ({ path, symbols: null, unsupported: rawFacts.unsupported }));
              callSites.push({ file: file.file, line, callee: effectiveCallee, kind, expression: pathArgument === undefined ? '' : pathArgument.getText(sourceFile), bindings: bindingsForPaths });
            } else {
              /** @type {LoaderBinding[]} */
              const resolvedBindings = [];
              for (let index = 0; index < paths.length; index += 1) {
                const fact = rawFacts[index] ?? { symbols: null, unsupported: null };
                if (fact.unsupported) {
                  findings.push({ code: `CLI_CONTRACT_${fact.unsupported}`, detail: `${file.file}:${line} ${effectiveCallee} ${paths[index]}` });
                  resolvedBindings.push({ path: paths[index], symbols: null, unsupported: fact.unsupported });
                  continue;
                }
                resolvedBindings.push({ path: paths[index], symbols: fact.symbols, unsupported: null });
              }
              callSites.push({ file: file.file, line, callee: effectiveCallee, kind, expression: pathArgument === undefined ? '' : pathArgument.getText(sourceFile), bindings: resolvedBindings });
            }
          }
        }
      }
      typescript.forEachChild(node, visit);
    };
    visit(sourceFile);
  }
  return { callSites, findings };
}

/**
 * Resolve a relative import specifier to an existing repository-relative path.
 * The candidate list mirrors the resolutions the repository actually uses:
 * exact, `.ts`, `.tsx`, `.js` mapped to `.ts`, and directory `index.ts`.
 * Bare (package) specifiers return null and are treated as opaque by the
 * export collector rather than as failures.
 * @param {string} fromPath repository-relative module containing the specifier
 * @param {string} specifier
 * @param {(relativePath: string) => boolean} fileExists
 */
export function resolveRelativeModule(fromPath, specifier, fileExists) {
  if (!specifier.startsWith('.')) return null;
  const baseSegments = fromPath.split('/');
  baseSegments.pop();
  for (const segment of specifier.split('/')) {
    if (segment === '' || segment === '.') continue;
    if (segment === '..') baseSegments.pop();
    else baseSegments.push(segment);
  }
  const base = baseSegments.join('/');
  const candidates = [base, `${base}.ts`, `${base}.tsx`, `${base}.d.ts`];
  if (base.endsWith('.js')) candidates.push(`${base.slice(0, -3)}.ts`);
  candidates.push(`${base}/index.ts`, `${base}/index.tsx`);
  for (const candidate of candidates) {
    if (fileExists(candidate)) return candidate;
  }
  return null;
}

/**
 * Collect the names a module exports, following relative re-export chains.
 * `opaque` is true when the surface cannot be fully known (a bare package
 * re-export or an `export =`); symbol checks are skipped for an opaque module
 * and `unresolved` records relative specifiers that do not resolve on disk.
 * @param {string} modulePath repository-relative path
 * @param {ContractAccess} access
 * @param {Set<string>} [visited]
 * @param {number} [depth]
 * @returns {{ names: Set<string>, opaque: boolean, unresolved: string[] }}
 */
export function collectExportedNames(modulePath, access, visited = new Set(), depth = 0) {
  /** @type {Set<string>} */
  const names = new Set();
  if (visited.has(modulePath) || depth > 32) return { names, opaque: false, unresolved: [] };
  visited.add(modulePath);
  const source = access.readSource(modulePath);
  if (source === null) return { names, opaque: false, unresolved: [] };
  const sourceFile = typescript.createSourceFile(modulePath, source, typescript.ScriptTarget.Latest, true, typescript.ScriptKind.TS);
  /** @type {boolean} */
  let opaque = false;
  /** @type {string[]} */
  const unresolved = [];
  const merge = (value) => {
    for (const name of value.names) names.add(name);
    if (value.opaque) opaque = true;
    for (const item of value.unresolved) unresolved.push(item);
  };
  const declarationNames = (statement) => {
    if ((typescript.isFunctionDeclaration(statement) || typescript.isClassDeclaration(statement) || typescript.isEnumDeclaration(statement)) && statement.name) {
      names.add(statement.name.text);
    }
    if (typescript.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        if (typescript.isIdentifier(declaration.name)) names.add(declaration.name.text);
        else if (typescript.isObjectBindingPattern(declaration.name) || typescript.isArrayBindingPattern(declaration.name)) {
          for (const element of declaration.name.elements) {
            if (typescript.isBindingElement(element) && typescript.isIdentifier(element.name)) names.add(element.name.text);
          }
        }
      }
    }
    if (typescript.isInterfaceDeclaration(statement) || typescript.isTypeAliasDeclaration(statement)) names.add(statement.name.text);
    if (typescript.isModuleDeclaration(statement) && statement.name) names.add(statement.name.text);
  };
  for (const statement of sourceFile.statements) {
    const modifiers = /** @type {typescript.NodeArray<typescript.ModifierLike> | undefined} */ (statement.modifiers);
    const exported = modifiers ? modifiers.some((modifier) => modifier.kind === typescript.SyntaxKind.ExportKeyword) : false;
    const isDefault = modifiers ? modifiers.some((modifier) => modifier.kind === typescript.SyntaxKind.DefaultKeyword) : false;
    if (typescript.isExportDeclaration(statement)) {
      if (!statement.moduleSpecifier) {
        const clause = statement.exportClause;
        if (clause && typescript.isNamedExports(clause)) {
          for (const element of clause.elements) names.add((element.name ?? element.propertyName).text);
        }
        continue;
      }
      const specifier = statement.moduleSpecifier.text;
      if (!specifier.startsWith('.')) { opaque = true; continue; }
      const target = resolveRelativeModule(modulePath, specifier, access.fileExists);
      if (target === null) { unresolved.push(specifier); continue; }
      if (statement.exportClause && typescript.isNamespaceExport(statement.exportClause)) {
        names.add(statement.exportClause.name.text);
      } else if (statement.exportClause && typescript.isNamedExports(statement.exportClause)) {
        for (const element of statement.exportClause.elements) names.add((element.name ?? element.propertyName).text);
      } else {
        merge(collectExportedNames(target, access, visited, depth + 1));
      }
      continue;
    }
    if (typescript.isExportAssignment(statement)) { names.add('default'); continue; }
    if (exported || isDefault) {
      if (isDefault) names.add('default');
      declarationNames(statement);
    }
  }
  return { names, opaque, unresolved };
}

/**
 * Every distinct `src/**`/`corpus/**` `.ts` string literal in the bin sources,
 * whether or not it is a loader argument. This is the mechanical equivalent of
 * the audit's textual "198 referenced paths" measure, and it resolves each one.
 * @param {ContractSourceFile[]} files
 * @returns {{ literal: string, files: string[] }[]}
 */
export function scanTypeScriptPathLiterals(files) {
  /** @type {Map<string, string[]>} */
  const byLiteral = new Map();
  for (const file of files) {
    for (const match of file.source.matchAll(LITERAL_TS_PATH_PATTERN)) {
      const literal = match[1];
      const list = byLiteral.get(literal) ?? [];
      list.push(file.file);
      byLiteral.set(literal, list);
    }
  }
  return [...byLiteral.entries()]
    .map(([literal, owners]) => ({ literal, files: [...new Set(owners)].sort() }))
    .sort((left, right) => left.literal.localeCompare(right.literal));
}

/**
 * Render the generated loader declaration for a set of module paths. The
 * declaration maps each literal `.ts` path to `typeof import(...)` of that
 * exact module, so a caller's destructuring carries the target module's type
 * and cannot drift from the module it describes. The output is deterministic.
 * @param {string[]} paths
 */
export function renderLoaderTypeMap(paths) {
  const sorted = [...new Set(paths)].sort((left, right) => left.localeCompare(right));
  const entries = sorted.map((filePath) => {
    const importPath = filePath.endsWith('.ts') ? filePath.slice(0, -3) : filePath;
    return `  ${JSON.stringify(filePath)}: typeof import(${JSON.stringify(`../../${importPath}`)});`;
  });
  return [
    '// GENERATED — the typed surface of the bounded TypeScript runtime loader.',
    '// Regenerate with: node bin/bin-typecheck.mjs --write',
    '// Each key is one literal path passed to loadTypeScriptModule(s); each value',
    '// is that module\'s own type, so a bin destructure is checked against the',
    '// module it loads rather than against `any`.',
    '',
    'export const TYPESCRIPT_RUNTIME_LOADER_VERSION: string;',
    'export const DEFAULT_TYPESCRIPT_RUNTIME_PROFILE: string;',
    '',
    'export interface TypeScriptRuntimeLoaderOptions {',
    '  readonly root?: string;',
    '  readonly profile?: string;',
    '}',
    '',
    'export interface TypeScriptRuntimeLoaderModuleMap {',
    ...entries,
    '}',
    '',
    'export function loadTypeScriptModule<',
    '  T = never,',
    '  const File extends string = string,',
    '>(',
    '  file: File,',
    '  options?: TypeScriptRuntimeLoaderOptions,',
    '): [T] extends [never]',
    '  ? File extends keyof TypeScriptRuntimeLoaderModuleMap',
    '    ? TypeScriptRuntimeLoaderModuleMap[File]',
    '    : unknown',
    '  : T;',
    'export function loadTypeScriptModules<',
    '  T = never,',
    '  const Files extends readonly string[] = readonly string[],',
    '>(',
    '  files: Files,',
    '  options?: TypeScriptRuntimeLoaderOptions,',
    '): [T] extends [never]',
    '  ? { -readonly [Index in keyof Files]: Files[Index] extends keyof TypeScriptRuntimeLoaderModuleMap ? TypeScriptRuntimeLoaderModuleMap[Files[Index]] : unknown }',
    '  : T[];',
    'export function clearTypeScriptRuntimeTranspileCache(): void;',
    'export function typeScriptRuntimeTranspileCacheStats(): {',
    '  readonly hits: number;',
    '  readonly misses: number;',
    '  readonly evictions: number;',
    '  readonly transpiles: number;',
    '  readonly entries: number;',
    '  readonly maxEntries: number;',
    '};',
    'export function typeScriptRuntimeProfileNames(): readonly string[];',
    '',
  ].join('\n');
}

/**
 * The complete loader contract judgement: extraction, path resolution, symbol
 * verification, the broad literal-path scan, and generated-map freshness.
 * @param {{
 *   files: ContractSourceFile[],
 *   access: ContractAccess,
 *   readLoaderTypeMap?: (() => string | null) | undefined,
 * }} input
 */
export function verifyCliImplementationContract(input) {
  /** @type {ContractFinding[]} */
  const findings = [];
  const extraction = extractLoaderCallSites(input.files);
  findings.push(...extraction.findings);
  /** @type {Map<string, Set<string>>} */
  const symbolsByPath = new Map();
  let symbolChecks = 0;
  for (const site of extraction.callSites) {
    for (const binding of site.bindings) {
      const modulePath = binding.path;
      if (!modulePath.endsWith('.ts') || modulePath.includes('\0')) {
        findings.push({ code: 'CLI_CONTRACT_MODULE_NOT_TYPESCRIPT', detail: `${site.file}:${site.line} ${modulePath}` });
        continue;
      }
      if (!input.access.fileExists(modulePath)) {
        findings.push({ code: 'CLI_CONTRACT_MODULE_MISSING', detail: `${site.file}:${site.line} ${modulePath}` });
        continue;
      }
      if (!binding.symbols || binding.symbols.length === 0) continue;
      if (!symbolsByPath.has(modulePath)) {
        symbolsByPath.set(modulePath, collectExportedNames(modulePath, input.access).names);
      }
      const exported = /** @type {Set<string>} */ (symbolsByPath.get(modulePath));
      for (const symbol of binding.symbols) {
        symbolChecks += 1;
        if (!exported.has(symbol)) {
          findings.push({ code: 'CLI_CONTRACT_SYMBOL_MISSING', detail: `${site.file}:${site.line} ${modulePath} ${symbol}` });
        }
      }
    }
  }
  for (const entry of scanTypeScriptPathLiterals(input.files)) {
    if (!input.access.fileExists(entry.literal)) {
      findings.push({ code: 'CLI_CONTRACT_LITERAL_PATH_MISSING', detail: `${entry.literal} (${entry.files.join(', ')})` });
    }
  }
  if (extraction.callSites.length === 0) {
    findings.push({ code: 'CLI_CONTRACT_EXTRACTOR_VACUOUS', detail: 'zero loader call sites discovered' });
  }
  const typeMapPaths = [...new Set(extraction.callSites.flatMap((site) => site.bindings.map((binding) => binding.path)))].filter(Boolean);
  if (input.readLoaderTypeMap) {
    const onDisk = input.readLoaderTypeMap();
    if (onDisk === null) {
      findings.push({ code: 'CLI_CONTRACT_LOADER_TYPES_MISSING', detail: 'bin/lib/typescript-runtime-loader.d.mts' });
    } else if (onDisk !== renderLoaderTypeMap(typeMapPaths)) {
      findings.push({ code: 'CLI_CONTRACT_LOADER_TYPES_STALE', detail: 'run: node bin/bin-typecheck.mjs --write' });
    }
  }
  return {
    ok: findings.length === 0,
    callSites: extraction.callSites,
    findings,
    stats: {
      binFiles: input.files.length,
      callSites: extraction.callSites.length,
      listCallSites: extraction.callSites.filter((site) => site.kind === 'LIST').length,
      distinctPaths: typeMapPaths.length,
      symbolChecks,
      literalPaths: scanTypeScriptPathLiterals(input.files).length,
    },
  };
}

/**
 * Find tracked top-level bins that no test executes as a process.
 *
 * A test executes a bin when a spawn-family call carries the bin's path — or a
 * variable whose initializer is the bin's path — in its argument list. A test
 * that imports the bin, or reads its source to assert a string, does not
 * count: the reference must sit inside a process-dispatch call.
 * @param {{ bins: string[], tests: ContractSourceFile[] }} input
 */
export function findBinsWithoutExecutingTest(input) {
  const testFiles = input.tests.filter((test) => /\.test\.ts$/.test(test.file));
  /** @type {Map<string, { callArguments: string[], variables: Map<string, string> }>} */
  const factsByTest = new Map();
  for (const test of testFiles) {
    const sourceFile = typescript.createSourceFile(test.file, test.source, typescript.ScriptTarget.Latest, true, typescript.ScriptKind.TS);
    /** @type {string[]} */
    const callArguments = [];
    /** @type {Map<string, string>} */
    const variables = new Map();
    const visit = (node) => {
      if (typescript.isCallExpression(node)) {
        const callee = typescript.isIdentifier(node.expression) ? node.expression.text : '';
        if (['spawn', 'spawnSync', 'execFile', 'execFileSync', 'exec'].includes(callee)) {
          callArguments.push(node.arguments.map((argument) => argument.getText(sourceFile)).join(' '));
        }
      }
      if (
        typescript.isVariableDeclaration(node)
        && typescript.isIdentifier(node.name)
        && node.initializer
      ) {
        variables.set(node.name.text, node.initializer.getText(sourceFile));
      }
      typescript.forEachChild(node, visit);
    };
    visit(sourceFile);
    factsByTest.set(test.file, { callArguments, variables });
  }
  /** @type {{ bin: string, tests: string[] }[]} */
  const covered = [];
  /** @type {string[]} */
  const uncovered = [];
  for (const bin of [...input.bins].sort()) {
    const escaped = escapeRegExp(bin.slice('bin/'.length));
    const reference = new RegExp(`(?:['"\`](?:[^'"\`\\n]*\\/)?bin\\/${escaped}['"\`])|(?:['"]bin['"]\\s*,\\s*['"]${escaped}['"])`);
    const owners = [];
    for (const [testFile, facts] of factsByTest) {
      let executed = facts.callArguments.some((text) => reference.test(text));
      if (!executed) {
        for (const [name, initializer] of facts.variables) {
          if (!reference.test(initializer)) continue;
          const token = new RegExp(`\\b${escapeRegExp(name)}\\b`);
          if (facts.callArguments.some((text) => token.test(text))) { executed = true; break; }
        }
      }
      if (executed) owners.push(testFile);
    }
    if (owners.length > 0) covered.push({ bin, tests: owners.sort() });
    else uncovered.push(bin);
  }
  return { bins: [...input.bins].sort(), covered, uncovered };
}
