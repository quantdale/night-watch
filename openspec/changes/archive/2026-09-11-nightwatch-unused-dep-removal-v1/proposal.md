# Proposal — unused Vue devDependency removal

Remove `vue@2.6.12` from root `devDependencies` (plus lockfile
entries). It is unreferenced anywhere in code or configs and carries
the repository's sole `npm audit` finding (GHSA-5j4c-8p2g-v4jx, LOW
ReDoS). Removal is behavior-preserving by construction.
