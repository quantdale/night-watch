# Proposal — Control Center placement coverage

The predecessor completed the Control Center UI and added two guards against
the defect classes it had just repaired. Both guards are honest about being
name-level: `contractCoverage.test.ts` proves a contract field name reaches
`App.tsx`, and `styles.test.ts` proves a rendered class has a rule. Neither
proves the field reaches the view that owns the data. A file-level search can
be satisfied by prose in an unrelated view — `RunListItemSnapshot.passed`
passes only because the Safety Center says "A route that is off is not a route
that passed." — while the field itself is rendered nowhere.

This change makes the contract guard prove placement. For every component in
`App.tsx` it computes a carrier text: the component's body plus the bodies of
functions it invokes with explicit type arguments, so a generic consumer such
as `usePagedCollection<RunListSnapshot, …>` counts as part of the view it
serves; and it closes carriage transitively through containment, so a
component that reads `data.safety` carries `SafetySnapshot`. Every declared
field must then appear inside at least one carrier of its contract, or sit in
a small exempt list with a stated reason. The exempt list fails if an exempt
field becomes rendered or if an entry names no declared field.

The stronger guard measures 16 fields that are fetched and never rendered in
the view that owns them. This change closes every one of them: the Safety
Center renders the service identity, the declared execution and mutation
authority, the owner-scope status and the declared limits; readiness renders
its owner-scope status; the execution graph gains an edge inventory that
carries each edge's proof; Campaign Intelligence renders its declared owner
scope instead of a hardcoded "Frozen by owner" and names each coverage row's
gap reasons; source surfaces name their repository; and the five paged lists
render the server's `page.truncated` through the shared collection and
`LoadMoreControl` instead of inferring completeness from the cursor.

The change also closes the predecessor's three deferred UI residuals: the
source graph counts and discloses endpoint-less edges instead of dropping them
silently; `PlaceholderView` is exported and covered by a test; and the
hardcoded `250 / 500` graph-limit card, which presents the server's defaults
as its maximum, quotes the declared limits the overview already fetches.

No route, adapter, contract, bound or authority changes. Every newly rendered
field was already sanitized and already sent.
