# Proposal — sibling browser spec click robustness

Convert the two `Inspect` force-clicks in
`tests/browser/controlCenterBrowser.browser.ts` (lines 268, 302) to
visibility-gated, box-independent dispatches via a small local helper,
mirroring the proven systemMapV2 shape. Force-clicks skip polling but
still need renderer boxes for scroll coordinates; under batch load the
box can be transiently absent and force fails it instantly. No product
change; no assertion removed or relaxed.
