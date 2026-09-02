# Tasks — C-02b

- [ ] T1 Task record (SPEC/PLAN/STATE/REPORT) and this OpenSpec change.
- [ ] T2 Adversarial corpus asserted before the parser exists: comment RPCs,
      block-comment RPCs, commented `google.api.http`, braces inside comments,
      comment tokens inside strings, strings containing `rpc`, malformed option
      blocks.
- [ ] T3 `protoLexer.ts` — bounded character tokenizer; the only module that
      understands comment and string syntax; explicit token/byte/depth ceilings.
- [ ] T4 `protoDeclarations.ts` — bounded reader producing package, services,
      RPCs, streaming flags, request/response messages, HTTP bindings,
      `additional_bindings`, ambiguity and completeness.
- [ ] T5 HTTP annotation matrix: GET/POST/PUT/PATCH/DELETE, body and no body,
      `additional_bindings`, malformed, duplicate, unsupported custom option,
      option order, whitespace variation; ambiguity represented, never collapsed.
- [ ] T6 Streaming matrix: unary, client, server, bidirectional; measured
      distribution reported.
- [ ] T7 `PROTOBUF` language and `.proto` extension admitted through existing
      approved-root machinery; `parseProtoRoutes` dispatch in `surfaces.ts`.
- [ ] T8 Completeness propagation and the C-01 no-eviction regression.
- [ ] T9 `protoCorroboration.ts` — per-operation MATCH / OPENAPI_ONLY /
      PROTO_ONLY / METHOD_MISMATCH / PATH_MISMATCH / AMBIGUOUS /
      UNCORROBORATABLE, wired to the `generatedArtifact.ts` seam.
- [ ] T10 Hardening rules for every load-bearing invariant, each negative-probed
      with mutation FAIL and restoration PASS recorded.
- [ ] T11 Gate registration in `config/synthetic-campaign.v1.json` plus a
      membership assertion; full validation matrix.
- [ ] T12 Integrate per C-00, observe exact-head CI, reconcile project truth,
      close and release.
