# Tasks — C-10 Production Privacy Firewall

- [ ] **A. Persistence-cone audit** — enumerate every durable-write and
  exposure path, classify each, resolve every `UNKNOWN`. Deliverable: `audit.md`.
- [ ] **B. F-14 key provenance** — `ProvenKeyVocabulary`, per-object key
  classification, dynamic keys reduced to bounded structure. Mandatory
  regression: a planted customer-sentinel key proven present in raw input and
  absent from every byte after the production projection boundary; the existing
  DEV-scope assertion re-scoped in place, not deleted.
- [ ] **C. F-15 digest families** — `prodstruct:sha256:` structural digest;
  no durable value digest; ephemeral encounter tokens only; tests proving the
  two concepts cannot be interchanged.
- [ ] **D. Typed projection boundary** — `RAW_EPHEMERAL` /
  `SAFE_STRUCTURAL_PROJECTION` / `SAFE_PRODUCTION_EVIDENCE`; closed vocabulary;
  reject unknown fields, free text, prototype-hostile input, bound overflow and
  ambiguous provenance; categorical errors with zero raw interpolation.
- [ ] **E. Import isolation** — `hardening:check` rule proving the projection
  cone holds no fs/net/process/publication capability; raw bytes enter through
  one bounded call-scoped reader.
- [ ] **F. Persistence firewall** — independent re-validation at the durable
  write boundary.
- [ ] **G. Production artifact root** — `$HOME/.nightwatch/prod-findings/`,
  0700/0600, symlink-refusing, outside the repository, atomic, bounded,
  separate policy identity. Synthetic tests only; never populated from a real
  environment.
- [ ] **H. Control Center exclusion** — resolved-path-equivalence rejection in
  the normal authority AND the test seam; hardening invariant; DEV findings
  still work; symlink/path-equivalence tricks fail.
- [ ] **I. Console / screenshots / traces / browser profile** — production
  console text cannot persist; screenshots and traces are contract failures;
  ephemeral profile with normal-exit and crash-path cleanup; stale residue in
  the audit sweep.
- [ ] **J. Parameter provenance** — opaque-handle privacy model, validators and
  synthetic proof. No production request execution path.
- [ ] **K. SSE / Control Center projection safety** — prove only already-safe
  projected metadata can enter those channels.
- [ ] **Acceptance A — sentinel corpus** — hostile synthetic production payload
  with sentinels in every relevant location; zero sentinel bytes anywhere
  outside the bounded ephemeral raw fixture; non-vacuous (the raw input is
  explicitly proven to contain every sentinel).
- [ ] **Acceptance B — projection totality/property** — broad deterministic
  JSON corpus; no raw leaf or key literal crosses the boundary; nested objects,
  arrays, dynamic maps, repeats, empties, unicode, malformed structures,
  hostile keys, bounds and cycles.
- [ ] **Acceptance C — boundary import isolation** — mechanical proof.
- [ ] **Acceptance D — error-path leakage** — every meaningful failure branch
  forced; only fixed reason codes, bounded enumerations and approved structural
  identifiers.
- [ ] **Acceptance E — digest privacy** — structural stability, value
  insensitivity, key-literal exclusion, campaign-scoped ephemeral correlation,
  no persistent low-entropy value hash, no persisted salt.
- [ ] **Persistence audit** — deterministic sweep over every root the synthetic
  production privacy cone may create, including temp and profile paths;
  bounded counts and categorical violations.
- [ ] **Validation** — `typecheck`, `hardening:check`, `handoff:check`,
  `project:check`, `agent:check`, `agent:audit`, `gate:inventory`,
  `test:semantic-compat`, `campaign:synthetic`, all affected suites, the
  complete canonical Playwright regression, `gate:local`, `gate:clean`.
- [ ] **Integration** — C-00 session integration, then an exact-head GitHub
  Actions result with all eleven required groups PASS.

## Explicitly out of scope

- [ ] ~~C-11 `PROD_OBSERVE`~~ — not started in this campaign, by construction.
- [ ] ~~C-12, C-13, C-14~~ — not started.
- [ ] ~~production connectivity, `SUPPORTED_ENVIRONMENTS`, loadable
  `config/environments/production.json`~~ — remain unimplemented.
