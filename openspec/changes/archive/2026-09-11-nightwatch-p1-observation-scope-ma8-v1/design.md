# Design — MA-8 / F-13 P1 observation-scope prerequisite

## 1. The architectural defect (F-13)

C-11's eighteen-gate `productionRunGate` answers one question: *may Nightwatch
issue this production request?* Every request-side gate (method/body, route
authority, read-only proof, budget reservation, resolved-address admission)
evaluates a Nightwatch-constructed intent. A P1 session constructs no intent —
it attaches to an operator's already-loaded page — so the request chain never
naturally executes and P1 would be "protected" only by the privacy firewall
while the operator navigates anywhere, including mutating actions performed
while Nightwatch records (F-13 problem 2).

Worse, "P1 issues no request" (UA-8) confuses the builder with the cause.
Loading an authenticated SPA issues application-initiated requests; if
Nightwatch causes the page to load, "Nightwatch issued nothing" hides the
traffic under a definition (F-13 problem 3). The corrected criterion,
implemented mechanically by this change, is:

```text
ZERO REQUESTS ATTRIBUTABLE TO NIGHTWATCH
```

with every observed request counted and attributed — not "Nightwatch's explicit
HTTP request builder was unused".

## 2. The P1 observation-scope chain (MA-8 / E-16)

Version `nightwatch.p1-observation-scope.v1`. A NAMED ORDERED list, never a
count (the C-11 lesson). Order is load-bearing: kill switch first and last;
configuration integrity before anything read from the configuration; subject
presence before subject provenance; window before privacy (no projection work
is authorised outside a valid window).

```text
P1_KILL_SWITCH_ENTRY          probe ENGAGED → deny
P1_OWNER_AUTHORIZATION        absent / expired / scope-mismatch / consumed → deny
P1_AUTHORIZATION_CLASS        class ≠ P1_OBSERVE or claimed stage ≠ P1 → deny
P1_CONFIGURATION_INTEGRITY    external scope config fails integrity → deny
P1_IMPLEMENTATION_IDENTITY    implementation SHA / policy version mismatch → deny
P1_PQ_BINDING                 PQ receipt digest absent or unbound → deny
P1_SUBJECT_PRESENCE           no operator-supplied subject → deny
P1_SUBJECT_PROVENANCE         ambiguous / out-of-scope subject → deny
P1_HOST_ADMISSION             host not exactly admitted → deny
P1_OBSERVATION_WINDOW         window absent / not-yet / expired / excessive → deny
P1_OBSERVER_IDENTITY          UNKNOWN or below ORDINARY_USER → deny
P1_PRIVACY_CAPABILITY         no production-cone policy injected → deny
P1_EVIDENCE_DESTINATION       destination not the private production root → deny
P1_ATTRIBUTION_CAPABILITY     no attributing event source → deny
P1_KILL_SWITCH_PREATTACH      probe ENGAGED since entry → deny
```

Each gate owns its categorical denial codes; the evaluator enforces
code-confinement at runtime so no gate can borrow another's reason. First
denial wins; later gates are `NOT_EVALUATED`. A chain-definition digest binds
version + ordered gate IDs + per-gate codes, so a renamed, reordered, added,
or removed gate changes the digest and voids existing receipts.

This chain establishes authority to **observe an already-existing subject**.
It grants no authority to create that subject, navigate, interact, or generate
traffic. It cannot silently become P2/P3: the authorization class is
`P1_OBSERVE`, the stage is pinned to `P1`, and promotion requires a fresh
grant of a different class that this cone cannot construct or consume.

## 3. Subject model (§6 / §15)

The future P1 runtime must not bootstrap authenticated production state:
no launching a browser to log into production, no automated login, no
credential entry, no `page.goto()` to establish the subject, no reload to
establish it, no clicking/typing/submitting, no scripted fetch/XHR, no
service-worker or cache manipulation, no production test entities.

The subject arrives as an operator-supplied descriptor: a nonce identifying
the already-existing page/session, provenance metadata establishing it as
operator-created (never Nightwatch-created), and the admitted host it belongs
to. Admission requires presence + unambiguous provenance + in-scope host.
This campaign exercises the mechanism with local synthetic subjects only —
a mock subject that exists before the observer attaches.

## 4. Attribution model (§5 / §9)

Four classes, classified per observed request from mechanical evidence
(causal link to a post-attach Nightwatch action, pre-attach existence proof,
initiator metadata, proxy/event-stream provenance) — never from timestamps
alone:

- `OPERATOR_PREEXISTING` — in flight or established before attach, with
  operator-causal provenance and no Nightwatch link.
- `APPLICATION_AUTONOMOUS` — application timers, polling, telemetry, or
  browser/subresource activity after attach with no Nightwatch causal link.
- `NIGHTWATCH_ATTRIBUTABLE` — any causal link to a Nightwatch action after
  attach (navigation, fetch/XHR, click/type/submit, scripted trigger).
- `UNKNOWN` — provenance insufficient to place the request above. Fails
  closed; never disappears from the denominator.

Session verdict: `PASSIVE_OBSERVATION_COMPLETE` (the only PASS) requires at
least one qualifying observation AND `NIGHTWATCH_ATTRIBUTABLE == 0` AND
`UNKNOWN == 0`. `NIGHTWATCH_ATTRIBUTABLE > 0` yields
`NIGHTWATCH_TRAFFIC_DETECTED`; `UNKNOWN > 0` yields `ATTRIBUTION_UNKNOWN`.
No subject yields `NO_SUBJECT`; subject but no qualifying observation yields
`NO_QUALIFYING_OBSERVATION`; a window that closes with nothing observed yields
`OBSERVATION_WINDOW_EMPTY`. Zero samples remain
`BLOCKED — NO QUALIFYING PRODUCTION OBSERVATIONS`, never PASS (§10).

## 5. Passive capability cone (§7)

`src/core/prodObserveP1/` may consume bounded observation events, project
approved structure, compute attribution, write privacy-approved evidence, and
terminate. It MUST NOT import the active production request path, the replay/
minimization executor, DEV/NEXT campaign execution, navigation/fetch/XHR
primitives, click/type/submit actuation, authenticated-state creation, or any
network/process capability — enforced by `checkP1ObservationScopeBoundary`
(import-graph assertions over comment-stripped source), not by comments.
The cone documents what it must never import, and the scanner strips comments
so the documentation is not itself a violation (the C-11 lesson).

## 6. L6 reconciliation (option B)

F-13 problem 1 is real: a fresh rootless network namespace (T-13/RG-18)
contains processes Nightwatch launches; an operator-provided already-loaded
page cannot be placed inside one. Declaring L6 "not applicable" silently would
be a waiver, so this change records the explicit P1-specific invariant that
provides equal safety for P1's actual (non-)capability:

```text
Nightwatch cannot initiate traffic (no network imports in the cone — proven)
+ Nightwatch cannot mutate the page (no actuation imports — proven)
+ every observed request is counted and attributed (attribution model above)
+ unknown attribution fails closed (UNKNOWN ⇒ no PASS)
+ scope / window / host are bounded (admission chain above)
+ privacy projection is mandatory (production-cone policy gate)
```

There is no Nightwatch-originated egress to contain, because the cone has no
egress capability; what is contained instead is *authority* (admission),
*causality* (attribution), and *evidence* (projection). Recorded as a
deliberate architecture decision with this threat-model coverage. If a future
review shows the invariant insufficient, the corresponding requirement returns
to BLOCKED rather than weakening containment.

## 7. External configuration contract (§17)

P1 scope configuration is external-only: absolute path, outside repository
and workspace, owner-only mode, no symlink, schema
`nightwatch.p1-scope-config.v1`. It carries the exact admitted host
(hostname only — no wildcard, scheme, port, or CIDR), the bounded observation
window (`notBeforeMs`/`notAfterMs` plus a maximum-duration cap), the private
evidence destination (must resolve under the owner-only production root;
in-repo paths refused), and the expected implementation identity. The host
allowlist is BUILT from this config; the cone never imports any deny table,
and absence of explicit admission denies. No production host, credential,
cookie, session, token, profile, or customer identifier is committed;
fixtures use unmistakably synthetic/local values.

## 8. What C-08b leaves UNKNOWN stays UNKNOWN (§16)

Deployment facts Nightwatch cannot establish (C-08b) remain `UNKNOWN`, and
`UNKNOWN != PROVEN`. The P1 host gate admits only what the external scope
config explicitly admits; it never infers a binding from inventory, census,
or absence from a deny table. If the real admitted value is unavailable, the
gate denies locally — correct behavior, not a gap.
