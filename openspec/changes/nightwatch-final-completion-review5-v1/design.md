## Context

The parent campaign `nightwatch-final-product-completion-v1` is paused at the
clean checkpoint `d68bb1a7` (documentation-only descendant of `2e0cfda0`,
whose exact-head CI run 36916725274 is GREEN, 15/15 groups). The release
verdict is 0/16 conditions met, certification refused (fail-closed). The
review-4 child is closed and archived. Review-5 (`audit.md`, reproduced
verbatim from `RESUME_PROMPT_5.md` §3) is the complete scope of this change.

The parent's design decisions and owner decisions OD-1..OD-6 stay in force.
This change adds the owner decision "both" (below), recorded as **D-152** in
`docs/DECISIONS.md`, and resolves the review-5 findings without weakening any
guard.

## Goals / Non-Goals

**Goals.** Close the real integrity defects first (Track A): archive-move
smuggling, rename-hidden deletions, receipts that verify from a dirty tree or
for subjects their producer never ran, guard families that are text anchors,
the DEV-launcher effect scan, the CLI regressions, the CI record, the small
truths, and the process breaches. Then make certification reachable honestly
(Track B): a real producer for every one of the 16 conditions and 11 lanes,
verifiable from a clean clone, ending in a fixture-repository proof of 16/16.

**Non-Goals.** No cryptographic receipt authentication (OD-5), no parent
milestone work (M9 10.4 onward stays in the parent), no use of the parent's
single-use grants (the 12.3 paid run and the 15.4 npm query), no new product
scope, no Alphaus DEV/NEXT/production contact, no new absolute home path, no
publication, and no review-6 by default.

## Owner decision (verbatim, source: `RESUME_PROMPT_5.md` header and §1)

> **Owner decision (2026-10-02): "both".** Keep OD-2 (target
> `PROJECT_COMPLETE_AND_CI_CERTIFIED` under D-129, all 16 conditions). Do two
> things together in one bounded child campaign,
> `nightwatch-final-completion-review5-v1`:
>
> - **Track A — integrity and product fixes.** Real defects. Do this track first.
> - **Track B — make certification reachable, honestly.** Every one of the 16
>   conditions gets a real producer that can be verified from a clean clone.

## Decisions

### D152-1. Order is Track A, then B1, then B2..B6

Track A fixes (groups A1–A9) land first, each with its regression test and its
mutants, one commit per fix. Track B starts only after the Producer Matrix
below is complete for all 16 conditions and all 11 lanes and the change is
strict-validated. A row that cannot be completed honestly is an owner question
(STOP), never a guess.

### D152-2. Mutation testing is behavioural and committed

Every guard added or fixed is covered by a behavioural test; a source-text
anchor alone never counts. Every R5-05/R5-06 mutant is registered as a probe
and DETECTED. One committed mutation harness applies each registered mutant to
a scratch copy, runs `hardening:check` plus the guard's focused tests, and
fails on any survivor; it runs in `gate:milestone`.

### D152-3. Certification evidence is verified from a clean clone

A receipt that lives only in git-ignored host directories certifies nothing
CI or `gate:clean` checks. The persistence mechanism is chosen in task B1.1 and
recorded in D-152. The recommended mechanism: receipts produced at the
certified checkpoint S are committed as tracked files under one approved,
schema-validated evidence path, in a documentary descendant of S. OD-5 still
holds: receipts are tamper-evident, not tamper-proof.

### D152-4. Exit rule

If Track B cannot make all 16 conditions reachable honestly, the campaign
STOPs and reports which conditions and why; it does not keep adding machinery.
The owner then decides whether to narrow OD-2.

### D152-5. One bootstrap commit; the ledger registration is mechanically second

The task-ID ledger records the 40-hex SHA of the bootstrap commit whose
`tasks.md` is the ID baseline, and a commit cannot contain its own hash. The
change, its continuity and PLAN M0 are therefore ONE commit, and the ledger
registration that names that commit follows immediately in the same unpushed
batch. Both are pushed together; no intermediate state is ever pushed.

## Certification Producer Matrix

Filled in task B1.1 from a read-only inspection of the evaluator, the receipt
verifier and the 15 gate groups at `4f4d7bfd` (certified checkpoint S =
`027367d9`, which MOVES: every receipt is regenerated at the final S). One row
per condition and per lane. Columns: the producer command and the gate group
that runs it; the receipt kind and schema; the closed subject set; the verdict
field(s); where the receipt is persisted; how a clean clone (CI, `gate:clean`)
verifies it; and which commit S it binds to and how a documentary descendant
commits it. `DESIGNED` means the row is complete and honest and Track B (B2-B6)
implements it; `depends on parent ...` names a grant or work the PARENT owns.
No row is `EMPTY`; no row needed an owner decision (the exit rule did not
trigger at B1).

### Chosen mechanism (D152-3, recorded in D-152)

1. **One new receipt kind, `certification`**, schema
   `nightwatch.certification-evidence-receipt.v1`, ONE receipt per subject
   (digest `receipt:sha256:<24>`, computed with `stableCanonical` over the body
   without `receiptDigest`). Body fields are allowlisted tokens only:
   `schemaVersion`, `subject`/`subjects` (closed set), `sourceHead` (= S),
   `observedAtHead`, `sourceRootCleanAtEmit`, `checkId`, `checkState`, `result`,
   token counts, `environmentClass`. NO path, host name, user name, cookie,
   header or customer value (D-149: the repository is temporarily public).
2. **Persistence: tracked, not ignored.** Receipts are committed under
   `evidence/certification/<S>/<subject>.json` in a DOCUMENTARY descendant of S.
   `artifacts/` stays git-ignored (it also rejects tracked files by rule), so the
   path is a new approved exact pattern (`isApprovedCheckpointPath`) with a
   content guard (a new `GUARD_CLASSES` entry: schema, closed subject, `sourceHead`
   = an ancestor of the commit, digest re-derivation, allowlist). Probes for
   `checkCheckpointRoleGuardIntegrity` cover both. These changes are SUBSTANTIVE and
   must land BEFORE the final S.
3. **Clean-clone verification (B3).** `RECEIPT_KINDS` gains a second read directory
   (the tracked one) so CI and `gate:clean` verify exactly what the host did.
   Receipt file names are `<subject>.json` under the S directory, never
   `local-<head12>.json` that a re-run overwrites.
4. **Evidence is the check's own output at S, attested, not a second opinion.**
   `certify:evidence` runs the SAME registered check functions
   `project-state-check` uses (never a parallel implementation) at HEAD == S on a
   clean tree, and a host-bound check (rows 3, 8, 15, 24, 27) is consumed from the
   committed receipt (path b of `probe-binding`) wherever the host capability is
   absent. A receipt for a condition whose check is not `MET` is written with
   `result` != `PASS` and never verifies.
5. **Circularity is broken by ordering.** Bindings are rebound AFTER S, so a
   receipt certifies the property CHECK at S, never the evaluated verdict.
   Order of the final certification pass: lane receipts (rows 17-27), then
   condition 1, then the remaining conditions, then the CI observation records
   (rows 2, 26), then the binding rebind commit (documentary).
6. **OD-5 stands.** The receipts are tamper-evident, not tamper-proof: no
   signature, no key, no MAC. They are verifiable from a clean clone because the
   bytes and the verifier are both in the repository.

### Dependencies the child cannot satisfy and the parent owns

- Condition 3 (`autonomous-yield-proof`): the single paid provider run (parent 12.3).
- Conditions 8 and lane 27 (`dependency-*`): the single npm registry query (parent 15.4).
- Condition 10 (`cli-implementation-contract`): the bin burn-down to BLOCKING with zero
  exemptions (parent M9 10.4-10.6); live UNMET until then.
- Conditions 2 and lane 26: the GitHub Actions run at the FINAL S, observed after the push.
- Lane 25 (`owner-manual`): not producible; certified as a recorded, current,
  unexpired unavailable lane. The child never claims it PROVEN.

The reachability proof (B6) therefore demonstrates, on a synthetic repository,
that with every external input supplied the evaluator reaches 16/16; and on the
real tree, exactly which conditions remain pending and on which dependency.

### Conditions (16)

| # | Subject | Producer command | Gate group | Receipt kind / schema | Closed subject set | Verdict field(s) | Persistence | Clean-clone verification | Binds to S / documentary-descendant route | Status |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | `validation-lane-closure` | `npm run certify:evidence -- --subject validation-lane-closure` at HEAD == S, clean tree (B2.1); runs the `validation-lane-state` check after every lane receipt (rows 17-27) is bound | PROJECT_TRUTH (reports; the receipt adds the verdict) | `certification` / `nightwatch.certification-evidence-receipt.v1` (new, B2.1) | exactly `validation-lane-closure` (one receipt per subject) | `result` = `PASS` only when the recorded check state is `MET` at S; any other state writes a non-verifying record | tracked `evidence/certification/<S>/<subject>.json` (approved exact-pattern path + content guard, B3.1) | check is a reproducible tree probe, re-run live in CI; receipt read from the tracked directory | `sourceHead` = S, `sourceRootCleanAtEmit` = true; the binding rebind (`evidenceSha` = S + `receiptDigest`) and the receipt land in a DOCUMENTARY descendant of S | DESIGNED |
| 2 | `exact-head-ci-authority` | `npm run certify:evidence -- --subject exact-head-ci-authority` at HEAD == S, clean tree (B2.1) attests the LOCAL half (record valid and current, local Bubblewrap topology receipt `PROVEN`); the CI half is the GitHub Actions run at S observed after the push and recorded in `config/ci-block-record.v1.json` + the CURRENT_STATE block (documentary paths) | TOPOLOGY (local); GitHub Actions `gate:ci` (observation, OD-3 read) | `certification` / `nightwatch.certification-evidence-receipt.v1` (new, B2.1) | exactly `exact-head-ci-authority` (one receipt per subject) | `result` = `PASS` only when the recorded check state is `MET` at S; any other state writes a non-verifying record | tracked `evidence/certification/<S>/<subject>.json` (approved exact-pattern path + content guard, B3.1) | record + block fields are tracked; CI topology is `PROVEN_DEGRADED` and never certifying (D-150 OD-6b), so the local topology receipt is consumed as a committed receipt (B5) | `sourceHead` = S, `sourceRootCleanAtEmit` = true; the binding rebind (`evidenceSha` = S + `receiptDigest`) and the receipt land in a DOCUMENTARY descendant of S | DESIGNED (depends on exact-head CI green at S, recorded after the push) |
| 3 | `autonomous-yield-proof` | parent task 12.3 (the single authorized paid run, grant held by the PARENT) produces `artifacts/nightwatch-*`; then `certify:evidence --subject autonomous-yield-proof` derives an ALLOWLISTED summary (run id token, S, completed-call count, reproduction count, sibling-unchanged flag, leak-scan token) (B4) | none (the run is the producer) | `certification` / `nightwatch.certification-evidence-receipt.v1` (new, B2.1) | exactly `autonomous-yield-proof` (one receipt per subject) | `result` = `PASS` only when the recorded check state is `MET` at S; any other state writes a non-verifying record | tracked allowlisted summary only; raw run artifacts stay in git-ignored `artifacts/` | the committed summary is verified against the closed schema; the check is receipt-consuming (path b) so a clean clone never re-runs the paid run | `sourceHead` = S, `sourceRootCleanAtEmit` = true; the binding rebind (`evidenceSha` = S + `receiptDigest`) and the receipt land in a DOCUMENTARY descendant of S | DESIGNED (depends on parent 12.3; the child builds the verifier and derivation, never runs the paid call) |
| 4 | `completion-ledger-truth` | `npm run certify:evidence -- --subject completion-ledger-truth` at HEAD == S, clean tree (B2.1) (runs the `ledger-agreement` check: strict_errors=0, legacy_undeclared=0, no `LEDGER_*` error) | AGENT_CONTINUITY (`agent:check` + `agent:audit`; PARTIAL: `legacy_undeclared` is only a warning there, so the producer measures it itself) | `certification` / `nightwatch.certification-evidence-receipt.v1` (new, B2.1) | exactly `completion-ledger-truth` (one receipt per subject) | `result` = `PASS` only when the recorded check state is `MET` at S; any other state writes a non-verifying record | tracked `evidence/certification/<S>/<subject>.json` (approved exact-pattern path + content guard, B3.1) | verifier reads the tracked directory (B3.2); a reproducible check is also re-run live, a host-bound check is receipt-consumed (B3.1) | `sourceHead` = S, `sourceRootCleanAtEmit` = true; the binding rebind (`evidenceSha` = S + `receiptDigest`) and the receipt land in a DOCUMENTARY descendant of S | DESIGNED |
| 5 | `operator-cli-contract` | `npm run certify:evidence -- --subject operator-cli-contract` at HEAD == S, clean tree (B2.1) (static listing: 0 undeclared, 0 declared-broken) | HARDENING (adjacent: `checkSharedOperatorParserStructure`, `checkBinExecutionCoverage`; no group measures the listing, so the producer does) | `certification` / `nightwatch.certification-evidence-receipt.v1` (new, B2.1) | exactly `operator-cli-contract` (one receipt per subject) | `result` = `PASS` only when the recorded check state is `MET` at S; any other state writes a non-verifying record | tracked `evidence/certification/<S>/<subject>.json` (approved exact-pattern path + content guard, B3.1) | verifier reads the tracked directory (B3.2); a reproducible check is also re-run live, a host-bound check is receipt-consumed (B3.1) | `sourceHead` = S, `sourceRootCleanAtEmit` = true; the binding rebind (`evidenceSha` = S + `receiptDigest`) and the receipt land in a DOCUMENTARY descendant of S | DESIGNED |
| 6 | `documentation-currency` | `npm run certify:evidence -- --subject documentation-currency` at HEAD == S, clean tree (B2.1) (`hardening-check --report-documentation-currency` = 0 findings) | HARDENING (3 blocking rules) | `certification` / `nightwatch.certification-evidence-receipt.v1` (new, B2.1) | exactly `documentation-currency` (one receipt per subject) | `result` = `PASS` only when the recorded check state is `MET` at S; any other state writes a non-verifying record | tracked `evidence/certification/<S>/<subject>.json` (approved exact-pattern path + content guard, B3.1) | verifier reads the tracked directory (B3.2); a reproducible check is also re-run live, a host-bound check is receipt-consumed (B3.1) | `sourceHead` = S, `sourceRootCleanAtEmit` = true; the binding rebind (`evidenceSha` = S + `receiptDigest`) and the receipt land in a DOCUMENTARY descendant of S | DESIGNED |
| 7 | `workspace-continuity-drift-closure` | `npm run certify:evidence -- --subject workspace-continuity-drift-closure` at HEAD == S, clean tree (B2.1) (`CLAIM_TASK_*` + `legacy_undeclared`) | WORKSPACE_INTEGRITY (claim findings are attention only, so the producer measures them itself) | `certification` / `nightwatch.certification-evidence-receipt.v1` (new, B2.1) | exactly `workspace-continuity-drift-closure` (one receipt per subject) | `result` = `PASS` only when the recorded check state is `MET` at S; any other state writes a non-verifying record | tracked `evidence/certification/<S>/<subject>.json` (approved exact-pattern path + content guard, B3.1) | the check reads host-local ownership records (absent in a clean clone = vacuously MET); the committed receipt records `liveSessionCount` and the claim tokens at S so the evidence is not merely the absence of records | `sourceHead` = S, `sourceRootCleanAtEmit` = true; the binding rebind (`evidenceSha` = S + `receiptDigest`) and the receipt land in a DOCUMENTARY descendant of S | DESIGNED |
| 8 | `dependency-supply-chain-currency` | parent task 15.4 (the single authorized npm registry query) refreshes `config/dependency-currency.v1.json`, including biome and prettier; then `certify:evidence --subject dependency-supply-chain-currency` on the qualified host (Node 22.22.1 + WSL2 marker) (B3.1) | none (registry query is the producer) | `certification` / `nightwatch.certification-evidence-receipt.v1` (new, B2.1) | exactly `dependency-supply-chain-currency` (one receipt per subject) | `result` = `PASS` only when the recorded check state is `MET` at S; any other state writes a non-verifying record | tracked `evidence/certification/<S>/<subject>.json` (approved exact-pattern path + content guard, B3.1) | runtime qualification is host-bound, so a clean clone / CI runner consumes the committed receipt (path b) instead of re-qualifying | `sourceHead` = S, `sourceRootCleanAtEmit` = true; the binding rebind (`evidenceSha` = S + `receiptDigest`) and the receipt land in a DOCUMENTARY descendant of S | DESIGNED (depends on parent 15.4; the child makes the check receipt-consuming) |
| 9 | `dead-architecture-closure` | `npm run certify:evidence -- --subject dead-architecture-closure` at HEAD == S, clean tree (B2.1) (`--report-reachability` findings=0, retention list empty) | HARDENING (`checkSourceReachability`, `checkModuleBarrierEnforcement`; PARTIAL: retention-empty is enforced only by the project probe) | `certification` / `nightwatch.certification-evidence-receipt.v1` (new, B2.1) | exactly `dead-architecture-closure` (one receipt per subject) | `result` = `PASS` only when the recorded check state is `MET` at S; any other state writes a non-verifying record | tracked `evidence/certification/<S>/<subject>.json` (approved exact-pattern path + content guard, B3.1) | verifier reads the tracked directory (B3.2); a reproducible check is also re-run live, a host-bound check is receipt-consumed (B3.1) | `sourceHead` = S, `sourceRootCleanAtEmit` = true; the binding rebind (`evidenceSha` = S + `receiptDigest`) and the receipt land in a DOCUMENTARY descendant of S | DESIGNED |
| 10 | `cli-implementation-contract` | `npm run certify:evidence -- --subject cli-implementation-contract` at HEAD == S, clean tree (B2.1) (requires `config/bin-typecheck.v1.json` mode BLOCKING with zero exemptions) | BIN_TYPECHECK_CEILING (ceiling only) + HARDENING | `certification` / `nightwatch.certification-evidence-receipt.v1` (new, B2.1) | exactly `cli-implementation-contract` (one receipt per subject) | `result` = `PASS` only when the recorded check state is `MET` at S; any other state writes a non-verifying record | tracked `evidence/certification/<S>/<subject>.json` (approved exact-pattern path + content guard, B3.1) | verifier reads the tracked directory (B3.2); a reproducible check is also re-run live, a host-bound check is receipt-consumed (B3.1) | `sourceHead` = S, `sourceRootCleanAtEmit` = true; the binding rebind (`evidenceSha` = S + `receiptDigest`) and the receipt land in a DOCUMENTARY descendant of S | DESIGNED (depends on parent M9 10.4-10.6: the live check is UNMET at HEAD, 1402 diagnostics, mode REPORTING) |
| 11 | `structural-rule-soundness` | `npm run certify:evidence -- --subject structural-rule-soundness` at HEAD == S, clean tree (B2.1) (every rule has probeCount >= 1 and an explicit quantifier) | HARDENING (`checkRuleEngineSoundness`) + HARDENING_PROBES | `certification` / `nightwatch.certification-evidence-receipt.v1` (new, B2.1) | exactly `structural-rule-soundness` (one receipt per subject) | `result` = `PASS` only when the recorded check state is `MET` at S; any other state writes a non-verifying record | tracked `evidence/certification/<S>/<subject>.json` (approved exact-pattern path + content guard, B3.1) | verifier reads the tracked directory (B3.2); a reproducible check is also re-run live, a host-bound check is receipt-consumed (B3.1) | `sourceHead` = S, `sourceRootCleanAtEmit` = true; the binding rebind (`evidenceSha` = S + `receiptDigest`) and the receipt land in a DOCUMENTARY descendant of S | DESIGNED |
| 12 | `schema-version-lifecycle` | `npm run certify:evidence -- --subject schema-version-lifecycle` at HEAD == S, clean tree (B2.1) (`schema-lifecycle check`) | HARDENING (`checkSchemaLifecycle`) | `certification` / `nightwatch.certification-evidence-receipt.v1` (new, B2.1) | exactly `schema-version-lifecycle` (one receipt per subject) | `result` = `PASS` only when the recorded check state is `MET` at S; any other state writes a non-verifying record | tracked `evidence/certification/<S>/<subject>.json` (approved exact-pattern path + content guard, B3.1) | verifier reads the tracked directory (B3.2); a reproducible check is also re-run live, a host-bound check is receipt-consumed (B3.1) | `sourceHead` = S, `sourceRootCleanAtEmit` = true; the binding rebind (`evidenceSha` = S + `receiptDigest`) and the receipt land in a DOCUMENTARY descendant of S | DESIGNED |
| 13 | `ui-error-taxonomy-rendering` | `npm run gate:ui` (UI_CONTROL_CENTER) writes the UI-harness receipt; B2.2 FIXES its body (`result` verdict field, `receipt:` digest prefix) so `verifyPersistedReceipt` can verify it; `certify:evidence` then commits the verified receipt | UI_CONTROL_CENTER | `gate` kind / `nightwatch.ui-harness-receipt.v1` (existing schema, repaired) | exactly `ui-error-taxonomy-rendering` (one receipt per subject) | `result` = `PASS` (NEW field; today absent so every verification ends `RECEIPT_VERDICT_MISSING`) | tracked `evidence/certification/<S>/<subject>.json` (approved exact-pattern path + content guard, B3.1) | verifier reads the tracked directory (B3.2); a reproducible check is also re-run live, a host-bound check is receipt-consumed (B3.1) | `sourceHead` = S, `sourceRootCleanAtEmit` = true; the binding rebind (`evidenceSha` = S + `receiptDigest`) and the receipt land in a DOCUMENTARY descendant of S | DESIGNED (defect repair, B2.2) |
| 14 | `configuration-contract` | `npm run certify:evidence -- --subject configuration-contract` at HEAD == S, clean tree (B2.1) (rule + `exerciseConfigurationContract` on synthetic environment) | HARDENING (rule only; the exercise runs in `project:check` only, so the producer runs both) | `certification` / `nightwatch.certification-evidence-receipt.v1` (new, B2.1) | exactly `configuration-contract` (one receipt per subject) | `result` = `PASS` only when the recorded check state is `MET` at S; any other state writes a non-verifying record | tracked `evidence/certification/<S>/<subject>.json` (approved exact-pattern path + content guard, B3.1) | verifier reads the tracked directory (B3.2); a reproducible check is also re-run live, a host-bound check is receipt-consumed (B3.1) | `sourceHead` = S, `sourceRootCleanAtEmit` = true; the binding rebind (`evidenceSha` = S + `receiptDigest`) and the receipt land in a DOCUMENTARY descendant of S | DESIGNED |
| 15 | `accessibility-certification` | `npm run control-center:ui:browser` at HEAD == S on the qualified host (system Chrome) writes the accessibility record; `certify:evidence` derives the committed receipt from the record (allowlisted fields; the loopback origin is dropped) | none (the browser lane is not a gate group) | `certification` / `nightwatch.certification-evidence-receipt.v1` (new, B2.1) | exactly `accessibility-certification` (one receipt per subject) | `result` = `PASS` only when the recorded check state is `MET` at S; any other state writes a non-verifying record | tracked `evidence/certification/<S>/<subject>.json` (approved exact-pattern path + content guard, B3.1) | path (b): the check consumes the committed receipt bound to S; the browser lane is never re-run in CI | `sourceHead` = S, `sourceRootCleanAtEmit` = true; the binding rebind (`evidenceSha` = S + `receiptDigest`) and the receipt land in a DOCUMENTARY descendant of S | DESIGNED (HOST_CAPABILITY: Chrome, present on the host) |
| 16 | `authenticated-capability-lifecycle` | `npm run certify:evidence -- --subject authenticated-capability-lifecycle` at HEAD == S, clean tree (B2.1) (rule + `exercisePreflightRefusal` on synthetic artefacts; no authentication) | HARDENING (rule only; the exercise runs in `project:check` only, so the producer runs both) | `certification` / `nightwatch.certification-evidence-receipt.v1` (new, B2.1) | exactly `authenticated-capability-lifecycle` (one receipt per subject) | `result` = `PASS` only when the recorded check state is `MET` at S; any other state writes a non-verifying record | tracked `evidence/certification/<S>/<subject>.json` (approved exact-pattern path + content guard, B3.1) | verifier reads the tracked directory (B3.2); a reproducible check is also re-run live, a host-bound check is receipt-consumed (B3.1) | `sourceHead` = S, `sourceRootCleanAtEmit` = true; the binding rebind (`evidenceSha` = S + `receiptDigest`) and the receipt land in a DOCUMENTARY descendant of S | DESIGNED |

### Lanes (11)

| # | Subject | Producer command | Gate group | Receipt kind / schema | Closed subject set | Verdict field(s) | Persistence | Clean-clone verification | Binds to S / documentary-descendant route | Status |
|---|---|---|---|---|---|---|---|---|---|---|
| 17 | `root-compile` | `npm run certify:evidence -- --subject root-compile` at HEAD == S, clean tree (B2.1) (`npm run typecheck` exit 0) | STATIC | `certification` / `nightwatch.certification-evidence-receipt.v1` (new, B2.1) | exactly `root-compile` (one receipt per subject) | `result` = `PASS` only when the recorded check state is `MET` at S; any other state writes a non-verifying record | tracked `evidence/certification/<S>/<subject>.json` (approved exact-pattern path + content guard, B3.1) | verifier reads the tracked directory (B3.2); a reproducible check is also re-run live, a host-bound check is receipt-consumed (B3.1) | lane `evidenceSha` rebind to S in the documentary descendant | DESIGNED |
| 18 | `bin-parse` | `npm run certify:evidence -- --subject bin-parse` at HEAD == S, clean tree (B2.1) (every `bin/**` parses: `checkSyntax` equivalent) | HARDENING | `certification` / `nightwatch.certification-evidence-receipt.v1` (new, B2.1) | exactly `bin-parse` (one receipt per subject) | `result` = `PASS` only when the recorded check state is `MET` at S; any other state writes a non-verifying record | tracked `evidence/certification/<S>/<subject>.json` (approved exact-pattern path + content guard, B3.1) | verifier reads the tracked directory (B3.2); a reproducible check is also re-run live, a host-bound check is receipt-consumed (B3.1) | `sourceHead` = S, `sourceRootCleanAtEmit` = true; the binding rebind (`evidenceSha` = S + `receiptDigest`) and the receipt land in a DOCUMENTARY descendant of S | DESIGNED |
| 19 | `structural-invariants` | `npm run certify:evidence -- --subject structural-invariants` at HEAD == S, clean tree (B2.1) (`hardening:check` exit 0) | HARDENING + HARDENING_PROBES | `certification` / `nightwatch.certification-evidence-receipt.v1` (new, B2.1) | exactly `structural-invariants` (one receipt per subject) | `result` = `PASS` only when the recorded check state is `MET` at S; any other state writes a non-verifying record | tracked `evidence/certification/<S>/<subject>.json` (approved exact-pattern path + content guard, B3.1) | verifier reads the tracked directory (B3.2); a reproducible check is also re-run live, a host-bound check is receipt-consumed (B3.1) | `sourceHead` = S, `sourceRootCleanAtEmit` = true; the binding rebind (`evidenceSha` = S + `receiptDigest`) and the receipt land in a DOCUMENTARY descendant of S | DESIGNED |
| 20 | `authoritative-gate` | `npm run gate:local` at HEAD == S on a clean tree (existing producer); `certify:evidence` copies the verified receipt VERBATIM into the tracked directory | all 15 groups (receipt `groups[]`) | `gate` kind / `nightwatch.quality-gate-receipt.v1` (existing) | `authoritative-gate` (existing closed set) | `finalResult` = `PASS` (existing) | tracked `evidence/certification/<S>/<subject>.json` (approved exact-pattern path + content guard, B3.1) | digest is re-derived from the committed bytes (key order preserved) | `sourceHead` = S, `sourceRootCleanAtEmit` = true; the binding rebind (`evidenceSha` = S + `receiptDigest`) and the receipt land in a DOCUMENTARY descendant of S | EXISTING (persistence added, B3) |
| 21 | `full-regression` | `npm test` (run-shards) at HEAD == S; `certify:evidence --subject full-regression` runs it and records the exit status and the command digest (no counts are claimed) | none (no group runs the full suite) | `certification` / `nightwatch.certification-evidence-receipt.v1` (new, B2.1) | exactly `full-regression` (one receipt per subject) | `result` = `PASS` only when the recorded check state is `MET` at S; any other state writes a non-verifying record | tracked `evidence/certification/<S>/<subject>.json` (approved exact-pattern path + content guard, B3.1) | verifier reads the tracked directory (B3.2); a reproducible check is also re-run live, a host-bound check is receipt-consumed (B3.1) | `sourceHead` = S, `sourceRootCleanAtEmit` = true; the binding rebind (`evidenceSha` = S + `receiptDigest`) and the receipt land in a DOCUMENTARY descendant of S | DESIGNED (implemented in B2.1 as a command producer; ~20 min on the host) |
| 22 | `clean-checkout` | `npm run gate:clean` from canonical with no live session (existing producer); `certify:evidence` copies the verified receipt VERBATIM | all groups inside the disposable clone | `clean` kind / `nightwatch.clean-checkout-receipt.v1` (existing) | `clean-checkout` (existing closed set) | `gateResult` + `finalResult` = `PASS` (existing) | tracked `evidence/certification/<S>/<subject>.json` (approved exact-pattern path + content guard, B3.1) | digest uses insertion-order `JSON.stringify`, so the committed bytes keep key order | `sourceHead` = S, `sourceRootCleanAtEmit` = true; the binding rebind (`evidenceSha` = S + `receiptDigest`) and the receipt land in a DOCUMENTARY descendant of S | EXISTING (persistence added, B3) |
| 23 | `ui` | `npm run gate:ui` (Node 22); `certify:evidence --subject ui` records the UI_CONTROL_CENTER group verdict at S | UI_CONTROL_CENTER | `certification` / `nightwatch.certification-evidence-receipt.v1` (new, B2.1) | exactly `ui` (one receipt per subject) | `result` = `PASS` only when the recorded check state is `MET` at S; any other state writes a non-verifying record | tracked `evidence/certification/<S>/<subject>.json` (approved exact-pattern path + content guard, B3.1) | verifier reads the tracked directory (B3.2); a reproducible check is also re-run live, a host-bound check is receipt-consumed (B3.1) | `sourceHead` = S, `sourceRootCleanAtEmit` = true; the binding rebind (`evidenceSha` = S + `receiptDigest`) and the receipt land in a DOCUMENTARY descendant of S | DESIGNED |
| 24 | `browser-workflow` | same browser lane run as `accessibility-certification` (one run, two subjects) | none | `certification` / `nightwatch.certification-evidence-receipt.v1` (new, B2.1) | exactly `browser-workflow` (one receipt per subject) | `result` = `PASS` only when the recorded check state is `MET` at S; any other state writes a non-verifying record | tracked `evidence/certification/<S>/<subject>.json` (approved exact-pattern path + content guard, B3.1) | path (b): consumed from the committed receipt | `sourceHead` = S, `sourceRootCleanAtEmit` = true; the binding rebind (`evidenceSha` = S + `receiptDigest`) and the receipt land in a DOCUMENTARY descendant of S | DESIGNED (HOST_CAPABILITY: Chrome) |
| 25 | `owner-manual` | NONE: the lane is `UNAVAILABLE_CAPABILITY` (needs DEV authentication and a one-shot owner authorization, both out of scope). Condition 1 accepts a lane that is unavailable with a CURRENT UNEXPIRED record naming its owner action | none | none (`certifying: false` is inert for lanes) | n/a | n/a | the lane record in `config/validation-lane-state.v1.json` | n/a | before S (a substantive edit): null the stale `evidenceSha` 36bd4930 (a strict ancestor of S raises `STALE_EVIDENCE`) and renew `revisitDate` (2026-10-11) so it is unexpired at certification | DESIGNED (record only; honest reachability, no fabricated evidence) |
| 26 | `exact-checkpoint-ci` | `certify:evidence --subject exact-checkpoint-ci` (the observation producer) run from a clean DOCUMENTARY descendant AFTER the GitHub Actions run at S completes; records the run id token, S and the conclusion (OD-3 read-only observation) | GitHub Actions `gate:ci` | `certification` / `nightwatch.certification-evidence-receipt.v1` (new, B2.1) | exactly `exact-checkpoint-ci` (one receipt per subject) | `result` = `PASS` only when the recorded check state is `MET` at S; any other state writes a non-verifying record | tracked `evidence/certification/<S>/<subject>.json` (approved exact-pattern path + content guard, B3.1) | verifier reads the tracked directory (B3.2); a reproducible check is also re-run live, a host-bound check is receipt-consumed (B3.1) | `sourceHead` = S, `observedAtHead` = the descendant (a distinct field); the observation can only follow S, so it is a descendant-produced receipt bound to S | DESIGNED (depends on exact-head CI green at S) |
| 27 | `dependency-advisory` | same producer and dependency as condition `dependency-supply-chain-currency` (parent 15.4) | none | `certification` / `nightwatch.certification-evidence-receipt.v1` (new, B2.1) | exactly `dependency-advisory` (one receipt per subject) | `result` = `PASS` only when the recorded check state is `MET` at S; any other state writes a non-verifying record | tracked `evidence/certification/<S>/<subject>.json` (approved exact-pattern path + content guard, B3.1) | path (b): consumed from the committed receipt (the qualification is host-bound) | `sourceHead` = S, `sourceRootCleanAtEmit` = true; the binding rebind (`evidenceSha` = S + `receiptDigest`) and the receipt land in a DOCUMENTARY descendant of S | DESIGNED (depends on parent 15.4) |

## Risks / Trade-offs

- **Reachability may genuinely be impossible for a condition** (for example a
  condition whose only honest producer is the owner's paid run). That is the
  exit rule's case: STOP and report, never fabricate a producer.
- **The mutation harness adds gate time.** It runs in `gate:milestone` only,
  against scratch copies, with a declared per-mutant bound.
- **Evidence in git is public while the repository is public** (D-149): the
  committed receipts carry only classification tokens, hashes and subjects,
  never a path, cookie, header or customer value.
