# STATE — nightwatch-real-local-investigation-substrate-v1

CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2
Status: IN_PROGRESS
Parent programme: nightwatch-autonomous-bug-hunting-programme-v1
Live HEAD authority: GIT
Starting SHA: DISCOVER_FROM_GIT
Last validated implementation SHA: NONE
Last substantive checkpoint SHA: NONE

## Objective

Make the normal Nightwatch autonomous campaign path consume real owner-local source/intelligence/evidence/reproduction through shared safe providers, then prove one historical reproduced defect through that same product path.

## Current milestone

M0 — re-establish live repository truth and reproduce the product-vs-benchmark capability gap before implementation.

## Known facts from the initiating audit

These are hypotheses/observations to verify against live code before acting, not permission to skip recon:

- AgentRuntime, CLI reasoner gateway, typed tool protocol, Bug Atlas, System Atlas schema, historical benchmark, contained replay, and dossier builder exist.
- `localCampaign.ts` currently constructs the generic LOCAL tool executor without real source/System Map/evidence providers.
- generic Bug/System Atlas queries can fall back to synthetic/fixture data.
- benchmark historical hunts have a richer source/reproduction executor than the generic product path.
- generic `RERUN_SAFE_REPRODUCTION` validates a plan but does not itself execute the contained replay.
- the parent `PROGRAMME.json` contains a duplicate `E` lane key and therefore cannot faithfully preserve both lane records under ordinary JSON parsing.
- strict `EXACT_REDISCOVERY` currently requires the hidden failing-test path to appear in candidate text; keep this metric but add a separately meaningful verified root-cause/reproduction tier.
- final dossier building must be bound to mechanically observed reproduction/evidence, not model-asserted counts.

## Authorization

IMPLEMENTATION AUTHORIZED:
- Nightwatch repository source/tests/contracts/CLI/docs/OpenSpec/task state.
- owner-local read-only source/history/evidence adapters.
- Bug Atlas/System Atlas local integration.
- deterministic local historical reproduction in disposable temp trees.
- synthetic/fabricated test repositories and fixtures.
- read-only sibling Git history/object reads needed by existing bounded replay/mining contracts.

NOT AUTHORIZED:
- DEV/NEXT/production contact.
- C-07, C-08b, C-12/C-13/C-14 live execution.
- Slack/Leslie/Pondr/Notion or any communication scraping.
- external issue/PR/Slack filing or comments.
- credential acquisition, deployment, secrets changes.
- sibling writes or mutation.
- force push/history rewrite/destructive recovery.

## Next action

1. Discover live HEAD/origin/main and workspace/session truth.
2. Read SPEC/PLAN plus parent programme continuity and relevant implementation/tests.
3. Reproduce the generic-product-path limitations with focused tests/operator probes.
4. Freeze the shared LocalInvestigationContext/provider interfaces before delegating parallel code changes.
5. Proceed milestone-by-milestone; do not declare the task COMPLETE until M9 certification.

## Completion snapshot

Not complete. Populate only after full implementation + certification.
