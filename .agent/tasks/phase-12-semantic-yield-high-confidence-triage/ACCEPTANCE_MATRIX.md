# Phase 12A Acceptance Matrix — Semantic Yield & High-Confidence Triage

Parent task: `phase-12-semantic-yield-high-confidence-triage`

This matrix is normative. The executor may add tests but must not remove these proof classes without updating SPEC/PLAN with evidence.

## Matrix A — replay gap and plan validity

A01 pre-fix real `invalidReducedReplay()` returns INVALID for non-empty journey candidate.
A02 same for exploration.
A03 same for API.
A04 strict replay-plan schema accepts canonical valid plan.
A05 unknown top-level field rejected.
A06 malformed ID rejected.
A07 raw URL/free-form endpoint rejected if not represented by fixed approved identity.
A08 new action not in original rejected.
A09 reordered action occurrence rejected.
A10 duplicate occurrence injection rejected.
A11 unsafe semantic class rejected.
A12 source/catalog version mismatch rejected.
A13 deterministic plan identity repeat >=3.

## Matrix B — journey/exploration/API replay

B01 journey safe subsequence plan valid when dependencies preserved.
B02 journey removed prerequisite => PRECONDITION_DIVERGENCE before executor.
B03 journey synthetic executor same fingerprint => REPRODUCES.
B04 journey different fingerprint => DOES_NOT_REPRODUCE.
B05 exploration action must resolve approved safe-action catalog.
B06 exploration server-state/unsafe action rejected.
B07 exploration reducible sequence minimizes.
B08 API one-action exact replay reproduces.
B09 API empty reduced sequence invalid.
B10 API same action cannot create arbitrary second operation.
B11 safety nonzero invalidates reproduction.
B12 partial semantic replay cannot reproduce anomaly.
B13 fresh exact replay failure prevents reduced search.
B14 executor exception sanitized / no raw leak.

## Matrix C — minimization honesty

C01 known 3-action synthetic target reduces to 1 action and proves 1-MINIMAL.
C02 bounded budget case reports BOUNDED_MINIMAL, not 1-MINIMAL.
C03 unreproduced exact replay reports NO_REPRODUCTION.
C04 invalid original remains INVALID_ORIGINAL.
C05 exact fingerprint only.
C06 replay/candidate counts exact.
C07 deterministic candidate order repeat >=3.
C08 no budget inflation in real budget constants unless independently justified.

## Matrix D — semantic confidence

D01 full semantic ANOMALY + current source + exact replay + clean evidence can satisfy HIGH rule.
D02 PARTIAL_COVERAGE blocks HIGH.
D03 stale source blocks HIGH.
D04 unavailable source blocks HIGH.
D05 unknown source blocks HIGH unless rule explicitly allows lower state only.
D06 different replay fingerprint blocks HIGH.
D07 safety nonzero blocks HIGH.
D08 privacy failure blocks HIGH.
D09 known false-positive blocks HIGH.
D10 NO_EXPECTATION blocks HIGH.
D11 INTERNAL_ERROR blocks HIGH.
D12 browser/API agreement alone cannot create HIGH.
D13 source relevance absent does not automatically negate a real reproduced semantic anomaly; result follows explicit rule.
D14 protocol-only historical confidence test compatibility.

## Matrix E — dossier/readiness

E01 historical dossier v1 validation compatibility.
E02 semantic triage evidence strict schema.
E03 unknown field rejection.
E04 READY requires essential semantic identity.
E05 partial coverage dossier cannot be READY on that evidence.
E06 stale source dossier cannot be READY as current bug proof.
E07 non-reproduced replay cannot satisfy replay-required READY.
E08 known false-positive not READY as product bug candidate.
E09 clean high-confidence semantic candidate yields valid READY dossier when all other requirements satisfied.
E10 human recipe contains safe action IDs/categorical observation only.
E11 AI-ready projection, if exercised, remains deterministic sanitized facts only.

## Matrix F — clustering

F01 same invariant row1/row57 same cluster.
F02 same invariant one/many violating rows same cluster.
F03 same invariant different firstViolationOrdinal same cluster.
F04 different field contract different cluster.
F05 different invariant kind different cluster.
F06 different target different cluster.
F07 unrelated source SHA move + identical evidence follows explicit compatibility rule without accidental fragmentation.
F08 changed evidence digest not silently merged.
F09 changed derivation version not silently merged unless an explicit tested compatibility rule says otherwise.
F10 exact replay increments reproduction without cluster split.
F11 different replay fingerprint not counted as original reproduction.
F12 protocol-only clustering compatibility.

## Matrix G — coverage inventory

G01 fresh remote ripple-api SHA resolved; historical pin not labeled current.
G02 disposable exact snapshot matches remote SHA.
G03 canonical sibling before/after unchanged.
G04 approved target inventory contains every current approved target exactly once.
G05 target ordering canonical.
G06 current four historical expectations rederive.
G07 current four collection expectations rederive.
G08 resolver/currentness current cases resolve.
G09 stale/evidence drift fail closed.
G10 existing approved/DEV-reachable target sets unchanged.
G11 account-inventory depth uplift admitted only if mechanically proven.
G12 billing-group-exchange depth uplift admitted only if mechanically proven.
G13 ambiguous target rejected with fixed reason.
G14 unobservable transport target rejected without building transport.
G15 any new/deeper contract has distinct version/identity and historical compatibility.
G16 any collection-style new/deeper contract catches later-row defect.
G17 no required quota of new contracts.

## Matrix H — fixed yield backtest

H01 permanent corpus contains every SPEC-required class.
H02 baseline mechanically proven equivalent to starting behavior.
H03 baseline invalid-replay count > 0 for replay-gap fixtures.
H04 Phase12 invalid-replay count lower for mechanically replayable fixtures.
H05 Phase12 minimized count > baseline minimized count.
H06 API one-action can remain UNCHANGED truthfully.
H07 falsePositiveCount = 0.
H08 partialCoverageFalsePassCount = 0.
H09 staleSourceFalsePassCount = 0.
H10 differentFingerprintFalseReproductionCount = 0.
H11 privacyLeakCount = 0.
H12 determinismMismatchCount = 0.
H13 same semantic defect duplicates suppress correctly.
H14 distinct semantic defects remain distinct.
H15 READY dossier count is evidence-driven, not maximized by weakening gates.

## Matrix I — hardening/authority

I01 pure replay plan core no browser/network/fs/child-process/AI/DB/selfDev imports.
I02 pure confidence/cluster/inventory core same boundary.
I03 no new approved target ID.
I04 no new DEV-reachable target ID.
I05 no new mutation/unknown authority.
I06 no production allow change.
I07 canonical selfdev catalog digest/count unchanged.
I08 Phase 11B remains NOT_AUTHORIZED.
I09 Phase 6 remains frozen/out of scope.
I10 no Alphaus writes.

## Matrix J — regression and repository truth

J01 typecheck PASS.
J02 hardening PASS.
J03 Phase 9 matrix PASS.
J04 Phase 9A.1 PASS.
J05 Phase 9B PASS.
J06 Phase 10 PASS.
J07 Phase 10B PASS.
J08 Phase 11 PASS.
J09 Phase 11A.1 PASS.
J10 Phase 11A.2 PASS.
J11 Phase 11A.3 PASS.
J12 Phase 12 matrix PASS.
J13 campaign synthetic PASS.
J14 owner provenance PASS.
J15 agent:check PASS.
J16 agent:audit strict errors 0.
J17 project:check PASS.
J18 catalog integrity PASS.
J19 git diff --check PASS.
J20 canonical complete Playwright 0 failed.
J21 topology-correct isolated complete Playwright 0 failed.
J22 implementation checkpoint pushed fast-forward / clean.
J23 exact Actions state checked at implementation SHA.
J24 clean post-push acceptance PASS.
J25 docs closure pushed fast-forward / clean.
J26 exact final Actions state checked.

## Terminal decision

If A–J local/source gates pass but GitHub jobs still do not start for the documented billing/spending-limit condition, local capability is verified but the task remains `BLOCKED_EXTERNAL_CI`. No CI-success token and no Phase 11B authorization.
