# Current revalidation summary

Baseline: `78efcc9c4cd02498a0b4bd1d01fb5112d03a1bd1`.

The retained ten-lane discovery was not repeated. These findings were
rechecked against current source and, where safe, synthetic execution:

| Candidate | Current evidence | Status |
| --- | --- | --- |
| Shard false certification | `bin/run-shards.mjs:121-169,254-273`; all-skipped synthetic run exits 0/PASS with null counts coerced to zero; true zero-test run exits 1/TEST_FAILURE | Reproduced misleading green shard; zero-test PASS claim disproven |
| Run-evidence transaction | `src/core/evidence/runRecorder.ts:93-147,186-227,480-600`; two same-run recorders lose a manifest update, duplicate seq 0, and finalize with eventCount 1 while durable JSONL has 2; injected torn append still permits passed summary | Reproduced High integrity/lifecycle defect |
| Child-process census indirection | `bin/lib/childProcessCensus.mjs:57-98,153-234`; synthetic `const cp=require('node:child_process'); cp.spawn(...)` yields importsChildProcess=true but zero bindings/namespaces/sites | Reproduced static census bypass |
| Popup L0 readiness | `src/browser/context.ts:500-515`; popup guard installation remains `void installFetchGuard(...)` while the initial page is awaited | Current source confirms race; browser timing proof still pending |
| Proxy raw event persistence | `src/proxy/events.ts:31-40` and `src/proxy/server.ts:178,225-228`; raw event append precedes recorder projection/firewall | Current source confirms unmediated upstream writer; authenticated reachability proof still pending |
| DEV credential-use binding | `src/auth/devAutoLogin.ts:299-310,501-549`; generic controls are obtained before credential retrieval and later fill/submit path remains separate | Current source confirms planning finding; no credential/browser execution performed |

## Selection score

Scores use the requested `impact × confidence × executability ÷ risk` scale
(each factor 1–5; higher risk lowers the result). The values are ordinal
selection aids, not security probabilities.

| Candidate | Impact | Confidence | Executability | Risk | Score |
| --- | ---: | ---: | ---: | ---: | ---: |
| Shard false certification | 5 | 5 | 5 | 1 | 125 |
| Run-evidence transaction integrity | 5 | 5 | 4 | 2 | 50 |
| Child-process census indirection | 5 | 5 | 4 | 2 | 50 |
| Proxy raw-event persistence | 5 | 4 | 4 | 2 | 40 |
| Credential-use binding | 5 | 4 | 3 | 3 | 20 |
| Popup L0 readiness | 5 | 4 | 2 | 5 | 8 |

Shard certification ranked first because it can turn an all-skipped validation
execution into misleading green evidence, had an exact local reproduction, and
had a bounded machine-readable repair. Run-evidence and census ranked next on
correctness impact; popup ranked last because the reproduction showed that the
locally available L1/page-event barrier does not precede first popup navigation.

This table records the pre-implementation baseline. The shard campaign was then
selected from the scored evidence and implemented in the resumed successor
session; later child results are tracked in the umbrella plan and child tasks.
