## Context

`.github/workflows/hardening.yml` is Nightwatch's sole exact-head CI workflow.
Before the repository-owned `npm run gate:ci` executes, GitHub resolves and
runs `actions/checkout@v4` and `actions/setup-node@v4`. Those version tags are
not immutable identities, so exact repository SHA binding does not by itself
bind all code executed by the job.

`checkPhase23QualityGate()` attempts to constrain this surface by scanning
eight-space `uses:` lines and accepting
`/actions\/(?:checkout|setup-node)@v4/`. The expression is neither anchored nor
an exact reference parser. For example, an owner-prefixed lookalike such as
`evil/actions/checkout@v4` or a suffixed ref such as
`actions/checkout@v4-probe` contains an accepted substring. The probe registry
mutates required gate groups but has no mutation for action identity.

The workflow currently grants only `contents: read`, which limits GitHub-token
authority but does not make arbitrary pre-gate code safe: a malicious action
can read the checked-out private source, access runner/network state, tamper
with the workspace seen by later steps, or fabricate the conditions under
which validation runs.

## Goals / Non-Goals

**Goals:**

- Bind every external action executed by the authoritative workflow to an
  exact full commit SHA.
- Validate action identity structurally and exactly, with no substring or
  partial-ref acceptance.
- Make all bypass classes mutation-tested and non-vacuous.
- Preserve the minimal workflow, read-only GitHub permissions, offline
  repository gate, and exact-head evidence semantics.
- Provide a reviewable manual update path for future action releases.

**Non-Goals:**

- No Dependabot/Renovate bot, automatic upgrade, or new network authority.
- No new workflow, marketplace action, reusable workflow, artifact upload,
  secret, or permission.
- No external CI run or resolution of upstream SHAs during this planning
  campaign.
- No change to the repository-owned quality-gate groups or product runtime.

## Decisions

### Parse the constrained workflow surface instead of searching substrings

Introduce one small workflow-action identity parser for the deliberately
bounded `uses:` surface. It will return an ordered list of exact action
references with their line locations, reject unsupported YAML shapes rather
than guessing, and require the current two action steps exactly once each.
The parser result, not a raw regular-expression match, becomes the hardening
authority.

The preferred implementation may reuse an already-declared parser only if it
adds no dependency and retains fail-closed behavior. Adding a general YAML
dependency solely for two references is rejected because it expands the
supply chain being secured.

### Store the allowlist as exact owner/repository/full-SHA records

The governed allowlist will bind:

- `actions/checkout` to one 40-lowercase-hex commit; and
- `actions/setup-node` to one 40-lowercase-hex commit.

Workflow lines will use `owner/repository@<40-hex-sha>` and retain a comment
such as `# v4` only for human orientation. Comments never participate in
authority. A tag, branch, abbreviated SHA, uppercase/malformed SHA, subpath,
lookalike owner/repository, suffixed ref, `./` local action, Docker action, or
reusable-workflow target fails closed.

An exact record is preferable to an "official actions" prefix because the
security property is which two code identities run, not who appears to own an
arbitrary repository.

### Bind hardening, focused tests, and mutation probes to the same records

The hardening rule will assert a non-zero, exact two-action inventory and
compare each parsed record with the allowlist. Focused tests will cover valid
pins and each refusal class. The probe campaign will mutate a real pinned ref
and a real action owner/reference shape, then require the rule to detect and
restore both changes. The probe must alter executable YAML rather than a
comment so it cannot pass through comment matching.

### Keep action updates manual and provenance-recorded

An update is a normal reviewed source change: identify the intended upstream
release through an owner-authorized process, obtain its full commit SHA,
review release provenance/change scope, update the exact allowlist and
workflow together, run the focused negative matrix plus authoritative local
validation, and obtain a fresh exact-head CI observation after integration.
The repository must not resolve a moving tag at runtime or silently refresh a
pin.

## Risks / Trade-offs

- **Pinned actions do not eliminate upstream compromise before the selected
  commit is reviewed** → record the intended release and full SHA together,
  keep the action set minimal, and retain read-only workflow permissions.
- **A narrow parser can reject harmless YAML refactoring** → treat unsupported
  shapes as deliberate review events; this workflow is intentionally small and
  security-sensitive.
- **Pins require periodic manual maintenance** → document the bounded update
  procedure and make staleness visible without granting an updater authority.
- **A comment can drift from its pin** → comments are non-authoritative;
  focused tests bind only exact executable identities, while review updates
  both fields together.
- **Exact-head CI still depends on GitHub's hosted platform** → preserve the
  existing distinction between executed CI, external block, and local/clean
  evidence; this change narrows action-code identity only.

## Migration Plan

1. Resolve and review the full upstream commits corresponding to the intended
   v4 action releases under an authorized implementation session.
2. Add the exact action-identity allowlist/parser and focused negative tests.
3. Replace both workflow tags with reviewed full SHAs and version comments.
4. Add two non-vacuous mutation probes and run the probe campaign.
5. Run workflow/gate tests, hardening, validation-universe, local gate, and a
   clean Node 20 gate.
6. Integrate through C-00 and observe exact-head CI at the pinned workflow.

Rollback is a normal revert to the prior reviewed full-SHA pins. Rolling back
to a tag or branch is forbidden.

## Open Questions

- Which exact upstream v4 commits are current and owner-approved at the future
  implementation checkpoint? The implementation task must record this from
  reviewed upstream evidence; this planning task intentionally does not use
  network authority to choose them.
