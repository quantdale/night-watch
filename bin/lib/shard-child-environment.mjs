// @ts-check

import os from 'node:os';
import path from 'node:path';
import { buildChildEnvironment } from '../child-environment.mjs';

const SHARD_IDS = new Set(['shard-1', 'shard-2', 'shard-3', 'shard-4', 'shard-5', 'shard-6', 'shard-7', 'shard-8', 'exclusive', 'serial']);
const PROXY_LEASE_KEYS = [
  'NIGHTWATCH_PROXY_PORT',
  'NIGHTWATCH_PROXY_LEASE_TOKEN',
  'NIGHTWATCH_PROXY_LEASE_PATH',
  'NIGHTWATCH_PROXY_LEASE_OWNER_PID',
];

/**
 * @param {string} runRoot
 * @param {string} shardId
 * @returns {string}
 */
export function shardTempRoot(runRoot, shardId) {
  if (!path.isAbsolute(runRoot)) throw new Error('SHARD_RUN_ROOT_NOT_ABSOLUTE');
  if (!SHARD_IDS.has(shardId)) throw new Error('SHARD_ID_INVALID');
  return path.join(runRoot, shardId);
}

/**
 * @param {NodeJS.ProcessEnv} parentEnvironment
 * @param {{ lane: string, receiptPath: string, shardId: string, runRoot: string, skipReportPath?: string }} input
 * @returns {NodeJS.ProcessEnv}
 */
export function buildShardChildEnvironment(parentEnvironment, input) {
  if (!path.isAbsolute(input.receiptPath)) throw new Error('SHARD_RECEIPT_PATH_NOT_ABSOLUTE');
  if (input.skipReportPath !== undefined && !path.isAbsolute(input.skipReportPath)) throw new Error('SHARD_SKIP_REPORT_PATH_NOT_ABSOLUTE');
  const tempRoot = shardTempRoot(input.runRoot, input.shardId);
  // VC-11 — preserve the AMBIENT temp root a child WITHOUT this shard
  // override would resolve: the parent's TMPDIR/TMP/TEMP when set, else the
  // system default. Budgets that must reflect the real campaign/gate context
  // (e.g. the Chromium sun_path budget) read NIGHTWATCH_AMBIENT_TMPDIR; the
  // shard's own TMPDIR below is test infrastructure, never that context.
  // Trailing slashes are stripped so length arithmetic matches path.join.
  const ambientTmpdir = (parentEnvironment.TMPDIR ?? parentEnvironment.TEMP ?? parentEnvironment.TMP ?? os.tmpdir()).replace(/[\\/]+$/, '') || '/';
  const proxyLeaseDir = path.join(input.runRoot, 'proxy-port-leases');
  const environment = buildChildEnvironment(parentEnvironment, {
    NIGHTWATCH_ENV: 'local',
    NIGHTWATCH_GATE_ENVIRONMENT: 'SHARDS',
    NIGHTWATCH_TIMING_LANE: input.lane,
    NIGHTWATCH_SHARD_RECEIPT_PATH: input.receiptPath,
    NIGHTWATCH_SHARD_ID: input.shardId,
    NIGHTWATCH_SHARD_TEMP_ROOT: tempRoot,
    NIGHTWATCH_AMBIENT_TMPDIR: ambientTmpdir,
    NIGHTWATCH_PROXY_LEASE_DIR: proxyLeaseDir,
    NIGHTWATCH_SKIP_REPORT_PATH: input.skipReportPath ?? '',
    NODE_OPTIONS: '--expose-gc',
  });
  environment.TMPDIR = tempRoot;
  environment.TEMP = tempRoot;
  environment.TMP = tempRoot;
  environment.TZ = 'UTC';
  environment.LC_ALL = 'C';
  environment.LANG = 'C';
  environment.NO_COLOR = '1';
  environment.NIGHTWATCH_HEADED = '0';
  for (const key of PROXY_LEASE_KEYS) delete environment[key];
  return environment;
}

