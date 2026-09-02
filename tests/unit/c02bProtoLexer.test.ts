// ---------------------------------------------------------------------------
// Nightwatch C-02b — bounded protobuf lexer and declaration reader.
//
// This suite is written BEFORE the parser and states the behaviour the parser
// must have, not the behaviour it happens to have. Its central claim is the
// one a protobuf reader is easiest to get wrong:
//
//   a fact may never come from a comment or from a string literal.
//
// The layering is what makes that provable rather than merely tested.
// Comments and string bodies are discarded in the lexer, so no declaration
// rule can observe one — there is no code path from comment text to a fact for
// a future change to accidentally open.
//
// Every fixture here is an explicit inline string. Nothing derives a root, a
// path, or a workspace from the checkout location (C-11 lesson 5.4), because
// these modules take source TEXT and have no filesystem authority at all.
// ---------------------------------------------------------------------------

import { expect, test } from '@playwright/test';
import {
  lexProto,
  PROTO_LEXER_VERSION,
  PROTO_MAX_DEPTH,
  PROTO_MAX_TOKENS,
} from '../../src/core/source/protoLexer';
import {
  PROTO_EXTRACTOR_VERSION,
  readProtoDeclarations,
} from '../../src/core/source/protoDeclarations';

function rpcs(sourceText: string) {
  return readProtoDeclarations(sourceText).services.flatMap((service) => service.rpcs);
}

function names(sourceText: string): readonly string[] {
  return rpcs(sourceText).map((rpc) => rpc.rpcName).sort();
}

const REAL = `
syntax = "proto3";
package a.b.v1;
service Svc {
  rpc Real(RealRequest) returns (RealResponse) {
    option (google.api.http) = { get: "/v1/real" };
  }
}
`;

test.describe('C-02b — the lexer is the only module that knows comment syntax', () => {
  test('discards line comments and reports how many it discarded', () => {
    const result = lexProto('// a comment\nsyntax = "proto3";\n');
    expect(result.schemaVersion).toBe(PROTO_LEXER_VERSION);
    expect(result.state).toBe('COMPLETE');
    expect(result.commentsDiscarded).toBe(1);
    expect(result.tokens.some((token) => token.value.includes('comment'))).toBe(false);
  });

  test('a string containing a comment opener is one string token, not a comment', () => {
    const result = lexProto('option x = "// not a comment /* nor this */";\n');
    expect(result.state).toBe('COMPLETE');
    expect(result.commentsDiscarded).toBe(0);
    expect(result.tokens.filter((token) => token.kind === 'STRING')).toHaveLength(1);
  });

  test('a comment containing a string quote does not open a string', () => {
    // If the lexer scanned strings before comments, the unbalanced quote here
    // would swallow the rest of the file and the service would vanish.
    const result = lexProto(`// he said "hello\n${REAL}`);
    expect(result.state).toBe('COMPLETE');
    expect(readProtoDeclarations(`// he said "hello\n${REAL}`).services).toHaveLength(1);
  });

  test('an unterminated block comment fails closed rather than truncating silently', () => {
    const result = lexProto('service Svc {\n/* never closed\n');
    expect(result.state).toBe('UNTERMINATED_COMMENT');
  });

  test('an unterminated string fails closed', () => {
    const result = lexProto('option x = "never closed\n');
    expect(result.state).toBe('UNTERMINATED_STRING');
  });

  test('escaped quotes do not terminate a string', () => {
    const result = lexProto('option x = "a \\" b";\n');
    expect(result.state).toBe('COMPLETE');
    expect(result.tokens.filter((token) => token.kind === 'STRING')).toHaveLength(1);
  });

  test('the token budget is bounded and exhaustion is categorical', () => {
    const result = lexProto('x '.repeat(PROTO_MAX_TOKENS + 10));
    expect(result.state).toBe('TOKEN_BUDGET_EXHAUSTED');
    expect(result.tokenCount).toBeLessThanOrEqual(PROTO_MAX_TOKENS);
  });

  test('nesting depth is bounded and exhaustion is categorical', () => {
    const result = lexProto('{'.repeat(PROTO_MAX_DEPTH + 2));
    expect(result.state).toBe('DEPTH_EXCEEDED');
  });
});

test.describe('C-02b — zero facts may be derived from a comment', () => {
  test('an RPC in a line comment yields nothing', () => {
    expect(names(`
      service Svc {
        // rpc Ghost(GhostRequest) returns (GhostResponse);
        rpc Real(RealRequest) returns (RealResponse);
      }
    `)).toEqual(['Real']);
  });

  test('an RPC in a block comment yields nothing', () => {
    expect(names(`
      service Svc {
        /* rpc Ghost(GhostRequest) returns (GhostResponse) {
             option (google.api.http) = { post: "/v1/ghost" body: "*" };
           } */
        rpc Real(RealRequest) returns (RealResponse);
      }
    `)).toEqual(['Real']);
  });

  test('unbalanced braces inside a comment do not close the service', () => {
    // The naive failure is a brace counter that runs over raw text: the `}`
    // in the comment closes `service Svc`, and `Real` is then read as a
    // top-level declaration or dropped entirely.
    expect(names(`
      service Svc {
        // }}} { {
        /* } } { */
        rpc Real(RealRequest) returns (RealResponse);
      }
    `)).toEqual(['Real']);
  });

  test('a commented google.api.http option yields no binding on the real RPC', () => {
    const [rpc] = rpcs(`
      service Svc {
        rpc Real(RealRequest) returns (RealResponse) {
          // option (google.api.http) = { delete: "/v1/ghost" };
        }
      }
    `);
    expect(rpc?.rpcName).toBe('Real');
    expect(rpc?.httpBindingState).toBe('ABSENT');
    expect(rpc?.bindings).toEqual([]);
  });

  test('a commented service declares nothing at all', () => {
    const facts = readProtoDeclarations(`
      package a.b.v1;
      // service Ghost {
      //   rpc Ghost(A) returns (B);
      // }
    `);
    expect(facts.services).toEqual([]);
  });
});

test.describe('C-02b — zero facts may be derived from a string literal', () => {
  test('a string containing an rpc declaration yields nothing', () => {
    expect(names(`
      service Svc {
        option (custom.doc) = "rpc Ghost(GhostRequest) returns (GhostResponse);";
        rpc Real(RealRequest) returns (RealResponse);
      }
    `)).toEqual(['Real']);
  });

  test('a route template is never taken from an unrelated string option', () => {
    const [rpc] = rpcs(`
      service Svc {
        rpc Real(RealRequest) returns (RealResponse) {
          option (custom.note) = "get: \\"/v1/ghost\\"";
        }
      }
    `);
    // UNSUPPORTED_OPTION rather than ABSENT: an option WAS present and this
    // reader does not understand it. That distinction is the point — and no
    // route reaches the binding set from inside the string either way.
    expect(rpc?.httpBindingState).toBe('UNSUPPORTED_OPTION');
    expect(rpc?.bindings).toEqual([]);
  });

  test('a string containing a whole service body yields nothing', () => {
    const facts = readProtoDeclarations(`
      package a.b.v1;
      option (custom.sample) = "service Ghost { rpc G(A) returns (B); }";
    `);
    expect(facts.services).toEqual([]);
  });
});

test.describe('C-02b — malformed declarations fail closed', () => {
  test('an RPC with no closing parenthesis emits no fact', () => {
    const facts = readProtoDeclarations(`
      service Svc {
        rpc Broken(BrokenRequest returns (BrokenResponse);
      }
    `);
    expect(facts.services.flatMap((service) => service.rpcs).map((rpc) => rpc.rpcName)).not.toContain('Broken');
    expect(facts.completeness.state).not.toBe('COMPLETE');
  });

  test('an RPC missing its return clause emits no fact', () => {
    expect(names(`
      service Svc {
        rpc Broken(BrokenRequest);
        rpc Real(RealRequest) returns (RealResponse);
      }
    `)).toEqual(['Real']);
  });

  test('a malformed option block leaves the RPC proven and the binding MALFORMED', () => {
    // The decomposition that matters: an unreadable annotation is not an
    // unreadable RPC. Discarding the RPC would understate the surface; taking
    // the binding anyway would overstate it.
    const [rpc] = rpcs(`
      service Svc {
        rpc Real(RealRequest) returns (RealResponse) {
          option (google.api.http) = { get: };
        }
      }
    `);
    expect(rpc?.rpcName).toBe('Real');
    expect(rpc?.requestMessage).toBe('RealRequest');
    expect(rpc?.responseMessage).toBe('RealResponse');
    expect(rpc?.httpBindingState).toBe('MALFORMED');
    expect(rpc?.bindings).toEqual([]);
  });

  test('an unknown HTTP verb is never coerced to a known one', () => {
    const [rpc] = rpcs(`
      service Svc {
        rpc Real(RealRequest) returns (RealResponse) {
          option (google.api.http) = { fetch: "/v1/real" };
        }
      }
    `);
    expect(rpc?.httpBindingState).toBe('MALFORMED');
    expect(rpc?.bindings).toEqual([]);
  });

  test('an unknown verb ALONGSIDE a known one still fails the whole binding', () => {
    // Negative probe B3 caught the previous version of this claim being
    // vacuous: `{ fetch: "/v1/real" }` alone is rejected by the
    // no-verbs-at-all check, so deleting the unknown-key rule left the test
    // green. Pairing the unknown key with a valid one isolates the rule — with
    // it the binding is MALFORMED, without it `/v1/ghost` silently disappears
    // and the RPC reads as a clean GET. A misspelled or future verb vanishing
    // from the surface without a trace is exactly the failure to prevent.
    const [rpc] = rpcs(`
      service Svc {
        rpc Real(RealRequest) returns (RealResponse) {
          option (google.api.http) = { get: "/v1/real" fetch: "/v1/ghost" };
        }
      }
    `);
    expect(rpc?.httpBindingState).toBe('MALFORMED');
    expect(rpc?.bindings).toEqual([]);
  });

  test('an unsafe route template is rejected rather than admitted', () => {
    const [rpc] = rpcs(`
      service Svc {
        rpc Real(RealRequest) returns (RealResponse) {
          option (google.api.http) = { get: "/v1/real\\n<script>" };
        }
      }
    `);
    expect(rpc?.httpBindingState).toBe('MALFORMED');
  });
});

test.describe('C-02b — the HTTP annotation matrix', () => {
  function binding(annotation: string) {
    const [rpc] = rpcs(`
      service Svc {
        rpc Real(RealRequest) returns (RealResponse) {
          option (google.api.http) = ${annotation};
        }
      }
    `);
    return rpc;
  }

  for (const [verb, method] of [['get', 'GET'], ['post', 'POST'], ['put', 'PUT'], ['patch', 'PATCH'], ['delete', 'DELETE']] as const) {
    test(`${verb} is read as ${method}`, () => {
      const rpc = binding(`{ ${verb}: "/v1/real" }`);
      expect(rpc?.httpBindingState).toBe('PROVEN');
      expect(rpc?.bindings[0]?.method).toBe(method);
      expect(rpc?.bindings[0]?.routeTemplate).toBe('/v1/real');
    });
  }

  test('an explicit body field is recorded as PRESENT with its field name', () => {
    const rpc = binding('{ post: "/v1/real" body: "payload" }');
    expect(rpc?.bindings[0]?.body).toBe('PRESENT');
    expect(rpc?.bindings[0]?.bodyField).toBe('payload');
  });

  test('a wildcard body is distinguished from a named one', () => {
    const rpc = binding('{ post: "/v1/real" body: "*" }');
    expect(rpc?.bindings[0]?.body).toBe('WILDCARD');
  });

  test('no body clause is ABSENT, not UNKNOWN', () => {
    const rpc = binding('{ get: "/v1/real" }');
    expect(rpc?.bindings[0]?.body).toBe('ABSENT');
  });

  test('option order does not change the result', () => {
    const forward = binding('{ post: "/v1/real" body: "*" }');
    const reversed = binding('{ body: "*" post: "/v1/real" }');
    expect(reversed?.bindings[0]?.method).toBe(forward?.bindings[0]?.method);
    expect(reversed?.bindings[0]?.routeTemplate).toBe(forward?.bindings[0]?.routeTemplate);
    expect(reversed?.bindings[0]?.body).toBe(forward?.bindings[0]?.body);
  });

  test('whitespace, commas and newlines do not change the result', () => {
    const dense = binding('{get:"/v1/real",body:"*"}');
    expect(dense?.httpBindingState).toBe('PROVEN');
    expect(dense?.bindings[0]?.method).toBe('GET');
    const sparse = binding('{\n\n   get :  "/v1/real"\n\n   body : "*"\n\n}');
    expect(sparse?.bindings[0]?.method).toBe('GET');
    expect(sparse?.bindings[0]?.routeTemplate).toBe('/v1/real');
  });

  test('additional_bindings are kept in order and the state is AMBIGUOUS', () => {
    // Collapsing to the primary binding would silently delete a real route
    // from the map, and picking one arbitrarily would make the map
    // nondeterministic. Both are worse than declaring ambiguity.
    const rpc = binding(`{
      post: "/v1/real"
      body: "*"
      additional_bindings { get: "/v1/real/{id}" }
      additional_bindings { put: "/v1/real/{id}" body: "*" }
    }`);
    expect(rpc?.httpBindingState).toBe('AMBIGUOUS');
    expect(rpc?.bindings).toHaveLength(3);
    expect(rpc?.bindings.map((entry) => entry.method)).toEqual(['POST', 'GET', 'PUT']);
    expect(rpc?.bindings.map((entry) => entry.kind)).toEqual(['PRIMARY', 'ADDITIONAL', 'ADDITIONAL']);
  });

  test('two primary verbs on one binding are ambiguous, not first-wins', () => {
    const rpc = binding('{ get: "/v1/a" post: "/v1/b" }');
    expect(rpc?.httpBindingState).toBe('AMBIGUOUS');
    expect(rpc?.bindings.map((entry) => entry.routeTemplate)).toEqual(['/v1/a', '/v1/b']);
  });

  test('a malformed additional binding does not corrupt the primary one', () => {
    const rpc = binding('{ post: "/v1/real" additional_bindings { get: } }');
    expect(rpc?.httpBindingState).toBe('MALFORMED');
  });

  test('an unrelated custom option is UNSUPPORTED_OPTION, not a binding', () => {
    const [rpc] = rpcs(`
      service Svc {
        rpc Real(RealRequest) returns (RealResponse) {
          option (grpc.gateway.protoc_gen_openapiv2.options.openapiv2_operation) = {
            summary: "not an http binding"
          };
        }
      }
    `);
    expect(rpc?.httpBindingState).toBe('UNSUPPORTED_OPTION');
    expect(rpc?.bindings).toEqual([]);
  });
});

test.describe('C-02b — the streaming matrix', () => {
  function streaming(declaration: string) {
    const [rpc] = rpcs(`service Svc { ${declaration} }`);
    return rpc;
  }

  test('unary', () => {
    const rpc = streaming('rpc R(Q) returns (S);');
    expect(rpc?.clientStreaming).toBe(false);
    expect(rpc?.serverStreaming).toBe(false);
    expect(rpc?.streamingClass).toBe('UNARY');
  });

  test('client streaming', () => {
    const rpc = streaming('rpc R(stream Q) returns (S);');
    expect(rpc?.clientStreaming).toBe(true);
    expect(rpc?.serverStreaming).toBe(false);
    expect(rpc?.streamingClass).toBe('CLIENT_STREAMING');
  });

  test('server streaming', () => {
    const rpc = streaming('rpc R(Q) returns (stream S);');
    expect(rpc?.clientStreaming).toBe(false);
    expect(rpc?.serverStreaming).toBe(true);
    expect(rpc?.streamingClass).toBe('SERVER_STREAMING');
  });

  test('bidirectional', () => {
    const rpc = streaming('rpc R(stream Q) returns (stream S);');
    expect(rpc?.streamingClass).toBe('BIDIRECTIONAL');
  });

  test('a message named `stream` is not a stream modifier', () => {
    // `stream` is not a reserved word in the grammar position that matters; a
    // modifier is only a modifier when another identifier follows it.
    const rpc = streaming('rpc R(stream) returns (stream);');
    expect(rpc?.clientStreaming).toBe(false);
    expect(rpc?.serverStreaming).toBe(false);
    expect(rpc?.requestMessage).toBe('stream');
    expect(rpc?.responseMessage).toBe('stream');
  });
});

test.describe('C-02b — identity, packages and multiple services', () => {
  test('the canonical identity binds package, service and RPC', () => {
    const [rpc] = rpcs(`
      package alpha.beta.v1;
      service Svc { rpc R(Q) returns (S); }
    `);
    expect(rpc?.package).toBe('alpha.beta.v1');
    expect(rpc?.serviceName).toBe('Svc');
    expect(rpc?.canonicalIdentity).toBe('alpha.beta.v1.Svc/R');
  });

  test('the same RPC name in two services stays two distinct identities', () => {
    const facts = readProtoDeclarations(`
      package alpha.v1;
      service First { rpc Shared(Q) returns (S); }
      service Second { rpc Shared(Q) returns (S); }
    `);
    const identities = facts.services.flatMap((service) => service.rpcs).map((rpc) => rpc.canonicalIdentity);
    expect(identities).toEqual(['alpha.v1.First/Shared', 'alpha.v1.Second/Shared']);
    expect(new Set(identities).size).toBe(2);
  });

  test('a fully qualified message reference is preserved verbatim', () => {
    const [rpc] = rpcs('service Svc { rpc R(google.protobuf.Empty) returns (other.pkg.S); }');
    expect(rpc?.requestMessage).toBe('google.protobuf.Empty');
    expect(rpc?.responseMessage).toBe('other.pkg.S');
  });

  test('a missing package is UNKNOWN rather than an empty prefix', () => {
    const facts = readProtoDeclarations('service Svc { rpc R(Q) returns (S); }');
    expect(facts.package).toBeNull();
    expect(facts.services[0]?.canonicalIdentity).toBe('Svc');
  });

  test('a proto with zero services declares zero services', () => {
    // The ouchan `types.proto` case: message-only files must not be coerced
    // into an empty-but-present service.
    const facts = readProtoDeclarations(`
      syntax = "proto3";
      package ouchan.types.v1;
      message Thing { string id = 1; }
    `);
    expect(facts.services).toEqual([]);
    expect(facts.completeness.state).toBe('COMPLETE');
    expect(facts.messageNames).toEqual(['Thing']);
  });

  test('nested messages inside a service do not become RPCs', () => {
    expect(names(`
      service Svc {
        rpc Real(Q) returns (S);
      }
      message Ghost { message Inner { string rpc = 1; } }
    `)).toEqual(['Real']);
  });

  test('the extractor version is carried on the facts', () => {
    expect(readProtoDeclarations(REAL).extractorVersion).toBe(PROTO_EXTRACTOR_VERSION);
  });
});

test.describe('C-02b — determinism and boundedness of the reader', () => {
  test('the same source read twice yields identical facts', () => {
    expect(JSON.stringify(readProtoDeclarations(REAL))).toBe(JSON.stringify(readProtoDeclarations(REAL)));
  });

  test('a lexer bound propagates into the facts as non-COMPLETE', () => {
    const facts = readProtoDeclarations('x '.repeat(PROTO_MAX_TOKENS + 10));
    expect(facts.completeness.state).not.toBe('COMPLETE');
    expect(facts.completeness.reason).toBe('PROTO_TOKEN_BUDGET_EXHAUSTED');
  });

  test('an empty file is complete and empty, not an error', () => {
    const facts = readProtoDeclarations('');
    expect(facts.services).toEqual([]);
    expect(facts.completeness.state).toBe('COMPLETE');
  });
});
