// ---------------------------------------------------------------------------
// Nightwatch C-11 — categorical, TERMINAL production breakers.
//
// Terminal means terminal for the CAMPAIGN, not for the request. A breaker
// that only failed the current request would let a systematic anomaly be
// re-attempted indefinitely, one request at a time, which is how a safety
// signal becomes noise. Once open, every subsequent admission denies.
//
// There is no reset. Recovery is a new authorized campaign, so a breaker
// cannot be cleared by the code that tripped it.
// ---------------------------------------------------------------------------

import { BREAKER_CATEGORIES, type BreakerCategory } from './types';

export const PRODUCTION_BREAKER_VERSION = 'nightwatch.production-breakers.v1' as const;

export class ProductionBreakerBoard {
  private readonly opened: BreakerCategory[] = [];

  get isOpen(): boolean { return this.opened.length > 0; }

  /** Ordered by when each opened, so the receipt shows the first cause. */
  get openedCategories(): readonly BreakerCategory[] { return Object.freeze([...this.opened]); }

  get firstOpened(): BreakerCategory | null { return this.opened[0] ?? null; }

  open(category: BreakerCategory): void {
    if (!BREAKER_CATEGORIES.includes(category)) throw new Error(`PRODUCTION_BREAKER_CATEGORY_INVALID:${String(category)}`);
    if (!this.opened.includes(category)) this.opened.push(category);
  }

  /** Categorical state for the receipt. `CLOSED` or the first category to open. */
  breakerState(): 'CLOSED' | BreakerCategory {
    return this.firstOpened ?? 'CLOSED';
  }
}
