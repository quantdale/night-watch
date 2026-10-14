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
CLAIM: sess-9d4e2b7c1f08 | role=MAINTENANCE | task=nightwatch-final-product-completion-v1 | created=2026-10-12T05:00:00Z | released=2026-10-12T06:00:00Z | base=b09263aa6d7efef04a2e02e80c6c8f8d209cd1bd | tip=30674e8dc1ca182bc44070062dba0ad847246373
CLAIM: sess-6153b87e222c | role=MAINTENANCE | task=nightwatch-final-product-completion-v1 | created=2026-10-12T07:00:00Z | released=2026-10-12T10:00:00Z | base=d1def96aa1088e6661a9a9821f76e4083ea29638 | tip=e2fb65ee26546e460cbdf247660ac9722b0ed469
CLAIM: sess-530d1080a1b2 | role=MAINTENANCE | task=nightwatch-final-product-completion-v1 | created=2026-10-12T10:30:00Z | released=2026-10-12T11:00:00Z | base=06dec870207f360ef562950cc17d113ac02be5ae | tip=5dc6fbb3abecfd7e1a44160dc9f2008ad80a70ce
CLAIM: sess-7b3e9a1c5d42 | role=MAINTENANCE | task=nightwatch-final-product-completion-v1 | created=2026-10-12T11:30:00Z | released=2026-10-12T11:35:00Z | base=6c5f908401379e7571a6444bda40a09385147dec | tip=2714b221cf98f1e7e9e629c06265fc391fa34d9c
CLAIM: sess-fb2a84aa9cd2 | role=MAINTENANCE | task=nightwatch-final-product-completion-v1 | created=2026-10-12T12:00:00Z | released=2026-10-12T12:05:00Z | base=9bd1360a2a3770e8c0521450a3f48874cd71a31d | tip=db5d0ecb04570f9864374ae41a70e7251cd9c350
CLAIM: sess-4d1c8b0e5f73 | role=MAINTENANCE | task=nightwatch-final-product-completion-v1 | created=2026-10-12T12:30:00Z | released=2026-10-12T12:45:00Z | base=4afb59463fff6f45962b75674ab39f6313faca49 | tip=3043bcbd8d8198041bbd2fbc8c555fb746bcee02
CLAIM: sess-0f4a2b6c8d13 | role=MAINTENANCE | task=nightwatch-final-product-completion-v1 | created=2026-10-12T13:15:00Z | released=2026-10-12T13:40:00Z | base=4a56bf2571ad579476e7b7ae692471db8d3e76cc | tip=dabce2f346da616ec8df9c01a2578e900115e69e
CLAIM: sess-1b95df6dcaeb | role=MAINTENANCE | task=nightwatch-final-product-completion-v1 | created=2026-10-13T00:00:00Z | released=2026-10-13T03:49:04Z | base=45b46de12764e0c437a6115a2f13651778c4e4ae | tip=9fe141c726928469344d4e3b126ea898a8f4a52d
CLAIM: sess-59eec16b2c79 | role=SESSION | task=nightwatch-final-product-completion-v1 | created=2026-10-13T03:47:41.673Z | released=2026-10-13T10:21:45Z | base=9fe141c726928469344d4e3b126ea898a8f4a52d | tip=efbb277348a3d756036b2568ca02bb45a5a2018f
CLAIM: sess-f581bf676713 | role=MAINTENANCE | task=nightwatch-final-product-completion-v1 | created=2026-10-13T10:21:54.701Z | released=2026-10-13T12:31:44.293Z | base=efbb277348a3d756036b2568ca02bb45a5a2018f | tip=56c681aaabcc95f4b50e3c093e5e7b47469e7857

The preceding maintenance ownership ended by explicit stale-claim adoption;
the known tip above contains its two documentary commits. The successor kept
the original substantive base through C-00. The journal window begins at the
known adoption tip, so the two historical commit windows do not overlap.

CLAIM: sess-af150610aa5f | role=MAINTENANCE | task=nightwatch-final-product-completion-v1 | created=2026-10-13T12:31:44.293Z | released=2026-10-13T19:14:02Z | base=56c681aaabcc95f4b50e3c093e5e7b47469e7857 | tip=556b764e1d96d43f9243fb7ab0371a6a6df447eb

That maintenance window is closed at its last commit; the successor is a
SESSION claim opened at the same tip, so the two windows are adjacent and
do not overlap. The successor exists because the probe-fixture repair it
carries is a substantive config change, which the canonical MAINTENANCE
role may not author.

CLAIM: sess-b273f0dab1b4 | role=SESSION | task=nightwatch-final-product-completion-v1 | created=2026-10-13T19:14:02Z | released=2026-10-13T22:35:15Z | base=556b764e1d96d43f9243fb7ab0371a6a6df447eb | tip=05e5a7aee9469dcd8be733e1c68aab1334fcbac0


The implementation session is closed at its last commit. The successor is the
canonical MAINTENANCE window that carries the documentary close-out and stands
open for the campaign while the two owner gates remain.

CLAIM: sess-79cd00033cd8 | role=MAINTENANCE | task=nightwatch-final-product-completion-v1 | created=2026-10-13T22:35:15Z | released=2026-10-14T05:02:59Z | base=05e5a7aee9469dcd8be733e1c68aab1334fcbac0 | tip=4b400935c138cc74cf08608adf65233a370a3db6


The canonical documentary window is closed at its last commit. The successor is
the implementation session that applies the owner 2026-10-14 manual-validation
disposition, which is a substantive lane-state change.

CLAIM: sess-6e666451e658 | role=SESSION | task=nightwatch-final-product-completion-v1 | created=2026-10-14T05:02:59Z | released=OPEN | base=4b400935c138cc74cf08608adf65233a370a3db6 | tip=OPEN
