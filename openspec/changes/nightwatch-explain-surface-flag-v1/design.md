# Design — explain-surface documented flag form

## Root cause

The command reads the surface id from the raw positional slot
(`args[1]`), so any conventional flag order (`--repo=` first, as the
README itself shows) feeds a flag string into the id shape gate and
produces a misleading `EXPLAIN_SURFACE_ID_UNSAFE` refusal for proven
ids. Verified live against a real discovered surface id.

## Change shape

`const requestedSurface = explicitFlag || args[1]`, where the explicit
flag is `--surface=<id>` (first occurrence wins; empty falls back to
positional). The existing shape regex then applies unchanged, and
`explainSourceSurface` enforces vocabulary membership downstream as
before. Focused CLI tests spawn the real binary: flag form green,
positional form green, malformed still refused — with surface ids
discovered live from `surfaces`, never hardcoded.

## Why code, not README

The flag form is order-independent and already documented; positional
is order-fragile. Fixing the code honors the documented contract and
removes the trap for both orders.
