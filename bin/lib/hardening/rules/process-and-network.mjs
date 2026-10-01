#!/usr/bin/env node
// @ts-check

/**
 * Invariant family: process and network boundaries.
 *
 * Every place Nightwatch starts a child process, reaches a target, or could
 * acquire egress. The shared property is CONTAINMENT: a launcher spawns with a
 * bounded timeout, a bounded buffer, no inherited environment and no shell; a
 * target is DEV-only; the L6 envelope, the proxy gate, the production-observe
 * boundary and the P1 observation scope each keep a reach from widening.
 */

import {
  fail,
  withoutComments,
  readIncludingComments,
  read,
  readCommentText,
  readDataFile,
  lineOfText,
  lineOfMatch,
  gitFiles,
  isRuleEngineSource,
} from "../kernel.mjs";
import typescript from 'typescript';

import {
  buildChildProcessCensus,
  EXECUTION_PROFILES,
} from "../../childProcessCensus.mjs";

/**
 * R4-09 / review-4 task 2.2 — the effect vocabulary and the syntax-aware
 * top-level effect collector the DEV-launcher rule uses.
 *
 * The vocabulary is the FULL fs mutation family (unlink, symlink, rename, rm,
 * mkdir, write, append, copy, truncate, chmod, chown, utimes, link, mkdtemp)
 * plus process, fetch, browser and network effects and dynamic import. The walk
 * is syntax-aware: it starts at the parsed TOP-LEVEL statements inside the
 * guarded region, descends into blocks and control statements (so an effect
 * inside a top-level `try` or `if` is seen), sees a local call reached through
 * an assignment, and stops at function-like bodies, which do not run at load.
 */
const DEV_EFFECT_FS_MUTATIONS = new Set([
  'writeFile', 'writeFileSync', 'appendFile', 'appendFileSync', 'mkdir', 'mkdirSync', 'rm', 'rmSync',
  'rename', 'renameSync', 'copyFile', 'copyFileSync', 'createWriteStream', 'open', 'openSync',
  'unlink', 'unlinkSync', 'symlink', 'symlinkSync', 'rmdir', 'rmdirSync', 'truncate', 'truncateSync',
  'chmod', 'chmodSync', 'chown', 'chownSync', 'utimes', 'utimesSync', 'link', 'linkSync',
  'mkdtemp', 'mkdtempSync', 'createWriteStreamSync', 'writev', 'writevSync', 'futimes', 'futimesSync',
]);
const DEV_EFFECT_PROCESS_CALLS = new Set(['spawnSync', 'spawn', 'execFileSync', 'execFile', 'execSync', 'fork', 'fetch', 'chromium', 'launchPersistentContext']);
const DEV_EFFECT_NETWORK_OBJECTS = new Set(['http', 'https', 'net']);
const DEV_EFFECT_NETWORK_MEMBERS = new Set(['request', 'get', 'connect']);
const DEV_EFFECT_FS_OBJECTS = /^(?:fs|fsp|fsPromises|fsSync)(?:\.promises)?$/;
const DEV_EFFECT_DECLARATION_KINDS = new Set([
  typescript.SyntaxKind.FunctionDeclaration, typescript.SyntaxKind.ClassDeclaration,
  typescript.SyntaxKind.InterfaceDeclaration, typescript.SyntaxKind.TypeAliasDeclaration,
  typescript.SyntaxKind.EnumDeclaration, typescript.SyntaxKind.ImportDeclaration,
  typescript.SyntaxKind.ImportEqualsDeclaration, typescript.SyntaxKind.ModuleDeclaration,
  typescript.SyntaxKind.ExportDeclaration, typescript.SyntaxKind.ExportAssignment,
  typescript.SyntaxKind.EmptyStatement,
]);

/**
 * The dotted text of a callee's receiver, so `fs.promises.writeFile` resolves
 * to the `fs` family rather than to a bare property name.
 * @param {typescript.Expression} expression
 * @param {typescript.SourceFile} sourceFile
 */
function devEffectReceiver(expression, sourceFile) {
  if (typescript.isIdentifier(expression)) return expression.text;
  if (typescript.isPropertyAccessExpression(expression)) return expression.getText(sourceFile);
  return null;
}

/**
 * R4-09 / review-4 task 2.2 — the behavioural self-test for the DEV-launcher
 * effect scan. It is intentionally built from a SYNTHETIC source so the probe
 * campaign can mutate any single element of the scan (the fs vocabulary, the
 * positional bound, the descent, the function-body stop, the local-call rule)
 * and observe a failure without touching a real launcher.
 * @returns {string[]} findings (empty when the scan is sound)
 */
export function devLauncherEffectSelfTest() {
  const guardLine = 'guardDevLane({ root, launcher: \'fixture.mjs\', args: process.argv.slice(2) });\n';
  const dispatchLine = 'if (cli.stop) return;\n';
  const before = [
    'try {\n',
    '  if (probe) { fs.unlinkSync(scratch); }\n',
    '  fs.symlinkSync(target, link);\n',
    '  const h = currentHead();\n',
    '} catch { /* bounded */ }\n',
    'const helper = () => { fs.rmSync(scratch); };\n',
  ].join('');
  const after = [
    'spawnSync(process.execPath, [path.join(root, \'bin\', \'x.mjs\')]);\n',
    'fs.rmSync(scratch);\n',
  ].join('');
  const code = `${guardLine}${before}${dispatchLine}${after}`;
  const from = guardLine.length;
  const to = guardLine.length + before.length;
  const localNames = new Set(['currentHead', 'helper']);
  const found = collectTopLevelEffects(code, from, to, localNames);
  const findings = [];
  for (const expected of ['fs.unlinkSync(scratch)', 'fs.symlinkSync(target, link)', 'currentHead()']) {
    if (!found.includes(expected)) {
      findings.push(`DEV_LAUNCHER_EFFECT_SCAN_SELFTEST the effect scan missed ${expected}; the R4-09 vocabulary/descent regression is back`);
    }
  }
  for (const forbidden of ['fs.rmSync(scratch)', 'spawnSync(']) {
    if (found.some((entry) => entry.startsWith(forbidden))) {
      findings.push(`DEV_LAUNCHER_EFFECT_SCAN_SELFTEST the effect scan reported ${forbidden} outside the guarded region or inside a function body`);
    }
  }
  return findings;
}

/**
 * @param {string} code the module source
 * @param {number} from inclusive character offset of the guarded region
 * @param {number} to exclusive character offset of the dispatch statement
 * @param {Set<string>} localNames locally declared function/arrow names
 * @returns {string[]} the source text of every offending call, in source order
 */
export function collectTopLevelEffects(code, from, to, localNames) {
  const sourceFile = typescript.createSourceFile('dev-launcher.mjs', code, typescript.ScriptTarget.Latest, true, typescript.ScriptKind.JS);
  /** @type {string[]} */
  const effects = [];
  /**
   * The region is POSITIONAL, not statement-granular: a top-level `try { … }`
   * may wrap BOTH legitimate pre-dispatch work and the dispatch itself, so a
   * node is judged by its own start offset. Nodes at or after the dispatch are
   * never effects of interest (the dispatch legitimately does the work).
   * @param {typescript.Node} node
   */
  const walk = (node) => {
    if (
      typescript.isArrowFunction(node) || typescript.isFunctionExpression(node) || typescript.isFunctionDeclaration(node)
      || typescript.isMethodDeclaration(node) || typescript.isClassDeclaration(node) || typescript.isClassExpression(node)
      || typescript.isGetAccessor(node) || typescript.isSetAccessor(node) || typescript.isConstructorDeclaration(node)
    ) return;
    const start = node.getStart(sourceFile);
    const inRegion = start >= from && start < to;
    if (inRegion) {
      if (typescript.isImportCall(node)) {
        effects.push(node.getText(sourceFile));
      } else if (typescript.isCallExpression(node)) {
        const callee = node.expression;
        const text = node.getText(sourceFile);
        if (typescript.isElementAccessExpression(callee) && DEV_EFFECT_FS_OBJECTS.test(devEffectReceiver(callee.expression, sourceFile) ?? '')) {
          effects.push(text);
        } else if (typescript.isIdentifier(callee)) {
          if (DEV_EFFECT_PROCESS_CALLS.has(callee.text) || localNames.has(callee.text)) effects.push(text);
        } else if (typescript.isPropertyAccessExpression(callee)) {
          const receiver = devEffectReceiver(callee.expression, sourceFile) ?? '';
          const member = callee.name.text;
          if (DEV_EFFECT_FS_OBJECTS.test(receiver) && DEV_EFFECT_FS_MUTATIONS.has(member)) effects.push(text);
          else if (DEV_EFFECT_NETWORK_OBJECTS.has(receiver) && DEV_EFFECT_NETWORK_MEMBERS.has(member)) effects.push(text);
        }
      } else if (typescript.isNewExpression(node)) {
        if (typescript.isIdentifier(node.expression) && node.expression.text === 'WebSocket') effects.push(node.getText(sourceFile));
      }
    }
    typescript.forEachChild(node, walk);
  };
  for (const statement of sourceFile.statements) {
    if (statement.getEnd() <= from || statement.getStart(sourceFile) >= to) continue;
    if (DEV_EFFECT_DECLARATION_KINDS.has(statement.kind)) continue;
    walk(statement);
  }
  return effects;
}
import {
  buildTransportEffectCensus,
  EFFECT_CLASSES,
} from "../../transportEffectCensus.mjs";

/**
 * M8 (9.12): the M8 guard totality rule.
 *
 * Every guard the M8 milestones established must still be PRESENT in code, and
 * each one carries a registered mutation probe (config/hardening-rule-probes.
 * v1.json) that proves the rule fails when the guard is removed. A guard with
 * no rule and no probe is a claim that rots silently.
 */
export function checkM8GuardTotality() {
  const guards = [
    ["src/core/policy/devLanePreconditions.ts", "DEV_LANE_PRECONDITION_OPEN", "the DEV-lane precondition refusal"],
    ["bin/lib/dev-lane-precondition.mjs", "guardDevLane(", "the DEV-lane launcher guard"],
    ["src/auth/capabilityLifecycle.ts", "AUTH_BUNDLE_TRANSACTION_PENDING", "the auth bundle transaction reader refusal"],
    ["src/auth/capabilityLifecycle.ts", "recoverAuthCapabilityBundle", "the auth bundle recovery authority"],
    ["src/auth/loginForm.ts", "beginEffectSequence", "the one-shot DEV credential effect sequence"],
    ["src/auth/loginForm.ts", "pinVerified", "the verified-element-identity pinning"],
    ["src/browser/observers/networkObserver.ts", "MAX_CONCURRENT_BODY_READS", "the bounded body-read acquisition gate"],
    ["src/browser/observers/networkObserver.ts", "void joined;", "the joined losing body-read promise"],
    ["src/browser/context.ts", "setupRollback", "the browser-context setup rollback"],
    ["src/browser/context.ts", "awaitAcquisitions", "the awaited popup guard barrier"],
    ["src/core/evidence/runRecorder.ts", "RUN_EVIDENCE_APPEND_BOUND_EXCEEDED", "the append-time evidence bound"],
    ["src/core/evidence/runRecorder.ts", "RUN_EVIDENCE_MANIFEST_INVALID", "the fail-closed manifest parse"],
    ["src/proxy/events.ts", "PROXY_EVIDENCE_LEDGER_INVALID", "the strict proxy ledger reader"],
    ["src/proxy/events.ts", "PROXY_EFFECT_PHASES", "the proxy effect-pair phases"],
    ["src/proxy/runtime.ts", "checkProxyHealthDetailed", "the proxy instance-nonce observation"],
    ["src/core/oops/l6.ts", "invocationCredential", "the relay invocation credential"],
    ["src/api/phase5/relay.ts", "RELAY_OBSERVATION_ALREADY_RECORDED", "the single-write relay observation"],
    ["src/core/changeIntelligence/selection.ts", "CHANGESET_ID_MISMATCH", "the ChangeSet id recomputation"],
    ["src/core/changeIntelligence/selection.ts", "CHANGESET_RENAME_ENDPOINT_MISSING", "the both-endpoint rename rule"],
    ["src/core/semanticCoverage/sourceAnalyzers.ts", "HEURISTIC", "the heuristic analyzer proof tier"],
    ["bin/lib/childProcessCensus.mjs", "KNOWN_CREATE_REQUIRE_SITES", "the declared createRequire exemption list"],
    ["src/core/validation/shardExecutionReceipt.ts", "ALL_SKIPPED", "the all-skipped shard refusal"],
  ];
  for (const [file, token, description] of guards) {
    if (!read(file).includes(token)) fail(`${description} is missing from ${file}`);
  }
  // The probes must be registered for this rule, one per guard family.
  const registry = JSON.parse(read('config/hardening-rule-probes.v1.json'));
  const probes = registry.probes.checkM8GuardTotality;
  if (!Array.isArray(probes) || probes.length < guards.length) {
    fail('every M8 guard must carry a registered mutation probe');
  }
  const ids = new Set(probes.map((probe) => probe.id));
  if (ids.size !== probes.length) fail('M8 guard probes must have unique ids');
  for (const probe of probes) {
    if (!Array.isArray(probe.ops) || probe.ops.length === 0) fail(`probe ${probe.id} has no operations`);
  }
}

/**
 * RV-18 / corrections task 7.13 — the DEV launcher help/metadata exemption.
 *
 * `isDevInvocation` deliberately returns false for `--help`, `-h` and
 * `--print-metadata`, so a metadata query never trips the precondition guard.
 * That exemption is only safe if EVERY launcher that calls `guardDevLane(`
 * does nothing effectful between the guard and the point where it short-circuits
 * those flags — which was true by inspection and enforced nowhere. This rule
 * enforces it:
 *   1. the exemption set in bin/lib/dev-lane-precondition.mjs is exactly those
 *      three flags (a widened exemption fails);
 *   2. every guarded launcher either uses the operator CLI (`defineOperatorCli(`
 *      then a `.stop` short-circuit) or is a DECLARED own-parser launcher whose
 *      parser refuses every unrecognised flag;
 *   3. no top-level statement between the guard and the short-circuit performs a
 *      process, network or browser effect (function bodies are declarations,
 *      not executed there).
 */
export function checkDevLauncherMetadataShortCircuit() {
  // R4-09 / review-4 task 2.2: the effect scan is SYNTAX-AWARE and it proves
  // itself. The self-test below runs the collector on a synthetic source that
  // contains one effect of every class the review named (an effect inside a
  // top-level `try`, an effect wrapped in `if (…)`, a local call reached
  // through an assignment, `fs.unlinkSync`, `fs.symlinkSync`) and asserts both
  // inclusion and exclusion, so removing a vocabulary member, dropping the
  // positional bound, or failing to descend into a block fails here.
  const selfTest = devLauncherEffectSelfTest();
  if (selfTest.length > 0) {
    for (const finding of selfTest) fail(finding);
  }
  const exemptionSource = read('bin/lib/dev-lane-precondition.mjs');
  const exemptionLines = [...exemptionSource.matchAll(/if \(([^\n]*args\.includes\('--help'\)[^\n]*)\) return false;/g)];
  // Exactly ONE exemption statement may exist; a second one is a widening too.
  const exempt = exemptionLines.length !== 1
    ? null
    : [...String(exemptionLines[0]?.[1] ?? '').matchAll(/args\.includes\('([^']+)'\)/g)].map((match) => String(match[1])).sort();
  if (exempt === null || exempt.join(',') !== ['--help', '--print-metadata', '-h'].join(',')) {
    fail(`DEV_LAUNCHER_EXEMPTION_WIDENED bin/lib/dev-lane-precondition.mjs exempts ${exempt === null ? 'an unparseable set' : exempt.join(', ')}; the help/metadata exemption is exactly --help, -h and --print-metadata`);
  }
  // Launchers whose own parser (not defineOperatorCli) handles the exempted
  // flags, each with the token that proves the parser refuses everything else.
  // R3-12 / corrections task 8.11: an own-parser launcher names BOTH the token
  // that proves it refuses unrecognised flags AND the dispatch statement that
  // short-circuits help/metadata — anchoring on the parsed field (args.help in
  // parseArgs) instead of the dispatch left the whole top level unguarded.
  const ownParser = new Map([['bin/phase23-dev.mjs', {
    permissive: "fail('FLAGS_REQUIRE_EQUALS')",
    shortCircuit: 'if (args.help || args._.length === 0) help();',
    // A DECLARED pure local helper: the launcher must parse its own arguments
    // to KNOW whether help/metadata was requested, so the argument parser is
    // exempt by name. Any other local call is an effect (R4-09).
    pureLocals: ['parseArgs'],
  }]]);;
  const launchers = gitFiles().filter((file) => /^bin\/[^/]+\.mjs$/.test(file) && read(file).includes('guardDevLane('));
  if (launchers.length === 0) fail('DEV_LAUNCHER_SHORT_CIRCUIT_VACUOUS no launcher calls guardDevLane(; the rule found nothing to check');
  for (const file of launchers) {
    const code = read(file);
    const guardAt = code.lastIndexOf('guardDevLane(');
    const guardEnd = code.indexOf('\n', guardAt);
    let shortCircuitAt = -1;
    if (ownParser.has(file)) {
      const parser = ownParser.get(file);
      if (parser === undefined) {
        fail(`DEV_LAUNCHER_PARSER_PERMISSIVE ${file} has no declared own-parser contract`);
        continue;
      }
      if (!code.includes(String(parser.permissive))) fail(`DEV_LAUNCHER_PARSER_PERMISSIVE ${file} is a declared own-parser launcher but no longer refuses unrecognised flags (${String(parser.permissive)} is missing)`);
      shortCircuitAt = code.indexOf(String(parser.shortCircuit), guardEnd);
      if (shortCircuitAt < 0) fail(`DEV_LAUNCHER_NO_SHORT_CIRCUIT ${file} no longer reaches its help/metadata dispatch statement (${String(parser.shortCircuit)} is missing after the DEV guard)`);
    } else {
      const cliAt = code.indexOf('defineOperatorCli(', guardEnd);
      shortCircuitAt = cliAt < 0 ? -1 : code.indexOf('.stop', cliAt);
      if (cliAt < 0) fail(`DEV_LAUNCHER_NO_OPERATOR_CLI ${file} calls guardDevLane( but reaches no defineOperatorCli( after it; a help/metadata query would not short-circuit`);
    }
    if (shortCircuitAt < 0) {
      fail(`DEV_LAUNCHER_NO_SHORT_CIRCUIT ${file} has no help/metadata short-circuit after its DEV guard`);
      continue;
    }
    // R3-12 established a top-level effect scan; R4-09 / review-4 task 2.2 made
    // it SYNTAX-AWARE. The col-0 statement split missed an effect inside a
    // top-level `try` / `if` / block (the whole block was skipped as a control
    // statement), a local call reached through an assignment
    // (`const h = currentHead()`), and the fs mutations outside the write
    // family (`unlinkSync`, `symlinkSync`, …). The scan now walks the parsed
    // top-level statements, descends into every non-declaration statement
    // (blocks, control statements, initializers) and stops at function-like
    // bodies, which do not execute at load time.
    const localNames = new Set([
      ...[...code.matchAll(/^(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/gm)].map((match) => String(match[1])),
      ...[...code.matchAll(/^const\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?\(/gm)].map((match) => String(match[1])),
      ...[...code.matchAll(/^const\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s+)?[A-Za-z_$][\w$.]*\s*=>/gm)].map((match) => String(match[1])),
    ]);
    const pureLocals = new Set(ownParser.get(file)?.pureLocals ?? []);
    for (const name of pureLocals) localNames.delete(name);
    for (const effectText of collectTopLevelEffects(code, guardEnd, shortCircuitAt, localNames)) {
      fail(`DEV_LAUNCHER_EFFECT_BEFORE_SHORT_CIRCUIT ${file} performs an effect at top level between its DEV guard and the help/metadata short-circuit: ${effectText.replace(/\s+/g, ' ').slice(0, 100)}`);
    }
  }
}

export function checkChildProcessBoundaries() {
  // Historical launcher list: still bounds the named high-authority files
  // (timeout/maxBuffer/shell/stdio/env-spread) so HC-001 remains non-vacuous.
  const launchers = [
    "bin/phase7-real.mjs",
    "bin/phase5-real.mjs",
    "bin/phase4-real.mjs",
    "bin/phase2b-real.mjs",
    "bin/phase2c-real.mjs",
    "bin/observe-authenticated.mjs",
    "bin/observe-gate.mjs",
    "bin/observe-canary.mjs",
    "bin/auth-capture.mjs",
    "bin/nightwatch.mjs",
    "bin/nightwatch-agent.mjs",
    "bin/quality-gate.mjs",
    "bin/quality-gate-clean.mjs",
    "bin/planner-handoff-check.mjs",
    "bin/semantic-compat.mjs",
    "bin/phase23-ci.mjs",
    "bin/phase23-dev.mjs",
  ];
  for (const file of launchers) {
    const source = readIncludingComments(file);
    const sourceCode = read(file);
    const spreadLine = lineOfMatch(source, /\.\.\.process\.env/g);
    if (spreadLine > 0)
      fail(`${file}:${spreadLine} spreads the parent process environment`);
    const shellLine = lineOfMatch(source, /shell\s*:\s*true/g);
    if (shellLine > 0) fail(`${file}:${shellLine} enables shell execution`);
    if (!/timeout\s*:/.test(sourceCode))
      fail(`${file} has no bounded child-process timeout`);
    const inheritLine = lineOfMatch(source, /stdio\s*:\s*['"]inherit['"]/g);
    if (inheritLine > 0)
      fail(`${file}:${inheritLine} exposes unbounded child output`);
    if (!/maxBuffer\s*:\s*/.test(sourceCode))
      fail(`${file} has no bounded child output buffer`);
  }

  // NW-AUD-014 — total invocation census (syntax-aware, not a file list).
  const productionFiles = gitFiles()
    .filter(
      (file) =>
        (file.startsWith("src/") || file.startsWith("bin/")) &&
        /\.(?:ts|mjs)$/.test(file),
    )
    .filter((file) => !file.endsWith(".d.ts"))
    .filter((file) => !isRuleEngineSource(file));
  const sources = productionFiles.map((file) => ({
    file,
    source: readIncludingComments(file),
  }));
  const census = buildChildProcessCensus(sources);
  if (census.importFileCount < 10) {
    fail(
      `child-process census found only ${census.importFileCount} import files; discovery is broken rather than the repository clean`,
    );
  }
  if (census.invocationCount < 50) {
    fail(
      `child-process census found only ${census.invocationCount} invocations; discovery is broken rather than the repository clean`,
    );
  }
  if (census.unclassifiedCount !== 0) {
    for (const node of census.unclassified.slice(0, 20)) {
      fail(`child-process census unclassified invocation ${node.identity}`);
    }
    fail(
      `child-process census has ${census.unclassifiedCount} unclassified invocation nodes (NW-AUD-014 totality)`,
    );
  }
  if (census.unresolvedImportCount !== 0) {
    for (const node of census.unresolvedImports.slice(0, 20)) {
      fail(`child-process census unresolved import ${node.identity}`);
    }
    fail(
      `child-process census has ${census.unresolvedImportCount} unresolved import/indirection records (NW-AUD-014 totality)`,
    );
  }
  for (const profile of EXECUTION_PROFILES) {
    if (!Object.hasOwn(census.byProfile, profile)) {
      fail(
        `child-process census profile ${profile} missing from byProfile map`,
      );
    }
  }
  if (!/^sha256:[0-9a-f]{24}$/.test(census.digest)) {
    fail("child-process census digest is malformed");
  }

  // Ambient env spread is forbidden outside the explicit L6 envelope profile.
  for (const node of census.invocations) {
    if (node.spreadsProcessEnv && node.profile !== "CONTAINED_ENVELOPE") {
      fail(
        `${node.identity} spreads parent process.env (profile=${node.profile ?? "NONE"})`,
      );
    }
    if (node.hasShellTrue) fail(`${node.identity} enables shell:true`);
    if (node.usesNpx)
      fail(
        `${node.identity} acquires tools through npx (offline policy forbids download-capable resolution)`,
      );
    if (node.hasInheritStdio && node.profile !== "CONTAINED_ENVELOPE") {
      fail(
        `${node.identity} uses stdio:inherit (authority-bearing children must pipe bounded output)`,
      );
    }
  }

  // Shell-capable exec* spellings remain banned, including Sync variants.
  for (const { file } of sources) {
    if (isRuleEngineSource(file)) continue;
    // Code subject must use read() (comments stripped) per rule-engine soundness.
    const sourceCode = read(file);
    if (
      /import\s*\{[^}]*\bexec(?:File)?(?:Sync)?\b[^}]*\}\s*from\s*['"]node:child_process['"]/.test(
        sourceCode,
      )
    ) {
      fail(
        `${file} imports shell-capable child_process exec/execSync/execFileSync`,
      );
    }
    if (/child_process\.exec(?:File)?(?:Sync)?\s*\(/.test(sourceCode)) {
      fail(`${file} calls child_process.exec* through a dynamic namespace`);
    }
  }

  // F-19. The reasoner call site is the one place a host-supplied string
  // selects a program to run. It must spawn the RESOLVED canonical path with
  // a literal argv array and shell:false, and the launcher must validate the
  // configured value through the shared resolver before handing it over.
  const reasoner = read("src/core/reasoner/cliReasoner.ts");
  if (!/shell\s*:\s*false/.test(reasoner)) {
    fail(
      "src/core/reasoner/cliReasoner.ts must spawn the reasoner with shell:false",
    );
  }
  if (
    !/spawn\(resolved\.executablePath,\s*\[\.\.\.resolved\.argv\]/.test(
      reasoner,
    )
  ) {
    fail(
      "src/core/reasoner/cliReasoner.ts must spawn the resolved executable path with a literal argv array",
    );
  }
  if (/shell\s*:\s*(?:true|process\.env)/.test(reasoner)) {
    fail(
      "src/core/reasoner/cliReasoner.ts must never derive shell execution from configuration",
    );
  }
  const agentLauncher = read("bin/nightwatch-agent.mjs");
  if (!/resolveReasonerExecutable/.test(agentLauncher)) {
    fail(
      "bin/nightwatch-agent.mjs must validate NIGHTWATCH_REASONER_CLI through the shared resolver before spawning",
    );
  }
}

export function checkL6ProcessNetworkBoundary() {
  const l6 = readIncludingComments("src/core/oops/l6.ts");
  const l6Code = read("src/core/oops/l6.ts");
  const processCode = read("src/core/oops/process.ts");
  if (!/nightwatch\.process-network-containment\.v1/.test(l6Code))
    fail("L6 capability is missing its versioned identity");
  for (const option of [
    "--unshare-user",
    "--unshare-net",
    "--unshare-pid",
    "--as-pid-1",
    "--die-with-parent",
    "--new-session",
    "--clearenv",
  ]) {
    if (!l6Code.includes(option))
      fail(`L6 launcher is missing required rootless option ${option}`);
  }
  if (!/--ro-bind/.test(l6Code) || /['"]\/['"]\s*,\s*['"]\/['"]/.test(l6))
    fail("L6 root view is missing or exposes the host root broadly");
  if (
    !/INHERITED_AF_UNIX_ONLY/.test(l6Code) ||
    !/websocketRelayFlow/.test(l6Code) ||
    !/L6_CONTROL_PROTOCOL_VERSION/.test(l6Code) ||
    !/MAX_FRAME_BYTES/.test(l6Code)
  )
    fail("L6 AF_UNIX control protocol is not versioned/bounded");
  if (
    /shell\s*:\s*true/.test(l6) ||
    /--privileged|iptables|nftables|sudo\b|tls\s*mitm/i.test(l6)
  )
    fail("L6 introduces privileged or shell/network-administration authority");
  if (
    !/process\.kill\(-child\.pid/.test(l6Code) ||
    !/--die-with-parent/.test(l6Code)
  )
    fail("L6 process-group/parent-death cleanup is incomplete");
  if (
    !/qualifyL6RuntimeCapability/.test(processCode) ||
    !/assertL6RuntimeCapability/.test(processCode) ||
    !/runL6ContainedOops/.test(processCode)
  )
    fail("authenticated OOPS is not bound to the L6 readiness gate");
  if (
    !/requiredHostClass === 'DEV_API'/.test(processCode) ||
    !/RELAY_EPHEMERAL_DEV_SESSION/.test(processCode)
  )
    fail("authenticated OOPS host/auth classes are not L6-gated");
  const capabilityCode = read("src/core/oops/sandbox.ts");
  if (!/qualifyL6RuntimeCapability/.test(capabilityCode))
    fail("legacy OOPS sandbox status does not expose the current L6 qualifier");
}

export function checkTargetPolicy() {
  for (const file of [
    "bin/phase7-real.mjs",
    "bin/phase5-real.mjs",
    "bin/phase4-real.mjs",
    "bin/phase2b-real.mjs",
    "bin/phase2c-real.mjs",
    "bin/observe-authenticated.mjs",
  ]) {
    if (!/env\s*!==\s*['"]dev['"]/.test(read(file)))
      fail(`${file} does not enforce DEV-only automated credential execution`);
  }
  const captureCode = read("bin/auth-capture.mjs");
  if (
    !/new Set\(\['dev', 'next'\]\)/.test(captureCode) ||
    !/human-led|human login/i.test(captureCode)
  )
    fail("auth:capture NEXT exception is not visibly human-led and explicit");
  for (const file of gitFiles().filter(
    (item) => item.startsWith("bin/") && !isRuleEngineSource(item),
  )) {
    const source = readIncludingComments(file);
    const line = lineOfText(source, "MULTI_HOUR_CAMPAIGN_BUDGET");
    if (line > 0)
      fail(
        `${file}:${line} references the unauthorized multi-hour budget profile`,
      );
  }
}

/**
 * R-11 proxy/gate reliability invariants (OBS-C105-1).
 *
 * Two mechanisms are protected here. First, the port allocator's PRODUCTION
 * path must keep using the real operating-system availability probe: R-11
 * introduced an injectable availability predicate so the adversarial lease
 * cases could be deterministic, and that seam would be worth nothing — worse
 * than nothing — if production could reach it. Second, the authoritative gate
 * must keep persisting its receipt to a confined path, because OBS-C105-1's
 * failing-group detail was destroyed by a filter over the single stdout copy.
 *
 * Every rule below is negative-probed by
 * `tests/unit/gateReceiptPersistence.test.ts`, so none of them is a regex that
 * merely happens to match.
 */
export function checkR11ProxyGateReliability() {
  const lease = readIncludingComments("src/proxy/portLease.ts");
  const leaseSource = withoutComments(lease);

  // The production entry must bind the REAL probe, and must not take an
  // availability parameter that a caller could substitute.
  if (
    !/export function reserveProxyPortLease\(options:\s*\{\s*root\?:\s*string;\s*preferredPort:\s*number\s*\}\)/.test(
      leaseSource,
    )
  ) {
    fail(
      "R-11 reserveProxyPortLease must accept only { root?, preferredPort }; an availability parameter would let a caller bypass the real OS probe",
    );
  }
  if (
    !/return reserveWithAvailability\([^)]*\bportAvailable\)/.test(leaseSource)
  ) {
    fail(
      "R-11 reserveProxyPortLease must pass the real portAvailable probe to the allocator core",
    );
  }
  // The real probe must remain a real TCP bind rather than a stub.
  if (
    !/function portAvailable\(/.test(leaseSource) ||
    !/net\.createServer\(\)/.test(leaseSource) ||
    !/s\.listen\(/.test(leaseSource)
  ) {
    fail("R-11 portAvailable must retain a real loopback TCP bind probe");
  }
  // Allocator safety properties R-11 must not have weakened.
  for (const [pattern, message] of [
    [
      /fs\.openSync\(file,\s*'wx',\s*0o600\)/,
      "exclusive lease creation with owner-only mode",
    ],
    [
      /if \(processAlive\(existing\.pid\)\) continue;/,
      "live-owner detection at the reclaim decision itself — the bare call name also occurs in the inherited-lease branch, so it must be anchored to this call site",
    ],
    [/PROXY_PORT_LEASE_EXHAUSTED/, "bounded search exhaustion"],
    [/const CANDIDATE_COUNT = \d+;/, "a fixed bounded candidate count"],
    [
      /fs\.lstatSync\(file\)/,
      "lstat-based lease inspection so a symlink is never followed",
    ],
    [/current\?\.token === token/, "token ownership on release"],
  ])
    if (!pattern.test(leaseSource))
      fail(`R-11 the port allocator must retain ${message}`);

  // The TEST-ONLY availability seam must be branded and unreachable from
  // anything but tests/**.
  // Comment-text subject: the brand is a comment banner, not an identifier.
  if (
    !/TEST ONLY\. NOT A PRODUCTION AUTHORITY PATH\./.test(
      readCommentText("src/proxy/portLease.ts"),
    )
  ) {
    fail(
      "R-11 the injectable availability seam must be explicitly branded TEST ONLY",
    );
  }
  const seamName = "reserveProxyPortLeaseWithAvailabilityForTest";
  for (const file of gitFiles()) {
    if (!file.endsWith(".ts") && !file.endsWith(".tsx")) continue;
    if (file === "src/proxy/portLease.ts" || file.startsWith("tests/"))
      continue;
    if (new RegExp(seamName).test(read(file))) {
      fail(
        `${file} references the R-11 TEST-ONLY availability seam; only tests/** may use it`,
      );
    }
  }

  // No proxy test may reintroduce a probabilistic port choice. This is the
  // exact defect OBS-C105-1 was: a PID-derived port asserted as a guarantee.
  for (const file of gitFiles()) {
    if (!/^tests\/unit\/(?:phase2[34].*|proxy).*\.test\.ts$/i.test(file))
      continue;
    const source = read(file);
    for (const [pattern, message] of [
      [/\bMath\.random\(\)/, "Math.random()"],
      [/\bDate\.now\(\)\s*[%+*]/, "a Date.now()-derived port"],
      [
        /(?:preferred|port)\w*\s*=\s*[^;\n]*process\.pid/i,
        "a process.pid-derived port",
      ],
    ])
      if (pattern.test(source)) {
        fail(
          `${file} selects a proxy port using ${message}; R-11 forbids probabilistic port selection in proxy tests`,
        );
      }
  }

  // Durable gate receipts.
  const receiptLib = read("bin/lib/gate-receipt.mjs");
  const runner = readIncludingComments("bin/quality-gate.mjs");
  const runnerCode = read("bin/quality-gate.mjs");
  const cleanCode = read("bin/quality-gate-clean.mjs");

  for (const code of [
    "GATE_RECEIPT_PATH_NOT_ABSOLUTE",
    "GATE_RECEIPT_PATH_TRAVERSAL",
    "GATE_RECEIPT_PATH_INSIDE_REPOSITORY",
    "GATE_RECEIPT_PATH_UNCONFINED",
    "GATE_RECEIPT_PATH_PARENT_SYMLINK",
    "GATE_RECEIPT_PATH_DESTINATION_SYMLINK",
    "GATE_RECEIPT_FILE_MALFORMED",
    "GATE_RECEIPT_STALE_HEAD",
  ])
    if (!receiptLib.includes(code))
      fail(
        `R-11 the gate-receipt module must retain the fail-closed code ${code}`,
      );
  // Confinement, not merely validation: an unconfined absolute path would let
  // the gate write anywhere the process can reach.
  if (
    !/function gateReceiptPermittedRoots\(/.test(receiptLib) ||
    !/os\.tmpdir\(\)/.test(receiptLib)
  ) {
    fail(
      "R-11 the gate-receipt module must confine receipt destinations to permitted temporary roots",
    );
  }
  // Atomicity: exclusive create, fsync, rename. A plain writeFileSync would let
  // a reader observe a truncated receipt.
  if (
    !/fs\.openSync\(temporary,\s*'wx',\s*0o600\)/.test(receiptLib) ||
    !/fs\.fsyncSync\(/.test(receiptLib) ||
    !/fs\.renameSync\(temporary,\s*file\)/.test(receiptLib)
  ) {
    fail(
      "R-11 receipt persistence must be an exclusive-create, fsync, atomic-rename write",
    );
  }

  if (!/resolveGateReceiptTarget\(\{\s*repositoryRoot: root/.test(runnerCode)) {
    fail(
      "R-11 the quality gate must resolve and validate its receipt destination against the repository root",
    );
  }
  // Validation must precede execution, so an unsafe path costs no test time and
  // is never discovered only after the evidence already exists.
  if (
    runner.indexOf("resolveGateReceiptTarget(") >
    runner.indexOf("for (const group of definition.groups)")
  ) {
    fail(
      "R-11 the quality gate must validate its receipt destination BEFORE running any group",
    );
  }
  // One canonical string reaches both destinations, so stdout and file cannot drift.
  if (
    !/function emitReceipt\(/.test(runnerCode) ||
    !/const canonicalBytes = JSON\.stringify\(receipt\);/.test(runnerCode) ||
    !/console\.log\(canonicalBytes\)/.test(runnerCode) ||
    !/persistGateReceipt\(target\.file, canonicalBytes\)/.test(runnerCode)
  ) {
    fail(
      "R-11 the quality gate must emit ONE canonical receipt string to both stdout and the persisted file",
    );
  }
  if ((runner.match(/console\.log\(/g) ?? []).length !== 1) {
    fail("R-11 the quality gate must write nothing but the receipt to stdout");
  }
  // Anchored to the list, not the bare name: the identifier also appears in the
  // import statement, so an unanchored match stays true with the entry deleted.
  // R4-10 / review-4 task 3.1: the child-environment construction (and with it
  // the forbidden-key list) moved into bin/lib/gate-child-environment.mjs so it
  // is testable in isolation; the anchors follow it.
  const gateChildEnvCode = read('bin/lib/gate-child-environment.mjs');
  if (
    !/FORBIDDEN_ENVIRONMENT_KEYS = Object\.freeze\(\[[\s\S]{0,800}?GATE_RECEIPT_PATH_ENV,[\s\S]{0,200}?\]\);/.test(
      gateChildEnvCode,
    ) ||
    !/for \(const key of FORBIDDEN_ENVIRONMENT_KEYS\) delete environment\[key\];/.test(
      gateChildEnvCode,
    )
  ) {
    fail(
      "R-11 the quality gate must strip the receipt-path variable from child environments so a child cannot overwrite the run receipt",
    );
  }
  if (!/RECEIPT_PERSISTENCE_FAILED/.test(runnerCode)) {
    fail(
      "R-11 a receipt that cannot be persisted must fail the gate rather than pass quietly",
    );
  }

  if (!/readPersistedGateReceipt\(receiptFile/.test(cleanCode)) {
    fail(
      "R-11 the clean-checkout gate must consume the structured receipt file rather than scraping stdout",
    );
  }
  if (!/GATE_RECEIPT_DIGEST_MISMATCH/.test(cleanCode)) {
    fail(
      "R-11 the clean-checkout gate must fail closed when the file and stdout receipts disagree",
    );
  }
  // The destination must live outside the disposable clone, or writing it would
  // dirty the very checkout the clean gate measures.
  if (
    !/mkdtempSync\(path\.join\(os\.tmpdir\(\), 'nightwatch-clean-gate-receipt-'\)\)/.test(
      cleanCode,
    )
  ) {
    fail(
      "R-11 the clean-checkout gate must place its inner receipt outside the disposable clone",
    );
  }
}

/**
 * C-11 `PROD_OBSERVE` boundary invariants.
 *
 * The kernel's value is that production is unreachable unless every authority
 * grants it, so the rules that matter are the ones a future change could
 * silently break: the separation of the production decision path from the
 * DEV/NEXT one (F-11, F-12), the independence of the production allowlist from
 * the deny table (F-10), the external-only configuration (F-09), and D-4.
 *
 * Separation is a property of the IMPORT GRAPH, not of the entry point, so
 * these rules read imports rather than trusting a launcher boundary. Every one
 * is negative-probed.
 */
export function checkC11ProdObserveBoundary() {
  const coneDirectory = "src/core/prodObserve";
  const coneFiles = gitFiles().filter(
    (file) => file.startsWith(`${coneDirectory}/`) && file.endsWith(".ts"),
  );
  if (coneFiles.length === 0) {
    fail("C-11 the PROD_OBSERVE cone is missing");
    return;
  }

  // --- F-12: the production cone may not import the DEV/NEXT/real-run cones ---
  const forbiddenInProductionCone = [
    [
      /from\s+['"][^'"]*safety\/realRunGate['"]/,
      "the generic real-run decision path",
    ],
    [/from\s+['"][^'"]*safety\/hosts['"]/, "the production deny table (F-10)"],
    [/from\s+['"][^'"]*safety\/canary['"]/, "the DEV canary"],
    // Patterns must match a RELATIVE import too: `../phase22/manifest` is the
    // same module as `core/phase22/manifest`, and requiring the `core/` segment
    // let the relative form through.
    [/from\s+['"][^'"]*phase22\//, "the DEV campaign orchestrator"],
    [/from\s+['"][^'"]*phase23\//, "the DEV acceptance manifest"],
    [/from\s+['"][^'"]*\/environment(?:\/|['"])/, "the DEV environment loader"],
    [/from\s+['"][^'"]*browser\//, "the browser cone"],
    [/from\s+['"][^'"]*campaign\//, "the campaign execution path"],
  ];
  for (const file of coneFiles) {
    const source = read(file);
    for (const [pattern, description] of forbiddenInProductionCone) {
      if (pattern.test(source))
        fail(
          `${file} imports ${description}; the C-11 production cone must stay import-isolated from it`,
        );
    }
    // No dispatcher anywhere in the cone: the kernel DECIDES and cannot contact
    // anything even if every gate were bypassed.
    for (const [pattern, description] of [
      [/from\s+['"]node:https?['"]/, "an HTTP client"],
      [/from\s+['"]node:net['"]/, "a socket client"],
      [/from\s+['"]node:dns['"]/, "a DNS resolver"],
      [/\bfetch\s*\(/, "fetch()"],
      [/storageState/, "a storage-state path"],
    ])
      if (pattern.test(source))
        fail(
          `${file} contains ${description}; the C-11 production cone must contain no network or credential path`,
        );
  }

  // --- F-12, the other direction: the DEV/NEXT cone may not import production policy ---
  for (const file of gitFiles()) {
    if (
      !file.endsWith(".ts") ||
      file.startsWith("tests/") ||
      file.startsWith(`${coneDirectory}/`)
    )
      continue;
    const source = read(file);
    if (/from\s+['"][^'"]*core\/prodObserve/.test(source)) {
      fail(
        `${file} imports the C-11 production authorization machinery; only the production cone and tests/** may reach it`,
      );
    }
  }

  // --- F-11: realRunGate gains no production branch and no mode parameter ---
  const realRunGate = read("src/core/safety/realRunGate.ts");
  // Anchored to the DECLARATION and the guarded call site. The bare name
  // appears in both, so matching it alone stayed true when the declaration was
  // renamed away — the DEF-R11-1 vacuity class.
  if (
    !/function isProductionClassHost\(host: string\): boolean/.test(
      realRunGate,
    ) ||
    !/if \(isProductionClassHost\(normalized\)\)/.test(realRunGate)
  ) {
    fail(
      "F-11: realRunGate must keep refusing production-class hosts at its guarded call site",
    );
  }
  if (/PROD_OBSERVE|prodObserve|productionRunGate/.test(realRunGate)) {
    fail(
      "F-11: realRunGate must gain no PROD_OBSERVE branch; the production decision belongs to a separate kernel",
    );
  }
  if (/\bmode\s*[:?]/.test(realRunGate)) {
    fail(
      "F-11: realRunGate must take no mode parameter; parameterizing it would destroy the DEV guard for every existing campaign",
    );
  }

  // --- the chain is a named identity, not a count ---
  const types = readIncludingComments(`${coneDirectory}/types.ts`);
  const typesCode = read(`${coneDirectory}/types.ts`);
  if (
    !/PRODUCTION_ADMISSION_CHAIN_VERSION = 'nightwatch\.production-admission-chain\.v1'/.test(
      typesCode,
    )
  ) {
    fail("C-11 the admission chain must be versioned");
  }
  // Anchored to the export, because the bare identifier is a prefix of any
  // renamed variant such as `HISTORICAL_GATE_MAPPING_REMOVED`.
  if (!/export const HISTORICAL_GATE_MAPPING:/.test(typesCode)) {
    fail(
      "C-11 the mapping from the historical G0-G11 identifiers must stay machine-checkable in source",
    );
  }
  const gateBlock =
    /PRODUCTION_ADMISSION_GATES = \[([\s\S]*?)\] as const;/.exec(types);
  if (gateBlock === null) {
    fail("C-11 the ordered gate list must be a literal const array");
  } else {
    for (const gate of [
      "G_KILL_SWITCH_ENTRY",
      "G_OWNER_AUTHORIZATION",
      "G_AUTHORIZATION_CLASS",
      "G_CONFIGURATION_INTEGRITY",
      "G_ORGANIZATION_WINDOW",
      "G_OBSERVER_IDENTITY",
      "G_SOURCE_CURRENCY",
      "G_READ_ONLY_PROOF",
      "G_ROUTE_AUTHORITY",
      "G_HOST_ADMISSION",
      "G_ADDRESS_POLICY",
      "G_METHOD_AND_BODY",
      "G_PARAMETER_PROVENANCE",
      "G_PRIVACY_CAPABILITY",
      "G_CONTAINMENT_READINESS",
      "G_BUDGET_RESERVATION",
      "G_BREAKER_STATE",
      "G_KILL_SWITCH_PREDISPATCH",
    ])
      if (!gateBlock[1].includes(`'${gate}'`))
        fail(`C-11 the admission chain is missing the required gate ${gate}`);
    // Configuration integrity supplies the window, so it must precede it or the
    // integrity gate becomes unfalsifiable.
    if (
      gateBlock[1].indexOf("'G_CONFIGURATION_INTEGRITY'") >
      gateBlock[1].indexOf("'G_ORGANIZATION_WINDOW'")
    ) {
      fail(
        "C-11 G_CONFIGURATION_INTEGRITY must precede G_ORGANIZATION_WINDOW: the window is read from the config",
      );
    }
  }

  // --- the kill switch is evaluated twice, and the second time is pre-dispatch ---
  const gate = read(`${coneDirectory}/productionRunGate.ts`);
  if ((gate.match(/evaluateKillSwitch\(/g) ?? []).length < 2) {
    fail(
      "C-11 the kill switch must be evaluated at qualification entry AND immediately before dispatch",
    );
  }
  // Reserve BEFORE dispatch: the reservation must be taken inside the chain.
  if (!/input\.budget\.reserve\(/.test(gate)) {
    fail(
      "C-11 the budget reservation must be taken inside the admission chain, before any dispatch",
    );
  }
  // Route authority must delegate to the C-10.5 guard rather than re-deciding.
  if (!/assertSourceProvenRoute\(/.test(gate)) {
    fail("C-11 route authority must consume the C-10.5 source-bound guard");
  }
  // No default policy: a shared module that falls back is a silent allow.
  if (
    !/privacyPolicy: PrivacyPolicy \| null/.test(gate) ||
    !/PRIVACY_CAPABILITY_ABSENT/.test(gate)
  ) {
    fail(
      "C-11 the privacy policy must be explicitly injected with no default, and a missing policy must deny",
    );
  }

  // --- F-09: the observation config is external-only and never in-repo ---
  const config = read(`${coneDirectory}/observationConfig.ts`);
  for (const code of [
    "CONFIG_PATH_NOT_ABSOLUTE",
    "CONFIG_INSIDE_REPOSITORY",
    "CONFIG_INSIDE_WORKSPACE",
    "CONFIG_SYMLINK",
    "CONFIG_MODE_NOT_OWNER_ONLY",
  ]) {
    if (!config.includes(code))
      fail(
        `C-11 the external observation config loader must retain the fail-closed code ${code}`,
      );
  }
  for (const file of gitFiles()) {
    // An in-repo loadable production host list would substitute a naming
    // convention for D-4's structural property.
    if (/^config\/observation\//.test(file))
      fail(
        `${file} is an in-repo production observation config; F-09 requires external-only`,
      );
  }

  // --- D-4 stands ---
  const environment = read("src/core/environment/index.ts");
  if (
    !/SUPPORTED_ENVIRONMENTS: readonly EnvironmentName\[\] = \['local', 'dev', 'next'\]/.test(
      environment,
    )
  ) {
    fail("D-4: SUPPORTED_ENVIRONMENTS must remain exactly local, dev, next");
  }
  const decisions = readDataFile("docs/DECISIONS.md");
  if (
    !decisions.includes(
      "## D-4 — Allowlist-only environments; `production.json` documents the rejected surface",
    ) ||
    !decisions.includes("Only `local`, `dev`, `next` are selectable.")
  ) {
    fail("D-4: the decision text must remain intact");
  }
}

/**
 * MA-8 / F-13 P1 observation-scope invariants.
 *
 * The P1 cone (`src/core/prodObserveP1/`) is a sibling of the C-11 cone, never
 * a member: C-11's boundary asserts its cone's contents and reverse-isolation,
 * so P1 lives beside it and this check guards both the P1 properties and the
 * absence of coupling in either direction.
 */
export function checkP1ObservationScopeBoundary() {
  const coneDirectory = "src/core/prodObserveP1";
  const coneFiles = gitFiles().filter(
    (file) => file.startsWith(`${coneDirectory}/`) && file.endsWith(".ts"),
  );
  if (coneFiles.length === 0) {
    fail("MA-8 the P1 observation-scope cone is missing");
    return;
  }

  // --- F-12: the P1 cone may not import the request, DEV/NEXT, browser, or campaign cones ---
  // Patterns must match a RELATIVE import too (the DEF-C11-3 vacuity class).
  const forbiddenInP1Cone = [
    [
      /from\s+['"][^'"]*prodObserve[^P][^'"]*['"]/,
      "the C-11 request chain (F-12 both directions)",
    ],
    [
      /from\s+['"][^'"]*\.\.\/prodObserve(\/[^'"]*)?['"]/,
      "the C-11 request chain by relative import",
    ],
    [
      /from\s+['"][^'"]*safety\/realRunGate['"]/,
      "the generic real-run decision path",
    ],
    [/from\s+['"][^'"]*phase22\//, "the DEV campaign orchestrator"],
    [/from\s+['"][^'"]*phase23\//, "the DEV acceptance manifest"],
    [/from\s+['"][^'"]*\/environment(?:\/|['"])/, "the DEV environment loader"],
    [/from\s+['"][^'"]*browser\//, "the browser cone"],
    [/from\s+['"][^'"]*campaign\//, "the campaign execution path"],
  ];
  for (const file of coneFiles) {
    const source = read(file);
    for (const [pattern, description] of forbiddenInP1Cone) {
      if (pattern.test(source))
        fail(
          `${file} imports ${description}; the P1 cone must stay import-isolated from it`,
        );
    }
    // No dispatcher, navigator, actuator, or credential path anywhere in the
    // cone: the observer DECIDES and OBSERVES and cannot contact or mutate
    // anything even if every gate were bypassed.
    for (const [pattern, description] of [
      [/from\s+['"]node:https?['"]/, "an HTTP client"],
      [/from\s+['"]node:net['"]/, "a socket client"],
      [/from\s+['"]node:dns['"]/, "a DNS resolver"],
      [/\bfetch\s*\(/, "fetch()"],
      [/\.goto\(/, "a navigation primitive"],
      [/\.click\(/, "a click primitive"],
      [/storageState/, "a storage-state path"],
      [/replayExecutor/i, "a replay executor"],
    ])
      if (pattern.test(source))
        fail(
          `${file} contains ${description}; the P1 cone must contain no traffic, actuation, replay, or credential path`,
        );
  }

  // --- F-12, the other direction: only the P1 cone, the offline rehearsal
  // cone, and tests may reach P1 machinery. The rehearsal cone is the single
  // authorized local consumer (FC-1): it drives the real admission/session/
  // attribution core against mock edges and is itself constrained by
  // checkC12RehearsalBoundary below. ---
  for (const file of gitFiles()) {
    if (
      !file.endsWith(".ts") ||
      file.startsWith("tests/") ||
      file.startsWith(`${coneDirectory}/`) ||
      file.startsWith("src/core/c12Rehearsal/")
    )
      continue;
    const source = read(file);
    if (/from\s+['"][^'"]*core\/prodObserveP1/.test(source)) {
      fail(
        `${file} imports the P1 observation-scope machinery; only the P1 cone, src/core/c12Rehearsal/, and tests/** may reach it`,
      );
    }
  }

  // --- the C-11 cone must not reach back into P1: no coupling either way ---
  for (const file of gitFiles()) {
    if (!file.endsWith(".ts") || !file.startsWith("src/core/prodObserve/"))
      continue;
    const source = read(file);
    if (/from\s+['"][^'"]*prodObserveP1/.test(source)) {
      fail(`${file} imports the P1 cone; C-11 stays decoupled from P1`);
    }
  }

  // --- the chain is a named identity, not a count ---
  const types = readIncludingComments(`${coneDirectory}/types.ts`);
  const typesCode = read(`${coneDirectory}/types.ts`);
  if (
    !/P1_OBSERVATION_SCOPE_CHAIN_VERSION = 'nightwatch\.p1-observation-scope\.v1'/.test(
      typesCode,
    )
  ) {
    fail("MA-8 the P1 observation-scope chain must be versioned");
  }
  const gateBlock =
    /P1_OBSERVATION_SCOPE_GATES = \[([\s\S]*?)\] as const;/.exec(types);
  if (gateBlock === null) {
    fail("MA-8 the P1 ordered gate list must be a literal const array");
  } else {
    for (const gate of [
      "P1_KILL_SWITCH_ENTRY",
      "P1_OWNER_AUTHORIZATION",
      "P1_AUTHORIZATION_CLASS",
      "P1_CONFIGURATION_INTEGRITY",
      "P1_IMPLEMENTATION_IDENTITY",
      "P1_PQ_BINDING",
      "P1_SUBJECT_PRESENCE",
      "P1_SUBJECT_PROVENANCE",
      "P1_HOST_ADMISSION",
      "P1_OBSERVATION_WINDOW",
      "P1_OBSERVER_IDENTITY",
      "P1_PRIVACY_CAPABILITY",
      "P1_EVIDENCE_DESTINATION",
      "P1_ATTRIBUTION_CAPABILITY",
      "P1_KILL_SWITCH_PREATTACH",
    ])
      if (!gateBlock[1].includes(`'${gate}'`))
        fail(
          `MA-8 the P1 observation-scope chain is missing the required gate ${gate}`,
        );
    // Configuration integrity supplies the window AND the implementation
    // binding, so it must precede both or those gates become unfalsifiable
    // (the DEF-C11-1 / DEF-P1-1 class).
    if (
      gateBlock[1].indexOf("'P1_CONFIGURATION_INTEGRITY'") >
      gateBlock[1].indexOf("'P1_IMPLEMENTATION_IDENTITY'")
    ) {
      fail(
        "MA-8 P1_CONFIGURATION_INTEGRITY must precede P1_IMPLEMENTATION_IDENTITY: the binding is read from the config",
      );
    }
    if (
      gateBlock[1].indexOf("'P1_CONFIGURATION_INTEGRITY'") >
      gateBlock[1].indexOf("'P1_OBSERVATION_WINDOW'")
    ) {
      fail(
        "MA-8 P1_CONFIGURATION_INTEGRITY must precede P1_OBSERVATION_WINDOW: the window is read from the config",
      );
    }
  }
  // Per-gate denial codes stay confined: the map must cover every gate.
  if (
    !/export const P1_GATE_DENIAL_CODES: Readonly<\s*Record<P1ObservationScopeGate, readonly P1ObservationDenialCode\[\]>\s*>/.test(
      typesCode,
    )
  ) {
    fail(
      "MA-8 the P1 per-gate denial-code map must stay a total Record over the gate union",
    );
  }

  // --- the kill switch is evaluated at entry, before attach, AND while attached ---
  const observer = read(`${coneDirectory}/observer.ts`);
  if ((observer.match(/evaluateP1KillSwitch\(/g) ?? []).length < 2) {
    fail(
      "MA-8 the kill switch must be evaluated at P1 admission entry AND immediately before attach",
    );
  }
  const session = read(`${coneDirectory}/session.ts`);
  if ((session.match(/evaluateP1KillSwitch\(/g) ?? []).length < 2) {
    fail(
      "MA-8 the kill switch must be evaluated at attach AND on every observation poll",
    );
  }

  // --- sessions are triply bounded, or a stalled observer runs forever ---
  if (
    !/P1_SESSION_BOUNDS_INVALID/.test(session) ||
    !/maxEvents/.test(session) ||
    !/maxPolls/.test(session)
  ) {
    fail(
      "MA-8 the P1 session must enforce event, poll, and deadline bounds with a categorical refusal",
    );
  }

  // --- attribution fails closed: UNKNOWN and Nightwatch-attributable traffic never pass ---
  const attribution = read(`${coneDirectory}/attribution.ts`);
  for (const token of [
    "NIGHTWATCH_ATTRIBUTABLE",
    "ATTRIBUTION_UNKNOWN",
    "NIGHTWATCH_TRAFFIC_DETECTED",
    "PASSIVE_OBSERVATION_COMPLETE",
    "isP1SessionPass",
  ]) {
    if (!attribution.includes(token))
      fail(`MA-8 the attribution model must retain ${token}`);
  }

  // --- F-09 for P1: the scope config is external-only and never in-repo ---
  const scopeConfig = read(`${coneDirectory}/scopeConfig.ts`);
  for (const code of [
    "P1_CONFIG_PATH_NOT_ABSOLUTE",
    "P1_CONFIG_INSIDE_REPOSITORY",
    "P1_CONFIG_INSIDE_WORKSPACE",
    "P1_CONFIG_SYMLINK",
    "P1_CONFIG_MODE_NOT_OWNER_ONLY",
    "P1_CONFIG_HOST_INVALID",
    "P1_CONFIG_DESTINATION_INVALID",
  ]) {
    if (!scopeConfig.includes(code))
      fail(
        `MA-8 the external P1 scope config loader must retain the fail-closed code ${code}`,
      );
  }
  for (const file of gitFiles()) {
    if (/^config\/p1scope\//.test(file))
      fail(
        `${file} is an in-repo P1 scope config; F-09 requires external-only`,
      );
  }
}

/**
 * NW-AUD-020 Step 7 — TOTAL semantic transport authority.
 *
 * The census discovers every authority-bearing effect site (browser route
 * continuation, WebSocket establishment, CDP Fetch continuation, net/tls
 * dials, relay fetch/forwarding, http(s) clients) — not selected
 * filenames — and binds each to exactly one closed authority class. On top
 * of totality, the REAL protections are pinned by their actual code: the
 * L1 admission gate and its pre-continue ordering, the absence of a
 * passive-unknown authority relabel, generation binding, WebSocket
 * admission, redirect method binding at L0, settlement-after-deterministic
 * ordering, bootstrap method bounding, ticket/tunnel bounds, proxy
 * capability gates, and relay composition.
 */
export function checkSemanticTransportTotality() {
  const subjects = gitFiles()
    .filter((file) => file.startsWith("src/") || file.startsWith("tests/"))
    .filter((file) => /\.(?:ts|mjs)$/.test(file))
    .filter((file) => !file.endsWith(".d.ts"));
  const census = buildTransportEffectCensus(
    subjects.map((file) => ({ file, source: read(file) })),
  );
  for (const violation of census.violations) {
    fail(
      `transport census ${violation.code}: ${violation.file} :: ${violation.detail}`,
    );
  }
  if (census.siteCount < 40) {
    fail(
      `transport census found only ${census.siteCount} effect sites; discovery is broken rather than the repository clean`,
    );
  }
  if (census.classifiedCount !== census.siteCount) {
    fail(
      `transport census classified ${census.classifiedCount} of ${census.siteCount} effect sites; totality violated`,
    );
  }
  if ((census.byClass.SEMANTIC_ADMISSION ?? 0) < 4) {
    fail(
      `transport census found only ${census.byClass.SEMANTIC_ADMISSION} semantically-admitted sites; the browser/proxy gates vanished`,
    );
  }
  if (!/^sha256:[0-9a-f]{24}$/.test(census.digest))
    fail("transport census digest is malformed");
  for (const klass of EFFECT_CLASSES) {
    if (!Object.hasOwn(census.byClass, klass)) {
      fail(`transport census class map is missing ${klass}`);
    }
  }

  const observer = read("src/browser/observers/networkObserver.ts");
  const gateAt = observer.indexOf("if (!apiGate.admitted)");
  const continueAt = observer.indexOf("await route.continue();", gateAt);
  if (gateAt < 0) fail("L1 pre-effect semantic admission gate is missing");
  if (continueAt < 0 || continueAt < gateAt)
    fail("admission must be evaluated BEFORE route.continue");
  if (/journeyIntent === null \? null : admitApiRequest/.test(observer)) {
    fail(
      "passive/no-intent relabel was reintroduced as continuation authority (NW-AUD-020 defect A)",
    );
  }
  if (!observer.includes("ADMISSION_GENERATION_CLOSED"))
    fail("request admission lost its generation binding");
  if (!observer.includes("gate = admitApiRequest(rawUrl, 'WS'"))
    fail("WebSocket establishment bypassed semantic admission");
  if (!observer.includes("bootstrapTable.consume("))
    fail("bootstrap exemption spend is missing");
  if (
    !observer.includes("NAV_BOOTSTRAP_SETTLEMENT_MS") ||
    !observer.includes("NAV_SETTLEMENT_MAX_REARMS")
  ) {
    fail("navigation settlement must be bounded (window + hard re-arm cap)");
  }

  const guard = read("src/browser/network/fetchGuard.ts");
  const methodPins = (guard.match(/p\.request\.method/g) ?? []).length;
  if (methodPins < 2)
    fail("redirect admission dropped METHOD binding at the CDP backstop");
  if (!guard.includes("const admission = isRedirectFollowUp"))
    fail("CDP follow-up path downgraded to host-only authority");
  if (!guard.includes("Fetch.failRequest"))
    fail("CDP backstop cannot fail a request before effect");

  const engine = read("src/core/journeys/engine.ts");
  const sleepAt = engine.indexOf("await sleep(ACTION_SETTLE_MS);");
  const endAt = engine.indexOf(
    "ctx.network.endJourneyIntent(step.stepId);",
    sleepAt,
  );
  const requiredAt = engine.indexOf(
    "waitForRequiredNetwork(ctx, step",
    sleepAt,
  );
  if (sleepAt < 0 || requiredAt < 0 || endAt < requiredAt) {
    fail(
      "causality must settle after deterministic bounded settlement, never at the pacing sleep (NW-AUD-020 defect B)",
    );
  }

  const bootstrap = read("src/core/safety/bootstrapExemptions.ts");
  for (const required of [
    "BOOTSTRAP_EXEMPTION_METHOD_NOT_READ_ONLY",
    "BOOTSTRAP_EXEMPTION_PATTERN_UNANCHORED",
    "BOOTSTRAP_UNREGISTERED",
  ]) {
    if (!bootstrap.includes(required))
      fail(`bootstrap exemptions lost the ${required} refusal`);
  }

  const tickets = read("src/core/safety/admissionTickets.ts");
  for (const required of [
    "PROXY_ADMISSION_TICKET_MISSING",
    "PROXY_TUNNEL_CAPABILITY_MISSING",
    "PROXY_TUNNEL_BUDGET_EXCEEDED",
    "MAX_TUNNELS_PER_HOST",
  ]) {
    if (!tickets.includes(required))
      fail(`admission tickets lost the ${required} bound`);
  }

  const proxy = read("src/proxy/server.ts");
  const capabilityGates = (proxy.match(/apiHostTarget\(opts\.policy/g) ?? [])
    .length;
  if (capabilityGates < 3)
    fail(
      `proxy has ${capabilityGates}/3 API capability gates (forward, connect, upgrade)`,
    );
  if (!proxy.includes("admissionTicketLedger().consume"))
    fail("proxy forwards without consuming admission tickets");
  if (!proxy.includes("authorizeTunnel("))
    fail("CONNECT established without tunnel capability binding");

  const relay = read("src/api/phase5/relay.ts");
  if (!relay.includes("!options.admission(target, 'GET').admitted"))
    fail("relay lost its semantic admission composition");
  if (!relay.includes("SEMANTIC_ADMISSION_REFUSED"))
    fail("relay refusal is no longer categorical");
  if (!relay.includes("requires semantic admission"))
    fail("dev-mode relay may start without semantic admission authority");
}
