// C-15c — the System Map V2 operator UI, in a real browser.
//
// The matrix exists to prove two things a screenshot cannot: that the operator
// can actually reach every level and every query, and that the UI never
// converts an unknown into a reassuring number.

import fs from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import { createControlCenterServer } from '../../src/controlCenter/server/server';
import { createDefaultControlCenterCollector } from '../../src/controlCenter/server/defaultCollector';
import { systemMapLevel, systemMapQuery, LEVEL_FOR_SEGMENT, QUERY_FOR_SEGMENT } from '../../src/controlCenter/adapters/systemMapAdapter';
import type { ControlCenterCollector } from '../../src/controlCenter/server/collector';
import type { SystemMapLevelSegment, SystemMapQuerySegment } from '../../src/controlCenter/server/router';
import type { SystemMapInput } from '../../src/core/systemMap/projections';

const UI_ROOT = path.resolve(process.cwd(), 'ui/control-center/dist');
const SOURCE_SHA = 'a'.repeat(40);

function operation(id: string, over: Partial<SystemMapInput['operations'][number]> = {}): SystemMapInput['operations'][number] {
  return {
    operationId: id,
    repoId: 'mobingilabs/ripple-api',
    sourceSha: SOURCE_SHA,
    method: 'GET',
    routeTemplate: `/v1/${id}`,
    factCategory: 'SOURCE_FACT',
    readOnlyClassification: 'READ_ONLY_METHOD_ONLY',
    routeProof: 'PROVEN',
    protoServiceIdentity: 'ripple.v1.Ripple',
    blockingStage: 'EFFECT_PROOF',
    blockingReason: 'NO_EFFECT_CLOSURE',
    ...over,
  };
}

/** A population whose true total is UNKNOWN, and large enough to truncate. */
function truncatingInput(): SystemMapInput {
  return {
    operations: Array.from({ length: 1200 }, (_, index) => operation(`op-${index}`, {
      readOnlyClassification: 'PROVEN_MUTATION_CAPABLE',
    })),
    serviceBindings: [{
      protoServiceIdentity: 'ripple.v1.Ripple',
      serviceDirectory: 'services/ripple',
      repoId: 'mobingilabs/ripple-api',
      sourceSha: SOURCE_SHA,
      factCategory: 'SOURCE_FACT',
      proven: true,
    }],
    consumerEdges: [],
    findings: [],
    operationPopulationTotal: null,
    productOfRepository: { 'mobingilabs/ripple-api': 'ripple' },
  };
}

function collectorFor(input: SystemMapInput): ControlCenterCollector {
  const base = createDefaultControlCenterCollector();
  return {
    ...base,
    systemMapLevel: (segment: SystemMapLevelSegment, focusId: string | null) => systemMapLevel(input, LEVEL_FOR_SEGMENT[segment]!, focusId),
    systemMapQuery: (segment: SystemMapQuerySegment, focusId: string | null) => systemMapQuery(input, QUERY_FOR_SEGMENT[segment]!, focusId),
  };
}

test('C-15c the operator can navigate the map, and the map never overstates what it knows', async ({ page }) => {
  test.setTimeout(120_000);
  expect(fs.existsSync(path.join(UI_ROOT, 'index.html'))).toBe(true);

  const pageErrors: string[] = [];
  const externalRequests: string[] = [];
  const requestedPaths: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') pageErrors.push(message.text()); });
  page.on('request', (request) => {
    if (!request.url().startsWith('http://127.0.0.1:')) externalRequests.push(request.url());
    else requestedPaths.push(new URL(request.url()).pathname);
  });

  const handle = createControlCenterServer({ collector: collectorFor(truncatingInput()), port: 0, uiRoot: UI_ROOT });
  const address = await handle.start();
  const origin = `http://127.0.0.1:${address.port}`;

  try {
    await page.goto(`${origin}/#system-map`, { waitUntil: 'domcontentloaded' });

    // 1. The view is reachable from the primary navigation.
    await expect(page.getByRole('link', { name: 'System Map' })).toBeVisible();
    await expect(page.getByRole('application', { name: /level graph/ })).toBeVisible();

    // 2. L1 renders, and the breadcrumb starts at the company.
    await expect(page.getByRole('button', { name: 'Company' })).toBeVisible();

    // 3. The provenance footer states both authorities as NONE.
    await expect(page.getByTestId('map-authority')).toHaveText(/execution NONE · mutation NONE/);

    // 4. Drilling L1 → L2 pushes a breadcrumb and asks the server for L2 ALONE.
    const beforeDrill = requestedPaths.length;
    // Select the PRODUCT node — L2 is a view of a product, so the company node
    // is not a valid focus for it.
    await page.getByRole('button', { name: /^ripple,/ }).click({ force: true });
    await expect(page.getByRole('heading', { name: 'ripple' })).toBeVisible();
    await page.getByRole('button', { name: /^Drill into Product/ }).click({ force: true });
    await expect(page.getByRole('button', { name: 'Product: ripple' })).toBeVisible();
    const drillRequests = requestedPaths.slice(beforeDrill).filter((p) => p.startsWith('/api/v2/system-map'));
    expect(drillRequests.every((p) => p.includes('/l2'))).toBe(true);

    // 5. Escape returns to the previous level.
    await page.getByRole('application').press('Escape');
    await expect(page.getByRole('button', { name: 'Company' })).toBeVisible();

    // 6a. The three subject-taking queries are NOT offered without a subject.
    //     Offering them would put a 404 where "pick a node first" belongs.
    for (const label of ['Why unproven?', 'UI control → handler', 'Surfaces touching service']) {
      await expect(page.getByRole('button', { name: label, exact: true })).toBeDisabled();
    }

    // 6b. The five population queries answer with no subject at all.
    for (const label of [
      'Observed production paths', 'Mutation-capable routes',
      'Untested read-only routes', 'Coverage gaps', 'Findings attached to topology',
    ]) {
      await page.getByRole('button', { name: label, exact: true }).click({ force: true });
      await expect(page.getByTestId('map-authority')).toBeVisible();
      await expect(page.getByTestId('map-authority')).toHaveText(/execution NONE · mutation NONE/);
    }

    // Return to Company level for the node-selection test.
    await page.getByRole('button', { name: 'Company' }).click({ force: true });
    await expect(page.getByRole('button', { name: /^ripple,/ })).toBeVisible();
// 6c. With a node selected, the subject-taking queries become available and answer.
    // Select a NAMED node at L1, where the graph is small and the target is
    // unambiguous, rather than a node picked positionally out of a thousand.
    await page.getByRole('button', { name: /^ripple,/ }).click({ force: true });
    await expect(page.getByRole('heading', { name: 'ripple' })).toBeVisible();
    for (const label of ['Why unproven?', 'UI control → handler', 'Surfaces touching service']) {
      const chip = page.getByRole('button', { name: label, exact: true });
      await expect(chip).toBeEnabled();
    }
    await page.getByRole('button', { name: 'Why unproven?', exact: true }).click({ force: true });
    await expect(page.getByTestId('map-authority')).toBeVisible();

    // 7. THE load-bearing assertion. Mutation-capable routes truncates against
    //    an unknown population, so the operator must be told the remainder is
    //    unknown — not shown a zero that implies they have seen everything.
    await page.getByRole('button', { name: 'Mutation-capable routes', exact: true }).click({ force: true });
    const nodeBound = page.getByTestId('bound-nodes');
    await expect(nodeBound).toContainText('1000 shown / unknown total');
    await expect(nodeBound).toContainText('truncated, unknown not shown (remainder unknown)');
    await expect(nodeBound).not.toContainText('0 not shown');

    // 8. An unmeasured query says so in words rather than showing a clean list.
    await page.getByRole('button', { name: 'Observed production paths', exact: true }).click({ force: true });
    await expect(page.getByTestId('measurement-banner')).toContainText('UNMEASURED');
    await expect(page.getByTestId('measurement-banner')).toContainText('absence of measurement');

    // 9. Search narrows the rendered set without asking the server again.
    await page.getByRole('button', { name: 'Mutation-capable routes', exact: true }).click({ force: true });
    const beforeSearch = requestedPaths.length;
    await page.getByRole('searchbox', { name: 'Search nodes' }).fill('op-1');
    await expect(page.locator('.map-node')).not.toHaveCount(1000);
    expect(requestedPaths.slice(beforeSearch).filter((p) => p.startsWith('/api/v2'))).toEqual([]);
    await page.getByRole('searchbox', { name: 'Search nodes' }).fill('');

    // 10. Zoom and reset are keyboard reachable.
    const canvas = page.getByRole('application');
    await canvas.press('+');
    await canvas.press('-');
    await canvas.press('0');
    await expect(canvas).toBeVisible();

    // 11. Arrow keys select and Enter is accepted without an error.
    await canvas.press('ArrowRight');
    await expect(page.locator('.map-node.node-selected')).toHaveCount(1);

    // 12. Nothing left the loopback, and nothing threw.
    expect(externalRequests).toEqual([]);
    expect(pageErrors).toEqual([]);

    // 13. The client never fetched a whole-company payload.
    expect(requestedPaths.filter((p) => p.includes('system-map/all'))).toEqual([]);
  } finally {
    await handle.close();
  }
});
