import type { Locator, Page } from '@playwright/test';
import type { NetworkObserver, SemanticRequestObservation } from '../../browser/observers/networkObserver';
import { waitForRippleStability } from '../../browser/observers/stability';
import { isRippleStructurallyReady } from './readiness';
import type { RunMonitor } from '../../state/run';
import type { ActionExecutionResult, ExplorationRuntime, ExplorationStateInput, SafeAction, LocatorSpec, AnchorJourney, RuntimeNetworkObservation } from '../../core/exploration/types';

const ANCHOR_MARKERS: Record<AnchorJourney, string> = {
  'ripple-payer-exchange-read': '.__ExchangeRateDataTable',
  'ripple-common-exchange-read': '.__GlobalExchangeRateDataTable',
  'ripple-account-inventory': '.__CustomDataTable',
};

const ANCHOR_SURFACES: Record<AnchorJourney, string> = {
  'ripple-payer-exchange-read': 'payer-exchange-rate',
  'ripple-common-exchange-read': 'common-exchange-rate',
  'ripple-account-inventory': 'account-inventory',
};

function routeClass(uiBaseUrl: string, rawUrl: string): string {
  try {
    const base = new URL(uiBaseUrl);
    const actual = new URL(rawUrl);
    if (base.origin !== actual.origin) return 'OUTSIDE_TARGET_ORIGIN';
    const basePath = base.pathname.endsWith('/') ? base.pathname : `${base.pathname}/`;
    if (!actual.pathname.startsWith(basePath)) return 'OUTSIDE_TARGET_PATH';
    const suffix = actual.pathname.slice(basePath.length).replace(/\/$/, '');
    return suffix === '' ? '/' : `/${suffix}`;
  } catch {
    return 'UNREADABLE_ROUTE';
  }
}

function sourceLabelLocator(field: Locator, labelTexts: readonly string[]): Locator | null {
  if (labelTexts.length === 0) return field;
  // The label strings are fixed source labels, not customer-derived text.
  for (const label of labelTexts) {
    const candidate = field.filter({ has: field.locator('.__C_Selector-Label', { hasText: label }) });
    return candidate;
  }
  return null;
}

function locatorForSpec(page: Page, spec: LocatorSpec): Locator {
  if (spec.kind === 'selector-option') {
    let field = page.locator(`${spec.surfaceSelector} .__C_Selector`);
    if (spec.labelTexts.length > 0) {
      const alternatives = spec.labelTexts.map((label) =>
        field.filter({ has: page.locator('.__C_Selector-Label', { hasText: label }) }),
      );
      // The source supplies one locale at runtime. The union remains bounded
      // and is accepted only when exactly one field is present.
      field = alternatives.reduce((current, candidate) => current.or(candidate));
    }
    return field;
  }
  if (spec.kind === 'column-header') {
    const candidates = spec.columnLabels.map((label) => page.locator(spec.surfaceSelector).getByRole('columnheader', { name: label, exact: true }));
    return candidates.reduce((current, candidate) => current.or(candidate));
  }
  if (spec.kind === 'vendor-tab') {
    return page.locator(spec.surfaceSelector).getByRole('tab', { name: spec.optionLabels[0], exact: true });
  }
  return page.locator('body');
}

async function uniqueCount(locator: Locator): Promise<number> {
  try {
    return await locator.count();
  } catch {
    return 0;
  }
}

function toRuntimeRequest(item: SemanticRequestObservation): RuntimeNetworkObservation {
  return {
    family: item.ruleId,
    classification: item.classification,
    disposition: item.disposition,
    hostClass: 'TARGET',
  };
}

export interface RippleExplorationRuntimeOptions {
  readonly page: Page;
  readonly uiBaseUrl: string;
  readonly anchorJourney: AnchorJourney;
  readonly network: NetworkObserver;
  readonly monitor: RunMonitor;
  readonly authValid: boolean;
}

export function createRippleExplorationRuntime(opts: RippleExplorationRuntimeOptions): ExplorationRuntime {
  let safeViewState: Record<string, string | number | boolean> = { view: 'anchor' };
  const surface = ANCHOR_SURFACES[opts.anchorJourney];
  const marker = ANCHOR_MARKERS[opts.anchorJourney];
  const expectedRoute = opts.anchorJourney === 'ripple-payer-exchange-read'
    ? '/payer-exchange-rate-v2'
    : opts.anchorJourney === 'ripple-common-exchange-read'
      ? '/global-exchange-rate-v2'
      : '/accounts';

  const currentState = async (): Promise<ExplorationStateInput> => {
    const route = routeClass(opts.uiBaseUrl, opts.page.url());
    const globalShell = await uniqueCount(opts.page.locator('.q-layout-container.layout')) > 0;
    const anchorSurface = await uniqueCount(opts.page.locator(marker)) > 0;
    const semanticReadFamilies = [...new Set(opts.network.journeySemanticRequests()
      .filter((item) => item.classification === 'KNOWN_READ')
      .map((item) => item.ruleId))].sort();
    return {
      product: 'ripple',
      surface,
      routeClass: route,
      structuralFlags: { globalShell, anchorSurface },
      safeViewState: { ...safeViewState },
      availableActionIds: [],
      semanticReadFamilies,
      authStateClass: opts.authValid ? 'AUTHENTICATED_DEV' : 'AUTH_INVALID',
      terminalFlags: { monitorSafetyFailed: opts.monitor.safetyFailed, pageClosed: opts.page.isClosed() },
    };
  };

  const actionAvailable = async (action: SafeAction): Promise<boolean> => {
    if (opts.page.isClosed()) return false;
    if (action.locator.kind === 'approved-route') return routeClass(opts.uiBaseUrl, opts.page.url()) === action.locator.routeClass;
    const locator = locatorForSpec(opts.page, action.locator);
    if (await uniqueCount(locator) !== 1) return false;
    if (action.locator.kind === 'selector-option') {
      const select = locator.locator('.q-select');
      const input = select.locator('input');
      if (await uniqueCount(input) === 1) {
        const current = (await input.inputValue()).trim();
        if (action.locator.optionLabels.includes(current)) return false;
      }
    }
    return true;
  };

  const executeSelectorOption = async (action: SafeAction, spec: Extract<LocatorSpec, { kind: 'selector-option' }>): Promise<void> => {
    const field = locatorForSpec(opts.page, spec);
    if (await uniqueCount(field) !== 1) throw new Error('approved selector field is not unique');
    const select = field.locator('.q-select');
    if (await uniqueCount(select) !== 1) throw new Error('approved q-select is not unique');
    // A selected source enum is not re-clicked: it is a runtime-unavailable
    // edge for this action, not permission to choose another option.
    const input = select.locator('input');
    if (await uniqueCount(input) === 1) {
      const current = (await input.inputValue()).trim();
      if (spec.optionLabels.includes(current)) throw new Error('approved option is already selected');
    }
    await select.click();
    let option: Locator | null = null;
    for (const label of spec.optionLabels) {
      const candidate = opts.page.getByRole('option', { name: label, exact: true });
      if (await uniqueCount(candidate) === 1) {
        option = candidate;
        break;
      }
    }
    if (option === null) throw new Error('approved fixed option is unavailable');
    await option.click();
  };

  const execute = async (action: SafeAction): Promise<ActionExecutionResult> => {
    const before = opts.network.journeySemanticRequests().length;
    let status: ActionExecutionResult['status'] = 'COMPLETED';
    let failureReason: string | undefined;
    opts.network.beginJourneyIntent(action.actionId, action.actionKind === 'RETURN_TO_ANCHOR' ? 'RETURN_TO_ANCHOR' : action.actionKind);
    try {
      if (action.locator.kind === 'approved-route') {
        const base = new URL(opts.uiBaseUrl);
        const target = new URL(action.locator.routeClass.replace(/^\//, ''), base).toString();
        await opts.page.goto(target, { waitUntil: 'domcontentloaded', timeout: 30_000 });
        const stable = await waitForRippleStability({
          quietMs: 750,
          timeoutMs: 30_000,
          monitor: opts.monitor,
          sample: async () => ({
            documentReadyState: await opts.page.evaluate(() => {
              const pageGlobal = globalThis as unknown as { document?: { readyState?: string } };
              return pageGlobal.document?.readyState ?? 'unavailable';
            }),
            bootstrapMountSelector: '#app',
            renderedShellSelector: '.q-layout-container.layout',
            renderedShellPresent: await uniqueCount(opts.page.locator('.q-layout-container.layout')) > 0,
            route: routeClass(opts.uiBaseUrl, opts.page.url()),
            fatal: opts.page.isClosed() || opts.monitor.safetyFailed,
          }),
        });
        if (!stable) throw new Error('anchor route did not reach structural stability');
      } else if (action.locator.kind === 'selector-option') {
        await executeSelectorOption(action, action.locator);
      } else if (action.locator.kind === 'column-header') {
        const locator = locatorForSpec(opts.page, action.locator);
        if (await uniqueCount(locator) !== 1) throw new Error('approved column header is not unique');
        await locator.click();
      } else if (action.locator.kind === 'vendor-tab') {
        const locator = locatorForSpec(opts.page, action.locator);
        if (await uniqueCount(locator) !== 1) throw new Error('approved vendor tab is not unique');
        await locator.click();
      }
      await opts.page.waitForTimeout(150);
      const expectedReads = new Set(action.expectedReadFamilies);
      const deadline = Date.now() + 30_000;
      while (expectedReads.size > 0 && Date.now() < deadline) {
        for (const item of opts.network.journeySemanticRequests().slice(before)) {
          if (item.classification === 'KNOWN_READ' && expectedReads.has(item.ruleId)) expectedReads.delete(item.ruleId);
        }
        if (expectedReads.size > 0) await opts.page.waitForTimeout(100);
      }
      if (expectedReads.size > 0) throw new Error('approved read family did not settle');
    } catch (error) {
      status = 'FAILED';
      failureReason = error instanceof Error ? error.message : 'approved action failed';
    } finally {
      opts.network.endJourneyIntent(action.actionId);
    }
    if (status === 'COMPLETED') safeViewState = { ...safeViewState, ...action.expectedStructuralDelta };
    const delta = opts.network.journeySemanticRequests().slice(before).map(toRuntimeRequest);
    const safety = {
      productionAttempts: delta.filter((item) => item.hostClass === 'PRODUCTION').length,
      proxyViolations: opts.monitor.hardFailures.length,
      unknownDestinations: delta.filter((item) => item.hostClass === 'UNKNOWN').length,
      unknownApprovals: 0,
      knownMutations: delta.filter((item) => item.classification === 'KNOWN_MUTATION').length,
      actionCausedUnknown: delta.filter((item) => item.disposition === 'ACTION_CAUSED_UNKNOWN').length,
      dbQueries: 0,
    } as const;
    const nextState = await currentState();
    return {
      status,
      nextState,
      routeDelta: { routeClass: routeClass(opts.uiBaseUrl, opts.page.url()) },
      structuralDelta: action.expectedStructuralDelta,
      semanticRequestDelta: delta,
      oracleResults: [],
      safety,
      durationClass: 'MEDIUM',
      ...(failureReason === undefined ? {} : { failureReason }),
    };
  };

  return { currentState, actionAvailable, execute };
}
