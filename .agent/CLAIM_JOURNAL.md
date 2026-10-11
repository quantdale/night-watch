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
CLAIM: sess-1723c1737b03 | role=SESSION | task=nightwatch-final-product-completion-v1 | created=2026-10-10T12:00:00Z | released=2026-10-10T12:30:00Z | base=e582c8c303651df2149734affef6fc3246696b27 | tip=5f44a2e15d707f90d8349f6c9f61ed4660daff90
CLAIM: sess-e94ddce3849b | role=SESSION | task=nightwatch-final-product-completion-v1 | created=2026-10-10T13:40:00Z | released=2026-10-10T16:05:00Z | base=effc2baacce221aa8668147becef2fa7aa142aaf | tip=3ff77954d613ce17e907d55e3a51e05efa5d90e8
CLAIM: sess-83e1c26c95bc | role=SESSION | task=nightwatch-final-product-completion-v1 | created=2026-10-10T16:20:00Z | released=2026-10-10T18:05:00Z | base=ddb80be46400e3f7199189862cea0aff987dede1 | tip=a91510c5973ee4bd90fd7d03316cc718c6af81f2
CLAIM: sess-2a502638313d | role=MAINTENANCE | task=nightwatch-final-product-completion-v1 | created=2026-10-10T18:30:00Z | released=2026-10-10T19:00:00Z | base=a91510c5973ee4bd90fd7d03316cc718c6af81f2 | tip=6fd42bb92b6f64922b2ba4438a8127a5b173113b
CLAIM: sess-02c23447594b | role=MAINTENANCE | task=nightwatch-final-product-completion-v1 | created=2026-10-10T19:00:00Z | released=2026-10-10T19:15:00Z | base=6fd42bb92b6f64922b2ba4438a8127a5b173113b | tip=5ff2b83270bb67f228da338da657e17ccf147109
CLAIM: sess-6838317eb211 | role=MAINTENANCE | task=nightwatch-final-product-completion-v1 | created=2026-10-10T19:40:00Z | released=2026-10-10T19:55:00Z | base=d082c8d85c5554cda4e9b6b6d5b6dae8ab606fba | tip=d615e9ad59b7a88c09b81569e0b990f0ee4d1597
CLAIM: sess-6ed4dd05a7e9 | role=MAINTENANCE | task=nightwatch-final-product-completion-v1 | created=2026-10-10T19:55:00Z | released=2026-10-10T20:00:00Z | base=d615e9ad59b7a88c09b81569e0b990f0ee4d1597 | tip=313a5a2926a7207e250fa97ca1173b41cae86df7
CLAIM: sess-4eef95e347cc | role=SESSION | task=nightwatch-final-product-completion-v1 | created=2026-10-11T02:00:00Z | released=2026-10-11T07:10:00Z | base=0d062a7bf2e69c152a558a0347efc9a8b8c164a8 | tip=0b4f2cdbd5376afea6dbc72032f88e32cc59534f
CLAIM: sess-72156c4e08c7 | role=MAINTENANCE | task=nightwatch-final-product-completion-v1 | created=2026-10-11T07:10:00Z | released=2026-10-11T23:00:00Z | base=0b4f2cdbd5376afea6dbc72032f88e32cc59534f | tip=7d1d70ded672c8ce886a1e2a1981d06488e1dfeb
CLAIM: sess-0d1b47b2a9f3 | role=MAINTENANCE | task=nightwatch-final-product-completion-v1 | created=2026-10-11T14:00:00Z | released=2026-10-11T14:05:00Z | base=8c5bd86d3ed39a8633e42b7d28996c035832de91 | tip=dbe3349e08be58c8dbf4c2d3ac4eb7cd2ad9b7b4
CLAIM: sess-6a5c1d0f7b21 | role=MAINTENANCE | task=nightwatch-final-product-completion-v1 | created=2026-10-12T00:10:00Z | released=2026-10-12T02:00:00Z | base=dbe3349e08be58c8dbf4c2d3ac4eb7cd2ad9b7b4 | tip=42fbe25410afc1790b14192a3fcbb1ac2ee8fbf7
CLAIM: sess-3f7a1c9d2e40 | role=MAINTENANCE | task=nightwatch-final-product-completion-v1 | created=2026-10-12T03:00:00Z | released=2026-10-12T04:00:00Z | base=d4f02b8db3d9eb1bce02ce9d02247bde7a6cb216 | tip=c0da74d70146efc66edbe19463134cf451602829
CLAIM: sess-9d4e2b7c1f08 | role=MAINTENANCE | task=nightwatch-final-product-completion-v1 | created=2026-10-12T05:00:00Z | released=OPEN | base=b09263aa6d7efef04a2e02e80c6c8f8d209cd1bd | tip=OPEN
