# Design — Control Center style and absence truth

## Families are asserted from their value sets, not by parsing interpolations

`styles.test.ts` cannot parse `${...}` statically; that is why it excluded
fragments. The produced value sets are small and explicit in the code, so the
suite gains a per-family map: family prefix, produced values, and the values
that deliberately ride the base class. The neutral values are stated with
reasons (`status-neutral` and `stage-neutral` have no rule because the base
pill and chip already carry the neutral treatment; `text-neutral` for the
same reason), so the absence of a rule is a recorded decision.

With A-04 resolved by removal, the system-map family no longer exists and
needs no assertion.

## Runtime class effect by toggle on the live element

Cloning an element changes its cascade context: descendant and sibling
selectors can stop matching. The check instead keeps the element where it is,
removes the class with `setAttribute` (the `className` property of an SVG
element is not a plain string), reads every computed property, restores the
class, reads again, and compares property by property. A class is effective
when at least one property differs on at least one element that carries it.
Transitions and animations are disabled for the duration so no interpolated
value is read; the style element is removed afterwards.

The check runs once per view in the existing qualification walk and
accumulates classes and their effectiveness across the whole composition. The
ineffective set must equal a reasoned base-only list, in both directions: a
class that becomes ineffective and is not listed fails, and a listed class
that becomes effective is stale.

## Absence is a differential on the collection itself

The fixture generator records every array field with its contract and path.
After the scalar matrix, the absence pass clones the fixtures, empties one
array, re-renders the owning view, and requires the DOM to differ. Arrays whose
emptiness is legitimately indistinguishable carry a reason. The recorded
arrays make the pass non-vacuous: a generator that stopped recording arrays
would fail an explicit count.

## A-04 is resolved by removal, not by a new taxonomy

The four styled values cannot be produced by the wire vocabulary, and the
semantic mapping from thirteen statuses to a colour set is a product decision.
The predecessor's dangling-modifier precedent applies: `node-${...}` and
`edge-${...}` are removed, the four `.map-node.node-*` tone rules are deleted,
and `.map-node`, `.map-edge` and `.node-selected` remain. Current pixels are
unchanged; the alternative colour taxonomy is recorded as deferred
owner-facing work.

## Every new check states its own limit

The runtime effect check proves a class changes a computed property in the
synthetic composition; it does not prove the change is visible or correct.
The absence pass proves the DOM differs when an array empties; it does not
prove the message is good.
