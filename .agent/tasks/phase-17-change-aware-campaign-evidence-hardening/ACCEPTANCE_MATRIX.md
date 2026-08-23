# Phase 17 Acceptance Matrix

| ID | Requirement | Proof |
| --- | --- | --- |
| A01 | Phase remains LOCAL / SOURCE / SYNTHETIC only | source review, hardening check, safety ledger |
| A02 | Source selection maps direct, shared, transitive, fallback, stale, irrelevant, and unlinked cases | W1 fixture matrix |
| A03 | Source-aware portfolio order and explanations are deterministic and sanitized | repeated byte comparison and sentinel sweep |
| A04 | Existing owner/frozen/approved-target gates still dominate source relevance | portfolio compatibility cone and adversarial blocked fixtures |
| A05 | Equivalent change documents have property-order-independent identity | permutation regression |
| A06 | Baseline documents fail closed on malformed structure, unknown fields, unsafe text, duplicates, and drift | parser matrix |
| A07 | Hostile duplicate values never enter validator errors | runtime validation regression and error sweep |
| A08 | Repeated action IDs cannot yield false occurrence-specific minimality proof | replay evidence regression |
| A09 | Historical schemas and existing Phase 16/triage contracts remain compatible | affected suite and full suite |
| A10 | Important generated/report artifacts are byte-stable across repeated runs | deterministic corpus report |
| A11 | Canonical and isolated full regressions have exact parity | run ledgers and isolated checkout evidence |
| A12 | Continuity/project validators and docs reflect live truth | `agent:check`, `agent:audit`, `project:check`, diff review |
