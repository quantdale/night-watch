# Canonical claim journal (append-only)

Every commit that reaches `main` is made under a claim: a C-00 SESSION in its own
worktree, or a bounded canonical MAINTENANCE claim (AGENTS.md "Mandatory worktree and
session protocol"). This journal records each claim as a WINDOW `(base, tip]` on the
first-parent chain of `main`. `npm run agent:check` fails any commit after the era start
that lies in no window (review-5 R5-11 / task A9.1); a commit that touches nothing but
this file is the record itself and is exempt. Lines are only ever APPENDED: open a window
when a claim starts (`released=OPEN`, `tip=OPEN`), and close it at release by APPENDING
the closing line and marking the opening line in the same commit through a declared
correction. Prose lines are ignored by the parser; only the `KEY: value` lines below count.

CLAIM_JOURNAL_PROTOCOL_VERSION: nightwatch.claim-journal.v1
ERA_START_SHA: f680bc839969e6c95df50a542b5680fccc81e012

## Pre-era gaps (history, not coverage)

Canonical docs commits recorded by review-4 (R4-13) and review-5 (R5-11) as made on the
canonical checkout WITHOUT a live MAINTENANCE claim. They predate the era and are kept
here so the breach is a stated fact rather than a silent one.

GAP: a408d31bc37d6ed59ed05d005c5c97ccbe4af68b | review-4 R4-13: the corrections close-out was committed on canonical with no live MAINTENANCE claim
GAP: e97b38aaeea500ede1e9862b656b787440978c79 | review-4 R4-13: the repair-forward of a408d31b was committed on canonical with no live MAINTENANCE claim
GAP: 67eb30981b4bb4d6bb6959b9afee9345938f5750 | review-5 R5-11: the canonical-routed pause record, likely committed without a recorded claim (no journal existed to prove otherwise)
GAP: e5ec64ca827de8dae8c3384281c95de8081ba3d6 | review-5 R5-11: the review-4 close-out, likely committed on canonical without a recorded claim (and substantive under R4-13: it moved the archive with edits)
GAP: 46c8b6748fa678371e2e8a08f70ba384bcfd7d50 | review-5 R5-11: the review-4 close-out CI record, likely committed on canonical without a recorded claim

## Claim windows

CLAIM: sess-ca2d77ccd304 | role=SESSION | task=nightwatch-final-product-completion-v1 | created=UNRECORDED | released=2026-10-02T12:06:15Z | base=f680bc839969e6c95df50a542b5680fccc81e012 | tip=d68bb1a7c7cf244da654815a1e7f266e1985f30c
CLAIM: sess-931bc42f5779 | role=SESSION | task=nightwatch-final-completion-review5-v1 | created=2026-10-02T12:06:32Z | released=OPEN | base=d68bb1a7c7cf244da654815a1e7f266e1985f30c | tip=OPEN
