# Kiro Crew Integration Master Plan — Nightwatch

**Status:** PLANNED / NOT AUTHORIZED FOR EXECUTION  
**Priority:** Optional strategic experiment  
**Date:** 2026-09-01  
**Repository authority:** Git + Nightwatch durable state remain canonical  
**Current-task effect:** NONE — this plan does not unblock, replace, or alter `.agent/ACTIVE_TASK.md`

## 1. Executive decision

Kiro Crew may be evaluated as an **optional external execution/orchestration layer** for Nightwatch, but it MUST NOT become a Nightwatch runtime dependency, safety authority, evidence authority, authorization authority, or source of project truth.

Nightwatch already has the critical continuity primitives Crew is meant to improve:

- `AGENTS.md`;
- `docs/CURRENT_STATE.md`, `docs/ROADMAP.md`, `docs/SAFETY_MODEL.md`, and `docs/DECISIONS.md`;
- `.agent/ACTIVE_TASK.md`;
- task-local `SPEC.md`, `PLAN.md`, `STATE.md`, and `REPORT.md`;
- Git checkpoints and exact-head validation.

Crew therefore sits **above** Nightwatch as an optional operator. It may help maintain long-lived context, decompose work, resume a multi-step task, and run bounded local commands, but Nightwatch's existing files and machine-checked gates remain authoritative.

The current task `nightwatch-replay-budget-and-dossier-closure-v1` is BLOCKED pending an owner-supplied page-readable DEV state. Crew MUST NOT retry, refresh auth, contact DEV, infer authorization, or reinterpret that blocker.

## 2. Why Nightwatch is a high-value Crew candidate

Nightwatch has characteristics where persistent orchestration can materially help:

- very long implementation and validation campaigns;
- a large body of accumulated safety decisions and historical evidence;
- repeated inspect -> reproduce -> minimize -> dossier loops;
- many bounded checkpoints where context compaction can lose operational detail;
- strict distinctions among repository truth, runtime evidence, authorization, and owner decisions;
- future repeated campaigns where rediscovery is expensive.

The value is **continuity and coordination**, not additional authority.

## 3. Non-negotiable architectural rule

```text
Git / Nightwatch docs / .agent state / tests / runtime evidence
                         |
                  CANONICAL TRUTH
                         |
              +----------+----------+
              |                     |
        normal coding agent     Kiro Crew
                                  |
                         optional operator/cache
```

Crew memory, lessons, histories, task checkpoints, summaries, and subagent output are always derivative. If Crew memory conflicts with repository state or current runtime evidence, Crew memory loses.

## 4. Installation model

### 4.1 Install outside the repository

Do not vendor Kiro Crew, add it to `package.json`, or make `npm install` depend on it.

Install the pinned stable Crew release on the operator host and verify:

- `kirocrew --version`;
- `kirocrew doctor`;
- `kiro-cli` presence and login;
- selected model availability;
- sandbox support on the chosen host.

Implementation should prefer Linux/WSL for the pilot.

### 4.2 Dedicated Nightwatch state home

Never use the default shared Crew home for this project.

Use a dedicated location such as:

```bash
export KIROCREW_HOME="$HOME/.kiro/crew-nightwatch"
```

This prevents unrelated project memory, lessons, credentials, crons, and subagent transcripts from mixing with Nightwatch.

The dedicated Crew state directory MUST remain outside Git.

### 4.3 Pin versions

The implementation campaign SHALL record:

- Crew version;
- kiro-cli version;
- model identifier actually served;
- reasoning-effort configuration;
- OS/runtime;
- Crew configuration digest.

Do not rely on a moving `stable` channel for a certification claim. Upgrade only in an explicit compatibility task.

### 4.4 First-boot downloads

Crew may download its embedding model on first startup. That bootstrap activity must happen **outside a Nightwatch campaign** and must never be confused with Nightwatch product-network traffic.

If the operator requires a network-clean bootstrap, pre-provision the embedding model and use Crew's local embedding-model path configuration.

## 5. Safety boundary

Crew is NOT a replacement for Nightwatch containment.

Even where Crew/kiro-cli provides sandboxing, Nightwatch SHALL treat that sandbox only as defense in depth. Product contact remains governed exclusively by Nightwatch's existing launchers, host policy, proxy/containment layers, authorization classes, source-currentness checks, and runtime gates.

Crew MUST NOT directly:

- curl/fetch Alphaus product hosts;
- open DEV/NEXT/production pages;
- query databases or infrastructure;
- read or persist auth-state contents;
- bypass Nightwatch launchers;
- invoke sibling-repository mutations;
- publish findings;
- create issues, PRs, messages, or external tickets for findings;
- store raw customer data or raw authenticated evidence in Crew memory.

No Crew feature creates new DEV, NEXT, production, mutation, infrastructure, data-plane, or publication authority.

## 6. Memory admission policy

Crew memory is potentially useful but must be tightly scoped.

### Allowed durable memory

- stable repository conventions;
- command names;
- sanitized architectural summaries;
- phase/status labels already present in Git;
- recurring validation lessons;
- safe operator preferences;
- sanitized failure classifications;
- pointers to canonical files.

### Forbidden durable memory

- credentials, cookies, bearer tokens, storage-state contents;
- raw authenticated responses;
- customer identifiers or customer values;
- raw private findings;
- raw screenshots containing sensitive data;
- unredacted network payloads;
- copied sibling-repository source excerpts when a safe pointer/summary is sufficient;
- speculative claims presented as established project facts.

### Promotion rule

A learned Crew lesson is never automatically promoted into Nightwatch truth.

If a lesson is important enough to become durable project behavior, the agent must express it as a normal reviewable repository change to the appropriate authority: test, decision, safety rule, task state, or documentation.

## 7. Implementation phases

### NW-C0 — Shadow installation and continuity proof

**Goal:** prove Crew can load Nightwatch and survive restart/compaction without changing project behavior.

Tasks:

1. Install pinned Crew + kiro-cli outside the repository.
2. Configure dedicated `KIROCREW_HOME`.
3. Start with interactive approval mode.
4. Enable supported sandboxing as defense in depth.
5. Point Crew at the Nightwatch working tree.
6. Create a Nightwatch-specific Crew agent prompt that requires the canonical rehydration order from `AGENTS.md`.
7. Explicitly deny direct external product/network commands in the agent contract.
8. Ask Crew to summarize the current project state using only repository authorities.
9. Stop/restart Crew and repeat.
10. Compare both summaries against `.agent/ACTIVE_TASK.md` and `docs/CURRENT_STATE.md`.

**Exit gate:**

- no repository mutation;
- no product contact;
- no secret/auth read;
- restart preserves useful context;
- Crew correctly reports the active task as BLOCKED and does not attempt to bypass it;
- deleting `KIROCREW_HOME` leaves Nightwatch fully functional.

### NW-C1 — Local/synthetic TaskRunner pilot

**Goal:** use Crew only to run bounded Nightwatch-owned local/synthetic work.

Permitted examples:

- `npm run agent:check`;
- `npm run handoff:check`;
- targeted unit tests;
- `npm run campaign:synthetic`;
- focused source-independent validation;
- documentation consistency checks.

Create a generated task-spec format whose header includes:

- repository path;
- starting SHA;
- active task ID;
- permitted command classes;
- prohibited command classes;
- max wall time;
- max retries;
- expected checkpoint;
- required final validation.

Crew may decompose the task internally, but every mutating code change must still obey Nightwatch's normal task/checkpoint discipline.

**Exit gate:**

- direct execution and Crew execution produce equivalent gate outcomes;
- no duplicate/hidden task state is required to resume;
- a forced Crew restart mid-task resumes without corrupting Git or `.agent` state;
- retry behavior remains bounded.

### NW-C2 — Sanitized triage assistant

**Goal:** test whether persistent memory reduces repeated triage work.

Crew may ingest only sanitized Nightwatch-produced summaries/dossiers and safe metadata. It may:

- cluster recurring failure classes;
- remember which validation approaches were previously disproven;
- suggest the next narrow check;
- identify duplicated investigation;
- propose candidate lessons for review.

It may NOT promote a finding, mark a dossier owner-approved, or change campaign truth based on memory.

**Exit gate:**

- zero forbidden material appears under `KIROCREW_HOME`;
- repeated tasks show measurable reduction in rediscovery;
- false/stale memories are detected by repository/runtime precedence.

### NW-C3 — Optional contained DEV orchestration

**Status:** FUTURE / REQUIRES SEPARATE OWNER AUTHORIZATION.

Only consider this after NW-C0..C2 are proven and after the current blocked task is independently resolved or superseded.

Crew may request execution of an existing Nightwatch guarded DEV launcher, but it may not implement a parallel path.

Required additional gates:

- explicit new authorization class;
- page-readable designated auth state validated by Nightwatch, not Crew;
- Crew receives only a path/reference, never auth contents;
- Nightwatch preflight, containment, source-currentness, privacy, and budget gates all pass before contact;
- exactly the same stop conditions as a direct guarded launch;
- no automatic auth refresh or retry.

### NW-C4 — Production

**Not part of this Crew integration plan.**

Any future production-read-only Nightwatch capability requires its own product/safety architecture and owner authorization. Crew integration must not be used as a shortcut to production.

## 8. Subagents

Crew subagents are allowed only after NW-C1 proves safe single-agent operation.

Initial allowed roles:

- repository-state reader;
- test-failure classifier;
- documentation consistency reviewer;
- sanitized dossier reviewer.

Do not give subagents independent product-contact authority. Parallel subagents may read the same safe repository state, but they must not launch concurrent real campaigns or race on one Nightwatch task.

## 9. Scheduling and heartbeats

Do not enable Crew cron/heartbeat product testing during the pilot.

If scheduling is ever enabled:

- one scheduler must own a campaign;
- schedules must call Nightwatch's bounded launcher, not arbitrary shell/network commands;
- every scheduled run must have an explicit authorization model;
- absence of authorization means NO CONTACT;
- scheduled runs must never refresh credentials or widen scope.

## 10. Observability and audit

For each Crew-driven Nightwatch task, capture safe metadata:

- Crew/kiro-cli versions;
- task ID;
- repository SHA before/after;
- command classes invoked;
- exit status;
- retry count;
- wall time;
- whether Crew memory was read/written;
- Nightwatch gate receipts;
- final Git parity.

Never commit Crew transcripts wholesale.

If a Crew transcript contains sensitive or unnecessary model context, it stays owner-local and is deleted according to the operator retention policy.

## 11. Failure and kill criteria

Stop the Nightwatch Crew experiment if any of the following occurs:

- Crew directly contacts a product host outside a Nightwatch-owned launcher;
- Crew reads/persists auth-state contents;
- Crew memory becomes necessary to reconstruct project truth;
- Crew causes ambiguous duplicate task ownership;
- restart duplicates real actions;
- Crew cannot honor bounded retry/stop behavior;
- significant stale-memory errors survive repository rehydration;
- integration maintenance costs more than the continuity benefit.

Rollback is simple: stop Crew, remove the dedicated `KIROCREW_HOME`, and continue using the existing Nightwatch repository protocol. No Nightwatch runtime dependency may make rollback harder than that.

## 12. Success metrics

Evaluate after at least three meaningful local/synthetic campaigns:

- startup/rehydration time versus normal agent workflow;
- repeated rediscovery avoided;
- successful resume after forced restart;
- duplicate work/actions;
- number of stale-memory corrections;
- operator interventions;
- tokens/credits consumed;
- wall-clock completion;
- gate failures introduced by Crew integration;
- sensitive-memory incidents: MUST remain zero.

Proceed to NW-C3 only if the result is clearly positive.

## 13. Repository changes expected during implementation

Likely additions, created only when the pilot is activated:

```text
docs/
  KIRO-CREW-INTEGRATION-MASTER-PLAN.md
  KIRO-CREW-OPERATIONS.md                 # after pilot proves useful

scripts/ or bin/
  crew-preflight.*                        # version/config/home checks
  crew-task-wrapper.*                     # bounded Nightwatch command bridge

tests/
  ...                                     # wrapper/policy regression tests
```

Do not commit Crew's actual home, memory database, model cache, conversations, credentials, or logs.

## 14. External references

Implementation must re-check current upstream behavior before coding:

- https://github.com/kirodotdev/KiroCrew
- https://kiro.dev/docs/crew/
- Kiro Crew installation/configuration/architecture docs for the exact pinned release.

## 15. Final recommendation

Nightwatch is a strong Crew pilot **only as a constrained outer operator**. The project already has a better source-of-truth system than Crew memory. The experiment is successful only if Crew reduces orchestration/rehydration cost without weakening Nightwatch's safety, privacy, authorization, or evidence model.
