// ---------------------------------------------------------------------------
// C-12 offline rehearsal: local mock subject and mock network.
//
// The mock subject is an already-existing local event stream: pre-existing
// operator traffic, ongoing application polling, browser subresources,
// service-worker traffic, and irrelevant traffic. The mock network is the
// scripted poll queue below — no sockets, no browser, no fetch. Hosts use
// `.invalid` names that can never resolve; nonces and SHAs are fixed
// obviously-fake values.
//
// The LOCAL_FIXTURE_HOST guard is load-bearing: the runner refuses any
// admitted host outside the synthetic fixture namespace, so a rehearsal can
// never be retargeted at a real host by configuration drift.
// ---------------------------------------------------------------------------

import type { ObservedRequestEvidence } from '../prodObserveP1/attribution';
import type { P1ObservationEventSource } from '../prodObserveP1/session';
import type { C12RehearsalScenario } from './types';

/** The only host namespace a rehearsal may admit. Never a real host. */
export const LOCAL_FIXTURE_HOST = 'c12-rehearsal-subject.invalid' as const;

/** Opaque operator-supplied nonce for the mock subject. Never a credential. */
export const LOCAL_FIXTURE_NONCE = 'synthetic-c12-rehearsal-subject-001' as const;

/** Synthetic evidence destination: a label, not a path. The rehearsal writes no files. */
export const LOCAL_FIXTURE_EVIDENCE_DESTINATION = 'synthetic:local-evidence-store' as const;

export function isLocalFixtureHost(host: string): boolean {
  return host === LOCAL_FIXTURE_HOST;
}

function preExisting(requestId: string): ObservedRequestEvidence {
  return { requestId, observedAfterAttach: false, preAttachProof: true, nightwatchCausalLink: false, initiator: 'navigation' };
}

function application(requestId: string, initiator: string): ObservedRequestEvidence {
  return { requestId, observedAfterAttach: true, preAttachProof: false, nightwatchCausalLink: false, initiator };
}

function nightwatchTriggered(requestId: string): ObservedRequestEvidence {
  return { requestId, observedAfterAttach: true, preAttachProof: false, nightwatchCausalLink: true, initiator: 'scripted-trigger' };
}

function ambiguous(requestId: string): ObservedRequestEvidence {
  return { requestId, observedAfterAttach: true, preAttachProof: false, nightwatchCausalLink: false, initiator: null };
}

/**
 * Scripted traffic per scenario. The CLEAN mix exercises every
 * non-Nightwatch attribution class the matrix requires: operator-preexisting,
 * application polling, browser subresource, service-worker, irrelevant.
 */
export function rehearsalScenarioEvents(scenario: C12RehearsalScenario): readonly ObservedRequestEvidence[] {
  const clean: ObservedRequestEvidence[] = [
    preExisting('req-preexisting-001'),
    preExisting('req-preexisting-002'),
    application('req-poll-001', 'polling'),
    application('req-poll-002', 'polling'),
    application('req-subresource-001', 'subresource'),
    application('req-worker-001', 'service-worker'),
    application('req-irrelevant-001', 'other'),
  ];
  switch (scenario) {
    case 'CLEAN_PASSIVE':
      return clean;
    case 'WITH_NIGHTWATCH_TRAFFIC':
      return [...clean, nightwatchTriggered('req-nightwatch-001')];
    case 'WITH_UNKNOWN_ATTRIBUTION':
      return [...clean, ambiguous('req-ambiguous-001')];
    case 'ZERO_QUALIFYING_EVENTS':
      return [];
    case 'KILL_SWITCH_ENGAGED':
      return clean;
    default: {
      // Static code: never echo the offending value into an error message.
      throw new Error('C12_REHEARSAL_UNKNOWN_SCENARIO');
    }
  }
}

/** Bounded scripted source: drains the scenario queue two events per poll, then ends. */
export function createMockEventSource(scenario: C12RehearsalScenario): P1ObservationEventSource {
  const queue = [...rehearsalScenarioEvents(scenario)];
  return {
    poll: () => {
      const events = queue.splice(0, 2);
      return { events, sourceEnded: queue.length === 0 };
    },
  };
}
