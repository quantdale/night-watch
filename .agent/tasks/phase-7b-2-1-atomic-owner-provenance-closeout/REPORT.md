# NIGHTWATCH PHASE 7B.2.1 — ATOMIC OWNER PROVENANCE CLOSEOUT

## Status

Local implementation, adversarial validation, isolated clean-checkout
validation, checkpoint pushes, documentation closure, and exact GitHub
Actions inspection for the prior live documentation checkpoint are complete.
This final evidence snapshot is a documentation-only descendant; its exact
workflow is the remaining post-push check, and its containing SHA is
intentionally not embedded here.

## Stable anchors

- Starting SHA: `9d591ffd59719c2bba1dc155d614fd5c9b6a7078`.
- Primary implementation checkpoint: `d78f93bc622e3d0548cbd4bd674775d02e7fb9b4`.
- Validated implementation/substantive checkpoint:
  `3916594f6e947f7f4665b23751c1d3ec03f5928b`.
- Documentation checkpoint: `9ff3ba445f8122a2c0d3832d97b49bd69365b9ec`, the
  prior approved documentation descendant whose exact workflow passed. The
  final containing SHA remains Git-discovered and is not serialized here.
- Live HEAD authority: discover local Git `HEAD` and `origin/main`.

Phase 7B.2 remains `COMPLETE`. Phase 8 remains `NOT_STARTED`. Phase 6 remains
`FROZEN_BY_OWNER / INFRASTRUCTURE_AND_DATA_LAYER_OUT_OF_SCOPE`.

## Immutable persistence closeout

The confirmed defect was a pre-read followed by replacement-capable
`renameSync`: two processes could both observe absence and the later rename
could replace the first complete file. `writeImmutableJson()` no longer calls
that replacement path and no longer uses the pre-read as exclusion.

The final primitive is:

1. validate the safe filename, private payload, owner-only root, and path
   components;
2. create a random same-directory hidden temporary with `openSync(..., 'wx',
   0600)`;
3. write the complete final JSON envelope and fsync the temporary file;
4. verify it is an owner-owned regular 0600 file;
5. publish with POSIX `fs.linkSync(temporary, destination)`;
6. map `EEXIST` to `PRIVATE_ARTIFACT_IMMUTABLE` without replacing the existing
   file; map unsupported no-replace errors to
   `PRIVATE_ARTIFACT_NO_REPLACE_UNSUPPORTED` and fail closed;
7. unlink only the losing temporary name after a successful link; and
8. fsync the private root directory and re-verify the destination.

There is no unsafe rename, copy-over-existing, unlink-destination, truncate,
or write-destination fallback. File content is fsynced before publication and
the containing directory is fsynced after namespace changes. Transactional
filesystem crash consistency is not claimed; a crash can leave a hidden
temporary requiring normal local hygiene.

Temporary names use process identity plus cryptographic randomness, remain in
the exact validated root, are `wx`/0600 regular owner files, and are cleaned
best-effort on success and pre-publication failure. Winners are never removed.
Root mode remains 0700, file mode remains 0600, and owner UID is checked where
the platform exposes it. Preexisting and publication-time symlinks are not
followed or replaced.

## AI artifact semantics

- Bug drafts: one-shot complete READY immutable publication. Same-ID/different
  `generatedAt` bytes cannot replace the first winner; exact duplicates are
  idempotent; corrupt winners return `AI_REVIEW_STATE_INVALID`.
- Oracle suggestions: the same shared no-replace path and same collision
  semantics; `AI_GENERATED_UNREVIEWED` and `executable=false` remain intact.
- Human reviews: atomic no-replace publication through
  `writeHumanReview()`. A valid concurrent winner is strictly re-read;
  identical bytes are idempotent, while a different valid record returns
  `AI_REVIEW_ALREADY_REVIEWED` from the owner-decision service. A corrupt,
  malformed, unsafe, or mismatched winner is never overwritten.
- Review read-back still validates review identity, artifact identity, full
  artifact digest, decision, `reviewerClass=OWNER`, and
  `publication=PROHIBITED`. Owner decisions never modify the AI artifact.

## Human authority closeout

Before this task, `src/core/aiReview/index.ts` wildcard-exported
`recordOwnerDecision` and `recordConfirmedOwnerDecision`; the raw helper had no
TTY or confirmation boundary. The public surface is now selective and exposes
neither writer nor `createHumanReviewRecord`. `ownerReview.ts` is read/render
only. `ownerDecision.ts` is internal, absent from the public index, and its raw
unconfirmed helper is private. Its only write-capable exported entry requires
the selected decision, exact confirmation token, and displayed artifact digest.

The source-derived unique call graph is:

`bin/ai-owner-review.mjs`
→ `stdin.isTTY && stdout.isTTY`
→ exact `show/status/decide` command and fixed A/R/S/Q menu
→ exact `APPROVE`/`REJECT`/`SUPERSEDE` confirmation
→ internal `ownerDecision.ts`
→ `createHumanReviewRecord`
→ `AiReviewArtifactStore.writeHumanReview`
→ `PrivateArtifactStore.writeImmutableJson`
→ `fs.linkSync` create-if-absent publication
→ strict read-back.

The tracked-runtime hardening scan found no second writer, campaign path,
provider path, network path, Git/publication path, or public raw decision API.
The CLI still rejects non-TTY execution, decision argv/env/file/pipe bypasses,
wrong or empty confirmation, and Ctrl-C without writing. Help wording is
prospectively correct: commands are `show`, `status`, `decide`; flags are
`--help` and `-h`.

Terminal sanitizer/prefix behavior, no-provider imports, no-network behavior,
no-Git/publication behavior, and oracle non-executable/manual-only semantics
remain intact.

## Validation ledger

- Atomic private publication tests: PASS, including first-writer-wins,
  complete JSON, exact bytes, modes, privacy-before-temp, unsupported
  primitive, pre-publication write failure, directory-fsync failure,
  preexisting symlink, publication-time symlink, and child-process race.
- Owner-review tests: PASS, 20 tests.
- AI review/storage tests: PASS within the 91-test provenance matrix,
  including generated bug/oracle races, duplicate/different identity, corrupt
  state, owner races, digest read-back, and authority boundaries.
- Atomic/owner provenance matrix: PASS, 91/91.
- Full current Playwright suite: PASS, 513/513.
- Synthetic campaign: PASS, 27/27.
- Agent-state unit matrix: PASS, 32/32.
- TypeScript: PASS.
- `hardening:check`: PASS.
- `agent:check`: PASS in the final clean checkout; the pre-closure local run
  had only the expected stale-baseline warning before the new anchor was
  recorded.
- `git diff --check`: PASS.
- Privacy/secret scan and manual scoped diff review: PASS; no credential,
  token, cookie, customer value, real finding, raw AI content, or auth state
  entered the repository.

## Clean checkout

A fresh full-history isolated clone at the validated implementation checkpoint
passed `npm ci --ignore-scripts`, typecheck, hardening, the 91-test provenance
matrix, 32 agent-state tests, synthetic campaign, `agent:check`, and diff
check. It used a minimal explicit environment and temporary synthetic roots;
the canonical owner findings root was not used.

## Safety and privacy vectors

DEV contacts: 0. NEXT contacts: 0. Production attempts: 0. Product
mutations: 0. Database queries: 0. Infrastructure queries: 0. External
publication: 0. External AI calls: 0. AI tool executions: 0. Real owner-review
CLI provider calls: 0. New persisted credentials/tokens/cookies/customer
names/emails/account IDs/payer IDs/billing-group IDs/financial values/raw
bodies/DOM/screenshots/traces/prompts/responses: 0.

Only local synthetic providers and synthetic child processes were used. No
model was run, no model was downloaded, no DEV/NEXT/product/browser/API
workflow was invoked, and Phase 8 was not started. Sibling Alphaus
repositories were not modified.

## Architecture and adversarial verdict

- `writeImmutableJson()` cannot replace an existing destination and does not
  rely on pre-read exclusion.
- Competing owner decisions and generated bug/oracle artifacts leave exactly
  one durable winner; losers cannot overwrite and valid winners can be
  safely classified after strict read-back.
- Exact-identical artifacts/reviews remain duplicate-safe; different bytes,
  corrupt state, and symlink destinations remain protected.
- Root/file mode and owner-only policy remain enforced.
- The public AI-review index exposes no human-decision writer; only the
  explicit TTY/two-confirmation CLI reaches the internal writer.
- Provider, network, Git, publication, campaign, and Phase 8 paths cannot
  reach owner provenance.

Adversarial cases exercised: competing payloads, competing APPROVE/REJECT and
APPROVE/SUPERSEDE decisions, exact duplicates, same-ID different bug/oracle
bytes, corrupt state, preexisting and inserted symlinks, temporary cleanup,
unsupported primitive, write failure, directory fsync failure, public API
exclusion, direct internal test access, non-TTY, argv rejection, wrong
confirmation, provider/network/Git/publication static scans, and campaign
isolation.

## Remaining debt and verdict

The only deliberately retained local hygiene debt is crash-left hidden
temporary cleanup; no broad cleaner was introduced. Crash consistency beyond
file fsync, no-replace link, and directory fsync is intentionally not claimed.
Local-model canary is a possible future task and was not started.

Exact prior documentation CI verdict: PASS — `Nightwatch hardening` run
`31803341672` completed with success at head
`9ff3ba445f8122a2c0d3832d97b49bd69365b9ec`; the atomic/provenance matrix
step executed and succeeded. After pushing this evidence snapshot, inspect
the exact workflow for its resulting live SHA, then stop; do not start
another task.
