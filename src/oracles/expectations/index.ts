// ---------------------------------------------------------------------------
// Nightwatch Phase 9 — declarative source-backed expectations public surface.
// ---------------------------------------------------------------------------

export * from './types';
export * from './paths';
export * from './validator';
export * from './provenance';
export * from './currentness';
export * from './sourceAdapter';
export * from './recipes/types';
export * from './recipes/validator';
export * from './recipes/registry';
export { canonicalExtraction, evidenceDigestFor, evidenceDigestEquals } from './extract/evidence';
export * from './extract/php';
export * from './admission';
export * from './resolver';
export * from './collectionAdmission';
