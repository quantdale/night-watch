# Spec — repository hardening

## Requirement

Nightwatch SHALL admit a value, publish a private artifact, bound an
asynchronous operation, and claim a validated release only through a
mechanically enforced check whose outcome does not depend on inherited
object properties, checkout location, interruption timing, or an undiscovered
test.

## Scenario: an inherited vocabulary name has no effects

- GIVEN a reasoner-supplied intent, termination reason, severity, environment
  or confidence value of `constructor`, `__proto__` or `toString`
- THEN membership is decided by own-key lookup and the value is rejected
- AND no terminal state, dossier field or tool lookup observes it
- AND `lookupAgentTool` returns no inherited function

## Scenario: an over-capacity session start mutates nothing

- GIVEN the permitted worktree bound is already reached
- WHEN a session start is requested
- THEN the candidate registration is evaluated against the canonical
  integrity model before any mutation
- AND the start fails with a bounded reason, no branch or worktree is
  created, and no existing session is modified

## Scenario: a partial session creation returns to the prior topology

- GIVEN a session start that fails after creating its branch, worktree or
  ownership record
- THEN only the just-created session and branch are removed, and only after
  identity, SHA and path proof
- AND both the original failure and the rollback outcome are reported
- AND the workspace verdict remains PASS

## Scenario: private-path containment is independent of checkout location

- GIVEN the same configured target path
- WHEN the decision is made from the canonical checkout, a registered linked
  worktree, and a relocated fresh clone
- THEN the decision is identical in all three
- AND canonical, sibling and worktree roots are rejected in every topology
- AND an ambiguous or missing repositories root fails closed

## Scenario: a snapshot cannot escape its authorized root

- GIVEN a configured snapshot name containing a traversal segment, an
  absolute path, a path separator, or resolving through an ancestor or leaf
  symlink
- THEN publication fails before any mutation
- AND sentinel files outside the state root remain byte-identical

## Scenario: an interrupted checkpoint yields one complete generation

- GIVEN a crash injected before the write, mid-write, or before or after the
  atomic replace
- THEN recovery observes either the complete previous generation or the
  complete next generation
- AND a competing same-ID writer cannot silently clobber
- AND oversized, truncated or malformed state is bounded, preserved for the
  owner, and reported without content
- AND checkpoints written by earlier schemas still resume

## Scenario: one deadline stops the whole relay operation

- GIVEN a hung auth acquisition, connection, header read, body read or
  redirect, or a caller abort
- THEN one monotonic deadline and abort signal terminate the operation
- AND every terminal path disposes its timers and aborts its owned work
- AND no owned fetch, read or process remains active after the cleanup grace
- AND the error category contains no secret or content excerpt
- AND a write is never retried

## Scenario: a stalled event client is bounded

- GIVEN a client whose stream never drains
- THEN its queued state stays within a fixed bound and it coalesces or
  disconnects within policy
- AND healthy clients keep receiving events
- AND cleanup leaves no registry entry, listener or timer

## Scenario: a sensitive parse failure echoes nothing

- GIVEN malformed private-store or credential-bearing input with planted
  fake secret text at its beginning, middle and end
- THEN the returned error, stderr, log, receipt and every generated artifact
  contain none of the planted values or their substrings
- AND the operator still receives a stable category distinguishing missing,
  oversized, unsafe-path, malformed-JSON and schema-invalid failures

## Scenario: the operator reaches every bounded page

- GIVEN a local dataset larger than the first-page bound of any view
- THEN the dashboard reaches a record beyond that boundary through opaque
  cursor state with deterministic ordering and identity deduplication
- AND a snapshot generation change resets rather than mixes pages
- AND an unsupported DTO never reaches render logic
- AND a burst of invalidation events causes a documented bounded number of
  requests

## Scenario: the shipped launcher defaults to read-only

- GIVEN the shipped control-center launcher with no review flag
- THEN review decisions are refused and the capability DTO reports them
  disabled
- WHEN the documented opt-in is supplied
- THEN one immutable authority is created and injected into collector and
  server, a decision survives restart by review identity readback, and an
  ambiguous outcome causes no duplicate write

## Scenario: a green receipt cannot omit a discovered test

- GIVEN a newly added executable test or check
- THEN discovery classifies it into exactly one required or explicitly
  excluded class
- AND an unclassified test fails the gate rather than passing silently
- AND the receipt records the inventory digest with executed, skipped and
  unavailable counts
- AND local, clean-checkout, host-qualified and CI claims remain separate
