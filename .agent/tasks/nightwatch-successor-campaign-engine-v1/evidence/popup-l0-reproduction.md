# Popup L0 reproduction record

- Baseline: `78efcc9c4cd02498a0b4bd1d01fb5112d03a1bd1`
- Source evidence: `src/browser/context.ts` installs popup L0 guards through
  `void installFetchGuard(...)` in the `context.on('page')` callback.
- Synthetic reproduction: an injected second-guard delay was held open while
  `window.open('/api/safety/popup')` was issued. The popup target's first
  navigation reached the local fixture server before the delayed guard was
  released. The context route barrier was not invoked for that first popup
  navigation.
- Prototype result: a per-page admission gate plus L1 waiting did not prevent
  the initial target request; it was reverted rather than shipped as a false
  fix.
- Classification: the popup L0 race is real, but a safe pre-navigation barrier
  requires a lower-level browser/CDP target admission design. Do not claim the
  prototype closes it.
- Next selection: proxy raw-event persistence/firewall candidate, which has a
  more direct local writer-boundary reproduction.
