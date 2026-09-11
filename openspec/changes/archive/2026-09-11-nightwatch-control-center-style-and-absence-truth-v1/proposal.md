# Proposal — Control Center style and absence truth

The render-truth campaign closed the gap between "a field reaches a component
file" and "a field's value reaches the DOM", and proved four representative
dynamic classes in the built bundle. Three limits remained, and recon found
one real divergence behind them.

The source stylesheet guard excludes seven interpolation prefixes from its
class extraction and then asserts concrete values for only three families, so
`status-*` and `stage-*` are produced with no assertion, and the system map's
`node-*` family is excluded entirely. The built bundle has no proof that a
rendered class changes any computed style beyond four selectors. The render
harness flips scalar leaves but never empties an array, so an empty collection
that renders like a short one passes every check.

The divergence: the system map builds its tone classes from the 13-value core
evidence vocabulary, while the stylesheet matches only `proven`, `unproven`,
`unknown` and `refuted` — none of which that vocabulary can produce. Every map
tone rule is dead and every tone class is inert; the map has been flat since
the vocabulary changed.

This change asserts every concrete value each rendered family can produce and
states intentional base-only values in the suite; adds a runtime check that
every class the synthetic composition renders changes at least one computed
property on an element that carries it, with a reasoned base-only list; adds
an absence pass that empties every array field and requires the DOM to change;
and removes the map's inert interpolation and dead tone rules rather than
inventing a colour taxonomy for it.

No route, adapter, contract, bound or authority changes. No pixel changes: the
map already renders without those rules.
