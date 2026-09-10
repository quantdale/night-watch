# Proposal — Control Center render truth

The predecessor campaign made the Control Center render every field it
fetches, and added a guard that proves each contract field NAME occurs inside
a component that can receive its contract. That guard is honest about being
static: a field read only in a branch the default state never takes, computed
into a variable no render consumes, or used only as a React key still passes
while rendering nothing.

This change adds the missing runtime proof. A new suite generates a maximally
revealing fixture per view from the declared TypeScript contracts, then flips
one leaf field at a time and requires the rendered DOM to change. A field
whose value never changes the DOM is either rendered in its owning view or
listed as an exemption with a reason an operator would accept. The suite is
non-vacuous by construction — the extraction and the baseline render are
measured — and mutation-proven: removing a rendered field's DOM effect fails
it.

The same pass fixes the two operator-facing gaps the audit measured.
Navigation currently changes the view without moving focus from the nav link,
without changing the document title, and without announcing the change, so a
keyboard or screen-reader operator is never told what happened; the fix makes
one navigation function own the hash, the view, the title and the focus, while
initial load and background refreshes deliberately leave focus alone. And the
stylesheet guard's runtime half is extended: the browser lane computes styles
for the dynamic class families it currently only proves exist, so a rule that
does not apply in the built bundle fails.

No route, adapter, contract, bound, authority or stylesheet class changes.
Every assertion is local, deterministic and synthetic.
