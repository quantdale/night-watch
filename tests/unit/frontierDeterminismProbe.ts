// Fresh-process determinism probe (not a test file — no .test.ts suffix, so
// the runner never collects it). Prints one semantic digest over the frontier
// cones' critical pure outputs. `bin/frontier-determinism.mjs` runs it in N
// fresh OS processes and requires exactly one unique digest.

import crypto from 'node:crypto';
import {
  classifyRelationship,
  relationshipDigest,
  classifyRecurrence,
  groupDefectClasses,
  defectClassDigest,
  strongestProvenance,
  type IntelFindingDescriptor,
} from '../../src/core/findingIntel/index';
import { findingArtifactDigest } from '../../src/core/findingReview/index';
import { runC12LocalRehearsal, type C12RehearsalInput } from '../../src/core/c12Rehearsal/index';
import { releaseFreshnessReport, type ReleaseAncestryOracle } from '../../src/core/changeIntelligence/releaseFreshness';
import { evaluateKeyCoverage, extractConsumerKeyShapes, extractProducerPatterns } from '../../src/core/source/cacheKeyShapes';
import { extractRecordIdentityFacts } from '../../src/core/source/recordIdentityShapes';
import { runRecordIdentitySequences } from '../../src/core/source/recordIdentitySequences';
import { runRecordIdentityContracts } from '../../src/core/source/recordIdentity';
import { classifyPhpTestFile } from '../../src/core/source/testOracleQuality';
import { runSilentZeroOutput } from '../../src/core/source/silentZeroOutput';

function descriptor(
  findingId: string,
  fingerprint: string | null,
  expectationId: string | null,
  semanticContractId: string | null,
): IntelFindingDescriptor {
  return {
    findingId,
    fingerprint,
    expectationId,
    semanticContractId,
    failureSignature: 'sig.rounding',
    route: '/billing/invoice',
    sourceLineage: 'lineage.billing',
    replayOutcome: 'FAILURE',
  };
}

const first = descriptor('finding.a', 'fp:sha256:aaaaaaaaaaaa', 'exp.invoice-total', 'contract.invoice');
const second = descriptor('finding.b', 'fp:sha256:aaaaaaaaaaaa', 'exp.invoice-total', 'contract.invoice');
const third = descriptor('finding.c', 'fp:sha256:bbbbbbbbbbbb', 'exp.tooltip', 'contract.invoice');

const parts: string[] = [];

// Relationships: identity, digest, and the UNRELATED/UNKNOWN edges.
parts.push(JSON.stringify(classifyRelationship(first, second)));
parts.push(relationshipDigest(classifyRelationship(first, second)));
parts.push(JSON.stringify(classifyRelationship(first, third)));
parts.push(relationshipDigest(classifyRelationship(first, third)));

// Recurrence bound to mechanical chronology.
parts.push(JSON.stringify(classifyRecurrence(
  {
    findingId: 'finding.a',
    fingerprint: 'fp:sha256:aaaaaaaaaaaa',
    campaignId: 'campaign.two',
    observedAtMs: 2_000_000,
  },
  [{
    findingId: 'finding.z',
    fingerprint: 'fp:sha256:aaaaaaaaaaaa',
    campaignId: 'campaign.one',
    observedAtMs: 1_000_000,
    sourceSha: 'synthetic.one',
    priorOutcome: 'RESOLVED_FIXED',
  }],
)));

// Defect classes and provenance ranking.
const classes = groupDefectClasses([
  { findingId: 'finding.a', semanticContractId: 'contract.currency-rounding', expectationId: 'exp.invoice-total', sourceScope: 'service.billing', replayOutcome: 'FAILURE' },
  { findingId: 'finding.b', semanticContractId: 'contract.currency-rounding', expectationId: 'exp.invoice-total', sourceScope: 'service.billing', replayOutcome: 'FAILURE' },
  { findingId: 'finding.c', semanticContractId: 'contract.currency-rounding', expectationId: 'exp.tax', sourceScope: 'service.billing', replayOutcome: 'INVALID' },
]);
parts.push(JSON.stringify(classes));
parts.push(JSON.stringify(classes.map((entry) => defectClassDigest(entry))));
parts.push(strongestProvenance(['HEURISTIC', 'MACHINE_CONTRACT', 'UNKNOWN']));

// Review artifact digest must be key-order stable.
parts.push(findingArtifactDigest({ beta: 1, alpha: { z: 1, a: 2 }, list: [3, 1, 2] }));
parts.push(findingArtifactDigest({ list: [3, 1, 2], alpha: { a: 2, z: 1 }, beta: 1 }));

// C-12 rehearsal receipts across every scenario.
const rehearsalInput = (scenario: C12RehearsalInput['scenario']): C12RehearsalInput => ({
  implementationSha: '0123456789abcdef0123456789abcdef01234567',
  pqReceiptDigest: `receipt:sha256:${'ab'.repeat(32)}`,
  campaignId: 'campaign/c12-rehearsal-001',
  scenario,
  baseNowMs: 1_786_000_000_000,
});
for (const scenario of ['CLEAN_PASSIVE'] as const) {
  parts.push(JSON.stringify(runC12LocalRehearsal(rehearsalInput(scenario))));
}


// NW-HIST-008 Wave 1: the release-freshness report identity must not depend on
// process state (locale, timezone, hash seed). One declared row and one
// injected oracle; the digest covers the sanitized report only.
const probeFixSha = 'a'.repeat(40);
const probeTipSha = 'b'.repeat(40);
const probeOracle: ReleaseAncestryOracle = {
  pin: () => ({ state: 'AVAILABLE', sha: probeFixSha }),
  ref: (_repoId, ref) => ({ state: 'AVAILABLE', sha: ref.endsWith('/master') ? probeFixSha : probeTipSha }),
  ancestor: (_repoId, _fixSha, refTipSha) => (refTipSha === probeFixSha ? 'CONTAINED' : 'NOT_CONTAINED'),
};
const probeReport = releaseFreshnessReport(
  {
    schemaVersion: 'nightwatch.release-refs.v1',
    rows: [{
      rowId: 'probe-row',
      repoId: 'mobingilabs/ouchan',
      fixSha: probeFixSha,
      integrationRef: 'refs/heads/master',
      releaseRefs: ['refs/heads/next', 'refs/heads/production'],
      servicePaths: ['services/probe'],
      exclusions: [],
      deployFromIntegration: false,
      cherryPickModel: false,
    }],
  },
  probeOracle,
);
parts.push(JSON.stringify(probeReport));
parts.push(probeReport.reportDigest);


// NW-HIST-005 Wave 1 (Phase 1a): the cache-key shape extraction, canonical
// digests, and coverage verdicts must not depend on process state.
const probePhpSource = [
  '<?php',
  'class Cache {',
  '  public function getUserHash(string $key): array {',
  "    $k = implode(':', [getenv(API_NEV), 'ripple-api', 'user', $this->cahceid]);",
  '    return [$k];',
  '  }',
  '}',
].join('\n');
const probeGoSource = [
  'package probe',
  '',
  'import "fmt"',
  '',
  'func clearRippleUserCache(mspID string) {',
  '  pattern := fmt.Sprintf("%s:ripple-api:user:%s*", runEnv, mspID)',
  '  _ = pattern',
  '}',
].join('\n');
const probeConsumer = extractConsumerKeyShapes(probePhpSource, { functions: ['getUserHash'], namespace: 'ripple-api' });
const probeProducer = extractProducerPatterns(probeGoSource, { functions: ['clearRippleUserCache'], namespace: 'ripple-api', delimiter: ':', envToken: 'runEnv' });
parts.push(JSON.stringify(probeConsumer));
parts.push(JSON.stringify(probeProducer));
parts.push(JSON.stringify(evaluateKeyCoverage({
  shapes: probeConsumer.shapes,
  patterns: probeProducer.patterns,
  envMap: { producerEnvToken: 'runEnv', pairs: [{ producer: 'prod', consumer: 'production' }] },
  exclusions: [],
})));


// NW-HIST-004 Wave 2: record-identity extraction, sequences, and report digest.
const probeRiSource = [
  'package probe',
  '',
  'func CreateRecordA(id string) string {',
  '  return fmt.Sprintf("company_id|%s|account_id|%s", id, "x")',
  '}',
  'func CreateRecordB(id string) string {',
  '  return fmt.Sprintf("account_id|%s|company_id|%s", "x", id)',
  '}',
].join('\n');
const probeRiFacts = extractRecordIdentityFacts(probeRiSource, { functions: ['CreateRecordA', 'CreateRecordB'] });
parts.push(JSON.stringify(probeRiFacts));
const probeRiContract = {
  contractId: 'probe-record-identity',
  repoId: 'mobingilabs/ouchan',
  sha: 'a'.repeat(40),
  roots: ['services'],
  paths: ['services/probe.go'],
  functions: ['CreateRecordA', 'CreateRecordB'],
  logicalIdentitySegments: ['company_id', 'account_id'],
  consistencyModel: 'EVENTUAL_READ_THEN_UNCONDITIONAL_WRITE' as const,
  expectedLifecycle: 'CREATE_ONCE_THEN_IDENTITY_STABLE' as const,
  failureSemantics: 'NONE' as const,
  derivedRecordCount: 0,
  exclusions: [],
};
parts.push(JSON.stringify(runRecordIdentitySequences(probeRiContract, probeRiFacts.functions)));
const probeRiReport = runRecordIdentityContracts({
  config: { schemaVersion: 'nightwatch.record-identity-contracts.v1' as const, contracts: [probeRiContract] },
  reader: { readFile: (repoId, relativePath) => (repoId === 'mobingilabs/ouchan' && relativePath === 'services/probe.go' ? probeRiSource : null) },
  currentness: { currentSnapshot: (repoId) => (repoId === 'mobingilabs/ouchan' ? { repoId, sha: 'a'.repeat(40) } : null) },
});
parts.push(probeRiReport.reportDigest);


// NW-PROJ-010 Wave 2: the static test-oracle classifier must not depend on process state.
parts.push(JSON.stringify(classifyPhpTestFile(
  ['<?php', 'class ProbeTest extends TestCase', '{', '  public function testMirrors()', '  {', '    $this->assertTrue($this->helper());', '  }', '  private function helper(): bool', '  {', '    return true;', '  }', '}', ''].join('\n'),
  { path: 'tests/src/App/Handler/ProbeTest.php', declaredProductionSymbols: ['generateInvoice'], declaredSkips: [] },
)));


// NW-PROJ-003 Wave 2: the static silent-zero-output precursor must not depend on process state.
const probeSzoSource = ['<?php', 'class Fixture', '{', '  private function generate(string $id): void', '  {', '    if (empty($this->rows[$id])) {', '      return;', '    }', '    $this->insertTotal($id);', '  }', '}', ''].join('\n');
const probeSzoHandler = {
  handlerId: 'probe-handler', repoId: 'mobingilabs/ripple-api', sha: 'a'.repeat(40), roots: ['src'], paths: ['src/App/Handler/Fixture.php'], functions: ['generate'],
  requiredInputRoles: [{ role: 'rows', guardTokens: ['rows'] }, { role: 'fees', guardTokens: ['applied'] }], outputTokens: ['insertTotal'], legitimateSkipConditions: [],
};
parts.push(JSON.stringify(runSilentZeroOutput({
  config: { schemaVersion: 'nightwatch.silent-zero-output-contracts.v1', handlers: [probeSzoHandler] },
  reader: { readFile: (repoId, relativePath) => (repoId === 'mobingilabs/ripple-api' && relativePath === 'src/App/Handler/Fixture.php' ? probeSzoSource : null) },
  currentness: { currentSnapshot: (repoId) => (repoId === 'mobingilabs/ripple-api' ? { repoId, sha: 'a'.repeat(40) } : null) },
})));

process.stdout.write(`${crypto.createHash('sha256').update(parts.join(' ')).digest('hex')}\n`);
