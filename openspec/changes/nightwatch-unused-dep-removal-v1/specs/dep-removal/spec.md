# Spec — unused dependency removal

## Removal must be total and verifiable

After the change, `vue` MUST appear in neither `package.json` nor
`package-lock.json`, `npm audit` MUST report zero vulnerabilities, and
a scratch `npm ci` MUST succeed. Typecheck and the offline scenario
MUST stay green, proving nothing referenced the module.
