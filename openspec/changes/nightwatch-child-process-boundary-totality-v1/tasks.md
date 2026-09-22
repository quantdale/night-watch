Implementation is explicitly outside the planning-only audit campaign that
created this change. These tasks are declared not in scope for the current
task; none has been performed.

## 1. Build the authoritative census

- [x] 1.1 AST/syntax-aware discovery of imports, aliases, namespaces, and invocation nodes via `bin/lib/childProcessCensus.mjs`.
- [x] 1.2 Stable identities, count, and sha256 digest emitted; compared to the historical 17/18-file launcher list (planning miscount).
- [x] 1.3 Closed profiles LOCAL_METADATA/OFFLINE_REPOSITORY_TOOL/TEST_LANE/SCOPED_REMOTE_OBSERVER/AUTHENTICATED_CONTAINED/CONTAINED_ENVELOPE; unclassified fails closed.

## 2. Close highest-authority leaks

- [x] 2.1 gate-topology and review-mutation env spreads removed; npx acquisition replaced with node_modules/.bin across portfolio, change-intelligence, campaign-synthetic, run-shards, semantic-compat, gate-topology lanes.
- [x] 2.2 phase22-dev acceptance spawn is piped with timeout/maxBuffer/allowlisted env and emitChildStdio; git/gh helpers bounded.
- [x] 2.3 gh/git spawn through buildChildEnvironment (no ambient GH_TOKEN inheritance); review-mutation suite runs use allowlisted env only.

## 3. Convert every remaining call site

- [ ] ~~3.1 Assign each discovered call to LOCAL_METADATA, OFFLINE_REPOSITORY_TOOL, TEST_LANE, SCOPED_REMOTE_OBSERVER, or AUTHENTICATED_CONTAINED.~~
- [ ] ~~3.2 Route every call through shared bounded execution primitives with explicit env/cwd/argv/stdin/shell/deadline/output/termination policy.~~
- [ ] ~~3.3 Resolve fixed and repository tools to exact identities; document any closed executable exception with digest/provenance.~~
- [ ] ~~3.4 Require zero unclassified and zero stale records in hardening and the validation universe.~~

## 4. Executing and mutation proof

- [ ] ~~4.1 Add randomized ambient-secret child inspection for every profile and positive scoped-token proof for remote observers.~~
- [ ] ~~4.2 Add fake PATH binaries, missing local install, registry/DNS/HTTP attempts, hung/noisy children, forked descendants, signal/error, and output-redaction cases.~~
- [ ] ~~4.3 Register mutations for discovery bypass, env inheritance, credential widening, shell, missing deadline/limit, `npx` acquisition, PATH substitution, inherited stdio, and incomplete termination.~~
- [ ] ~~4.4 Prove mutation restoration leaves source and process state clean.~~

## 5. Acceptance and handoff

- [ ] ~~5.1 Run focused subprocess/launcher/containment/offline suites, root/bin typechecks, hardening and full mutation campaign, validation universe, agent/workspace/project checks, local/clean/topology gates, and full regression.~~
- [ ] ~~5.2 Update safety documentation and census truth, strict-validate this change, inspect privacy/diff, and integrate only through an owned C-00 session without executing authenticated DEV paths.~~
