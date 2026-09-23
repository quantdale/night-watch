// ---------------------------------------------------------------------------
// Nightwatch — causal request generations (NW-AUD-020, M5).
//
// Authority lifetime is a DETERMINISTIC state machine, never a timer: a
// generation is opened explicitly (approved action or navigation), remains
// authoritative while OPEN through bounded settlement, and loses authority
// only through explicit `settle()`. A request at 249/250/251 ms observes the
// same verdict as at 0 ms — wall-clock delay alone never grants or revokes
// causality.
//
// Attribution:
//   attributeExplicit(id)  — the caller has direct causal knowledge (the
//                            journey intent seam) and binds that generation.
//   attributeImplicit()    — no direct knowledge: exactly one OPEN generation
//                            attributes; zero => null; more than one =>
//                            AMBIGUOUS (fail closed, neither credited).
//
// The registry itself permits multiple concurrent OPEN generations (needed
// for navigation+action overlap and the cross-generation confusion matrix);
// single-action policy remains enforced by its consumer (networkObserver
// still throws on overlapping journey actions).
//
// Pure module: no I/O, no wall clock, no persistence.
// ---------------------------------------------------------------------------

export const CAUSAL_GENERATIONS_SCHEMA = 'nightwatch.causal-generations.v1' as const;

/** Live-open bound: a runaway opener must fail closed, not leak authority. */
export const MAX_OPEN_GENERATIONS = 16;
/** Lifetime bound over one run. */
export const MAX_GENERATIONS_TOTAL = 4096;

export const AMBIGUOUS_ATTRIBUTION = 'AMBIGUOUS' as const;

export type GenerationKind = 'ACTION' | 'NAVIGATION';
export type GenerationState = 'OPEN' | 'SETTLED';

export interface GenerationRecord {
  readonly id: string;
  readonly kind: GenerationKind;
  readonly seq: number;
  readonly state: GenerationState;
}

export type Attribution =
  | { readonly kind: 'GENERATION'; readonly id: string }
  | { readonly kind: 'NONE' }
  | { readonly kind: typeof AMBIGUOUS_ATTRIBUTION; readonly candidates: readonly string[] };

export class GenerationRegistry {
  private readonly generations = new Map<string, GenerationRecord>();
  private counter = 0;

  /** Open a new generation. Ids are monotonic and clock-free. */
  open(kind: GenerationKind): GenerationRecord {
    const openCount = this.countOpen();
    if (openCount >= MAX_OPEN_GENERATIONS) throw new Error('GENERATION_BUDGET_EXCEEDED');
    if (this.counter >= MAX_GENERATIONS_TOTAL) throw new Error('GENERATION_BUDGET_EXCEEDED');
    this.counter += 1;
    const id = `gen:${String(this.counter).padStart(6, '0')}`;
    const record: GenerationRecord = Object.freeze({ id, kind, seq: this.counter, state: 'OPEN' as const });
    this.generations.set(id, record);
    return record;
  }

  /**
   * Deterministic settlement: authority ends HERE, regardless of how much
   * wall-clock time has passed. Settling twice is idempotent; an unknown id
   * fails closed (a stale caller cannot settle a generation it does not own).
   */
  settle(id: string): GenerationRecord {
    const record = this.generations.get(id);
    if (record === undefined) throw new Error('GENERATION_UNKNOWN');
    if (record.state === 'SETTLED') return record;
    const settled: GenerationRecord = Object.freeze({ ...record, state: 'SETTLED' as const });
    this.generations.set(id, settled);
    return settled;
  }

  get(id: string): GenerationRecord | null {
    return this.generations.get(id) ?? null;
  }

  /** True only while OPEN — the single authority predicate. */
  isActive(id: string): boolean {
    return this.generations.get(id)?.state === 'OPEN';
  }

  /** Direct causal knowledge: bind this generation, whatever else is open. */
  attributeExplicit(id: string): Attribution {
    if (!this.generations.has(id)) return { kind: 'NONE' };
    if (!this.isActive(id)) return { kind: 'NONE' };
    return { kind: 'GENERATION', id };
  }

  /** No direct knowledge: exactly one OPEN generation, else none/AMBIGUOUS. */
  attributeImplicit(): Attribution {
    const open = this.openIds();
    if (open.length === 0) return { kind: 'NONE' };
    const only = open[0];
    if (open.length === 1 && only !== undefined) return { kind: 'GENERATION', id: only };
    return { kind: AMBIGUOUS_ATTRIBUTION, candidates: open };
  }

  openIds(): string[] {
    return [...this.generations.values()]
      .filter((record) => record.state === 'OPEN')
      .map((record) => record.id)
      .sort();
  }

  snapshot(): readonly GenerationRecord[] {
    return [...this.generations.values()].map((record) => ({ ...record }));
  }

  private countOpen(): number {
    let open = 0;
    for (const record of this.generations.values()) if (record.state === 'OPEN') open += 1;
    return open;
  }
}
