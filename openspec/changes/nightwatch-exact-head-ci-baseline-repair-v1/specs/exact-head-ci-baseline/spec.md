# Requirements — Exact-Head CI Baseline

## ADDED Requirements

### Requirement: Exact-Head CI Baseline

1. A GitHub Actions job that BOOTSTRAPS THE RUNNER AND EXECUTES REPOSITORY CODE
   MUST be classified as executed CI. Its result MUST NOT be recorded under the
   zero-step platform-block classification, and a real executed test failure
   MUST NOT be recorded as external non-evidence.
2. Historical zero-step runs MUST be preserved as facts about the runs they
   describe. Reconciling live CI state MUST NOT rewrite them.
3. Live CI evidence MUST describe the current substantive baseline. A CI
   observation whose SHA is a strict ancestor of
   `LAST_SUBSTANTIVE_IMPLEMENTATION_SHA` MUST fail project-state validation as
   stale, since ancestry is mechanically derivable offline.
4. A test MUST NOT assert a HOST capability as a repository invariant. Where a
   capability is host-provided — the sibling Alphaus source root, a rootless
   containment binary — the suite MUST assert the full-strength behaviour where
   it is present AND the fail-closed behaviour where it is absent. The
   discriminator MUST be a value the system under test reports, never an
   environment variable and never a host path probe.
5. Absent approved source MUST NEVER masquerade as valid evidence. With the
   sibling root absent, the census operator MUST report every approved
   repository as `SOURCE_UNAVAILABLE`, MUST emit no census, and MUST report no
   proven, admitted or eligible population. Any assertion over census CONTENT
   MUST first establish that a population was actually READ.
6. Rootless containment qualification MUST yield exactly one of two well-formed
   classifications: fully proven and READY, or explicitly blocked with a
   blocker code and EVERY proof field unproven. A partly proven capability MUST
   NOT exist, and `assertL6RuntimeCapability` MUST accept exactly the former
   and refuse the latter. The requirement MUST be blocker-code-agnostic.
7. A failing required group MUST be debuggable from its own authoritative
   receipt. A `SYNTHETIC_CAMPAIGN` failure MUST surface its sanitized failing
   test locations and MUST reconcile its counts, including cases that never
   ran.
8. Cases that were never reached MUST be reported in a bucket distinct from
   skipped cases. Conflating or omitting them MUST NOT be possible.
9. Receipt diagnostics MUST be allowlisted, not redacted. Only integers,
   tracked `tests/**` paths with a line number, and fixed enum tokens may enter
   a receipt. Source contents, secrets, customer data, raw response bodies,
   environment values, credentials and arbitrary child stderr MUST have no
   representation, and a malformed value MUST be dropped rather than sanitized.
10. A green receipt MUST NOT imply coverage the run did not have. The
    containment lane actually exercised MUST be recorded in the receipt, MUST
    be REQUIRED to be proven in the `local`, `clean` and `predev` gate modes,
    and MUST fail closed where it is missing or unclassifiable.
11. The synthetic campaign MUST remain serial with zero retries, and MUST
    continue to include the C-00 adversarial matrix and the L6 containment
    matrix. Its membership MUST be mechanically enforced against a versioned
    manifest rather than a command string.
12. No repair may weaken a safety invariant. Adding `test.skip`, making a
    required group optional, removing a file from the campaign, converting a
    fail-closed state into a pass, adding retries, inflating a timeout,
    bypassing an invariant on `CI`, ignoring a child exit code, or deleting a
    test MUST NOT be used to obtain a green baseline.

#### Scenario: Exact-Head CI Baseline
