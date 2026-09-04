# Design — dep-removal docs reconciliation

## Root cause

The D-87 consequences paragraph states present-tense standing truth
about the tree. The dep-removal campaign changed the tree (entries
deleted, audit zero) without reconciling that paragraph — an ordinary
docs-drift miss, same class R-12 repaired cell-by-cell elsewhere.

## Change shape

One sentence: retain the original clause for history, append the
superseding fact (removed as unused at the removal anchor; `npm audit`
zero). No renumbering, no new decision entry, no other edits.

## Why append-style

The repository preserves decision history rather than rewriting it;
only standing claims get reconciled. This follows the drift-notes
pattern already in CURRENT_STATE.md.
