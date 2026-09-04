// ---------------------------------------------------------------------------
// MA-8 / F-13 — the external-only P1 scope-config loader.
//
// Every integrity failure is falsified individually: each fault holds a fully
// valid file and breaks exactly one property. The positive path proves a
// well-formed external config loads with its allowlist, window, duration cap,
// destination, implementation binding, and value-free identity.
//
// Files live in os.tmpdir(), outside both roots. Mode discipline is asserted
// for real (chmod 0644 must fail). Hosts use `.invalid` names.
// ---------------------------------------------------------------------------

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { expect, test } from '@playwright/test';

import {
  P1_CONFIG_INTEGRITY_FAILURES,
  P1_MAX_OBSERVATION_WINDOW_MS,
  P1_SCOPE_CONFIG_SCHEMA,
  isAdmittedP1Host,
  loadP1ScopeConfig,
  type P1ConfigIntegrityFailure,
} from '../../src/core/prodObserveP1/scopeConfig';
import {
  P1_FIXTURE_HOST,
  P1_FIXTURE_SHA_A,
  P1_T0,
  P1_WINDOW_MS,
  p1Digest,
  writeP1ScopeConfigFile,
} from './support/p1Fixtures';

const ROOT = path.resolve(__dirname, '../..');

function freshWorkspaceRoot(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'nightwatch-p1-wsroot-'));
}

function loadValid(
  overrides?: Parameters<typeof writeP1ScopeConfigFile>[0],
): { readonly configPath: string } {
  const workspaceRoot = freshWorkspaceRoot();
  const { configPath } = writeP1ScopeConfigFile({ repositoryRoot: ROOT, workspaceRoot, ...overrides });
  process.env.NIGHTWATCH_P1_SCOPE_CONFIG = configPath;
  return { configPath };
}

test.beforeEach(() => {
  delete process.env.NIGHTWATCH_P1_SCOPE_CONFIG;
});

test('positive path: loads, binds, and carries no host value in its identity', () => {
  const workspaceRoot = freshWorkspaceRoot();
  const { configPath } = writeP1ScopeConfigFile({ repositoryRoot: ROOT, workspaceRoot });
  process.env.NIGHTWATCH_P1_SCOPE_CONFIG = configPath;
  const loaded = loadP1ScopeConfig({ repositoryRoot: ROOT, workspaceRoot, digest: p1Digest });
  expect(loaded.ok).toBe(true);
  if (!loaded.ok) throw new Error('unreachable');
  expect(loaded.config.schemaVersion).toBe(P1_SCOPE_CONFIG_SCHEMA);
  expect(loaded.config.admittedHost).toBe(P1_FIXTURE_HOST);
  expect(loaded.config.observationWindow).toEqual({ notBeforeMs: P1_T0, notAfterMs: P1_T0 + P1_WINDOW_MS });
  expect(loaded.config.maxObservationDurationMs).toBe(P1_WINDOW_MS);
  expect(loaded.config.expectedImplementationSha).toBe(P1_FIXTURE_SHA_A);
  expect(loaded.config.configIdentity.startsWith('p1scopecfg:')).toBe(true);
  expect(isAdmittedP1Host(loaded.config, P1_FIXTURE_HOST)).toBe(true);
  expect(isAdmittedP1Host(loaded.config, P1_FIXTURE_HOST.toUpperCase())).toBe(true);
  expect(isAdmittedP1Host(loaded.config, 'other.invalid')).toBe(false);
  expect(isAdmittedP1Host(loaded.config, '')).toBe(false);
});

test('the duration cap is a real bound', () => {
  expect(P1_MAX_OBSERVATION_WINDOW_MS).toBe(900_000);
});

interface ConfigFault {
  readonly name: string;
  readonly failure: P1ConfigIntegrityFailure;
  readonly setup: (workspaceRoot: string) => void;
}

const FAULTS: ConfigFault[] = [
  {
    name: 'env absent',
    failure: 'P1_CONFIG_ENV_ABSENT',
    setup: () => {
      delete process.env.NIGHTWATCH_P1_SCOPE_CONFIG;
    },
  },
  {
    name: 'relative path',
    failure: 'P1_CONFIG_PATH_NOT_ABSOLUTE',
    setup: () => {
      process.env.NIGHTWATCH_P1_SCOPE_CONFIG = 'relative/p1scope.json';
    },
  },
  {
    name: 'config inside the repository',
    failure: 'P1_CONFIG_INSIDE_REPOSITORY',
    setup: () => {
      // Under the gitignored run-artifacts root: still inside the repository
      // for the loader, invisible to Git.
      const directory = fs.mkdtempSync(path.join(ROOT, 'artifacts', 'p1-cfg-'));
      const configPath = path.join(directory, 'p1scope.json');
      const valid = writeP1ScopeConfigFile({ repositoryRoot: ROOT, workspaceRoot: freshWorkspaceRoot() });
      fs.copyFileSync(valid.configPath, configPath);
      fs.chmodSync(configPath, 0o600);
      process.env.NIGHTWATCH_P1_SCOPE_CONFIG = configPath;
    },
  },
  {
    name: 'config inside the workspace',
    failure: 'P1_CONFIG_INSIDE_WORKSPACE',
    setup: (workspaceRoot) => {
      const { configPath } = writeP1ScopeConfigFile({ repositoryRoot: ROOT, workspaceRoot });
      const inner = path.join(workspaceRoot, 'p1scope.json');
      fs.copyFileSync(configPath, inner);
      fs.chmodSync(inner, 0o600);
      process.env.NIGHTWATCH_P1_SCOPE_CONFIG = inner;
    },
  },
  {
    name: 'config not found',
    failure: 'P1_CONFIG_NOT_FOUND',
    setup: () => {
      process.env.NIGHTWATCH_P1_SCOPE_CONFIG = path.join(os.tmpdir(), 'nightwatch-p1-missing-scope.json');
    },
  },
  {
    name: 'symlink refused',
    failure: 'P1_CONFIG_SYMLINK',
    setup: (workspaceRoot) => {
      const { configPath } = writeP1ScopeConfigFile({ repositoryRoot: ROOT, workspaceRoot });
      const link = `${configPath}.link`;
      try {
        fs.symlinkSync(configPath, link);
      } catch {
        return;
      }
      process.env.NIGHTWATCH_P1_SCOPE_CONFIG = link;
    },
  },
  {
    name: 'directory refused',
    failure: 'P1_CONFIG_NOT_REGULAR_FILE',
    setup: () => {
      process.env.NIGHTWATCH_P1_SCOPE_CONFIG = fs.mkdtempSync(path.join(os.tmpdir(), 'nightwatch-p1-scope-dir-'));
    },
  },
  {
    name: 'group-readable mode refused',
    failure: 'P1_CONFIG_MODE_NOT_OWNER_ONLY',
    setup: (workspaceRoot) => {
      const { configPath } = writeP1ScopeConfigFile({
        repositoryRoot: ROOT,
        workspaceRoot,
        mode: 0o640,
      });
      process.env.NIGHTWATCH_P1_SCOPE_CONFIG = configPath;
    },
  },
  {
    name: 'unreadable file',
    failure: 'P1_CONFIG_UNREADABLE',
    setup: (workspaceRoot) => {
      // Mode 000 passes the owner-only check (no group/world bits) but the
      // owner cannot read it either, so the read fails closed.
      const { configPath } = writeP1ScopeConfigFile({
        repositoryRoot: ROOT,
        workspaceRoot,
        mode: 0o000,
      });
      process.env.NIGHTWATCH_P1_SCOPE_CONFIG = configPath;
    },
  },
  {
    name: 'malformed JSON',
    failure: 'P1_CONFIG_MALFORMED',
    setup: (workspaceRoot) => {
      const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'nightwatch-p1-scope-'));
      const configPath = path.join(directory, 'p1scope.json');
      fs.writeFileSync(configPath, '{not json');
      fs.chmodSync(configPath, 0o600);
      void workspaceRoot;
      process.env.NIGHTWATCH_P1_SCOPE_CONFIG = configPath;
    },
  },
  {
    name: 'unsupported schema',
    failure: 'P1_CONFIG_SCHEMA_UNSUPPORTED',
    setup: (workspaceRoot) => {
      const { configPath } = writeP1ScopeConfigFile({
        repositoryRoot: ROOT,
        workspaceRoot,
        mutate: (body) => {
          body.schemaVersion = 'nightwatch.something-else.v9';
        },
      });
      process.env.NIGHTWATCH_P1_SCOPE_CONFIG = configPath;
    },
  },
  {
    name: 'wildcard host refused',
    failure: 'P1_CONFIG_HOST_INVALID',
    setup: (workspaceRoot) => {
      const { configPath } = writeP1ScopeConfigFile({
        repositoryRoot: ROOT,
        workspaceRoot,
        mutate: (body) => {
          body.admittedHost = '*.invalid';
        },
      });
      process.env.NIGHTWATCH_P1_SCOPE_CONFIG = configPath;
    },
  },
  {
    name: 'host with port refused',
    failure: 'P1_CONFIG_HOST_INVALID',
    setup: (workspaceRoot) => {
      const { configPath } = writeP1ScopeConfigFile({
        repositoryRoot: ROOT,
        workspaceRoot,
        mutate: (body) => {
          body.admittedHost = 'p1-scope-fixture.invalid:443';
        },
      });
      process.env.NIGHTWATCH_P1_SCOPE_CONFIG = configPath;
    },
  },
  {
    name: 'host with scheme refused',
    failure: 'P1_CONFIG_HOST_INVALID',
    setup: (workspaceRoot) => {
      const { configPath } = writeP1ScopeConfigFile({
        repositoryRoot: ROOT,
        workspaceRoot,
        mutate: (body) => {
          body.admittedHost = 'https://p1-scope-fixture.invalid';
        },
      });
      process.env.NIGHTWATCH_P1_SCOPE_CONFIG = configPath;
    },
  },
  {
    name: 'traversal in literal path',
    failure: 'P1_CONFIG_PATH_TRAVERSAL',
    setup: (_workspaceRoot) => {
      // String concatenation, NOT path.join: join would normalize the `..`
      // away before the loader ever sees the literal request.
      process.env.NIGHTWATCH_P1_SCOPE_CONFIG = `${os.tmpdir()}/../p1scope.json`;
    },
  },
  {
    name: 'inverted window refused',
    failure: 'P1_CONFIG_WINDOW_INVALID',
    setup: (workspaceRoot) => {
      const { configPath } = writeP1ScopeConfigFile({
        repositoryRoot: ROOT,
        workspaceRoot,
        notBeforeMs: P1_T0 + 1000,
        notAfterMs: P1_T0,
      });
      process.env.NIGHTWATCH_P1_SCOPE_CONFIG = configPath;
    },
  },
  {
    name: 'excessive window refused at load',
    failure: 'P1_CONFIG_WINDOW_EXCESSIVE',
    setup: (workspaceRoot) => {
      const { configPath } = writeP1ScopeConfigFile({
        repositoryRoot: ROOT,
        workspaceRoot,
        notBeforeMs: P1_T0,
        notAfterMs: P1_T0 + P1_MAX_OBSERVATION_WINDOW_MS + 1,
      });
      process.env.NIGHTWATCH_P1_SCOPE_CONFIG = configPath;
    },
  },
  {
    name: 'excessive duration cap refused at load',
    failure: 'P1_CONFIG_WINDOW_EXCESSIVE',
    setup: (workspaceRoot) => {
      const { configPath } = writeP1ScopeConfigFile({
        repositoryRoot: ROOT,
        workspaceRoot,
        maxObservationDurationMs: P1_MAX_OBSERVATION_WINDOW_MS + 1,
      });
      process.env.NIGHTWATCH_P1_SCOPE_CONFIG = configPath;
    },
  },
  {
    name: 'relative destination refused',
    failure: 'P1_CONFIG_DESTINATION_INVALID',
    setup: (workspaceRoot) => {
      const { configPath } = writeP1ScopeConfigFile({
        repositoryRoot: ROOT,
        workspaceRoot,
        evidenceDestination: 'relative/evidence',
      });
      process.env.NIGHTWATCH_P1_SCOPE_CONFIG = configPath;
    },
  },
  {
    name: 'destination inside the repository refused',
    failure: 'P1_CONFIG_DESTINATION_INVALID',
    setup: (workspaceRoot) => {
      const { configPath } = writeP1ScopeConfigFile({
        repositoryRoot: ROOT,
        workspaceRoot,
        evidenceDestination: path.join(ROOT, 'artifacts-p1-evidence'),
      });
      process.env.NIGHTWATCH_P1_SCOPE_CONFIG = configPath;
    },
  },
  {
    name: 'malformed implementation SHA refused',
    failure: 'P1_CONFIG_IMPLEMENTATION_IDENTITY_INVALID',
    setup: (workspaceRoot) => {
      const { configPath } = writeP1ScopeConfigFile({
        repositoryRoot: ROOT,
        workspaceRoot,
        expectedImplementationSha: 'not-a-sha',
      });
      process.env.NIGHTWATCH_P1_SCOPE_CONFIG = configPath;
    },
  },
];

for (const fault of FAULTS) {
  test(`refuses: ${fault.name}`, () => {
    const workspaceRoot = freshWorkspaceRoot();
    // A valid file exists first, so the fault — not a missing setup — denies.
    if (fault.name !== 'env absent' && fault.name !== 'config inside the repository') {
      loadValid();
    }
    fault.setup(workspaceRoot);
    const loaded = loadP1ScopeConfig({ repositoryRoot: ROOT, workspaceRoot, digest: p1Digest });
    expect(loaded.ok).toBe(false);
    if (loaded.ok) throw new Error('unreachable');
    expect(loaded.failure).toBe(fault.failure);
  });
}

test('every declared integrity failure is falsified above', () => {
  const covered = new Set(FAULTS.map((fault) => fault.failure));
  for (const failure of P1_CONFIG_INTEGRITY_FAILURES) {
    expect(covered.has(failure)).toBe(true);
  }
});
