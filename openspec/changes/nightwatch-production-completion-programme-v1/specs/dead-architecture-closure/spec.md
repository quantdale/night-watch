# Spec — Dead architecture closure

Closes F-13 and F-14. Measured at `36bd493` by a static import graph over 1,088
files, corrected for the dynamic `bin` → `src` loader:
`src/core/dtoFramework/` (4 files, 519 lines, 18 exports) and
`src/core/adversarialCorpus/` (2 files, 385 lines, 12 exports) have zero
references to any export anywhere in `src`, `tests`, `bin` or `ui`. Eleven
`index.ts` barrels have zero importers.

## ADDED Requirements

### Requirement: An unreferenced source module SHALL be detected, not merely absent from the test universe

R-12 established a totality rule over tests: the gate runs only declared and
manifest-listed suites, and an unclassified test fails `hardening:check`. There
is no corresponding rule over source, so an entire subsystem can typecheck,
ship and be referenced by nothing without any check noticing. Two subsystems
reached that state.

A structural rule SHALL build the reference graph across `src`, `tests`, `bin`,
`ui` and `scenarios`, and SHALL fail when a tracked source module has no
reference to any of its exports outside its own directory. The graph SHALL
resolve three edge kinds, because omitting any one produces false positives
that would force the rule to be disabled:

1. static `import`/`export … from` and `require`;
2. the dynamic `loadTypeScriptModule` / `loadTypeScriptModules` string-literal
   paths in `bin/*.mjs` (F-15) — omitting these wrongly marks the entire
   Control Center server, the self-dev sandbox planner and executor, and most
   of `src/core` as unreachable;
3. `require.resolve` specifiers, which are invisible to import scanners and
   already caused a real break (DEF-FC-03, the Vue fixture).

A module intended to exist without a consumer — a declared future extension
point, a corpus, a type-only surface — SHALL appear in an explicit
reasoned-retention list. The list SHALL fail in both directions: a listed
module that gains a consumer is stale and fails, and an unlisted module with no
consumer fails.

The rule SHALL assert a non-zero graph edge count before evaluating
reachability, so a resolver that silently stops finding edges fails loudly
rather than passing vacuously.

#### Scenario: an unreferenced subsystem fails the check
- **WHEN** a tracked source module's exports are referenced nowhere outside its
  own directory and it is not listed
- **THEN** `hardening:check` fails naming the module and its export count

#### Scenario: dynamically loaded modules are not false positives
- **WHEN** a module is reached only through a `loadTypeScriptModule` string
  path in a bin
- **THEN** the graph records the edge and the module is reachable

#### Scenario: a `require.resolve` consumer counts as a consumer
- **WHEN** a dependency or module is reached only via `require.resolve`
- **THEN** the graph records the edge

#### Scenario: the retention list is honest in both directions
- **WHEN** a listed module gains a real consumer
- **THEN** the check fails as stale and the listing must be removed

#### Scenario: the rule is non-vacuous
- **WHEN** edge resolution yields zero edges
- **THEN** the check fails before evaluating any module

### Requirement: `dtoFramework` SHALL be adopted as the schema-version authority or removed, and the choice SHALL be recorded

`src/core/dtoFramework/` is not incidental dead code. `registerDtoKind`,
`validateVersionedDto`, `getReadableDtoVersions`, `DtoVersionValidator`,
`DtoCoherenceRule` and `DtoCoherenceViolation` are a versioned-DTO registry with
per-version validators and cross-field coherence rules, with built-in
registrations already written for the semantic evaluation receipt, the triage
replay plan, the campaign manifest and the campaign checkpoint. It is the
abstraction `schema-version-lifecycle` requires, built and never connected.

Exactly one of two outcomes SHALL be recorded, and the outcome SHALL be a
decision with a stated reason, not an omission.

**Adoption.** The four registered kinds migrate to the registry first, proving
the abstraction against real consumers before any expansion. Their existing
hand-rolled validation is replaced, not duplicated — two validators for one
schema is worse than one, because they can disagree.

**Removal.** The subsystem is deleted, and `schema-version-lifecycle` states
what it uses instead. Deletion SHALL be declared under `## Declared Deletions`
in the campaign's `SPEC.md`, per the workspace deletion gate.

`src/core/adversarialCorpus/` SHALL be resolved the same way: adopted by the
campaign machinery that already reports corpus sizes, or removed.

#### Scenario: adoption replaces rather than duplicates validation
- **WHEN** a schema is migrated to the registry
- **THEN** its previous hand-rolled validation is removed in the same change
- **AND** no schema has two independent validators

#### Scenario: removal is declared
- **WHEN** a subsystem is removed
- **THEN** the deletion appears under `## Declared Deletions`
- **AND** `workspace:check` passes without
  `WORKSPACE_UNDECLARED_TRACKED_DELETION`

#### Scenario: the decision is recorded either way
- **WHEN** the campaign closes
- **THEN** `docs/DECISIONS.md` records the outcome and the reason
- **AND** the subsystem is neither left dead nor silently deleted

### Requirement: A module barrier SHALL be the boundary consumers use, or SHALL NOT exist

Eleven `index.ts` files declare a public surface that no consumer imports;
`campaignIntelligence` declares 15 symbols, `selfDevSandbox` 10,
`localInvestigation` 6, and every consumer reaches past them into deep paths.
A declared boundary nobody uses cannot be narrowed, guarded or reasoned about,
and reading one gives a false picture of a module's coupling.

Each of the eleven SHALL be resolved to one of two states:

- **Enforced** — consumers are migrated to import from the barrel, and a
  structural rule forbids a deep import into that module from outside it. This
  is appropriate where a module has a genuine capability boundary that other
  rules already depend on (`src/controlCenter/`, `src/core/prodPrivacy/`-style
  cones).
- **Removed** — the barrel is deleted and deep imports remain the honest
  interface.

An `index.ts` that is neither imported nor removed SHALL fail the
unreferenced-module rule like any other dead module.

#### Scenario: an enforced barrel forbids deep imports
- **WHEN** a module's barrel is enforced and a consumer outside it imports a
  deep path
- **THEN** `hardening:check` fails naming the importer and the deep path

#### Scenario: an unenforced, unimported barrel is removed
- **WHEN** a barrel is neither enforced nor imported
- **THEN** it is deleted with the deletion declared

#### Scenario: the Control Center entry point is resolved explicitly
- **WHEN** `src/controlCenter/index.ts` is resolved
- **THEN** either `bin/nightwatch-control-center.mjs` loads through it, or it
  is removed
- **AND** the Control Center's public surface is whichever one remains
