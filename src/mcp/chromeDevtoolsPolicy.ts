// ---------------------------------------------------------------------------
// Chrome DevTools MCP policy record.
//
// MCP is an optional observation channel. It is never a Nightwatch safety
// authority and it never receives credential-bearing tool arguments.
// ---------------------------------------------------------------------------

export const CHROME_DEVTOOLS_MCP_SERVER = 'mcp__chrome_devtools' as const;

export const CHROME_DEVTOOLS_MCP_TOOLS = [
  'click',
  'close_page',
  'drag',
  'emulate',
  'evaluate_script',
  'fill',
  'fill_form',
  'get_console_message',
  'get_network_request',
  'handle_dialog',
  'hover',
  'lighthouse_audit',
  'list_console_messages',
  'list_network_requests',
  'list_pages',
  'navigate_page',
  'new_page',
  'performance_analyze_insight',
  'performance_start_trace',
  'performance_stop_trace',
  'press_key',
  'resize_page',
  'select_page',
  'take_heapsnapshot',
  'take_screenshot',
  'take_snapshot',
  'type_text',
  'upload_file',
  'wait_for',
] as const;

export const CHROME_DEVTOOLS_MCP_TOOL_COUNT = 29 as const;
export const MCP_SECRET_INPUT_ALLOWED = false as const;
export const MCP_OBSERVATION_STATUS = 'CHROME_DEVTOOLS_MCP_AVAILABLE_BUT_NOT_ATTACHED' as const;
export const MCP_REAL_BROWSER_DISABLED_BY_SAFETY = 'MCP_REAL_BROWSER_DISABLED_BY_SAFETY' as const;

export const MCP_PROHIBITED_AUTHENTICATED_REAL_TOOLS = [
  'fill',
  'fill_form',
  'type_text',
  'take_heapsnapshot',
  'take_screenshot',
  'take_snapshot',
  'get_network_request',
] as const;

export interface McpAttachmentFacts {
  dedicatedNightwatchProfile: boolean;
  loopbackOnly: boolean;
  nightwatchOwnsBrowserLifecycle: boolean;
  mandatoryProxyActive: boolean;
  productionDenyActive: boolean;
  unknownHostContainmentActive: boolean;
  websocketContainmentActive: boolean;
  authenticatedPrivacyPolicyActive: boolean;
  primaryExecutorRemainsNightwatch: boolean;
}

export interface McpAttachmentDecision {
  attached: false;
  containmentProven: boolean;
  status: typeof MCP_OBSERVATION_STATUS;
  reason: typeof MCP_REAL_BROWSER_DISABLED_BY_SAFETY;
  credentialInputAllowed: false;
}

/**
 * Real authenticated attachment is opt-in only after every containment fact
 * is proven. The current architecture intentionally returns disabled until a
 * dedicated Nightwatch-owned CDP launcher supplies those facts.
 */
export function decideMcpAttachment(facts: McpAttachmentFacts): McpAttachmentDecision {
  const containmentProven = Object.values(facts).every(Boolean);
  return {
    attached: false,
    containmentProven,
    status: MCP_OBSERVATION_STATUS,
    reason: MCP_REAL_BROWSER_DISABLED_BY_SAFETY,
    credentialInputAllowed: false,
  };
}

export function mcpDiscoveryIsConsistent(): boolean {
  return CHROME_DEVTOOLS_MCP_TOOLS.length === CHROME_DEVTOOLS_MCP_TOOL_COUNT;
}
