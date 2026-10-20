# Report — D-181 CLI monetary-enforcement closure

Status: COMPLETE

## 1. Defect and trace

`bin/nightwatch-agent.mjs` `campaign run` and `campaign resume` never pass
`spendCeiling` to `runLocalCliCampaign` / `resumeLocalCliCampaign`, and
`admitRunSpendCeiling` has no production caller. `AgentRuntime` consults the
pre-request admission only when the optional parameter is defined, so the
production metered route dispatches provider calls with no monetary ceiling.

## 2. The fix

The metered class is mechanical (the resolved adapter identity — the
repository's own provider print adapter), never a label. The owner-declared
ceiling (cap, metered rate card, per-call output bound, provider/model
identity, account-side hard-stop evidence reference) is validated at the
launcher and admitted by `admitMeteredRunSpendCeiling` BEFORE any provider
call; the chain is wired CLI → local campaign → AgentRuntime →
admitProviderCall → dispatch; the ceiling is persisted in the campaign
progress envelope under the secret-scanner-safe projection
`nightwatch.spend-ceiling-envelope.v1`; and a resume is held to the persisted
declaration (absent/widened/substituted refused, identical or tightened
accepted). The two undeclared R6 flags (`--expected-investigations`,
`--observe-repository`) are declared and pinned by the R5-07 parity test.

## 3. Validation

Eight real-CLI stub-provider cases plus ten pure admission cases; focused
regression 138/138; prepush and milestone gates green (6276/6276); 274/274
hardening probes; 126/126 behavioural mutants; typecheck 77/77 with the
widening budget at zero.

## 4. Certification at S7

S7 = `ff0ecc5712a0789d70a94ee152b8078704d8be8f` (derived from Git as the last
substantive commit of the integrated range). Exact-head CI run `39312575211`
GREEN at exactly the checkpoint; the authoritative gate (15/15), the pristine
clean-checkout run (15/15, sibling identity unchanged) and the six COMMAND
lanes through the guarded measurement root all PASS; 25/25 tracked receipts
verify offline; the canonical and independent fresh-clone evaluators agree
per-condition exactly (15/16 MET, `autonomous-yield-proof` UNMET).

## 5. Governance disclosures (recorded, not omitted)

Three documentary-descendant CI runs are red in history (two on the
documentation date rule across the UTC rollover, one on the append-only
pairing rule when the header-date bump lacked its same-commit correction
entry). Causes identified; the procedure is fixed (a header bump is one
commit carrying both the line change and its correction entry). The
certified checkpoint's own exact-head run is green and is the CI the
certification binds. The host reboot mid-choreography correctly ended the
boot-digest claim; the documented adoption recovery restored it preserving
base, branch and all commits.

## 6. Remaining owner actions

Exactly as D-183 records: the parent-12.5 approval with its monetary cap; the
account-side revocation and auto-top-up confirmations; the account-side hard
stop that backstops the per-call output bound (the harness cannot cap output
tokens on the wire); the prepared stale-credential-copy removal; and the
prior campaign's billing reconciliation. Until then the verdict is
OPERATIONALLY_ACCEPTED — EXTERNAL OWNER ACTION REQUIRED and D-129's advance
is not taken.
