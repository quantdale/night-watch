import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildSourceReviewQueue, type SourceReviewQueue } from '../../src/core/source/review';
import { createSiblingSourceAccess, type SiblingSourceAccess } from '../../src/core/source/siblingSource';
import { createRealSourceScanConfig } from '../../src/core/source/scan';
import type { RealSourceScanConfig } from '../../src/core/source/scanTypes';
import {
  analyzeSourceSurfacesIntoPhase24,
  discoverSourceSurfaces,
  type SourcePhase24Integration,
  type SourceSurfaceDiscovery,
} from '../../src/core/source/surfaces';

/** Synthetic source identity used only by the local parity fixture. */
export const SOURCE_PARITY_SHA = '27bb007ad0c798800b6bd3b29760c966422966e7';
const RAW_FIXTURE_MARKER = 'SYNTHETIC_RAW_FIXTURE_MARKER';

export interface SourceParityFixture {
  readonly root: string;
  readonly access: SiblingSourceAccess;
  readonly config: RealSourceScanConfig;
  readonly dispose: () => void;
}

export interface SourceParitySnapshot {
  readonly discovery: {
    readonly inventory: SourceSurfaceDiscovery['inventory'];
    readonly operations: SourceSurfaceDiscovery['operations'];
    readonly surfaces: SourceSurfaceDiscovery['surfaces'];
    readonly phase24Inputs: SourceSurfaceDiscovery['phase24Inputs'];
    readonly counters: SourceSurfaceDiscovery['counters'];
    readonly gapTaxonomy: SourceSurfaceDiscovery['gapTaxonomy'];
    readonly deterministicDigest: string;
  };
  readonly phase24: {
    readonly snapshotAnalyses: SourcePhase24Integration['snapshotAnalyses'];
    readonly portfolio: SourcePhase24Integration['portfolio'];
    readonly selection: SourcePhase24Integration['selection'];
    readonly eligibilityCensus: SourcePhase24Integration['eligibilityCensus'];
    readonly deterministicDigest: string;
  };
  readonly review: SourceReviewQueue;
}

export function createSourceParityFixture(): SourceParityFixture {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'nightwatch-source-parity-'));
  const repo = path.join(root, 'mobingilabs', 'ripple-api');
  const git = path.join(repo, '.git');
  fs.mkdirSync(path.join(git, 'refs', 'heads'), { recursive: true });
  fs.writeFileSync(path.join(git, 'HEAD'), 'ref: refs/heads/main\n');
  fs.writeFileSync(path.join(git, 'refs', 'heads', 'main'), `${SOURCE_PARITY_SHA}\n`);
  fs.mkdirSync(path.join(repo, 'src', 'App', 'Route', 'Config'), { recursive: true });
  fs.mkdirSync(path.join(repo, 'src', 'App', 'Handler'), { recursive: true });
  fs.mkdirSync(path.join(repo, 'src', 'App', 'Schema'), { recursive: true });
  fs.writeFileSync(path.join(repo, 'src', 'App', 'Route', 'Config', 'Routing.yaml'), [
    '"get:/accts":',
    '  client: App\\Handler\\Account',
    '  method: getAccountVendor',
    '  request: src/App/Schema/AccountRequest.json',
    '  response: src/App/Schema/AccountResponse.json',
    '"get:/alternate":',
    '  client: App\\Handler\\Account',
    '  method: getAlternate',
    '  request: src/App/Schema/AlternateRequest.json',
    '  response: src/App/Schema/AlternateResponse.json',
    '',
  ].join('\n'));
  fs.writeFileSync(path.join(repo, 'src', 'App', 'Handler', 'Account.php'), `<?php
function getAccountVendor($source) {
  $res[] = ['id' => 1, 'status' => 'safe'];
  return $res;
}
function getAlternate($source) {
  return ['alternate' => true, 'marker' => '${RAW_FIXTURE_MARKER}'];
}
`);
  fs.writeFileSync(path.join(repo, 'src', 'App', 'Schema', 'AccountRequest.json'), '{"type":"object","properties":{"page":{"type":"integer"}}}\n');
  fs.writeFileSync(path.join(repo, 'src', 'App', 'Schema', 'AccountResponse.json'), '{"type":"array","items":{"type":"object"}}\n');
  fs.writeFileSync(path.join(repo, 'src', 'App', 'Schema', 'AlternateRequest.json'), '{"type":"object","properties":{"cursor":{"type":"string"}}}\n');
  fs.writeFileSync(path.join(repo, 'src', 'App', 'Schema', 'AlternateResponse.json'), '{"type":"object","properties":{"alternate":{"type":"boolean"}}}\n');
  const config = createRealSourceScanConfig({
    runtimeMappingNamespace: 'ripple',
    approvedRepositories: [{
      repoId: 'mobingilabs/ripple-api',
      expectedSourceSha: SOURCE_PARITY_SHA,
      allowlistedRoots: ['src'],
      allowedExtensions: ['.php', '.json', '.yaml'],
      maxFiles: 64,
      maxFileBytes: 64_000,
      maxTotalBytes: 1_000_000,
    }],
  });
  return {
    root,
    access: createSiblingSourceAccess(root),
    config,
    dispose: () => fs.rmSync(root, { recursive: true, force: true }),
  };
}

/**
 * Project only safe, deterministic fields. `performance` is intentionally
 * absent: its elapsed timings are advisory and are not proof identity.
 */
export function captureSourceParity(input: { readonly access: SiblingSourceAccess; readonly config: RealSourceScanConfig; readonly maxCandidates?: number }): SourceParitySnapshot {
  const discovery = discoverSourceSurfaces({ access: input.access, config: input.config });
  const integration = analyzeSourceSurfacesIntoPhase24({ access: input.access, config: input.config, discovery, maxCandidates: input.maxCandidates ?? 6 });
  const review = buildSourceReviewQueue({ discovery, portfolio: integration.portfolio, selection: integration.selection });
  return {
    discovery: {
      inventory: discovery.inventory,
      operations: discovery.operations,
      surfaces: discovery.surfaces,
      phase24Inputs: discovery.phase24Inputs,
      counters: discovery.counters,
      gapTaxonomy: discovery.gapTaxonomy,
      deterministicDigest: discovery.deterministicDigest,
    },
    phase24: {
      snapshotAnalyses: integration.snapshotAnalyses,
      portfolio: integration.portfolio,
      selection: integration.selection,
      eligibilityCensus: integration.eligibilityCensus,
      deterministicDigest: integration.deterministicDigest,
    },
    review,
  };
}

export function sourceParityJson(snapshot: SourceParitySnapshot): string {
  return JSON.stringify(snapshot, null, 2);
}

/** Throw only a safe size/digest mismatch; raw source never enters the error. */
export function assertSourceParityEqual(left: SourceParitySnapshot, right: SourceParitySnapshot): void {
  const leftBytes = sourceParityJson(left);
  const rightBytes = sourceParityJson(right);
  if (leftBytes !== rightBytes) {
    throw new Error(`SOURCE_PARITY_MISMATCH:leftBytes=${Buffer.byteLength(leftBytes, 'utf8')}:rightBytes=${Buffer.byteLength(rightBytes, 'utf8')}`);
  }
}

export function sourceParityFixtureRawMarker(): string {
  return RAW_FIXTURE_MARKER;
}
