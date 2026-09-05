// ---------------------------------------------------------------------------
// C-12 P1 offline rehearsal on the production-intended safety core.
// Local mock edges only; synthetic fixtures only; never live authorization.
// ---------------------------------------------------------------------------

export {
  C12_REHEARSAL_CONFIG_VERSION,
  C12_REHEARSAL_RECEIPT_VERSION,
  C12_REHEARSAL_SCENARIOS,
  C12_REHEARSAL_STATES,
  type C12LiveReadiness,
  type C12RehearsalInput,
  type C12RehearsalReceipt,
  type C12RehearsalScenario,
  type C12RehearsalState,
} from './types';
export {
  createMockEventSource,
  isLocalFixtureHost,
  LOCAL_FIXTURE_EVIDENCE_DESTINATION,
  LOCAL_FIXTURE_HOST,
  LOCAL_FIXTURE_NONCE,
  rehearsalScenarioEvents,
} from './mockSubject';
export { c12LiveReadiness, runC12LocalRehearsal, type RehearsalRunOptions } from './rehearsal';
