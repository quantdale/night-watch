// Phase 19 synthetic-only genericity fixtures. This is not a claim of support
// for a real additional Alphaus product and is never registered by the CLI.

import { adapterFromProductConfig, type ProductAdapter } from "../../src/products/adapter";

export const PHASE19_SYNTHETIC_LEDGER_ADAPTER: ProductAdapter = adapterFromProductConfig({
  id: "synthetic-ledger",
  label: "Synthetic ledger fixture",
  candidateRoutes: [
    { id: "summary", path: "/summary", passive: true },
    { id: "detail", path: "/summary/:id", passive: true },
  ],
}, { syntheticFixtureOnly: true });
