#!/usr/bin/env node
// @ts-check

/**
 * Invariant family: Alphaus-facing surface boundaries.
 *
 * Protobuf, gRPC topology, frontend consumers, universe admission, deployment
 * binding, the Alphaus handoff and the C-12 rehearsal boundary. The shared
 * property is that reading a sibling Alphaus repository stays read-only,
 * path-confined and non-authoritative, and that no rehearsal artefact can read
 * as live readiness.
 */

import {
  fail,
  withoutComments,
  readIncludingComments,
  read,
  gitFiles,
} from '../kernel.mjs';

/**
 * AH-1 finding-handoff and C-12 readiness invariants.
 *
 * Two new pure cones: `src/core/alphausHandoff/` (BugDossier projection to a
 * human-review artifact) and `src/core/c12Readiness/` (local-only advisory
 * preflight). Both must stay import-isolated, transport-free, and free of
 * any external-submission or bounty-scoring surface.
 */
export function checkAlphausHandoffBoundary() {
  const cones = ['src/core/alphausHandoff', 'src/core/c12Readiness'];
  for (const coneDirectory of cones) {
    const coneFiles = gitFiles().filter((file) => file.startsWith(`${coneDirectory}/`) && file.endsWith('.ts'));
    if (coneFiles.length === 0) {
      // TOTALITY: report every missing cone, not only the first.
      fail(`AH-1 the ${coneDirectory} cone is missing`);
      continue;
    }
    for (const file of coneFiles) {
      const source = read(file);
      for (const [pattern, description] of [
        [/from\s+['"]node:(?:net|http|https|dns|child_process|fs|os|path|url|util|events|stream|worker_threads)[^'"]*['"]/, 'a network/process/filesystem runtime import (any subpath)'],
        [/from\s+['"]child_process[^'"]*['"]/, 'a bare child_process import (no node: prefix)'],
        [/import\s*\(\s*['"]node:[^'"]+['"]\s*\)/, 'a dynamic runtime import'],
        [/\brequire\s*\(\s*['"]/, 'a require() call'],
        [/\bundici\b|\bWebSocket\s*\(|\bXMLHttpRequest\s*\(/, 'a global transport constructor'],
        [/from\s+['"][^'"]*browser\//, 'the browser cone'],
        [/from\s+['"][^'"]*campaign\//, 'the campaign execution path'],
        [/from\s+['"][^'"]*auth\//, 'the auth cone'],
        [/from\s+['"][^'"]*prodObserveP1/, 'the P1 machinery (preflight/handoff stay decoupled; tests may still import P1)'],
        [/from\s+['"][^'"]*core\/prodObserve[^P]/, 'the C-11 request chain'],
        [/\bfetch\s*\(/, 'fetch()'],
        [/storageState/, 'a storage-state path'],
        [/from\s+['"][^'"]*(slack|leslie|pondr)[^'"]*['"]/i, 'an external submission import'],
        [/(Slack|Leslie|Pondr)(Client|Webhook|Api|API|Message|Ticket|Issue)|postTo(Slack|Leslie|Pondr)|file(Leslie|Pondr|Slack)Report|create(GitHub|Slack|Pondr)(Issue|Message|Task)/, 'an external submission connector'],
        [/expectedPoints|estimatedReward|rewardTier|bountyPoints|bountyScore|calculateBounty|bountyCalculator/i, 'a bounty-scoring surface'],
      ]) if (pattern.test(source)) fail(`${file} contains ${description}; the AH-1 cones must stay isolated from it`);
    }
  }
  const handoffTypes = read('src/core/alphausHandoff/types.ts');
  const handoff = read('src/core/alphausHandoff/handoff.ts');
  if (!handoff.includes('BugDossier')) fail('AH-1 the handoff must project the canonical BugDossier, not a parallel finding model');
  for (const token of ['nightwatch.alphaus-finding-handoff.v1']) {
    if (!handoff.includes(token) && !handoffTypes.includes(token)) fail(`AH-1 the handoff cone must retain ${token}`);
  }
  // Literal VALUES, not mere token presence: a dummy 'PROHIBITED' string
  // elsewhere must not satisfy this while the authority block is weakened.
  for (const literal of ['humanReviewRequired: true', 'executable: false', "externalPublication: 'PROHIBITED'", 'autoFile: false', 'autoApprove: false']) {
    if (!handoff.includes(literal)) fail(`AH-1 the handoff authority block must retain the literal ${literal}`);
  }
  const preflightTypes = read('src/core/c12Readiness/types.ts');
  const preflight = read('src/core/c12Readiness/preflight.ts');
  for (const token of ['BLOCKED_DEPLOYMENT_FACT', 'BLOCKED_OPERATOR_SUBJECT', 'nightwatch.c12-readiness.v1']) {
    if (!preflight.includes(token) && !preflightTypes.includes(token)) fail(`AH-1 the preflight cone must retain ${token}`);
  }
  if (/consumeP1ObserveGrant|issueP1ObserveGrant|loadP1ScopeConfig/.test(preflight)) {
    fail('AH-1 the preflight must inspect descriptors only; it never consumes grants or loads live scope configs');
  }
  for (const file of gitFiles()) {
    if (!file.endsWith('.ts') || file.startsWith('tests/') || file.startsWith('src/core/alphausHandoff/') || file.startsWith('src/core/c12Readiness/')) continue;
    const source = read(file);
    if (/from\s+['"][^'"]*core\/(alphausHandoff|c12Readiness)/.test(source)) {
      fail(`${file} imports AH-1 machinery; only the AH-1 cones and tests/** may reach it`);
    }
  }
}

export function checkC12RehearsalBoundary() {
  const coneDirectory = 'src/core/c12Rehearsal';
  const coneFiles = gitFiles().filter((file) => file.startsWith(`${coneDirectory}/`) && file.endsWith('.ts'));
  if (coneFiles.length === 0) {
    fail('FC-1 the C-12 offline-rehearsal cone is missing');
    return;
  }
  for (const file of coneFiles) {
    const source = read(file);
    for (const [pattern, description] of [
      [/from\s+['"]node:(?:net|http|https|dns|child_process|fs|os|path|url|util|events|stream|worker_threads)[^'"]*['"]/, 'a network/process/filesystem runtime import (any subpath)'],
      [/from\s+['"]child_process[^'"]*['"]/, 'a bare child_process import (no node: prefix)'],
      [/import\s*\(\s*['"]node:[^'"]+['"]\s*\)/, 'a dynamic runtime import'],
      [/\brequire\s*\(\s*['"]/, 'a require() call'],
      [/\bfetch\s*\(/, 'fetch()'],
      [/\.goto\(/, 'a navigation primitive'],
      [/\.click\(/, 'a click primitive'],
      [/storageState/, 'a storage-state path'],
      [/from\s+['"][^'"]*browser\//, 'the browser cone'],
      [/from\s+['"][^'"]*campaign\//, 'the campaign execution path'],
      [/from\s+['"][^'"]*core\/prodObserve[^P]/, 'the C-11 request chain'],
      [/from\s+['"][^'"]*core\/(alphausHandoff|c12Readiness)/, 'an AH-1 cone import (versions stay deliberate literal duplicates)'],
      [/from\s+['"][^'"]*(slack|leslie|pondr)[^'"]*['"]/i, 'an external submission import'],
      [/expectedPoints|estimatedReward|rewardTier|bountyPoints|bountyScore|calculateBounty|bountyCalculator/i, 'a bounty-scoring surface'],
    ]) if (pattern.test(source)) fail(`${file} contains ${description}; the rehearsal cone must stay local-only`);
  }
  const rehearsal = read(`${coneDirectory}/rehearsal.ts`);
  // Occurrence-complete, not merely present: a surviving safe literal on one
  // return path must not license an unsafe one on another (mutation M13).
  for (const [file, source] of [['rehearsal.ts', rehearsal], ['types.ts', read(`${coneDirectory}/types.ts`)]]) {
    for (const assignment of source.match(/liveAuthorization\s*:\s*'[^']*'/g) ?? []) {
      if (!assignment.endsWith("'NOT_CONFERRED_SYNTHETIC_ONLY'")) {
        fail(`${coneDirectory}/${file} assigns ${assignment}; every rehearsal live-authorization value must be NOT_CONFERRED_SYNTHETIC_ONLY`);
      }
    }
  }
  const mockSubject = read(`${coneDirectory}/mockSubject.ts`);
  for (const literal of ['C12_REHEARSAL_REFUSES_NON_SYNTHETIC_HOST', "'NOT_CONFERRED_SYNTHETIC_ONLY'", "'LOCAL_REHEARSAL_PASS'", 'c12LiveReadiness', 'chainDefinitionDigest']) {
    if (!rehearsal.includes(literal)) fail(`FC-1 the rehearsal runner must retain ${literal}`);
  }
  if (!mockSubject.includes('.invalid')) fail('FC-1 the mock subject must stay pinned to the synthetic .invalid host namespace');
  // The readiness-version duplicate must track the AH-1 cone literally.
  const readinessTypes = read('src/core/c12Readiness/types.ts');
  const bound = /C12_READINESS_VERSION_BOUND = '([^']+)'/.exec(rehearsal);
  if (bound === null || !readinessTypes.includes(`C12_READINESS_VERSION = '${bound[1]}'`)) {
    fail('FC-1 the rehearsal readiness-version duplicate has drifted from C12_READINESS_VERSION');
  }
  // The rehearsal cone must actually exercise the production-intended core,
  // not a reimplementation: admission, attach, and grant issuance.
  for (const token of ['evaluateP1ObservationScope', 'attachP1ObservationSession', 'issueP1ObserveGrant']) {
    if (!rehearsal.includes(token)) fail(`FC-1 the rehearsal must drive the real P1 core (${token})`);
  }
}

/**
 * C-02b protobuf source-intelligence invariants.
 *
 * Four things in this campaign are load-bearing, and each is the kind of thing
 * a later change could undo without any test noticing, so each is guarded
 * here and negative-probed:
 *
 *   1. the proto modules stay data-in / data-out — no filesystem, process,
 *      network or evaluation authority, and above all no protoc/buf shell-out;
 *   2. only the LEXER sees raw source, which is what makes "no fact from a
 *      comment" a property of the layering rather than a rule to remember;
 *   3. generation currency can leave UNKNOWN only through a per-operation
 *      corroboration (OpenSpec audit A-4);
 *   4. route ambiguity stays scoped to the evidence class (DEF-C02B-1).
 */
export function checkC02bProtobufBoundary() {
  const protoModules = ['src/core/source/protoLexer.ts', 'src/core/source/protoDeclarations.ts', 'src/core/source/protoCorroboration.ts'];
  for (const file of protoModules) {
    let source;
    try {
      source = readIncludingComments(file);
    } catch {
      // TOTALITY: report every missing module, not only the first.
      fail(`C-02b the protobuf module ${file} is missing`);
      continue;
    }
    for (const [pattern, description] of [
      [/from\s+['"]node:fs['"]|require\(['"](?:node:)?fs['"]\)/, 'filesystem authority'],
      [/from\s+['"]node:child_process['"]|require\(['"](?:node:)?child_process['"]\)/, 'process authority'],
      [/from\s+['"]node:(?:net|http|https|dgram|tls)['"]/, 'network authority'],
      [/\beval\s*\(|new\s+Function\s*\(/, 'dynamic evaluation'],
      // Narrow on purpose. An earlier form of this rule matched the words
      // `protoc-gen-openapiv2` inside a comment explaining a real annotation,
      // which is the C-11 lesson about plausible rules matching irrelevant
      // occurrences of the same identifier. What must be forbidden is a
      // compiler DEPENDENCY or a command string, not the prose.
      [/from\s+['"](?:protobufjs|google-protobuf)|require\(['"](?:protobufjs|google-protobuf)['"]\)/, 'a protobuf compiler dependency'],
      [/['"]protoc['"]|['"]buf['"]/, 'a protobuf compiler command'],
    ]) {
      if (pattern.test(source)) fail(`${file} contains ${description}; the C-02b protobuf path is data-in / data-out only`);
    }
  }

  // --- only the lexer may look at raw source ---
  // The declaration reader must hand `sourceText` straight to `lexProto` and
  // never inspect it again. If it grows a regex or an `indexOf` over the raw
  // text, comment and string handling has escaped the one module that owns it
  // and a fact could be derived from a comment.
  const declarations = readIncludingComments('src/core/source/protoDeclarations.ts');
  const declarationsCode = read("src/core/source/protoDeclarations.ts");
  const rawSourceUses = (declarations.match(/sourceText/g) ?? []).length;
  if (rawSourceUses !== 2) {
    fail('C-02b protoDeclarations.ts must touch raw source exactly twice — its parameter and the lexProto call; comment and string syntax belongs to the lexer alone');
  }
  if (!/lexProto\(sourceText/.test(declarationsCode)) {
    fail('C-02b protoDeclarations.ts must obtain its tokens from lexProto');
  }
  const lexer = readIncludingComments('src/core/source/protoLexer.ts');
  const lexerCode = read("src/core/source/protoLexer.ts");
  for (const [pattern, description] of [
    [/UNTERMINATED_COMMENT/, 'an unterminated block comment must fail closed'],
    [/UNTERMINATED_STRING/, 'an unterminated string must fail closed'],
    [/TOKEN_BUDGET_EXHAUSTED/, 'the token ceiling must be categorical'],
    [/DEPTH_EXCEEDED/, 'the nesting ceiling must be categorical'],
  ]) if (!pattern.test(lexerCode)) fail(`C-02b protoLexer.ts lost a bounding state: ${description}`);

  // --- A-4: currency may not be upgraded by a count ---
  const corroboration = readIncludingComments('src/core/source/protoCorroboration.ts');
  const corroborationCode = read("src/core/source/protoCorroboration.ts");
  if (!/state\s*!==\s*'CORROBORATED_EXACT'\)\s*return null/.test(corroborationCode)) {
    fail("C-02b toProtoSurfaceCorroboration must return null unless the per-operation comparison is CORROBORATED_EXACT; without that guard a count alone reaches evaluateGenerationCurrency");
  }
  const generated = readIncludingComments('src/core/source/generatedArtifact.ts');
  const corroborationLiteral = /PROTO_SURFACE_CORROBORATIONS[^=]*=\s*Object\.freeze\(\[\s*\]\)/.test(generated);
  if (!corroborationLiteral) {
    fail('C-02b PROTO_SURFACE_CORROBORATIONS must stay an empty literal; a hand-written corroboration would assert currency without comparing an operation');
  }

  // --- DEF-C02B-1: ambiguity stays scoped to the evidence class ---
  const surfaces = readIncludingComments('src/core/source/surfaces.ts');
  const duplicateKeys = surfaces.match(/const (?:parsedKeys|duplicate)Key[^\n]*|const key = `\$\{entry\.file\.repoId\}[^\n]*/g) ?? [];
  const ambiguityKeyLines = surfaces.split('\n').filter((line) => /\$\{(?:entry\.file|file)\.repoId\}/.test(line) && /route\.(?:method|routeTemplate)|entry\.route\./.test(line));
  if (ambiguityKeyLines.length !== 2) {
    fail('C-02b expected exactly two route-ambiguity key constructions in surfaces.ts; the DEF-C02B-1 guard cannot be verified');
  }
  for (const line of ambiguityKeyLines) {
    if (!line.includes('classifySourceEvidenceQualifier')) {
      fail('C-02b the route-ambiguity key must include the evidence qualifier (DEF-C02B-1): a generated artifact and the source it was generated from are one witness, not two rival declarations');
    }
  }
  if (duplicateKeys.length === 0) fail('C-02b could not locate the route-ambiguity key construction in surfaces.ts');

  // --- no root or repository was admitted ---
  // C-02b's property is that protobuf was admitted as a LANGUAGE and widened
  // no REPOSITORY. The rule originally pinned blueapi's root list literally,
  // which described the state of the day rather than the property: C-03 later
  // admitted the remaining blueapi proto roots under an explicit owner
  // decision, and a rule that fires on an authorized per-root change is
  // guarding the wrong thing.
  //
  // C-05 moved the root declaration into `universe.ts`, which is now the single
  // admission authority, and the "must not admit blueinternal or wave-api"
  // prohibition this rule used to carry is SPENT: C-05 admitted both under
  // explicit owner authorization. Three campaigns each carried their own copy
  // of that prohibition; all three are replaced by one totality rule over the
  // authority in `checkC05UniverseAdmissionBoundary`, which forbids a NINTH
  // repository from any campaign rather than two repositories from three.
  const approved = read('src/core/source/universe.ts');
  if (!/'billing'/.test(approved) || !/'openapiv2'/.test(approved)) {
    fail('C-02b requires the blueapi billing and openapiv2 roots to stay admitted');
  }

}

/**
 * C-03 Go/gRPC topology invariants.
 *
 * The value of this campaign is that a binding is a fact rather than a naming
 * coincidence, and that a truncated enumeration never becomes a completeness
 * claim. Both are one edit away from being untrue, so both are guarded here
 * and negative-probed.
 */
export function checkC03GrpcTopologyBoundary() {
  const modules = ['src/core/source/goRegistration.ts', 'src/core/source/protoServiceIndex.ts', 'src/core/source/grpcTopology.ts'];
  for (const file of modules) {
    let source;
    try {
      source = readIncludingComments(file);
    } catch {
      fail(`C-03 the topology module ${file} is missing`);
      return;
    }
    for (const [pattern, description] of [
      [/from\s+['"]node:fs['"]|require\(['"](?:node:)?fs['"]\)/, 'filesystem authority'],
      [/from\s+['"]node:child_process['"]|require\(['"](?:node:)?child_process['"]\)/, 'process authority'],
      [/from\s+['"]node:(?:net|http|https|dgram|tls)['"]/, 'network authority'],
      [/\beval\s*\(|new\s+Function\s*\(/, 'dynamic evaluation'],
      [/['"]go\s+build['"]|['"]go['"]\s*,\s*\[|gopls|go\/types/, 'a Go toolchain dependency'],
    ]) {
      if (pattern.test(source)) fail(`${file} contains ${description}; the C-03 topology path is data-in / data-out only`);
    }
  }

  const registration = readIncludingComments('src/core/source/goRegistration.ts');
  const registrationCode = read("src/core/source/goRegistration.ts");
  const topology = readIncludingComments('src/core/source/grpcTopology.ts');
  const topologyCode = read("src/core/source/grpcTopology.ts");

  // --- test files may never become topology facts ---
  if (!/_test\.go/.test(registrationCode) || !/export function isTopologyEligibleGoPath/.test(registrationCode)) {
    fail('C-03 the `_test.go` topology exclusion must exist in goRegistration.ts');
  }
  // The CALL SITE, not the identifier. A rule satisfied by the import line
  // stays green while the filter it names is deleted — presence is not proof.
  if (!/goFiles\.filter\(\(file\) => isTopologyEligibleGoPath\(file\.relativePath\)\)/.test(topologyCode)) {
    fail('C-03 the topology builder must apply the `_test.go` exclusion to its file set; two real registrations in pkg/exportcostfilters would otherwise become Cost implementations');
  }

  // --- a binding is a fact only when it is PROVEN ---
  if (!/state === 'PROVEN'[\s\S]{0,200}?SOURCE_FACT|evidenceClass: 'SOURCE_FACT'/.test(topologyCode)) {
    fail('C-03 the topology must classify evidence explicitly');
  }
  // Count ASSIGNMENTS, not the type declaration `'SOURCE_FACT' | 'NOT_A_FACT'`.
  // Requiring the `as const` spelling is what separates the two.
  if ((topology.match(/evidenceClass: 'SOURCE_FACT' as const/g) ?? []).length !== 1) {
    fail("C-03 exactly one construction may set evidenceClass SOURCE_FACT; every other outcome is NOT_A_FACT");
  }

  // --- absence is never a negative fact ---
  // The derived ASSIGNMENT, not the token. The first version of this rule
  // matched the word inside the comment that explains it, so deleting the
  // behaviour left the guard green.
  if (!/absenceReason: enumerationState === 'COMPLETE' \? 'NO_OBSERVED_REGISTRATION' : 'TRUNCATED_ENUMERATION'/.test(topologyCode)) {
    fail('C-03 an unobserved registration must be reported TRUNCATED_ENUMERATION rather than MISSING, derived from the measured enumeration state');
  }
  if (!/repositoryCompleteProof: enumerationState === 'COMPLETE'/.test(topologyCode)) {
    fail('C-03 repositoryCompleteProof must be derived from the measured enumeration state, never asserted');
  }

  // --- W-EFFECT_RPC stays unsupported, and the method prototype says so ---
  if (!/completenessClaim: 'NONE'/.test(topologyCode) || /completenessClaim: '(?!NONE)/.test(topology)) {
    fail("C-03 the method-level prototype must carry completenessClaim NONE; an unobserved handler is not an absent one");
  }
  if (/W_EFFECT_RPC|WRITE_EFFECT_CLOSURE/.test(topology)) {
    fail('C-03 must not implement W-EFFECT_RPC: sound effect proof requires COMPLETE enumeration, which ouchan cannot provide');
  }

  // --- the contract ceilings are unchanged ---
  // The repository-admission half of this rule moved to
  // `checkC05UniverseAdmissionBoundary`; see the note in the C-02b rule.
  const approved = read('src/core/source/approvedScan.ts');
  const sibling = readIncludingComments('src/core/source/siblingSource.ts');
  const siblingCode = read("src/core/source/siblingSource.ts");
  if (!/MAX_SIBLING_SOURCE_SCAN_FILES = 4096/.test(siblingCode) || !/MAX_SIBLING_SOURCE_SCAN_BYTES = 64_000_000/.test(siblingCode)) {
    fail('C-03 must not change the sibling scan contract ceilings; raising them is a separate authorized change');
  }
  if (!/'mobingilabs\/ouchan': 4096/.test(approved)) {
    fail('C-03 ouchan must keep the raised file budget; at 1,024 not one registration daemon is enumerated');
  }

}

/**
 * C-04 frontend consumer invariants.
 *
 * One rule here matters more than the rest: an edge built from a non-literal
 * path must never be a SOURCE_FACT. The others keep the modules data-only and
 * keep customer values out of durable evidence.
 */
export function checkC04FrontendConsumerBoundary() {
  const modules = ['src/core/source/vueSfc.ts', 'src/core/source/frontendConsumer.ts', 'src/core/source/frontendJoin.ts'];
  for (const file of modules) {
    let source;
    try {
      source = readIncludingComments(file);
    } catch {
      fail(`C-04 the frontend module ${file} is missing`);
      return;
    }
    for (const [pattern, description] of [
      [/from\s+['"]node:fs['"]|require\(['"](?:node:)?fs['"]\)/, 'filesystem authority'],
      [/from\s+['"]node:child_process['"]/, 'process authority'],
      [/from\s+['"]node:(?:net|http|https|dgram|tls)['"]/, 'network authority'],
      [/\beval\s*\(|new\s+Function\s*\(/, 'dynamic evaluation'],
      [/from\s+['"]@vue\/compiler-sfc['"]|from\s+['"]typescript['"]|jsdom|puppeteer/, 'a frontend toolchain dependency'],
    ]) {
      if (pattern.test(source)) fail(`${file} contains ${description}; the C-04 frontend path is data-in / data-out only`);
    }
  }

  const consumer = readIncludingComments('src/core/source/frontendConsumer.ts');
  const consumerCode = read("src/core/source/frontendConsumer.ts");
  const join = readIncludingComments('src/core/source/frontendJoin.ts');
  const joinCode = read("src/core/source/frontendJoin.ts");

  // --- no SOURCE_FACT from a non-literal path ---
  if (!/if \(pathClass === 'LITERAL' \|\| pathClass === 'STRUCTURAL'\) return 'SOURCE_FACT';/.test(consumerCode)) {
    fail("C-04 only LITERAL and STRUCTURAL paths may yield SOURCE_FACT; the classifier must state that exactly");
  }
  if ((consumer.match(/return 'SOURCE_FACT';/g) ?? []).length !== 1) {
    fail('C-04 exactly one construction may return SOURCE_FACT from the path classifier');
  }
  if (!/pathClass: 'PARTIAL_SEGMENT'/.test(consumerCode) || !/pathClass: 'DYNAMIC'/.test(consumerCode)) {
    fail('C-04 the non-literal path classes must remain distinguishable');
  }

  // --- query and hash never persisted ---
  if (!/const hashIndex = raw\.indexOf\('#'\);/.test(consumerCode) || !/const queryIndex = withoutHash\.indexOf\('\?'\);/.test(consumerCode)) {
    fail('C-04 query and hash must be stripped before classification, so a runtime value can never be persisted');
  }

  // --- the join never upgrades ---
  if (!/EVIDENCE_RANK\[left\] <= EVIDENCE_RANK\[right\] \? left : right/.test(joinCode)) {
    fail('C-04 the join must take the WEAKER evidence class of its two inputs');
  }
  if (/joinedEvidenceClass: 'SOURCE_FACT'/.test(join)) {
    fail('C-04 the join must never assign SOURCE_FACT directly; it is derived from the weaker input');
  }

  // --- method never defaulted ---
  if (/method: 'GET'/.test(consumer) || /method \?\? 'GET'/.test(consumer)) {
    fail("C-04 the HTTP method must never be defaulted to GET");
  }

  // --- only declared clients are clients ---
  if (!/tokens\[index \+ 2\]\?\.value !== 'axios'/.test(consumerCode) || !/tokens\[index \+ 4\]\?\.value !== 'create'/.test(consumerCode)) {
    fail('C-04 an HTTP client must be recognised from axios.create; otherwise Cookies.get becomes an HTTP GET');
  }


  // --- the shared tokenizer default is unchanged ---
  const lexical = read('src/core/source/lexical.ts');
  if (!/options\.preserveTemplates === true \? sourceText\.slice/.test(lexical)) {
    fail('C-04 template preservation must stay opt-in; every existing caller must lex byte-identically');
  }

}

/**
 * C-05 universe admission boundary.
 *
 * This replaces three separate per-campaign prohibitions ("C-02b/C-03/C-04
 * must not admit blueinternal or wave-api"). Each named two repositories and
 * one campaign, so each went obsolete the moment C-05 was authorized to admit
 * exactly those two — and none of them would have stopped a NINTH repository
 * being admitted by a fourth campaign. One rule over the authority does.
 *
 * The invariant is the separation itself: discovery may see any number of
 * repositories, and the admitted set is a literal that a reviewer can read.
 */
export function checkC05UniverseAdmissionBoundary() {
  const universe = readIncludingComments('src/core/source/universe.ts');
  const universeCode = read("src/core/source/universe.ts");
  const scan = readIncludingComments('src/core/source/approvedScan.ts');
  const scanCode = read("src/core/source/approvedScan.ts");

  // --- the admitted set is EXACTLY these eight ---
  const expected = [
    'mobingilabs/ripple-ui', 'mobingilabs/ripple-api', 'mobingilabs/ouchan',
    'alphauslabs/grpc-chunk-parser', 'alphauslabs/blueapi', 'alphauslabs/blue-sdk-go',
    'alphauslabs/blueinternal', 'mobingilabs/wave-api',
  ];
  const block = /export const OWNER_APPROVED_UNIVERSE[^=]*=\s*Object\.freeze\(\{([\s\S]*?)\n\}\);/.exec(universe);
  if (block === null) {
    fail('C-05 could not read the OWNER_APPROVED_UNIVERSE declaration; the admission boundary cannot be verified');
  } else {
    const declared = [...block[1].matchAll(/'([a-z0-9._-]+\/[a-z0-9._-]+)'\s*:/gi)].map((match) => match[1]);
    for (const repoId of expected) {
      if (!declared.includes(repoId)) fail(`C-05 owner-approved universe is missing ${repoId}`);
    }
    for (const repoId of declared) {
      if (!expected.includes(repoId)) fail(`C-05 owner-approved universe admits an unauthorized repository: ${repoId}`);
    }
  }

  // --- admission has exactly ONE authority ---
  // `approvedScan.ts` owned an APPROVED_ROOTS literal, so the real membership
  // rule was an intersection nobody had written down.
  if (/const APPROVED_ROOTS\b/.test(withoutComments(scan))) {
    fail('src/core/source/approvedScan.ts must not declare its own repository allowlist; universe.ts is the single admission authority');
  }
  if (!/from '\.\/universe'/.test(scanCode)) {
    fail('src/core/source/approvedScan.ts must project the admitted set from universe.ts');
  }
  // --- and a disagreement is DECLARED, in both directions ---
  for (const code of ['REAL_SOURCE_SCAN_UNIVERSE_NOT_IN_DEPENDENCY_MAP', 'REAL_SOURCE_SCAN_DEPENDENCY_MAP_NOT_IN_UNIVERSE']) {
    if (!scanCode.includes(code)) fail(`src/core/source/approvedScan.ts must fail closed on universe/dependency-map disagreement (${code})`);
  }

  // --- discovery cannot promote ---
  for (const property of ['CONTAINS_OPENAPI_DOCUMENT', 'FILESYSTEM_ADJACENT_TO_ADMITTED_REPOSITORY', 'ORGANIZATION_DIRECTORY_MATCHES']) {
    if (!universeCode.includes(property)) fail(`C-05 must state ${property} as a non-admission property`);
  }
  // The authority is data-only: the boundary performs every read.
  for (const forbidden of ['node:fs', 'node:child_process', 'node:net', 'node:https']) {
    if (universe.includes(forbidden)) fail(`src/core/source/universe.ts must stay data-only policy (imports ${forbidden})`);
  }

  // --- no current mutable Git state is persisted ---
  const types = readIncludingComments('src/core/changeIntelligence/types.ts');
  const definition = /export interface RepoDefinition \{([\s\S]*?)\n\}/.exec(types);
  if (definition === null) {
    fail('C-05 could not read the RepoDefinition declaration');
  } else {
    for (const field of ['branch', 'trackingSha', 'ahead', 'behind', 'dirty']) {
      if (new RegExp(`(^|\\n)\\s*${field}\\s*:`).test(definition[1])) {
        fail(`RepoDefinition must not persist current mutable Git state (${field}); query it live`);
      }
    }
    // The pins must SURVIVE. Removing them would make every staleness check
    // vacuously pass, which is worse than a stale value: a silent rebind.
    for (const pin of ['checkedOutSha', 'sourceMapSha']) {
      if (!new RegExp(`(^|\\n)\\s*${pin}\\s*:`).test(definition[1])) {
        fail(`RepoDefinition must keep the pinned provenance anchor ${pin}`);
      }
    }
  }
  const map = readIncludingComments('src/core/changeIntelligence/map.ts');
  for (const field of ['branch', 'trackingSha', 'ahead', 'behind', 'dirty']) {
    if (new RegExp(`(^|\\n)\\s{4}${field}:`).test(map)) {
      fail(`src/core/changeIntelligence/map.ts must not persist ${field}; it is current mutable Git state`);
    }
  }
  // --- the unapproved-read guarantee is measured at the CALL ---
  const boundary = readIncludingComments('src/core/source/siblingSource.ts');
  const boundaryCode = read("src/core/source/siblingSource.ts");
  for (const member of ['readLedger', 'admissionRefusals', 'contentReads', 'admissionRefused']) {
    if (!boundaryCode.includes(member)) {
      fail(`src/core/source/siblingSource.ts must keep the C-05 read ledger (${member}); an output-only guarantee cannot distinguish reading nothing from deriving nothing`);
    }
  }
  // Every real analysis path must hand the boundary the approved set. Admission
  // was previously enforced only by which repositories the scan CONFIG listed,
  // so a caller that built its own config was ungated.
  for (const file of ['bin/nightwatch-intelligence.mjs', 'src/controlCenter/authorities/sourceAuthority.ts']) {
    if (!/admittedRepositoryIds/.test(read(file))) {
      fail(`${file} must pass admittedRepositoryIds to the sibling-source boundary so an unadmitted repository cannot be opened`);
    }
  }

  // The one consumer must OBSERVE rather than republish the persisted values.
  const shadow = readIncludingComments('bin/change-intelligence.mjs');
  for (const republished of ['behind: repo.behind', 'ahead: repo.ahead', 'trackingSha: repo.trackingSha', 'branch: repo.branch']) {
    if (shadow.includes(republished)) {
      fail(`bin/change-intelligence.mjs must observe Git state live, not republish the persisted field (${republished})`);
    }
  }
}

/**
 * C-08 deployment-fact boundary.
 *
 * The rule that matters is the one a well-meaning implementation gets wrong:
 * `ripple-ui/src/config/common.js` is committed, current, and names real hosts
 * per environment, so it reads as authoritative — while stating only what the
 * FRONTEND CALLS. What the infrastructure SERVES is a different proposition,
 * and the gap between them is where a stale or rerouted deployment hides. So
 * the host matrix must stay SOURCE_FACT, and only genuine deployment
 * configuration may produce a DEPLOYMENT_FACT.
 */
export function checkC08DeploymentBindingBoundary() {
  const binding = readIncludingComments('src/core/source/deploymentBinding.ts');
  const bindingCode = read("src/core/source/deploymentBinding.ts");
  const evidence = readIncludingComments('src/core/source/deploymentEvidence.ts');

  // --- the forbidden bases are DECLARED, including the one that arises here ---
  // Read the DECLARATION, not the file. `CLIENT_CONFIGURATION` is also named in
  // the prose explaining why it is forbidden, so a whole-file `includes` passes
  // on the very comment that documents compliance while the array is empty --
  // the same trap the C-02b rule records, and this campaign's own probe caught
  // it here.
  const basesBlock = /export const FORBIDDEN_DEPLOYMENT_FACT_BASES[^=]*=\s*Object\.freeze\(\[([\s\S]*?)\]\);/.exec(binding);
  if (basesBlock === null) {
    fail('C-08 could not read the FORBIDDEN_DEPLOYMENT_FACT_BASES declaration');
  } else {
    const declared = withoutComments(basesBlock[1]);
    for (const basis of ['SERVICE_NAME_SIMILARITY', 'ROUTE_PREFIX_SIMILARITY', 'GUESSED_HOSTNAME',
      'HISTORICAL_FAMILIARITY', 'DOCUMENT_DESCRIBING_EXPECTED_ARCHITECTURE', 'CLIENT_CONFIGURATION']) {
      if (!declared.includes(`'${basis}'`)) fail(`C-08 must declare ${basis} as a forbidden DEPLOYMENT_FACT basis`);
    }
  }

  // --- the host matrix is SOURCE_FACT, and the build config DEPLOYMENT_FACT ---
  const hostMatrixFn = /export function extractHostMatrix[\s\S]*?\n\}/.exec(evidence);
  if (hostMatrixFn === null) {
    fail('C-08 could not read extractHostMatrix; the host-matrix classification cannot be verified');
  } else if (!/factCategory: 'SOURCE_FACT' as const/.test(hostMatrixFn[0])) {
    fail('C-08 the host matrix is CLIENT configuration and must be classified SOURCE_FACT, never DEPLOYMENT_FACT');
  }
  const exclusionFn = /export function extractBuildExclusions[\s\S]*?\n\}/.exec(evidence);
  if (exclusionFn === null) {
    fail('C-08 could not read extractBuildExclusions');
  } else if (!/factCategory: 'DEPLOYMENT_FACT' as const/.test(exclusionFn[0])) {
    fail('C-08 build exclusions are deployment configuration and must be classified DEPLOYMENT_FACT');
  }

  // --- U-1 and U-2 stay unresolved while the manifests are unavailable ---
  if (!/u1: Object\.freeze\(\{ resolved: false as const/.test(bindingCode)
    || !/u2: Object\.freeze\(\{ resolved: false as const/.test(bindingCode)) {
    fail('C-08 U-1 and U-2 must be typed unresolved; resolving them requires the mochi manifests, not a boolean');
  }
  if (!bindingCode.includes('C08B_BLOCKED_BY_ORGANIZATIONAL_ACCESS')) {
    fail('C-08 must record C08B_BLOCKED_BY_ORGANIZATIONAL_ACCESS as the reason U-1 and U-2 are unknown');
  }

  // --- totality is structural ---
  if (!/totalityHolds: operations\.length === bindings\.length/.test(bindingCode)) {
    fail('C-08 must assert binding totality against the operation population');
  }

  // --- AMBIGUOUS and UNKNOWN stay distinct ---
  // R-13 DEF-R13-4: a file-substring check cannot see a state dropped from
  // the array while its token lingers elsewhere in the file (line 152 still
  // returns 'STALE'). Parse the vocabulary declaration itself.
  const vocabulary = /export const DEPLOYMENT_BINDING_STATES\s*=\s*\[([\s\S]*?)\]/.exec(binding);
  if (vocabulary === null) {
    fail('C-08 could not read the DEPLOYMENT_BINDING_STATES declaration; the vocabulary cannot be verified');
  } else {
    for (const state of ['AMBIGUOUS', 'UNKNOWN', 'PARTIAL', 'STALE', 'UNSUPPORTED', 'EXACT']) {
      if (!new RegExp(`'${state}'`).test(vocabulary[1])) fail(`C-08 binding state ${state} is missing from the vocabulary`);
    }
  }

  // --- the binding modules stay data-only, and grant no authority ---
  for (const file of ['src/core/source/deploymentBinding.ts', 'src/core/source/deploymentEvidence.ts']) {
    const source = readIncludingComments(file);
    for (const forbidden of ['node:fs', 'node:child_process', 'node:net', 'node:https', 'node:http']) {
      if (source.includes(`from '${forbidden}'`)) fail(`${file} must stay data-only policy (imports ${forbidden})`);
    }
  }
  // Knowing where something runs is not permission to call it.
  for (const file of ['src/core/safety/realRunGate.ts', 'src/core/policy/ownerScope.ts']) {
    if (/deploymentBinding|deploymentEvidence/.test(readIncludingComments(file))) {
      fail(`${file} must not consult the deployment binding; a deployment fact grants no request authority`);
    }
  }
  // The cluster config is never read.
  for (const file of ['src/core/source/deploymentBinding.ts', 'src/core/source/deploymentEvidence.ts', 'bin/nightwatch-intelligence.mjs']) {
    if (/kubeconf|kubectl/i.test(read(file))) {
      fail(`${file} must not reference cluster configuration; C-08 reads no cluster`);
    }
  }
}
