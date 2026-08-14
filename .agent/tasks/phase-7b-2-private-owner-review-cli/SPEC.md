# Nightwatch Phase 7B.2 — Private Owner Review CLI

Status: `FROZEN INTENT`
Frozen: 2026-08-14

## Task purpose

Add a thin private terminal interface over the already-hardened Phase 7B,
7B.1, 7B.1.1, and 7B.1.2 immutable AI-review architecture. The interface
lets the owner inspect one exact private AI artifact, inspect existing
provenance, and make one explicit, confirmed, digest-bound owner decision.

This task is local, static, synthetic, and owner-interface-only. It adds no AI
authority, provider execution, model invocation, browser/API execution,
campaign behavior, oracle installation, publication, Git runtime authority,
source modification, or Phase 8 behavior.

## Established starting state

- Task ID: `phase-7b-2-private-owner-review-cli`.
- Canonical root is
  `/home/dalepalaca/go/src/alphaus-main/REPOSITORIES/nightwatch`.
- The live bootstrap SHA is discovered from Git at task creation; the verified
  starting value is `91bdc518088f575f7089fa9702197fb73793444f`.
- Branch is `main`; `HEAD == origin/main` and the worktree is clean at
  bootstrap.
- Phase 7B, Phase 7B.1, Phase 7B.1.1, and Phase 7B.1.2 are complete.
- Phase 6 remains `FROZEN_BY_OWNER /
  INFRASTRUCTURE_AND_DATA_LAYER_OUT_OF_SCOPE`.
- Phase 8 remains `NOT_STARTED`.
- Existing v2 AI artifacts are immutable model output. Human review is a
  separate exact-key, full-artifact-digest-bound v2 companion record.

## Required deliverables

- A deterministic `src/core/aiReview/ownerReview.ts` service layer that loads
  and validates one exact bug draft or oracle suggestion, validates persisted
  identity, reads a valid or absent companion review without conflating
  corruption with absence, renders a safe snapshot, and records only a
  confirmed owner decision through `createHumanReviewRecord()` and hardened
  `AiReviewArtifactStore.writeHumanReview()`.
- A terminal-safe owner renderer for bug and oracle artifacts. Every AI line is
  visibly prefixed, all controls and bidi characters are neutralized, and a
  fixed system decision boundary separates untrusted AI prose from prompts.
- `bin/ai-owner-review.mjs` with only `show`, `status`, `decide`, and help;
  exact `--kind bug|oracle` plus exact `--id`; no bulk scan, raw JSON,
  output/export, provider/model/root, network, Git, or publication options.
- Interactive `decide` with a TTY gate, fixed A/R/S/Q menu, exact second
  confirmation token, cancellation cleanup, no decision argv/env/file input,
  one terminal decision per exact artifact, immutable artifact preservation,
  read-back validation, and effective snapshot projection.
- Narrow exact-ID and human-review read hardening, including v1 read-only
  compatibility and `UNVERIFIED_LEGACY_REVIEW_STATE` when legacy status lacks
  matching provenance.
- Synthetic unit/controller/parser/adversarial coverage for terminal
  injection, identity mismatch, malformed state, non-TTY, confirmation,
  duplicate review, legacy behavior, read-back, immutability, and oracle
  catalog isolation.
- Focused offline hardening rules and private CI execution with
  `contents: read`, no secrets/artifacts, and no model/network dependency.
- Complete local and isolated validation, stable task anchors, pushed source
  and documentation checkpoints, exact final CI verification, and a clean
  worktree.

## Frozen safety decisions

- The CLI never imports or instantiates `AiReviewSession`,
  `SyntheticAiReviewProvider`, `LoopbackAiReviewProvider`, a provider handler,
  campaign execution, browser/API code, or network code.
- The CLI never scans the private findings directory. An owner-supplied exact
  artifact ID is required and must match the persisted artifact identity after
  read; filenames are not identity authority.
- `show` and `status` are read-only. `decide` has exactly one possible
  persistent effect: a new owner-review companion record for an unreviewed v2
  artifact. Existing review, corrupt review, wrong identity, and v1 decision
  attempts fail closed without overwrite or self-healing.
- AI prose is untrusted terminal content. The CLI uses plain text output,
  deterministic sanitization, per-line `[AI]` prefixes, separate `[SYSTEM]`
  metadata, and a fixed decision boundary below all AI content.
- Approval means `OWNER_APPROVED_DRAFT` for bug text and
  `APPROVED_FOR_MANUAL_IMPLEMENTATION_REVIEW` for an oracle suggestion only.
  Rejection means `OWNER_REJECTED`; supersession means `SUPERSEDED`.
  Evidence, campaign, catalog, execution, publication, source, and Phase 8
  state do not change.
- Review notes are the fixed safe CLI note only. No free-form owner notes,
  clipboard, editor, pager, shell, export, or external message path exists.
- Review timestamps use a UTC ISO wall-clock process timestamp as historical
  metadata; runtime-budget clocks are unrelated.

## Acceptance criteria

- The package command is `npm run ai:owner-review`; only `show`, `status`, and
  `decide` are accepted.
- Explicit exact IDs, exact kind matching, no enumeration, no provider/model/
  network/Git/publication path, and no argv/env/file decision shortcut are
  structurally and behaviorally tested.
- `decide` fails with an interactive-required classification before any write
  when stdin cannot safely interact; wrong/empty confirmation and Ctrl-C leave
  no record and restore input cleanup.
- Terminal output contains no raw untrusted ESC, C0/C1 controls, carriage
  return, backspace, or bidi controls; every AI-generated output line is
  visibly prefixed and fake prompts remain AI content.
- Exact requested artifact and review identities are validated after read;
  missing review is distinguishable from malformed/corrupt review; v2
  artifacts remain byte/stable-JSON unchanged; only the companion review file
  is written.
- Review creation uses `createHumanReviewRecord()`, persistence uses hardened
  private storage, read-back verifies review ID/artifact ID/digest/decision/
  reviewer/publication, and `applyHumanDecision()` produces the projection.
- Bug/oracle approval, rejection, and supersede projections match the frozen
  semantics; evidence level, campaign result, oracle catalog, and artifact
  status remain unchanged.
- Existing AI/loopback, private-store, owner-policy, agent-state, synthetic
  campaign, full Playwright, typecheck, hardening, agent-check, diff/privacy,
  and isolated clean-checkout validation remain green.
- Phase 7B.1.2 remains complete, Phase 8 remains unstarted, all safety and
  privacy vectors required by the task are zero, and the exact final private
  CI run executes the owner-review matrix successfully.
