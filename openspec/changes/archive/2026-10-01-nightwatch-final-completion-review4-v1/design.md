## Context

The parent campaign `nightwatch-final-product-completion-v1` is paused at a
clean, canonical-routed checkpoint: `67eb3098` = `origin/main`, exact-head CI
run 36832639979 GREEN (15/15 groups), no live session, canonical clean. The
child `nightwatch-final-completion-corrections-v1` is closed and archived; its
session branch is deleted. Review-4 (`audit.md`, reproduced verbatim from
`RESUME_PROMPT_4.md` §3) is the complete scope of this change.

The parent's design decisions and the owner decisions OD-1..OD-4 stay in
force. This change adds OD-5 and OD-6 (below), recorded as **D-150** in
`docs/DECISIONS.md`, and resolves the review-4 findings without weakening any
guard.

## Goals / Non-Goals

**Goals.** Make certification reachable and sound: an honest system verifies
every receipt completely; a documentary descendant of S can certify; a rename
cannot hide a source deletion; a missing topology receipt cannot pass; the
required 16 conditions are all reachable and none is discarded. Make the
review-4 guard survivors impossible (mutant families, behavioural fixtures).
Record CI truth instead of bending it. Carry D-149's refusal count into the
recorded summary. Leave the records, ledgers and continuity truthful.

**Non-Goals.** No new certification machinery, no cryptographic receipt
authentication, no product scope beyond the five named defects, no parent
milestone work (M9 remainder → M14 stays in the parent), no new
authorization, no Alphaus DEV/NEXT/production contact, no new absolute home
path, no publication.

## Owner decisions (verbatim, source: `RESUME_PROMPT_4.md` §1, review-4
corrective campaign)

> - **OD-5 (receipt threat model).** Receipts are **tamper-evident under the
>   cooperative same-OS-user model, not tamper-proof**. This matches how
>   AGENTS.md already treats session IDs.
>   - Do not build cryptographic receipt authentication.
>   - DO make verification complete for an honest system. Verification checks
>     the subject, the receipt kind and schema, the SHA, the PASS verdict, a
>     clean emit and the content digest. That way a mistaken, stale, failed or
>     mismatched receipt can never certify.
>   - DO state this limit wherever receipts are described (SAFETY_MODEL,
>     DECISIONS, the release-evidence module header). No DONE note or commit
>     message may call receipts "forgery-proof" or "unforgeable".
> - **OD-6 (what 16/16 requires).**
>   - (a) **`autonomous-yield-proof` becomes certifying** only from the yield
>     receipt produced by the authorized single paid provider run (parent task
>     12.3). It requires a completed campaign at S with recorded provider calls.
>     Until that run exists, the condition is honestly NOT MET; it is never
>     demoted out of the required set.
>   - (b) **Topology certification means:** a local, Bubblewrap-backed PROVEN
>     topology receipt at S, plus exact-head CI `EXECUTED_PASS` at S. CI's
>     degraded topology is recorded as evidence but is never certifying. A
>     missing topology receipt is NOT MET (fail closed).
>   - (c) **Certification is reachable only via** S itself, or a
>     documentary-only descendant of S with a clean tree. Every guard that
>     decides "documentary" must be the same classifier, applied with the
>     production receipt verifier wired in.

## Decisions

### D150-1. Receipts are tamper-evident, not tamper-proof

OD-5 is the whole threat model. The verifier becomes COMPLETE for an honest
system (subject, kind, schema, SHA, PASS verdict, clean emit, content digest)
and stops there. There is no signature, no MAC, no key material, and no
"unforgeable" claim anywhere in source, DONE notes or commit messages. The
residual is stated in `docs/SAFETY_MODEL.md`, `docs/DECISIONS.md` and the
`bin/lib/release-evidence.mjs` module header.

### D150-2. The production receipt verifier is the ONE verifier

A single `productionBindingReceiptVerifier(root)` (release-evidence module)
wraps `verifyPersistedReceipt` with fail-closed defaults. Every production
caller of `checkpointRoleViolations` — `bin/project-state-check.mjs` (the
commit-shape check, the certification demotion range, the range classifier
callback, the task-ahead range, the CI-anchor range) and `bin/agent-state.mjs`
(the commit classification and the three range checks) — passes it. The
`() => true` stubs survive ONLY inside hardening/test fixtures, which is why
R4-08's mutant family asserts the production wiring behaviourally on real git
fixtures rather than on the stub.

### D150-3. Rename detection is disabled for classification

`--no-renames` is required on every `git diff` / `diff-tree` name listing used
to decide what a commit or range touched. A rename is a DELETE plus an ADD;
either half may be substantive. The rule is enforced twice: by the code and by
a TOTALITY hardening rule that fails on a name-listing git invocation without
`--no-renames` in the classification modules.

### D150-4. Complete verification, then the honest fail-closed order

`verifyPersistedReceipt(root, subject, digest, sha)`:

1. input shape: `digest`/`sha` well formed, 40-hex SHA;
2. kind: `clean-receipt:` → `artifacts/gate-receipts/` (gate clean receipt);
   `receipt:` → `artifacts/receipts/` (quality gate receipt);
3. schema: the receipt's own `schemaVersion` must be one of the two declared
   receipt schemas for that kind;
4. subject: the receipt must name the same subject (routing record) or, for
   receipts that carry no subject, the ledger digest of its `conditions` /
   `groups` must match the subject's declared artifact or definition, so a
   UI receipt cannot certify a lane subject;
5. PASS verdict: `finalResult` (gate receipt) or `gateResult` / `result`
   (clean receipt) must be exactly `PASS`;
6. clean emit: the clean-receipt body must carry `sourceRootCleanAtEmit:
   true` (and the quality-gate emit must not carry a failing verdict);
7. digest: re-derive over the body without `receiptDigest`, with the writer's
   own canonicalisation (order-preserving for clean receipts, sorted-key for
   gate receipts), and compare.

Every failure is a plain non-verification with a distinct reason. A missing
directory, an unparsable file, a mismatched kind, a mismatched subject, a
missing verdict, a FAIL verdict and a digest mismatch are all `verified:false`.

### D150-5. Topology certification is a conjunction, never a fallback

`probeCiBlockRecord` requires BOTH: a topology receipt at the executed SHA
whose `provenance === 'PROVEN'` (Bubblewrap envelope, not
`PROVEN_DEGRADED`/`BWRAP_UNAVAILABLE_DEGRADED`), AND
`CI_STATUS === EXECUTED_PASS` with `CI_EXECUTED_SHA === executed ===
LAST_SUBSTANTIVE_IMPLEMENTATION_SHA`. No receipt → `UNMET`
(`TOPOLOGY_RECEIPT_ABSENT`). A degraded receipt → `UNMET`
(`TOPOLOGY_NOT_CERTIFYING`) and is still recorded as evidence with an explicit
non-certifying label. The detail text never attributes a topology class to a
CI run: the receipt is named as the LOCAL envelope proof and the CI run as the
exact-head execution.

### D150-6. `autonomous-yield-proof` stays required and stays honest

`certifying` becomes `true`, and the condition resolves MET only from the
yield receipt of the authorized single paid provider run (parent 12.3): a
completed campaign at S with recorded provider calls. Until that run exists
the condition is `UNMET`/`EVIDENCE_ABSENT` and certification is refused — the
honest state, and the one 16/16 is defined against.

### D150-7. Product fixes carry their own decisions

- Proxy liveness: `PROXY_LIVENESS_FAILURE_THRESHOLD = 3` consecutive
  failures OR `PROXY_LIVENESS_DEADLINE_MS = 5000` from the first miss, with
  per-probe `timeout: 1000` unchanged. Recorded in DECISIONS; the mechanism
  replaces FLAKE-003's "first miss is fatal" fragility, and FLAKE-003's
  "no failing surface touched" statement is corrected (networkObserver.ts did
  change; the new tests drive the module-global `bodyReadsInFlight` counter in
  a shared worker).
- `captureFailureCounts` is part of the D-149 refusal surface, so every exit
  path that records a run summary records it — the main-path journey evidence,
  its manifest entry, the journey event and the auth-invalid manifest entry.
- The VC-01 required list is the CI-observed per-test proof list; it must name
  the storage-state live cookie-readability test and the three
  devLoginSecurity tests, exactly the identities whose silent skip VC-01
  exists to prevent.
- The formatter-policy suite must run the real Prettier binary in the parent
  cwd (or declare the binary's absence explicitly), and it must be in a CI
  lane; the `.prettierignore` comment is corrected to state the actual reason.
- `ai-local-canary`'s help must describe the flags the parser really accepts
  (`--flag value` and `--flag=value` both accepted) and mark only the flags
  that are actually optional as optional; dead `usage()`/`parsed.help` code is
  removed.

### D150-8. Records are corrected by appended dated annotations

R4-20 and R4-24 are record defects. The corrections-v1 REPORT keeps its bytes
and gains a dated `## Review-4 corrections (appended)` section with a per-ID
disposition table for all 71 IDs and the specific annotations the finding
names; the DECISIONS session-identity line is corrected by an appended
correction entry (`config/document-role-corrections.v1.json`), never by
rewriting the historical line. CI-block-record history gains the five red runs
and their repairs.
