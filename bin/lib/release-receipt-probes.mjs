// @ts-check
// G18 / G12 / G20 — the three receipt-consuming release probes.
//
// Extracted from `bin/project-state-check.mjs` (review-5 A4.1) so each can be
// driven by a test with a REAL receipt at a REAL checkpoint. A probe resolves MET
// only for a receipt whose recorded SHA is exactly the certified checkpoint S; a
// receipt bound to any other commit is NOT_AT_CHECKPOINT, and a relation that is
// rewritten to "bound" (or a receipt rebound to S in memory) fails the tests that
// feed these functions a receipt bound to ANOTHER commit.

import fs from 'node:fs';
import path from 'node:path';
import { ACCESSIBILITY_RECORD_PATH, parseAccessibilityCertificationRecord } from './accessibility-record.mjs';
import { UI_HARNESS_FILE, UI_HARNESS_RECEIPT_PATH, UI_HARNESS_TYPES_PATH, evaluateUiHarnessReceipt, extractApiErrorKinds } from './ui-harness-receipt.mjs';
import { CERTIFICATION_EVIDENCE_DIRECTORY } from './certification-subjects.mjs';
import { receiptBindingRelation, receiptNotAtCheckpoint } from './probe-binding.mjs';
import { gitReadOnly, loadTypeScriptModule, readJsonAt } from './probe-io.mjs';

const HEX40 = /^[0-9a-f]{40}$/i;
/** Bound on how many newest run directories the G12 probe inspects. */
const YIELD_RUN_SCAN_LIMIT = 50;

/**
 * G20 / R2-51 — accessibility certification record.
 * @param {string} root
 * @param {string | null} certifiedCheckpointSha
 * @returns {{state: string, detail: string}}
 */
export function probeAccessibility(root, certifiedCheckpointSha) {
  const unit = fs.existsSync(path.join(root, 'tests/unit/accessibilityAudit.test.ts'));
  const browser = fs.existsSync(path.join(root, 'tests/browser/accessibilityCertification.browser.ts'));
  if (!unit || !browser) return { state: 'UNMET', detail: `check absent: unit=${unit} browser=${browser}` };
  // G20 / R2-51 — the machine-readable certification record written by the
  // control-center browser lane. A fresh clone has no record (the lane is a
  // qualified-host browser lane), so this check honestly stays UNMET there.
  // CF-02 / design D3 (b): the record's executed SHA must equal the certified
  // checkpoint S; a record bound to any other commit is NOT_AT_CHECKPOINT.
  const record = readJsonAt(root, ACCESSIBILITY_RECORD_PATH);
  if (record === null) {
    return {
      state: 'UNMET',
      detail: `no accessibility certification record at ${ACCESSIBILITY_RECORD_PATH}; the control-center browser lane (npm run control-center:ui:browser) has not completed on this host`,
    };
  }
  const parsed = parseAccessibilityCertificationRecord(record);
  if (!parsed.ok || parsed.summary === null) {
    return { state: 'UNMET', detail: `accessibility certification record rejected: ${parsed.errors.slice(0, 3).join('; ')}` };
  }
  if (receiptBindingRelation(certifiedCheckpointSha, parsed.summary.sha) !== 'BOUND') {
    return receiptNotAtCheckpoint('the accessibility certification record', parsed.summary.sha, certifiedCheckpointSha);
  }
  return {
    state: 'MET',
    detail: `certification + keyboard sections PASS at ${parsed.summary.sha.slice(0, 8)}; ${parsed.summary.measuredFocusIndicators} focus indicators measured, minimum contrast ${parsed.summary.minimumFocusContrast.toFixed(2)}:1`,
  };
}

export /**
 * G18 — UI error taxonomy (D3 / VD-02): the F-18 differential render harness
 * drives every view through every ApiErrorKind member and requires distinct
 * renderings. This probe no longer trusts the presence of the harness file: it
 * consumes the UI-harness EXECUTION receipt the UI_GATE group's vitest
 * reporter writes (bin/lib/ui-harness-receipt.mjs), requires every harness
 * test recorded PASS from a clean tree, cross-checks the ApiErrorKind member
 * list against the one committed AT the certified checkpoint, and resolves
 * MET only when the receipt's SHA equals that checkpoint.
 * @param {string} root
 * @param {string | null} certifiedCheckpointSha
 * @returns {{state: string, detail: string}}
 */
function probeUiErrorTaxonomy(root, certifiedCheckpointSha) {
  // R5-13: the host-local receipt first; in a clean clone only the TRACKED verbatim copy of S exists.
  const trackedPath = typeof certifiedCheckpointSha === 'string' && HEX40.test(certifiedCheckpointSha)
    ? `${CERTIFICATION_EVIDENCE_DIRECTORY}/${certifiedCheckpointSha.toLowerCase()}/ui-error-taxonomy-rendering.json`
    : null;
  const raw = readJsonAt(root, UI_HARNESS_RECEIPT_PATH) ?? (trackedPath === null ? null : readJsonAt(root, trackedPath));
  if (raw === null) {
    return {
      state: 'UNMET',
      detail: `no UI-harness execution receipt at ${UI_HARNESS_RECEIPT_PATH}; the UI_GATE group (npm run gate:ui) has not executed the F-18 harness on this host`,
    };
  }
  let expectedKinds = null;
  let harnessSourceAtS = null;
  if (typeof certifiedCheckpointSha === 'string' && HEX40.test(certifiedCheckpointSha)) {
    const typesAtCheckpoint = gitReadOnly(root, ['show', `${certifiedCheckpointSha}:${UI_HARNESS_TYPES_PATH}`]);
    expectedKinds = typeof typesAtCheckpoint === 'string' ? extractApiErrorKinds(typesAtCheckpoint) : null;
    // R3-06 / corrections task 8.5: the harness source committed AT S, for the
    // digest and test-count cross-check.
    const harnessAtCheckpoint = gitReadOnly(root, ['show', `${certifiedCheckpointSha}:ui/control-center/${UI_HARNESS_FILE}`]);
    harnessSourceAtS = typeof harnessAtCheckpoint === 'string' ? harnessAtCheckpoint : null;
  }
  const evaluated = evaluateUiHarnessReceipt(raw, { certifiedCheckpointSha, expectedKinds, harnessSourceAtS });
  if (!evaluated.ok || evaluated.summary === null) {
    return { state: 'UNMET', detail: `UI-harness execution receipt rejected: ${evaluated.errors.slice(0, 3).join('; ')}` };
  }
  if (evaluated.relation !== 'BOUND') {
    return receiptNotAtCheckpoint('the UI-harness execution receipt', evaluated.summary.sha, certifiedCheckpointSha);
  }
  return {
    state: 'MET',
    detail: `F-18 harness executed at ${evaluated.summary.sha.slice(0, 8)}: ${evaluated.summary.harnessTests} harness tests PASS over ${evaluated.summary.kinds} ApiErrorKind members (suite ${evaluated.summary.totalTests} tests, 0 failed, clean tree)`,
  };
}

export /**
 * G12 — yield campaign result (D3 / VD-03 / CF-03): resolves ONLY from a
 * yield-campaign receipt — the D-7 manifest + summary + product-run receipt of
 * a run that passed, executed at a recorded clean Nightwatch commit through
 * the provider print adapter, with at least one completed provider call, an
 * unchanged sibling identity and a clean leak scan
 * (evaluateYieldCampaignEvidence). MET only when that commit is the certified
 * checkpoint. The historical W13 aggregate is context, never evidence: it is
 * not consulted here. The receipt is host-local by design (gitignored
 * artifacts/), so this check is NOT environment-independent: a fresh clone has
 * none and honestly stays UNMET.
 * @param {string} root
 * @param {string | null} certifiedCheckpointSha
 * @returns {{state: string, detail: string}}
 */
function probeYieldCampaignResult(root, certifiedCheckpointSha) {
  let receiptModule;
  try {
    receiptModule = loadTypeScriptModule(root, 'src/core/agentRuntime/productRunReceipt.ts');
  } catch {
    return { state: 'UNAVAILABLE_CAPABILITY', detail: 'product run receipt module unavailable' };
  }
  let entries;
  try {
    entries = fs.readdirSync(path.join(root, 'artifacts'));
  } catch {
    entries = [];
  }
  // R3-06 / corrections task 8.5: newest-by-TIME, not lexicographic — a run id
  // is a name, and a hand-chosen name must not outrank a newer execution.
  const runs = entries
    .filter((entry) => entry.startsWith('nightwatch-'))
    .map((entry) => {
      let mtimeMs = 0;
      try {
        mtimeMs = fs.statSync(path.join(root, 'artifacts', entry)).mtimeMs;
      } catch {
        mtimeMs = 0;
      }
      return { entry, mtimeMs };
    })
    .sort((left, right) => (right.mtimeMs - left.mtimeMs) || (left.entry < right.entry ? 1 : -1))
    .slice(0, YIELD_RUN_SCAN_LIMIT)
    .map((run) => run.entry);
  if (runs.length === 0) {
    return { state: 'UNMET', detail: 'no yield-campaign receipt: no artifacts/nightwatch-* run exists on this host (the receipt is host-local; a fresh clone has none)' };
  }
  let boundToOther = null;
  let firstRejection = null;
  for (const entry of runs) {
    const evaluated = receiptModule.evaluateYieldCampaignEvidence({
      manifest: readJsonAt(root, `artifacts/${entry}/manifest.json`),
      summary: readJsonAt(root, `artifacts/${entry}/summary.json`),
      receipt: readJsonAt(root, `artifacts/${entry}/product-run-receipt.json`),
    }, certifiedCheckpointSha);
    if (!evaluated.ok || evaluated.summary === null) {
      if (firstRejection === null) firstRejection = evaluated.errors.slice(0, 3).join('; ');
      continue;
    }
    if (evaluated.relation === 'BOUND') {
      return {
        state: 'MET',
        detail: `yield campaign ${evaluated.summary.runId} executed at ${evaluated.summary.sha.slice(0, 8)}: ${evaluated.summary.completedCalls} completed provider calls, ${evaluated.summary.reproductionCount} reproduction attempts, ${evaluated.summary.admissions} admissions, ${evaluated.summary.siblingsObserved} siblings observed, clean leak scan`,
      };
    }
    if (boundToOther === null) boundToOther = evaluated.summary.sha;
  }
  if (boundToOther !== null) return receiptNotAtCheckpoint('the newest qualifying yield-campaign receipt', boundToOther, certifiedCheckpointSha);
  return { state: 'UNMET', detail: `no qualifying yield-campaign receipt among the ${runs.length} newest runs; newest rejection: ${firstRejection ?? 'none'}` };
}
