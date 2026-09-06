// ---------------------------------------------------------------------------
// Lane B: headless CLI ReasonerDriver gateway. Provider-neutral; no vendor
// hard-code. Import the driver, not the protocol, from here.
// ---------------------------------------------------------------------------

export {
  CLI_REASONER_DEFAULT_KILL_GRACE_MS,
  CLI_REASONER_DEFAULT_STDIO_GRACE_MS,
  CLI_REASONER_LIMITS,
  classifyCliOutcome,
  createCliReasonerDriver,
  describeReasonerResult,
  isRetryableReasonerFailure,
  resolveCliReasoner,
  type CliLifecycleOutcome,
  type CliReasonerConfig,
  type ResolvedCliReasoner,
} from './cliReasoner';
