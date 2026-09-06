# SPEC — nightwatch-agent-tool-protocol-v1 (Lane C: Safe Agent Tool Protocol)

## Goal
Implement `ToolRuntime` in `src/core/agentTools/**` that executes the frozen
agent tool catalog (`src/core/agentProtocol/tools.ts`) by delegating to
EXISTING Nightwatch modules. No engine reimplementation. No `agentProtocol`
edits. No AI review contact.

## Execution pipeline (every call, in order)
1. `toolId` is taken ONLY from the validated `CALL_TOOL` intent's `toolId`
   field. `arguments["toolId"]` and any embedded instruction text are data
   with zero authority.
2. `lookupAgentTool(toolId)` → null ⇒ fail closed `UNKNOWN_TOOL`.
3. Non-`CALL_TOOL` intent kinds ⇒ fail closed `UNSAFE_INTENT`.
4. `descriptor.mutationCapability !== 'NONE'` ⇒ `UNSAFE_INTENT`
   (defense in depth; the frozen catalog is all `NONE` today).
5. `context.authorizedEnvironments` must include `descriptor.environment`,
   else `UNAUTHORIZED_ENVIRONMENT`. DEV browser/API tools therefore fail
   under the programme's LOCAL-only authorization.
6. `decideOwnerScope(descriptor.authorizationClass)` must allow, else
   `UNSAFE_INTENT`.
7. Dispatch to the per-tool adapter. Adapters are read-only and work only
   over caller-supplied fixtures plus existing pure engines; they have no
   fs/network/child-process authority.
8. Sanitize every success payload: secret redaction, `UNTRUSTED_BYTE_CAP`
   truncation, wrap in `UntrustedEnvelope(trust: UNTRUSTED)`, mint
   `ev:sha256:` evidence refs. Every result (success or failure) carries
   `mutationCapability: 'NONE'` and `evidenceRefs`.

## Adapters (delegate, don't reimplement)
- `INSPECT_SOURCE_SURFACE` → `tokenizeStaticSource` (source/lexical) over a
  fixture surface. No filesystem reads.
- `QUERY_SYSTEM_MAP` → `projectCompany` / operator-query projections
  (systemMap/projections) over a fixture `SystemMapInput`.
- `RETRIEVE_SANITIZED_EVIDENCE` → fixture evidence-store lookup + sanitizer.
- `ASK_DETERMINISTIC_ORACLE` → deterministic fixture answer lookup (no AI).
- `COMPARE_OBSERVATIONS` → `compareBrowserAndApi` (triage/differential).
- `REQUEST_ROUTE_CONTRACT_PROOF` → echo stored route-proof fields from the
  fixture system map; never invent proofs.
- `REQUEST_FINDING_PROPOSAL` → proposal-only object; requires non-empty
  `evidenceRefs`; human review mandatory, no filing authority.
- `RERUN_SAFE_REPRODUCTION` → `validateTriageReplayPlan`
  (triage/replayPlan) then report `NOT_EXECUTED`; plan validation only.
- `REQUEST_BROWSER_OBSERVATION` / `REQUEST_API_OBSERVATION` → honest
  `ADAPTER_UNAVAILABLE` stub after gates (no contained DEV harness here).
- `QUERY_BUG_ATLAS` / `QUERY_SYSTEM_ATLAS` /
  `REQUEST_RELATED_HISTORICAL_BUGS` → structured `LANE_NOT_INTEGRATED`
  success with zero records; atlas data is never invented.

## Acceptance (tests/unit/agentTools*.test.ts)
unknown tool · unauthorized DEV env · local inspect/query success on
synthetic fixtures · prompt-injection payload cannot change tool id ·
mutation remains NONE on every path · secret sanitization · real
differential verdict · lane-not-integrated atlas shape.
