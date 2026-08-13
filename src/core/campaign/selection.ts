// ---------------------------------------------------------------------------
// Phase 7 deterministic selection and Phase 3/4/5 lineage expansion.
// ---------------------------------------------------------------------------

import {
  RIPPLE_JOURNEY_IDS,
  type JourneyId,
  type SelectedJourney,
  type SelectionResult,
} from '../changeIntelligence/types';
import { validateSafeActionCatalog } from '../exploration/catalog';
import type { SafeAction } from '../exploration/types';
import type { ApiOperation } from '../../api/phase5/types';
import type {
  CampaignInput,
  CampaignMode,
  CampaignSelectionExplanation,
  CampaignSelectionResult,
  CampaignWorkItem,
} from './types';
import { isInitialRealCampaignBudget } from './budget';

const JOURNEY_ORDER: readonly JourneyId[] = [...RIPPLE_JOURNEY_IDS];

const ENVELOPE_BY_JOURNEY: Readonly<Record<JourneyId, string>> = {
  'ripple-payer-exchange-read': 'E1-J1-payer-exchange',
  'ripple-common-exchange-read': 'E2-J2-common-exchange',
  'ripple-account-inventory': 'E3-J3-account-inventory',
};

const API_BY_JOURNEY: Readonly<Record<JourneyId, readonly string[]>> = {
  'ripple-payer-exchange-read': ['ripple.payer-exchange.read'],
  'ripple-common-exchange-read': ['ripple.common-exchange.read'],
  'ripple-account-inventory': ['ripple.account-inventory.read'],
};

const DEFAULT_SEEDS: readonly string[] = [
  '0x0000000000000101',
  '0x0000000000000201',
  '0x0000000000000301',
];

function journeyRank(journeyId: JourneyId): number {
  return JOURNEY_ORDER.indexOf(journeyId);
}

function safeId(value: string, label: string): void {
  if (!/^[A-Za-z0-9_.:/-]{1,200}$/.test(value)) throw new Error(`CAMPAIGN_${label}_INVALID`);
}

function nonSelectedFromPhase3(selection: SelectionResult | null, selected: readonly JourneyId[]): CampaignSelectionResult['nonSelectedJourneys'] {
  if (selection !== null) {
    return selection.nonSelectedJourneys.map((item) => ({ journeyId: item.journeyId, reason: item.reason, reasonCode: item.reasonCode }));
  }
  const selectedSet = new Set(selected);
  return JOURNEY_ORDER.filter((journeyId) => !selectedSet.has(journeyId)).map((journeyId) => ({
    journeyId,
    reason: 'Not selected by the explicit campaign mode.',
    reasonCode: 'MODE_NOT_SELECTED',
  }));
}

function sourceImpactFor(journey: SelectedJourney | undefined, mode: CampaignMode): string {
  if (mode === 'BASELINE_HEALTH') return 'BASELINE_HEALTH_TRUSTED_CANARY';
  if (mode === 'COVERAGE_EXPANSION') return 'UNDER_EXERCISED_SAFE_COVERAGE';
  if (mode === 'LOCAL_SYNTHETIC') return 'SYNTHETIC_FIXTURE_MATRIX';
  if (mode === 'REPRODUCTION_ONLY') return 'ADMITTED_ANOMALY_REPRODUCTION';
  return journey?.reasons[0]?.impactClass ?? 'UNKNOWN_IMPACT';
}

function explanationFor(input: {
  readonly selected: boolean;
  readonly mode: CampaignMode;
  readonly journeyId?: JourneyId;
  readonly selectedJourney?: SelectedJourney;
  readonly envelopeId?: string;
  readonly apiOperationId?: string;
  readonly reason?: string;
}): CampaignSelectionExplanation {
  const selectedJourney = input.selectedJourney;
  return {
    selected: input.selected,
    reason: input.reason ?? (input.selected ? 'Selected by the frozen campaign mode and explicit lineage.' : 'Not selected by the frozen campaign mode.'),
    sourceImpact: sourceImpactFor(selectedJourney, input.mode),
    confidence: selectedJourney?.confidence ?? (input.mode === 'BASELINE_HEALTH' ? 'HIGH' : 'UNRESOLVED'),
    riskClass: selectedJourney?.riskClasses[0] ?? (input.mode === 'BASELINE_HEALTH' ? 'TRUSTED_CANARY' : 'NONE'),
    linkedJourneyId: input.journeyId ?? null,
    linkedEnvelopeId: input.envelopeId ?? null,
    linkedApiOperationId: input.apiOperationId ?? null,
  };
}

function selectedJourneyEntries(input: CampaignInput): readonly SelectedJourney[] {
  if (input.mode === 'BASELINE_HEALTH' || input.mode === 'COVERAGE_EXPANSION' || input.mode === 'LOCAL_SYNTHETIC') {
    return JOURNEY_ORDER.map((journeyId) => ({
      journeyId,
      priorityTier: 'P1',
      confidence: 'HIGH',
      riskClasses: ['DATA_FETCH'],
      reasons: [],
    }));
  }
  if (input.mode === 'REPRODUCTION_ONLY') return [];
  if (input.phase3Selection === null) throw new Error('CAMPAIGN_CHANGE_SELECTION_MISSING');
  return [...input.phase3Selection.selectedJourneys].sort((a, b) => {
    const priority = a.priorityTier.localeCompare(b.priorityTier);
    return priority || journeyRank(a.journeyId) - journeyRank(b.journeyId);
  });
}

function selectedSeeds(input: CampaignInput, selectedJourneys: readonly JourneyId[]): string[] {
  if (input.mode === 'REPRODUCTION_ONLY') return [];
  const source = input.seedSet.length > 0 ? [...input.seedSet] : [...DEFAULT_SEEDS];
  return selectedJourneys.map((_, index) => source[index % source.length]!).filter((seed, index, all) => all.indexOf(seed) === index);
}

function findApiOperation(operations: readonly ApiOperation[], operationId: string): ApiOperation {
  const operation = operations.find((candidate) => candidate.operationId === operationId);
  if (operation === undefined) throw new Error(`CAMPAIGN_API_OPERATION_MISSING:${operationId}`);
  if (operation.semanticClass !== 'KNOWN_READ' || operation.generationStatus !== 'GENERATION_ELIGIBLE' || operation.replayPolicy === 'NEVER') {
    throw new Error(`CAMPAIGN_API_OPERATION_UNSAFE:${operationId}`);
  }
  return operation;
}

function actionIdsForEnvelope(actions: readonly SafeAction[], envelopeId: string, allowedActionIds: readonly string[]): readonly string[] {
  const allowed = new Set(allowedActionIds);
  return actions
    .filter((action) => allowed.has(action.actionId))
    .map((action) => action.actionId)
    .sort();
}

export interface CampaignSelectionBuild {
  readonly result: CampaignSelectionResult;
  readonly workItems: readonly CampaignWorkItem[];
}

export function buildCampaignSelection(input: CampaignInput): CampaignSelectionBuild {
  const selectedEntries = selectedJourneyEntries(input);
  const selectedJourneys = selectedEntries.map((item) => item.journeyId);
  const selectedSet = new Set(selectedJourneys);
  const seeds = selectedSeeds(input, selectedJourneys);
  const explanations: Array<CampaignSelectionResult['explanations'][number]> = [];
  const journeyWork: CampaignWorkItem[] = [];
  const apiWork: CampaignWorkItem[] = [];
  const explorationWork: CampaignWorkItem[] = [];
  const reproductionWork: CampaignWorkItem[] = [];
  const boundedRealProfile = isInitialRealCampaignBudget(input.budgetPolicy);
  const selectedApiOperationIds = new Set<string>();
  if (input.mode !== 'REPRODUCTION_ONLY') {
    const apiReplayReserve = boundedRealProfile && input.budgetPolicy.maxPromotedClusters > 0 ? 1 : 0;
    let apiCost = 0;
    for (const selectedJourney of selectedEntries) {
      for (const operationId of API_BY_JOURNEY[selectedJourney.journeyId] ?? []) {
        const operation = findApiOperation(input.apiOperations, operationId);
        const cost = operation.replayPolicy === 'FIRST_PLUS_FRESH_REPLAY' ? 2 : 1;
        if (!boundedRealProfile || apiCost + cost <= input.budgetPolicy.maxApiExecutions - apiReplayReserve) {
          selectedApiOperationIds.add(operationId);
          apiCost += cost;
        }
      }
    }
  }

  if (input.mode !== 'REPRODUCTION_ONLY') {
    for (const selectedJourney of selectedEntries) {
      const journeyId = selectedJourney.journeyId;
      const envelopeId = ENVELOPE_BY_JOURNEY[journeyId];
      const explanation = explanationFor({
        selected: true,
        mode: input.mode,
        journeyId,
        selectedJourney,
        envelopeId,
        reason: input.mode === 'CHANGE_DIRECTED'
          ? `Phase 3 selected ${journeyId}; execute the trusted canary before linked coverage.`
          : undefined,
      });
      const journeyWorkItemId = `journey:${journeyId}`;
      journeyWork.push({
        workItemId: journeyWorkItemId,
        kind: 'JOURNEY',
        order: 0,
        journeyId,
        envelopeId: null,
        apiOperationId: null,
        seed: null,
        linkedWorkItemIds: [],
        replayPolicy: 'ON_ADMISSION',
        selection: explanation,
      });
      explanations.push({ workItemKey: journeyWorkItemId, explanation });

      const linkedApiIds = API_BY_JOURNEY[journeyId] ?? [];
      for (const operationId of linkedApiIds) {
        const operation = findApiOperation(input.apiOperations, operationId);
        if (!selectedApiOperationIds.has(operationId)) {
          explanations.push({
            workItemKey: `api:${operationId}`,
            explanation: explanationFor({ selected: false, mode: input.mode, journeyId, selectedJourney, apiOperationId: operationId, reason: 'Omitted before freeze to reserve one bounded API reproduction execution.' }),
          });
          continue;
        }
        const apiExplanation = explanationFor({ selected: true, mode: input.mode, journeyId, selectedJourney, apiOperationId: operationId, reason: `Explicit Phase 5 lineage from ${journeyId}; no API-only expansion.` });
        const apiWorkItemId = `api:${operationId}`;
        apiWork.push({
          workItemId: apiWorkItemId,
          kind: 'API',
          order: 0,
          journeyId,
          envelopeId: null,
          apiOperationId: operation.operationId,
          seed: null,
          linkedWorkItemIds: [journeyWorkItemId],
          replayPolicy: operation.replayPolicy === 'FIRST_PLUS_FRESH_REPLAY' ? 'FIRST_PLUS_FRESH_REPLAY' : 'NONE',
          selection: apiExplanation,
        });
        explanations.push({ workItemKey: apiWorkItemId, explanation: apiExplanation });
      }

      if (input.mode === 'BASELINE_HEALTH' || input.mode === 'COVERAGE_EXPANSION' || input.mode === 'LOCAL_SYNTHETIC' || input.mode === 'CHANGE_DIRECTED') {
        const seed = seeds[journeyRank(journeyId)] ?? DEFAULT_SEEDS[journeyRank(journeyId)]!;
        if (boundedRealProfile && input.budgetPolicy.maxExplorationContexts === 0) {
          explanations.push({
            workItemKey: `explore:${ENVELOPE_BY_JOURNEY[journeyId]}:${seed}`,
            explanation: explanationFor({ selected: false, mode: input.mode, journeyId, selectedJourney, envelopeId: ENVELOPE_BY_JOURNEY[journeyId], reason: 'Omitted before freeze to reserve browser capacity for qualifying reproduction.' }),
          });
          continue;
        }
        const envelope = input.explorationEnvelopes.find((candidate) => candidate.envelopeId === envelopeId);
        if (envelope === undefined) throw new Error(`CAMPAIGN_ENVELOPE_MISSING:${envelopeId}`);
        const envelopeActions = actionIdsForEnvelope(input.safeActions, envelopeId, envelope.allowedActionIds);
        if (envelopeActions.length === 0) throw new Error(`CAMPAIGN_ENVELOPE_ACTIONS_MISSING:${envelopeId}`);
        const explorationExplanation = explanationFor({ selected: true, mode: input.mode, journeyId, selectedJourney, envelopeId, reason: input.mode === 'COVERAGE_EXPANSION' ? 'Selected from the existing safe envelope for under-exercised coverage.' : 'Explicit Phase 4 lineage from the selected trusted journey.' });
        const explorationWorkItemId = `explore:${envelopeId}:${seed}`;
        explorationWork.push({
          workItemId: explorationWorkItemId,
          kind: 'EXPLORATION',
          order: 0,
          journeyId,
          envelopeId: envelope.envelopeId,
          apiOperationId: null,
          seed,
          linkedWorkItemIds: [journeyWorkItemId, ...apiWork.filter((item) => item.journeyId === journeyId).map((item) => item.workItemId)],
          replayPolicy: 'ON_ADMISSION',
          selection: { ...explorationExplanation, sourceImpact: `${explorationExplanation.sourceImpact}; safeActions=${envelopeActions.length}` },
        });
        explanations.push({ workItemKey: explorationWorkItemId, explanation: explorationExplanation });
      }
    }
  } else if (input.reproductionTarget !== undefined) {
    const target = input.reproductionTarget;
    const candidate = target.candidate;
    const journeyId = candidate.journeyId;
    const envelopeId = candidate.observation.features.envelopeId;
    const apiOperationId = candidate.api?.operationFamily ?? null;
    const reproductionExplanation = explanationFor({
      selected: true,
      mode: input.mode,
      journeyId: journeyId ?? undefined,
      envelopeId: envelopeId ?? undefined,
      apiOperationId: apiOperationId ?? undefined,
      reason: `Reproduce admitted private cluster ${target.clusterId}; no new exploration or API discovery is selected.`,
    });
    reproductionWork.push({
      workItemId: `reproduction:${target.clusterId}`,
      kind: 'REPRODUCTION',
      order: 0,
      journeyId,
      envelopeId,
      apiOperationId,
      seed: envelopeId,
      linkedWorkItemIds: [],
      replayPolicy: 'ON_ADMISSION',
      selection: reproductionExplanation,
    });
    explanations.push({ workItemKey: `reproduction:${target.clusterId}`, explanation: reproductionExplanation });
  }

  const ordered = [...journeyWork, ...apiWork, ...explorationWork, ...reproductionWork]
    .sort((a, b) => {
      const kindRank: Record<CampaignWorkItem['kind'], number> = { JOURNEY: 0, API: 1, EXPLORATION: 2, REPRODUCTION: 3, MINIMIZATION: 4 };
      const aJourneyRank = a.journeyId === null ? 99 : journeyRank(a.journeyId);
      const bJourneyRank = b.journeyId === null ? 99 : journeyRank(b.journeyId);
      return kindRank[a.kind] - kindRank[b.kind] || aJourneyRank - bJourneyRank || a.workItemId.localeCompare(b.workItemId);
    })
    .map((item, order) => ({ ...item, order }));

  const nonSelected = nonSelectedFromPhase3(input.phase3Selection, selectedJourneys);
  for (const item of nonSelected) {
    if (!selectedSet.has(item.journeyId)) {
      explanations.push({
        workItemKey: `journey:${item.journeyId}`,
        explanation: explanationFor({ selected: false, mode: input.mode, journeyId: item.journeyId, reason: item.reason }),
      });
    }
  }
  if (input.mode === 'REPRODUCTION_ONLY') {
    const explanationKeys = new Set(explanations.map((entry) => entry.workItemKey));
    for (const journeyId of JOURNEY_ORDER) {
      if (!explanationKeys.has(`journey:${journeyId}`)) {
        explanations.push({ workItemKey: `journey:${journeyId}`, explanation: explanationFor({ selected: false, mode: input.mode, journeyId, reason: 'REPRODUCTION_ONLY does not select new journey coverage.' }) });
      }
    }
  }

  const result: CampaignSelectionResult = {
    mode: input.mode,
    phase3: input.phase3Selection,
    selectedJourneys,
    selectedEnvelopes: [...new Set(ordered.filter((item) => item.kind === 'EXPLORATION').map((item) => item.envelopeId).filter((value): value is string => value !== null))],
    selectedApiScenarios: [...new Set(ordered.filter((item) => item.kind === 'API').map((item) => item.apiOperationId).filter((value): value is string => value !== null))],
    selectedSeeds: [...new Set(ordered.filter((item) => item.kind === 'EXPLORATION').map((item) => item.seed).filter((value): value is string => value !== null))],
    explanations: [...explanations].sort((a, b) => a.workItemKey.localeCompare(b.workItemKey)),
    nonSelectedJourneys: nonSelected,
    fallbackTriggered: input.phase3Selection?.fallbackTriggered ?? false,
    zeroSelectionJustified: input.phase3Selection?.zeroSelectionJustified ?? ordered.length === 0,
  };
  return { result, workItems: ordered };
}

export function validateCampaignInputs(input: CampaignInput): void {
  const validModes: readonly CampaignMode[] = ['CHANGE_DIRECTED', 'BASELINE_HEALTH', 'COVERAGE_EXPANSION', 'REPRODUCTION_ONLY', 'LOCAL_SYNTHETIC'];
  if (!validModes.includes(input.mode)) throw new Error('CAMPAIGN_MODE_INVALID');
  if (Number.isNaN(Date.parse(input.createdAt))) throw new Error('CAMPAIGN_CREATED_AT_INVALID');
  if (!/^[A-Za-z0-9_.:/-]{1,160}$/.test(input.seedCorpusVersion)) throw new Error('CAMPAIGN_SEED_CORPUS_INVALID');
  for (const seed of input.seedSet) if (!/^0x[0-9a-f]{16}$/.test(seed)) throw new Error(`CAMPAIGN_SEED_INVALID:${seed}`);
  validateSafeActionCatalog(input.safeActions);
  const actionIds = new Set(input.safeActions.filter((action) => action.status === 'APPROVED').map((action) => action.actionId));
  for (const envelope of input.explorationEnvelopes) {
    safeId(envelope.envelopeId, 'ENVELOPE');
    if (envelope.allowedActionIds.some((actionId) => !actionIds.has(actionId))) throw new Error(`CAMPAIGN_ENVELOPE_ACTION_UNAPPROVED:${envelope.envelopeId}`);
  }
  for (const operation of input.apiOperations) {
    safeId(operation.operationId, 'API_OPERATION');
    if (operation.semanticClass === 'KNOWN_MUTATION' && operation.generationStatus === 'GENERATION_ELIGIBLE') throw new Error(`CAMPAIGN_MUTATION_CATALOG_INCONSISTENT:${operation.operationId}`);
  }
  if (input.mode === 'CHANGE_DIRECTED' && input.phase3Selection === null) throw new Error('CAMPAIGN_CHANGE_SELECTION_MISSING');
  if (input.mode === 'REPRODUCTION_ONLY' && input.reproductionTarget === undefined) throw new Error('CAMPAIGN_REPRODUCTION_TARGET_MISSING');
  if (input.mode !== 'REPRODUCTION_ONLY' && input.reproductionTarget !== undefined) throw new Error('CAMPAIGN_REPRODUCTION_TARGET_MODE_INVALID');
  if (input.mode !== 'REPRODUCTION_ONLY' && input.sourceSnapshots.some((snapshot) => snapshot.readOnly !== true)) throw new Error('CAMPAIGN_SOURCE_READONLY_INVALID');
  const budget = input.budgetPolicy;
  const numeric = [budget.maxTotalBrowserContexts, budget.maxJourneyContexts, budget.maxExplorationContexts, budget.maxApiExecutions, budget.maxReplays, budget.maxMinimizationCandidates, budget.maxTotalActions, budget.maxRuntimeMs, budget.maxPerTestTimeoutMs, budget.maxPromotedClusters, budget.maxPrivateEvidenceBytes];
  if (numeric.some((value) => !Number.isInteger(value) || value < 0)) throw new Error('CAMPAIGN_BUDGET_INVALID');
  if (budget.maxJourneyContexts + budget.maxExplorationContexts > budget.maxTotalBrowserContexts) throw new Error('CAMPAIGN_BROWSER_BUDGET_INVALID');
  if (budget.maxRuntimeMs === 0 || budget.maxPerTestTimeoutMs === 0 || budget.maxPromotedClusters === 0) throw new Error('CAMPAIGN_BUDGET_ZERO_INVALID');
}

export function phase3SelectionForBaseline(): null {
  return null;
}
