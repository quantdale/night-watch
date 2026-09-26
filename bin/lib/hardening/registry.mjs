#!/usr/bin/env node
// @ts-check

/**
 * The hardening rule registry: the ONE enumeration authority.
 *
 * Structure, and why it is this shape:
 *
 *   rules/<family>.mjs   invariant-family modules. Each exports its own
 *                        `check*` rules and nothing else public.
 *   RULE_MODULES         the module map. Membership is DECLARED here and
 *                        checked against the directory listing by
 *                        `checkRuleEngineSoundness`, so a rule module that
 *                        exists on disk and is not imported here fails rather
 *                        than silently sitting outside enumeration.
 *   RULE_TABLE           ordered metadata. The order is the historical
 *                        invocation order, so a plain run emits failures in the
 *                        same sequence it always has and `--list-rules` is
 *                        byte-stable across the decomposition.
 *   REGISTERED_RULES     RULE_TABLE resolved against RULE_MODULES. An entry
 *                        naming a module that does not exist, or a rule that
 *                        module does not export, fails HERE, at load, rather
 *                        than producing a registry with a hole in it.
 *
 * The module graph is acyclic on purpose: this module imports every family
 * module, and no family module imports this one. `checkRuleEngineSoundness`
 * needs the registry to check it, so it RECEIVES it — `injectRegistry` marks
 * that one entry, and `implementation` keeps the raw export addressable so the
 * identity check stays exact for every rule including that one.
 */
import fs from 'node:fs';
import path from 'node:path';
import { root } from './kernel.mjs';

import * as aiAndSelfDev from './rules/ai-and-self-dev.mjs';
import * as alphausSurface from './rules/alphaus-surface.mjs';
import * as documentation from './rules/documentation.mjs';
import * as privacyAndEvidence from './rules/privacy-and-evidence.mjs';
import * as processAndNetwork from './rules/process-and-network.mjs';
import * as ruleEngine from './rules/rule-engine.mjs';
import * as semanticContracts from './rules/semantic-contracts.mjs';
import * as sourceIntegrity from './rules/source-integrity.mjs';
import * as systemMap from './rules/system-map.mjs';
import * as validationAndGates from './rules/validation-and-gates.mjs';
import * as workspaceAndLayout from './rules/workspace-and-layout.mjs';

/** The directory every rule module must live in, relative to the repository root. */
export const RULE_MODULE_DIRECTORY = 'bin/lib/hardening/rules';

/** @type {Readonly<Record<string, Record<string, unknown>>>} */
export const RULE_MODULES = Object.freeze({
  'ai-and-self-dev': aiAndSelfDev,
  'alphaus-surface': alphausSurface,
  'documentation': documentation,
  'privacy-and-evidence': privacyAndEvidence,
  'process-and-network': processAndNetwork,
  'rule-engine': ruleEngine,
  'semantic-contracts': semanticContracts,
  'source-integrity': sourceIntegrity,
  'system-map': systemMap,
  'validation-and-gates': validationAndGates,
  'workspace-and-layout': workspaceAndLayout,
});

/**
 * Every rule module file on disk, discovered deterministically (sorted, fixed
 * extension) rather than by import side effect. This is what makes an
 * unregistered module FAIL instead of simply never running.
 */
export function discoverRuleModuleFiles() {
  return fs.readdirSync(path.join(root, RULE_MODULE_DIRECTORY))
    .filter((name) => name.endsWith('.mjs'))
    .map((name) => name.slice(0, -'.mjs'.length))
    .sort();
}

/**
 * Ordered rule metadata. `module` binds each rule to its owning family module;
 * `firstMatch`, where present, is the recorded justification for a deliberate
 * singleton extraction inside a TOTALITY rule.
 * @type {ReadonlyArray<{name: string, module: string, family: string, quantifier: string, subject: string, firstMatch?: string, injectRegistry?: boolean}>}
 */
export const RULE_TABLE = Object.freeze([
  { name: 'checkChildProcessBoundaries', module: 'process-and-network', family: 'process-boundaries', quantifier: 'TOTALITY', subject: 'every launcher bounds child execution and production source cannot reach shell-capable execution' },
  { name: 'checkSemanticTransportTotality', module: 'process-and-network', family: 'process-boundaries', quantifier: 'TOTALITY', subject: 'every product-effect site discovers into one closed semantic authority class and the admission/generation/redirect/WS/proxy/relay protections remain in code' },
  { name: 'checkReviewStoreBoundary', module: 'privacy-and-evidence', family: 'review-store', quantifier: 'TOTALITY', subject: 'every private-store call, validator invocation, and error code in the review cone is allowlisted', firstMatch: 'the review file-name pattern declaration is a singleton constant' },
  { name: 'checkAgentProtocolBoundary', module: 'ai-and-self-dev', family: 'agent-protocol', quantifier: 'EXISTENCE', subject: 'the agent-protocol cone retains its purity and required validator/authority tokens' },
  { name: 'checkL6ProcessNetworkBoundary', module: 'process-and-network', family: 'l6-containment', quantifier: 'EXISTENCE', subject: 'the L6 containment descriptor, AF_UNIX control protocol, and OOPS readiness gate remain present' },
  { name: 'checkTargetPolicy', module: 'process-and-network', family: 'target-policy', quantifier: 'TOTALITY', subject: 'every credentialed launcher enforces DEV-only execution and no bin references the unauthorized budget profile' },
  { name: 'checkTypecheckCoverage', module: 'validation-and-gates', family: 'typecheck-coverage', quantifier: 'EXISTENCE', subject: 'the root TypeScript configuration covers every Playwright root config' },
  { name: 'checkPrivateSurface', module: 'privacy-and-evidence', family: 'private-surface', quantifier: 'TOTALITY', subject: 'no tracked path can hold private runtime state and the ignore rules remain complete' },
  { name: 'checkAiReviewBoundary', module: 'ai-and-self-dev', family: 'ai-review', quantifier: 'TOTALITY', subject: 'every AI review module stays local, loopback-contained, and free of cloud/process/persistence authority' },
  { name: 'checkLocalCanaryBoundary', module: 'ai-and-self-dev', family: 'ai-review', quantifier: 'EXISTENCE', subject: 'the local canary controller and CLI keep their fixed fixture, counters, and thin-wrapper shape' },
  { name: 'checkAiInvocationAuthority', module: 'ai-and-self-dev', family: 'ai-review', quantifier: 'TOTALITY', subject: 'every raw provider execution leaves through the budgeted AiReviewSession boundary' },
  { name: 'checkOwnerReviewCliBoundary', module: 'ai-and-self-dev', family: 'ai-review', quantifier: 'EXISTENCE', subject: 'the owner-review CLI stays TTY-confirmed, provider-free, and routes writes through the review service' },
  { name: 'checkImmutablePrivatePublication', module: 'privacy-and-evidence', family: 'private-artifacts', quantifier: 'EXISTENCE', subject: 'immutable publication uses atomic linkSync create-if-absent and every AI artifact write routes through it' },
  { name: 'checkAuthenticatedEvidenceFirewall', module: 'privacy-and-evidence', family: 'private-surface', quantifier: 'TOTALITY', subject: 'every authenticated run-root writer is registered, every recorder byte crosses one firewall before publication, the transition hardens before the flag flips, and route identity stays provenance-bound' },
  { name: 'checkOwnerDecisionAuthority', module: 'ai-and-self-dev', family: 'owner-decision', quantifier: 'TOTALITY', subject: 'owner-decision write authority is reachable only through the confirmed internal helper and its CLI' },
  { name: 'checkSelfDevelopmentBoundary', module: 'ai-and-self-dev', family: 'self-dev', quantifier: 'TOTALITY', subject: 'every selfDev source stays inside the synthetic, provenance-bound, non-adopting boundary' },
  { name: 'checkSelfDevTrustRootClosure', module: 'ai-and-self-dev', family: 'self-dev', quantifier: 'TOTALITY', subject: 'every relative import of every SELFDEV_AUTHORITATIVE_PATHS member is itself listed', firstMatch: 'the authoritative path list is a singleton frozen declaration' },
  { name: 'checkPhase8BSandboxBoundary', module: 'ai-and-self-dev', family: 'self-dev-sandbox', quantifier: 'TOTALITY', subject: 'every sandbox module honors the owner gate, one-file changed bound, mirror confinement, and no-publication authority' },
  { name: 'checkPhase8B01CloseoutIntegrity', module: 'ai-and-self-dev', family: 'self-dev-sandbox', quantifier: 'EXISTENCE', subject: 'sandbox-base validation ordering, single-strategy binding, and write accounting remain intact' },
  { name: 'checkPhase8B10PortfolioIntegrity', module: 'ai-and-self-dev', family: 'self-dev-portfolio', quantifier: 'EXISTENCE', subject: 'the deterministic portfolio/contract versions and generated catalog shape remain intact' },
  { name: 'checkPhase8B1CanonicalPromotionBoundary', module: 'ai-and-self-dev', family: 'self-dev-promotion', quantifier: 'TOTALITY', subject: 'every promotion stage keeps the owner gate, one-shot approval, exact HEAD, and no-runtime-Git authority' },
  { name: 'checkC02bProtobufBoundary', module: 'alphaus-surface', family: 'c02b-protobuf', quantifier: 'TOTALITY', subject: 'every protobuf module is data-in/data-out, only the lexer sees raw source, and currency requires per-operation corroboration', firstMatch: 'the surface-corroboration declaration is a singleton literal' },
  { name: 'checkC03GrpcTopologyBoundary', module: 'alphaus-surface', family: 'c03-grpc', quantifier: 'EXISTENCE', subject: 'the Go/gRPC topology classifies evidence as fact only when proven and never claims completeness from truncation' },
  { name: 'checkC04FrontendConsumerBoundary', module: 'alphaus-surface', family: 'c04-frontend', quantifier: 'EXISTENCE', subject: 'frontend consumer modules are data-only and only literal/structural paths can be SOURCE_FACT' },
  { name: 'checkC15bSystemMapBoundary', module: 'system-map', family: 'c15b-system-map', quantifier: 'TOTALITY', subject: 'the system map is deterministic, never upgrades evidence, reports exact drops, and grants no authority' },
  { name: 'checkC05UniverseAdmissionBoundary', module: 'alphaus-surface', family: 'c05-universe', quantifier: 'TOTALITY', subject: 'the owner-approved repository universe is exactly the declared set and admission has one authority', firstMatch: 'the OWNER_APPROVED_UNIVERSE declaration is a singleton object literal' },
  { name: 'checkC08DeploymentBindingBoundary', module: 'alphaus-surface', family: 'c08-deployment', quantifier: 'TOTALITY', subject: 'every deployment-fact basis is declared forbidden, host matrix stays SOURCE_FACT, and no cluster is consulted', firstMatch: 'the forbidden-bases and binding-state declarations are singleton literals' },
  { name: 'checkC09SpecExpectationBoundary', module: 'semantic-contracts', family: 'c09-spec', quantifier: 'TOTALITY', subject: 'spec witnesses stay DOCUMENTARY, no prose becomes an assertion, and the classification vocabulary is complete', firstMatch: 'the expectation-class and scenario-classification declarations are singleton literals' },
  { name: 'checkC16EigBoundary', module: 'semantic-contracts', family: 'c16-eig', quantifier: 'TOTALITY', subject: 'every EIG factor keeps UNKNOWN strictly mid-scale and the ranking grants no authority', firstMatch: 'each factor declaration is a singleton frozen object' },
  { name: 'checkC07DerivedSemanticsBoundary', module: 'semantic-contracts', family: 'c07-derived', quantifier: 'EXISTENCE', subject: 'method-only derivations stay UNKNOWN, conditional mutations stay mutations, and the hand-authored registry stays empty', firstMatch: 'each source classification case is a singleton switch arm' },
  { name: 'checkC15cSystemMapTransportBoundary', module: 'system-map', family: 'c15c-transport', quantifier: 'TOTALITY', subject: 'the transport is GET/HEAD only, bounds can say unknown, and no authority beyond NONE crosses the wire', firstMatch: 'the projection-bound DTO is a singleton interface declaration' },
  { name: 'checkCampaignCertificationRegistry', module: 'validation-and-gates', family: 'campaign-certification', quantifier: 'TOTALITY', subject: 'every campaign in the task ledger is declared, exists, and is selected by a required gate lane' },
  { name: 'checkPlannerHandoffIntegrity', module: 'documentation', family: 'planner-handoff', quantifier: 'EXISTENCE', subject: 'the handoff protocol stays versioned, read-only, bounded, and package-exposed' },
  { name: 'checkDocumentationTruth', module: 'documentation', family: 'documentation', quantifier: 'EXISTENCE', subject: 'live narratives do not contradict the machine-checked completion status', firstMatch: 'the project-completion status key is a singleton machine block' },
  { name: 'checkAgentContinuityIntegrity', module: 'documentation', family: 'agent-continuity', quantifier: 'EXISTENCE', subject: 'the continuity checker stays read-only and the v2 protocol module stays pure' },
  { name: 'checkProjectStateIntegrity', module: 'documentation', family: 'project-state', quantifier: 'EXISTENCE', subject: 'the project-state checker stays read-only and enforces the strict completion/CI/promotion schema' },
  { name: 'checkPhase9SemanticCorePurity', module: 'semantic-contracts', family: 'phase9-semantic', quantifier: 'TOTALITY', subject: 'every semantic core module is deterministic and free of AI/selfDev/Phase6/transport/persistence authority' },
  { name: 'checkPhase9IntegrationSeams', module: 'semantic-contracts', family: 'phase9-semantic', quantifier: 'EXISTENCE', subject: 'the semantic hook, Phase 5 stage, dossier evidence, and protocol oracle wiring remain present' },
  { name: 'checkPhase9A1RealSourceCorePurity', module: 'semantic-contracts', family: 'phase9a1-admission', quantifier: 'TOTALITY', subject: 'every recipe/extractor/admission/resolver/receipt core stays free of execution and I/O authority' },
  { name: 'checkPhase9A1SourceReaderBoundary', module: 'semantic-contracts', family: 'phase9a1-admission', quantifier: 'TOTALITY', subject: 'the sibling source reader is the only fs-touching module and every coordinator stays beneath it' },
  { name: 'checkPhase9A1IntegrationSeams', module: 'semantic-contracts', family: 'phase9a1-admission', quantifier: 'EXISTENCE', subject: 'the evaluation ledger, safe INTERNAL_ERROR receipt, and privacy escalation remain wired' },
  { name: 'checkPhase9bCorePurity', module: 'semantic-contracts', family: 'phase9b', quantifier: 'TOTALITY', subject: 'the freshness/preflight/summary core performs no I/O or execution' },
  { name: 'checkPhase9bIntegrationSeams', module: 'semantic-contracts', family: 'phase9b', quantifier: 'EXISTENCE', subject: 'the Phase 9B runner keeps its one-shot gate, fixed journey, and selector refusals' },
  { name: 'checkPhase10DeeperContractPurity', module: 'semantic-contracts', family: 'phase10', quantifier: 'TOTALITY', subject: 'every deeper-contract core stays free of execution and I/O authority' },
  { name: 'checkPhase10IntegrationSeams', module: 'semantic-contracts', family: 'phase10', quantifier: 'EXISTENCE', subject: 'the v2 recipe schema, type-flow extractor, invariant vocabulary, and historical archives remain wired' },
  { name: 'checkPhase10bCorePurity', module: 'semantic-contracts', family: 'phase10b', quantifier: 'TOTALITY', subject: 'the deep-acceptance mechanics module stays pure' },
  { name: 'checkPhase10bIntegrationSeams', module: 'semantic-contracts', family: 'phase10b', quantifier: 'EXISTENCE', subject: 'the Phase 10B runner keeps its one-shot gate, fixed deep expectation, and historical Phase 9B shape' },
  { name: 'checkPhase12PureCoreBoundaries', module: 'semantic-contracts', family: 'phase12', quantifier: 'TOTALITY', subject: 'every Phase 12 pure-core candidate is free of browser/network/process/DB/AI authority' },
  { name: 'checkPhase18PureCoreSeams', module: 'semantic-contracts', family: 'phase18', quantifier: 'TOTALITY', subject: 'semantic replay/coverage/currentness cores stay pure and retain their bounded vocabulary' },
  { name: 'checkPhase12AuthoritySetsUnchanged', module: 'semantic-contracts', family: 'phase12', quantifier: 'TOTALITY', subject: 'approved/DEV-reachable target ids, the safe-action catalog version, and the canonical catalog count stay frozen', firstMatch: 'the DEV_REACHABLE_RECIPE_TARGET_IDS block is a singleton declaration; every membership and count assertion uses a global match over the whole file' },
  { name: 'checkPhase12TriageCorePurity', module: 'semantic-contracts', family: 'phase12', quantifier: 'TOTALITY', subject: 'semantic triage/confidence/dossier/coverage/cluster cores stay pure' },
  { name: 'checkPhase12TriageIntegrationSeams', module: 'semantic-contracts', family: 'phase12', quantifier: 'EXISTENCE', subject: 'triage evidence, confidence blockers, dossier v2, and coverage dispositions remain wired' },
  { name: 'checkPhase22CorePurity', module: 'semantic-contracts', family: 'phase22', quantifier: 'TOTALITY', subject: 'every Phase 22 DTO/oracle module is deterministic and authority-free' },
  { name: 'checkPhase22IntegrationSeams', module: 'semantic-contracts', family: 'phase22', quantifier: 'EXISTENCE', subject: 'the Phase 22 manifest bounds, preflight vocabulary, launcher gate, and operator scripts remain wired' },
  { name: 'checkPhase23QualityGate', module: 'validation-and-gates', family: 'phase23-quality-gate', quantifier: 'EXISTENCE', subject: 'the required gate groups, fixed entry points, workflow bounds, and empty-step rule remain intact', firstMatch: 'the workflow timeout declaration is a singleton' },
  { name: 'checkWorkflowActionPinning', module: 'validation-and-gates', family: 'phase23-quality-gate', quantifier: 'TOTALITY', subject: 'every action in every workflow file is pinned to a full commit SHA, at any indentation including compact step forms', firstMatch: 'the uses-line matcher is applied per line over every workflow file, so every reference is evaluated exactly once' },
  { name: 'checkC00WorkspaceIntegrity', module: 'workspace-and-layout', family: 'c00-workspace', quantifier: 'TOTALITY', subject: 'every session/worktree hygiene invariant is enforced and the canonical protection policy is not weakened' },
  { name: 'checkC10ProductionPrivacyBoundary', module: 'privacy-and-evidence', family: 'c10-privacy', quantifier: 'TOTALITY', subject: 'every production privacy cone module is authority-free and the persistence firewall/route provenance remain wired' },
  { name: 'checkC105ProvenanceAuthorityBoundary', module: 'privacy-and-evidence', family: 'c105-provenance', quantifier: 'TOTALITY', subject: 'only the trusted adapter can mint production vocabulary authority and the test-only seam stays test-only' },
  { name: 'checkR11ProxyGateReliability', module: 'process-and-network', family: 'r11-proxy-gate', quantifier: 'TOTALITY', subject: 'the proxy allocator keeps the real probe and the gate persists one confined atomic receipt' },
  { name: 'checkC11ProdObserveBoundary', module: 'process-and-network', family: 'c11-prod-observe', quantifier: 'TOTALITY', subject: 'the production cone is import-isolated from DEV/NEXT paths and the admission chain retains every gate', firstMatch: 'the ordered admission-gate list is a singleton const array' },
  { name: 'checkP1ObservationScopeBoundary', module: 'process-and-network', family: 'p1-scope', quantifier: 'TOTALITY', subject: 'the P1 cone stays isolated, triply bounded, and attribution fails closed', firstMatch: 'the ordered P1 gate list is a singleton const array' },
  { name: 'checkAlphausHandoffBoundary', module: 'alphaus-surface', family: 'ah1-handoff', quantifier: 'TOTALITY', subject: 'every handoff/readiness cone stays isolated, transport-free, and non-publishing' },
  { name: 'checkDeclaredDependencyResolvability', module: 'validation-and-gates', family: 'declared-dependencies', quantifier: 'TOTALITY', subject: 'every bare module specifier from tracked source is a declared dependency' },
  { name: 'checkC12RehearsalBoundary', module: 'alphaus-surface', family: 'c12-rehearsal', quantifier: 'TOTALITY', subject: 'the rehearsal cone stays local-only, synthetic-pinned, and occurrence-complete on live-authorization values', firstMatch: 'the readiness-version bound is a singleton constant' },
  { name: 'checkFindingFrontierBoundary', module: 'privacy-and-evidence', family: 'fc1-finding-review', quantifier: 'TOTALITY', subject: 'the finding review/intel cones stay advisory-only, local, and occurrence-complete on authority values' },
  { name: 'checkReviewerSurfaceBoundary', module: 'privacy-and-evidence', family: 'rs1-reviewer-surface', quantifier: 'TOTALITY', subject: 'the reviewer surface stays a pure projection, guards every advisory value, and tracks the AH-1 vocabulary', firstMatch: 'each AH-1 vocabulary declaration is a singleton array literal' },
  { name: 'checkDocumentationFreshness', module: 'documentation', family: 'documentation', quantifier: 'TOTALITY', subject: 'the current-state header date, MA-8 status, GREEN framing, and C-12 readiness never go stale', firstMatch: 'the header date is a singleton line' },
  { name: 'checkDocumentRoleCurrency', module: 'documentation', family: 'documentation-currency', quantifier: 'TOTALITY', subject: 'every top-level docs file has exactly one role, every CURRENT_TRUTH document is under its declared bound, and every relocation is byte-identical' },
  { name: 'checkAppendOnlyArchives', module: 'documentation', family: 'documentation-currency', quantifier: 'TOTALITY', subject: 'no APPEND_ONLY_ARCHIVE line is modified or deleted since the diff base without a declared correction', firstMatch: 'the diff header and hunk regexes are applied per line inside a loop over every line of the diff, so every line is evaluated' },
  { name: 'checkGovernedStatusWords', module: 'documentation', family: 'documentation-currency', quantifier: 'TOTALITY', subject: 'every governed status statement states the ledger current value or names its historical checkpoint, and the README block states every required key', firstMatch: 'the ledger declaration is a singleton block and each per-key regex is applied per line inside loops over every document line and every governed key' },
  { name: 'checkReleaseEvidenceBindings', module: 'documentation', family: 'documentation-currency', quantifier: 'TOTALITY', subject: 'every release-evidence binding and document-role correction keeps its closed schema and its fixed subject closure', firstMatch: 'each parsed binding and correction entry is evaluated once against the closed key sets and the condition/lane subject closure is compared as complete sets' },
  { name: 'checkActiveMilestoneProgression', module: 'documentation', family: 'agent-continuity', quantifier: 'TOTALITY', subject: 'no PLAN milestone that STATE reports COMPLETE still reads NOT_STARTED or IN_PROGRESS', firstMatch: 'each plan milestone section is a singleton section' },
  { name: 'checkDecisionIdentityUniqueness', module: 'documentation', family: 'documentation', quantifier: 'TOTALITY', subject: 'every duplicated decision number is recorded in the erratum with every colliding title', firstMatch: 'the exec is applied per line inside a loop over every line of the document, so every heading is evaluated' },
  { name: 'checkHostCapabilityMatrix', module: 'workspace-and-layout', family: 'host-capability', quantifier: 'TOTALITY', subject: 'every declared dependency is assessed and every probed capability token is named in the matrix' },
  { name: 'checkValidationUniverse', module: 'validation-and-gates', family: 'validation-universe', quantifier: 'TOTALITY', subject: 'every discovered executable test or check is classified exactly once and the digest does not drift' },
  { name: 'checkEnvironmentSurfaceDeclaration', module: 'source-integrity', family: 'environment-surface', quantifier: 'TOTALITY', subject: 'every NIGHTWATCH_* variable read by production source is declared, and assembled read names are enumerated' },
  { name: 'checkSyntax', module: 'source-integrity', family: 'syntax', quantifier: 'TOTALITY', subject: 'every top-level bin parses as an ES module' },
  { name: 'checkCliImplementationContract', module: 'validation-and-gates', family: 'cli-contract', quantifier: 'TOTALITY', subject: 'every loader call site names a string literal path that resolves and exports what the call site reads' },
  { name: 'checkBinExecutionCoverage', module: 'validation-and-gates', family: 'bin-execution', quantifier: 'TOTALITY', subject: 'every top-level bin entry point is executed as a process by at least one test' },
  { name: 'checkAuthenticatedCapabilitySingleEvaluator', module: 'validation-and-gates', family: 'auth-capability', quantifier: 'TOTALITY', subject: 'every cookie-expiry evaluation outside the storage-state fixture reuses the single evaluator or is reported by file and line' },
  { name: 'checkSourceReachability', module: 'source-integrity', family: 'dead-architecture', quantifier: 'TOTALITY', subject: 'every tracked src module is referenced outside its own directory or declared in the reasoned-retention list, and the list fails in both directions' },
  { name: 'checkModuleBarrierEnforcement', module: 'source-integrity', family: 'dead-architecture', quantifier: 'TOTALITY', subject: 'every enforced module barrier is entered through its barrel and no consumer outside it imports a deep path' },
  { name: 'checkSchemaLifecycle', module: 'source-integrity', family: 'schema-lifecycle', quantifier: 'TOTALITY', subject: 'every discovered schema identifier is declared at its exact version and every declaration resolves to discovered bytes, with a non-vacuous scan' },
  { name: 'checkRootOutputRootOwnership', module: 'workspace-and-layout', family: 'ephemeral-layout', quantifier: 'TOTALITY', subject: 'every root output/scratch name is owned or declared historical in both directions and no tracked path lives under one' },
  { name: 'checkRootOutputConfigLiteral', module: 'workspace-and-layout', family: 'ephemeral-layout', quantifier: 'TOTALITY', subject: 'every root playwright config declares no outputDir or resolves it through the owned layout module with a unique lane' },
  { name: 'checkRuleEngineSoundness', module: 'rule-engine', injectRegistry: true, family: 'rule-engine', quantifier: 'TOTALITY', subject: 'no fail-if-absent matcher uses the raw accessor and registry/probe/quantifier invariants hold' },
]);

/**
 * Resolve the table against the module map. A missing module or a missing
 * export is a load-time failure: a registry with a hole would let the runner
 * report success for a rule that never ran.
 */
function resolveRule(entry) {
  const namespace = RULE_MODULES[entry.module];
  if (namespace === undefined) {
    throw new Error(`hardening registry: rule ${entry.name} names module '${entry.module}', which is not registered in RULE_MODULES`);
  }
  const implementation = namespace[entry.name];
  if (typeof implementation !== 'function') {
    throw new Error(`hardening registry: rule ${entry.name} is registered against module '${entry.module}', which exports no such function`);
  }
  return { ...entry, implementation, run: implementation };
}

/**
 * The resolved registry. `implementation` is always the raw module export, so
 * the identity check in the self-check is exact; `run` is what the runner
 * invokes and differs only for the one entry that needs the registry itself.
 * @type {ReadonlyArray<{name: string, module: string, family: string, quantifier: string, subject: string, firstMatch?: string, injectRegistry?: boolean, implementation: Function, run: () => void}>}
 */
export const REGISTERED_RULES = Object.freeze(RULE_TABLE.map(resolveRule).map((rule) => (
  rule.injectRegistry === true
    ? { ...rule, run: () => rule.implementation(REGISTERED_RULES) }
    : rule
)));

/**
 * The enumeration every reporting mode uses, so `--list-rules` and a plain run
 * can never disagree about which rules exist.
 */
export function enumerateRules() {
  return REGISTERED_RULES.map((rule) => rule.name);
}
