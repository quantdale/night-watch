# Proposal — explain positional-id flag tolerance

Teach the `explain` command's positional id to skip `--*` flag tokens
so `explain --json` (and any flag-first order) resolves the id slot
correctly instead of failing shape validation on a flag string. The
shape gate and plan-membership lookup stay exactly as strict.
