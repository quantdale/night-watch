Implementation is outside the planning-only audit campaign. These tasks are declared not in scope; none has been performed.

## 1. Freeze adapter defaults

- [ ] ~~1.1 Inventory every executeAgentTool adapter fixture read and default constructor.~~
- [ ] ~~1.2 Confirm W7 session already refuses synthetic fallbacks and is not the owner of this change.~~

## 2. Fail closed on absence

- [ ] ~~2.1 Remove Bug Atlas and System Atlas default corpora/overlays.~~
- [ ] ~~2.2 Return ADAPTER_UNAVAILABLE for every missing required fixture.~~
- [ ] ~~2.3 Keep caller-supplied fixtures, including explicit synthetic test stores.~~

## 3. Prove closure

- [ ] ~~3.1 Extend missing-fixture tests to every fixture-backed catalog tool.~~
- [ ] ~~3.2 Run agent-tool, hunt-mode, and autonomy suites, typecheck, hardening, and local/clean gates without owner-local atlas I/O.~~
