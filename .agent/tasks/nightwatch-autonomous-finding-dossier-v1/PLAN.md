# Lane G PLAN

1. `src/core/autonomousFinding/types.ts` — draft input type, re-export protocol
   dossier/authority types. No handoff-cone import (AH-1 boundary).
2. `src/core/autonomousFinding/dossier.ts` — `buildAutonomousFindingDossier`
   fail-closed pure builder; authority pinned to the constant reference.
3. `src/core/autonomousFinding/projection.ts` — structural handoff projection:
   exact authority literals, UNKNOWN recommendations with basis+provenance,
   fact passthrough. No organizational severity mapping.
4. `src/core/autonomousFinding/index.ts` — barrel.
5. `tests/unit/autonomousFinding.test.ts` — authority literals, S1–S4 vocab,
   evidence fail-closed, no-submission-surface grep, projection assignability
   to `AlphausFindingHandoff` types, PROHIBITED preserved.
6. Typecheck + focused test + REPORT.md + commit on session branch.
