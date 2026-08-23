// ---------------------------------------------------------------------------
// Nightwatch — product registry. Phase 1: Ripple only.
// ---------------------------------------------------------------------------

import { rippleProduct, type ProductConfig } from './ripple/config';
import { adapterFromProductConfig } from './adapter';

export * from './adapter';

export { ProductConfig, CandidateRoute } from './ripple/config';

export const PRODUCTS: Record<string, ProductConfig> = {
  ripple: rippleProduct,
};

/** Generic metadata adapter registry. It does not add runtime products. */
export const PRODUCT_ADAPTERS = Object.freeze({
  ripple: adapterFromProductConfig(rippleProduct),
});

export function resolveProduct(id: string | undefined): ProductConfig {
  if (!id || !PRODUCTS[id]) {
    throw new Error(`fail-closed: unknown product "${id ?? ''}" (Phase 1 supports: ${Object.keys(PRODUCTS).join(', ')})`);
  }
  return PRODUCTS[id]!;
}
