// ---------------------------------------------------------------------------
// Nightwatch — product registry. Phase 1: Ripple only.
// ---------------------------------------------------------------------------

export interface CandidateRoute {
  id: string;
  label: string;
  /** Path template (Phase 1: fixture-relative; exact ripple-ui route paths
   *  are re-verified against the real app in Phase 2). */
  path: string;
  /** Phase 1 journeys are read-only by construction. */
  passive: boolean;
  note?: string;
}

export interface ProductConfig {
  id: string;
  label: string;
  candidateRoutes: CandidateRoute[];
}

export const rippleProduct: ProductConfig = {
  id: 'ripple',
  label: 'Ripple — legacy Vue 2 billing console (mobingilabs/ripple-ui)',
  candidateRoutes: [
    { id: 'dashboard', label: 'Dashboard', path: '/', passive: true },
    { id: 'invoice-list', label: 'Invoice list', path: '/invoices', passive: true },
    { id: 'invoice-detail', label: 'Invoice detail', path: '/invoices/:month', passive: true },
    { id: 'billing-group-list', label: 'Billing-group list', path: '/billing-groups', passive: true },
    {
      id: 'billing-group-detail',
      label: 'Billing-group detail',
      path: '/billing-groups/:id',
      passive: true,
      note: 'Read-only detail views only; settings forms are mutations and out of scope for Phase 1.',
    },
  ],
};


