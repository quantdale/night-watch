# Proposal — C-10 Production Privacy Firewall

## Why

Nightwatch's privacy boundary today is a **denylist**: `RedactionLayer` scrubs
known-sensitive headers, query parameters and registered secret values after
observation (D-6), and `assertPrivatePayload` sentinel-screens at the store
boundary. That shape is adequate for DEV fixtures and demonstrably sufficient
for the fake-secret suites. It is the wrong shape for production, where the
sensitive material is *ordinary-looking business values*: an account id, an
invoice number, a cost figure, a company name. A denylist cannot enumerate
those.

The independent review found five leakage paths that break the boundary as
originally designed (F-14 through F-18). Four of them carry production bytes
**around** the projection boundary rather than through it: request URLs and
parameters, key names admitted as "shape", page console output, and the on-disk
browser profile. Until those are closed, the claim "raw production bytes are
structurally incapable of reaching persistence" is not defensible.

## What changes

C-10 replaces the primary boundary with an **allowlisted structural
projection** whose persistence API cannot accept raw values, and closes the four
around-the-boundary paths plus the digest confusion and the Control Center
exposure.

1. **Key provenance (F-14).** A key literal may cross the production boundary
   only as a proven member of a source-proven finite key vocabulary carrying
   explicit provenance. Unproven/dynamic keys yield bounded structural
   information only — never the literal, never a digest derived from it.
2. **Two digest families (F-15).** An unsalted, value-free, cross-campaign
   stable `prodstruct:sha256:` STRUCTURAL digest that may be persisted; and no
   durable value-derived digest at all. Correlation, where genuinely needed, is
   an ephemeral in-memory encounter token that is never persisted and never
   digested.
3. **Typed boundary.** `RAW_EPHEMERAL` → `SAFE_STRUCTURAL_PROJECTION` →
   `SAFE_PRODUCTION_EVIDENCE`, instead of `unknown` through loosely typed
   helpers. The projection cone has no persistence authority; the persistence
   cone cannot accept a raw response object.
4. **Import isolation.** The projection cone is mechanically proven to hold no
   filesystem, network, process or publication capability.
5. **Persistence firewall.** An independent second validation at the durable
   write, intentionally redundant with projection.
6. **Separate production root (G).** `$HOME/.nightwatch/prod-findings/`, 0700
   directories and 0600 files, symlink-refusing, outside the repository, atomic
   and bounded, with its own policy identity — never the DEV findings root.
7. **Control Center exclusion (F-18).** Structurally incapable of reading the
   production store, by resolved-path equivalence, including through the
   test-only seam, with a hardening invariant.
8. **Console, screenshots, traces, profile (F-17 + review addendum).**
   Production page console text cannot persist; production screenshots and
   traces are contract failures; ephemeral profile controls with normal-exit and
   crash-path cleanup.
9. **Parameter provenance (F-16).** The privacy-side contract only: owner
   supplied, external-only storage, opaque handles in Nightwatch state,
   route-template URL identity, and validators proving no value reaches a log,
   budget key, replay fingerprint, checkpoint, error, receipt or persisted URL.

## What does not change

- The Phase 9 DEV semantic projection `nightwatch.semantic-projection.v1` is
  retained unchanged. It is load-bearing for Phase 9/9A.1/10/10A admission,
  `semanticStateEquals`, path-based expectations, `TYPE_IN_SET` and the PHP
  row-key contracts. C-10 adds a versioned production sibling and re-scopes the
  existing surface as explicitly DEV-only.
- `RedactionLayer`, Phase 22 safe-observation guards, authenticated evidence
  minimization, owner-only artifact storage and dossier validation are reused
  and converged with, not duplicated. Redaction remains defence in depth.
- C-06 is untouched and remains fail-closed.

## What this does NOT authorize

C-10 completing does **not** authorize production observation. It creates the
privacy prerequisite required by the later production kernel. `PROD_OBSERVE`,
C-11 through C-14, production connectivity, production in
`SUPPORTED_ENVIRONMENTS`, and a loadable `config/environments/production.json`
all remain out of scope and unimplemented.

## Supersession of tracked design text

`design.md §6.2` and `§6.4` of the master plan specify a digest "salted
per-campaign, never persisted" while `§9.4` requires cross-campaign structural
comparison. Independent-review F-15 (with MA-11 and UA-11) identifies this as a
direct internal contradiction. C-10 implements the review's resolution — two
explicitly named families — and records the supersession rather than silently
contradicting a tracked document.
