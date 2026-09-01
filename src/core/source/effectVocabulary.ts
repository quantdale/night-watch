// ---------------------------------------------------------------------------
// Nightwatch C-06 — data-only PHP effect-kind vocabulary.
//
// This module is DATA, not analysis. It states which callee identifiers are
// known to carry which effect kind, which PHP constructs make a callee name
// stop predicting the executed method, and what the owner-approved admission
// policy is for each kind. Nothing here inspects source, infers a kind from a
// code pattern, or reads a file.
//
// Three properties make the table safe to reason about:
//
//   1. It is CONSERVATIVE BY CONSTRUCTION. Classification is by identifier,
//      not by resolved receiver type, so one identifier may name several
//      declarations. An identifier therefore carries the MOST disqualifying
//      kind among every declaration that bears that name. The analyzer may
//      over-approximate a route's effects; it may never under-approximate
//      them.
//   2. It is INCOMPLETE ON PURPOSE, and says so. Every identifier the table
//      does not name is `UNCLASSIFIED`, and `UNCLASSIFIED` fails closed. The
//      table can never be made "more permissive" by omission: deleting a
//      write identifier turns the closures that reach it AMBIGUOUS, never
//      proven.
//   3. It is DIGEST-BOUND. Every proof records the vocabulary digest it was
//      decided under, so a proof can never silently outlive the data that
//      produced it.
// ---------------------------------------------------------------------------

import { sourceEvidenceDigest } from '../semanticCoverage';

export const PHP_EFFECT_VOCABULARY_VERSION = 'nightwatch.php-effect-vocabulary.v1' as const;

/** The explicit effect kinds. `UNCLASSIFIED` is a real kind, not a gap. */
export const EFFECT_KINDS = [
  'PURE_READ',
  'DATA_WRITE',
  'AUDIT_WRITE',
  'CACHE_WRITE',
  'SESSION_WRITE',
  'MESSAGE_PUBLISH',
  'EXTERNAL_CALL',
  'UNCLASSIFIED',
] as const;
export type EffectKind = (typeof EFFECT_KINDS)[number];

/**
 * The owner-approved admission policy, per kind, recorded on every proof.
 *
 * `ADMISSIBLE` — the kind may appear inside a read-only proof.
 * `DISQUALIFYING` — one occurrence is terminal for read-only proof. The
 *   operation is mutation-capable or externally-effectful; that is a decided
 *   fact, not a gap in the analysis.
 * `FAIL_CLOSED` — the analysis could not decide. Not a proof, and not a
 *   mutation finding either.
 */
export type EffectKindAdmission = 'ADMISSIBLE' | 'DISQUALIFYING' | 'FAIL_CLOSED';

export const EFFECT_KIND_POLICY: Readonly<Record<EffectKind, EffectKindAdmission>> = Object.freeze({
  PURE_READ: 'ADMISSIBLE',
  DATA_WRITE: 'DISQUALIFYING',
  AUDIT_WRITE: 'DISQUALIFYING',
  CACHE_WRITE: 'DISQUALIFYING',
  SESSION_WRITE: 'DISQUALIFYING',
  MESSAGE_PUBLISH: 'DISQUALIFYING',
  EXTERNAL_CALL: 'DISQUALIFYING',
  UNCLASSIFIED: 'FAIL_CLOSED',
});

/**
 * Method-call callees (`->name(` / `::name(`).
 *
 * Seeded from the measured `mobingilabs/ripple-api` data-access, cache, mail,
 * notification and outbound-HTTP surfaces. Every entry names a method that is
 * declared in that repository's own wrapper layer, so the identifier's meaning
 * is a property of the source, not of a naming convention.
 */
const PHP_METHOD_EFFECTS: readonly (readonly [string, EffectKind])[] = Object.freeze([
  // --- App\Core\Dao\DynamoDbDao — persistent datastore -------------------
  ['createItem', 'DATA_WRITE'],
  ['updateItem', 'DATA_WRITE'],
  ['deleteItem', 'DATA_WRITE'],
  ['updatebatchWriteItem', 'DATA_WRITE'],
  ['setItem', 'DATA_WRITE'],
  ['setItems', 'DATA_WRITE'],
  ['putItem', 'DATA_WRITE'],
  ['batchWriteItem', 'DATA_WRITE'],
  ['getItem', 'PURE_READ'],
  ['listItems', 'PURE_READ'],
  ['secondaryListItems', 'PURE_READ'],
  ['unmarshalItem', 'PURE_READ'],
  ['getScanOptions', 'PURE_READ'],
  ['getOptions', 'PURE_READ'],
  ['getDao', 'PURE_READ'],
  ['getDaoClassName', 'PURE_READ'],
  ['getDynamoDbClientKey', 'PURE_READ'],
  // `scan` is a full-table read. It is a read, and it is also the identifier
  // most likely to be shared with an unrelated declaration; it stays a read
  // because no measured declaration of that name mutates.
  ['scan', 'PURE_READ'],

  // --- App\Core\Utility\Cache — Redis -----------------------------------
  ['setHash', 'CACHE_WRITE'],
  ['setHashMulti', 'CACHE_WRITE'],
  ['setHashAccount', 'CACHE_WRITE'],
  ['setHashCurAccount', 'CACHE_WRITE'],
  ['setHashTagList', 'CACHE_WRITE'],
  ['setHashTags', 'CACHE_WRITE'],
  ['setHashSavingsPlan', 'CACHE_WRITE'],
  ['setHashCustomService', 'CACHE_WRITE'],
  ['setHashInvoiceTotal', 'CACHE_WRITE'],
  ['setHashInvoiceTemplate', 'CACHE_WRITE'],
  ['setMspHash', 'CACHE_WRITE'],
  ['setUserHash', 'CACHE_WRITE'],
  ['updateUserHash', 'CACHE_WRITE'],
  ['setServiceListHash', 'CACHE_WRITE'],
  ['deleteHash', 'CACHE_WRITE'],
  ['deleteHashData', 'CACHE_WRITE'],
  ['deleteMspHash', 'CACHE_WRITE'],
  ['scanAndSetTimeOut', 'CACHE_WRITE'],
  ['hSet', 'CACHE_WRITE'],
  ['expire', 'CACHE_WRITE'],
  // `setValue` is declared on both the cache wrapper and the Slack client.
  // The most disqualifying meaning wins.
  ['setValue', 'CACHE_WRITE'],
  ['getHash', 'PURE_READ'],
  ['getHashMulti', 'PURE_READ'],
  ['getHashInvoiceTotal', 'PURE_READ'],
  ['getMspHash', 'PURE_READ'],
  ['getUserHash', 'PURE_READ'],
  ['getServiceListHash', 'PURE_READ'],
  ['getValue', 'PURE_READ'],

  // --- outbound network: mail, chat, issue tracker, subscription webhook -
  ['sendEmail', 'EXTERNAL_CALL'],
  ['sendTemplatedEmail', 'EXTERNAL_CALL'],
  ['sendResellerMail', 'EXTERNAL_CALL'],
  ['sendNotificationMail', 'EXTERNAL_CALL'],
  ['sendResetPasswordMail', 'EXTERNAL_CALL'],
  ['execCurul', 'EXTERNAL_CALL'],
  ['execCurulWithResult', 'EXTERNAL_CALL'],
  ['sendIssuesCreate', 'EXTERNAL_CALL'],
  ['sendProjectV2Notification', 'EXTERNAL_CALL'],
  ['sendInvoiceNotification', 'EXTERNAL_CALL'],
  ['sendInvoiceFailureAlert', 'EXTERNAL_CALL'],
  ['sendInvoiceCreateSummaryAlert', 'EXTERNAL_CALL'],
  ['sendRegisterPayerAccount', 'EXTERNAL_CALL'],
  ['sendRegisterPayerSubscription', 'EXTERNAL_CALL'],
  ['sendRegisterPayerDataSet', 'EXTERNAL_CALL'],
  ['checkSubscriptionViaWebhookd', 'EXTERNAL_CALL'],

  // --- asynchronous dispatch --------------------------------------------
  ['publish', 'MESSAGE_PUBLISH'],
  ['sendMessage', 'MESSAGE_PUBLISH'],
  ['sendBatchRequest', 'MESSAGE_PUBLISH'],
  ['sendPdfRequest', 'MESSAGE_PUBLISH'],

  // --- object storage ----------------------------------------------------
  ['uploadFile', 'DATA_WRITE'],
  ['putObject', 'DATA_WRITE'],
  ['deleteObject', 'DATA_WRITE'],
  ['getObject', 'EXTERNAL_CALL'],
]);

/**
 * Bare function callees (`name(`).
 *
 * Only PHP library functions whose effect is a property of the language or of
 * a well-known extension are listed. Application-level free functions are not
 * guessed at: they stay `UNCLASSIFIED` and fail closed.
 */
const PHP_FUNCTION_EFFECTS: readonly (readonly [string, EffectKind])[] = Object.freeze([
  // outbound network
  ['curl_init', 'EXTERNAL_CALL'],
  ['curl_setopt', 'EXTERNAL_CALL'],
  ['curl_setopt_array', 'EXTERNAL_CALL'],
  ['curl_exec', 'EXTERNAL_CALL'],
  ['curl_multi_exec', 'EXTERNAL_CALL'],
  ['curl_close', 'EXTERNAL_CALL'],
  ['curl_getinfo', 'EXTERNAL_CALL'],
  ['curl_error', 'EXTERNAL_CALL'],
  ['curl_errno', 'EXTERNAL_CALL'],
  ['fsockopen', 'EXTERNAL_CALL'],
  ['stream_socket_client', 'EXTERNAL_CALL'],
  ['mail', 'EXTERNAL_CALL'],
  // `file_get_contents` and `fopen` accept URL wrappers, so their effect is
  // not decidable from the identifier alone. Conservative: outbound.
  ['file_get_contents', 'EXTERNAL_CALL'],
  ['fopen', 'EXTERNAL_CALL'],

  // filesystem and object mutation
  ['file_put_contents', 'DATA_WRITE'],
  ['fputs', 'DATA_WRITE'],
  ['fputcsv', 'DATA_WRITE'],
  ['unlink', 'DATA_WRITE'],
  ['rmdir', 'DATA_WRITE'],
  ['mkdir', 'DATA_WRITE'],
  ['touch', 'DATA_WRITE'],
  ['copy', 'DATA_WRITE'],
  ['chmod', 'DATA_WRITE'],
  ['tempnam', 'DATA_WRITE'],

  // session
  ['session_start', 'SESSION_WRITE'],
  ['session_regenerate_id', 'SESSION_WRITE'],
  ['session_destroy', 'SESSION_WRITE'],
  ['session_unset', 'SESSION_WRITE'],
  ['setcookie', 'SESSION_WRITE'],
  ['setrawcookie', 'SESSION_WRITE'],

  // audit / log sinks
  ['error_log', 'AUDIT_WRITE'],
  ['syslog', 'AUDIT_WRITE'],
  ['openlog', 'AUDIT_WRITE'],

  // pure, total, side-effect-free library functions
  ['count', 'PURE_READ'],
  ['sizeof', 'PURE_READ'],
  ['strlen', 'PURE_READ'],
  ['mb_strlen', 'PURE_READ'],
  ['substr', 'PURE_READ'],
  ['mb_substr', 'PURE_READ'],
  ['strpos', 'PURE_READ'],
  ['strrpos', 'PURE_READ'],
  ['str_replace', 'PURE_READ'],
  ['str_repeat', 'PURE_READ'],
  ['str_pad', 'PURE_READ'],
  ['str_contains', 'PURE_READ'],
  ['str_starts_with', 'PURE_READ'],
  ['str_ends_with', 'PURE_READ'],
  ['strtolower', 'PURE_READ'],
  ['strtoupper', 'PURE_READ'],
  ['ucfirst', 'PURE_READ'],
  ['trim', 'PURE_READ'],
  ['ltrim', 'PURE_READ'],
  ['rtrim', 'PURE_READ'],
  ['sprintf', 'PURE_READ'],
  ['number_format', 'PURE_READ'],
  ['implode', 'PURE_READ'],
  ['explode', 'PURE_READ'],
  ['json_encode', 'PURE_READ'],
  ['json_decode', 'PURE_READ'],
  ['base64_encode', 'PURE_READ'],
  ['base64_decode', 'PURE_READ'],
  ['intval', 'PURE_READ'],
  ['floatval', 'PURE_READ'],
  ['strval', 'PURE_READ'],
  ['boolval', 'PURE_READ'],
  ['abs', 'PURE_READ'],
  ['round', 'PURE_READ'],
  ['floor', 'PURE_READ'],
  ['ceil', 'PURE_READ'],
  ['min', 'PURE_READ'],
  ['max', 'PURE_READ'],
  ['is_array', 'PURE_READ'],
  ['is_null', 'PURE_READ'],
  ['is_string', 'PURE_READ'],
  ['is_numeric', 'PURE_READ'],
  ['is_bool', 'PURE_READ'],
  ['is_int', 'PURE_READ'],
  ['gettype', 'PURE_READ'],
  ['in_array', 'PURE_READ'],
  ['array_key_exists', 'PURE_READ'],
  ['array_keys', 'PURE_READ'],
  ['array_values', 'PURE_READ'],
  ['array_merge', 'PURE_READ'],
  ['array_slice', 'PURE_READ'],
  ['array_unique', 'PURE_READ'],
  ['array_search', 'PURE_READ'],
  ['array_flip', 'PURE_READ'],
  ['array_combine', 'PURE_READ'],
  ['array_column', 'PURE_READ'],
  ['array_sum', 'PURE_READ'],
  ['array_fill', 'PURE_READ'],
  ['range', 'PURE_READ'],
  ['compact', 'PURE_READ'],
  ['date', 'PURE_READ'],
  ['strtotime', 'PURE_READ'],
  ['mktime', 'PURE_READ'],
  ['time', 'PURE_READ'],
  ['sort', 'PURE_READ'],
  ['rsort', 'PURE_READ'],
  ['ksort', 'PURE_READ'],
  ['asort', 'PURE_READ'],
  ['arsort', 'PURE_READ'],

  // Language constructs that read or shape values in memory only. They are
  // written like calls, so the analyzer meets them at a callsite.
  ['isset', 'PURE_READ'],
  ['empty', 'PURE_READ'],
  ['array', 'PURE_READ'],
  ['list', 'PURE_READ'],
  ['unset', 'PURE_READ'],
]);

/**
 * PHP constructs after which a callee NAME no longer predicts the executed
 * method. Their presence anywhere in a closure is terminal for the closure:
 * the analyzer cannot enumerate the reachable effects, so it refuses.
 *
 * This includes the callback-taking library functions. A callback is an
 * indirect call whose target is a value, and Nightwatch does not resolve
 * values.
 */
export const PHP_DYNAMIC_DISPATCH_FUNCTIONS: readonly string[] = Object.freeze([
  'call_user_func',
  'call_user_func_array',
  'forward_static_call',
  'forward_static_call_array',
  'array_map',
  'array_filter',
  'array_walk',
  'array_walk_recursive',
  'array_reduce',
  'usort',
  'uasort',
  'uksort',
  'preg_replace_callback',
  'preg_replace_callback_array',
  'iterator_apply',
  'set_error_handler',
  'set_exception_handler',
  'register_shutdown_function',
  'register_tick_function',
  'spl_autoload_register',
  'create_function',
  'eval',
  'assert',
  'extract',
  'include',
  'include_once',
  'require',
  'require_once',
  // An anonymous function or arrow function at a callsite position is an
  // indirect call whose target is a value.
  'function',
  'fn',
]);

/**
 * Magic members that decouple a written member name from the executed member.
 * A declaration or a call of any of these inside the closure is terminal.
 */
export const PHP_DYNAMIC_DISPATCH_MEMBERS: readonly string[] = Object.freeze([
  '__call',
  '__callStatic',
  '__get',
  '__set',
  '__isset',
  '__unset',
]);

/**
 * Written like calls, but they are control structures, not callsites. They
 * are skipped rather than classified, because classifying them would put a
 * language keyword in the effect ledger.
 */
export const PHP_CONTROL_CONSTRUCTS: readonly string[] = Object.freeze([
  'if',
  'elseif',
  'while',
  'for',
  'foreach',
  'switch',
  'match',
  'catch',
  'declare',
  'return',
  'yield',
  'throw',
  'clone',
  'echo',
  'print',
  'use',
  'and',
  'or',
  'xor',
  'not',
]);

/** Bounds. Exceeding any of them is a categorical fail-closed outcome. */
export const MAX_EFFECT_CLOSURE_DEPTH = 6;
export const MAX_EFFECT_CLOSURE_DECLARATIONS = 96;
export const MAX_EFFECT_CLOSURE_CALLSITES = 4096;
export const MAX_EFFECT_CLOSURE_FILES = 32;
export const MAX_EFFECT_CLOSURE_TOKENS = 400_000;

const METHOD_INDEX: ReadonlyMap<string, EffectKind> = new Map(PHP_METHOD_EFFECTS);
const FUNCTION_INDEX: ReadonlyMap<string, EffectKind> = new Map(PHP_FUNCTION_EFFECTS);
const DYNAMIC_FUNCTIONS: ReadonlySet<string> = new Set(PHP_DYNAMIC_DISPATCH_FUNCTIONS);
const DYNAMIC_MEMBERS: ReadonlySet<string> = new Set(PHP_DYNAMIC_DISPATCH_MEMBERS);
const CONTROL_CONSTRUCTS: ReadonlySet<string> = new Set(PHP_CONTROL_CONSTRUCTS);

export type PhpCalleeScope = 'METHOD' | 'FUNCTION';

/** True when the identifier defeats name-based dispatch in its scope. */
export function isPhpDynamicDispatchCallee(identifier: string, scope: PhpCalleeScope): boolean {
  return scope === 'FUNCTION' ? DYNAMIC_FUNCTIONS.has(identifier) : DYNAMIC_MEMBERS.has(identifier);
}

/** True when the identifier is a control structure rather than a callsite. */
export function isPhpControlConstruct(identifier: string): boolean {
  return CONTROL_CONSTRUCTS.has(identifier);
}

/**
 * The declared effect kind of one callee identifier. An identifier the table
 * does not name is `UNCLASSIFIED`; it is never assumed to be a read.
 */
export function phpCalleeEffectKind(identifier: string, scope: PhpCalleeScope): EffectKind {
  const index = scope === 'METHOD' ? METHOD_INDEX : FUNCTION_INDEX;
  return index.get(identifier) ?? 'UNCLASSIFIED';
}

/** Sizes, reported so vocabulary growth is visible rather than implicit. */
export function phpEffectVocabularySize(): { readonly methods: number; readonly functions: number; readonly dynamic: number } {
  return { methods: METHOD_INDEX.size, functions: FUNCTION_INDEX.size, dynamic: DYNAMIC_FUNCTIONS.size + DYNAMIC_MEMBERS.size };
}

let cachedDigest: string | null = null;

/**
 * Deterministic digest over the whole decision surface: the kinds, the
 * per-kind admission policy, both identifier tables and both dynamic-dispatch
 * lists. Changing any one of them changes every proof's recorded digest.
 */
export function phpEffectVocabularyDigest(): string {
  if (cachedDigest === null) {
    cachedDigest = sourceEvidenceDigest({
      kind: 'php-effect-vocabulary',
      version: PHP_EFFECT_VOCABULARY_VERSION,
      effectKinds: [...EFFECT_KINDS],
      policy: EFFECT_KINDS.map((effectKind) => [effectKind, EFFECT_KIND_POLICY[effectKind]]),
      methods: [...PHP_METHOD_EFFECTS].map(([identifier, effectKind]) => [identifier, effectKind]).sort((left, right) => left[0]!.localeCompare(right[0]!)),
      functions: [...PHP_FUNCTION_EFFECTS].map(([identifier, effectKind]) => [identifier, effectKind]).sort((left, right) => left[0]!.localeCompare(right[0]!)),
      dynamicFunctions: [...PHP_DYNAMIC_DISPATCH_FUNCTIONS].sort((left, right) => left.localeCompare(right)),
      dynamicMembers: [...PHP_DYNAMIC_DISPATCH_MEMBERS].sort((left, right) => left.localeCompare(right)),
      controlConstructs: [...PHP_CONTROL_CONSTRUCTS].sort((left, right) => left.localeCompare(right)),
      bounds: {
        depth: MAX_EFFECT_CLOSURE_DEPTH,
        declarations: MAX_EFFECT_CLOSURE_DECLARATIONS,
        callsites: MAX_EFFECT_CLOSURE_CALLSITES,
        files: MAX_EFFECT_CLOSURE_FILES,
        tokens: MAX_EFFECT_CLOSURE_TOKENS,
      },
    });
  }
  return cachedDigest;
}
