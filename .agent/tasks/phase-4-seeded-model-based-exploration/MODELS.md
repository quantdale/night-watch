# Phase 4 Exploration Models

Status: `DESIGN_CHECKPOINT`

Planned schemas:

- `nightwatch.exploration-state.phase4.v1`
- `nightwatch.exploration-transition.phase4.v1`
- `nightwatch.exploration-model.phase4.v1`
- `nightwatch.exploration.phase4.v1` evidence

The model will separate source-allowed edges from runtime-observed edges,
privacy-safe canonical state from raw browser state, and novelty from oracle
anomalies. Implementation is not started until `ACTIONS.md` contains source
provenance and the model contract in SPEC is accepted.
