## Why

Nightwatch's exact-head CI workflow executes `actions/checkout@v4` and
`actions/setup-node@v4` before any repository-owned validation, so mutable tag
movement remains outside the checkpoint's deterministic trust boundary. The
hardening rule intended to restrict workflow actions also uses an unanchored
substring regular expression, allowing lookalike owners and suffixed refs to
pass its allowlist.

## What Changes

- Pin every third-party GitHub Action in the authoritative workflow to a full
  immutable commit SHA while retaining a human-readable version comment.
- Replace substring matching with a parsed, exact workflow-action allowlist
  covering owner, repository, and full commit reference.
- Fail closed on tag/branch refs, abbreviated or malformed SHAs, lookalike
  owners/repositories, suffixed refs, local actions, reusable workflows, and
  additional action steps unless they are explicitly added through the
  governed allowlist.
- Add mutation probes and focused tests proving that the guard rejects each
  bypass class and that a ref-only change advances the guarded definition.
- Record an owner-reviewable update procedure for intentional action-version
  changes without granting automated dependency-update or network authority.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `exact-head-ci-baseline`: extend exact-head CI authority so all executable
  third-party action code is identity-pinned and mechanically allowlisted
  before repository-owned validation can count as CI evidence.

## Impact

Affected surfaces are `.github/workflows/hardening.yml`, the Phase 23
workflow hardening rule and its probe registry, focused workflow/gate tests,
and durable CI maintenance documentation. No product runtime, Alphaus source,
environment access, dependency installation, or external CI execution is part
of this planning change.
