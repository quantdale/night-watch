Implementation is explicitly outside the planning-only audit campaign that created this change. These tasks are declared not in scope for the current task; none has been performed.

## 1. Establish the effect and evidence denominator

- [ ] ~~1.1 In a separately authorized implementation session, syntax-discover every HTTP, CONNECT, Upgrade, DNS, socket, piping, response-forwarding, event-write, recovery, and evidence-reader path.~~
- [ ] ~~1.2 Add regressions showing current allowed HTTP, CONNECT, and Upgrade effects can begin before the present event append completes.~~
- [ ] ~~1.3 Define strict journal header, correlation, staged preparation, terminal transition, recovery, bounds, and categorical error schemas.~~

## 2. Implement the pre-effect journal

- [ ] ~~2.1 Create an owner-only append-only journal bound to the attested proxy instance and durable before readiness.~~
- [ ] ~~2.2 Append, validate, flush, and acknowledge request preparation before resolver, socket, CONNECT success, Upgrade forwarding, or body-pipe effects.~~
- [ ] ~~2.3 Append exactly one durable terminal transition; preserve missing transitions as `INCOMPLETE` and fail closed on conflicts or storage exhaustion.~~

## 3. Make transport and concurrency behavior total

- [ ] ~~3.1 Route HTTP, CONNECT, and Upgrade through one coordinator with no legacy post-effect path.~~
- [ ] ~~3.2 Bind concurrent requests, staged resolution decisions, outcomes, recovery, and readers to unique monotonic correlations.~~
- [ ] ~~3.3 Keep records bounded and privacy-safe; prohibit raw path/query/header/body/cookie/credential/customer values and unsafe diagnostics.~~

## 4. Adversarial and mutation proof

- [ ] ~~4.1 Inject allowed-destination preparation append/fsync failures and prove upstream DNS/socket/connection count remains zero for the current request.~~
- [ ] ~~4.2 Inject terminal-write failure, process crash at every boundary, partial/truncated records, reordering, duplicates, concurrency, capacity exhaustion, and instance/journal substitution.~~
- [ ] ~~4.3 Register mutations for moving any effect before preparation, accepting missing/conflicting outcomes, cross-request acknowledgement reuse, transport bypass, and unsafe field inclusion.~~

## 5. Acceptance and handoff

- [ ] ~~5.1 Run focused proxy/evidence/containment tests, typechecks, hardening/mutations, local/clean/topology gates, and full regression using local synthetic endpoints only.~~
- [ ] ~~5.2 Update safety/architecture/decision truth, strict-validate, inspect privacy/diff, and integrate only through an owned C-00 session.~~
