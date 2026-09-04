# Proposal — AH-1 Alphaus finding handoff + C-12 operator readiness

## Why

MA-8 gave Nightwatch a P1 observation authority model; C-11/C-10 gave it
request-issuance denial and a privacy firewall; the triage pipeline gives it
sanitized dossiers with human-reproduction recipes and AI-ready evidence
packages. What is missing is the last local mile in both directions:

1. **Outbound:** a Nightwatch finding cannot become an Alphaus-compatible
   human-review artifact without hand-translation. The dossier is
   Nightwatch-native; Leslie/Alphaus intake speaks severity, catch stage,
   source, team, reproduction, expected/actual, evidence. A projection-only
   handoff closes that gap without granting filing, messaging, publication,
   or scoring authority.
2. **Inbound (future C-12):** the four external prerequisites MA-8 named
   (operator subject, admitted config, C-08b facts, runner provisioning) have
   no operator-readable runbook, no configuration contract, and no local
   readiness check. The next agent would need another exploratory campaign
   merely to understand how to begin safely.

## What changes

1. `src/core/alphausHandoff/`: versioned `nightwatch.alphaus-finding-handoff.v1`
   projection from the canonical BugDossier (factual / recommendation /
   authority separation; UNKNOWN first-class; sentinel-scanned drafts;
   literal non-weakable authority block; no bounty-scoring surface).
2. `src/core/c12Readiness/`: versioned `nightwatch.c12-readiness.v1`
   local-only advisory preflight over caller-supplied descriptors (ten
   BLOCKED_* codes, all-blockers report, never consumes authorization,
   performs no I/O).
3. `bin/c12-preflight.mjs` (`npm run c12:preflight`): thin CLI compiling the
   pure cone fresh per run; prints only the report; exit 0/2/1.
4. `docs/C12-OPERATOR-RUNBOOK.md`: ten-row prerequisite ledger, operator
   checklist template with placeholders only, teardown procedure.
5. `docs/ALPHAUS-FINDING-HANDOFF-CONTEXT.md`: Slack-derived operational
   evidence with provenance classes, uncertainties preserved, binding
   architectural consequences.
6. Registration: AH-1 certification entry, synthetic-lane suites, and
   `checkAlphausHandoffBoundary` cone isolation (defined and invoked).
7. Matrices: 37-case handoff, 28-case preflight (incl. CLI operability),
   7 seeded property suites; 16/16 mutation probes detected, 0 survivors.

## What explicitly does not change

No production/DEV/NEXT contact; no C-12/C-13/C-14 execution; no Slack,
Leslie, Pondr, or external-publication writes; no credential handling; no
bounty scoring; no team/code-owner inference; no duplicate/genuine
organizational verdicts; no sibling-repository writes. MA-8, C-11, C-10,
and the triage pipeline are consumed, never modified.
