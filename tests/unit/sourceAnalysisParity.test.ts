import { expect, test } from '@playwright/test';
import { spawnSync } from 'node:child_process';
import { assertSourceParityEqual, captureSourceParity, createSourceParityFixture, sourceParityFixtureRawMarker, sourceParityJson } from '../helpers/sourceParity';

test.describe('source-analysis differential parity harness', () => {
  test('captures the complete safe discovery, Phase24, and review surface deterministically', () => {
    const fixture = createSourceParityFixture();
    try {
      const first = captureSourceParity({ access: fixture.access, config: fixture.config });
      const second = captureSourceParity({ access: fixture.access, config: fixture.config });
      assertSourceParityEqual(first, second);
      expect(sourceParityJson(first)).toBe(sourceParityJson(second));
      expect(sourceParityJson(first)).not.toContain(sourceParityFixtureRawMarker());
      expect(first.discovery.operations).toHaveLength(2);
      expect(first.discovery.surfaces).toHaveLength(2);
      expect(first.phase24.portfolio.consideredCount).toBe(2);
      expect(first.phase24.eligibilityCensus.rows).toHaveLength(2);

      const account = first.discovery.surfaces.find((surface) => surface.operation.handlerSymbol === 'getAccountVendor');
      const alternate = first.discovery.surfaces.find((surface) => surface.operation.handlerSymbol === 'getAlternate');
      expect(account?.operation.handlerPath).toBe(alternate?.operation.handlerPath);
      expect(account?.contract.responseEvidenceDigest).not.toBe(alternate?.contract.responseEvidenceDigest);
      expect(account?.contract.semanticContractIds).not.toEqual(alternate?.contract.semanticContractIds);
      expect(account?.surfaceId).not.toBe(alternate?.surfaceId);
    } finally {
      fixture.dispose();
    }
  });

  test('checks byte-stable deterministic CLI JSON, status, and stderr', () => {
    for (const command of ['contracts', 'differential', 'mutation-score']) {
      const run = () => spawnSync(process.execPath, ['bin/nightwatch-intelligence.mjs', command, '--json'], {
        cwd: process.cwd(),
        encoding: 'utf8',
        env: { NIGHTWATCH_ENV: 'local', PATH: process.env.PATH ?? '' },
      });
      const first = run();
      const second = run();
      expect(first.status, `${command} first status`).toBe(0);
      expect(second.status, `${command} second status`).toBe(0);
      expect(first.stderr, `${command} first stderr`).toBe('');
      expect(second.stderr, `${command} second stderr`).toBe('');
      expect(first.stdout, `${command} stdout bytes`).toBe(second.stdout);
      expect(() => JSON.parse(first.stdout)).not.toThrow();
    }
  });
});
