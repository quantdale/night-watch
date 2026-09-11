# Design — explain positional-id flag tolerance

## Root cause

The command reads the plan-item id from the raw positional slot
(`args[1]`), but `--json` detection is order-independent, so any flag
placed between the command and the id (or with no id at all, as in
`explain --json`) feeds a flag string into the id shape gate and
produces a misleading `EXPLAIN_ID_UNSAFE` refusal. Same order-fragility
class as the explain-surface defect.

## Change shape

`const requested = args.slice(1).find((arg) => !arg.startsWith("--"));`
then the existing `undefined`-or-shape gate and plan lookup unchanged.
Bare `explain` still yields the null-id preview; malformed ids still
fail closed.

## Why this shape

Minimal, mirrors the explain-surface positional fallback exactly, and
needs no new flag vocabulary (no documented `--id=` form exists).
