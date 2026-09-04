# Design — unused Vue devDependency removal

## Root cause

`vue@2.6.12` (EOL Vue 2) sits in root `devDependencies` with zero
references repo-wide. It exists only as latent advisory surface; the
module never loads, so the ReDoS is unreachable — but its presence
keeps `npm audit` non-clean.

## Change shape

`npm remove vue`: one manifest line plus the lockfile entry set. No
source, test, config, or docs changes. Verified by scratch install,
typecheck, and the offline scenario run.

## Why removal, not upgrade

Upgrading an EOL major for an unreferenced package adds review surface
for zero benefit. Removal is total and verifiable (`npm audit` clean,
`npm ci` green).
