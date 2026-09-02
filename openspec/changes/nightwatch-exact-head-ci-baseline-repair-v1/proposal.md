# Proposal — Exact-Head CI Baseline Repair and Truth Reconciliation

## Why

For a long run of Nightwatch checkpoints, GitHub Actions was truthfully
classified as external non-evidence: exact-head jobs completed with
`steps=[]`, `runner_id=0`, and no log. Local and clean-Node-20 gates carried
release certification instead.

That is no longer what is happening. Exact-head run `33572572053` at
`c3fed38abd281e8648c039ac3befe8034c13e868` bootstrapped the runner and
EXECUTED REPOSITORY CODE. Checkout, Node 20 setup and `npm ci --ignore-scripts`
passed, `npm run gate:ci` ran to completion, and the job emitted the
authoritative receipt `receipt:sha256:1a55a1e307541c094dcbfb3f`: eight required
groups PASS, `SYNTHETIC_CAMPAIGN` `TEST_FAILURE` with 121 passed and 2 failed,
and `PATCH_INTEGRITY` and `WORKSPACE_INTEGRITY` `NOT_RUN`.

Two things follow. First, this is a REAL EXECUTED TEST FAILURE and must not be
filed under the zero-step platform classification. Second, the receipt could
not say WHICH two cases failed, because the gate's detail parser served exactly
one schema and its count parser could not see Playwright's "did not run"
bucket — so 121 + 2 reconciled against nothing while five cases silently
vanished from an authoritative receipt.

Both failures turned out to be host-topology defects in TEST code, where the
production path was already correct and already fail-closed:

- `tests/unit/eligibilityCensus.test.ts` asserted census CONTENT without first
  asserting the census POPULATION. `DEFAULT_SIBLING_ROOT` is an absolute path
  that cannot exist on a runner, so the operator correctly reported every
  approved repository as `SOURCE_UNAVAILABLE` and emitted no census at all.
- `tests/unit/l6Containment.test.ts` asserted that rootless L6 containment is
  always available. The `ubuntu-24.04` image ships no Bubblewrap binary, so
  `qualifyL6RuntimeCapability()` correctly failed closed with
  `BWRAP_UNAVAILABLE`, and the serial suite cascaded five cases into "did not
  run".

Neither implicates C-06, which remains closed and fail-closed.

The deeper finding is why local certification missed both: `gate:clean` clones
into `os.tmpdir()` but runs on the SAME HOST, so the sibling source root,
`$HOME` and the Bubblewrap binary are all still present. It measures
checkout cleanliness, not runner topology, and structurally cannot catch this
defect class.

## Change

Repair both root causes by replacing each host-dependent assumption with an
invariant that holds in BOTH topologies and is strictly stronger, because it
additionally pins down fail-closed behaviour that was never covered before. No
test is skipped in either environment.

Add a repository-owned synthetic-campaign launcher that emits a bounded,
categorical receipt, and a separately testable gate boundary module that
allowlists what may cross into a quality-gate receipt. Record which containment
lane actually ran, and REQUIRE the proven lane wherever the host can provide
it, so a green receipt can never imply coverage the run did not have.

Reconcile project truth: set live CI state from evidence, preserve the
historical zero-step runs as facts about the runs they describe, and add a
mechanical validator for the staleness class that existed at campaign start.

## Non-goals

C-10 and beyond, `PROD_OBSERVE`, any product-environment contact, credential or
auth-state inspection, sibling-repository writes, publication, installing
Bubblewrap in CI, and a CI-topology clean gate.
