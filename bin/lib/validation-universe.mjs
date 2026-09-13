#!/usr/bin/env node
// @ts-check

// NW-08 — the validation universe: pure discovery/classification judgement.
//
// The gate had no mechanical relationship to the set of tests that EXIST. Its
// required lanes select from versioned manifests, and the data-only inventory
// validated those declarations against each other — never against what was
// discovered on disk. Measured at this campaign: 341 tracked root
// test/smoke files, 227 selected by required lanes, 114 in no lane at all,
// including safety-relevant suites. A newly added test therefore joined the
// repository silently, and every gate stayed green without it.
//
// So every discovered executable test or check must belong to exactly ONE
// class: either the authoritative gate selects it, or a declaration names it
// with a reason and the evidence lane that DOES cover it. "Covered by a
// different lane" is a legitimate answer; "covered by nothing, and nobody
// noticed" is the defect.
//
// Pure: the caller supplies the discovered sets, the gate selection, and the
// declaration. No filesystem, no Git, no clock.

import crypto from 'node:crypto';

export const VALIDATION_UNIVERSE_SCHEMA = 'nightwatch.validation-universe.v1';

/**
 * The closed vocabulary of exclusion classes. `AUTHORITATIVE_GATE` is not
 * declarable: it is DERIVED from what the required lanes actually select, so
 * no declaration can claim gate coverage a lane does not provide.
 */
export const VALIDATION_EXCLUSION_CLASSES = Object.freeze([
  'FULL_REGRESSION',
  'LOCAL_FIXTURE_SMOKE',
  'LIVE_APP_SMOKE',
  'BROWSER_WORKFLOW',
  'MANUAL_OWNER',
  'HOST_QUALIFIED',
  'UI_LANE',
  'BIN_SYNTAX',
]);

const CLASS_SET = new Set(VALIDATION_EXCLUSION_CLASSES);

function canonical(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value ?? null);
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
}

function sorted(values) {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

/**
 * The digest over the whole judgement: what exists, what the gate selects,
 * and how the remainder is classified. Any of the three changing changes the
 * digest, which is what makes a silent addition impossible.
 */
export function validationUniverseDigest({ discovered, gateSelected, byClass }) {
  const payload = {
    schemaVersion: VALIDATION_UNIVERSE_SCHEMA,
    discovered: sorted(discovered),
    gateSelected: sorted(gateSelected),
    byClass: Object.fromEntries(Object.keys(byClass).sort().map((key) => [key, sorted(byClass[key])])),
  };
  return `sha256:${crypto.createHash('sha256').update(canonical(payload), 'utf8').digest('hex').slice(0, 24)}`;
}

/**
 * @param {{
 *   discovered: readonly string[],
 *   gateSelected: readonly string[],
 *   declaration: { readonly schemaVersion?: string, readonly inventoryDigest?: string, readonly classes?: Record<string, { reason?: string, evidenceLane?: string, files?: readonly string[] }> },
 * }} input
 */
export function classifyValidationUniverse(input) {
  const errors = [];
  const discovered = sorted(input.discovered ?? []);
  const gateSelected = sorted(input.gateSelected ?? []);
  const declaration = input.declaration ?? {};
  const classes = declaration.classes ?? {};

  if (declaration.schemaVersion !== VALIDATION_UNIVERSE_SCHEMA) {
    errors.push({ code: 'VALIDATION_UNIVERSE_SCHEMA_UNSUPPORTED', detail: String(declaration.schemaVersion ?? 'ABSENT') });
  }

  const discoveredSet = new Set(discovered);
  const gateSet = new Set(gateSelected);

  // A lane that selects a file which does not exist is a stale manifest, and
  // it would otherwise present as a passing lane that ran nothing.
  for (const file of gateSelected) {
    if (!discoveredSet.has(file)) {
      errors.push({ code: 'VALIDATION_UNIVERSE_GATE_SELECTS_MISSING_FILE', detail: file });
    }
  }

  /** @type {Record<string, string[]>} */
  const byClass = {};
  /** @type {Map<string, string>} */
  const owner = new Map();
  for (const name of Object.keys(classes).sort()) {
    if (!CLASS_SET.has(name)) {
      errors.push({ code: 'VALIDATION_UNIVERSE_CLASS_UNKNOWN', detail: name });
      continue;
    }
    const entry = classes[name] ?? {};
    const files = sorted(Array.isArray(entry.files) ? entry.files : []);
    byClass[name] = files;
    if (typeof entry.reason !== 'string' || entry.reason.trim().length < 12) {
      errors.push({ code: 'VALIDATION_UNIVERSE_REASON_MISSING', detail: name });
    }
    if (typeof entry.evidenceLane !== 'string' || entry.evidenceLane.trim().length === 0) {
      errors.push({ code: 'VALIDATION_UNIVERSE_EVIDENCE_LANE_MISSING', detail: name });
    }
    // A class declared with no members is a class that exists only on paper.
    if (files.length === 0) {
      errors.push({ code: 'VALIDATION_UNIVERSE_ZERO_MEMBER_CLASS', detail: name });
    }
    for (const file of files) {
      const previous = owner.get(file);
      if (previous !== undefined) {
        errors.push({ code: 'VALIDATION_UNIVERSE_DOUBLE_CLASSIFIED', detail: `${file}: ${previous} and ${name}` });
        continue;
      }
      owner.set(file, name);
      if (!discoveredSet.has(file)) {
        errors.push({ code: 'VALIDATION_UNIVERSE_DECLARED_MISSING_FILE', detail: file });
      }
      if (gateSet.has(file)) {
        // Declaring an excluded class for a file the gate DOES run is a
        // contradiction: the reader would believe the wrong lane covers it.
        errors.push({ code: 'VALIDATION_UNIVERSE_GATE_CONTRADICTION', detail: `${file} declared ${name} but a required lane selects it` });
      }
    }
  }

  const unclassified = discovered.filter((file) => !gateSet.has(file) && !owner.has(file));
  for (const file of unclassified) {
    errors.push({ code: 'VALIDATION_UNIVERSE_UNCLASSIFIED', detail: file });
  }

  const digest = validationUniverseDigest({ discovered, gateSelected, byClass });
  if (typeof declaration.inventoryDigest === 'string' && declaration.inventoryDigest !== digest) {
    errors.push({
      code: 'VALIDATION_UNIVERSE_DIGEST_DRIFT',
      detail: `declared ${declaration.inventoryDigest} but the discovered universe is ${digest}`,
    });
  } else if (typeof declaration.inventoryDigest !== 'string') {
    errors.push({ code: 'VALIDATION_UNIVERSE_DIGEST_ABSENT', detail: digest });
  }

  const counts = {
    discovered: discovered.length,
    authoritativeGate: gateSelected.length,
    classified: owner.size,
    unclassified: unclassified.length,
    byClass: Object.fromEntries(Object.keys(byClass).sort().map((key) => [key, byClass[key].length])),
  };

  return Object.freeze({
    ok: errors.length === 0,
    schemaVersion: VALIDATION_UNIVERSE_SCHEMA,
    digest,
    counts,
    byClass,
    unclassified,
    errors: Object.freeze(errors),
  });
}
