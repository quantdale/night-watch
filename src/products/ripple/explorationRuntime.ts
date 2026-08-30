import type { Locator, Page } from '@playwright/test';
import type { NetworkObserver, SemanticRequestObservation } from '../../browser/observers/networkObserver';
import { waitForRippleStability } from '../../browser/observers/stability';
import { isRippleStructurallyReady } from './readiness';
import type { RunMonitor } from '../../state/run';
import type { ActionExecutionResult, ActionFailureCode, ExplorationRuntime, ExplorationStateInput, SafeAction, LocatorSpec, AnchorJourney, RuntimeNetworkObservation } from '../../core/exploration/types';

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

async function selectedOptionMatches(select: Locator, optionLabels: readonly string[]): Promise<boolean> {
  const input = select.locator('input');
  if (await uniqueCount(input) === 1) {
    const current = (await input.inputValue()).trim();
    if (optionLabels.includes(current)) return true;
  }
  // Quasar 1 QSelect uses an empty input for use-input=false and renders the
  // mapped selected label in the field body instead.
  return (await Promise.all(optionLabels.map(async (label) =>
    uniqueCount(select.getByText(label, { exact: true }))))).some((count) => count === 1);
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

class ApprovedActionFailure extends Error {
  readonly code: ActionFailureCode;

  constructor(code: ActionFailureCode) {
    super(code);
    this.name = 'ApprovedActionFailure';
    this.code = code;
  }
}

function actionFailureCode(error: unknown): ActionFailureCode {
  return error instanceof ApprovedActionFailure ? error.code : 'ACTION_EXECUTION_FAILED';
}

function exactTextPattern(value: string): RegExp {
  const escaped = value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`^\\s*${escaped}\\s*$`);
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
      if (await selectedOptionMatches(select, action.locator.optionLabels)) return false;
    }
    return true;
  };

  const executeSelectorOption = async (action: SafeAction, spec: Extract<LocatorSpec, { kind: 'selector-option' }>): Promise<void> => {
    const field = locatorForSpec(opts.page, spec);
    if (await uniqueCount(field) !== 1) throw new ApprovedActionFailure('SELECTOR_FIELD_NOT_UNIQUE');
    const select = field.locator('.q-select');
    if (await uniqueCount(select) !== 1) throw new ApprovedActionFailure('SELECTOR_CONTROL_NOT_UNIQUE');
    // A selected source enum is not re-clicked: it is a runtime-unavailable
    // edge for this action, not permission to choose another option.
    if (await selectedOptionMatches(select, spec.optionLabels)) throw new ApprovedActionFailure('OPTION_ALREADY_SELECTED');
    try {
      await select.click();
    } catch {
      throw new ApprovedActionFailure('SELECTOR_OPEN_FAILED');
    }
    const menu = opts.page.locator('.q-menu:visible').last();
    try {
      await menu.waitFor({ state: 'visible', timeout: 5_000 });
    } catch {
      throw new ApprovedActionFailure('SELECTOR_OPEN_FAILED');
    }
    let option: Locator | null = null;
    let matchingOptionCount = 0;
    for (const label of spec.optionLabels) {
      // Quasar 1 renders QSelect entries as q-items without an option ARIA
      // role. The menu is still an approved source-backed control boundary.
      const candidate = menu.locator('.q-item').filter({ hasText: exactTextPattern(label) });
      const count = await uniqueCount(candidate);
      matchingOptionCount += count;
      if (count === 1) {
        option = candidate;
        break;
      }
    }
    if (option === null) throw new ApprovedActionFailure(matchingOptionCount > 1 ? 'APPROVED_OPTION_NOT_UNIQUE' : 'APPROVED_OPTION_NOT_FOUND');
    try {
      await option.click();
    } catch {
      throw new ApprovedActionFailure('OPTION_CLICK_FAILED');
    }
  };

  const execute = async (action: SafeAction): Promise<ActionExecutionResult> => {
    const before = opts.network.journeySemanticRequests().length;
    let status: ActionExecutionResult['status'] = 'COMPLETED';
    let failureCode: ActionFailureCode | undefined;
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
        if (!stable) throw new ApprovedActionFailure('ANCHOR_STABILITY_FAILED');
      } else if (action.locator.kind === 'selector-option') {
        await executeSelectorOption(action, action.locator);
      } else if (action.locator.kind === 'column-header') {
        const locator = locatorForSpec(opts.page, action.locator);
        if (await uniqueCount(locator) !== 1) throw new ApprovedActionFailure('COLUMN_HEADER_NOT_UNIQUE');
        try { await locator.click(); } catch { throw new ApprovedActionFailure('COLUMN_HEADER_CLICK_FAILED'); }
      } else if (action.locator.kind === 'vendor-tab') {
        const locator = locatorForSpec(opts.page, action.locator);
        if (await uniqueCount(locator) !== 1) throw new ApprovedActionFailure('VENDOR_TAB_NOT_UNIQUE');
        try { await locator.click(); } catch { throw new ApprovedActionFailure('VENDOR_TAB_CLICK_FAILED'); }
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
      if (expectedReads.size > 0) throw new ApprovedActionFailure('EXPECTED_READ_NOT_SETTLED');
    } catch (error) {
      status = 'FAILED';
      failureCode = actionFailureCode(error);
      // Keep the legacy field safe too; Playwright text is never retained.
      failureReason = failureCode;
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
      ...(failureCode === undefined ? {} : { failureCode }),
      ...(failureReason === undefined ? {} : { failureReason }),
    };
  };

  return { currentState, actionAvailable, execute };
}
