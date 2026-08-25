import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createSiblingSourceAccess } from '../../src/core/source/siblingSource';
import { createRealSourceScanConfig } from '../../src/core/source/scan';
import { createResponseFlowIndex, REAL_SOURCE_RESPONSE_FLOW_VERSION, resolveResponseFlow } from '../../src/core/source/responseFlow';
import { discoverSourceSurfaces } from '../../src/core/source/surfaces';

const SOURCE_SHA = '8'.repeat(40);
const OTHER_SHA = '9'.repeat(40);

function fixture(files: Readonly<Record<string, string>>): { readonly root: string; readonly access: ReturnType<typeof createSiblingSourceAccess>; readonly config: ReturnType<typeof createRealSourceScanConfig> } {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'nightwatch-response-binding-'));
  const repo = path.join(root, 'mobingilabs', 'ripple-api');
  fs.mkdirSync(path.join(repo, '.git', 'refs', 'heads'), { recursive: true });
  fs.writeFileSync(path.join(repo, '.git', 'HEAD'), 'ref: refs/heads/main\n');
  fs.writeFileSync(path.join(repo, '.git', 'refs', 'heads', 'main'), `${SOURCE_SHA}\n`);
  fs.mkdirSync(path.join(repo, 'src', 'App', 'Route', 'Config'), { recursive: true });
  fs.writeFileSync(path.join(repo, 'src', 'App', 'Route', 'Config', 'Routing.yaml'), [
    '"get:/read":',
    '  client: App\\Handler\\Reader',
    '  method: read',
    '',
  ].join('\n'));
  for (const [relativePath, sourceText] of Object.entries(files)) {
    const absolutePath = path.join(repo, relativePath);
    fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
    fs.writeFileSync(absolutePath, sourceText);
  }
  const config = createRealSourceScanConfig({
    runtimeMappingNamespace: 'ripple',
    approvedRepositories: [{
      repoId: 'mobingilabs/ripple-api',
      expectedSourceSha: SOURCE_SHA,
      allowlistedRoots: ['src'],
      allowedExtensions: ['.php', '.yaml'],
      maxFiles: 16,
      maxFileBytes: 64_000,
      maxTotalBytes: 1_000_000,
    }],
  });
  return { root, access: createSiblingSourceAccess(root), config };
}

function readSurface(input: { readonly root: string; readonly access: ReturnType<typeof createSiblingSourceAccess>; readonly config: ReturnType<typeof createRealSourceScanConfig> }) {
  const discovery = discoverSourceSurfaces({ access: input.access, config: input.config });
  return { discovery, surface: discovery.surfaces[0]! };
}

test.describe('exact response-flow declaration binding hardening', () => {
  test('keeps same-class and self calls confined to the originating file', () => {
    const input = fixture({
      'src/App/Handler/Reader.php': `<?php
class Reader {
  public function read() { return $this->payload(); }
}
`,
      'src/App/Handler/Other.php': `<?php
class Reader {
  private function payload() { return ['id' => 1]; }
}
`,
    });
    try {
      const { discovery, surface } = readSurface(input);
      expect(surface.contract.responseFlow?.status).toBe('REJECTED');
      expect(surface.contract.responseFlow?.rejectionCode).toBe('RESPONSE_SYMBOL_MISSING');
      expect(surface.contract.responseProof).not.toBe('PROVEN');
      expect(surface.contract.responseContractId).toBeNull();
      expect(JSON.stringify(discovery)).not.toContain("'id' => 1");
    } finally {
      fs.rmSync(input.root, { recursive: true, force: true });
    }
  });

  test('requires named static targets to be public static and supported', () => {
    const cases = [
      {
        name: 'non-static',
        helper: '<?php class Helper { public function payload() { return [\'id\' => 1]; } }\n',
      },
      {
        name: 'protected static',
        helper: '<?php class Helper { protected static function payload() { return [\'id\' => 1]; } }\n',
      },
      {
        name: 'private static',
        helper: '<?php class Helper { private static function payload() { return [\'id\' => 1]; } }\n',
      },
      {
        name: 'unsupported class',
        helper: '<?php class Helper extends Base { public static function payload() { return [\'id\' => 1]; } }\n',
      },
      {
        name: 'namespaced class',
        helper: '<?php namespace App; class Helper { public static function payload() { return [\'id\' => 1]; } }\n',
      },
    ];
    for (const candidate of cases) {
      const input = fixture({
        'src/App/Handler/Reader.php': `<?php
class Reader {
  public function read() { return Helper::payload(); }
}
`,
        'src/App/Handler/Helper.php': candidate.helper,
      });
      try {
        const { surface } = readSurface(input);
        expect(surface.contract.responseFlow?.status, candidate.name).toBe('REJECTED');
        expect(surface.contract.responseFlow?.rejectionCode, candidate.name).toBe('RESPONSE_DECLARATION_UNAPPROVED');
        expect(surface.contract.responseProof, candidate.name).not.toBe('PROVEN');
        expect(surface.contract.responseContractId, candidate.name).toBeNull();
      } finally {
        fs.rmSync(input.root, { recursive: true, force: true });
      }
    }
  });

  test('preserves exact positive modifiers and versions the binding proof', () => {
    const input = fixture({
      'src/App/Handler/Reader.php': `<?php
class Reader {
  public function read() { return $this->payload(); }
  private function payload() { return ['id' => 1]; }
}
`,
    });
    try {
      const { surface } = readSurface(input);
      expect(surface.contract.responseFlow?.status).toBe('PROVEN');
      expect(surface.contract.responseFlow?.schemaVersion).toBe(REAL_SOURCE_RESPONSE_FLOW_VERSION);
      expect(REAL_SOURCE_RESPONSE_FLOW_VERSION).toBe('nightwatch.real-source-response-flow.v2');
    } finally {
      fs.rmSync(input.root, { recursive: true, force: true });
    }
  });

  test('rejects a root operation source-SHA mismatch before proof resolution', () => {
    const input = fixture({
      'src/App/Handler/Reader.php': `<?php
class Reader {
  public function read() { return $this->payload(); }
  private function payload() { return ['id' => 1]; }
}
`,
    });
    try {
      const { discovery, surface } = readSurface(input);
      const index = createResponseFlowIndex({ access: input.access, inventory: discovery.inventory });
      const proof = resolveResponseFlow({ index, operation: { ...surface.operation, sourceSha: OTHER_SHA } });
      expect(proof.status).toBe('REJECTED');
      expect(proof.rejectionCode).toBe('RESPONSE_DECLARATION_STALE');
      expect(proof.rootDeclaration).toBeNull();
    } finally {
      fs.rmSync(input.root, { recursive: true, force: true });
    }
  });

  test('rejects a dependency whose indexed source-SHA is not the operation source', () => {
    const input = fixture({
      'src/App/Handler/Reader.php': `<?php
class Reader {
  public function read() { return Helper::payload(); }
}
`,
      'src/App/Handler/Helper.php': '<?php class Helper { public static function payload() { return [\'id\' => 1]; } }\n',
    });
    try {
      const { discovery, surface } = readSurface(input);
      const inventory = {
        ...discovery.inventory,
        files: discovery.inventory.files.map((file) => file.relativePath === 'src/App/Handler/Helper.php' ? { ...file, sourceSha: OTHER_SHA } : file),
      };
      const index = createResponseFlowIndex({ access: input.access, inventory });
      const proof = resolveResponseFlow({ index, operation: surface.operation });
      expect(proof.status).toBe('REJECTED');
      expect(proof.rejectionCode).toBe('RESPONSE_DECLARATION_STALE');
    } finally {
      fs.rmSync(input.root, { recursive: true, force: true });
    }
  });
});
