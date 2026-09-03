# Active Task

Task ID: nightwatch-deployment-fact-binding-c08-v1
Phase: DEPLOYMENT_FACT_BINDING_C08_V1
Title: C-08 Deployment-Fact Binding
Status: IN_PROGRESS
Task directory: .agent/tasks/nightwatch-deployment-fact-binding-c08-v1
Starting SHA: 43cff07af2fe2c943ca62154ad01f185602a41d9
Last validated implementation SHA: 43cff07af2fe2c943ca62154ad01f185602a41d9
Last checkpoint: evidence survey completed read-only at 43cff07 — the mochi deployment manifests are absent (verified four independent ways), so U-1 and U-2 stay UNKNOWN and C-08b is C08B_BLOCKED_BY_ORGANIZATIONAL_ACCESS; ouchan/build/config.yaml supports a NEGATIVE deployment fact through per-branch build exclusions, while the ripple-ui host matrix is committed CLIENT configuration and is therefore SOURCE_FACT, not DEPLOYMENT_FACT
Current milestone: M2 — the binding model, its three-hop chain and its state vocabulary
Next action: write src/core/source/deploymentBinding.ts with an explicit ROUTE_TO_HOST to HOST_TO_SERVICE to SERVICE_TO_DEPLOYMENT chain and the EXACT / PARTIAL / UNKNOWN / UNSUPPORTED / STALE / AMBIGUOUS vocabulary, reusing C-15b's FACT_CATEGORIES and strength ordering rather than inventing a parallel one
Authorization class: NIGHTWATCH_DEPLOYMENT_FACT_BINDING_C08_V1
PROJECT_VERDICT_EFFECT: PRESERVE
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2
STARTING_SHA: 43cff07af2fe2c943ca62154ad01f185602a41d9
LAST_VALIDATED_IMPLEMENTATION_SHA: 43cff07af2fe2c943ca62154ad01f185602a41d9
LAST_SUBSTANTIVE_CHECKPOINT_SHA: 43cff07af2fe2c943ca62154ad01f185602a41d9
LIVE_HEAD_AUTHORITY: GIT
FINAL_CI_AUTHORITY: GITHUB_ACTIONS_FOR_RELEASE_CHECKPOINT
PHASE_DEPLOYMENT_FACT_BINDING_C08_V1_STATUS: IN_PROGRESS

## Routing and safety

C-08 gives every one of the 1,851 source operations an explicit
deployment-binding classification, so that "we do not know where this runs"
becomes a recorded fact naming the missing hop rather than an absent field. An
unrecorded unknown is the shape a guess hides in, and the campaigns after this
one want to make requests.

The binding is an explicit three-hop CHAIN — route to host, host to Kubernetes
service, service to deployed — because the only information C-08 can actually
produce is WHICH hop is missing. A flat UNKNOWN cannot distinguish "nobody
looked" from "hop one is established and hops two and three are blocked".

The evidence survey decided what may be claimed, and it was done before any
design. The mochi manifests are NOT locally available: no repository named
mochi at depth two or less, no ingress.yaml anywhere under the sibling root, no
appproxy or serviceproxy directory, and no remote.origin.url mentioning mochi
across roughly 160 repositories. The two matching paths are protobuf
subdirectories for a SERVICE named mochi. So U-1 and U-2 stay UNKNOWN carrying
C08B_BLOCKED_BY_ORGANIZATIONAL_ACCESS, and no further effort is spent seeking
access.

One local source qualifies as deployment evidence and only negatively:
ouchan/build/config.yaml declares per-branch build exclusions over qa, next and
production, so an exclusion proves a service is not built or deployed to that
environment from this repository at this revision. Non-exclusion is NOT the
converse — build_all is false, so a non-excluded service is merely eligible,
and treating eligibility as deployment would be an inference wearing a fact's
label.

The ripple-ui host matrix is committed CLIENT configuration: it says what the
frontend CALLS, which is a different proposition from what the infrastructure
SERVES, and the gap between them is exactly where a stale or rerouted
deployment hides. It is SOURCE_FACT. The consequence is accepted rather than
engineered away: the positive route-to-endpoint DEPLOYMENT_FACT count may
legitimately be ZERO, and the acceptance criteria are written so that
reporting zero passes while manufacturing a non-zero count from client
configuration fails.

C-08 is information and grants NO request authority; a probe asserts that no
request-authority surface consults the binding module. Zero runtime contact: no
production, NEXT or DEV request, no kubectl, no cloud API, no credential search,
no secret-store read, and ouchan/kubeconf-dev.yaml is deliberately not read.
C-12 remains NOT AUTHORIZED and is not begun.

All work happens in the owned session worktree
`session/nightwatch-deployment-fact-bindi-9d9f8b7b`; the canonical checkout is
never used for implementation.
