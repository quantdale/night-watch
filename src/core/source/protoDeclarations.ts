// ---------------------------------------------------------------------------
// Nightwatch C-02b — bounded protobuf declaration reader.
//
// A recursive-descent reader over the token stream produced by protoLexer.ts.
// It never sees source text, so "no fact from a comment" is a property of the
// layering rather than a rule this module has to remember.
//
// The reader does not default. Every fact is either proven from the
// declaration or carries a categorical reason for not being proven, and the
// two are kept separable: an RPC with an unreadable annotation is still a
// proven RPC with an unproven binding. Discarding the RPC would understate the
// surface; taking the binding anyway would overstate it.
//
// Data-in / data-out. No filesystem, process, or network authority.
// ---------------------------------------------------------------------------

import { prefixedDigest24 } from '../identity/canonicalDigest';
import type { SourceCompletenessState } from './completeness';
import { lexProto, type ProtoLexOptions, type ProtoLexResult, type ProtoToken } from './protoLexer';

export const PROTO_DECLARATIONS_VERSION = 'nightwatch.proto-declarations.v1' as const;
export const PROTO_EXTRACTOR_VERSION = 'nightwatch.proto-source-extractor.v1' as const;

/** Per-file ceilings. Exceeding one is reported with an exact dropped count;
 * it never silently shortens the surface. */
export const PROTO_MAX_SERVICES = 256;
export const PROTO_MAX_RPCS_PER_SERVICE = 2_048;
export const PROTO_MAX_BINDINGS_PER_RPC = 32;
export const PROTO_MAX_MESSAGES = 4_096;
export const PROTO_MAX_ROUTE_LENGTH = 512;

export const PROTO_HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const;
export type ProtoHttpMethod = (typeof PROTO_HTTP_METHODS)[number];

export const PROTO_HTTP_BINDING_STATES = ['PROVEN', 'ABSENT', 'MALFORMED', 'AMBIGUOUS', 'UNSUPPORTED_OPTION'] as const;
export type ProtoHttpBindingState = (typeof PROTO_HTTP_BINDING_STATES)[number];

export const PROTO_BODY_PRESENCE = ['PRESENT', 'ABSENT', 'WILDCARD', 'UNKNOWN'] as const;
export type ProtoBodyPresence = (typeof PROTO_BODY_PRESENCE)[number];

export const PROTO_STREAMING_CLASSES = ['UNARY', 'CLIENT_STREAMING', 'SERVER_STREAMING', 'BIDIRECTIONAL'] as const;
export type ProtoStreamingClass = (typeof PROTO_STREAMING_CLASSES)[number];

export const PROTO_INCOMPLETENESS_REASONS = [
  'PROTO_TOKEN_BUDGET_EXHAUSTED',
  'PROTO_DEPTH_EXCEEDED',
  'PROTO_UNTERMINATED_COMMENT',
  'PROTO_UNTERMINATED_STRING',
  'PROTO_BYTE_BUDGET_EXHAUSTED',
  'PROTO_MALFORMED_DECLARATION',
  'PROTO_SERVICE_CEILING_REACHED',
  'PROTO_RPC_CEILING_REACHED',
  'PROTO_MESSAGE_CEILING_REACHED',
  'PROTO_BINDING_CEILING_REACHED',
] as const;
export type ProtoIncompletenessReason = (typeof PROTO_INCOMPLETENESS_REASONS)[number];

export interface ProtoHttpBinding {
  readonly kind: 'PRIMARY' | 'ADDITIONAL';
  readonly method: ProtoHttpMethod;
  readonly routeTemplate: string;
  readonly body: ProtoBodyPresence;
  readonly bodyField: string | null;
}

export interface ProtoRpcFact {
  readonly package: string | null;
  readonly serviceName: string;
  readonly rpcName: string;
  /** `<package>.<Service>/<Rpc>`, or `<Service>/<Rpc>` with no package. */
  readonly canonicalIdentity: string;
  readonly requestMessage: string;
  readonly responseMessage: string;
  readonly clientStreaming: boolean;
  readonly serverStreaming: boolean;
  readonly streamingClass: ProtoStreamingClass;
  readonly httpBindingState: ProtoHttpBindingState;
  readonly bindings: readonly ProtoHttpBinding[];
  readonly declaredAtLine: number;
}

export interface ProtoServiceFact {
  readonly package: string | null;
  readonly serviceName: string;
  /** `<package>.<Service>`, or `<Service>` with no package. */
  readonly canonicalIdentity: string;
  readonly rpcs: readonly ProtoRpcFact[];
  readonly declaredAtLine: number;
}

export interface ProtoCompleteness {
  readonly state: SourceCompletenessState;
  readonly reason: ProtoIncompletenessReason | null;
  /** Declarations the reader saw and could not prove. Always exact. */
  readonly malformedDeclarations: number;
  /** Declarations dropped by a ceiling. Always exact. */
  readonly droppedByCeiling: number;
}

export interface ProtoCounters {
  readonly services: number;
  readonly rpcs: number;
  readonly messages: number;
  readonly httpBindings: number;
  readonly unary: number;
  readonly clientStreaming: number;
  readonly serverStreaming: number;
  readonly bidirectional: number;
  readonly tokens: number;
  readonly commentsDiscarded: number;
}

export interface ProtoFileFacts {
  readonly schemaVersion: typeof PROTO_DECLARATIONS_VERSION;
  readonly extractorVersion: typeof PROTO_EXTRACTOR_VERSION;
  readonly package: string | null;
  readonly services: readonly ProtoServiceFact[];
  readonly messageNames: readonly string[];
  readonly completeness: ProtoCompleteness;
  readonly counters: ProtoCounters;
}

/** Route safety, deliberately the same shape as the route rule the existing
 * discovery path already enforces, so a template that survives here is not
 * silently dropped one layer later. */
const SAFE_ROUTE_RE = /^\/[A-Za-z0-9._~{}:&-]{0,239}(?:\/[A-Za-z0-9._~{}:&-]{0,239})*$/;
const SAFE_PLACEHOLDER_RE = /^[A-Za-z][A-Za-z0-9_:-]{0,63}$/;
const SAFE_IDENTIFIER_RE = /^[A-Za-z_][A-Za-z0-9_]{0,127}$/;
const SAFE_QUALIFIED_RE = /^[A-Za-z_][A-Za-z0-9_]{0,127}(?:\.[A-Za-z_][A-Za-z0-9_]{0,127}){0,15}$/;
const SAFE_BODY_FIELD_RE = /^[A-Za-z_][A-Za-z0-9_.]{0,127}$/;

const HTTP_VERB_KEYS: Readonly<Record<string, ProtoHttpMethod>> = Object.freeze({
  get: 'GET', post: 'POST', put: 'PUT', patch: 'PATCH', delete: 'DELETE',
});

/** Keys the binding grammar knows about but derives nothing from. An unknown
 * key is MALFORMED rather than ignored: silently skipping `fetch:` would let a
 * misspelled or future verb vanish from the surface without a trace. */
const KNOWN_NON_VERB_KEYS = new Set(['body', 'response_body', 'selector', 'custom', 'additional_bindings']);

const HTTP_OPTION_NAME = 'google.api.http';

function safeRouteTemplate(value: string): string | null {
  if (value.length === 0 || value.length > PROTO_MAX_ROUTE_LENGTH) return null;
  if (!SAFE_ROUTE_RE.test(value) || value.includes('..') || value.includes('\\')) return null;
  const placeholders = [...value.matchAll(/\{([^{}]+)\}/g)].map((match) => match[1] ?? '');
  return placeholders.every((placeholder) => SAFE_PLACEHOLDER_RE.test(placeholder)) ? value : null;
}

function lexStateReason(state: ProtoLexResult['state']): ProtoIncompletenessReason | null {
  if (state === 'TOKEN_BUDGET_EXHAUSTED') return 'PROTO_TOKEN_BUDGET_EXHAUSTED';
  if (state === 'DEPTH_EXCEEDED') return 'PROTO_DEPTH_EXCEEDED';
  if (state === 'UNTERMINATED_COMMENT') return 'PROTO_UNTERMINATED_COMMENT';
  if (state === 'UNTERMINATED_STRING') return 'PROTO_UNTERMINATED_STRING';
  if (state === 'BYTE_BUDGET_EXHAUSTED') return 'PROTO_BYTE_BUDGET_EXHAUSTED';
  return null;
}

function streamingClass(clientStreaming: boolean, serverStreaming: boolean): ProtoStreamingClass {
  if (clientStreaming && serverStreaming) return 'BIDIRECTIONAL';
  if (clientStreaming) return 'CLIENT_STREAMING';
  if (serverStreaming) return 'SERVER_STREAMING';
  return 'UNARY';
}

/** Bounded cursor over the token stream. Every read is guarded and every skip
 * advances, so no reader loop can spin on a malformed input. */
class TokenCursor {
  private position = 0;

  constructor(private readonly tokens: readonly ProtoToken[]) {}

  get done(): boolean {
    return this.position >= this.tokens.length;
  }

  peek(offset = 0): ProtoToken | null {
    return this.tokens[this.position + offset] ?? null;
  }

  next(): ProtoToken | null {
    const token = this.tokens[this.position] ?? null;
    if (token !== null) this.position += 1;
    return token;
  }

  isPunctuation(value: string, offset = 0): boolean {
    const token = this.peek(offset);
    return token !== null && token.kind === 'PUNCTUATION' && token.value === value;
  }

  isIdentifier(value: string, offset = 0): boolean {
    const token = this.peek(offset);
    return token !== null && token.kind === 'IDENTIFIER' && token.value === value;
  }

  takePunctuation(value: string): boolean {
    if (!this.isPunctuation(value)) return false;
    this.position += 1;
    return true;
  }

  takeIdentifier(): string | null {
    const token = this.peek();
    if (token === null || token.kind !== 'IDENTIFIER') return null;
    this.position += 1;
    return token.value;
  }

  /** Skip a balanced `{ … }` block whose opening brace is at the cursor.
   * Returns false when the block never closes. */
  skipBlock(): boolean {
    if (!this.takePunctuation('{')) return false;
    let depth = 1;
    while (!this.done && depth > 0) {
      if (this.isPunctuation('{')) depth += 1;
      else if (this.isPunctuation('}')) depth -= 1;
      this.position += 1;
    }
    return depth === 0;
  }

  /** Resynchronize after a malformed declaration: stop at the next `;` at this
   * level, or at a `}`/`rpc` that plainly begins something else. */
  resynchronize(): void {
    let depth = 0;
    while (!this.done) {
      if (this.isPunctuation('{')) depth += 1;
      else if (this.isPunctuation('}')) {
        if (depth === 0) return;
        depth -= 1;
      } else if (depth === 0 && this.isPunctuation(';')) {
        this.position += 1;
        return;
      } else if (depth === 0 && this.isIdentifier('rpc')) return;
      this.position += 1;
    }
  }
}

interface BindingParse {
  readonly state: 'PROVEN' | 'MALFORMED';
  readonly bindings: readonly ProtoHttpBinding[];
}

/** Read one `{ … }` textproto binding block. The cursor must sit on `{`. */
function readBindingBlock(cursor: TokenCursor, kind: 'PRIMARY' | 'ADDITIONAL', depth: number): BindingParse {
  if (depth > 4) return { state: 'MALFORMED', bindings: [] };
  if (!cursor.takePunctuation('{')) return { state: 'MALFORMED', bindings: [] };

  const verbs: { method: ProtoHttpMethod; routeTemplate: string }[] = [];
  const additional: ProtoHttpBinding[] = [];
  let body: ProtoBodyPresence = 'ABSENT';
  let bodyField: string | null = null;
  let malformed = false;

  while (!cursor.done && !cursor.isPunctuation('}')) {
    if (cursor.takePunctuation(',') || cursor.takePunctuation(';')) continue;

    const key = cursor.takeIdentifier();
    if (key === null) { malformed = true; break; }

    if (key === 'additional_bindings') {
      cursor.takePunctuation(':');
      if (!cursor.isPunctuation('{')) { malformed = true; break; }
      const nested = readBindingBlock(cursor, 'ADDITIONAL', depth + 1);
      if (nested.state === 'MALFORMED') { malformed = true; break; }
      for (const entry of nested.bindings) additional.push(entry);
      continue;
    }

    const verb = HTTP_VERB_KEYS[key];
    if (verb === undefined && !KNOWN_NON_VERB_KEYS.has(key)) { malformed = true; break; }

    if (!cursor.takePunctuation(':')) {
      // `custom { kind: "…" path: "…" }` is the one known non-verb key that
      // takes a block rather than a scalar.
      if (key === 'custom' && cursor.isPunctuation('{')) {
        if (!cursor.skipBlock()) { malformed = true; break; }
        continue;
      }
      malformed = true;
      break;
    }

    const value = cursor.peek();
    if (value === null || value.kind !== 'STRING') { malformed = true; break; }
    cursor.next();

    if (verb !== undefined) {
      const routeTemplate = safeRouteTemplate(value.value);
      if (routeTemplate === null) { malformed = true; break; }
      verbs.push({ method: verb, routeTemplate });
      continue;
    }
    if (key === 'body') {
      if (value.value === '*') { body = 'WILDCARD'; bodyField = null; }
      else if (SAFE_BODY_FIELD_RE.test(value.value)) { body = 'PRESENT'; bodyField = value.value; }
      else { malformed = true; break; }
    }
  }

  if (malformed) return { state: 'MALFORMED', bindings: [] };
  if (!cursor.takePunctuation('}')) return { state: 'MALFORMED', bindings: [] };
  if (verbs.length === 0 && additional.length === 0) return { state: 'MALFORMED', bindings: [] };

  const primary = verbs.map((entry) => ({ kind, method: entry.method, routeTemplate: entry.routeTemplate, body, bodyField }));
  const bindings = [...primary, ...additional];
  if (bindings.length > PROTO_MAX_BINDINGS_PER_RPC) return { state: 'MALFORMED', bindings: [] };
  return { state: 'PROVEN', bindings };
}

interface RpcBodyParse {
  readonly state: ProtoHttpBindingState;
  readonly bindings: readonly ProtoHttpBinding[];
  readonly wellFormed: boolean;
}

/** Read an RPC body `{ … }`, extracting only `option (google.api.http)`. */
function readRpcBody(cursor: TokenCursor): RpcBodyParse {
  if (!cursor.takePunctuation('{')) return { state: 'ABSENT', bindings: [], wellFormed: false };

  let state: ProtoHttpBindingState = 'ABSENT';
  let bindings: readonly ProtoHttpBinding[] = [];
  let sawUnsupportedOption = false;

  while (!cursor.done && !cursor.isPunctuation('}')) {
    if (!cursor.isIdentifier('option')) {
      // Anything other than an option inside an RPC body is not something this
      // reader claims to understand; skip it without deriving anything.
      if (cursor.isPunctuation('{')) { if (!cursor.skipBlock()) return { state: 'MALFORMED', bindings: [], wellFormed: false }; continue; }
      cursor.next();
      continue;
    }
    cursor.next();

    let optionName: string | null = null;
    if (cursor.takePunctuation('(')) {
      optionName = cursor.takeIdentifier();
      if (optionName === null || !cursor.takePunctuation(')')) return { state: 'MALFORMED', bindings: [], wellFormed: false };
      // `(google.api.http).field` style suffixes are not the block form.
      while (cursor.takePunctuation('.')) cursor.takeIdentifier();
    } else {
      optionName = cursor.takeIdentifier();
      if (optionName === null) return { state: 'MALFORMED', bindings: [], wellFormed: false };
    }

    if (!cursor.takePunctuation('=')) return { state: 'MALFORMED', bindings: [], wellFormed: false };

    if (optionName !== HTTP_OPTION_NAME) {
      sawUnsupportedOption = true;
      if (cursor.isPunctuation('{')) { if (!cursor.skipBlock()) return { state: 'MALFORMED', bindings: [], wellFormed: false }; }
      else { cursor.next(); }
      cursor.takePunctuation(';');
      continue;
    }

    if (!cursor.isPunctuation('{')) return { state: 'MALFORMED', bindings: [], wellFormed: false };
    const parsed = readBindingBlock(cursor, 'PRIMARY', 0);
    cursor.takePunctuation(';');
    if (parsed.state === 'MALFORMED') return { state: 'MALFORMED', bindings: [], wellFormed: false };
    // A second `google.api.http` on one RPC is a genuine ambiguity, not a
    // replacement of the first.
    bindings = [...bindings, ...parsed.bindings];
    state = bindings.length > 1 ? 'AMBIGUOUS' : 'PROVEN';
  }

  if (!cursor.takePunctuation('}')) return { state: 'MALFORMED', bindings: [], wellFormed: false };
  if (state === 'ABSENT' && sawUnsupportedOption) return { state: 'UNSUPPORTED_OPTION', bindings: [], wellFormed: true };
  return { state, bindings, wellFormed: true };
}

/** Read one message reference, honouring a leading `stream` modifier. A bare
 * `stream` with nothing after it is a message named `stream`, not a modifier. */
function readMessageReference(cursor: TokenCursor): { streaming: boolean; message: string } | null {
  let streaming = false;
  if (cursor.isIdentifier('stream')) {
    const following = cursor.peek(1);
    if (following !== null && following.kind === 'IDENTIFIER') {
      streaming = true;
      cursor.next();
    }
  }
  const message = cursor.takeIdentifier();
  if (message === null || !SAFE_QUALIFIED_RE.test(message)) return null;
  return { streaming, message };
}

interface ReaderState {
  malformedDeclarations: number;
  droppedByCeiling: number;
  ceilingReason: ProtoIncompletenessReason | null;
}

function readService(
  cursor: TokenCursor,
  packageName: string | null,
  state: ReaderState,
): ProtoServiceFact | null {
  const declaredAtLine = cursor.peek()?.line ?? 0;
  const serviceName = cursor.takeIdentifier();
  if (serviceName === null || !SAFE_IDENTIFIER_RE.test(serviceName) || !cursor.takePunctuation('{')) {
    state.malformedDeclarations += 1;
    cursor.resynchronize();
    return null;
  }

  const rpcs: ProtoRpcFact[] = [];
  while (!cursor.done && !cursor.isPunctuation('}')) {
    if (cursor.isIdentifier('option')) {
      cursor.next();
      while (!cursor.done && !cursor.isPunctuation(';') && !cursor.isPunctuation('{')) cursor.next();
      if (cursor.isPunctuation('{')) { if (!cursor.skipBlock()) { state.malformedDeclarations += 1; break; } }
      cursor.takePunctuation(';');
      continue;
    }
    if (!cursor.isIdentifier('rpc')) {
      cursor.next();
      continue;
    }
    cursor.next();

    const rpcLine = cursor.peek()?.line ?? declaredAtLine;
    const rpcName = cursor.takeIdentifier();
    if (rpcName === null || !SAFE_IDENTIFIER_RE.test(rpcName) || !cursor.takePunctuation('(')) {
      state.malformedDeclarations += 1;
      cursor.resynchronize();
      continue;
    }
    const request = readMessageReference(cursor);
    if (request === null || !cursor.takePunctuation(')') || !cursor.isIdentifier('returns')) {
      state.malformedDeclarations += 1;
      cursor.resynchronize();
      continue;
    }
    cursor.next();
    if (!cursor.takePunctuation('(')) {
      state.malformedDeclarations += 1;
      cursor.resynchronize();
      continue;
    }
    const response = readMessageReference(cursor);
    if (response === null || !cursor.takePunctuation(')')) {
      state.malformedDeclarations += 1;
      cursor.resynchronize();
      continue;
    }

    let bindingState: ProtoHttpBindingState = 'ABSENT';
    let bindings: readonly ProtoHttpBinding[] = [];
    if (cursor.isPunctuation('{')) {
      const body = readRpcBody(cursor);
      bindingState = body.state;
      bindings = body.bindings;
      if (!body.wellFormed && body.state === 'MALFORMED') state.malformedDeclarations += 1;
    } else if (!cursor.takePunctuation(';')) {
      state.malformedDeclarations += 1;
      cursor.resynchronize();
      continue;
    }

    if (rpcs.length >= PROTO_MAX_RPCS_PER_SERVICE) {
      state.droppedByCeiling += 1;
      state.ceilingReason = 'PROTO_RPC_CEILING_REACHED';
      continue;
    }

    const canonicalService = packageName === null ? serviceName : `${packageName}.${serviceName}`;
    rpcs.push({
      package: packageName,
      serviceName,
      rpcName,
      canonicalIdentity: `${canonicalService}/${rpcName}`,
      requestMessage: request.message,
      responseMessage: response.message,
      clientStreaming: request.streaming,
      serverStreaming: response.streaming,
      streamingClass: streamingClass(request.streaming, response.streaming),
      httpBindingState: bindingState,
      bindings,
      declaredAtLine: rpcLine,
    });
  }

  if (!cursor.takePunctuation('}')) state.malformedDeclarations += 1;

  return {
    package: packageName,
    serviceName,
    canonicalIdentity: packageName === null ? serviceName : `${packageName}.${serviceName}`,
    rpcs,
    declaredAtLine,
  };
}

/**
 * Read the protobuf declarations of one file.
 *
 * The result is exhaustive about what it could not prove: `completeness`
 * carries the categorical reason and exact counts, so a caller can never read
 * a partial surface as a total one.
 */
export function readProtoDeclarations(sourceText: string, options: ProtoLexOptions = {}): ProtoFileFacts {
  const lexed = lexProto(sourceText, options);
  const lexReason = lexStateReason(lexed.state);
  const cursor = new TokenCursor(lexed.tokens);
  const state: ReaderState = { malformedDeclarations: 0, droppedByCeiling: 0, ceilingReason: null };

  let packageName: string | null = null;
  const services: ProtoServiceFact[] = [];
  const messageNames: string[] = [];

  while (!cursor.done) {
    if (cursor.isIdentifier('package')) {
      cursor.next();
      const value = cursor.takeIdentifier();
      packageName = value !== null && SAFE_QUALIFIED_RE.test(value) ? value : null;
      cursor.takePunctuation(';');
      continue;
    }
    if (cursor.isIdentifier('service')) {
      cursor.next();
      if (services.length >= PROTO_MAX_SERVICES) {
        state.droppedByCeiling += 1;
        state.ceilingReason = 'PROTO_SERVICE_CEILING_REACHED';
        cursor.takeIdentifier();
        cursor.skipBlock();
        continue;
      }
      const service = readService(cursor, packageName, state);
      if (service !== null) services.push(service);
      continue;
    }
    if (cursor.isIdentifier('message') || cursor.isIdentifier('enum')) {
      const isMessage = cursor.isIdentifier('message');
      cursor.next();
      const name = cursor.takeIdentifier();
      if (isMessage && name !== null && SAFE_IDENTIFIER_RE.test(name)) {
        if (messageNames.length >= PROTO_MAX_MESSAGES) {
          state.droppedByCeiling += 1;
          state.ceilingReason = 'PROTO_MESSAGE_CEILING_REACHED';
        } else {
          messageNames.push(name);
        }
      }
      if (cursor.isPunctuation('{') && !cursor.skipBlock()) state.malformedDeclarations += 1;
      continue;
    }
    // Everything else at file scope — syntax, import, option, extend, reserved
    // — yields no fact and is skipped without interpretation.
    if (cursor.isPunctuation('{')) {
      if (!cursor.skipBlock()) state.malformedDeclarations += 1;
      continue;
    }
    cursor.next();
  }

  const rpcs = services.flatMap((service) => service.rpcs);
  const reason = lexReason
    ?? state.ceilingReason
    ?? (state.malformedDeclarations > 0 ? 'PROTO_MALFORMED_DECLARATION' : null);

  return {
    schemaVersion: PROTO_DECLARATIONS_VERSION,
    extractorVersion: PROTO_EXTRACTOR_VERSION,
    package: packageName,
    services,
    messageNames,
    completeness: {
      state: reason === null ? 'COMPLETE' : lexReason !== null ? 'UNKNOWN' : 'TRUNCATED',
      reason,
      malformedDeclarations: state.malformedDeclarations,
      droppedByCeiling: state.droppedByCeiling,
    },
    counters: {
      services: services.length,
      rpcs: rpcs.length,
      messages: messageNames.length,
      httpBindings: rpcs.reduce((total, rpc) => total + rpc.bindings.length, 0),
      unary: rpcs.filter((rpc) => rpc.streamingClass === 'UNARY').length,
      clientStreaming: rpcs.filter((rpc) => rpc.streamingClass === 'CLIENT_STREAMING').length,
      serverStreaming: rpcs.filter((rpc) => rpc.streamingClass === 'SERVER_STREAMING').length,
      bidirectional: rpcs.filter((rpc) => rpc.streamingClass === 'BIDIRECTIONAL').length,
      tokens: lexed.tokenCount,
      commentsDiscarded: lexed.commentsDiscarded,
    },
  };
}

/** Deterministic digest over the structural facts of one proto file. Carries
 * identity and shape only — never source text, never a comment. */
export function protoFactsDigest(input: {
  readonly repoId: string;
  readonly sourceSha: string;
  readonly relativePath: string;
  readonly facts: ProtoFileFacts;
}): string {
  return prefixedDigest24('protofacts', {
    repoId: input.repoId,
    sourceSha: input.sourceSha,
    relativePath: input.relativePath,
    extractorVersion: input.facts.extractorVersion,
    package: input.facts.package,
    completeness: input.facts.completeness,
    services: input.facts.services.map((service) => ({
      canonicalIdentity: service.canonicalIdentity,
      rpcs: service.rpcs.map((rpc) => ({
        canonicalIdentity: rpc.canonicalIdentity,
        requestMessage: rpc.requestMessage,
        responseMessage: rpc.responseMessage,
        streamingClass: rpc.streamingClass,
        httpBindingState: rpc.httpBindingState,
        bindings: rpc.bindings,
      })),
    })),
  });
}
