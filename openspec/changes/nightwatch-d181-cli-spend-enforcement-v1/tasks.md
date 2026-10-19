# Tasks — D-181 CLI monetary-enforcement closure

## 1. Defect trace

- [x] 1.1 Trace the production run/resume paths and confirm the exact defect

## 2. Pure admissions (spendCeiling.ts)

- [ ] 2.1 Identity-bound ceiling (provider/model) with a validated declaration
- [ ] 2.2 Metered-run admission, identity agreement and resume-equality admissions

## 3. Campaign-layer enforcement

- [ ] 3.1 Mechanical metered determination and fail-closed campaign admission
- [ ] 3.2 The ceiling persisted in the progress envelope and enforced on resume

## 4. CLI enforcement and wiring

- [ ] 4.1 Owner-declared ceiling flags on run/resume with fail-closed validation
- [ ] 4.2 The wired chain CLI to local campaign to AgentRuntime to admitProviderCall

## 5. Tests and registries

- [ ] 5.1 Real-CLI stub-provider tests for every required enforcement case
- [ ] 5.2 Validation-universe and execution-class registration

## 6. Gates and certification

- [ ] 6.1 Full regression, hardening, mutants, prepush and milestone gates
- [ ] 6.2 Governed C-00 integration, exact-head CI and checkpoint evidence at 15/16
