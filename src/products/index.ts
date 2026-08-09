// ---------------------------------------------------------------------------
// Nightwatch — product registry. Phase 1: Ripple only.
// ---------------------------------------------------------------------------

import { rippleProduct, type ProductConfig } from './ripple/config';

export { ProductConfig, CandidateRoute } from './ripple/config';

export const PRODUCTS: Record<string, ProductConfig> = {
  ripple: rippleProduct,
};

export function resolveProduct(id: string | undefined): ProductConfig {
  if (!id || !PRODUCTS[id]) {
    throw new Error(`fail-closed: unknown product "${id ?? ''}" (Phase 1 supports: ${Object.keys(PRODUCTS).join(', ')})`);
  }
  return PRODUCTS[id]!;
}
