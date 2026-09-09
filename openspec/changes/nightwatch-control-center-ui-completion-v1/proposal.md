# Proposal — Control Center UI completion

The Control Center has all nine of its views. What it does not have is the
evidence those views already fetch. Nine snapshot contracts arrive in full and
reach the screen in part; the execution graph draws a twenty-fourth of what
the server sends and labels the result complete; and a toolbar shipped with
correct markup, correct state and no stylesheet rule, so its filter changes no
pixel.

This change completes the UI in the only sense that matters for this
repository: every field the client fetches reaches the operator, every bound
the client itself imposes is disclosed as the client's, and every control that
computes a state also shows it.

Concretely, the execution-graph canvas is rebuilt on the same deterministic
layered layout the source graph uses, drawing every node and edge the server
sent, with pan, zoom, search, an execution-state filter and selection, and
disclosure of both server truncation and any edge whose endpoint is outside
the projection. Run detail gains repository provenance, the per-type and
per-severity event censuses, the screenshot count, hard-failure codes and note
codes, and the timeline states when its single bounded page was cut. The
Safety Center lists every check by name with its state and reason code, names
the operation classes the surface refuses, and shows the authorization class,
findings-storage class and feature flags the build declares about itself. The
Overview gains the readiness measurements behind its verdict, keeping deferred
dimensions and never-measured dimensions as the separate facts they are. The
source and reviewer surfaces render their binding, capability, exclusion,
counterevidence and shared-invariant fields.

The missing stylesheet rules are added, and the two dangling modifier classes
are removed rather than given invented styles.

Finally, both defect classes get the mechanical comparison that would have
caught them: one check asserts that every contract field reaches the component
file, and one asserts that every rendered class has a rule. Each carries an
explicit, reasoned exempt list rather than relying on silence, and each states
the limit of what it proves.

This change adds no route, no authority and no data. It renders what the
server already sends, under the boundary that already exists.
