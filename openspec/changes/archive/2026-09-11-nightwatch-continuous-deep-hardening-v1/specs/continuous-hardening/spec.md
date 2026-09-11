## ADDED Requirements

### Requirement: soak resource lifecycle bounded

Synthetic campaign repeated 3× SHALL show bounded artifact/cache growth and no leaked processes, ports, file descriptors, or tmp dirs.

#### Scenario: repeated soak

- **WHEN** `campaign:synthetic` runs 3× serially with `workers=1`
- **THEN** fd count delta ≤5, tmp files not accumulating, proxy lease count returns to 0, no zombie `bwrap`/`chromium`

### Requirement: cache currentness fail-closed

Cache SHALL never accept stale content. Same SHA with changed content, changed SHA with same content, dep/transitive, analyzer version, interrupted/malformed/duplicate/stale SHALL recompute or reject.

#### Scenario: stale digest rejected

- **WHEN** cache key is `prefixedDigest24` over snapshot+config+analyzer and file content changes but SHA in key does not
- **THEN** cache miss and fresh scan; stale read fails `SOURCE_STALE`

### Requirement: containment requalification

L6 rootless bwrap SHALL deny direct DNS/TCP/UDP/HTTP/CONNECT/WS/IPv6 outside proxy and `l6Containment` 4/4 PASS.

#### Scenario: denied egress

- **WHEN** contained process fetches `example.com` or direct `8.8.8.8`
- **THEN** `ECONNREFUSED` via no-external-interface, not via proxy

### Requirement: replay/resume chaos deterministic

Fault injection at manifest, first/middle/last, evidence write, teardown, interruption SHALL on resume show no lost/duplicated work and deterministic reconstruction.

#### Scenario: resume after middle failure

- **WHEN** campaign fails at middle work item and resumes
- **THEN** completed items not re-executed, pending items not skipped, checkpoint not corrupted
