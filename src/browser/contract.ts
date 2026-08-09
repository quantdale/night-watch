// ---------------------------------------------------------------------------
// Nightwatch — browser containment contract (Phase 2A).
//
// The Playwright config and the pre-real-run gate share these declarations.
// Keeping the required launch arguments in one place prevents a gate from
// claiming that Chromium is contained while the actual project configuration
// silently drops a transport restriction.
// ---------------------------------------------------------------------------

export interface BrowserContainmentContract {
  proxyMandatory: boolean;
  browserGuardsEnabled: boolean;
  serviceWorkersBlocked: boolean;
  sharedWorkersBlocked: boolean;
  quicDisabled: boolean;
  nonProxiedWebrtcDisabled: boolean;
  authenticatedTraceDisabled: boolean;
}
export const REQUIRED_BROWSER_LAUNCH_ARGS: readonly string[] = [
  '--proxy-bypass-list=<-loopback>',
  '--disable-quic',
  '--force-webrtc-ip-handling-policy=disable_non_proxied_udp',
];

/** Contract asserted by the real-run gate before storage state is loaded. */
export const AUTHENTICATED_BROWSER_CONTRACT: Readonly<BrowserContainmentContract> = Object.freeze({
  proxyMandatory: true,
  browserGuardsEnabled: true,
  serviceWorkersBlocked: true,
  sharedWorkersBlocked: true,
  quicDisabled: true,
  nonProxiedWebrtcDisabled: true,
  authenticatedTraceDisabled: true,
});

export function hasRequiredBrowserLaunchArgs(args: readonly string[]): boolean {
  return REQUIRED_BROWSER_LAUNCH_ARGS.every((required) => args.includes(required));
}
