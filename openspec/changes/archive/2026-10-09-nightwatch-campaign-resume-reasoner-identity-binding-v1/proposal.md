## Why

Local campaign resume already fail-closes on a widened investigation scope and restores the stored budget ceiling, but it does not bind the reasoner. `resumeLocalCliCampaign` always builds a fresh CLI driver from the caller's executable, argv, provider, and model. The persisted `campaignProgress.reasonerIdentity` path/digest is parsed and echoed as F-19 attribution, then ignored as an admission condition.

The current pause/resume test proves the gap: it resumes the same campaign with a different script and omits the stored identity entirely. W11/W12 treated a mid-wave provider change as invalidating yield. A resumed campaign can therefore continue its ledger, strategy, and remaining budget under a different model than the one that produced the checkpoint.

## What Changes

- Treat stored reasoner identity (resolved path, digest, provider, model, argv digest) as resume authority, not only after-the-fact evidence.
- Refuse resume when the caller omits, forges, or changes any identity member relative to the checkpoint generation.
- Keep F-19 recording and no-shell spawn rules; this change adds the missing compare-and-swap at resume.
- Add omitted-identity, path/digest mismatch, provider/model swap, and argv-swap regressions.

## Capabilities

### New Capabilities

- `campaign-resume-reasoner-identity-binding`: Defines exact reasoner-generation continuity for local campaign resume.

### Modified Capabilities

None.

## Impact

- Affects `src/core/agentRuntime/localCampaign.ts` resume/progress parsing and focused local-campaign tests.
- Does not spawn a reasoner during planning, contact DEV, or change F-19 path validation.
