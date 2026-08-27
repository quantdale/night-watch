# Resolved Egress + Containment Truth Hardening — Execution Report

Status: IN_PROGRESS
Task ID: `nightwatch-resolved-egress-and-containment-truth-hardening-v1`
Phase: RESOLVED-EGRESS-AND-CONTAINMENT-TRUTH-HARDENING-V1
CONTINUITY_PROTOCOL_VERSION: `nightwatch.agent-continuity.v2`
Starting SHA: `9a70e7f3e81255d56352b9efb291f0fb4f4f03de`
Safety scope: LOCAL / repository source / synthetic loopback only

This report is a living execution record. It is intentionally incomplete
until every OpenSpec requirement has evidence and the terminal Git closure is
validated.

## Takeover and H0

- Requested fast-forward pull reached `9a70e7f`; local and `origin/main`
  matched and the worktree was clean.
- Planning baseline `4981b21` was reconciled to live starting `9a70e7f`.
  Every intervening path is prompt/OpenSpec planning documentation; no source
  or test implementation drift was found.
- NUL-safe local manifest: tracked `1,339`; regular/reviewed `1,339`;
  non-regular `0`; bytes `14,678,946`; newline lines `293,399`;
  ordered path/content manifest digest
  `sha256:77ab538468b754f90ec0ff30c518d68244794d4c049218f35571c43de5dbb4e4`.
- Class dispositions: active-runtime `409`, tests `233`, config `6`, UI
  `14`, corpus/fixtures `112`, tooling/bin `51`, workflow `1`, docs/OpenSpec
  `50`, continuity/history `436`, generated/lock/metadata `19`,
  other-explicit `8`.

## Baseline

The activation checkpoint baseline is green. `npm run typecheck` and
`npm run hardening:check` passed. Focused proxy, safety, real-run-gate,
evidence/manifest/containment, and proxy-smoke runs passed respectively at
`3/0 in 9.35s`, `27/0 in 3.90s`, `10/0 in 3.45s`, `21/0 in 3.76s`, and
`6/0 in 8.79s`. The full local gate passed in `283.64s` with all 9 groups
green, semantic compatibility `1903 total/1890 passed/13 skipped/0 failed`,
owner provenance `91 passed`, synthetic campaign `66 passed`, and receipt
`receipt:sha256:af4db19337c1ca46035bce61`.

The current hostname policy identity is
`phase-2a-browser-background-policy-v1`. The current runtime state has only
`address`, `host`, `port`, `environment`, `policyVersion`, and
`eventLogPath`; events have lifecycle-neutral policy fields plus optional
semantic/containment labels; summaries have the seven legacy counters. The
existing browser contract includes the loopback proxy, bypass disable,
QUIC/WebRTC controls, SafeBrowsing controls, and reviewed background/network
hint restrictions. The exact 16 existing skip/availability guards are listed
in STATE; no new skip was introduced.

## Before reproductions

The pre-fix red-team file was added before production source edits. Its
two-test run was intentionally red: `0 passed`, `2 failed`, `3.65s`. Policy
denies and the reviewed telemetry/optional/background blocks made zero
resolver calls. The allowlisted hostname made zero calls to the injected
resolver and was observed at the Node upstream boundary as
`hostname: 'allowed.synthetic.test', family: undefined`; the desired numeric
address/family assertion failed. The current code also sent the request to a
local unsafe fixture and returned `200`; the desired unsafe-answer result was
`502` with zero upstream requests. No external DNS was used.

## Implementation and after evidence

Pending.

## Identity changes

Pending. Every changed identity will be recorded as BEFORE -> AFTER -> reason
-> consumers; unrelated identities will be explicitly audited as unchanged.

## Browser DNS residual

Pending. The campaign will preserve the exact
`BROWSER_DNS_PREFETCH_REMAINS_L6_RESIDUAL` disposition unless a deterministic
local/synthetic zero-external-contact proof qualifies a stronger control.

## Safety accounting

All prohibited-action counters are currently zero and remain zero by scope:
no DEV/NEXT/production contact, live Alphaus DNS, auth state, customer/data,
cloud/infra, sibling write, publication, runtime external AI, privileged
networking, or force push has occurred.
