// Phase 19 — generic product/surface adapter boundary. It describes a
// reviewed, read-only metadata universe; it is not a runtime connector and
// does not imply support for any additional real Alphaus product.

export const PRODUCT_ADAPTER_VERSION = "nightwatch.product-adapter.v1" as const;

export interface ProductSurfaceAdapter {
  readonly surfaceId: string;
  readonly routeClass: string;
  readonly readOnly: true;
  readonly journeyClasses: readonly string[];
  readonly semanticContractIds: readonly string[];
}

export interface ProductAdapter {
  readonly adapterVersion: typeof PRODUCT_ADAPTER_VERSION;
  readonly productId: string;
  readonly label: string;
  readonly readOnlyOnly: true;
  readonly syntheticFixtureOnly: boolean;
  readonly surfaces: readonly ProductSurfaceAdapter[];
}

function invalid(reason: string): never {
  throw new Error(`PRODUCT_ADAPTER_INVALID:${reason}`);
}

function safeId(value: unknown, field: string): asserts value is string {
  if (typeof value !== "string" || !/^[A-Za-z0-9][A-Za-z0-9_.:/-]{0,199}$/.test(value)) invalid(`${field}_ID`);
}

function validateSurface(surface: ProductSurfaceAdapter): void {
  safeId(surface.surfaceId, "SURFACE");
  if (typeof surface.routeClass !== "string" || !/^\/[A-Za-z0-9._~!$&'()*+,;=:@%/-]*$/.test(surface.routeClass)) invalid("ROUTE_CLASS");
  if (surface.readOnly !== true) invalid("READ_ONLY_REQUIRED");
  for (const value of [...surface.journeyClasses, ...surface.semanticContractIds]) safeId(value, "SURFACE_MEMBER");
}

export function validateProductAdapter(adapter: ProductAdapter): void {
  if (adapter.adapterVersion !== PRODUCT_ADAPTER_VERSION) invalid("VERSION");
  safeId(adapter.productId, "PRODUCT");
  if (typeof adapter.label !== "string" || adapter.label.length === 0 || adapter.label.length > 200 || /(?:CUSTOMER_SENTINEL|ACCOUNT_SENTINEL|EMAIL_SENTINEL|COST_SENTINEL|TOKEN_SENTINEL|Bearer\s+|https?:\/\/)/i.test(adapter.label)) invalid("LABEL");
  if (adapter.readOnlyOnly !== true) invalid("READ_ONLY_ONLY");
  if (typeof adapter.syntheticFixtureOnly !== "boolean") invalid("SYNTHETIC_FIXTURE_ONLY");
  if (!Array.isArray(adapter.surfaces) || adapter.surfaces.length > 256) invalid("SURFACES");
  const ids = new Set<string>();
  for (const surface of adapter.surfaces) {
    validateSurface(surface);
    if (ids.has(surface.surfaceId)) invalid("DUPLICATE_SURFACE");
    ids.add(surface.surfaceId);
  }
}

/** Adapt the existing product-config shape without changing its behavior. */
export function adapterFromProductConfig(config: {
  readonly id: string;
  readonly label: string;
  readonly candidateRoutes: readonly { readonly id: string; readonly path: string; readonly passive: boolean }[];
}, options: { readonly syntheticFixtureOnly?: boolean } = {}): ProductAdapter {
  const adapter: ProductAdapter = {
    adapterVersion: PRODUCT_ADAPTER_VERSION,
    productId: config.id,
    label: config.label,
    readOnlyOnly: true,
    syntheticFixtureOnly: options.syntheticFixtureOnly ?? false,
    surfaces: config.candidateRoutes.map((route) => ({
      surfaceId: route.id,
      routeClass: route.path,
      readOnly: route.passive ? true : invalid("MUTATING_ROUTE_NOT_ADMITTED"),
      journeyClasses: [],
      semanticContractIds: [],
    })),
  };
  validateProductAdapter(adapter);
  return adapter;
}
