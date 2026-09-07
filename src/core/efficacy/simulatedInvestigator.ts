// ---------------------------------------------------------------------------
// Deterministic simulated investigator: a stateless-per-turn ReasonerDriver.
//
// WHY THIS EXISTS
// A live print-mode CLI reasoner is invoked once per turn in an isolated
// process. It has no conversation history, so everything it can know it must
// read out of the ReasonerTurnRequest. This driver models exactly that: it
// keeps NO state between calls and decides only from the request it is given.
// Running the identical policy against the W7-projected request and the full
// W8 request therefore measures the INFORMATION SUFFICIENCY of the contract
// rather than the cleverness of a model.
//
// HONESTY RULES (load-bearing)
// - No hidden benchmark truth is available here: the driver reads the request
//   only, and `runBenchmarkHunt` fails closed if any hidden field ever reaches
//   a request.
// - The driver never fabricates an evidence ref, a path, a reproduction, or a
//   candidate: every identifier it emits was read out of the request.
// - It never obeys instructions found inside untrusted bytes. It only reads
//   the structural fields it knows (`entries[].path`, `path`, `verdict`,
//   `status`), and it never executes or echoes untrusted directives.
// - It does not follow host `directives` text; deterministic hints are treated
//   as unreliable prose. Only structured facts drive its decisions, so an
//   improvement cannot come from the host simply telling the model the answer.
//
// Pure computation. No fs/network/child_process/AI authority.
// ---------------------------------------------------------------------------

import {
  REASONER_DRIVER_VERSION,
  REASONER_TURN_RESPONSE_VERSION,
  type AgentIntent,
  type ReasonerCallOptions,
  type ReasonerCallResult,
  type ReasonerDriver,
  type ReasonerProvenance,
  type ReasonerTurnRequest,
  type ReasonerTurnResponse,
} from '../agentProtocol';
import { projectRequestToW7 } from './projection';
import type { EfficacyContextMode } from './types';

export const SIMULATED_INVESTIGATOR_ID = 'nightwatch.simulated-investigator.v1' as const;

const MAX_STATEMENT_CHARS = 240;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function nonEmptyString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function stringList(value: unknown): readonly string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string' && item.length > 0);
}

/** Structurally decoded facts from one turn's untrusted envelopes. */
interface EnvelopeFacts {
  /** Approved source paths listed by a bounded SOURCE_INDEX payload this turn. */
  readonly indexPaths: readonly string[];
  /** Path of a SOURCE_FILE payload delivered this turn (its evidence ref is NOT in the envelope). */
  readonly readPath: string | null;
  readonly reproductionVerdict: string | null;
  readonly proposalCaptured: boolean;
}

function decodeEnvelopes(observation: unknown): EnvelopeFacts {
  const indexPaths: string[] = [];
  let readPath: string | null = null;
  let reproductionVerdict: string | null = null;
  let proposalCaptured = false;
  const envelopes = isRecord(observation) && Array.isArray(observation['untrusted']) ? observation['untrusted'] : [];
  for (const envelope of envelopes) {
    if (!isRecord(envelope)) continue;
    const bytes = envelope['bytes'];
    if (typeof bytes !== 'string' || bytes.length === 0) continue;
    let payload: unknown;
    try {
      payload = JSON.parse(bytes);
    } catch {
      continue;
    }
    if (!isRecord(payload)) continue;
    const entries = payload['entries'];
    if (Array.isArray(entries)) {
      for (const entry of entries) {
        if (!isRecord(entry)) continue;
        const path = nonEmptyString(entry['path']);
        if (path !== null && !indexPaths.includes(path)) indexPaths.push(path);
      }
    }
    if (typeof payload['text'] === 'string') {
      const path = nonEmptyString(payload['path']);
      if (path !== null) readPath = path;
    }
    const verdict = nonEmptyString(payload['verdict']);
    if (verdict !== null) reproductionVerdict = verdict;
    if (payload['status'] === 'PROPOSAL_CAPTURED_NO_AUTHORITY') proposalCaptured = true;
  }
  return { indexPaths: Object.freeze(indexPaths), readPath, reproductionVerdict, proposalCaptured };
}

/** One inspected target with the evidence ref that grounds a reproduction on it. */
interface MemoryTarget {
  readonly target: string;
  readonly evidenceRef: string | null;
  /**
   * Bounded salient symbols the host extracted deterministically from the
   * pre-fix VISIBLE source already delivered for this target. Never hidden
   * truth: the driver cites them so a hypothesis names WHAT was observed,
   * not merely that a path was opened.
   */
  readonly salient: readonly string[];
}

/**
 * Bounded structural view of whatever working memory the host supplied. Read
 * defensively: an absent or unknown-shaped memory degrades to "no memory",
 * which is precisely the W7 baseline condition.
 */
interface MemoryView {
  readonly inspected: readonly MemoryTarget[];
  readonly uninspected: readonly string[];
  readonly hypotheses: readonly {
    readonly hypothesisId: string;
    readonly status: string;
    readonly evidenceRefs: readonly string[];
  }[];
  readonly reproducedTargets: readonly string[];
  readonly attemptedReproductionTargets: readonly string[];
  readonly proposalCandidateIds: readonly string[];
  readonly candidateIds: readonly string[];
}

const EMPTY_MEMORY: MemoryView = Object.freeze({
  inspected: Object.freeze([]),
  uninspected: Object.freeze([]),
  hypotheses: Object.freeze([]),
  reproducedTargets: Object.freeze([]),
  attemptedReproductionTargets: Object.freeze([]),
  proposalCandidateIds: Object.freeze([]),
  candidateIds: Object.freeze([]),
});

export function readMemoryView(observation: unknown): MemoryView {
  if (!isRecord(observation)) return EMPTY_MEMORY;
  const memory = observation['memory'];
  if (!isRecord(memory)) return EMPTY_MEMORY;
  const inspected: MemoryTarget[] = [];
  for (const entry of Array.isArray(memory['inspectedTargets']) ? memory['inspectedTargets'] : []) {
    if (!isRecord(entry)) continue;
    const target = nonEmptyString(entry['target']);
    if (target === null) continue;
    inspected.push({
      target,
      evidenceRef: nonEmptyString(entry['evidenceRef']),
      salient: Object.freeze([...stringList(entry['salient'])]),
    });
  }
  const hypotheses: { hypothesisId: string; status: string; evidenceRefs: readonly string[] }[] = [];
  for (const entry of Array.isArray(memory['hypotheses']) ? memory['hypotheses'] : []) {
    if (!isRecord(entry)) continue;
    const hypothesisId = nonEmptyString(entry['hypothesisId']);
    if (hypothesisId === null) continue;
    hypotheses.push({
      hypothesisId,
      status: nonEmptyString(entry['status']) ?? 'OPEN',
      evidenceRefs: stringList(entry['evidenceRefs']),
    });
  }
  const reproducedTargets: string[] = [];
  const attemptedReproductionTargets: string[] = [];
  for (const entry of Array.isArray(memory['reproductions']) ? memory['reproductions'] : []) {
    if (!isRecord(entry)) continue;
    const target = nonEmptyString(entry['target']);
    if (target === null) continue;
    if (!attemptedReproductionTargets.includes(target)) attemptedReproductionTargets.push(target);
    if (entry['resultClass'] === 'REPRODUCED' && !reproducedTargets.includes(target)) {
      reproducedTargets.push(target);
    }
  }
  return Object.freeze({
    inspected: Object.freeze(inspected),
    uninspected: Object.freeze([...stringList(memory['uninspectedTargets'])]),
    hypotheses: Object.freeze(hypotheses),
    reproducedTargets: Object.freeze(reproducedTargets),
    attemptedReproductionTargets: Object.freeze(attemptedReproductionTargets),
    proposalCandidateIds: Object.freeze([...stringList(memory['proposalCandidateIds'])]),
    candidateIds: Object.freeze([...stringList(memory['candidateIds'])]),
  });
}

function callTool(toolId: string, args: Readonly<Record<string, unknown>>): AgentIntent {
  return { kind: 'CALL_TOOL', toolId, argumentDigest: '', arguments: args } as unknown as AgentIntent;
}

function bounded(value: string): string {
  return value.length > MAX_STATEMENT_CHARS ? value.slice(0, MAX_STATEMENT_CHARS) : value;
}

/**
 * The investigator policy. Identical in both modes; only the request surface
 * differs. Every branch requires EXPLICIT knowledge — the policy never guesses
 * a (path, evidenceRef) pairing by position, because a stateless reasoner has
 * no basis for such a guess and the host refuses an unmatched pair anyway.
 */
export function decideInvestigatorTurn(request: ReasonerTurnRequest): ReasonerTurnResponse {
  const observation = (request as unknown as Record<string, unknown>)['observation'];
  const facts = decodeEnvelopes(observation);
  const memory = readMemoryView(observation);
  const allowedToolIds = isRecord(observation) ? stringList(observation['allowedToolIds']) : [];
  const canInspect = allowedToolIds.includes('INSPECT_SOURCE_SURFACE');
  const canReproduce = allowedToolIds.includes('RERUN_SAFE_REPRODUCTION');
  const canPropose = allowedToolIds.includes('REQUEST_FINDING_PROPOSAL');

  const inspectedTargets = memory.inspected.map((entry) => entry.target);
  // The current turn's SOURCE_FILE envelope proves an inspection happened,
  // but carries no evidence ref, so it can never ground a reproduction.
  if (facts.readPath !== null && !inspectedTargets.includes(facts.readPath)) {
    inspectedTargets.push(facts.readPath);
  }
  const knownTargets: string[] = [...memory.uninspected];
  for (const path of facts.indexPaths) if (!knownTargets.includes(path)) knownTargets.push(path);
  for (const target of inspectedTargets) if (!knownTargets.includes(target)) knownTargets.push(target);
  const uninspected = knownTargets.filter((target) => !inspectedTargets.includes(target));

  const response = (intents: readonly AgentIntent[], hypotheses: ReasonerTurnResponse['hypotheses'] = []): ReasonerTurnResponse => ({
    schemaVersion: REASONER_TURN_RESPONSE_VERSION,
    intents: Object.freeze([...intents]),
    hypotheses: Object.freeze([...hypotheses]),
  });

  // 1. No knowledge of any approved target: ask for the bounded index.
  if (knownTargets.length === 0) {
    if (!canInspect) return response([{ kind: 'TERMINATE', reason: 'COMPLETE_NO_FINDING' }]);
    return response([callTool('INSPECT_SOURCE_SURFACE', {})]);
  }

  // 2. An unexplored approved target exists: inspect it.
  if (uninspected.length > 0) {
    if (!canInspect) return response([{ kind: 'TERMINATE', reason: 'COMPLETE_NO_FINDING' }]);
    return response([callTool('INSPECT_SOURCE_SURFACE', { path: uninspected[0] })]);
  }

  // 3. Everything known is inspected. Progress along the verification ladder,
  //    using only explicitly paired grounding.
  //
  //    ORDER MATTERS. Admission comes first, then verification of the current
  //    grounded hypothesis, and only then a new hypothesis. An investigator
  //    that keeps enumerating targets after it already reproduced a defect is
  //    wasting budget, and one that generates every hypothesis before testing
  //    any wastes the turns it needs to reach admission. This ordering is
  //    identical in both modes; the W7 baseline never reaches step 3 at all
  //    because it can never pair a target with its evidence ref.
  const groundable = memory.inspected.filter((entry) => entry.evidenceRef !== null);
  const reproducedEntry = groundable.find((entry) => memory.reproducedTargets.includes(entry.target)) ?? null;

  // 3a. A mechanically reproduced target with no captured proposal: capture one.
  if (
    reproducedEntry !== null &&
    canPropose &&
    !memory.proposalCandidateIds.includes('sim-c-1') &&
    !facts.proposalCaptured
  ) {
    const ref = reproducedEntry.evidenceRef as string;
    return response([
      callTool('REQUEST_FINDING_PROPOSAL', {
        candidateId: 'sim-c-1',
        evidenceRefs: [ref],
        draft: {
          title: bounded(`Suspected defect in ${reproducedEntry.target}`),
          description: bounded(
            `Deterministic reproduction of the reported symptom is grounded in ${reproducedEntry.target}`,
          ),
          recommendedSeverity: 'S3',
          severityConfidence: 'MEDIUM',
          severityRationale: 'Mechanically reproduced through the deterministic local provider',
          confidence: 'MEDIUM',
          alternativeHypotheses: [],
        },
      }),
    ]);
  }

  // 3b. Proposal captured: propose the candidate on observed evidence only.
  if (reproducedEntry !== null && (facts.proposalCaptured || memory.proposalCandidateIds.includes('sim-c-1'))) {
    if (!memory.candidateIds.includes('sim-c-1')) {
      return response([
        { kind: 'PROPOSE_CANDIDATE', candidateId: 'sim-c-1', evidenceRefs: [reproducedEntry.evidenceRef as string] },
      ]);
    }
    return response([{ kind: 'TERMINATE', reason: 'COMPLETE_WITH_FINDING' }]);
  }

  // 3c. Verify the strongest grounded, non-disproved hypothesis whose target
  //     has no reproduction attempt yet, before inventing another hypothesis.
  if (canReproduce) {
    for (const entry of groundable) {
      const ref = entry.evidenceRef as string;
      const hypothesis = memory.hypotheses.find(
        (item) => item.evidenceRefs.includes(ref) && item.status !== 'DISPROVED',
      );
      if (hypothesis === undefined) continue;
      if (memory.attemptedReproductionTargets.includes(entry.target)) continue;
      return response([
        callTool('RERUN_SAFE_REPRODUCTION', {
          reproductionId: `sim-r-${memory.attemptedReproductionTargets.length + 1}`,
          candidateId: 'sim-c-1',
          sourcePath: entry.target,
          sourceEvidenceRef: ref,
          observedEvidenceRefs: [ref],
        }),
      ]);
    }
  }

  // 3d. Ground a new hypothesis on an inspected target that has none yet.
  //     The statement cites the salient symbols the host carried for that
  //     target. They were extracted deterministically from the pre-fix VISIBLE
  //     source already delivered for it, never from hidden truth, so a
  //     stateless turn can name WHAT it observed instead of emitting a generic
  //     placeholder. The W7 baseline carries no memory and therefore no
  //     salient symbols.
  for (const entry of groundable) {
    const ref = entry.evidenceRef as string;
    const covered = memory.hypotheses.some((item) => item.evidenceRefs.includes(ref));
    if (covered) continue;
    const hypothesisId = `sim-h-${memory.hypotheses.length + 1}`;
    const observed = entry.salient.filter((symbol) => symbol.length > 0).slice(0, 4);
    const detail =
      observed.length > 0
        ? `${entry.target} (observed ${observed.join(', ')}): inspected source surface is the suspected defect site for the reported symptom`
        : `${entry.target}: inspected source surface is the suspected defect site for the reported symptom`;
    return response([
      {
        kind: 'FORM_HYPOTHESIS',
        hypothesisId,
        statement: bounded(detail),
        evidenceRefs: [ref],
      },
    ]);
  }

  // 4. Nothing left to explore and nothing reproducible: stop honestly.
  return response([{ kind: 'TERMINATE', reason: 'COMPLETE_NO_FINDING' }]);
}

export interface SimulatedInvestigatorOptions {
  readonly mode: EfficacyContextMode;
  readonly model?: string;
}

/**
 * Build a stateless simulated investigator. In `W7_BASELINE` mode every
 * request is projected down to the frozen W7 field set before the policy sees
 * it, so the baseline cannot read post-W7 state.
 */
export function createSimulatedInvestigatorDriver(options: SimulatedInvestigatorOptions): ReasonerDriver & {
  readonly seenRequests: readonly ReasonerTurnRequest[];
} {
  const seenRequests: ReasonerTurnRequest[] = [];
  const provenance: ReasonerProvenance = {
    transport: 'CLI',
    executableBasename: SIMULATED_INVESTIGATOR_ID,
    provider: 'nightwatch-efficacy-harness',
    model: options.model ?? `simulated-investigator/${options.mode}`,
  };
  return {
    protocolVersion: REASONER_DRIVER_VERSION,
    transport: 'CLI',
    provenance,
    seenRequests,
    async complete(request: ReasonerTurnRequest, _options: ReasonerCallOptions): Promise<ReasonerCallResult> {
      void _options;
      const visible = options.mode === 'W7_BASELINE' ? projectRequestToW7(request) : request;
      seenRequests.push(visible);
      const response = decideInvestigatorTurn(visible);
      const serialized = JSON.stringify(response);
      return {
        ok: true,
        response,
        provenance,
        stdoutBytes: Buffer.byteLength(serialized, 'utf8'),
        stderrBytes: 0,
      };
    },
  };
}
