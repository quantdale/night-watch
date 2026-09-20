Implementation is outside the planning-only audit campaign. These tasks are declared not in scope; none has been performed.

## 1. Freeze the evidence writer/reader surface

- [ ] ~~1.1 Discover every recorder, destination-manifest, observer, reader, adapter, and direct run-directory writer.~~
- [ ] ~~1.2 Add regressions for same-ID mixing, manifest reset, memory/disk divergence, swallowed observer failures, and direct-write interruption.~~
- [ ] ~~1.3 Define bundle generation, claim, journal, record, terminal, view, bounds, recovery, and safe error schemas.~~

## 2. Implement exclusive canonical storage

- [ ] ~~2.1 Create private no-follow generations and single-writer claims before runtime authority.~~
- [ ] ~~2.2 Journal every evidence mutation with monotonic integrity-linked records and required durability.~~
- [ ] ~~2.3 Generate manifest/event/network/console/proxy/repository/summary views atomically from the journal.~~

## 3. Couple runtime truth to storage truth

- [ ] ~~3.1 Finalize only from validated durable records and commit one terminal bundle state.~~
- [ ] ~~3.2 Add bounded recovery/rebuild and historical read-only classification.~~
- [ ] ~~3.3 Route observer/publisher failures to an independent non-clean latch and preserve mandatory safety effects.~~

## 4. Adversarial proof and acceptance

- [ ] ~~4.1 Test collisions, concurrency, symlinks/types/modes, every fault boundary, corruption, bounds, and recovery.~~
- [ ] ~~4.2 Register mutations for reuse, reset-on-parse-error, memory-authoritative summary, direct view writes, swallowed failures, and missing durability.~~
- [ ] ~~4.3 Run focused evidence/browser tests, typecheck, hardening/mutations, local/clean/topology gates, and full regression using synthetic roots only.~~
- [ ] ~~4.4 Update evidence architecture/safety truth and integrate only through a separately authorized owned session.~~
