# Exhaustive repository audit and OpenSpec proposals

## Task purpose

Perform a whole-repository, evidence-driven audit of Nightwatch and produce implementation-ready OpenSpec proposals for every meaningful unresolved issue. The result is a prioritized planning corpus, not product implementation.

## Established starting state

- Task ID: `nightwatch-exhaustive-repository-audit-proposals-v1`
- Phase: `EXHAUSTIVE_REPOSITORY_AUDIT_PROPOSALS_V1`
- Starting SHA: `34517c9ba11c97407168fe5879ee03794dfff3e3`
- Branch: `session/nightwatch-exhaustive-repository-ef157f7a`
- The predecessor active task W12 is terminal and remains unchanged.
- A separate W13 session exists and is outside this task's ownership.
- The audit is confined to the Nightwatch repository; no real Alphaus environment, data plane, cloud surface, or sibling mutation is authorized.

## Required deliverables

- A complete repository coverage inventory spanning source, tests, CLI/bin tooling, configuration, scripts, browser/control-center surfaces, evidence and persistence, policy/containment, semantic oracles, task continuity, OpenSpec, dependencies, and documentation.
- An evidence ledger for every candidate issue, including affected paths, concrete failure mode, severity/impact, existing mitigations, test evidence, duplication status, and disposition.
- Focused, non-mutating validation or deterministic local tests where needed to distinguish real issues from speculation.
- One umbrella OpenSpec audit change plus separate coherent remediation changes whenever combining issues would obscure ownership, sequencing, or acceptance criteria.
- For every material unresolved issue: proposal, design, delta specification(s), and actionable tasks with explicit negative and positive acceptance criteria.
- Strict OpenSpec validation and a final completeness audit mapping every discovered material issue to a proposal or an evidence-backed non-issue/deferred disposition.

## Explicit non-goals

- No implementation, refactor, dependency upgrade, product code edit, generated-source rewrite, or test repair.
- No DEV/NEXT/production contact, authentication, browser product journey, database query, customer data, infrastructure archaeology, external publication, issue/PR creation, or sibling repository mutation.
- No broad rediscovery of Alphaus sibling repositories or repetition of closed Nightwatch recon campaigns.
- No severity inflation, speculative vulnerability claims, duplicate proposals, or treating stale documentation alone as proof of a runtime defect.

## Safety constraints

- Work only in the owned C-00 session worktree.
- Preserve the owner scope freeze and all fail-closed safety boundaries.
- Use local read-only inspection and deterministic synthetic validation only.
- Never introduce secrets, credentials, raw customer values, authenticated evidence, or machine-specific paths into tracked artifacts.
- Existing user or other-session work is read-only and must not be reverted or incorporated without evidence and scope alignment.

## Declared Deletions

None.

## Acceptance criteria

- Every tracked repository area is classified and inspected through a documented coverage model; omissions are explicit and justified.
- Findings are reproducible from current repository evidence and distinguish defects, risks, technical debt, missing validation, and already-planned work.
- Every Critical, High, Medium, and otherwise material Low issue has an OpenSpec change with clear scope, requirements, design decisions, sequencing, tests, and acceptance criteria.
- Existing OpenSpec changes are cross-referenced to prevent duplicates; uncovered gaps in existing proposals are amended only within this owned task's new planning artifacts.
- All created changes are apply-ready according to their OpenSpec schema and pass strict validation.
- Product implementation files remain byte-unchanged from the starting tree.
- The final report contains a severity-ranked issue index, proposal mapping, validation evidence, residual uncertainties, and an explicit completeness audit against the original objective.
