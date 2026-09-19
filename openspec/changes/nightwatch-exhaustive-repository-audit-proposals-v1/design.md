## Context

Nightwatch is a safety-sensitive local bug-hunting framework whose tracked tree spans product runtime code, browser and process containment, policy, evidence, source/semantic analysis, autonomous campaigns, a reviewer Control Center, CLI and validation tooling, more than one hundred continuity task directories, and an established OpenSpec corpus. Existing tests and historical proposals are strong evidence but do not prove that every current surface was inspected or that every unresolved material issue has a current remediation plan.

This campaign is planning-only. It starts from immutable Git snapshot `34517c9ba11c97407168fe5879ee03794dfff3e3`, runs in its own C-00 worktree, and may write only continuity and OpenSpec artifacts. The owner scope freeze, no-real-environment rule, privacy constraints, and sibling read-only boundary remain unchanged.

## Goals / Non-Goals

**Goals:**

- Make whole-repository coverage explicit, reviewable, and non-vacuous.
- Ground every reported issue in current code, tests, configuration, history, or deterministic local validation.
- Distinguish confirmed defects from risks, missing validation, documentation drift, already-planned work, false positives, and external uncertainties.
- Rank issues consistently and partition them into implementation-sized OpenSpec changes.
- Produce enough requirements, design context, tasks, and acceptance criteria that a later implementation agent does not have to rediscover the defect.
- Prove that the final proposal portfolio accounts for every material audit finding without changing product implementation.

**Non-Goals:**

- Implementing, partially fixing, or opportunistically refactoring any discovered issue.
- Re-auditing Alphaus sibling repositories, contacting a real product environment, or expanding owner-authorized scope.
- Treating historical prose, TODO text, test skips, dependency advisories, or theoretical attack ideas as issues without current reachability and impact evidence.
- Collapsing unrelated findings into one catch-all implementation change merely to reduce artifact count.

## Decisions

### 1. Freeze the audit universe to one Git snapshot

The audit records its starting SHA and derives its tracked-file inventory from that snapshot. Every coverage row refers to a stable path group and current evidence. If `origin/main` advances, the campaign records drift and reconciles before closure; it never silently claims the newer tree was covered.

Alternative considered: audit the mutable live branch continuously. Rejected because file additions and rewrites could make completion unprovable and could invalidate line-level evidence mid-review.

### 2. Use a coverage matrix, not file-by-file narrative

The ledger groups all tracked paths into mutually understandable subsystem/surface rows, records file and test counts, trust boundaries, inspection methods, candidate IDs, existing-change references, and a final disposition. Generated, fixture, corpus, and historical artifacts remain visible as classes rather than being omitted.

Alternative considered: read only `src/` and sample tests. Rejected because Nightwatch's safety authority also lives in `bin/`, config, test gates, task state, and generated/governed artifacts.

### 3. Apply a staged finding lifecycle

Candidates move through `OBSERVED -> SUBSTANTIATED -> MATERIAL -> PROPOSED`, with terminal alternatives `DUPLICATE`, `NOT_AN_ISSUE`, `DEFERRED_EXTERNAL_EVIDENCE`, or `NON_MATERIAL`. A finding cannot become MATERIAL without affected paths, failure mode, current reachability, consequence, existing mitigation analysis, and decisive evidence. No stage is inferred from another.

Alternative considered: write proposals immediately when suspicious code is seen. Rejected because it amplifies false positives and duplicates established work.

### 4. Rank severity using consequence and reachability

Severity uses five dimensions: safety/privacy consequence, integrity/correctness impact, operational blast radius, trigger reachability, and likelihood/recurrence. Critical and High require a credible path to severe consequence; missing tests alone are normally Medium or Low unless they leave a high-impact boundary unverified. The audit records both severity and confidence.

Alternative considered: CVSS for all findings. Rejected because many Nightwatch issues are local correctness, evidence-truth, or reliability defects rather than remotely exploitable vulnerabilities.

### 5. Deduplicate against current implementation and planning authority

Before proposing a fix, the audit searches published specs, active changes, task state, decisions, and current tests. An existing change is considered coverage only when its requirements and tasks actually close the observed failure mode; title similarity is insufficient. Gaps in an active change are recorded as a distinct follow-up proposal rather than editing another session's artifacts.

Alternative considered: update existing changes in place. Rejected because those changes may be historical or owned by another session and because silent scope expansion breaks provenance.

### 6. Partition proposals by coherent remediation boundary

Findings share a change only when they have the same root cause or atomic architecture boundary, can be validated together, and have compatible ownership/sequencing. Each remediation change states the evidence IDs it closes and any prerequisite changes. Broad themes alone do not justify bundling.

Alternative considered: one mega-change for all findings. Rejected because it would obscure risk, dependencies, rollback, and acceptance.

### 7. Require positive, negative, and regression acceptance

Every material finding's specification includes the corrected behavior, the failing/unsafe input or state that must be rejected or handled, and regression evidence proving adjacent valid behavior remains intact. Concurrency, cleanup, privacy, or fail-closed scenarios are mandatory when relevant.

Alternative considered: task-list-only proposals. Rejected because implementation steps without observable requirements cannot prove closure.

### 8. Close with a bidirectional completeness audit

The final audit proves both directions: every MATERIAL finding maps to exactly one owning remediation change, and every remediation change maps back to one or more substantiated findings. Coverage rows with no finding carry explicit evidence and disposition. Strict validation, diff inspection, and a product-file unchanged check are completion gates.

Alternative considered: declare completion when searches stop producing candidates. Rejected because absence of new results is not evidence of coverage.

## Risks / Trade-offs

- [Risk] The repository is large enough that exhaustive reading can become performative rather than analytical. → Mitigation: subsystem coverage rows, trust-boundary tracing, test-to-source mapping, and explicit evidence thresholds.
- [Risk] Historical task/docs volume can swamp current runtime evidence. → Mitigation: current tests and implementation outrank historical prose; history is consulted mainly for deduplication and intent.
- [Risk] Static inspection can miss runtime-only behavior. → Mitigation: use narrow deterministic local tests and synthetic validation where decisive, and classify real-environment-only uncertainty rather than inventing conclusions.
- [Risk] Proposal count can fragment implementation. → Mitigation: partition by root cause and atomic validation boundary, with dependency ordering across changes.
- [Risk] Severity can be subjective. → Mitigation: record dimension-level rationale and confidence, and separate impact from evidence confidence.
- [Risk] Main may advance during the long audit. → Mitigation: preserve the starting inventory, detect drift, and perform a bounded changed-path reconciliation before claiming completion.
- [Risk] Meta-audit artifacts could be mistaken for product fixes. → Mitigation: all tasks and reports state that implementation remains unchecked and deferred; product paths are prohibited in the final diff.

## Migration Plan

1. Establish the owned task and umbrella audit change.
2. Capture the starting snapshot, tracked-path inventory, subsystem coverage matrix, existing-spec/change index, and evidence schema.
3. Audit each subsystem and adjudicate candidates using the staged lifecycle.
4. Create separate remediation changes in dependency order as findings become MATERIAL.
5. Strict-validate every change and run the bidirectional completeness audit.
6. Integrate planning artifacts through the normal C-00 fast-forward workflow; implementation begins only in separately authorized future tasks.

Rollback is limited to abandoning this planning branch before integration. No runtime migration or data migration exists because product behavior is unchanged.

## Open Questions

- The number and boundaries of remediation changes cannot be fixed before evidence exists; the partition rule above is the authority.
- Findings that require prohibited real-environment evidence will remain explicitly deferred and cannot be promoted to confirmed defects within this campaign.
