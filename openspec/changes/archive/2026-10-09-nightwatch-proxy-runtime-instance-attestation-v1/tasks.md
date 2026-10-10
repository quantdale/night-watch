Implementation is explicitly outside the planning-only audit campaign that created this change. These tasks are declared not in scope for the current task; none has been performed.

## 1. Define and reproduce the boundary

- [ ] ~~1.1 In a separately authorized implementation session, inventory every proxy startup, runtime-state reader, health check, browser handoff, event reader, liveness poll, and cleanup caller.~~
- [ ] ~~1.2 Add a local fake-loopback regression proving constant HTTP 204 currently satisfies health when paired with syntactically valid state.~~
- [ ] ~~1.3 Define strict instance, control-generation, challenge/response, attested-handle, handoff, and revocation schemas with bounded exact-key parsing.~~

## 2. Implement safe startup and state publication

- [ ] ~~2.1 Make startup acquire the lease and private no-follow runtime generation, exclusively create the event log/control files, and generate a fresh instance identity/capability.~~
- [ ] ~~2.2 Bind listener/process-start/environment/static policy/event generation facts, then publish state only after listening and durability checks pass.~~
- [ ] ~~2.3 Implement conservative stale-generation recovery and owned teardown without truncating/following/deleting ambiguous paths.~~

## 3. Implement attestation and consumer binding

- [ ] ~~3.1 Replace constant health with fresh challenge/strict response verification and uniform refusal for malformed/replayed/foreign requests.~~
- [ ] ~~3.2 Return one attested runtime handle and require it in real-run gates, browser launch, recorders, event readers, liveness polls, and cleanup.~~
- [ ] ~~3.3 Implement minimal explicit setup/worker/launcher handoff; remove ambient URL/state-only admission and reject legacy runtime state.~~

## 4. Adversarial and mutation proof

- [ ] ~~4.1 Test fake 204 listeners, stale port reuse, replacement Nightwatch instances, PID/lease mismatch, nonce replay, state/event substitution, and preflight-to-launch swaps.~~
- [ ] ~~4.2 Test concurrent suites, startup crash at every boundary, proxy/process death, stale/live cleanup, symlink/ancestor/permission attacks, and event-log write failure.~~
- [ ] ~~4.3 Inject secret/capability sentinels into parent environments and verify they do not reach Chromium, unrelated children, logs, evidence, errors, or reports.~~
- [ ] ~~4.4 Register mutations for status-only health, static/echo identity, skipped lease/event binding, state-only rebind, missing revocation, and unsafe control-file writes.~~

## 5. Acceptance and handoff

- [ ] ~~5.1 Run focused proxy/real-run/browser suites, root/bin typechecks, hardening/mutations, L5/L6 synthetic containment qualification, continuity/workspace/project checks, local/clean/topology gates, and full regression.~~
- [ ] ~~5.2 Update safety/architecture/operator documentation, strict-validate this change, inspect privacy/diff, and integrate only through an owned C-00 session without external network or authenticated target contact.~~
