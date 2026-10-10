Implementation is outside the planning-only audit campaign. These tasks are declared not in scope; none has been performed.

## 1. Establish lifecycle ownership

- [ ] ~~1.1 Syntax-discover every context/page/session/listener/timer/trace/guard acquisition and release path.~~
- [ ] ~~1.2 Add injected failures proving the current post-creation leak and popup guard race.~~
- [ ] ~~1.3 Define the startup/teardown states, exact page generation, resource ledger, bounds, and categorical errors.~~

## 2. Implement atomic startup and page admission

- [ ] ~~2.1 Introduce the staged transaction and register compensators before each fallible continuation.~~
- [ ] ~~2.2 Gate the initial page and every popup/new page on exact per-page guard readiness.~~
- [ ] ~~2.3 Refuse unsupported pause/admission behavior and revoke the context on uncertain coverage.~~

## 3. Complete deterministic teardown

- [ ] ~~3.1 Unify rollback and close, make them idempotent, and settle health/guard work.~~
- [ ] ~~3.2 Remove owned listeners/sessions/timers and distinguish expected from unexpected lifecycle events.~~
- [ ] ~~3.3 Emit bounded safe incomplete-cleanup truth; never swallow a cleanup defect into success.~~

## 4. Adversarial proof and acceptance

- [ ] ~~4.1 Test every stage fault, popup/navigation race, disconnect/close race, and trace/recorder/proxy failure.~~
- [ ] ~~4.2 Add resource-census and mutation tests for every barrier and compensator.~~
- [ ] ~~4.3 Run focused browser/context suites, typecheck, hardening/mutations, local/clean/topology gates, and full regression without real targets.~~
- [ ] ~~4.4 Update architecture/safety truth and integrate only through a separately authorized owned session.~~
