# Active Task

Task ID: nightwatch-deployment-fact-binding-c08-v1
Phase: DEPLOYMENT_FACT_BINDING_C08_V1
Title: C-08 Deployment-Fact Binding
Status: COMPLETE
Task directory: .agent/tasks/nightwatch-deployment-fact-binding-c08-v1
Starting SHA: 43cff07af2fe2c943ca62154ad01f185602a41d9
Last validated implementation SHA: 777ddb14fd367f2d9ae8f8ac68c89092bd784713
Last checkpoint: exact-head GitHub run 33801673312 at 70b8225 passed all eleven required groups on Node 20 with receipt receipt:sha256:745edcfc991cc6b37da54233; gate:local and gate:clean PASS with siblingWrites 0; canonical regression 3,489/3,476/13/0; 1,851 operations bound to 1,851 bindings, 0 positive route-to-endpoint DEPLOYMENT_FACTs, U-1 and U-2 explicit UNKNOWNs; 11/11 negative probes detected; DEF-C08-1 and DEF-C08-2 repaired
Current milestone: COMPLETE / STOP — M1 through M8 are closed and all nine acceptance rows PASS
Next action: STOP — C-08 is COMPLETE and certified. The next authorized campaign in this overnight portfolio is C-09 spec-derived expectations; C-08b is C08B_BLOCKED_BY_ORGANIZATIONAL_ACCESS and cannot be started; C-12 remains NOT AUTHORIZED
Authorization class: NIGHTWATCH_DEPLOYMENT_FACT_BINDING_C08_V1
PROJECT_VERDICT_EFFECT: PRESERVE
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2
STARTING_SHA: 43cff07af2fe2c943ca62154ad01f185602a41d9
LAST_VALIDATED_IMPLEMENTATION_SHA: 777ddb14fd367f2d9ae8f8ac68c89092bd784713
LAST_SUBSTANTIVE_CHECKPOINT_SHA: 777ddb14fd367f2d9ae8f8ac68c89092bd784713
LAST_DOCUMENTATION_CHECKPOINT_SHA: 70b822517d164154c9d0bfb2bd53cec72d1b0fbd
LIVE_HEAD_AUTHORITY: GIT
FINAL_CI_AUTHORITY: GITHUB_ACTIONS_FOR_RELEASE_CHECKPOINT
PHASE_DEPLOYMENT_FACT_BINDING_C08_V1_STATUS: COMPLETE

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
