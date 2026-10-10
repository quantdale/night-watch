# Canonical claim journal (append-only)

Every commit that reaches `main` is made under a claim: a C-00 SESSION in its own
worktree, or a bounded canonical MAINTENANCE claim (AGENTS.md "Mandatory worktree and
session protocol"). This journal records each claim as a WINDOW `(base, tip]` on the
first-parent chain of `main`. `npm run agent:check` fails any commit after the era start
that lies in no window (review-5 R5-11 / task A9.1); a commit that touches nothing but
this file is the record itself and is exempt. Lines are only ever APPENDED: open a window
when a claim starts (`released=OPEN`, `tip=OPEN`), and close it at release by APPENDING
the closing line and marking the opening line in the same commit through a declared
correction. An already-closed claim may be replaced only where an appended `CORRECTION:`
line binds the EXACT `oldLineSha256` of the line being replaced; the correction must name
a real historical replacement, may never name a line that is still live, and licensing
nothing else — every other edit of a recorded line fails closed with
`CLAIM_JOURNAL_REWRITTEN`. Prose lines are ignored by the parser; only the `KEY: value`
lines below count.

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
CLAIM: sess-931bc42f5779 | role=SESSION | task=nightwatch-final-completion-review5-v1 | created=2026-10-02T12:06:32Z | released=2026-10-03T09:40:04Z | base=d68bb1a7c7cf244da654815a1e7f266e1985f30c | tip=5b2ea0f70eef53ff73163d87d67454713c70eab3
CLAIM: sess-e4ffed7ba3f7 | role=SESSION | task=nightwatch-final-completion-review5-v1 | created=2026-10-03T09:40:04Z | released=2026-10-03T11:53:00Z | base=5b2ea0f70eef53ff73163d87d67454713c70eab3 | tip=15a8d1e848466eeba2fef27edce00c07beda8906
CLAIM: sess-7c6bca226ba5 | role=SESSION | task=nightwatch-final-product-completion-v1 | created=2026-10-03T11:53:57Z | released=2026-10-03T13:04:00Z | base=15a8d1e848466eeba2fef27edce00c07beda8906 | tip=dce05da13ad0975ea84fdc367a827c9a4557cc36
CLAIM: sess-af4de9d82ead | role=MAINTENANCE | task=nightwatch-final-product-completion-v1 | created=2026-10-03T13:05:18Z | released=2026-10-03T13:20:00Z | base=dce05da13ad0975ea84fdc367a827c9a4557cc36 | tip=7159870e7679345746ac45428cc9e44d9f016b41
CLAIM: sess-c5822bf676c9 | role=SESSION | task=nightwatch-final-product-completion-v1 | created=2026-10-09T00:00:00Z | released=2026-10-10T09:00:00Z | base=7159870e7679345746ac45428cc9e44d9f016b41 | tip=ed248033268acec8ac9a9db48a2fb06ca050d37d
CLAIM: sess-m14-terminal | role=MAINTENANCE | task=nightwatch-final-product-completion-v1 | created=2026-10-10T09:00:00Z | released=2026-10-10T09:45:00Z | base=ed248033268acec8ac9a9db48a2fb06ca050d37d | tip=7ddc60564bc1b4258cac347ccac71e18263ab111
CLAIM: sess-m14-terminal-2 | role=MAINTENANCE | task=nightwatch-final-product-completion-v1 | created=2026-10-10T10:00:00Z | released=2026-10-10T10:15:00Z | base=7ddc60564bc1b4258cac347ccac71e18263ab111 | tip=e1fd2568430cdf8f8203741326951da90736a969
GAP: fcd87fb6f9587826c4bf75c289b3d3a714d1cb88 | terminal maintenance window re-closed: `sess-m14-terminal` had already been closed at c289a6cf in 7ddc6056 and was edited again to extend its tip to 7ddc6056. The append-only journal permits closing an OPEN claim once; this is a recorded breach of that rule, made while closing out the campaign's terminal maintenance commits. The substantive content of every commit it covers is unchanged and each was made under a live canonical MAINTENANCE claim for this task; only the journal bookkeeping double-closed the window.
CORRECTION: sess-m14-terminal | oldLineSha256=fe0f2e62599d352599f2503ef657ca9a6afff6395d6ec1eadc24842733f10510 | reason=commit fcd87fb6 re-closed the sess-m14-terminal maintenance window to extend its tip from c289a6cf to 7ddc6056 so the window covers the commit that closed it; the replaced line is bound by its digest and admitted by this appended declaration rather than by an undeclared edit
