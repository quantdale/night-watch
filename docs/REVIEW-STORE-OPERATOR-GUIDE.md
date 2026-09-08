# Review store — operator guide

The owner-local review store keeps every local review decision you have ever
made, including the ones that no longer apply. It is never pruned
automatically, because a review that no longer binds is still the evidence of
what you looked at and concluded at the time.

This guide is about seeing what is in it. Nothing here can change it.

## Where it is

```
default   $HOME/.nightwatch/reviews
override  $NIGHTWATCH_REVIEW_STORE_DIR
```

Outside the repository, owner-only `0700`, never committed.

## The command

```
npm run review -- inventory              # what is in the store
npm run review -- history <finding-id>   # every generation for one finding
npm run review -- inspect <finding-id>   # the current state for one finding
npm run review -- filing <finding-id>    # the private filing report
```

Add `--json` for machine-readable output, `--shallow` to classify the store by
name without opening anything, and `--limit=<n>` / `--offset=<n>` to page.
Rows are always bounded; the counts are always global and exact.

Exit codes:

| code | meaning |
| --- | --- |
| 0 | the read succeeded — including a store full of stale history |
| 1 | usage error |
| 2 | the store is not present or not readable |
| 3 | at least one stored review did not survive validation |
| 4 | the finding is not in the current findings snapshot |
| 5 | internal failure |

Stale history exits 0 deliberately. It is the store working as designed, and
an exit code that called it a failure would train you to ignore the one that
means corruption.

## Reading the health line

```
STATUS REVIEW_STORE_HAS_CORRUPTION
conditions        CORRUPTION_PRESENT, UNKNOWN_FILES_PRESENT, STALE_HISTORY_PRESENT
```

`conditions` lists every condition that holds. `STATUS` names the most severe.
The order, most severe first:

| condition | what it means | what to do |
| --- | --- | --- |
| `STORE_UNAVAILABLE` | the store could not be read | check the path and permissions; no claim is made about contents |
| `CORRUPTION_PRESENT` | a stored review failed validation | investigate; nothing deletes it for you |
| `UNKNOWN_FILES_PRESENT` | a file Nightwatch did not write is present | look at it yourself; nothing here opens or removes it |
| `TEMPORARY_RESIDUE_PRESENT` | an interrupted publish left a temporary | recovery is a separate, explicit action |
| `STALE_HISTORY_PRESENT` | reviews exist that no longer bind | nothing — this is normal |
| `HEALTHY` | none of the above | nothing |

## Current, stale, and unknown

Three different answers, and the difference matters:

- **CURRENT** — the stored decision still binds to the artifacts that exist
  now. This is a live decision.
- **STALE** — the decision exists and the artifacts have moved on. It is
  history: real evidence of a real review of a different generation. It is
  never presented as the current decision.
- **UNKNOWN** — currentness could not be established, either because no
  current artifacts were supplied (the CLI has no findings snapshot by
  default, and says `currentness NOT RESOLVED`) or because the finding is not
  in the current snapshot at all.

"Nothing is current" and "nobody asked" are different facts, and the output
distinguishes them.

## Unrecognized files

If something you did not expect is in the store directory, the inventory
counts it and reports a digest of its name, never the name:

```
unknown entries (1 total, showing 1)
  names are reported as digests: an unrecognized name is not a string Nightwatch chose
  UNKNOWN    3f9a1c7e5b2d84061af3c9d2  512 B
```

The file is not opened, not parsed, and not removed. If you want to know what
it is, look at it yourself — that is a decision for a person, not for a
read-only report.

## In the browser

The Control Center's **Review Store** view (`#review-store`) shows the same
inventory, and drills into a finding's generation history. Current and
historical generations are labelled in words — `CURRENT REVIEW` /
`HISTORICAL REVIEW` — not by colour, so the distinction survives monochrome, a
screen reader and a copied-out payload.

From a history you can render the private filing report for that finding.
Nothing submits it anywhere; you copy it.

## What this will never do

No automatic deletion, retention, archival or pruning exists. There is no
`--prune`, no cleanup route, and no scheduled job. If the store's growth ever
becomes a problem, `docs/DECISIONS.md` D-132 records the measured cost of each
option; choosing one is an owner decision that requires separate
authorization.

Growth, measured on one machine: about 1.7 KB per review, so 79 MiB at 50,000
reviews. A shallow inventory of a 50,000-review store takes about 160 ms; a
full one, which opens and validates every artifact, about 2.2 s.
