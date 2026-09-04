# Design — plan/explain cross-command coherence test

Same spawn pattern as `explainIdFlagTolerance.test.ts`: `spawnSync`
the real `bin/nightwatch-intelligence.mjs`, parse `--json` output.
Two spawns (`plan --json`, then `explain <id> --json`); assert
`requestedId` equality, `explanation`, and item presence. No mocks,
no network, deterministic synthetic builders.
