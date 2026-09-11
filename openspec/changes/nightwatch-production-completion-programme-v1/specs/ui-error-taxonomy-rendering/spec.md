# Spec — UI error taxonomy rendering

Closes F-18. Measured at `36bd493`: `ui/control-center/src/types.ts:432`
declares `ApiErrorKind = 'NETWORK' | 'HTTP' | 'INVALID_RESPONSE' | 'TIMEOUT' |
'ABORTED'`; `api.ts` produces all five and carries the HTTP `status` on
`ControlCenterApiError`; `App.tsx` reads neither field, and thirteen error sites
collapse to `<DataErrorState title="… unavailable" onRetry={onRetry} />`.

## ADDED Requirements

### Requirement: Every error kind the client can produce SHALL reach the operator distinguishably

The five kinds are not decorative. They carry different operator actions and
today they carry none, because the distinction is computed, carried across the
API boundary, and discarded at render:

| Kind | What it means | What the operator should do |
|---|---|---|
| `NETWORK` | the transport failed | check the server is running; retry |
| `TIMEOUT` | the deadline elapsed | retry; if persistent, the snapshot is too expensive |
| `ABORTED` | the caller cancelled | nothing — this is normal navigation |
| `HTTP` + status | the server refused | 404 means the capability is off, not broken; 4xx is a client defect; 5xx is a server defect |
| `INVALID_RESPONSE` | the payload failed the client's contract validator | **a server/client contract mismatch — a defect to report, not a transient failure** |

`INVALID_RESPONSE` is the load-bearing case. It is the one state the Control
Center campaigns built contract guards to prevent, and when it occurs at
runtime the UI presents it as a transient failure behind a retry button that
can never succeed.

Each view's error state SHALL render the kind, the HTTP status where one
exists, and an action appropriate to that kind. A retry affordance SHALL be
offered only for kinds a retry can resolve; for `INVALID_RESPONSE` and for a
4xx other than 408/429 the surface SHALL state that retrying will not help and
name what will.

`ABORTED` SHALL NOT be rendered as an error at all. A caller-cancelled request
during navigation or refresh is normal, and presenting it as a failure trains
the operator to ignore the error state.

No raw server error text, stack, header or path SHALL be rendered; the existing
"no raw service error is displayed" property is preserved. The kind and status
are Nightwatch's own classification, not the server's message.

#### Scenario: a contract mismatch is presented as a defect
- **WHEN** a snapshot fails the client-side contract validator
- **THEN** the view states that the server's payload did not match the
  contract the client requires, and names the contract
- **AND** no retry affordance is offered

#### Scenario: a disabled capability is not a failure
- **WHEN** a request returns 404 for a capability that is deliberately off
- **THEN** the view states the capability is not enabled and names how it is
  enabled
- **AND** it is not presented as an outage

#### Scenario: a cancelled request renders nothing
- **WHEN** a request is aborted by navigation or a superseding refresh
- **THEN** no error state is shown

#### Scenario: retry is offered only where retry can work
- **WHEN** the kind is `NETWORK`, `TIMEOUT`, 408 or 429
- **THEN** a retry affordance is offered
- **AND** for `INVALID_RESPONSE` or any other 4xx it is not

#### Scenario: no raw server text reaches the DOM
- **WHEN** any error state renders
- **THEN** it contains no server-supplied message, stack, header or path

### Requirement: The failure path SHALL be covered by the same guards that cover the success path

The four Control Center campaigns proved that every snapshot contract field
reaches a carrier component, that its value reaches the DOM, that every rendered
class has an effective rule, and that emptying a collection changes the DOM.
All four operate on **snapshot contracts**, and `ApiErrorKind` is not a snapshot
field — it exists only on the failure path, which the fixture generator never
produces. That is exactly why a five-value taxonomy could be rendered as one
state while every guard passed.

The differential render harness SHALL be extended to the failure path: for each
view and each error kind, the harness SHALL drive the view into that error state
and require the rendered DOM to differ from every other error kind's rendering
for that view. Two kinds that legitimately render identically SHALL appear in a
reasoned exemption list that fails in both directions.

A contract-coverage assertion SHALL require every member of `ApiErrorKind` to be
reachable by the harness, so adding a sixth kind without rendering it fails.
The assertion SHALL be over the union type's members rather than a hand-written
list, so it cannot drift from the type.

#### Scenario: two error kinds do not render identically
- **WHEN** a view is driven into `TIMEOUT` and into `INVALID_RESPONSE`
- **THEN** the rendered DOM differs
- **OR** the pair appears in the reasoned exemption list

#### Scenario: a new error kind must be rendered
- **WHEN** a sixth member is added to `ApiErrorKind`
- **THEN** the coverage assertion fails until the harness can reach it and a
  view renders it

#### Scenario: the exemption list is honest in both directions
- **WHEN** an exempted pair begins rendering differently
- **THEN** the check fails as stale

#### Scenario: the mutation proof holds
- **WHEN** a view's error rendering is reduced to a single generic state
- **THEN** the harness fails naming the view and the kinds it conflated

### Requirement: A partial failure SHALL be disclosed, not hidden behind a whole-view error

`CampaignView` renders `DataErrorState` when **either** its summary or its
coverage request fails, so a working summary is discarded because an unrelated
request failed. The Overview composes many sources and has one `ErrorState`.

A view that composes several independent requests SHALL render what succeeded
and disclose what failed, per source, with that source's kind and action.
A whole-view error state SHALL be reserved for the case where nothing the view
needs is available.

This is the same principle the project already applies to evidence: a partial
result is reported as partial with its bound, never as a complete result and
never as nothing.

#### Scenario: a partial composition renders its successful half
- **WHEN** one of a view's independent requests fails and another succeeds
- **THEN** the successful data renders
- **AND** the failed source is disclosed by name with its kind

#### Scenario: total failure is a whole-view state
- **WHEN** every source a view needs fails
- **THEN** the whole-view error state renders

#### Scenario: partial disclosure is proven
- **WHEN** the harness fails exactly one source of a composed view
- **THEN** the assertion requires both the rendered data and the named failure
