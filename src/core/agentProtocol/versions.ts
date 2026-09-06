// ---------------------------------------------------------------------------
// Nightwatch autonomous-agent protocol versions.
//
// Wave 0 freeze. Lanes implement against these identities; they do not
// redefine them. Pure data: no fs/network/child_process/AI/browser authority.
// ---------------------------------------------------------------------------

export const AGENT_PROTOCOL_VERSION = 'nightwatch.agent-protocol.v1' as const;
export const REASONER_DRIVER_VERSION = 'nightwatch.reasoner-driver.v1' as const;
export const REASONER_TURN_REQUEST_VERSION = 'nightwatch.reasoner-turn-request.v1' as const;
export const REASONER_TURN_RESPONSE_VERSION = 'nightwatch.reasoner-turn-response.v1' as const;
export const AGENT_TOOL_PROTOCOL_VERSION = 'nightwatch.agent-tool-protocol.v1' as const;
export const AGENT_RUNTIME_STATE_VERSION = 'nightwatch.agent-runtime-state.v1' as const;
export const AGENT_CHECKPOINT_VERSION = 'nightwatch.agent-checkpoint.v1' as const;
export const AGENT_BUDGET_VERSION = 'nightwatch.agent-budget.v1' as const;
export const BUG_ATLAS_RECORD_VERSION = 'nightwatch.bug-atlas-record.v1' as const;
export const SYSTEM_ATLAS_RECORD_VERSION = 'nightwatch.system-atlas-record.v1' as const;
export const ATLAS_QUERY_VERSION = 'nightwatch.atlas-query.v1' as const;
export const BENCHMARK_CASE_VERSION = 'nightwatch.historical-benchmark-case.v1' as const;
export const AUTONOMOUS_FINDING_VERSION = 'nightwatch.autonomous-finding-dossier.v1' as const;
export const UNTRUSTED_ENVELOPE_VERSION = 'nightwatch.untrusted-envelope.v1' as const;
