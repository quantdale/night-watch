// ---------------------------------------------------------------------------
// Lane C — Safe Agent Tool Protocol: public surface.
// ---------------------------------------------------------------------------

export type {
  AgentToolCallIntent,
  AgentToolExecutionContext,
  AgentToolFailure,
  AgentToolFailureClass,
  AgentToolFixtures,
  AgentToolResult,
  AgentToolSuccess,
  SourceSurfaceFixture,
} from './types';
export {
  SANITIZED_PLACEHOLDER,
  evidenceRefFor,
  sanitizeJsonText,
  scanForInjection,
  wrapUntrusted,
} from './sanitize';
export { AGENT_TOOL_RUNTIME_VERSION, executeAgentTool } from './runtime';
