## Context

RunRecorder switches to authenticated mode when storage state is present and then sanitizes event messages/data. redactAuthenticatedUrl retains any path segment matching a lowercase route-word regex unless a small identifier heuristic fires. Lowercase mixed alphanumeric identifiers do not fire. Several recorder methods serialize values directly, and a recorder constructed unauthenticated does not harden its directory when later switched.

## Goals / Non-Goals

**Goals:** no concrete authenticated parameter identity; closed safe DTOs; total persistence choke point; safe mode transition/publication; complete writer census; categorical diagnostics; adversarial proof.

**Non-Goals:** retaining raw values in encrypted form, changing browser journeys, authorizing production, contacting DEV, or implementing now.

## Decisions

### Route identity comes from proof, not lexical appearance

An authenticated URL is reduced to origin plus an admitted route template whose literal segments and parameter positions are proven by the endpoint registry. If no exact template is available, persist only origin plus a categorical unknown-route marker. Query, fragment, userinfo, and concrete parameter values never persist.

### One typed persistence firewall owns all output

Every authenticated artifact is built from closed, bounded DTOs and passes the same final validator immediately before bytes are published. Manifest metadata, repository facts, summary notes, proxy receipts, auxiliary semantic files, and errors are in the writer census; free strings are replaced with enums/counts/proven identifiers.

### Mode is fixed before publication

Callers declare authenticated mode at construction when known. A permitted transition hardens the directory and every existing owned artifact before any new write, fails on unsafe identity/permissions, and cannot transition back. Files are published through the repository safe-publication primitive or a stronger private equivalent.

### Hardening proves totality

A syntax-aware census discovers recorder methods and direct filesystem writes reachable under authenticated run roots. Each is registered to an approved DTO/publisher profile. Unknown/stale/bypass writers fail; mutation tests remove sanitizer and template bindings to prove enforcement.

## Risks / Trade-offs

- Unknown routes lose detail, but categorical evidence is safer than retaining a guessed literal.
- Migrating manual scripts is broad; a generated census keeps completion measurable.
- Historical evidence remains historical and is never silently reclassified as compliant.

## Migration Plan

1. Inventory authenticated writers and define route/DTO/publication schemas.
2. Implement proven route reduction and a final persistence firewall.
3. Migrate all writers and harden authenticated mode construction/transitions.
4. Add adversarial/mutation tests and update readers/docs.

## Open Questions

None. Unproven route detail is discarded, not heuristically preserved.
