// ---------------------------------------------------------------------------
// Nightwatch C-10.5 (A13) — persisted-POSITION inventory.
//
// DEF-C10-5 exposed a METHODOLOGICAL defect, not merely a missing test. The
// C-10 privacy corpus enumerated sensitive VALUE CLASSES — account ids, MSP
// ids, invoice numbers, monetary amounts, free text — and proved that no
// sentinel of each class could reach persisted evidence. It was complete
// against its own model, and it still missed a live leak, because
// `routeTemplate` was a free-form string POSITION in the persisted DTO that
// no sentinel ever occupied. A corpus organised by value class cannot see an
// unlisted position.
//
// So coverage is driven from a FIELD INVENTORY instead. Every persisted field
// capable of carrying a string or bytes is declared here with an explicit
// disposition, and the privacy suite cross-checks this inventory against the
// DTO's actual closed field vocabularies. Adding a new string-capable
// persisted field without declaring a disposition FAILS the suite — the
// failure arrives from the inventory diff rather than from someone
// remembering to write a test.
//
// This module is part of the PURE cone: it is data only, no fs, no net, no
// process.
// ---------------------------------------------------------------------------

/**
 * How a persisted string-capable position is proven safe. There is
 * deliberately no `REVIEWED` or `ASSUMED_SAFE` member.
 */
export const PERSISTED_FIELD_DISPOSITIONS = [
  /** The field's domain is a finite closed enum defined in this cone. */
  'CLOSED_VOCABULARY',
  /** The value must be a member of a mechanically source-proven vocabulary. */
  'SOURCE_PROVEN',
  /** The value is a digest DERIVED by trusted code, never caller text. */
  'DERIVED_DIGEST',
  /** Structural recursion into nodes that are themselves inventoried. */
  'STRUCTURAL_RECURSION',
  /**
   * No structural guarantee constrains the position, so a hostile sentinel is
   * planted in this exact field and proven incapable of persisting.
   */
  'SENTINEL_PROVEN',
] as const;
export type PersistedFieldDisposition = (typeof PERSISTED_FIELD_DISPOSITIONS)[number];

export interface PersistedFieldRecord {
  /** Where the field lives: the persisted DTO root, or a persisted node. */
  readonly owner: 'EVIDENCE_ROOT' | 'EVIDENCE_NODE' | 'PROVEN_FIELD';
  readonly field: string;
  /** Can this position hold a string or bytes at all? */
  readonly stringCapable: boolean;
  readonly disposition: PersistedFieldDisposition;
  /** Why that disposition is sufficient for this position. */
  readonly rationale: string;
}

/**
 * The inventory. `stringCapable: false` positions are recorded too, so the
 * cross-check can prove the inventory is TOTAL over the DTO rather than
 * merely covering the fields someone happened to list.
 */
export const PERSISTED_FIELD_INVENTORY: readonly PersistedFieldRecord[] = Object.freeze([
  // ---- SafeProductionEvidence root -------------------------------------
  {
    owner: 'EVIDENCE_ROOT',
    field: 'boundaryClass',
    stringCapable: true,
    disposition: 'CLOSED_VOCABULARY',
    rationale: 'Single literal SAFE_PRODUCTION_EVIDENCE; the firewall rejects any other value.',
  },
  {
    owner: 'EVIDENCE_ROOT',
    field: 'schemaVersion',
    stringCapable: true,
    disposition: 'CLOSED_VOCABULARY',
    rationale: 'Single versioned literal; an unknown version is UNKNOWN_SCHEMA_VERSION.',
  },
  {
    owner: 'EVIDENCE_ROOT',
    field: 'routeTemplate',
    stringCapable: true,
    disposition: 'SOURCE_PROVEN',
    rationale:
      'THE DEF-C10-5 POSITION. Free-form by shape, so membership of a source-proven '
      + 'route vocabulary is the only admission, re-checked at the durable write. '
      + 'ROUTE_TEMPLATE_RE is a precondition on vocabulary contents, never the authority.',
  },
  {
    owner: 'EVIDENCE_ROOT',
    field: 'statusClass',
    stringCapable: true,
    disposition: 'CLOSED_VOCABULARY',
    rationale: 'PRODUCTION_STATUS_CLASSES: status CLASS only, never a body or header.',
  },
  {
    owner: 'EVIDENCE_ROOT',
    field: 'keyProvenance',
    stringCapable: true,
    disposition: 'CLOSED_VOCABULARY',
    rationale: 'KEY_PROVENANCE_CLASSIFICATIONS minus UNRESOLVED, which denies persistence.',
  },
  {
    owner: 'EVIDENCE_ROOT',
    field: 'vocabularyProvenanceClass',
    stringCapable: true,
    disposition: 'CLOSED_VOCABULARY',
    rationale: 'KEY_PROVENANCE_CLASSES or NONE; a closed enum, never free text.',
  },
  {
    owner: 'EVIDENCE_ROOT',
    field: 'vocabularyProvenanceDigest',
    stringCapable: true,
    disposition: 'DERIVED_DIGEST',
    rationale:
      'C-10.5: computed by the trusted mint from validated evidence. There is no '
      + 'caller-supplied digest parameter, so this position cannot carry caller text.',
  },
  {
    owner: 'EVIDENCE_ROOT',
    field: 'routeProvenanceClass',
    stringCapable: true,
    disposition: 'CLOSED_VOCABULARY',
    rationale: 'ROUTE_PROVENANCE_CLASSES closed enum; NONE denies persistence outright.',
  },
  {
    owner: 'EVIDENCE_ROOT',
    field: 'routeProvenanceDigest',
    stringCapable: true,
    disposition: 'DERIVED_DIGEST',
    rationale: 'C-10.5: computed by the trusted mint; no caller-supplied digest exists.',
  },
  {
    owner: 'EVIDENCE_ROOT',
    field: 'structuralDigest',
    stringCapable: true,
    disposition: 'DERIVED_DIGEST',
    rationale:
      'prodstruct:sha256:* computed by the canonical writer from structural information '
      + 'only, and independently re-derived by the persistence firewall.',
  },
  {
    owner: 'EVIDENCE_ROOT',
    field: 'root',
    stringCapable: false,
    disposition: 'STRUCTURAL_RECURSION',
    rationale: 'A ProductionNode, whose own persisted field set is inventoried below.',
  },

  // ---- persisted ProductionNode ---------------------------------------
  {
    owner: 'EVIDENCE_NODE',
    field: 'type',
    stringCapable: true,
    disposition: 'CLOSED_VOCABULARY',
    rationale: 'PRODUCTION_NODE_TYPES: the six structural node kinds and nothing else.',
  },
  {
    owner: 'EVIDENCE_NODE',
    field: 'booleanClass',
    stringCapable: true,
    disposition: 'CLOSED_VOCABULARY',
    rationale: 'Two-member closed set TRUE | FALSE: a categorical truth value, never a customer value.',
  },
  {
    owner: 'EVIDENCE_NODE',
    field: 'stringClass',
    stringCapable: true,
    disposition: 'CLOSED_VOCABULARY',
    rationale: 'Two-member closed set EMPTY | NONEMPTY: never the value, never even its length.',
  },
  {
    owner: 'EVIDENCE_NODE',
    field: 'keyProvenance',
    stringCapable: true,
    disposition: 'CLOSED_VOCABULARY',
    rationale: 'KEY_PROVENANCE_CLASSIFICATIONS: how the object\'s keys were established.',
  },
  {
    owner: 'EVIDENCE_NODE',
    field: 'itemType',
    stringCapable: true,
    disposition: 'CLOSED_VOCABULARY',
    rationale: 'PRODUCTION_NODE_TYPES or MIXED: the homogeneous element kind of an array.',
  },
  {
    owner: 'EVIDENCE_NODE',
    field: 'fieldCount',
    stringCapable: false,
    disposition: 'CLOSED_VOCABULARY',
    rationale: 'Bounded non-negative integer cardinality.',
  },
  {
    owner: 'EVIDENCE_NODE',
    field: 'provenFieldCount',
    stringCapable: false,
    disposition: 'CLOSED_VOCABULARY',
    rationale: 'Bounded non-negative integer cardinality.',
  },
  {
    owner: 'EVIDENCE_NODE',
    field: 'dynamicFieldCount',
    stringCapable: false,
    disposition: 'CLOSED_VOCABULARY',
    rationale: 'Bounded non-negative integer cardinality.',
  },
  {
    owner: 'EVIDENCE_NODE',
    field: 'itemCount',
    stringCapable: false,
    disposition: 'CLOSED_VOCABULARY',
    rationale: 'Bounded non-negative integer cardinality.',
  },
  {
    owner: 'EVIDENCE_NODE',
    field: 'inspectedCount',
    stringCapable: false,
    disposition: 'CLOSED_VOCABULARY',
    rationale: 'Bounded non-negative integer cardinality.',
  },
  {
    owner: 'EVIDENCE_NODE',
    field: 'arrayTruncated',
    stringCapable: false,
    disposition: 'CLOSED_VOCABULARY',
    rationale: 'Boolean flag set when itemCount exceeded the inspection bound; carries no value.',
  },
  {
    owner: 'EVIDENCE_NODE',
    field: 'provenFields',
    stringCapable: false,
    disposition: 'STRUCTURAL_RECURSION',
    rationale: 'A ProductionProvenField list, whose name and node positions are inventoried below.',
  },
  {
    owner: 'EVIDENCE_NODE',
    field: 'dynamicFields',
    stringCapable: false,
    disposition: 'STRUCTURAL_RECURSION',
    rationale:
      'A BARE node list by design: the type has no field that could carry a dynamic '
      + 'key literal or a digest derived from one.',
  },
  {
    owner: 'EVIDENCE_NODE',
    field: 'items',
    stringCapable: false,
    disposition: 'STRUCTURAL_RECURSION',
    rationale: 'A list of ProductionNode element structures, each inventoried by this table.',
  },

  // ---- ProductionProvenField ------------------------------------------
  {
    owner: 'PROVEN_FIELD',
    field: 'name',
    stringCapable: true,
    disposition: 'SOURCE_PROVEN',
    rationale:
      'THE F-14 POSITION. A key literal is DATA, so it persists only as a proven member '
      + 'of a source-proven finite key vocabulary; a normal-looking field name is not proof.',
  },
  {
    owner: 'PROVEN_FIELD',
    field: 'node',
    stringCapable: false,
    disposition: 'STRUCTURAL_RECURSION',
    rationale: 'The field\'s value structure, recursing into the inventoried node positions.',
  },
]);

/** Positions whose safety rests on a planted sentinel rather than a structural bound. */
export function sentinelRequiredPositions(): readonly PersistedFieldRecord[] {
  return PERSISTED_FIELD_INVENTORY.filter((record) => record.disposition === 'SENTINEL_PROVEN');
}

/** Every inventoried position that can carry a string or bytes. */
export function stringCapablePositions(): readonly PersistedFieldRecord[] {
  return PERSISTED_FIELD_INVENTORY.filter((record) => record.stringCapable);
}
