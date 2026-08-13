// ---------------------------------------------------------------------------
// Phase 7 atomic owner-only manifest/checkpoint storage.
// ---------------------------------------------------------------------------

import fs from 'node:fs';
import path from 'node:path';
import { assertOwnerPolicyAllows } from '../policy/ownerScope';
import { PrivateArtifactStore } from '../policy/privateArtifacts';
import { assertManifestCompatible, validateCampaignManifest } from './identity';
import type { CampaignCheckpoint, CampaignManifest } from './types';

function fileStem(campaignId: string): string {
  if (!/^campaign:sha256:[a-f0-9]{24}$/i.test(campaignId)) throw new Error('CAMPAIGN_ID_INVALID');
  return campaignId.replaceAll(':', '-');
}
function readWrapper<T>(filePath: string, key: string): T {
  const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8')) as Record<string, unknown>;
  const value = parsed[key];
  if (value === null || typeof value !== 'object') throw new Error(`CAMPAIGN_ARTIFACT_INVALID:${key}`);
  return value as T;
}

export class CampaignCheckpointStore {
  readonly store: PrivateArtifactStore;

  constructor(store = new PrivateArtifactStore()) {
    this.store = store;
  }

  writeManifest(manifest: CampaignManifest): string {
    assertOwnerPolicyAllows('PRIVATE_EVIDENCE');
    validateCampaignManifest(manifest);
    return this.store.writeJson(`${fileStem(manifest.campaignId)}.manifest.json`, { manifest });
  }

  writeCheckpoint(checkpoint: CampaignCheckpoint): string {
    assertOwnerPolicyAllows('PRIVATE_EVIDENCE');
    if (!/^nightwatch\.campaign-checkpoint\.private\.v1$/.test(checkpoint.schemaVersion)) throw new Error('CAMPAIGN_CHECKPOINT_SCHEMA_INVALID');
    if (!/^campaign:sha256:[a-f0-9]{24}$/i.test(checkpoint.campaignId)) throw new Error('CAMPAIGN_ID_INVALID');
    return this.store.writeJson(`${fileStem(checkpoint.campaignId)}.checkpoint.json`, { checkpoint });
  }

  readManifest(campaignId: string): CampaignManifest {
    const filePath = path.join(this.store.root, `${fileStem(campaignId)}.manifest.json`);
    const manifest = readWrapper<CampaignManifest>(filePath, 'manifest');
    validateCampaignManifest(manifest);
    return manifest;
  }

  readCheckpoint(campaignId: string, manifest?: CampaignManifest): CampaignCheckpoint {
    const filePath = path.join(this.store.root, `${fileStem(campaignId)}.checkpoint.json`);
    const checkpoint = readWrapper<CampaignCheckpoint>(filePath, 'checkpoint');
    if (manifest !== undefined) assertManifestCompatible(manifest, checkpoint);
    return checkpoint;
  }

  paths(campaignId: string): { readonly manifest: string; readonly checkpoint: string } {
    const stem = fileStem(campaignId);
    return {
      manifest: path.join(this.store.root, `${stem}.manifest.json`),
      checkpoint: path.join(this.store.root, `${stem}.checkpoint.json`),
    };
  }
}
