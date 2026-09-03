# Active Task

Task ID: nightwatch-frontend-consumer-intelligence-c04-v1
Phase: FRONTEND_CONSUMER_INTELLIGENCE_C04_V1
Title: C-04 Frontend Consumer Intelligence
Status: COMPLETE
Task directory: .agent/tasks/nightwatch-frontend-consumer-intelligence-c04-v1
Starting SHA: 7c0d5f5326be1983cf081888680f3c01f3f128f6
Last validated implementation SHA: 11cefb27ac366217f7092dcd7f66b3cfccac2fee
Last checkpoint: exact-head GitHub job 100614907944 at 0323d5f passed all eleven required groups on Node 20 with receipt receipt:sha256:6cba46d8990802d39f4b4e26; gate:clean PASS with siblingWrites 0; canonical regression 3,338/3,325/13/0; 382 consumer edges, zero non-literal SOURCE_FACTs, 164 proven backend joins; 16/16 negative probes detected
Current milestone: COMPLETE / STOP — M1 through M7 are closed
Next action: STOP — C-04 is COMPLETE and certified. The >= 400 criterion FAILS at 382, short by 18, attributed to the single-repository frontend boundary. C-15b `nightwatch-system-map-v2-c15b-v1` is the next authorized campaign and both of its hard dependencies are now satisfied
Authorization class: NIGHTWATCH_FRONTEND_CONSUMER_INTELLIGENCE_C04_V1
PROJECT_VERDICT_EFFECT: PRESERVE
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2
STARTING_SHA: 7c0d5f5326be1983cf081888680f3c01f3f128f6
LAST_VALIDATED_IMPLEMENTATION_SHA: 11cefb27ac366217f7092dcd7f66b3cfccac2fee
LAST_SUBSTANTIVE_CHECKPOINT_SHA: 11cefb27ac366217f7092dcd7f66b3cfccac2fee
LIVE_HEAD_AUTHORITY: GIT
FINAL_CI_AUTHORITY: GITHUB_ACTIONS_FOR_RELEASE_CHECKPOINT
PHASE_FRONTEND_CONSUMER_INTELLIGENCE_C04_V1_STATUS: COMPLETE

## Routing and safety

C-04 derives frontend to backend route edges mechanically from the approved Vue
and JavaScript source. It is source intelligence only: no rendering, no
execution, no bundler, no browser, no sibling `node_modules`.

`.vue` becomes an approved extension and `VUE` a scan language — a LANGUAGE
admission exactly as `.proto` was. No root and no repository is added, and
`alphauslabs/blueinternal` and `wave-api` remain outside the universe.

The `>= 400` edge criterion is recorded, before implementation, as unreachable:
the approved frontend universe is one repository holding 211 candidate call
sites in total. Reaching 400 would require admitting another frontend
REPOSITORY, which this authorization forbids and C-05 owns. The campaign
optimises for correct classification of the 211 real sites and reports the
criterion as a truthful FAIL with that attribution.

Absolute invariant: no edge built from a non-literal path is ever a
`SOURCE_FACT`. Query and hash are stripped before persistence, so no runtime or
customer value enters durable source intelligence; real call sites embed
`?type=${type}`, so this is a live rule.

This is a repository-local, offline, read-only campaign. Sibling repositories
are read through `src/core/source/siblingSource.ts` only and never modified. No
real production, DEV or NEXT contact; no credential, cookie, token or
auth-state access; no customer data; no external publication.

C-11 is unchanged. C-12 remains NOT AUTHORIZED and is not begun.

All work happens in the owned session worktree
`session/nightwatch-frontend-consumer-int-82a0494b`; the canonical checkout is
never used for implementation.
