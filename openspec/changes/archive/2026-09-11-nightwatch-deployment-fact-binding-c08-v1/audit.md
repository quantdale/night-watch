# Audit — C-08

Read-only at `43cff07af2fe2c943ca62154ad01f185602a41d9`. No sibling repository
was written to, no cluster or cloud API was contacted, and no credential was
read.

## Population

1,851 operations: `alphauslabs/blueapi` 1,181, `mobingilabs/ouchan` 341,
`mobingilabs/ripple-api` 223, `mobingilabs/wave-api` 55,
`alphauslabs/blueinternal` 51. `ouchan/services/` holds 131 service
directories.

## Existing vocabulary, reused rather than duplicated

C-15b already defines, in `src/core/systemMap/model.ts`:

- `FACT_CATEGORIES` = `SOURCE_FACT`, `DEPLOYMENT_FACT`, `RUNTIME_FACT`,
  `OBSERVATION`, `INFERENCE`
- a strength ordering `SOURCE_FACT: 5 … INFERENCE: 1` used so that a join is
  never stronger than its weakest input

C-08 consumes both. Inventing a parallel deployment vocabulary would create the
second-authority problem C-05 spent a campaign removing.

## Availability of the mochi manifests — NEGATIVE, four ways

| Check | Result |
|---|---|
| repository named `mochi` at depth ≤ 2 | none |
| `ingress.yaml` anywhere under the sibling root | none |
| `appproxy` or `serviceproxy` directory | none |
| `remote.origin.url` mentioning mochi across ~160 repositories | none |

The two matching paths are `alphauslabs/blueinternal/mochi/v1` and
`alphauslabs/blue-internal-go/mochi/v1`, each a protobuf/API subdirectory for a
SERVICE named mochi. Neither is `services/{env}/{appproxy,serviceproxy}/`.

Conclusion: `C08B_BLOCKED_BY_ORGANIZATIONAL_ACCESS`. Per §76 no further effort
is spent seeking access.

## Local deployment evidence, and its exact strength

### `mobingilabs/ouchan/build/config.yaml` — deployment configuration

Declares services EXCLUDED from the build, per branch, over the branch set
`qa` / `next` / `production`, with `build_all: false` and the comment "default
is to build modified services only". Exclusion patterns are literal names or
`re:` / `!re:` regular expressions.

Strength: an exclusion on branch `production` proves the service is not built
or deployed to production FROM THIS REPOSITORY AT THIS REVISION. That is a
genuine `DEPLOYMENT_FACT`, and it is NEGATIVE. Non-exclusion proves eligibility
to be built, which is not deployment, so the positive direction is UNKNOWN.

### `mobingilabs/ripple-ui/src/config/common.js` — the host matrix

8,989 bytes. Maps route prefixes to hosts per environment:

| Route prefix | prod | next | dev |
|---|---|---|---|
| `/m/${APP_PATH}` (ripple) | `api.alphaus.cloud` | `apinext.alphaus.cloud` | `apidev.alphaus.cloud` |
| `/m/blue/` | `api.alphaus.cloud` | `apinext.alphaus.cloud` | `apidev.alphaus.cloud` |

Strength: SOURCE_FACT. This is committed CLIENT configuration — what the
frontend calls. What the infrastructure serves is a different proposition, and
asserting the latter from the former is the §34 error. It is admitted as a
route → host binding of category `SOURCE_FACT`, and the host → service hop
stays UNKNOWN.

### `ouchan/kubeconf-dev.yaml` — present, deliberately unused

Only its top-level key shape was observed (`clusters`, `contexts`,
`current-context`, `kind`, `preferences`, `users`); no value was read. Reading
a cluster is forbidden by the owner scope freeze and by C-08's own boundary.

## The chain, and where it breaks

```
route  ──SOURCE_FACT──▶  host  ──UNKNOWN (U-1)──▶  k8s service  ──UNKNOWN (U-2)──▶  deployed?
```

Hop one is establishable from committed source. Hops two and three both need
the unavailable manifests. This is why the binding is modelled as a chain: the
campaign's real product is naming the break, not producing a verdict.

## U-2, partially informed and still unknown

| Service | Present in `ouchan/services/` |
|---|---|
| `rbac` | yes |
| `user` | yes |
| `openid-connect-server` | yes |
| `gateway` | **no** |
| `safe-box` | **no** |

Source presence settles nothing about deployment. Source ABSENCE constrains
without settling: an absent service cannot be deployed from this revision, but
could still be running from an older image. U-2 therefore stays UNKNOWN with
that observation recorded beside it, labelled `SOURCE_FACT`.
