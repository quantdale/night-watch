// ---------------------------------------------------------------------------
// Nightwatch C-11 — reservation-based production budgets.
//
// The rule is RESERVE BEFORE DISPATCH. The forbidden shape is
// check → dispatch → increment, because between the check and the increment
// two workers both see capacity and both dispatch, and the budget is exceeded
// by exactly the amount of concurrency. Reserving first makes the reservation
// itself the mutual exclusion.
//
// Reservations are CONSUMED ON RESERVATION and are not refunded when a request
// fails. That is deliberate and matches the existing replay-reservation ledger:
// a failed production request has still touched production, so refunding it
// would let a failing route be retried without limit.
//
// Values come from `design.md §5.4` and are reconciled as-is. C-11 broadens
// nothing.
// ---------------------------------------------------------------------------

export const PRODUCTION_BUDGET_VERSION = 'nightwatch.production-budget.v1' as const;

export interface ProductionBudgetLimits {
  readonly campaignRequests: number;
  readonly serviceRequests: number;
  readonly routeRequests: number;
  readonly redirectsPerRequest: number;
  readonly responseBytes: number;
  readonly concurrency: number;
  readonly failures: number;
  readonly campaignWindowMs: number;
}

/** `design.md §5.4` v1 values, unmodified. */
export const PRODUCTION_BUDGET_DEFAULTS: ProductionBudgetLimits = Object.freeze({
  campaignRequests: 200,
  serviceRequests: 50,
  routeRequests: 10,
  redirectsPerRequest: 3,
  responseBytes: 2 * 1024 * 1024,
  concurrency: 1,
  failures: 3,
  campaignWindowMs: 60 * 60 * 1000,
});

export type BudgetScope = 'CAMPAIGN' | 'SERVICE' | 'ROUTE' | 'CONCURRENCY' | 'FAILURES' | 'WINDOW';

export interface BudgetReservation {
  readonly reservationId: number;
  /** Opaque identities only: never a URL, never a customer value. */
  readonly serviceKey: string;
  readonly routeKey: string;
}

export type ReservationResult =
  | { readonly ok: true; readonly reservation: BudgetReservation }
  | { readonly ok: false; readonly exhaustedScope: BudgetScope };

const KEY_RE = /^[A-Za-z0-9_.:-]{1,128}$/;

/**
 * A campaign's budget ledger.
 *
 * Single-threaded by construction — Node runs this on one thread and the
 * reserve path contains no `await` — so a reservation is atomic with respect to
 * other reservations. The concurrency limit is still modelled explicitly,
 * because "in flight" is a real resource even without preemption.
 */
export class ProductionBudgetLedger {
  readonly limits: ProductionBudgetLimits;
  private readonly startedAtMs: number;
  private campaignUsed = 0;
  private inFlight = 0;
  private failuresRecorded = 0;
  private nextReservationId = 1;
  private readonly serviceUsed = new Map<string, number>();
  private readonly routeUsed = new Map<string, number>();

  constructor(options: { readonly limits?: ProductionBudgetLimits; readonly startedAtMs: number }) {
    this.limits = options.limits ?? PRODUCTION_BUDGET_DEFAULTS;
    this.startedAtMs = options.startedAtMs;
  }

  get campaignRequestsUsed(): number { return this.campaignUsed; }
  get requestsInFlight(): number { return this.inFlight; }
  get failures(): number { return this.failuresRecorded; }

  serviceRequestsUsed(serviceKey: string): number { return this.serviceUsed.get(serviceKey) ?? 0; }
  routeRequestsUsed(routeKey: string): number { return this.routeUsed.get(routeKey) ?? 0; }

  /**
   * Reserve capacity for exactly one request. Every counter is incremented
   * before returning, so a caller that reserves and then never dispatches has
   * still spent the budget — which is the conservative direction.
   */
  reserve(request: { readonly serviceKey: string; readonly routeKey: string; readonly nowMs: number }): ReservationResult {
    if (!KEY_RE.test(request.serviceKey) || !KEY_RE.test(request.routeKey)) {
      throw new Error('PRODUCTION_BUDGET_KEY_INVALID');
    }
    if (request.nowMs - this.startedAtMs >= this.limits.campaignWindowMs) {
      return { ok: false, exhaustedScope: 'WINDOW' };
    }
    if (this.failuresRecorded >= this.limits.failures) return { ok: false, exhaustedScope: 'FAILURES' };
    if (this.inFlight >= this.limits.concurrency) return { ok: false, exhaustedScope: 'CONCURRENCY' };
    if (this.campaignUsed >= this.limits.campaignRequests) return { ok: false, exhaustedScope: 'CAMPAIGN' };
    if (this.serviceRequestsUsed(request.serviceKey) >= this.limits.serviceRequests) return { ok: false, exhaustedScope: 'SERVICE' };
    if (this.routeRequestsUsed(request.routeKey) >= this.limits.routeRequests) return { ok: false, exhaustedScope: 'ROUTE' };

    this.campaignUsed += 1;
    this.inFlight += 1;
    this.serviceUsed.set(request.serviceKey, this.serviceRequestsUsed(request.serviceKey) + 1);
    this.routeUsed.set(request.routeKey, this.routeRequestsUsed(request.routeKey) + 1);
    return {
      ok: true,
      reservation: Object.freeze({
        reservationId: this.nextReservationId++,
        serviceKey: request.serviceKey,
        routeKey: request.routeKey,
      }),
    };
  }

  /**
   * Settle an in-flight request. This releases only the CONCURRENCY slot; the
   * campaign, service and route counters stay spent, because the request
   * happened. `outcome: 'FAILURE'` additionally charges the failure budget.
   */
  settle(reservation: BudgetReservation, outcome: 'SUCCESS' | 'FAILURE'): void {
    void reservation;
    if (this.inFlight > 0) this.inFlight -= 1;
    if (outcome === 'FAILURE') this.failuresRecorded += 1;
  }

  /** Privacy-safe identity for the receipt: counts and limits, never keys. */
  budgetIdentity(digest: (canonical: string) => string): string {
    return `prodbudget:${digest(JSON.stringify({
      version: PRODUCTION_BUDGET_VERSION,
      limits: this.limits,
      campaignUsed: this.campaignUsed,
      distinctServices: this.serviceUsed.size,
      distinctRoutes: this.routeUsed.size,
      failures: this.failuresRecorded,
    }))}`;
  }
}
