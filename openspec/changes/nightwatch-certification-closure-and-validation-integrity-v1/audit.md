# G16.5 — rule-quantifier audit

Every registered hardening rule, its declared logical quantifier, and the
verification that the implementation matches the declaration. Measured against
the live registry; the counts here are produced from it, not transcribed.

## Vocabulary

The minimum that exactly describes the live rule set. No category was invented
for symmetry.

| Quantifier | Meaning | Count |
|---|---|---|
| `TOTALITY` | every occurrence must satisfy the invariant; every failing occurrence is reported | 60 |
| `EXISTENCE` | at least one required witness must exist | 23 |

`UNIQUENESS`/`EXACTLY_ONE` and `CARDINALITY` were considered and rejected: the
rules that look like uniqueness checks (`checkDecisionIdentityUniqueness`,
`checkDocumentRoleCurrency`) are TOTALITY over the set of duplicated keys — each
duplicate is an occurrence that must be reported — and no live rule asserts a
numeric bound as its primary subject. An ABSENCE category was also rejected:
every "no forbidden occurrence may exist" rule here is implemented as, and
reports like, a totality scan over candidate occurrences.

## Verification method

Mechanical, not a reading. For each rule the audit extracts the function body
from the comment-blanked source and measures: the iteration constructs it uses,
the number of `fail()` sites, whether it reports an exact location, and whether
it abandons its own scan with a `return` immediately after a `fail()` inside a
loop. The last of these is now enforced permanently by
`checkRuleEngineSoundness` and is probed by HC-093.

Results:

- 0 TOTALITY rules use no iteration construct.
- 0 rules are incapable of failing.
- 21 rules carry a recorded `firstMatch` singleton justification.
- 4 TOTALITY rules abandoned their scan and were repaired (below).

## Corrected rules

| Rule | Module | Defect | Repair |
|---|---|---|---|
| `checkAlphausHandoffBoundary` | `alphaus-surface` | `fail(...); return;` inside the subject loop abandoned the remaining subjects AND every assertion below the loop | `continue`, so every failing occurrence is reported |
| `checkFindingFrontierBoundary` | `privacy-and-evidence` | `fail(...); return;` inside the subject loop abandoned the remaining subjects AND every assertion below the loop | `continue`, so every failing occurrence is reported |
| `checkC15bSystemMapBoundary` | `system-map` | `fail(...); return;` inside the subject loop abandoned the remaining subjects AND every assertion below the loop | `continue`, so every failing occurrence is reported |
| `checkC02bProtobufBoundary` | `alphaus-surface` | `fail(...); return;` inside the subject loop abandoned the remaining subjects AND every assertion below the loop | `continue`, so every failing occurrence is reported |

`checkAlphausHandoffBoundary` and `checkFindingFrontierBoundary` reached the
abandon path for real: their cone lists come from `gitFiles().filter(...)`,
which returns an empty array without throwing. `checkC15bSystemMapBoundary` and
`checkC02bProtobufBoundary` read through `readIncludingComments`, which catches
ENOENT itself, reports `cannot read <file>` and returns `''` — so their own
`catch` branches were unreachable. Those two were repaired for the same reason
anyway: the branch is dead today and correct tomorrow, and a dead branch that
encodes the wrong quantifier is how the class returns.

## Full classification

| Rule | Module | Family | Quantifier | Singleton justification |
|---|---|---|---|---|
| `checkChildProcessBoundaries` | `process-and-network` | process-boundaries | TOTALITY | — |
| `checkReviewStoreBoundary` | `privacy-and-evidence` | review-store | TOTALITY | recorded |
| `checkAgentProtocolBoundary` | `ai-and-self-dev` | agent-protocol | EXISTENCE | — |
| `checkL6ProcessNetworkBoundary` | `process-and-network` | l6-containment | EXISTENCE | — |
| `checkTargetPolicy` | `process-and-network` | target-policy | TOTALITY | — |
| `checkTypecheckCoverage` | `validation-and-gates` | typecheck-coverage | EXISTENCE | — |
| `checkPrivateSurface` | `privacy-and-evidence` | private-surface | TOTALITY | — |
| `checkAiReviewBoundary` | `ai-and-self-dev` | ai-review | TOTALITY | — |
| `checkLocalCanaryBoundary` | `ai-and-self-dev` | ai-review | EXISTENCE | — |
| `checkAiInvocationAuthority` | `ai-and-self-dev` | ai-review | TOTALITY | — |
| `checkOwnerReviewCliBoundary` | `ai-and-self-dev` | ai-review | EXISTENCE | — |
| `checkImmutablePrivatePublication` | `privacy-and-evidence` | private-artifacts | EXISTENCE | — |
| `checkOwnerDecisionAuthority` | `ai-and-self-dev` | owner-decision | TOTALITY | — |
| `checkSelfDevelopmentBoundary` | `ai-and-self-dev` | self-dev | TOTALITY | — |
| `checkSelfDevTrustRootClosure` | `ai-and-self-dev` | self-dev | TOTALITY | recorded |
| `checkPhase8BSandboxBoundary` | `ai-and-self-dev` | self-dev-sandbox | TOTALITY | — |
| `checkPhase8B01CloseoutIntegrity` | `ai-and-self-dev` | self-dev-sandbox | EXISTENCE | — |
| `checkPhase8B10PortfolioIntegrity` | `ai-and-self-dev` | self-dev-portfolio | EXISTENCE | — |
| `checkPhase8B1CanonicalPromotionBoundary` | `ai-and-self-dev` | self-dev-promotion | TOTALITY | — |
| `checkC02bProtobufBoundary` | `alphaus-surface` | c02b-protobuf | TOTALITY | recorded |
| `checkC03GrpcTopologyBoundary` | `alphaus-surface` | c03-grpc | EXISTENCE | — |
| `checkC04FrontendConsumerBoundary` | `alphaus-surface` | c04-frontend | EXISTENCE | — |
| `checkC15bSystemMapBoundary` | `system-map` | c15b-system-map | TOTALITY | — |
| `checkC05UniverseAdmissionBoundary` | `alphaus-surface` | c05-universe | TOTALITY | recorded |
| `checkC08DeploymentBindingBoundary` | `alphaus-surface` | c08-deployment | TOTALITY | recorded |
| `checkC09SpecExpectationBoundary` | `semantic-contracts` | c09-spec | TOTALITY | recorded |
| `checkC16EigBoundary` | `semantic-contracts` | c16-eig | TOTALITY | recorded |
| `checkC07DerivedSemanticsBoundary` | `semantic-contracts` | c07-derived | EXISTENCE | recorded |
| `checkC15cSystemMapTransportBoundary` | `system-map` | c15c-transport | TOTALITY | recorded |
| `checkCampaignCertificationRegistry` | `validation-and-gates` | campaign-certification | TOTALITY | — |
| `checkPlannerHandoffIntegrity` | `documentation` | planner-handoff | EXISTENCE | — |
| `checkDocumentationTruth` | `documentation` | documentation | EXISTENCE | recorded |
| `checkAgentContinuityIntegrity` | `documentation` | agent-continuity | EXISTENCE | — |
| `checkProjectStateIntegrity` | `documentation` | project-state | EXISTENCE | — |
| `checkPhase9SemanticCorePurity` | `semantic-contracts` | phase9-semantic | TOTALITY | — |
| `checkPhase9IntegrationSeams` | `semantic-contracts` | phase9-semantic | EXISTENCE | — |
| `checkPhase9A1RealSourceCorePurity` | `semantic-contracts` | phase9a1-admission | TOTALITY | — |
| `checkPhase9A1SourceReaderBoundary` | `semantic-contracts` | phase9a1-admission | TOTALITY | — |
| `checkPhase9A1IntegrationSeams` | `semantic-contracts` | phase9a1-admission | EXISTENCE | — |
| `checkPhase9bCorePurity` | `semantic-contracts` | phase9b | TOTALITY | — |
| `checkPhase9bIntegrationSeams` | `semantic-contracts` | phase9b | EXISTENCE | — |
| `checkPhase10DeeperContractPurity` | `semantic-contracts` | phase10 | TOTALITY | — |
| `checkPhase10IntegrationSeams` | `semantic-contracts` | phase10 | EXISTENCE | — |
| `checkPhase10bCorePurity` | `semantic-contracts` | phase10b | TOTALITY | — |
| `checkPhase10bIntegrationSeams` | `semantic-contracts` | phase10b | EXISTENCE | — |
| `checkPhase12PureCoreBoundaries` | `semantic-contracts` | phase12 | TOTALITY | — |
| `checkPhase18PureCoreSeams` | `semantic-contracts` | phase18 | TOTALITY | — |
| `checkPhase12AuthoritySetsUnchanged` | `semantic-contracts` | phase12 | TOTALITY | recorded |
| `checkPhase12TriageCorePurity` | `semantic-contracts` | phase12 | TOTALITY | — |
| `checkPhase12TriageIntegrationSeams` | `semantic-contracts` | phase12 | EXISTENCE | — |
| `checkPhase22CorePurity` | `semantic-contracts` | phase22 | TOTALITY | — |
| `checkPhase22IntegrationSeams` | `semantic-contracts` | phase22 | EXISTENCE | — |
| `checkPhase23QualityGate` | `validation-and-gates` | phase23-quality-gate | EXISTENCE | recorded |
| `checkC00WorkspaceIntegrity` | `workspace-and-layout` | c00-workspace | TOTALITY | — |
| `checkC10ProductionPrivacyBoundary` | `privacy-and-evidence` | c10-privacy | TOTALITY | — |
| `checkC105ProvenanceAuthorityBoundary` | `privacy-and-evidence` | c105-provenance | TOTALITY | — |
| `checkR11ProxyGateReliability` | `process-and-network` | r11-proxy-gate | TOTALITY | — |
| `checkC11ProdObserveBoundary` | `process-and-network` | c11-prod-observe | TOTALITY | recorded |
| `checkP1ObservationScopeBoundary` | `process-and-network` | p1-scope | TOTALITY | recorded |
| `checkAlphausHandoffBoundary` | `alphaus-surface` | ah1-handoff | TOTALITY | — |
| `checkDeclaredDependencyResolvability` | `validation-and-gates` | declared-dependencies | TOTALITY | — |
| `checkC12RehearsalBoundary` | `alphaus-surface` | c12-rehearsal | TOTALITY | recorded |
| `checkFindingFrontierBoundary` | `privacy-and-evidence` | fc1-finding-review | TOTALITY | — |
| `checkReviewerSurfaceBoundary` | `privacy-and-evidence` | rs1-reviewer-surface | TOTALITY | recorded |
| `checkDocumentationFreshness` | `documentation` | documentation | TOTALITY | recorded |
| `checkDocumentRoleCurrency` | `documentation` | documentation-currency | TOTALITY | — |
| `checkAppendOnlyArchives` | `documentation` | documentation-currency | TOTALITY | recorded |
| `checkGovernedStatusWords` | `documentation` | documentation-currency | TOTALITY | recorded |
| `checkActiveMilestoneProgression` | `documentation` | agent-continuity | TOTALITY | recorded |
| `checkDecisionIdentityUniqueness` | `documentation` | documentation | TOTALITY | recorded |
| `checkHostCapabilityMatrix` | `workspace-and-layout` | host-capability | TOTALITY | — |
| `checkValidationUniverse` | `validation-and-gates` | validation-universe | TOTALITY | — |
| `checkEnvironmentSurfaceDeclaration` | `source-integrity` | environment-surface | TOTALITY | — |
| `checkSyntax` | `source-integrity` | syntax | TOTALITY | — |
| `checkCliImplementationContract` | `validation-and-gates` | cli-contract | TOTALITY | — |
| `checkBinExecutionCoverage` | `validation-and-gates` | bin-execution | TOTALITY | — |
| `checkAuthenticatedCapabilitySingleEvaluator` | `validation-and-gates` | auth-capability | TOTALITY | — |
| `checkSourceReachability` | `source-integrity` | dead-architecture | TOTALITY | — |
| `checkModuleBarrierEnforcement` | `source-integrity` | dead-architecture | TOTALITY | — |
| `checkSchemaLifecycle` | `source-integrity` | schema-lifecycle | TOTALITY | — |
| `checkRootOutputRootOwnership` | `workspace-and-layout` | ephemeral-layout | TOTALITY | — |
| `checkRootOutputConfigLiteral` | `workspace-and-layout` | ephemeral-layout | TOTALITY | — |
| `checkRuleEngineSoundness` | `rule-engine` | rule-engine | TOTALITY | — |

# `ripple-api` re-admission — occurrence classification

Admitted before: `27bb007ad0c798800b6bd3b29760c966422966e7`
Admitted now:    `4e3e200db3bda7b58bc250feb7f76997d95ae2cc`
Measured live at campaign start; `27bb007a` is a clean ancestor, 31 commits back.

## Why this is a re-derivation and not a SHA substitution

All four admitted recipes were derived through `deriveRealSourceExpectations`
at BOTH snapshots and compared. The old snapshot came from a disposable
`git archive` extraction whose four recipe source files were verified
byte-for-byte against the sibling's old tree; the sibling itself was never
checked out, reset or written.

| | old `27bb007a` | new `4e3e200d` |
|---|---|---|
| recipes | 4 | 4 |
| derived | 4 | 4 |
| failures | 0 | 0 |

Every derived expectation is identical across the move — same expectation id,
same invariant definitions, and the **same `ev:sha256` evidence digest**, which
binds the normalized source structure used to derive. Independently:
`ExchangeRate.php` (`636415c3`), `Account.php` (`357b1403`) and
`BillingGroup.php` (`27df7526`) are byte-identical across the two SHAs, and the
only changed recipe input, `Routing.yaml`, gained exactly seven lines — a
`checkpassword: true` on the `password` anchor and a `validate:` block on the
`updateUserPassword` route. Neither touches any of the four admitted routes.

Verdict: **SEMANTICALLY_STABLE**.

## Classification

| Occurrence | Class | Action |
|---|---|---|
| `src/api/phase5/catalog.ts` `PHASE5_SOURCE_SHAS.rippleApi` | CURRENT_SOURCE_AUTHORITY | moved forward — the single authority every other live surface derives from |
| `src/core/changeIntelligence/map.ts` `checkedOutSha` / `sourceMapSha` | CURRENT_SOURCE_AUTHORITY | moved forward WITH the catalog; `evaluateApiLineage` compares the two, so moving one alone would manufacture a staleness that does not exist |
| `src/products/ripple/explorationCatalog.ts` `RIPPLE_EXPLORATION_API_SOURCE_SHA` | CURRENT_SOURCE_AUTHORITY | moved forward |
| `src/data/phase6/catalog.ts` provenance | CURRENT_SOURCE_AUTHORITY | already derives from `PHASE5_SOURCE_SHAS`; moved automatically |
| `tests/unit/phase12CoverageInventory.test.ts` `checkCanonicalUnchanged()` | STALE_CURRENT_REFERENCE | rebound to `PHASE5_SOURCE_SHAS.rippleApi` rather than re-pinned, and its hard-coded absolute sibling path replaced by the standard root resolution |
| `tests/unit/phase25SurfaceDiscovery.test.ts` `RIPPLE_API_SHA` | STALE_CURRENT_REFERENCE | rebound to the authority; the fixture represents source AT the admitted snapshot, and the literal made the runtime binding report `SOURCE_VERSION_MISMATCH` for drift that did not exist |
| `src/oracles/expectations/recipes/registry.ts` header | HISTORICAL_RECORD | left intact; the re-admission is recorded ADDITIVELY beside the original and Phase 10A entries |
| `src/products/ripple/journeyContracts.ts` `sourceEvidence` labels (6) | HISTORICAL_RECORD | unchanged. The evidence genuinely was gathered at `27bb007`, and the two files it names are byte-identical at the new snapshot, so the record stays true without being rewritten |
| `tests/unit/phase12CoverageInventory.test.ts` G01 `historicalPin` | HISTORICAL_RECORD | unchanged ON PURPOSE — the assertion is ABOUT the historical value, so binding it to the live authority would make it vacuous |
| `corpus/phase6/*.json` `sourceSHA` / `sourceProvenance` | HISTORICAL_RECORD | unchanged; read only for structural assertions, never as a currentness authority |
| `corpus/phase9a1/source/repo-a/**` | SYNTHETIC_FIXTURE_PROVENANCE | unchanged; these declare themselves structural mirrors, and a synthetic fixture never carries real-source authority |
| `tests/helpers/sourceParity.ts` `SOURCE_PARITY_SHA` | SYNTHETIC_FIXTURE_PROVENANCE | unchanged; declared in-source as a synthetic identity |
| `tests/unit/phase25*`, `phase26*`, `sourceInventory*`, `sourceOperation*`, `c06PhpReadOnlyProof`, `nw05RelayDeadline`, `phase5Api` synthetic operation | SYNTHETIC_FIXTURE_PROVENANCE | unchanged; self-contained fixtures with no runtime-binding coupling, each verified still passing |
| `docs/**`, `.agent/tasks/**`, `openspec/changes/archive/**` | HISTORICAL_RECORD | unchanged. Current-source truth moves forward; historical evidence stays historical |

No occurrence was changed by a global search and replace. Each was traced to
what reads it before being moved or left.
