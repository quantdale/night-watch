# Report — D-181 CLI monetary-enforcement closure

Status: IN_PROGRESS

## 1. Defect and trace

`bin/nightwatch-agent.mjs` `campaign run` and `campaign resume` never pass
`spendCeiling` to `runLocalCliCampaign` / `resumeLocalCliCampaign`, and
`admitRunSpendCeiling` has no production caller. `AgentRuntime` consults the
pre-request admission only when the optional parameter is defined, so the
production metered route dispatches provider calls with no monetary ceiling.

## 2. Status

Implementation in progress; this report is completed at task closure.
