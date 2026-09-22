#!/usr/bin/env node
// @ts-check

/**
 * Invariant family: privacy, evidence and review-store boundaries.
 *
 * The shared property is that raw customer-derived value never crosses a
 * boundary it is not allowed to cross, and that the artefacts which record an
 * investigation — findings, reviews, dossiers, provenance — keep their
 * immutable identities and their owner-local storage.
 */

import fs from 'node:fs';
import path from 'node:path';
import {
  root,
  fail,
  withoutComments,
  readIncludingComments,
  read,
  readCommentText,
  readDataFile,
  gitFiles,
} from '../kernel.mjs';
import { buildPrivateConsumerCensus } from '../../privateConsumerCensus.mjs';
import { buildAuthenticatedWriterCensus, WRITER_CLASSES } from '../../authenticatedWriterCensus.mjs';

export function checkPrivateSurface() {
  // NW-AUD-019 — structural privacy is the primary admission authority.
  const screeningCode = read('src/core/policy/privateScreening.ts');
  const artifactsCode = read('src/core/policy/privateArtifacts.ts');
  const findingsAuthorityCode = read('src/controlCenter/authorities/findingsAuthority.ts');
  if (!/containsStructuralPrivateShape|findStructuralPrivateFailure/.test(screeningCode)) {
    fail('private screening module must expose structural private-shape detection (NW-AUD-019)');
  }
  if (!/SENSITIVE_PRIVATE_KEYS/.test(screeningCode)) {
    fail('private screening module must declare a closed sensitive-key set (NW-AUD-019)');
  }
  if (!/containsPrivatePayload\(/.test(artifactsCode)) {
    fail('private artifact store must admit through containsPrivatePayload (structural+text), not text-only (NW-AUD-019)');
  }
  // Labeled text defense must accept optional JSON quotes between label and
  // separator AND the closed compound-identity suffix class (HC-113 quotes,
  // HC-120 compound labels; both anchor on this exact flat form).
  {
    const flat = screeningCode.replace(/\s+/g, '');
    if (!flat.includes('authorization)(?:[_-]?(?:id|ids|name|address|group|key|alias|s))?["\']?') && !flat.includes(`authorization)(?:[_-]?(?:id|ids|name|address|group|key|alias|s))?['"]?`)) {
      fail('PRIVATE_VALUE_RE must allow optional quotes and compound identity suffixes between label and separator (NW-AUD-019)');
    }
  }
  // NW-AUD-019 — the compound identity suffix vocabulary is the structural
  // half of the same protection (`billing_group_id`, `payer_id`, `tokens`).
  if (!/SENSITIVE_KEY_SUFFIXES/.test(screeningCode)) {
    fail('private screening must declare the closed compound identity suffix vocabulary (NW-AUD-019)');
  }
  // NW-AUD-019 — the structural walk must RECURSE: a nested sensitive key is
  // the whole quoted/nesting bypass class, so a top-only walk fails here (HC-114).
  if (!/walk\(child, depth \+ 1\)/.test(screeningCode)) {
    fail('structural private walk must recurse into nested values (NW-AUD-019 totality)');
  }
  // NW-AUD-019 — text defense canonicalizes (NFKC + zero-width strip) so
  // fullwidth/escaped labels still reach the tripwires. Counted, not sampled:
  // the definition plus BOTH screen call sites must survive (HC-117).
  if (((screeningCode.match(/canonicalizePrivateText\(/g) ?? []).length < 3)
    || !/key\.normalize\('NFKC'\)/.test(screeningCode)) {
    fail('private text defense must canonicalize through NFKC before screening (NW-AUD-019)');
  }
  // NW-AUD-019 — reader independence on BOTH readers: the findings authority
  // must structurally revalidate the PARSED graph (HC-115) and the run-evidence
  // reader must structurally revalidate parsed JSON (HC-118); a JSON-escaped
  // sensitive key survives any regex over the raw bytes.
  if (!/containsStructuralPrivateShape\(raw\)/.test(findingsAuthorityCode)) {
    fail('findings authority must structurally revalidate parsed JSON (NW-AUD-019 reader independence)');
  }
  if (!/containsStructuralPrivateShape\(parsedValue\)/.test(read('src/controlCenter/authorities/runEvidenceReader.ts'))) {
    fail('run-evidence reader must structurally revalidate parsed JSON (NW-AUD-019 reader independence)');
  }
  // NW-AUD-019 — total private-payload consumer census. Every screening /
  // store writer / store reader in the repository must classify under the
  // closed registry; unknown consumers, stale roots, duplicate claims,
  // capability bypasses and an empty census all fail closed (HC-116).
  {
    const consumerFiles = gitFiles()
      .filter((file) => /\.(?:ts|mjs)$/.test(file))
      .filter((file) => !file.endsWith('.d.ts') && !file.endsWith('.d.mts'));
    const census = buildPrivateConsumerCensus(consumerFiles.map((file) => ({ file, source: read(file) })));
    for (const violation of census.violations) {
      fail(`private consumer census ${violation.code}: ${violation.file} :: ${violation.detail}`);
    }
    // Floors are "discovery is broken rather than the repository clean":
    // current truth is 40/14/10, so a collapse to these floors is a broken
    // scanner, not a legitimately emptied repository.
    if (census.consumerCount < 10) {
      fail(`private consumer census found only ${census.consumerCount} consumers; discovery is broken rather than the repository clean`);
    }
    if (census.productionConsumerCount < 8) {
      fail(`private consumer census found only ${census.productionConsumerCount} production consumers`);
    }
    if (census.writerCount < 6) {
      fail(`private consumer census found only ${census.writerCount} production writers`);
    }
    if (census.screenCallCount < 5) {
      fail(`private consumer census found only ${census.screenCallCount} screening call sites`);
    }
    if (!/^sha256:[0-9a-f]{24}$/.test(census.digest)) {
      fail('private consumer census digest is malformed');
    }
  }
  const tracked = gitFiles();
  for (const file of tracked) {
    if (/^artifacts\/(?!\.gitkeep$)/.test(file)) fail(`runtime artifact is tracked: ${file}`);
    if (/(?:^|\/)(?:storage[-_]?state|auth[-_]?state|credentials?|secrets?)(?:[._-]|\/|$)/i.test(file) && !/\.(?:ts|mjs|js)$/.test(file)) fail(`credential-like tracked path: ${file}`);
    if (/(?:\.storage-state|\.cookies\.json|\.token(?:s)?\.json|\.trace\.zip|\.har)$/i.test(file)) fail(`private runtime file is tracked: ${file}`);
  }
  const ignore = readDataFile('.gitignore');
  for (const required of ['artifacts/*', '.nightwatch/', 'storageState*.json', '*credentials*.json']) {
    if (!ignore.includes(required)) fail(`.gitignore is missing private-runtime rule: ${required}`);
  }
  const adapters = read('src/data/phase6/adapters.ts');
  if (!adapters.includes('assertOwnerPolicyAllows(`${_request.datastore}_DATA_ORACLE`)')) fail('Phase 6 real datastore adapter is missing the owner gate');
}

export function checkImmutablePrivatePublication() {
  const source = readIncludingComments('src/core/policy/privateArtifacts.ts');
  const sourceCode = read('src/core/policy/privateArtifacts.ts');
  const start = source.indexOf('  writeImmutableJson(');
  const end = source.indexOf('\n  /** Always throws', start);
  const method = start >= 0 && end > start ? source.slice(start, end) : '';
  if (!method) {
    fail('writeImmutableJson method is missing');
    return;
  }
  if (!/fs\.linkSync\(temporary, destination\)/.test(method)) fail('immutable publication does not use atomic linkSync create-if-absent');
  if (/renameSync|\.writeJson\s*\(|\.readJson\s*\(|unlinkSync\(destination\)|copyFileSync|writeFileSync\(destination/.test(method)) fail('immutable publication contains a replacement-capable or unsafe fallback');
  if (!/openSync\(temporary, ['"]wx['"], 0o600\)/.test(sourceCode) || !/fs\.fsyncSync\(descriptor\)/.test(sourceCode)) fail('private temporary publication is not wx/0600 and file-fsynced');
  if (!/randomBytes\(/.test(sourceCode) || !/\.tmp/.test(sourceCode)) fail('private temporary names are not process-collision-resistant hidden files');
  if (!/fs\.unlinkSync\(temporary\)/.test(method)) fail('immutable publication does not clean its temporary name');
  if (!/fsyncDirectory\(\)/.test(method) || !/fs\.fsyncSync\(descriptor\)/.test(sourceCode)) fail('immutable publication does not fsync the containing directory');
  if (!/PRIVATE_ARTIFACT_NO_REPLACE_UNSUPPORTED/.test(method)) fail('immutable publication lacks a precise unsupported no-replace failure');
  const storage = readIncludingComments('src/core/aiReview/storage.ts');
  const storageCode = read('src/core/aiReview/storage.ts');
  if (!/writeBugDraft[\s\S]*writeImmutableJson/.test(storageCode) || !/writeOracleSuggestion[\s\S]*writeImmutableJson/.test(storageCode) || !/writeHumanReview[\s\S]*writeImmutableJson/.test(storageCode)) fail('AI bug/oracle/review writes do not all use immutable publication');
  if (/writeIncomplete\s*\(|\.writeJson\s*\(/.test(storage)) fail('AI immutable storage uses replacement-capable writeJson/writeIncomplete');
}

/**
 * C-10 Workstream E — production privacy boundary isolation.
 *
 * design.md 6.5 "boundary isolation": the raw-to-safe projection/analyzer cone
 * must possess NO filesystem, networking, process or publication capability,
 * enforced mechanically rather than by developer convention, so a future
 * change cannot silently reintroduce an escape path. Raw bytes enter through
 * ONE bounded call-scoped reader.
 */
export function checkC10ProductionPrivacyBoundary() {
  const coneDirectory = 'src/core/prodPrivacy/';
  const absoluteCone = path.join(root, coneDirectory);
  if (!fs.existsSync(absoluteCone)) {
    fail('C-10 production privacy cone src/core/prodPrivacy/ is missing');
    return;
  }
  const coneFiles = fs
    .readdirSync(absoluteCone)
    .filter((entry) => entry.endsWith('.ts'))
    .map((entry) => `${coneDirectory}${entry}`);
  if (coneFiles.length < 7) fail('C-10 production privacy cone source files are missing');

  for (const file of coneFiles) {
    const source = readIncludingComments(file);
    // No filesystem, transport, process, publication or output-destination import.
    if (/import\s+[^;]*from\s+['"][^'"]*(?:node:fs|node:http|node:https|node:net|node:dgram|node:dns|node:tls|node:child_process|child_process|undici|node-fetch|axios|playwright|@playwright|aiReview|selfDev|phase6|privateArtifacts|prodEvidence|runRecorder|controlCenter|proxy\/)[^'"]*['"]/i.test(source)) {
      fail(`${file} imports a forbidden filesystem/network/process/publication module (C-10 boundary isolation)`);
    }
    // No capability reference even without an import (require, dynamic import,
    // global fetch, an environment-derived output destination).
    if (/(?<![.\w])(?:require\s*\(|child_process|spawn\s*\(|exec(?:File)?\s*\(|fetch\s*\(|writeFile|appendFile|readFile|createWriteStream|createReadStream|mkdirSync|renameSync|unlinkSync|rmSync|openSync|PrivateArtifactStore|ProductionFindingsStore)/.test(source)) {
      fail(`${file} exposes a process, network, or persistence capability (C-10 boundary isolation)`);
    }
    if (/process\.env/.test(source)) {
      fail(`${file} must not derive an output destination from the environment (C-10 boundary isolation)`);
    }
    // node:crypto is the ONLY permitted node builtin, for the structural digest.
    for (const match of source.matchAll(/from\s+['"](node:[a-z_]+)['"]/g)) {
      if (match[1] !== 'node:crypto') {
        fail(`${file} imports the node builtin ${match[1]}; the C-10 cone permits node:crypto only`);
      }
    }
  }

  // Raw bytes enter through exactly one bounded, call-scoped reader.
  const types = read('src/core/prodPrivacy/types.ts');
  if (!/class RawEphemeralSource/.test(types) || !/toJSON\(\): never/.test(types)) {
    fail('C-10 raw bytes must enter through the single call-scoped RawEphemeralSource, which must refuse serialization');
  }
  const projector = readIncludingComments('src/core/prodPrivacy/projector.ts');
  const projectorCode = read("src/core/prodPrivacy/projector.ts");
  if (!/source instanceof RawEphemeralSource/.test(projectorCode)) {
    fail('C-10 projector must accept raw bytes only through RawEphemeralSource');
  }
  if (!/keyProvenanceRequirement/.test(projectorCode) || !/isSourceProvenKey/.test(projectorCode)) {
    fail('C-10 projector must decide key provenance through the source-proven vocabulary (F-14)');
  }

  // F-15: the two digest families must stay distinct and the structural family
  // must never ingest a value or an unproven key literal.
  const serializer = readIncludingComments('src/core/prodPrivacy/serializer.ts');
  const serializerCode = read("src/core/prodPrivacy/serializer.ts");
  if (!/PRODUCTION_STRUCTURAL_DIGEST_PREFIX/.test(serializerCode)) {
    fail('C-10 structural digest must use the distinct prodstruct: family (F-15)');
  }
  if (/encounterToken|numericEncounterRef/.test(serializer.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, ''))) {
    fail('C-10 canonical serializer must never write an ephemeral correlation label (F-15)');
  }
  const policy = readIncludingComments('src/core/prodPrivacy/policy.ts');
  const policyCode = read("src/core/prodPrivacy/policy.ts");
  if (!/durableValueDigest: 'ABSENT'/.test(policyCode)) {
    fail('C-10 production policy must record that no durable value digest exists (F-15)');
  }

  // Workstream F: the persistence firewall must be an independent re-validation
  // at the durable write, and the store must run it.
  const firewall = readIncludingComments('src/core/prodEvidence/firewall.ts');
  const firewallCode = read("src/core/prodEvidence/firewall.ts");
  for (const required of ['ENCOUNTER_TOKEN_PRESENT', 'DYNAMIC_KEY_LITERAL_PRESENT', 'DIGEST_MISMATCH', 'UNKNOWN_SCHEMA_VERSION']) {
    if (!firewallCode.includes(required)) fail(`C-10 persistence firewall must reject ${required}`);
  }
  const store = readIncludingComments('src/core/prodEvidence/productionFindingsStore.ts');
  const storeCodeOnly = read("src/core/prodEvidence/productionFindingsStore.ts");
  if (!/assertPersistableProductionEvidence/.test(storeCodeOnly)) {
    fail('C-10 production store must re-validate through the persistence firewall at the durable write');
  }
  if (!/prod-findings/.test(storeCodeOnly)) {
    fail('C-10 production store must use its own prod-findings namespace, never the DEV findings root');
  }
  if (/'\.nightwatch',\s*'findings'/.test(store)) {
    fail('C-10 production store must not resolve the DEV findings root');
  }

  // DEF-C10-5 / F-16: route identity must be decided by source-proven
  // vocabulary MEMBERSHIP, never by the shape regex alone. `ROUTE_TEMPLATE_RE`
  // admits any `[A-Za-z0-9._~-]+` segment, so it cannot tell `accounts` from
  // `481516234299`; relying on it let concrete customer identifiers reach
  // persisted evidence through the route field.
  const routeVocabulary = readIncludingComments('src/core/prodPrivacy/routeVocabulary.ts');
  const routeVocabularyCode = read("src/core/prodPrivacy/routeVocabulary.ts");
  if (!/isSourceProvenRoute/.test(routeVocabularyCode) || !/NO_PROVEN_ROUTE_VOCABULARY/.test(routeVocabularyCode)) {
    fail('C-10 route identity must be decided by a source-proven route vocabulary (DEF-C10-5)');
  }
  if (!/templates\.has\(/.test(routeVocabularyCode)) {
    fail('C-10 route provenance must be exact-set membership, not a syntactic judgement (DEF-C10-5)');
  }
  const evidenceModule = read('src/core/prodPrivacy/evidence.ts');
  if (!/assertSourceProvenRoute\(\s*request\.routeVocabulary/.test(evidenceModule)) {
    fail('C-10 evidence construction must assert source-proven route provenance (DEF-C10-5)');
  }
  if (!/routeProvenanceDigest/.test(evidenceModule)) {
    fail('C-10 persisted evidence must record route provenance (DEF-C10-5)');
  }
  if (!/assertSourceProvenRoute\(\s*this\.routeVocabulary/.test(storeCodeOnly)) {
    fail('C-10 production store must re-check route membership at the durable write (DEF-C10-5)');
  }
  if (!/ROUTE_PROVENANCE_MISSING/.test(firewallCode)) {
    fail('C-10 persistence firewall must reject evidence lacking route provenance (DEF-C10-5)');
  }
  const parameterProvenance = read('src/core/prodPrivacy/parameterProvenance.ts');
  if (!/assertSourceProvenRoute\(\s*routeVocabulary/.test(parameterProvenance)) {
    fail('C-10 assertRouteTemplateOnly must require route provenance, not shape alone (DEF-C10-5)');
  }
  const audit = readIncludingComments('src/core/prodEvidence/persistenceAudit.ts');
  const auditCode = read("src/core/prodEvidence/persistenceAudit.ts");
  if (!/provenRouteTemplates/.test(auditCode)) {
    fail('C-10 persistence audit must flag a persisted route outside the proven set (DEF-C10-5)');
  }

  // F-18: the Control Center findings authority must be structurally excluded
  // from the production store, on EVERY construction route including the seam.
  const authority = readIncludingComments('src/controlCenter/authorities/findingsAuthority.ts');
  const authorityCode = read("src/controlCenter/authorities/findingsAuthority.ts");
  if (!/assertNotProductionFindingsRoot/.test(authorityCode)) {
    fail('Control Center findings authority must assert the C-10 production exclusion (F-18)');
  }
  const seam = authority.slice(authority.indexOf('export function createFindingsAuthorityForTests'));
  if (!/assertDevFindingsRoot/.test(seam)) {
    fail('the Control Center test-only findings seam must also refuse the production root (F-18)');
  }
  const exclusion = readIncludingComments('src/core/prodEvidence/controlCenterExclusion.ts');
  const exclusionCode = read("src/core/prodEvidence/controlCenterExclusion.ts");
  if (!/realpathSync/.test(exclusionCode)) {
    fail('C-10 Control Center exclusion must use resolved-path equivalence, not string comparison (F-18)');
  }
}

/**
 * C-10.5 (A3-A8) — production vocabulary AUTHORITY boundary.
 *
 * C-10 left the minting side of the route/key provenance boundary unowned: a
 * caller could assert a provenance class, supply any shape-valid
 * `ev:sha256:<24 hex>` digest and arbitrary members, and receive a
 * `SOURCE_PROVEN_*` capability. C-10.5 moved authority to trusted derivation.
 * These invariants keep it there — "only the adapter mints" must be a gate,
 * not a convention.
 */
export function checkC105ProvenanceAuthorityBoundary() {
  const authority = readIncludingComments('src/core/prodPrivacy/vocabularyAuthority.ts');
  const authorityCode = read("src/core/prodPrivacy/vocabularyAuthority.ts");

  // The runtime brand must be a module-private WeakSet. If it were exported in
  // any form, arbitrary code could register a forged object and the A6
  // JSON-revival refusal would collapse.
  if (!/const MINTED = new WeakSet<object>\(\)/.test(authorityCode)) {
    fail('C-10.5 vocabulary authority must brand capabilities with a module-private WeakSet');
  }
  if (/export\s+(?:const\s+MINTED|function\s+mintedRegistry|\{[^}]*\bMINTED\b)/.test(authority)) {
    fail('C-10.5 the minted-capability registry must never be exported (runtime brand integrity)');
  }

  // Identity must be COMPUTED. A digest parameter anywhere in the mint would
  // restore the forgery the campaign closed.
  if (!/function computeProvenanceDigest\(evidence: ValidatedSourceEvidence\): string/.test(authorityCode)) {
    fail('C-10.5 provenance identity must be computed from validated evidence');
  }
  if (/provenanceDigest\s*:\s*string;?\s*(?:\/\/[^\n]*)?\n[^}]*\}\s*\)\s*:\s*MintedProvenance/.test(authority)) {
    fail('C-10.5 the mint must not accept a caller-supplied provenance digest');
  }
  for (const required of [
    'EVIDENCE_INVENTORY_INCOMPLETE',
    'EVIDENCE_CURRENCY_UNPROVEN',
    'EVIDENCE_SOURCE_IDENTITY',
    'EVIDENCE_REPOSITORY_UNAPPROVED',
    'EVIDENCE_CLASS_MISMATCH',
    'CAPABILITY_NOT_MINTED',
    'CAPABILITY_TEST_ONLY',
  ]) {
    if (!authorityCode.includes(required)) {
      fail(`C-10.5 vocabulary authority must fail closed with ${required}`);
    }
  }
  // Only a COMPLETE inventory may grant authority.
  if (!/evidence\.inventoryState !== 'COMPLETE'/.test(authorityCode)) {
    fail('C-10.5 an incomplete source inventory must deny authority');
  }
  // A generated artifact must be provably CURRENT.
  if (!/qualifier === 'GENERATED_ARTIFACT' && evidence\.currencyState !== 'CURRENT'/.test(authorityCode)) {
    fail('C-10.5 stale or unknown generated evidence must deny authority');
  }

  // Consumption must require the brand, not the shape.
  const routeVocabulary = readIncludingComments('src/core/prodPrivacy/routeVocabulary.ts');
  const routeVocabularyCode = read("src/core/prodPrivacy/routeVocabulary.ts");
  const keyVocabulary = readIncludingComments('src/core/prodPrivacy/keyVocabulary.ts');
  const keyVocabularyCode = read("src/core/prodPrivacy/keyVocabulary.ts");
  if (!/if \(!isMintedCapability\(source\)\) return false;/.test(routeVocabularyCode)) {
    fail('C-10.5 route provenance must require a minted capability, not a matching shape');
  }
  if (!/if \(!isMintedCapability\(source\)\) return false;/.test(keyVocabularyCode)) {
    fail('C-10.5 key provenance must require a minted capability, not a matching shape');
  }
  if (!/assertProductionVocabularyAuthority\(source\)/.test(routeVocabularyCode)) {
    fail('C-10.5 production route authority must refuse an unminted or TEST_ONLY capability');
  }
  // The KEY side must be guarded SYMMETRICALLY at the persistence boundary.
  // The guard existed but had no call site, so a TEST_ONLY key vocabulary —
  // genuinely minted, hence a member for `isSourceProvenKey` — carried an
  // arbitrary key literal into persisted evidence through provenFields[].name.
  if (!/assertProductionKeyVocabularyAuthority\(source: KeyVocabularySource\)/.test(keyVocabularyCode)) {
    fail('C-10.5 the key vocabulary must expose a production authority guard');
  }
  const evidenceAuthority = read('src/core/prodPrivacy/evidence.ts');
  if (!/assertProductionKeyVocabularyAuthority\(vocabulary\)/.test(evidenceAuthority)) {
    fail('C-10.5 evidence construction must require PRODUCTION key vocabulary authority (dead-guard regression)');
  }
  if (!/assertSourceProvenRoute\(\s*request\.routeVocabulary/.test(evidenceAuthority)) {
    fail('C-10.5 evidence construction must require route provenance');
  }

  // The cone's public surface must NOT re-export the mint. A wildcard
  // re-export of the vocabulary modules would put a `'PRODUCTION'` marker
  // argument within reach of every importer of the cone.
  const coneIndex = read('src/core/prodPrivacy/index.ts');
  for (const wildcard of ["export * from './keyVocabulary'", "export * from './routeVocabulary'", "export * from './vocabularyAuthority'"]) {
    if (coneIndex.includes(wildcard)) {
      fail(`C-10.5 the cone public surface must not wildcard-re-export the mint (${wildcard})`);
    }
  }
  for (const minted of ['deriveProvenRouteVocabulary', 'deriveProvenKeyVocabulary', 'mintProvenance']) {
    if (new RegExp(`\\b${minted}\\b`).test(coneIndex)) {
      fail(`C-10.5 ${minted} must not appear on the cone public surface`);
    }
  }

  // The derivation adapter must live OUTSIDE the pure cone (A8).
  if (!fs.existsSync(path.join(root, 'src/core/prodProvenance'))) {
    fail('C-10.5 the source-evidence derivation adapter src/core/prodProvenance/ is missing');
  }

  // Only the trusted adapter and the cone itself may reach the mint.
  const MINT_NAMES = ['deriveProvenRouteVocabulary', 'deriveProvenKeyVocabulary', 'mintProvenance'];
  const ALLOWED_MINT_IMPORTERS = /^src\/core\/(?:prodProvenance|prodPrivacy)\//;
  for (const file of gitFiles()) {
    if (!file.endsWith('.ts') && !file.endsWith('.tsx')) continue;
    if (ALLOWED_MINT_IMPORTERS.test(file)) continue;
    const source = read(file);
    for (const name of MINT_NAMES) {
      // An IMPORT of the mint, not a mere mention (tests may name it in prose).
      if (new RegExp(`import[^;]*\\b${name}\\b[^;]*from`).test(source)) {
        fail(`${file} imports the C-10.5 mint ${name}; only src/core/prodProvenance/** may mint production authority`);
      }
    }
  }

  // The TEST-ONLY seam must be reachable from tests only.
  const seamPath = 'src/core/prodProvenance/testOnlySeam.ts';
  // Comment-text subject: the brand is a comment banner, not an identifier.
  const seamSource = readCommentText(seamPath);
  if (!/TEST ONLY\. NOT A PRODUCTION AUTHORITY PATH\./.test(seamSource)) {
    fail('C-10.5 the test-only vocabulary seam must be explicitly branded TEST ONLY');
  }
  for (const file of gitFiles()) {
    if ((!file.endsWith('.ts') && !file.endsWith('.tsx')) || file === seamPath) continue;
    if (file.startsWith('tests/')) continue;
    const source = read(file);
    if (/from\s+['"][^'"]*prodProvenance\/testOnlySeam['"]/.test(source)) {
      fail(`${file} imports the C-10.5 TEST-ONLY vocabulary seam; only tests/** may import it`);
    }
  }
  // G14.9 removed the `src/core/prodProvenance/index.ts` barrel; the generic
  // TEST-ONLY seam scan above now covers every `.ts`/`.tsx` file in the module
  // (including any replacement barrel), so the seam cannot gain a public
  // surface without failing there.

  // The PHP route adapter must stay fail-closed: C-06 admits no production
  // route today, and C-10.5 must not invent completeness to manufacture one.
  const routeDerivation = read('src/core/prodProvenance/routeVocabularyDerivation.ts');
  if (!/PHP_ROUTE_PROOF_UNAVAILABLE/.test(routeDerivation)) {
    fail('C-10.5 PHP route derivation must fail closed while C-06 admits no production route');
  }
}

/**
 * FC-1 finding-review / finding-intel invariants.
 *
 * The `src/core/findingReview/` and `src/core/findingIntel/` cones are pure
 * local lifecycle/intelligence machinery. They must stay free of external
 * submission, bounty-scoring, and organizational-verdict surfaces, and must
 * retain the literal markers that keep local review advisory-only.
 */
export function checkFindingFrontierBoundary() {
  const cones = ['src/core/findingReview', 'src/core/findingIntel'];
  for (const coneDirectory of cones) {
    const coneFiles = gitFiles().filter((file) => file.startsWith(`${coneDirectory}/`) && file.endsWith('.ts'));
    if (coneFiles.length === 0) {
      // TOTALITY: report every missing cone, not only the first.
      fail(`FC-1 the ${coneDirectory} cone is missing`);
      continue;
    }
    for (const file of coneFiles) {
      const source = read(file);
      for (const [pattern, description] of [
        [/from\s+['"]node:(?:net|http|https|dns|child_process|fs|os|path|url|util|events|stream|worker_threads)[^'"]*['"]/, 'a network/process/filesystem runtime import (any subpath)'],
        [/\brequire\s*\(\s*['"]/, 'a require() call'],
        [/\bfetch\s*\(/, 'fetch()'],
        [/from\s+['"][^'"]*(slack|leslie|pondr)[^'"]*['"]/i, 'an external submission import'],
        [/(Slack|Leslie|Pondr)(Client|Webhook|Api|API|Message|Ticket|Issue)|postTo(Slack|Leslie|Pondr)|file(Leslie|Pondr|Slack)Report|create(GitHub|Slack|Pondr)(Issue|Message|Task)/, 'an external submission connector'],
        [/expectedPoints|estimatedReward|rewardTier|bountyPoints|bountyScore|calculateBounty|bountyCalculator/i, 'a bounty-scoring surface'],
        [/from\s+['"][^'"]*core\/(alphausHandoff|c12Readiness|prodObserveP1|prodObserve[^P])/, 'a production-cone import (review/intel bind digests only)'],
      ]) if (pattern.test(source)) fail(`${file} contains ${description}; the finding-frontier cones must stay local-only`);
    }
  }
  const lifecycle = read('src/core/findingReview/lifecycle.ts');
  // Stale-review rejection and the non-equivalence guard are the load-bearing
  // properties: a weakened binding must fail this check, not just tests.
  for (const literal of ['FINDING_REVIEW_STALE', "'NONE_LOCAL_REVIEW_ONLY'"]) {
    if (!lifecycle.includes(literal)) fail(`FC-1 the review lifecycle must retain ${literal}`);
  }
  // Occurrence-complete: the emitted receipt value and the verification
  // comparison must BOTH be the local-only literal. A safe occurrence
  // elsewhere in the file must not satisfy this rule (mutation M12).
  for (const file of ['src/core/findingReview/lifecycle.ts', 'src/core/findingReview/types.ts']) {
    const source = read(file);
    for (const assignment of source.match(/organizationalAuthority\s*(?::|!==|===)\s*'[^']*'/g) ?? []) {
      if (!assignment.endsWith("'NONE_LOCAL_REVIEW_ONLY'")) {
        fail(`${file} carries ${assignment}; local review authority must always be NONE_LOCAL_REVIEW_ONLY`);
      }
    }
  }
  const relationships = read('src/core/findingIntel/relationships.ts');
  for (const literal of ['advisoryOnly: true', "finalVerdictAuthority: 'HUMAN_ORGANIZATIONAL'", 'REGRESSION_CANDIDATE']) {
    if (!relationships.includes(literal)) fail(`FC-1 the relationship classifier must retain ${literal}`);
  }
}
/**
 * RS-1 reviewer-surface invariants.
 *
 * The Control Center reviewer surface projects the FC-1 finding cones. It
 * must not become a second opinion: the cones' advisory markings decide the
 * epistemic class, the local-review non-equivalence guard is re-checked at
 * the surface, and the Alphaus vocabulary it displays must stay identical to
 * the AH-1 vocabulary it is forbidden to import.
 */
export function checkReviewerSurfaceBoundary() {
  const adapter = read('src/controlCenter/adapters/reviewerAdapter.ts');
  const contract = read('src/controlCenter/contracts/reviewer.ts');
  const authority = read('src/controlCenter/authorities/reviewerAuthority.ts');

  // --- the projection stays pure ---
  for (const [file, source] of [
    ['src/controlCenter/adapters/reviewerAdapter.ts', adapter],
    ['src/controlCenter/contracts/reviewer.ts', contract],
    ['src/controlCenter/authorities/reviewerAuthority.ts', authority],
  ]) {
    for (const [pattern, description] of [
      [/from\s+['"]node:(?:net|http|https|dns|child_process|fs|os|worker_threads)[^'"]*['"]/, 'a network/process/filesystem import'],
      [/\brequire\s*\(\s*['"]/, 'a require() call'],
      [/\bfetch\s*\(/, 'fetch()'],
      [/process\.env/, 'an environment read'],
      [/from\s+['"][^'"]*(slack|leslie|pondr)[^'"]*['"]/i, 'an external submission import'],
      [/expectedPoints|estimatedReward|rewardTier|bountyPoints|bountyScore|calculateBounty/i, 'a bounty-scoring surface'],
    ]) if (pattern.test(source)) fail(`${file} contains ${description}; the reviewer surface must stay a pure local projection`);
  }

  // --- authority literals, occurrence-complete ---
  // A rule satisfied by one safe occurrence is the DEF-FC-04 / M12 trap: every
  // assignment and comparison must carry the local-only value, not just one.
  for (const [file, source] of [
    ['src/controlCenter/adapters/reviewerAdapter.ts', adapter],
    ['src/controlCenter/contracts/reviewer.ts', contract],
  ]) {
    for (const assignment of source.match(/organizationalAuthority\s*(?::|!==|===)\s*'[^']*'/g) ?? []) {
      if (!assignment.endsWith("'NONE_LOCAL_REVIEW_ONLY'")) {
        fail(`${file} carries ${assignment}; the reviewer surface must always be NONE_LOCAL_REVIEW_ONLY`);
      }
    }
    for (const assignment of source.match(/finalVerdictAuthority\s*(?::|!==|===)\s*'[^']*'/g) ?? []) {
      if (!assignment.endsWith("'HUMAN_ORGANIZATIONAL'")) {
        fail(`${file} carries ${assignment}; the final verdict authority is always HUMAN_ORGANIZATIONAL`);
      }
    }
  }

  // --- the cones decide the epistemic class, not the adapter ---
  for (const literal of [
    "receipt.organizationalAuthority !== 'NONE_LOCAL_REVIEW_ONLY'",
    'CUSTOMER_SENTINEL',
  ]) {
    if (!adapter.includes(literal)) fail(`RS-1 the reviewer adapter must retain ${literal}`);
  }
  // Totality, not presence. Two advisory projections exist, so an
  // includes(literal) rule stays satisfied when one guard is deleted — the
  // DEF-FC-02 / M12 shape. Every emitted `advisoryOnly: true` must be paid for
  // by a guard that rejected a non-advisory input.
  const emitted = (adapter.match(/advisoryOnly:\s*true/g) ?? []).length;
  const guarded = (adapter.match(/advisoryOnly\s*!==\s*true\)\s*fail/g) ?? []).length;
  if (emitted === 0 || guarded !== emitted) {
    fail(`RS-1 the reviewer adapter emits ${emitted} advisoryOnly values but guards ${guarded}; every advisory projection must check its input`);
  }
  // UNKNOWN must stay value-free: no advisory pointer may accompany it.
  if (!/possibleOriginalId !== null\) fail/.test(adapter)) {
    fail('RS-1 an UNKNOWN relationship must carry no advisory pointer');
  }

  // --- the scale probe measures; it never writes ---
  // A benchmark that can touch the finding store is a benchmark that can
  // corrupt the thing it measures. Synthetic corpora stay in memory.
  const probe = read('tests/unit/findingIntelScaleProbe.ts');
  for (const [pattern, description] of [
    [/from\s+['"]node:(?:fs|net|http|https|dns|child_process)[^'"]*['"]/, 'a filesystem/network/process import'],
    [/writeFile|appendFile|mkdirSync|createWriteStream|PrivateArtifactStore|ProductionFindingsStore/, 'a persistence capability'],
    [/\bfetch\s*\(/, 'fetch()'],
    [/Math\.random/, 'Math.random (the corpus must be identical in every process)'],
  ]) if (pattern.test(probe)) fail(`RS-1 the finding-intel scale probe contains ${description}`);

  // --- the pinned literal duplicate cannot drift from AH-1 ---
  const ah1 = readIncludingComments('src/core/alphausHandoff/types.ts');
  for (const [ah1Name, localName] of [
    ['ALPHAUS_SEVERITY_VALUES', 'ALPHAUS_SEVERITY_LITERALS'],
    ['ALPHAUS_CATCH_STAGE_VALUES', 'ALPHAUS_CATCH_STAGE_LITERALS'],
    ['ALPHAUS_SOURCE_VALUES', 'ALPHAUS_SOURCE_LITERALS'],
  ]) {
    const source = new RegExp(`${ah1Name}\\s*=\\s*(\\[[^\\]]*\\])`).exec(ah1);
    const local = new RegExp(`${localName}\\s*=\\s*(\\[[^\\]]*\\])`).exec(authority);
    if (source === null) fail(`RS-1 could not read ${ah1Name} from the AH-1 vocabulary`);
    else if (local === null) fail(`RS-1 could not read ${localName} from the reviewer authority`);
    else if (source[1].replace(/\s+/g, '') !== local[1].replace(/\s+/g, '')) {
      fail(`RS-1 ${localName} has drifted from ${ah1Name}; the duplicate is deliberate and must stay exact`);
    }
  }
}

export function checkReviewStoreBoundary() {
  const types = readIncludingComments('src/core/reviewStore/types.ts');
  const identity = readIncludingComments('src/core/reviewStore/identity.ts');
  const store = readIncludingComments('src/core/reviewStore/store.ts');
  const writeAuthority = readIncludingComments('src/controlCenter/authorities/reviewWriteAuthority.ts');
  const binding = readIncludingComments('src/controlCenter/authorities/reviewBinding.ts');
  const reviewerAuthority = readIncludingComments('src/controlCenter/authorities/reviewerAuthority.ts');
  const policy = read('src/core/policy/privateArtifacts.ts');
  const storeCode = withoutComments(store);
  const identityCode = withoutComments(identity);

  // --- the store owns no I/O of its own ---
  // Every byte goes through PrivateArtifactStore. A store that could also
  // open a file would have a second, unaudited publication path.
  for (const file of ['src/core/reviewStore/types.ts', 'src/core/reviewStore/identity.ts', 'src/core/reviewStore/store.ts', 'src/core/reviewStore/index.ts']) {
    const source = read(file);
    for (const forbidden of ['node:fs', 'node:child_process', 'node:net', 'node:http', 'node:https', 'node:dgram', 'node:worker_threads']) {
      if (source.includes(`'${forbidden}'`)) fail(`${file} must not hold ${forbidden} authority`);
    }
    if (/\bfs\./.test(source) || /\bfetch\s*\(/.test(source) || /require\s*\(/.test(source)) fail(`${file} reaches a filesystem or network primitive directly`);
  }

  // --- publication is occurrence-complete, not sampled ---
  // Every call on the underlying private store is enumerated and checked
  // against an allowlist. A single positive `includes` would pass while one
  // unsafe call sat beside it.
  const allowed = new Set(['writeImmutableJson', 'readJson', 'listJson', 'listTemporaries', 'removeTemporary']);
  const calls = [...storeCode.matchAll(/this\.artifacts\.([A-Za-z0-9_]+)\s*\(/g)].map((match) => match[1]);
  if (calls.length === 0) fail('review store makes no call on the private artifact store at all');
  for (const call of calls) {
    if (!allowed.has(call)) fail(`review store calls a non-allowlisted private-store method: ${call}`);
  }
  // The replacement-capable writers must not appear anywhere in the cone.
  if (/writeJson\s*\(|writeIncomplete\s*\(/.test(storeCode)) fail('review store uses a replacement-capable write');
  if (!storeCode.includes('this.artifacts.writeImmutableJson(')) fail('review store does not publish through the atomic no-replace primitive');

  // --- the canonical validators are INVOKED, not merely imported ---
  // A rule that only checked the import would pass over a cone that imported
  // the validator and never called it.
  for (const invoked of ['verifyReceiptIntegrity(', 'verifyReviewCurrent(', 'validateReviewBinding(', 'isTerminalReviewState(', 'decideReview(', 'initialReviewRecord(']) {
    // The import list carries the bare name; a call carries the name plus an
    // open paren. Counting `name(` occurrences therefore counts CALLS, and a
    // cone that imported the validator and never used it scores zero.
    const uses = storeCode.split(invoked).length - 1;
    if (uses < 1) fail(`review store imports ${invoked.slice(0, -1)} without invoking it`);
  }

  // --- no second, weaker copy of review semantics ---
  // The store must never recompute a receipt digest or re-derive staleness.
  if (/sha256Hex\s*\(/.test(storeCode)) fail('review store recomputes a digest instead of using the canonical validator');
  if (/review:\$\{/.test(storeCode)) fail('review store rebuilds a receipt identity string');
  if (/FINDING_REVIEW_STALE:/.test(storeCode.replace(/startsWith\('FINDING_REVIEW_STALE'\)/g, ''))) fail('review store re-derives a staleness reason');

  // --- validate before publish, and no read-then-write race ---
  const putStart = storeCode.indexOf('putDecision(input: PutReviewDecisionInput)');
  // Anchored on the NEXT METHOD DECLARATION, not on a bare call name: a
  // mutation that introduces `this.fileNamesFor(...)` inside putDecision would
  // otherwise truncate the body being inspected and the rule would report the
  // wrong violation.
  //
  // Matched on the signature PREFIX rather than its full text, because
  // pinning the full parameter list makes the rule fail the moment that
  // method gains an argument — which it did, and the failure said
  // "publishes before validating" rather than "the anchor moved". A
  // structural rule must not be brittle about details it does not govern.
  const putEnd = storeCode.indexOf('\n  fileNamesFor(', putStart);
  const putBody = putStart >= 0 && putEnd > putStart ? storeCode.slice(putStart, putEnd) : '';
  if (!putBody) fail('review store putDecision body could not be located');
  const validateAt = putBody.indexOf('validateStoredReviewEnvelope(');
  const publishAt = putBody.indexOf('writeImmutableJson(');
  if (validateAt < 0 || publishAt < 0 || validateAt > publishAt) fail('review store publishes before validating the bytes it will write');
  if (/existsSync|fileNamesFor\(|this\.read\(/.test(putBody)) fail('review store putDecision performs a raceable read-then-write existence check');
  if (!/REVIEW_STORE_ALREADY_DECIDED/.test(putBody)) fail('review store does not map a publication conflict to a deterministic already-decided result');

  // --- identity is the WHOLE binding ---
  if (!/sha256Hex\(stableJsonSorted\(validateReviewBinding\(binding\)\)\)/.test(identityCode)) {
    fail('review identity is not the digest of the complete validated binding');
  }
  const fileNamePattern = identityCode.match(/REVIEW_FILE_NAME_RE = \/(.*?)\/;/)?.[1] ?? '';
  // Hex only, both components anchored: nothing a caller supplies can reach
  // a file name, so a path-shaped finding id cannot become a path.
  if (!fileNamePattern.startsWith('^review\\.') || !fileNamePattern.endsWith('\\.json$') || !fileNamePattern.includes('[0-9a-f]{12}') || !fileNamePattern.includes('[0-9a-f]{24}')) {
    fail(`review file name shape is not the pinned hex-only pattern: ${fileNamePattern}`);
  }

  // --- the error vocabulary is total in BOTH directions ---
  const declared = [...types.matchAll(/'(REVIEW_STORE_[A-Z_]+)'/g)].map((match) => match[1]);
  const declaredSet = new Set(declared);
  if (declaredSet.size < 8) fail('review store error vocabulary is suspiciously small');
  const raised = new Set([...storeCode.matchAll(/'(REVIEW_STORE_[A-Z_]+)'/g)].map((match) => match[1]));
  for (const code of raised) {
    if (!declaredSet.has(code)) fail(`review store raises an undeclared error code: ${code}`);
  }
  for (const code of declaredSet) {
    if (!raised.has(code)) fail(`review store declares an error code it can never raise: ${code}`);
  }

  // --- the owner-local root is outside the repository, and derived ---
  if (!/assertOutsideCanonicalWorkspace\(root\)/.test(policy)) fail('private artifact root no longer asserts it is outside the repository');
  if (!/if \(injectedRoot === undefined\) assertOutsideCanonicalWorkspace\(root\)/.test(policy)) {
    fail('a derived private artifact root is not held to the outside-the-repository contract');
  }
  if (!/PRIVATE_ARTIFACT_SUBTREES = \['findings', 'reviews'\]/.test(policy)) fail('the private subtree vocabulary is no longer a closed two-member union');
  if (!/assertKnownSubtree\(subtree\)/.test(policy)) fail('the subtree vocabulary is not enforced at runtime');

  // --- recovery can never touch an unknown file ---
  if (!/TEMPORARY_FILE_RE\.test\(name\)/.test(policy)) fail('temporary removal does not require the pinned temporary name shape');
  if (!/PRIVATE_ARTIFACT_NOT_A_TEMPORARY/.test(policy)) fail('temporary removal lacks a refusal for a non-temporary name');

  // --- no review artifact is ever tracked by Git ---
  for (const file of gitFiles()) {
    if (/(?:^|\/)review\.[0-9a-f]{12}\.[0-9a-f]{24}\.json$/.test(file)) fail(`a review store artifact is tracked in Git: ${file}`);
  }

  // --- the write authority is narrow ---
  const writeCode = withoutComments(writeAuthority);
  for (const forbidden of ['node:fs', 'node:child_process', 'node:net', 'node:http', 'node:https']) {
    if (writeCode.includes(`'${forbidden}'`)) fail(`review write authority must not hold ${forbidden} authority`);
  }
  if (/\bfs\./.test(writeCode) || /\bfetch\s*\(/.test(writeCode)) fail('review write authority reaches a filesystem or network primitive directly');
  // Its ONLY persistence is the review store.
  // Built from parts rather than written as a literal: a literal would put a
  // module-specifier shape into this file and the dependency-resolvability
  // check would read it as an import of its own.
  const importSpecifierPattern = new RegExp(['from', String.raw`\s+'([^']+)'`].join(''), 'g');
  const imports = [...writeCode.matchAll(importSpecifierPattern)].map((match) => match[1]);
  for (const specifier of imports) {
    if (!/^\.\.?\//.test(specifier)) fail(`review write authority imports a non-relative module: ${specifier}`);
    if (/prodEvidence|prodObserve|selfDev|alphausHandoff|aiReview|campaign\/|oops|source\/siblingSource/.test(specifier)) {
      fail(`review write authority reaches outside its cone: ${specifier}`);
    }
  }
  if (!/new ReviewStore\(/.test(writeCode)) fail('review write authority does not own a review store');
  if (/PrivateArtifactStore/.test(writeCode)) fail('review write authority bypasses the review store to reach the raw private store');

  // --- nothing in the cone can publish externally ---
  for (const [label, code] of [['review store', storeCode], ['review write authority', writeCode], ['review binding', withoutComments(binding)]]) {
    if (/slack|leslie|pondr|notion|webhook|https?:\/\//i.test(code)) fail(`${label} references an external publication destination`);
    if (/\.publish\s*\(/.test(code)) fail(`${label} reaches a publication method`);
  }

  // --- the read path stays pure and page-bounded ---
  const reviewerCode = withoutComments(reviewerAuthority);
  for (const forbidden of ['node:fs', 'node:child_process', 'node:net', 'node:http']) {
    if (reviewerCode.includes(`'${forbidden}'`)) fail(`reviewer authority must not hold ${forbidden} authority`);
  }
  if (/\bfs\./.test(reviewerCode) || /ReviewStore/.test(reviewerCode)) fail('reviewer authority holds persistence authority instead of receiving a lookup');
  if (!/localReviewLookup/.test(reviewerCode)) fail('reviewer authority has no persisted-review lookup seam');
  // The lookup must be invoked inside the per-row projection, not over the
  // whole corpus: a corpus-wide call would reintroduce the cost M5 removed.
  const projectStart = reviewerCode.indexOf('function projectEntry(');
  if (projectStart < 0) fail('reviewer authority per-row projection could not be located');
  const projectBody = reviewerCode.slice(projectStart);
  if (!/lookupLocalReview\(entry\.dossier\)/.test(projectBody)) fail('persisted review lookup is not performed per rendered row');

  // --- the binding builder is shared, not duplicated ---
  if (!/reviewBindingFor/.test(writeCode)) fail('review write authority does not use the shared binding builder');
  const collector = read('src/controlCenter/server/defaultCollector.ts');
  // Both the CALL and the IMPORT are refused. An unused import derives
  // nothing on its own, but it is the visible precursor to a second
  // derivation, and forbidding only the call leaves the boundary one line
  // away from being crossed silently.
  if (/findingArtifactDigest/.test(collector)) fail('the collector reaches a review-binding digest primitive of its own');
  if (/reviewBindingFor\s*\(|currentReviewArtifacts\s*\(/.test(collector)) fail('the collector derives a review binding of its own');
}

/**
 * NW-AUD-018 — authenticated evidence minimization integrity.
 *
 * Four mechanically-proven boundaries:
 *   1. the TOTAL writer census (every run-root/artifacts publisher claimed
 *      by exactly one closed-registry entry; unknown/stale/duplicate/empty
 *      fail closed);
 *   2. RunRecorder's ONE final typed persistence firewall (closed kinds,
 *      reader-pinned byte budgets, structural+text screens) immediately
 *      before every publication, with a single write chokepoint;
 *   3. the verify-then-tighten authenticated mode transition completing
 *      BEFORE the flag flips, plus the categorical finalize forms;
 *   4. provenance-bound route identity — the lexical identifier heuristic
 *      must never return, and every unproven path reduces to the marker.
 */
export function checkAuthenticatedEvidenceFirewall() {
  const production = gitFiles()
    .filter((file) => /\.(?:ts|mjs)$/.test(file))
    .filter((file) => !file.endsWith('.d.ts') && !file.endsWith('.d.mts'));
  const census = buildAuthenticatedWriterCensus(production.map((file) => ({ file, source: read(file) })));
  for (const violation of census.violations) {
    fail(`authenticated writer census ${violation.code}: ${violation.file} :: ${violation.detail}`);
  }
  if (census.writerCount < 8) {
    fail(`authenticated writer census found only ${census.writerCount} writers; discovery is broken rather than the repository clean`);
  }
  if (census.productionWriterCount < 6) {
    fail(`authenticated writer census found only ${census.productionWriterCount} production writers`);
  }
  if (!/^sha256:[0-9a-f]{24}$/.test(census.digest)) fail('authenticated writer census digest is malformed');
  for (const klass of WRITER_CLASSES) {
    if (!Object.prototype.hasOwnProperty.call(census.byClass, klass)) {
      fail(`authenticated writer census class map is missing ${klass}`);
    }
  }
  const byFile = new Map(census.writers.map((writer) => [writer.file, writer.class]));
  if (byFile.get('src/core/evidence/runRecorder.ts') !== 'RECORDER_FIREWALLED') {
    fail('the run recorder must be the registered RECORDER_FIREWALLED publisher');
  }

  const recorder = read('src/core/evidence/runRecorder.ts');
  // One final firewall: closed kind vocabulary, called at the rewrite
  // chokepoint and on the event hot path.
  for (const required of [
    'RUN_EVIDENCE_FIREWALL_LIMITS',
    'this.firewall(kind, value, serialized)',
    "this.firewall('events', ev, line)",
  ]) {
    if (!recorder.includes(required)) fail(`run recorder is missing the firewall boundary element: ${required}`);
  }
  // Single write chokepoint: no path-target writeFileSync outside the
  // temporary-descriptor publication, exactly one append site.
  const strayWrites = [...recorder.matchAll(/fs\.writeFileSync\((?!descriptor)/g)].length;
  if (strayWrites > 0) fail(`run recorder bypasses publishJson with ${strayWrites} direct path-target writeFileSync call(s)`);
  const appendSites = [...recorder.matchAll(/fs\.appendFileSync\(/g)].length;
  if (appendSites !== 1) fail(`run recorder must append through exactly one hardened appendLine site, found ${appendSites}`);
  if (!recorder.includes('this.assertPublishTarget(file);\n    fs.appendFileSync')) {
    fail('the append chokepoint must verify the publish target before appending');
  }
  if (!/fs\.openSync\(temporary, ['"]wx['"], 0o600\)/.test(recorder) || !recorder.includes('this.fsyncRunDirectory()')) {
    fail('run recorder publication must be wx/0600 + fsynced (private-equivalent primitive)');
  }
  // Shared structural key authority (collapses the parallel denylist).
  if (!recorder.includes('privateKeySensitivity(key)')) {
    fail('authenticated sanitization must use the shared structural key authority');
  }
  // Categorical finalize: writer and reader share one reason vocabulary and
  // the free-form note never persists.
  if (!recorder.includes('KNOWN_RUN_FAILURE_REASONS')) fail('finalize must classify reasons through the shared closed vocabulary');
  if (!recorder.includes("'[REDACTED_HARD_FAILURE]'")) fail('authenticated finalize must persist the categorical hard-failure message');
  if (!recorder.includes("'RUN_NOTE_PRESENT'")) fail('authenticated finalize must collapse notes to the categorical token');
  // Verify-then-tighten transition before the flag flips, and the ambiguity
  // refusal vocabulary.
  if (!recorder.includes('this.hardenAuthenticatedDirectory();')) {
    fail('a late authenticated transition must harden the directory before flipping the mode');
  }
  const hardenAt = recorder.indexOf('this.hardenAuthenticatedDirectory();');
  const flipAt = recorder.indexOf('this.authenticated = true;');
  if (hardenAt < 0 || flipAt < 0 || hardenAt > flipAt) {
    fail('the hardening transaction must complete BEFORE the authenticated flag flips');
  }
  for (const required of ['AUTHENTICATED_EVIDENCE_TRANSITION_UNSAFE', 'AUTHENTICATED_MANIFEST_KEY_UNSAFE']) {
    if (!recorder.includes(required)) fail(`run recorder is missing the categorical refusal ${required}`);
  }

  // Provenance-bound route identity: the lexical heuristic must never return.
  const redaction = read('src/core/safety/redaction.ts');
  if (redaction.includes('looksLikeIdentifier')) {
    fail('lexical identifier guessing must not reappear in authenticated URL persistence (NW-AUD-018)');
  }
  for (const required of [
    'UNKNOWN_ROUTE_MARKER',
    'this.provenRoutes.match(pathname)',
    'parsed.username',
    '? `${parsed.origin}${UNKNOWN_ROUTE_MARKER}`',
  ]) {
    if (!redaction.includes(required)) fail(`authenticated URL persistence is missing ${required}`);
  }
  const proven = read('src/core/safety/provenRoutes.ts');
  for (const required of ['UNKNOWN_ROUTE_MARKER', 'PROVEN_ROUTE_PATTERN_UNANCHORED', 'PROVEN_ROUTE_EMIT_UNSAFE', 'MAX_PROVEN_ROUTE_ENTRIES']) {
    if (!proven.includes(required)) fail(`the proven route table is missing ${required}`);
  }
  const declarations = read('src/core/schemaLifecycle/declarations.ts');
  if (!declarations.includes("family: 'nightwatch.proven-route-table'")) {
    fail('nightwatch.proven-route-table must be a declared schema family');
  }
}
