# Proposal — C-10.5 Provenance and Project-Truth Closure

## Why

C-10 is a prerequisite for C-11 `PROD_OBSERVE`. C-11's route admission gate is
meant to trace mechanically back to admitted source evidence. Today it cannot:
the capability it would consume can be minted by asserting a label (see
`audit.md`). Building C-11 on that would give the production safety kernel a
forgeable root, and every downstream gate receipt would inherit the forgery.

Separately, the machine-checked project-state baseline still names a
predecessor ancestor, and the validator cannot see it because the stale fields
agree with each other. A campaign that cannot trust its own baseline cannot
produce an auditable completion record.

## What changes

1. Production-safe vocabularies become **derivable only**, through trusted
   adapters that consume validated source evidence and compute provenance
   identity themselves. The label-accepting constructors leave the public
   surface.
2. Capabilities become **unforgeable at runtime** via a module-private
   registry, not by type branding, so a serialized shape cannot be revived into
   authority.
3. Provenance identity **binds contents to source**: source identity, evidence
   class, source checkpoint, completeness, currentness, vocabulary version and
   canonically ordered members all feed the digest.
4. Incomplete or stale source evidence **fails closed** rather than granting a
   weaker authority.
5. `docs/CURRENT_STATE.md` live anchors are **reconciled per field semantics**,
   not bulk-set to HEAD.
6. `bin/project-state-check.mjs` gains a **cross-authority invariant** against
   `.agent/ACTIVE_TASK.md` that detects a mutually consistent but globally
   stale baseline, offline.
7. The C-10 certification numbers and the master-plan **digest semantics** are
   reconciled, with history preserved as history.
8. Persisted **free-form field positions** gain mechanically enforced privacy
   coverage, so the DEF-C10-5 blind-spot class cannot recur silently.

## What does not change

The C-10 projection algebra, the persistence firewall's reason vocabulary, the
two digest families, the production store layout, the Control Center exclusion,
C-06's fail-closed read-only proof, and the set of supported environments.
Production remains non-loadable. No C-11 capability is added.

## Impact

- Affected specs: `production-provenance-authority` (new capability),
  `production-privacy-firewall` (route/key authority clause tightened).
- Affected code: a new provenance-authority module inside the C-10 cone, a new
  derivation adapter outside it, the two vocabulary modules, the consumers that
  must require registry membership, `bin/hardening-check.mjs`,
  `bin/project-state-check.mjs`, `docs/CURRENT_STATE.md`, the master
  production-observability design, and the C-10 privacy test corpus.
- Risk: the raw constructors are used by the existing C-10 test fixtures, which
  must migrate to the TEST-ONLY seam. That migration is mechanical and is
  covered by the requirement that a test-seam capability cannot enter the
  production authority path.
