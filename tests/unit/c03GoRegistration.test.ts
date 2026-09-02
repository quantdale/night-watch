// ---------------------------------------------------------------------------
// Nightwatch C-03 — bounded Go gRPC registration reader.
//
// Written BEFORE the parser. It states what a registration fact must be, and
// — more importantly — the many shapes that look like one and must not become
// one.
//
// The join this feeds is three mechanical links, no naming inference:
//
//   ouchan  billing.RegisterBillingServer(gs, svc)
//             with import github.com/alphauslabs/blue-sdk-go/billing/v1
//   sdk     billing_grpc.pb.go declares func RegisterBillingServer
//             AND ServiceName: "blueapi.billing.v1.Billing"
//   proto   billing.proto declares package blueapi.billing.v1; service Billing
//
// The middle link is generated data, which is why the result is a fact rather
// than a coincidence of naming. This suite owns the first link.
//
// Every fixture is explicit inline text; the reader has no filesystem
// authority at all (C-11 lesson 5.4).
// ---------------------------------------------------------------------------

import { expect, test } from '@playwright/test';
import {
  GO_REGISTRATION_VERSION,
  isTopologyEligibleGoPath,
  readGoRegistrations,
} from '../../src/core/source/goRegistration';

const SDK = 'github.com/alphauslabs/blue-sdk-go';

function registrations(sourceText: string) {
  return readGoRegistrations(sourceText).registrations;
}

const CANONICAL = `
package main

import (
	"context"
	billing "${SDK}/billing/v1"
	"google.golang.org/grpc"
)

func run(gs *grpc.Server, svc *service) {
	billing.RegisterBillingServer(gs, svc)
}
`;

test.describe('C-03 — a canonical registration is read exactly', () => {
  test('symbol, service token, qualifier and import path are all recovered', () => {
    const facts = readGoRegistrations(CANONICAL);
    expect(facts.schemaVersion).toBe(GO_REGISTRATION_VERSION);
    expect(facts.registrations).toHaveLength(1);
    const [registration] = facts.registrations;
    expect(registration?.registrationSymbol).toBe('RegisterBillingServer');
    expect(registration?.serviceToken).toBe('Billing');
    expect(registration?.qualifier).toBe('billing');
    expect(registration?.importPath).toBe(`${SDK}/billing/v1`);
    expect(registration?.state).toBe('PROVEN');
  });

  test('an unaliased import contributes its last path segment as the package name', () => {
    // `import "…/billing/v1"` binds the identifier `billing`, not `v1`: the
    // Go package name is the directory above a version segment. Getting this
    // wrong silently unresolves every real registration in ouchan, because
    // that is exactly how they are written.
    const facts = readGoRegistrations(`
      package main
      import "${SDK}/billing/v1"
      func run() { billing.RegisterBillingServer(gs, svc) }
    `);
    expect(facts.registrations[0]?.importPath).toBe(`${SDK}/billing/v1`);
    expect(facts.registrations[0]?.state).toBe('PROVEN');
  });

  test('a renamed alias is followed rather than guessed', () => {
    const facts = readGoRegistrations(`
      package main
      import bpkg "${SDK}/billing/v1"
      func run() { bpkg.RegisterBillingServer(gs, svc) }
    `);
    expect(facts.registrations[0]?.qualifier).toBe('bpkg');
    expect(facts.registrations[0]?.importPath).toBe(`${SDK}/billing/v1`);
    expect(facts.registrations[0]?.state).toBe('PROVEN');
  });

  test('several registrations in one file are all recovered, in order', () => {
    // `services/blued/main.go` registers six services. A model that assumes
    // one service per file or per daemon is wrong on the largest daemon in
    // the repository.
    const facts = readGoRegistrations(`
      package main
      import (
        org "${SDK}/org/v1"
        iam "${SDK}/iam/v1"
        admin "${SDK}/admin/v1"
      )
      func run() {
        org.RegisterOrganizationServer(gs, svc)
        iam.RegisterIamServer(gs, svc)
        admin.RegisterAdminServer(gs, svc)
      }
    `);
    expect(facts.registrations.map((entry) => entry.serviceToken)).toEqual(['Organization', 'Iam', 'Admin']);
    expect(facts.registrations.every((entry) => entry.state === 'PROVEN')).toBe(true);
  });

  test('a single-line import declaration is read', () => {
    const facts = readGoRegistrations(`
      package main
      import cost "${SDK}/cost/v1"
      func run() { cost.RegisterCostServer(gs, svc) }
    `);
    expect(facts.registrations[0]?.importPath).toBe(`${SDK}/cost/v1`);
  });

  test('registration inside a conditional is still a registration', () => {
    const facts = readGoRegistrations(`
      package main
      import flags "${SDK}/flags/v1"
      func run() {
        if enabled {
          flags.RegisterFlagsServer(gs, svc)
        }
      }
    `);
    expect(facts.registrations[0]?.state).toBe('PROVEN');
    expect(facts.registrations[0]?.serviceToken).toBe('Flags');
  });
});

test.describe('C-03 — comments and strings never produce a registration', () => {
  test('a registration in a line comment yields nothing', () => {
    expect(registrations(`
      package main
      import billing "${SDK}/billing/v1"
      func run() {
        // billing.RegisterBillingServer(gs, svc)
      }
    `)).toEqual([]);
  });

  test('a registration in a block comment yields nothing', () => {
    expect(registrations(`
      package main
      import billing "${SDK}/billing/v1"
      /* billing.RegisterBillingServer(gs, svc) */
    `)).toEqual([]);
  });

  test('a string containing registration text yields nothing', () => {
    expect(registrations(`
      package main
      import billing "${SDK}/billing/v1"
      var doc = "billing.RegisterBillingServer(gs, svc)"
    `)).toEqual([]);
  });

  test('a raw backtick string containing registration text yields nothing', () => {
    expect(registrations([
      'package main',
      `import billing "${SDK}/billing/v1"`,
      'var doc = `billing.RegisterBillingServer(gs, svc)`',
    ].join('\n'))).toEqual([]);
  });

  test('a commented import does not resolve a real registration', () => {
    const [registration] = registrations(`
      package main
      import (
        // billing "${SDK}/billing/v1"
      )
      func run() { billing.RegisterBillingServer(gs, svc) }
    `);
    expect(registration?.state).toBe('QUALIFIER_UNRESOLVED');
    expect(registration?.importPath).toBeNull();
  });
});

test.describe('C-03 — ambiguity and unresolvable shapes fail closed', () => {
  test('an unimported qualifier is QUALIFIER_UNRESOLVED, never guessed', () => {
    const [registration] = registrations(`
      package main
      func run() { billing.RegisterBillingServer(gs, svc) }
    `);
    expect(registration?.serviceToken).toBe('Billing');
    expect(registration?.importPath).toBeNull();
    expect(registration?.state).toBe('QUALIFIER_UNRESOLVED');
  });

  test('two imports binding the same identifier are QUALIFIER_AMBIGUOUS', () => {
    const [registration] = registrations(`
      package main
      import (
        billing "${SDK}/billing/v1"
        billing "github.com/example/other/billing"
      )
      func run() { billing.RegisterBillingServer(gs, svc) }
    `);
    expect(registration?.state).toBe('QUALIFIER_AMBIGUOUS');
    expect(registration?.importPath).toBeNull();
  });

  test('a dot import cannot resolve a qualifier and is not silently adopted', () => {
    const [registration] = registrations(`
      package main
      import . "${SDK}/billing/v1"
      func run() { billing.RegisterBillingServer(gs, svc) }
    `);
    expect(registration?.state).toBe('QUALIFIER_UNRESOLVED');
  });

  test('a blank import binds no identifier', () => {
    const [registration] = registrations(`
      package main
      import _ "${SDK}/billing/v1"
      func run() { billing.RegisterBillingServer(gs, svc) }
    `);
    expect(registration?.state).toBe('QUALIFIER_UNRESOLVED');
  });

  test('an unqualified call has no package to resolve', () => {
    const [registration] = registrations(`
      package main
      func run() { RegisterBillingServer(gs, svc) }
    `);
    expect(registration?.qualifier).toBeNull();
    expect(registration?.state).toBe('QUALIFIER_UNRESOLVED');
  });

  test('a same-named service reached through two different packages stays two facts', () => {
    // Same registration symbol, different import paths. Collapsing them would
    // bind one proto service to a package that never served it.
    const facts = readGoRegistrations(`
      package main
      import (
        a "${SDK}/billing/v1"
        b "github.com/example/vendor/billing/v1"
      )
      func run() {
        a.RegisterBillingServer(gs, svc)
        b.RegisterBillingServer(gs, svc)
      }
    `);
    expect(facts.registrations).toHaveLength(2);
    expect(new Set(facts.registrations.map((entry) => entry.importPath)).size).toBe(2);
  });

  test('a name that merely looks like a registration is not one', () => {
    expect(registrations(`
      package main
      func run() {
        registerBillingServer(gs, svc)
        RegisterBillingServerHelper(gs, svc)
        billing.RegisterBilling(gs, svc)
        billing.BillingServer(gs, svc)
      }
    `)).toEqual([]);
  });

  test('an empty service token is not a registration', () => {
    expect(registrations('package main\nfunc run() { billing.RegisterServer(gs, svc) }')).toEqual([]);
  });
});

test.describe('C-03 — Unimplemented embedding is read as corroboration', () => {
  test('an embedding is recovered with its qualifier and import path', () => {
    const facts = readGoRegistrations(`
      package main
      import billing "${SDK}/billing/v1"
      type service struct {
        billing.UnimplementedBillingServer
      }
    `);
    expect(facts.embeddings).toHaveLength(1);
    expect(facts.embeddings[0]?.serviceToken).toBe('Billing');
    expect(facts.embeddings[0]?.importPath).toBe(`${SDK}/billing/v1`);
  });

  test('a commented embedding yields nothing', () => {
    const facts = readGoRegistrations(`
      package main
      import billing "${SDK}/billing/v1"
      type service struct {
        // billing.UnimplementedBillingServer
      }
    `);
    expect(facts.embeddings).toEqual([]);
  });

  test('an embedding is not counted as a registration', () => {
    const facts = readGoRegistrations(`
      package main
      import billing "${SDK}/billing/v1"
      type service struct { billing.UnimplementedBillingServer }
    `);
    expect(facts.registrations).toEqual([]);
  });
});

test.describe('C-03 — test files are excluded by path, before parsing', () => {
  test('_test.go is not topology-eligible', () => {
    // Real corpus: pkg/exportcostfilters/sync_test.go and
    // exportcostfilters_test.go both register stub Cost servers. Without this
    // exclusion, Cost acquires two implementations that serve nothing.
    expect(isTopologyEligibleGoPath('pkg/exportcostfilters/sync_test.go')).toBe(false);
    expect(isTopologyEligibleGoPath('pkg/exportcostfilters/exportcostfilters_test.go')).toBe(false);
  });

  test('a production file is topology-eligible', () => {
    expect(isTopologyEligibleGoPath('services/billingd/main.go')).toBe(true);
    expect(isTopologyEligibleGoPath('services/blued/service.go')).toBe(true);
  });

  test('a file merely containing the word test is still eligible', () => {
    expect(isTopologyEligibleGoPath('services/testd/main.go')).toBe(true);
    expect(isTopologyEligibleGoPath('pkg/testutil/helper.go')).toBe(true);
  });

  test('a non-Go path is never topology-eligible', () => {
    expect(isTopologyEligibleGoPath('services/billingd/main.py')).toBe(false);
    expect(isTopologyEligibleGoPath('README.md')).toBe(false);
  });
});

test.describe('C-03 — boundedness and determinism', () => {
  test('an oversized source fails closed rather than truncating into a fact', () => {
    const facts = readGoRegistrations('var x = 1\n'.repeat(400_000));
    expect(facts.completeness.state).not.toBe('COMPLETE');
    expect(facts.registrations).toEqual([]);
  });

  test('the same source read twice yields identical facts', () => {
    expect(JSON.stringify(readGoRegistrations(CANONICAL))).toBe(JSON.stringify(readGoRegistrations(CANONICAL)));
  });

  test('an empty file is complete and empty', () => {
    const facts = readGoRegistrations('');
    expect(facts.registrations).toEqual([]);
    expect(facts.completeness.state).toBe('COMPLETE');
  });
});
