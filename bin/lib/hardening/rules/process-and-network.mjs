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
import {
  buildChildProcessCensus,
  EXECUTION_PROFILES,
} from "../../childProcessCensus.mjs";
import {
  buildTransportEffectCensus,
  EFFECT_CLASSES,
} from "../../transportEffectCensus.mjs";

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
  if (
    !/FORBIDDEN_ENVIRONMENT_KEYS = Object\.freeze\(\[[\s\S]{0,800}?GATE_RECEIPT_PATH_ENV,[\s\S]{0,200}?\]\);/.test(
      runnerCode,
    ) ||
    !/for \(const key of FORBIDDEN_ENVIRONMENT_KEYS\) delete environment\[key\];/.test(
      runnerCode,
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
