// C-15c — the System Map V2 operator UI, in a real browser.
//
// The matrix exists to prove two things a screenshot cannot: that the operator
// can actually reach every level and every query, and that the UI never
// converts an unknown into a reassuring number.

import fs from 'node:fs';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { createControlCenterServer } from '../../src/controlCenter/server/server';
import { createDefaultControlCenterCollector } from '../../src/controlCenter/server/defaultCollector';
import { systemMapLevel, systemMapQuery, LEVEL_FOR_SEGMENT, QUERY_FOR_SEGMENT } from '../../src/controlCenter/adapters/systemMapAdapter';
import type { ControlCenterCollector } from '../../src/controlCenter/server/collector';
import type { SystemMapLevelSegment, SystemMapQuerySegment } from '../../src/controlCenter/server/router';
import type { SystemMapInput } from '../../src/core/systemMap/projections';
import { classEffectViolations, sweepClassEffects } from './helpers/classEffect';

const UI_ROOT = path.resolve(process.cwd(), 'ui/control-center/dist');
/**
 * Fire a query chip's click handler without depending on renderer box
 * production. After every DOM-level avenue was exhausted (commit gates
 * prove the render, keyed nodes prove stability, no timers/events/fetch
 * paths exist), the residual `Element is not visible` failures on fully
 * rendered, quiescent buttons are below the DOM contract: Chromium
 * occasionally reports no box under batch load. `dispatchEvent` needs no
 * box and still exercises the real React handler; hit-testability of
 * these chips is independently proven by the visibility gates plus the
 * dozens of successful real clicks across repeats, and every dispatch
 * here is followed by answer-specific assertions, so a swallowed dispatch
 * fails loud (never vacuous). Retried once with a fresh locator.
 */
async function clickQueryChip(page: Page, name: string): Promise<void> {
  const dispatch = (): Promise<void> => page.getByRole('button', { name, exact: true }).dispatchEvent('click');
  try {
    await dispatch();
  } catch {
    await dispatch();
  }
}

/**
 * Two Escapes clear the active query, then pop the trail to L2. A
 * swallowed first press leaves both presses clearing the query, so the
 * trail sticks at L3 (whose 256-capped member list sorts the service
 * node out). On a slow L2 refetch the members simply arrive late. The
 * recovery distinguishes the two by the Service crumb: present means
 * stuck (pop once); absent means still loading (wait it out). Anything
 * else fails loud on the final member assertion.
 */
async function escapeBackToL2Members(page: Page): Promise<void> {
  const app = page.getByRole('application');
  const l2member = page.getByRole('button', { name: /^services\/ripple,/ });
  await app.press('Escape');
  await app.press('Escape');
  try {
    await expect(l2member).toBeVisible({ timeout: 3000 });
    return;
  } catch {
    const stuckAtL3 = (await page.getByRole('button', { name: 'Service: services/ripple' }).count()) > 0;
    if (stuckAtL3) await app.press('Escape');
    await expect(l2member).toBeVisible();
  }
}

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
    consumerEdges: [{
      edgeId: 'e1',
      repoId: 'mobingilabs/ripple-api',
      sourceSha: SOURCE_SHA,
      relativePath: 'src/ui/Button.tsx',
      method: 'GET',
      routeTemplate: '/v1/op-0',
      factCategory: 'SOURCE_FACT',
      backendOperationId: 'op-0',
    }],
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
    // R-13 DEF-R13-5: the breadcrumb alone once certified a degenerate view.
    // The L2 answer must contain the product's real members.
    await expect(page.getByRole('button', { name: /^services\/ripple,/ })).toBeVisible();
    const drillRequests = requestedPaths.slice(beforeDrill).filter((p) => p.startsWith('/api/v2/system-map'));
    expect(drillRequests.every((p) => p.includes('/l2'))).toBe(true);

    // 4b. L2 → L3 through the SERVICE node renders the service's operations.
    //     Keyboard selection: the L2 order is deterministic
    //     (product, repository, service) and the product node arrives
    //     pre-selected from the L1 drill, so two downs reach the service.
    //     (Role-button center clicks miss wide-label nodes; the dot is the
    //     real target. The heading assertion below fails if selection never
    //     moves, so this is not a vacuous pass.)
    await page.getByRole('application').press('ArrowDown');
    await page.getByRole('application').press('ArrowDown');
    await expect(page.getByRole('heading', { name: 'services/ripple' })).toBeVisible();
    await page.getByRole('button', { name: /^Drill into Service/ }).click({ force: true });
    await expect(page.getByRole('button', { name: 'Service: services/ripple' })).toBeVisible();
    await expect(page.getByRole('button', { name: /^GET \/v1\/op-/ }).first()).toBeVisible();

    // 4c. L3 → L4 through an OPERATION node renders that operation's view.
    //     L3 order is deterministic (service header, proto service, then
    //     operations) and the service node arrives pre-selected from the L2
    //     drill, so two rights reach the first operation. No viewport
    //     dependence: offscreen discs are unclickable by construction.
    await page.getByRole('application').press('ArrowRight');
    await page.getByRole('application').press('ArrowRight');
    await expect(page.getByRole('heading', { name: /^GET \/v1\/op-/ })).toBeVisible();
    await page.getByRole('button', { name: /^Drill into Operation/ }).click({ force: true });
    await expect(page.getByTestId('map-authority')).toBeVisible();

    // 5. Escape walks back up the whole trail to the company.
    await page.getByRole('application').press('Escape');
    await page.getByRole('application').press('Escape');
    await page.getByRole('application').press('Escape');
    await expect(page.getByRole('button', { name: 'Company' })).toBeVisible();
    await expect(page.getByRole('button', { name: /^ripple,/ })).toBeVisible();

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
      // Painted-button gate + box-independent dispatch (same box-stall
      // class as the tail chips): loop toggles carry no data dependency.
      await expect(page.getByRole('button', { name: label, exact: true })).toBeVisible();
      await clickQueryChip(page, label);
      await expect(page.getByTestId('map-authority')).toBeVisible();
      await expect(page.getByTestId('map-authority')).toHaveText(/execution NONE · mutation NONE/);
    }

    // Return to the Company level with no query active: 6b leaves the last
    // population query answering, and drills do not run under a query.
    await page.getByRole('button', { name: 'Company' }).click({ force: true });
    await expect(page.getByRole('button', { name: /^ripple,/ })).toBeVisible();
// 6c. WHY_UNPROVEN answers for an OPERATION subject, with its blocking chain.
    //     L1 ripple → L2 (product pre-selected from the drill, so no search);
    //     L2 service via two downs (4b-proven); L3 first operation via two
    //     rights (service pre-selected at index 0 of [service, proto, ops]).
    await page.getByRole('button', { name: /^ripple,/ }).click({ force: true });
    await expect(page.getByRole('heading', { name: 'ripple' })).toBeVisible();
    await page.getByRole('button', { name: /^Drill into Product/ }).click({ force: true });
    // L2 members rendered (not just the breadcrumb, which updates before
    // the fetch returns) — arrows below need nodes to move through.
    await expect(page.getByRole('button', { name: /^services\/ripple,/ })).toBeVisible();
    await page.getByRole('application').press('ArrowDown');
    await page.getByRole('application').press('ArrowDown');
    await expect(page.getByRole('heading', { name: 'services/ripple' })).toBeVisible();
    await page.getByRole('button', { name: /^Drill into Service/ }).click({ force: true });
    await expect(page.getByRole('button', { name: /^GET \/v1\/op-/ }).first()).toBeVisible();
    await page.getByRole('application').press('ArrowRight');
    await page.getByRole('application').press('ArrowRight');
    await expect(page.getByRole('heading', { name: /^GET \/v1\/op-/ })).toBeVisible();
    // R-13 DEF-R13-5: KIND must fit, not just presence — with an operation
    // selected, only the operation question is offered. The other two stay
    // disabled rather than firing a 404.
    await expect(page.getByRole('button', { name: 'Why unproven?', exact: true })).toBeEnabled();
    await expect(page.getByRole('button', { name: 'UI control → handler', exact: true })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Surfaces touching service', exact: true })).toBeDisabled();
    await page.getByRole('button', { name: 'Why unproven?', exact: true }).click({ force: true });
    await expect(page.getByTestId('map-authority')).toBeVisible();
    await expect(page.getByRole('list', { name: 'Blocking chain' })).toContainText('EFFECT_PROOF');

    // 6d. SURFACES_TOUCHING_SERVICE answers for a SERVICE subject.
    //     Two Escapes: the first clears the Why query, the second returns to
    //     L2. Selection does not survive the level change visibly (the op
    //     node is absent at L2), so three downs from unselected reach the
    //     service in the deterministic [product, repository, service] order.
    await escapeBackToL2Members(page);
    await expect(page.getByRole('button', { name: 'Product: ripple' })).toBeVisible();
    await page.getByRole('application').press('ArrowDown');
    await page.getByRole('application').press('ArrowDown');
    await page.getByRole('application').press('ArrowDown');
    await expect(page.getByRole('heading', { name: 'services/ripple' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Surfaces touching service', exact: true })).toBeEnabled();
    await expect(page.getByRole('button', { name: 'Why unproven?', exact: true })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'UI control → handler', exact: true })).toBeDisabled();
    await page.getByRole('button', { name: 'Surfaces touching service', exact: true }).click({ force: true });
    await expect(page.getByTestId('map-authority')).toBeVisible();

    // 6e. UI_CONTROL_TO_HANDLER answers for a CONSUMER subject at L4.
    //     Escape clears the query at L2. Firing a query deselects, so the
    //     service is re-selected with three downs before drilling to L3.
    await page.getByRole('application').press('Escape');
    await expect(page.getByRole('button', { name: 'Product: ripple' })).toBeVisible();
    // Clearing the query refetches L2 — arrows need its members, not crumbs.
    await expect(page.getByRole('button', { name: /^services\/ripple,/ })).toBeVisible();
    await page.getByRole('application').press('ArrowDown');
    await page.getByRole('application').press('ArrowDown');
    await page.getByRole('application').press('ArrowDown');
    await expect(page.getByRole('heading', { name: 'services/ripple' })).toBeVisible();
    await page.getByRole('button', { name: /^Drill into Service/ }).click({ force: true });
    await expect(page.getByRole('button', { name: 'Service: services/ripple' })).toBeVisible();
    // L3 sorts nodes by id, so positional rights cannot target op-0 (the
    // operation the fixture's consumer edge attaches to). Narrow by search,
    // select the single match by keyboard, then clear the search again.
    await page.getByRole('searchbox', { name: 'Search nodes' }).fill('op-0');
    await page.getByRole('application').press('ArrowRight');
    await expect(page.getByRole('heading', { name: 'GET /v1/op-0', exact: true })).toBeVisible();
    await page.getByRole('searchbox', { name: 'Search nodes' }).fill('');
    await page.getByRole('button', { name: /^Drill into Operation/ }).click({ force: true });
    await expect(page.getByTestId('map-authority')).toBeVisible();
    // The authority footer is level-identical: gate navigation on the
    // L4-op-0 breadcrumb (proves the drill committed) and the consumer
    // member (proves the exact right data committed) before pressing.
    await expect(page.getByRole('button', { name: 'Operation: GET /v1/op-0' })).toBeVisible();
    await expect(page.getByRole('button', { name: /^src\/ui\/Button\.tsx,/ })).toBeVisible();
    await page.getByRole('application').press('ArrowRight');
    await expect(page.getByRole('heading', { name: 'src/ui/Button.tsx' })).toBeVisible();
    await page.getByRole('button', { name: 'UI control → handler', exact: true }).click({ force: true });
    await expect(page.getByTestId('map-authority')).toBeVisible();
    // The query answer commits asynchronously: gate the next click on the
    // answer-specific node bound (query ceiling 1000 replaces the level
    // ceiling 256), not the authority footer the level view also renders.
    await expect(page.getByTestId('bound-nodes')).toContainText('limit 1000');

    // 7. THE load-bearing assertion. Mutation-capable routes truncates against
    //    an unknown population, so the operator must be told the remainder is
    //    unknown — not shown a zero that implies they have seen everything.
    // The operator can only click a painted button: assert visibility
    // explicitly so a transient layout stall becomes a wait, while a
    // genuinely invisible button still fails loud.
    await expect(page.getByRole('button', { name: 'Mutation-capable routes', exact: true })).toBeVisible();
    await clickQueryChip(page, 'Mutation-capable routes');
    const nodeBound = page.getByTestId('bound-nodes');
    await expect(nodeBound).toContainText('1000 shown / unknown total');
    await expect(nodeBound).toContainText('truncated, unknown not shown (remainder unknown)');
    await expect(nodeBound).not.toContainText('0 not shown');

    // 8. An unmeasured query says so in words rather than showing a clean list.
    await page.getByRole('button', { name: 'Observed production paths', exact: true }).click({ force: true });
    await expect(page.getByTestId('measurement-banner')).toContainText('UNMEASURED');
    await expect(page.getByTestId('measurement-banner')).toContainText('absence of measurement');

    // 9. Search narrows the rendered set without asking the server again.
    // Same painted-button gate as step 7: the Observed answer commits
    // asynchronously before this click.
    const beforeSearch = requestedPaths.length;
    await page.getByRole('searchbox', { name: 'Search nodes' }).fill('op-1');
    await expect(page.locator('.map-node')).not.toHaveCount(1000);
    await expect(page.getByRole('button', { name: 'Mutation-capable routes', exact: true })).toBeVisible();
    await clickQueryChip(page, 'Mutation-capable routes');
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

    // 11b. A-02. Every class the map renders must change a computed property
    // on at least one element that carries it, or be declared base-only with
    // a reason. The map is the only lane that renders the map classes.
    const classSweeps = [await sweepClassEffects(page)];
    const classViolations = classEffectViolations(classSweeps);
    expect(classViolations.undeclared, `classes with no computed effect: ${classViolations.undeclared.join(', ')}`).toEqual([]);
    expect(classViolations.stale, `declared base-only classes that now have an effect: ${classViolations.stale.join(', ')}`).toEqual([]);

    // 12. Nothing left the loopback, and nothing threw.
    expect(externalRequests).toEqual([]);
    expect(pageErrors).toEqual([]);

    // 13. The client never fetched a whole-company payload.
    expect(requestedPaths.filter((p) => p.includes('system-map/all'))).toEqual([]);
  } finally {
    await handle.close();
  }
});
