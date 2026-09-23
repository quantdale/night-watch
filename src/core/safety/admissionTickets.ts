// ---------------------------------------------------------------------------
// Nightwatch — bounded admission tickets for lower transports (NW-AUD-020).
//
// L1/L0/L2 mint exactly ONE ticket per admitted product-API effect (their
// layer-ownership rules already guarantee no double-mint). The L5 proxy
// CONSUMES a matching one-shot ticket before forwarding an API-host request,
// and requires mere PRESENCE (plus a per-host tunnel cardinality budget)
// before opening a CONNECT tunnel. This is verification, not a second
// spend: bootstrap budgets are never evaluated down here.
//
// Tickets are PROCESS-LOCAL, transient, and never persisted — no concrete
// route parameter ever becomes durable evidence. Matching uses the proven
// route pattern (exact path or anchored pattern) so a ticket cannot be
// replayed for a different route: mismatch fails closed.
//
// Pure module: no I/O, no wall clock (cardinality and one-shot consumption
// are the bounds; a run-scoped ledger dies with its process).
// ---------------------------------------------------------------------------

export const ADMISSION_TICKET_SCHEMA = 'nightwatch.admission-ticket.v1' as const;

/** Ledger bound: runaway minting fails closed rather than growing forever. */
export const MAX_ADMISSION_TICKETS = 4096;
/** Per-host CONNECT cardinality: tunnels are counted, never unbounded. */
export const MAX_TUNNELS_PER_HOST = 8;

export interface AdmissionTicketInput {
  readonly environment: string;
  readonly origin: string;
  readonly method: string;
  /** Proven match pattern: exact path OR anchored regex source (transient). */
  readonly matchPattern: string;
  readonly ruleId: string;
  readonly sourceProof: string;
  readonly generationId: string;
  readonly transport: string;
}

interface TicketRecord extends AdmissionTicketInput {
  consumed: boolean;
}

function safePattern(pattern: string): RegExp | string {
  if (pattern.startsWith('^')) {
    if (!pattern.endsWith('$')) throw new Error('ADMISSION_TICKET_PATTERN_UNANCHORED');
    return new RegExp(pattern);
  }
  if (pattern.includes('?') || pattern.includes('#') || pattern.includes('..')) {
    // Exact-path patterns are literal membership — never query/fragment text.
    throw new Error('ADMISSION_TICKET_PATTERN_UNSAFE');
  }
  return pattern;
}

export class AdmissionTicketLedger {
  private readonly tickets: TicketRecord[] = [];
  private readonly tunnels = new Map<string, number>();

  /** Mint one one-shot ticket for an admitted effect. Fails closed on bounds. */
  mint(input: AdmissionTicketInput): void {
    if (this.tickets.length >= MAX_ADMISSION_TICKETS) {
      // Bounded: evict the oldest consumed tickets first, then fail closed.
      const consumedIndex = this.tickets.findIndex((ticket) => ticket.consumed);
      if (consumedIndex >= 0) this.tickets.splice(consumedIndex, 1);
      if (this.tickets.length >= MAX_ADMISSION_TICKETS) throw new Error('ADMISSION_TICKET_BUDGET_EXCEEDED');
    }
    safePattern(input.matchPattern); // registration validation
    this.tickets.push({ ...input, consumed: false });
  }

  /**
   * Consume ONE matching ticket for a forwarded API-host request.
   * Exact origin + normalized method + proven pattern membership. One-shot:
   * a replay finds no unconsumed ticket and refuses.
   */
  consume(request: { origin: string; method: string; pathname: string }): { admitted: true } | { admitted: false; code: string } {
    const method = request.method.trim().toUpperCase();
    let pathname = request.pathname;
    try {
      pathname = decodeURIComponent(pathname);
    } catch {
      /* keep raw */
    }
    for (const ticket of this.tickets) {
      if (ticket.consumed) continue;
      if (ticket.origin !== request.origin) continue;
      if (ticket.method.toUpperCase() !== method) continue;
      const pattern = safePattern(ticket.matchPattern);
      const matches = typeof pattern === 'string' ? pattern === pathname : pattern.test(pathname);
      if (!matches) continue;
      ticket.consumed = true;
      return { admitted: true };
    }
    return { admitted: false, code: 'PROXY_ADMISSION_TICKET_MISSING' };
  }

  /**
   * CONNECT pre-establishment: the destination host must have pre-existing
   * admitted authority (presence, not consumption — one tunnel serves many
   * already-ticketed requests) plus a per-host tunnel cardinality budget.
   * The inner route stays opaque (no MITM); this binds destination, budget
   * and capability presence — the honest maximum for a TLS tunnel.
   */
  authorizeTunnel(hostname: string): { admitted: true } | { admitted: false; code: string } {
    const hostHasAuthority = this.tickets.some(
      (ticket) => new URL(ticket.origin).hostname === hostname,
    );
    if (!hostHasAuthority) return { admitted: false, code: 'PROXY_TUNNEL_CAPABILITY_MISSING' };
    const open = this.tunnels.get(hostname) ?? 0;
    if (open >= MAX_TUNNELS_PER_HOST) {
      return { admitted: false, code: 'PROXY_TUNNEL_BUDGET_EXCEEDED' };
    }
    this.tunnels.set(hostname, open + 1);
    return { admitted: true };
  }

  /** Test/run isolation hook: no ticket or tunnel survives a reset. */
  reset(): void {
    this.tickets.length = 0;
    this.tunnels.clear();
  }

  // Diagnostics (counts only — never ticket contents).
  get unconsumedCount(): number {
    return this.tickets.filter((ticket) => !ticket.consumed).length;
  }

  get totalCount(): number {
    return this.tickets.length;
  }
}

/** Process-local singleton shared by the observer/guard/proxy in one harness. */
let singleton: AdmissionTicketLedger | null = null;

export function admissionTicketLedger(): AdmissionTicketLedger {
  singleton ??= new AdmissionTicketLedger();
  return singleton;
}

export function resetAdmissionTickets(): void {
  singleton ??= new AdmissionTicketLedger();
  singleton.reset();
}
