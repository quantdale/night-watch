// ---------------------------------------------------------------------------
// C-06(PHP) — mechanically sound read-only proof.
//
// The negative corpus is the point of this file. Every case in it is a route
// that a naive analyzer would admit and that MUST NOT be admitted:
//
//   N1  the first historical D-79 admission          (catalog KNOWN_READ)
//   N2  the second historical D-79 admission         (catalog KNOWN_READ)
//   N3  a GET whose resolved closure reaches a write
//   N4  a GET whose MIDDLEWARE performs an external call   (review F-01)
//   N5  a GET with an unclassified callee
//   N6  a GET that overflows the closure depth bound
//   N7  a GET with a dynamic-dispatch callee
//   N8  a GET with an ambiguous route → handler join
//
// The positive corpus (P1) proves the analyzer is not trivially "everything
// UNKNOWN": a route whose pipeline resolves and whose closure is fully
// classified and pure IS admitted.
// ---------------------------------------------------------------------------

import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { PHASE5_API_CATALOG } from '../../src/api/phase5/catalog';
import {
  EFFECT_KINDS,
  EFFECT_KIND_POLICY,
  phpCalleeEffectKind,
  phpEffectVocabularyDigest,
  isPhpDynamicDispatchCallee,
} from '../../src/core/source/effectVocabulary';
import { analyzePhpEffectClosure } from '../../src/core/source/phpEffectClosure';
import { parsePhpRouteMiddlewareFlags, parsePhpRoutePipelineModel, resolvePhpRoutePipeline } from '../../src/core/source/phpPipeline';
import { buildReadOnlyProof, readOnlyClassificationFromProof } from '../../src/core/source/readOnlyProof';
import { createRealSourceScanConfig } from '../../src/core/source/scan';
import { createSiblingSourceAccess } from '../../src/core/source/siblingSource';
import { discoverSourceSurfaces, type SourceSurfaceDiscovery } from '../../src/core/source/surfaces';
import { pureReadClosure, resolvedEmptyPipeline } from '../helpers/readOnlyProofFixtures';

/** The catalog SHA the historical eleven-row admissions were recorded at. */
const RIPPLE_SHA = '27bb007ad0c798800b6bd3b29760c966422966e7';

// ---------------------------------------------------------------------------
// Synthetic repository fixture
// ---------------------------------------------------------------------------

interface Fixture {
  readonly root: string;
  readonly write: (relativePath: string, contents: string) => void;
  readonly discover: () => SourceSurfaceDiscovery;
  readonly dispose: () => void;
}

function fixture(): Fixture {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'nightwatch-c06-'));
  const repo = path.join(root, 'mobingilabs', 'ripple-api');
  fs.mkdirSync(path.join(repo, '.git', 'refs', 'heads'), { recursive: true });
  fs.writeFileSync(path.join(repo, '.git', 'HEAD'), 'ref: refs/heads/main\n');
  fs.writeFileSync(path.join(repo, '.git', 'refs', 'heads', 'main'), `${RIPPLE_SHA}\n`);
  const write = (relativePath: string, contents: string): void => {
    const target = path.join(repo, relativePath);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, contents);
  };
  const config = createRealSourceScanConfig({
    runtimeMappingNamespace: 'ripple',
    approvedRepositories: [{
      repoId: 'mobingilabs/ripple-api',
      expectedSourceSha: RIPPLE_SHA,
      allowlistedRoots: ['src'],
      allowedExtensions: ['.php', '.json', '.yaml'],
      maxFiles: 64,
      maxFileBytes: 64_000,
      maxTotalBytes: 1_000_000,
    }],
  });
  return {
    root,
    write,
    discover: () => discoverSourceSurfaces({ access: createSiblingSourceAccess(root), config }),
    dispose: () => fs.rmSync(root, { recursive: true, force: true }),
  };
}

/**
 * A route provider with the same structure as the real Slim-style provider:
 * two unconditional attachments, and a flag-gated group that attaches the
 * subscription middleware together with the header middleware.
 */
const ROUTE_PROVIDER = `<?php
namespace App\\Route\\Providor;

use App\\Middleware\\SubscriptionMiddleware;
use App\\Route\\Middleware\\CorsMiddleware;
use App\\Route\\Middleware\\HeaderMiddleware;
use App\\Route\\Middleware\\PostResponseMiddleware;

class RouteProvidor
{
    public function __construct($app)
    {
        $set_header = new HeaderMiddleware();
        $subscription = new SubscriptionMiddleware();
        $app->add(new CorsMiddleware());
        $app->add(new PostResponseMiddleware());
        foreach ($mw['middleware'] as $mk => $mv) {
            if ($mk == "header" && $mv && $set_header) {
                $rg->add($set_header);
            }
            if ($mk == "x-header" && $mv) {
                $rg->add($subscription);
            }
        }
    }
}
`;

const PURE_MIDDLEWARE = (name: string): string => `<?php
namespace App\\Route\\Middleware;

class ${name}
{
    public function __invoke($request, $response, $next)
    {
        return json_encode(array('ok' => true));
    }
}
`;

/** Structural replica of the measured external-call middleware: an unguarded
 * `__invoke` that performs an outbound call on every request. */
const EXTERNAL_CALL_MIDDLEWARE = `<?php
namespace App\\Middleware;

class SubscriptionMiddleware
{
    public function __invoke($request, $response, $next)
    {
        $ch = curl_init();
        curl_setopt($ch, 1, 2);
        $body = curl_exec($ch);
        return json_decode($body);
    }
}
`;

function routingYaml(routes: readonly string[], xHeaderDefault: boolean): string {
  return [
    'ROUTING:',
    '    default_config:',
    '        middleware:',
    '            header: true',
    `            x-header: ${xHeaderDefault ? 'true' : 'false'}`,
    '',
    ...routes,
    '',
  ].join('\n');
}

function route(key: string, client: string, method: string): readonly string[] {
  return [`    "${key}":`, `        client: App\\Handler\\${client}`, `        method: ${method}`];
}

/** Install the shared pipeline files every end-to-end case needs. */
function installPipeline(target: Fixture): void {
  target.write('src/App/Route/Providor/RouteProvidor.php', ROUTE_PROVIDER);
  target.write('src/App/Route/Middleware/CorsMiddleware.php', PURE_MIDDLEWARE('CorsMiddleware'));
  target.write('src/App/Route/Middleware/PostResponseMiddleware.php', PURE_MIDDLEWARE('PostResponseMiddleware'));
  target.write('src/App/Route/Middleware/HeaderMiddleware.php', PURE_MIDDLEWARE('HeaderMiddleware'));
  target.write('src/App/Middleware/SubscriptionMiddleware.php', EXTERNAL_CALL_MIDDLEWARE);
}

function classificationOf(discovery: SourceSurfaceDiscovery, routeTemplate: string): string {
  const surface = discovery.surfaces.find((entry) => entry.operation.routeTemplate === routeTemplate);
  expect(surface, `surface for ${routeTemplate}`).toBeTruthy();
  return surface!.operation.readOnlyClassification;
}

function proofOf(discovery: SourceSurfaceDiscovery, routeTemplate: string) {
  const surface = discovery.surfaces.find((entry) => entry.operation.routeTemplate === routeTemplate);
  expect(surface, `surface for ${routeTemplate}`).toBeTruthy();
  return surface!.readOnlyProof;
}

// ---------------------------------------------------------------------------
// Vocabulary
// ---------------------------------------------------------------------------

test.describe('C-06 effect-kind vocabulary', () => {
  test('states an explicit admission policy for every kind, and only PURE_READ is admissible', () => {
    for (const kind of EFFECT_KINDS) expect(EFFECT_KIND_POLICY[kind]).toBeTruthy();
    expect(EFFECT_KIND_POLICY.PURE_READ).toBe('ADMISSIBLE');
    expect(EFFECT_KIND_POLICY.UNCLASSIFIED).toBe('FAIL_CLOSED');
    for (const kind of EFFECT_KINDS.filter((entry) => entry !== 'PURE_READ' && entry !== 'UNCLASSIFIED')) {
      expect(EFFECT_KIND_POLICY[kind]).toBe('DISQUALIFYING');
    }
  });

  test('an identifier the table does not name is UNCLASSIFIED, never a read', () => {
    expect(phpCalleeEffectKind('getItem', 'METHOD')).toBe('PURE_READ');
    expect(phpCalleeEffectKind('updateItem', 'METHOD')).toBe('DATA_WRITE');
    expect(phpCalleeEffectKind('deleteHashData', 'METHOD')).toBe('CACHE_WRITE');
    expect(phpCalleeEffectKind('curl_exec', 'FUNCTION')).toBe('EXTERNAL_CALL');
    expect(phpCalleeEffectKind('getSomethingNobodyClassified', 'METHOD')).toBe('UNCLASSIFIED');
    // Scope is not interchangeable: a method name is not a function name.
    expect(phpCalleeEffectKind('curl_exec', 'METHOD')).toBe('UNCLASSIFIED');
  });

  test('callback-taking and magic-member constructs defeat name-based dispatch', () => {
    expect(isPhpDynamicDispatchCallee('call_user_func_array', 'FUNCTION')).toBe(true);
    expect(isPhpDynamicDispatchCallee('array_map', 'FUNCTION')).toBe(true);
    expect(isPhpDynamicDispatchCallee('__callStatic', 'METHOD')).toBe(true);
    expect(isPhpDynamicDispatchCallee('getItem', 'METHOD')).toBe(false);
  });

  test('the vocabulary digest is deterministic and prefixed evidence', () => {
    expect(phpEffectVocabularyDigest()).toBe(phpEffectVocabularyDigest());
    expect(phpEffectVocabularyDigest()).toMatch(/^ev:sha256:[0-9a-f]{24}$/);
  });
});

// ---------------------------------------------------------------------------
// Pipeline resolution
// ---------------------------------------------------------------------------

test.describe('C-06 route → middleware pipeline resolution', () => {
  test('recovers unconditional and flag-gated attachments from the provider', () => {
    const model = parsePhpRoutePipelineModel({ providerPath: 'src/App/Route/Providor/RouteProvidor.php', providerSource: ROUTE_PROVIDER });
    expect(model.state).toBe('RESOLVED');
    expect(model.unconditional.map((entry) => entry.className).sort()).toEqual([
      'App\\Route\\Middleware\\CorsMiddleware',
      'App\\Route\\Middleware\\PostResponseMiddleware',
    ]);
    expect(model.declaredFlags).toEqual(['header', 'x-header']);
    expect(model.conditional.find((entry) => entry.flag === 'x-header')?.className).toBe('App\\Middleware\\SubscriptionMiddleware');
    expect(model.conditional.find((entry) => entry.flag === 'x-header')?.relativePath).toBe('src/App/Middleware/SubscriptionMiddleware.php');
  });

  test('an unavailable provider is AMBIGUOUS, never an empty pipeline', () => {
    const model = parsePhpRoutePipelineModel({ providerPath: 'missing', providerSource: null });
    expect(model.state).toBe('AMBIGUOUS');
    expect(model.rejectionCode).toBe('PIPELINE_PROVIDER_UNAVAILABLE');
    const resolved = resolvePhpRoutePipeline({ model, flags: { defaults: new Map([['header', true]]), overrides: new Map() }, method: 'GET', routeTemplate: '/x' });
    expect(resolved.state).toBe('AMBIGUOUS');
    expect(resolved.middleware).toHaveLength(0);
  });

  test('an attachment whose argument does not resolve to a class is terminal', () => {
    const model = parsePhpRoutePipelineModel({
      providerPath: 'p.php',
      providerSource: '<?php class P { public function __construct($app) { $app->add($mystery); } }',
    });
    expect(model.state).toBe('AMBIGUOUS');
    expect(model.rejectionCode).toBe('PIPELINE_ATTACHMENT_UNRESOLVED');
  });

  test('per-route flags override the routing defaults', () => {
    const yaml = routingYaml([...route('get:/version', 'Version', 'get'), '        middleware:', '            header: false', '            x-header: false'], true);
    const flags = parsePhpRouteMiddlewareFlags(yaml);
    expect(flags.defaults).toEqual(new Map([['header', true], ['x-header', true]]));
    expect(flags.overrides.get('get:/version')).toEqual(new Map([['header', false], ['x-header', false]]));
  });

  test('a flag the provider never reads, and a flag the route never states, both fail closed', () => {
    const model = parsePhpRoutePipelineModel({ providerPath: 'p.php', providerSource: ROUTE_PROVIDER });
    const unknownFlag = resolvePhpRoutePipeline({
      model,
      flags: { defaults: new Map([['header', true], ['x-header', true], ['invented', true]]), overrides: new Map() },
      method: 'GET',
      routeTemplate: '/x',
    });
    expect(unknownFlag.rejectionCode).toBe('PIPELINE_FLAG_UNKNOWN');
    const missingFlag = resolvePhpRoutePipeline({
      model,
      flags: { defaults: new Map([['header', true]]), overrides: new Map() },
      method: 'GET',
      routeTemplate: '/x',
    });
    expect(missingFlag.rejectionCode).toBe('PIPELINE_FLAG_UNKNOWN');
  });
});

// ---------------------------------------------------------------------------
// Bounded effect closure
// ---------------------------------------------------------------------------

test.describe('C-06 bounded effect closure', () => {
  const analyze = (source: string, symbol: string) => analyzePhpEffectClosure({
    entrypoints: [{ relativePath: 'src/App/Handler/H.php', symbol, role: 'HANDLER' }],
    resolver: { read: (relativePath) => (relativePath === 'src/App/Handler/H.php' ? source : null) },
  });

  test('a fully classified pure-read closure is proven', () => {
    const proof = analyze('<?php class H { public function read($k) { $row = $this->getItem($k); return json_encode($row); } }', 'read');
    expect(proof.state).toBe('PURE_READ_PROVEN');
    expect(proof.rejectionCode).toBeNull();
    expect(proof.unclassifiedCallees).toBe(0);
  });

  test('one write-vocabulary hit is terminal', () => {
    const proof = analyze('<?php class H { public function read($k) { $this->updateItem($k, array()); return $this->getItem($k); } }', 'read');
    expect(proof.state).toBe('EFFECTFUL');
    expect(proof.disqualifyingKinds).toEqual(['DATA_WRITE']);
  });

  test('an outbound call is disqualifying even with no write anywhere', () => {
    const proof = analyze('<?php class H { public function read($k) { $ch = curl_init(); return curl_exec($ch); } }', 'read');
    expect(proof.state).toBe('EFFECTFUL');
    expect(proof.disqualifyingKinds).toEqual(['EXTERNAL_CALL']);
  });

  test('an unclassified callee fails closed and is counted', () => {
    const proof = analyze('<?php class H { public function read($k) { return $this->somethingUnknown($k); } }', 'read');
    expect(proof.state).toBe('AMBIGUOUS');
    expect(proof.rejectionCode).toBe('CLOSURE_CALLEE_UNCLASSIFIED');
    expect(proof.unclassifiedCallees).toBe(1);
  });

  test('a dynamic-dispatch callee fails closed', () => {
    const variableMethod = analyze('<?php class H { public function read($k) { return $this->$k(); } }', 'read');
    expect(variableMethod.rejectionCode).toBe('CLOSURE_DYNAMIC_DISPATCH');
    expect(variableMethod.state).toBe('AMBIGUOUS');
    const variableProperty = analyze('<?php class H { public function read($k) { return $this->{$this->m}(); } }', 'read');
    expect(variableProperty.rejectionCode).toBe('CLOSURE_DYNAMIC_DISPATCH');
    const callback = analyze('<?php class H { public function read($k) { return array_map($k, array()); } }', 'read');
    expect(callback.rejectionCode).toBe('CLOSURE_DYNAMIC_DISPATCH');
  });

  test('a magic-member declaration anywhere in a walked file is terminal', () => {
    const proof = analyze('<?php class H { public function read($k) { return $this->getItem($k); } public function __call($n, $a) { return null; } }', 'read');
    expect(proof.rejectionCode).toBe('CLOSURE_DYNAMIC_DISPATCH');
    expect(proof.state).toBe('AMBIGUOUS');
  });

  test('the depth bound is enforced and reported', () => {
    const levels = 9;
    const body = Array.from({ length: levels }, (_unused, index) => `public function step${index}($k) { return $this->step${index + 1}($k); }`).join(' ');
    const proof = analyze(`<?php class H { ${body} public function step${levels}($k) { return $this->getItem($k); } }`, 'step0');
    expect(proof.rejectionCode).toBe('CLOSURE_DEPTH_OVERFLOW');
    expect(proof.state).toBe('AMBIGUOUS');
    expect(proof.maxDepthReached).toBe(6);
  });

  test('recursion never crosses a file boundary (the D-79 defect)', () => {
    const proof = analyzePhpEffectClosure({
      entrypoints: [{ relativePath: 'src/App/Handler/A.php', symbol: 'read', role: 'HANDLER' }],
      resolver: {
        read: (relativePath) => relativePath === 'src/App/Handler/A.php'
          ? '<?php class A { public function read($k) { return $this->sharedHelper($k); } }'
          // A same-named declaration in another file must not be bound to.
          : '<?php class B { public function sharedHelper($k) { return $this->getItem($k); } }',
      },
    });
    expect(proof.state).toBe('AMBIGUOUS');
    expect(proof.rejectionCode).toBe('CLOSURE_CALLEE_UNCLASSIFIED');
    expect(proof.filesRead).toBe(1);
  });

  test('object construction is an unclassified callee, not an assumed read', () => {
    const proof = analyze('<?php class H { public function read($k) { $x = new Helper(); return $this->getItem($k); } }', 'read');
    expect(proof.state).toBe('AMBIGUOUS');
    expect(proof.unclassifiedCallees).toBe(1);
  });

  test('an absent entrypoint is a refusal, not an empty pure closure', () => {
    expect(analyzePhpEffectClosure({ entrypoints: [], resolver: { read: () => null } }).rejectionCode).toBe('CLOSURE_NO_ENTRYPOINT');
    expect(analyze('<?php class H { public function other() { return 1; } }', 'read').rejectionCode).toBe('CLOSURE_SYMBOL_MISSING');
    expect(analyze('<?php class H { public function read() { return 1; } } class I { public function read() { return 2; } }', 'read').rejectionCode).toBe('CLOSURE_SYMBOL_AMBIGUOUS');
  });
});

// ---------------------------------------------------------------------------
// The admission lattice
// ---------------------------------------------------------------------------

test.describe('C-06 admission lattice', () => {
  const base = { method: 'GET', routeProof: 'PROVEN', joinState: 'PROVEN', inventoryCompleteness: 'COMPLETE' } as const;

  test('a declaration witness alone is never a proof', () => {
    const proof = buildReadOnlyProof({ ...base, pipeline: resolvedEmptyPipeline, closure: null });
    expect(proof.state).toBe('READ_ONLY_SINGLE_WITNESS');
    expect(readOnlyClassificationFromProof(proof)).toBe('READ_ONLY_METHOD_ONLY');
    expect(proof.productionAdmission).toBe('DENIED');
    expect(proof.productionDenialReasons).toContain('EFFECT_WITNESS_MISSING');
  });

  test('a declaration witness and an effect witness together are a proof', () => {
    const proof = buildReadOnlyProof({ ...base, pipeline: resolvedEmptyPipeline, closure: pureReadClosure() });
    expect(proof.state).toBe('READ_ONLY_PROVEN');
    expect(readOnlyClassificationFromProof(proof)).toBe('PROVEN_READ_ONLY');
    expect(proof.productionAdmission).toBe('ELIGIBLE');
    expect(proof.witnesses.filter((entry) => entry.state === 'HELD').map((entry) => entry.kind).sort()).toEqual(['W-DECLARED_ROUTE', 'W-EFFECT_CLOSURE']);
  });

  test('C-02a generated-artifact route evidence cannot itself grant an effect proof', () => {
    // Every OpenAPI-derived operation reaches the lattice with no effect
    // analyzer at all. A generated Swagger GET is therefore a single
    // declaration witness — DEV-eligible at most, never production-admitted,
    // no matter how exact its route evidence is.
    const generated = buildReadOnlyProof({ ...base, pipeline: null, closure: null });
    expect(generated.state).toBe('READ_ONLY_SINGLE_WITNESS');
    expect(generated.productionAdmission).toBe('DENIED');
    expect(generated.productionDenialReasons).toContain('EFFECT_WITNESS_MISSING');
    expect(generated.witnesses.find((entry) => entry.kind === 'W-EFFECT_CLOSURE')?.reasonCode).toBe('EFFECT_CLOSURE_ANALYZER_ABSENT');
  });

  test('the unimplemented witnesses are UNSUPPORTED, never HELD', () => {
    const proof = buildReadOnlyProof({ ...base, pipeline: resolvedEmptyPipeline, closure: pureReadClosure() });
    for (const kind of ['W-DECLARED_VERB', 'W-EFFECT_RPC', 'W-SPEC'] as const) {
      expect(proof.witnesses.find((entry) => entry.kind === kind)?.state).toBe('UNSUPPORTED');
    }
  });

  test('an unproven join denies a proof that would otherwise hold', () => {
    for (const joinState of ['AMBIGUOUS', 'MULTIPLE_SYMBOLS', 'MISSING_SYMBOL', 'SOURCE_STALE'] as const) {
      const proof = buildReadOnlyProof({ ...base, joinState, pipeline: resolvedEmptyPipeline, closure: pureReadClosure() });
      expect(proof.state).toBe('AMBIGUOUS');
      expect(proof.productionDenialReasons).toContain(`JOIN_${joinState}`);
    }
  });

  test('an incomplete repository inventory denies the closure proof', () => {
    for (const completeness of ['TRUNCATED', 'UNKNOWN'] as const) {
      const proof = buildReadOnlyProof({ ...base, inventoryCompleteness: completeness, pipeline: resolvedEmptyPipeline, closure: pureReadClosure() });
      expect(proof.state).toBe('AMBIGUOUS');
      expect(proof.productionDenialReasons).toContain(`INVENTORY_${completeness}`);
    }
  });

  test('an unresolved pipeline denies the closure proof', () => {
    const proof = buildReadOnlyProof({ ...base, pipeline: null, closure: pureReadClosure() });
    expect(proof.state).toBe('AMBIGUOUS');
    expect(proof.productionDenialReasons).toContain('PIPELINE_MODEL_ABSENT');
  });

  test('a non-GET declaration is terminal regardless of the closure', () => {
    const proof = buildReadOnlyProof({ ...base, method: 'POST', pipeline: resolvedEmptyPipeline, closure: pureReadClosure() });
    expect(proof.state).toBe('MUTATION_CAPABLE');
    expect(readOnlyClassificationFromProof(proof)).toBe('PROVEN_MUTATION_CAPABLE');
  });

  test('every proof carries its preconditions, vocabulary digest and effect ledger', () => {
    const proof = buildReadOnlyProof({ ...base, pipeline: resolvedEmptyPipeline, closure: pureReadClosure() });
    expect(proof.joinPrecondition.satisfied).toBe(true);
    expect(proof.inventoryPrecondition.satisfied).toBe(true);
    expect(proof.pipelinePrecondition.satisfied).toBe(true);
    expect(proof.vocabularyDigest).toBe(pureReadClosure().vocabularyDigest);
    expect(proof.effectLedger.map((entry) => entry.kind)).toEqual([...EFFECT_KINDS]);
    expect(proof.effectPolicy).toHaveLength(EFFECT_KINDS.length);
    expect(proof.evidenceDigest).toMatch(/^ev:sha256:[0-9a-f]{24}$/);
  });
});

// ---------------------------------------------------------------------------
// Negative corpus — zero false positives
// ---------------------------------------------------------------------------

test.describe('C-06 negative corpus', () => {
  test('N1/N2 — the two historical D-79 admissions are no longer granted by the catalog', () => {
    const target = fixture();
    try {
      // Both rows are `KNOWN_READ` in the eleven-row catalog at this SHA.
      const legacy = PHASE5_API_CATALOG.operations.find((entry) => entry.operationId === 'ripple.billing-groups-legacy.read');
      const exchange = PHASE5_API_CATALOG.operations.find((entry) => entry.operationId === 'ripple.billing-group-exchange.read');
      expect(legacy?.semanticClass).toBe('KNOWN_READ');
      expect(exchange?.semanticClass).toBe('KNOWN_READ');

      // No route provider is installed, so no pipeline can be resolved. A
      // catalog row must not compensate for that.
      target.write('src/App/Route/Config/Routing.yaml', routingYaml([
        ...route('get:/billinggroup', 'BillingGroup', 'getBillingGroupAccount'),
        ...route('get:/exchange_rate/billing_group/{period}', 'BillingGroup', 'getExchangeRateForBillingGroup'),
      ], true));
      target.write('src/App/Handler/BillingGroup.php', `<?php
class BillingGroup {
  public function getBillingGroupAccount($id) { return $this->getItem($id); }
  public function getExchangeRateForBillingGroup($period) { return $this->getItem($period); }
}
`);
      const discovery = target.discover();
      // The catalog join still happens — it is a runtime binding, not a proof.
      expect(discovery.surfaces.some((entry) => entry.operation.runtimeBinding === 'RUNTIME_BOUND_EXACT')).toBe(true);
      expect(classificationOf(discovery, '/billinggroup')).not.toBe('PROVEN_READ_ONLY');
      expect(classificationOf(discovery, '/exchange_rate/billing_group/{period}')).not.toBe('PROVEN_READ_ONLY');
      expect(proofOf(discovery, '/billinggroup').productionAdmission).toBe('DENIED');
      expect(proofOf(discovery, '/exchange_rate/billing_group/{period}').productionAdmission).toBe('DENIED');
      expect(discovery.counters.readOnlyProvenOperations).toBe(0);
    } finally {
      target.dispose();
    }
  });

  test('N3 — a GET whose resolved closure reaches a write is mutation-capable', () => {
    const target = fixture();
    try {
      installPipeline(target);
      target.write('src/App/Route/Config/Routing.yaml', routingYaml(route('get:/writes', 'Writer', 'read'), false));
      target.write('src/App/Handler/Writer.php', '<?php class Writer { public function read($k) { $this->updateItem($k, array()); return $this->getItem($k); } }');
      const discovery = target.discover();
      expect(classificationOf(discovery, '/writes')).toBe('PROVEN_MUTATION_CAPABLE');
      expect(proofOf(discovery, '/writes').effectLedger.find((entry) => entry.kind === 'DATA_WRITE')?.count).toBeGreaterThan(0);
    } finally {
      target.dispose();
    }
  });

  test('N4 — a GET whose MIDDLEWARE performs an external call is refused (review F-01)', () => {
    const target = fixture();
    try {
      installPipeline(target);
      // The handler alone is a perfectly pure read. Only the pipeline is not.
      target.write('src/App/Route/Config/Routing.yaml', routingYaml(route('get:/pure-handler', 'Reader', 'read'), true));
      target.write('src/App/Handler/Reader.php', '<?php class Reader { public function read($k) { return $this->getItem($k); } }');
      const withMiddleware = target.discover();
      expect(classificationOf(withMiddleware, '/pure-handler')).not.toBe('PROVEN_READ_ONLY');
      const proof = proofOf(withMiddleware, '/pure-handler');
      expect(proof.state).toBe('MUTATION_CAPABLE');
      expect(proof.effectLedger.find((entry) => entry.kind === 'EXTERNAL_CALL')?.count).toBeGreaterThan(0);
      expect(proof.witnesses.find((entry) => entry.kind === 'W-EFFECT_CLOSURE')?.state).toBe('FAILED');
      // Nightwatch proved the request leaves the analysable region; it did not
      // prove a write, and does not claim one.
      expect(classificationOf(withMiddleware, '/pure-handler')).toBe('CONDITIONAL_MUTATION');

      // The identical handler with the flag disabled IS admissible, which
      // proves the refusal came from the pipeline and not from the handler.
      target.write('src/App/Route/Config/Routing.yaml', routingYaml(route('get:/pure-handler', 'Reader', 'read'), false));
      expect(classificationOf(target.discover(), '/pure-handler')).toBe('PROVEN_READ_ONLY');
    } finally {
      target.dispose();
    }
  });

  test('N5 — an unclassified callee is refused', () => {
    const target = fixture();
    try {
      installPipeline(target);
      target.write('src/App/Route/Config/Routing.yaml', routingYaml(route('get:/unclassified', 'Unknown', 'read'), false));
      target.write('src/App/Handler/Unknown.php', '<?php class Unknown { public function read($k) { return $this->mysteryHelper($k); } }');
      const discovery = target.discover();
      // An unanalysable closure yields no effect witness, so the route falls
      // back to a single declaration witness — explicitly not authority.
      expect(classificationOf(discovery, '/unclassified')).toBe('READ_ONLY_METHOD_ONLY');
      expect(proofOf(discovery, '/unclassified').state).toBe('READ_ONLY_SINGLE_WITNESS');
      expect(proofOf(discovery, '/unclassified').unclassifiedCallees).toBe(1);
      expect(proofOf(discovery, '/unclassified').productionAdmission).toBe('DENIED');
      expect(proofOf(discovery, '/unclassified').productionDenialReasons).toContain('CALLEE_CLASSIFICATION_INCOMPLETE');
    } finally {
      target.dispose();
    }
  });

  test('N6 — a depth-bound overflow is refused', () => {
    const target = fixture();
    try {
      installPipeline(target);
      target.write('src/App/Route/Config/Routing.yaml', routingYaml(route('get:/deep', 'Deep', 'step0'), false));
      const levels = 9;
      const body = Array.from({ length: levels }, (_unused, index) => `public function step${index}($k) { return $this->step${index + 1}($k); }`).join(' ');
      target.write('src/App/Handler/Deep.php', `<?php class Deep { ${body} public function step${levels}($k) { return $this->getItem($k); } }`);
      const discovery = target.discover();
      expect(classificationOf(discovery, '/deep')).toBe('READ_ONLY_METHOD_ONLY');
      expect(proofOf(discovery, '/deep').productionAdmission).toBe('DENIED');
      expect(proofOf(discovery, '/deep').witnesses.find((entry) => entry.kind === 'W-EFFECT_CLOSURE')?.state).toBe('UNSUPPORTED');
      expect(proofOf(discovery, '/deep').witnesses.find((entry) => entry.kind === 'W-EFFECT_CLOSURE')?.reasonCode).toBe('CLOSURE_DEPTH_OVERFLOW');
    } finally {
      target.dispose();
    }
  });

  test('N7 — a dynamic-dispatch callee is refused', () => {
    const target = fixture();
    try {
      installPipeline(target);
      target.write('src/App/Route/Config/Routing.yaml', routingYaml(route('get:/dynamic', 'Dynamic', 'read'), false));
      target.write('src/App/Handler/Dynamic.php', "<?php class Dynamic { public function read($t) { $callfnc = 'get' . $t . 'Settings'; return $this->$callfnc(); } }");
      const discovery = target.discover();
      expect(classificationOf(discovery, '/dynamic')).toBe('READ_ONLY_METHOD_ONLY');
      expect(proofOf(discovery, '/dynamic').productionAdmission).toBe('DENIED');
      expect(proofOf(discovery, '/dynamic').witnesses.find((entry) => entry.kind === 'W-EFFECT_CLOSURE')?.state).toBe('UNSUPPORTED');
      expect(proofOf(discovery, '/dynamic').witnesses.find((entry) => entry.kind === 'W-EFFECT_CLOSURE')?.reasonCode).toBe('CLOSURE_DYNAMIC_DISPATCH');
    } finally {
      target.dispose();
    }
  });

  test('N8 — an ambiguous route → handler join is refused', () => {
    const target = fixture();
    try {
      installPipeline(target);
      // Two declarations of the same handler symbol make the join ambiguous.
      target.write('src/App/Route/Config/Routing.yaml', routingYaml(route('get:/ambiguous', 'Twice', 'read'), false));
      target.write('src/App/Handler/Twice.php', '<?php class Twice { public function read($k) { return $this->getItem($k); } } class Other { public function read($k) { return $this->getItem($k); } }');
      const discovery = target.discover();
      expect(classificationOf(discovery, '/ambiguous')).not.toBe('PROVEN_READ_ONLY');
      const proof = proofOf(discovery, '/ambiguous');
      expect(proof.joinPrecondition.satisfied).toBe(false);
      expect(proof.productionAdmission).toBe('DENIED');
      expect(proof.productionDenialReasons).toContain('JOIN_MULTIPLE_SYMBOLS');
    } finally {
      target.dispose();
    }
  });

  test('the whole negative corpus yields zero admitted operations', () => {
    const target = fixture();
    try {
      installPipeline(target);
      target.write('src/App/Route/Config/Routing.yaml', routingYaml([
        ...route('get:/writes', 'Writer', 'read'),
        ...route('get:/unclassified', 'Unknown', 'read'),
        ...route('get:/dynamic', 'Dynamic', 'read'),
        ...route('post:/mutating', 'Reader', 'read'),
      ], false));
      target.write('src/App/Handler/Writer.php', '<?php class Writer { public function read($k) { return $this->createItem($k); } }');
      target.write('src/App/Handler/Unknown.php', '<?php class Unknown { public function read($k) { return $this->mysteryHelper($k); } }');
      target.write('src/App/Handler/Dynamic.php', '<?php class Dynamic { public function read($k) { return $this->$k(); } }');
      target.write('src/App/Handler/Reader.php', '<?php class Reader { public function read($k) { return $this->getItem($k); } }');
      const discovery = target.discover();
      expect(discovery.counters.readOnlyProvenOperations).toBe(0);
      expect(discovery.surfaces.every((entry) => entry.readOnlyProof.productionAdmission === 'DENIED')).toBe(true);
    } finally {
      target.dispose();
    }
  });
});

// ---------------------------------------------------------------------------
// Positive corpus — the analyzer is not trivially "everything UNKNOWN"
// ---------------------------------------------------------------------------

test.describe('C-06 positive corpus', () => {
  test('P1 — a resolved pipeline with a fully classified pure closure is admitted', () => {
    const target = fixture();
    try {
      installPipeline(target);
      target.write('src/App/Route/Config/Routing.yaml', routingYaml(route('get:/reads', 'Reader', 'read'), false));
      target.write('src/App/Handler/Reader.php', `<?php
class Reader {
  public function read($k) { return json_encode($this->rows($k)); }
  public function rows($k) { $items = $this->listItems($k); return count($items) > 0 ? $items : array(); }
}
`);
      const discovery = target.discover();
      expect(classificationOf(discovery, '/reads')).toBe('PROVEN_READ_ONLY');
      const proof = proofOf(discovery, '/reads');
      expect(proof.state).toBe('READ_ONLY_PROVEN');
      expect(proof.productionAdmission).toBe('ELIGIBLE');
      expect(proof.unclassifiedCallees).toBe(0);
      expect(proof.vocabularyDigest).toBe(phpEffectVocabularyDigest());
      // The proof walked the middleware as well as the handler.
      expect(discovery.counters.readOnlyProvenOperations).toBe(1);
    } finally {
      target.dispose();
    }
  });

  test('P1 admission is revoked by adding a single write to a walked declaration', () => {
    const target = fixture();
    try {
      installPipeline(target);
      target.write('src/App/Route/Config/Routing.yaml', routingYaml(route('get:/reads', 'Reader', 'read'), false));
      target.write('src/App/Handler/Reader.php', `<?php
class Reader {
  public function read($k) { return json_encode($this->rows($k)); }
  public function rows($k) { $this->deleteHashData($k); return $this->listItems($k); }
}
`);
      const discovery = target.discover();
      expect(classificationOf(discovery, '/reads')).toBe('PROVEN_MUTATION_CAPABLE');
      expect(proofOf(discovery, '/reads').effectLedger.find((entry) => entry.kind === 'CACHE_WRITE')?.count).toBe(1);
    } finally {
      target.dispose();
    }
  });
});
