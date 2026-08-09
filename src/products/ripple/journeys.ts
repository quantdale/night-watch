// ---------------------------------------------------------------------------
// Nightwatch — Ripple Phase 1 passive journey.
//
// Phase 1 journeys are read-only by construction; every navigation is
// classified and must pass the passive-action policy (fail closed: a
// non-passive action aborts the whole journey). Each route waits for network
// stability before moving on.
// ---------------------------------------------------------------------------

import type { Page } from '@playwright/test';
import type { RunRecorder } from '../../core/evidence/runRecorder';
import type { RunMonitor } from '../../state/run';
import type { NetworkObserver } from '../../browser/observers/networkObserver';
import { waitForStability } from '../../browser/observers/stability';
import { assertPassiveAction } from '../../core/safety/actions';
import { rippleProduct } from './config';
import { classifyRippleAction } from './actions';

export interface JourneyContext {
  recorder: RunRecorder;
  monitor: RunMonitor;
  network: NetworkObserver;
}

export interface JourneyOptions {
  uiBaseUrl: string;
  /** Candidate route ids to visit (default: dashboard, invoice-list). */
  routes?: string[];
}

const NAVIGATION_TIMEOUT_MS = 30_000;

export async function runPassiveJourney(
  page: Page,
  ctx: JourneyContext,
  opts: JourneyOptions
): Promise<void> {
  const routeIds = opts.routes ?? ['dashboard', 'invoice-list'];

  for (const id of routeIds) {
    const route = rippleProduct.candidateRoutes.find((r) => r.id === id);
    if (route === undefined) {
      throw new Error(`fail-closed: unknown candidate route id "${id}" for product ripple`);
    }

    const url = opts.uiBaseUrl + route.path;
    const action = classifyRippleAction({ id: route.id, kind: 'navigate', label: route.label, url });

    // Fail closed: never navigate to a route the kernel cannot prove read-only.
    try {
      assertPassiveAction(action);
    } catch {
      const redactedUrl = ctx.recorder.redaction.redactUrl(url);
      const ev = ctx.recorder.event({
        type: 'hard-failure',
        severity: 'fatal',
        message: `non-passive action rejected: ${route.label}`,
        data: { reason: 'non-passive-action', url: redactedUrl },
      });
      ctx.monitor.recordHardFailure(ev, {
        url: redactedUrl,
        verdict: 'deny',
        hostClass: 'action-kernel',
        reason: 'non-passive-action',
      });
      return;
    }

    ctx.recorder.event({
      type: 'navigation',
      severity: 'info',
      message: `navigate: ${ctx.recorder.redaction.redactUrl(url)}`,
    });

    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: NAVIGATION_TIMEOUT_MS });
    } catch (err) {
      const redactedUrl = ctx.recorder.redaction.redactUrl(url);
      ctx.recorder.event({
        type: 'navigation',
        severity: 'fatal',
        message: `navigation failed: ${redactedUrl} (${ctx.recorder.redaction.redactText(
          String(err instanceof Error ? err.message : err)
        )})`,
        data: { reason: 'navigation-failed', url: redactedUrl },
      });
      const issueEvent = ctx.recorder.event({
        type: 'issue',
        severity: 'error',
        message: `navigation-failed: ${redactedUrl}`,
        data: { reason: 'navigation-failed' },
      });
      ctx.monitor.recordIssue(issueEvent);
      return;
    }

    // Stability gate per route; on timeout it records its own stability issue.
    await waitForStability({ network: ctx.network, recorder: ctx.recorder, monitor: ctx.monitor });
  }
}
