Implementation is outside the planning-only audit campaign. These tasks are declared not in scope; none has been performed.

## 1. Freeze lifecycle and destructive surfaces

- [ ] ~~1.1 Discover every profile creator/cleanup/sweeper, production store writer/reader, audit caller, receipt consumer, and direct filesystem path.~~
- [ ] ~~1.2 Add regressions for prefix-only deletion, active stale sweep, overwrite/capacity race, missing/unreadable/over-limit false clean, and durability failure.~~
- [ ] ~~1.3 Define generation/lease/capability, finding transaction, audit completeness, bounds, and safe error schemas.~~

## 2. Implement profile and finding integrity

- [ ] ~~2.1 Mint private profile markers/leases/capabilities and bind normal cleanup to exact identity.~~
- [ ] ~~2.2 Replace name/age-only sweep with classified inactive-generation admission.~~
- [ ] ~~2.3 Add append-immutable finding publication, serialized capacity, no-replace commit, and directory durability.~~

## 3. Make audits truthfully complete

- [ ] ~~3.1 Inventory every required root/base and record all traversal/read/stat/identity/budget outcomes.~~
- [ ] ~~3.2 Replace violation-only clean truth with `CLEAN`/`VIOLATION`/`INCOMPLETE` and update consumers.~~
- [ ] ~~3.3 Keep all results categorical and free of absolute paths/raw values.~~

## 4. Adversarial proof and acceptance

- [ ] ~~4.1 Run disposable-root process races and fault injection at every cleanup/publication/audit boundary.~~
- [ ] ~~4.2 Register mutations for prefix authority, age-only deletion, overwrite, racy capacity, skipped errors, silent truncation, and missing durability.~~
- [ ] ~~4.3 Run focused C-10/C-11 privacy/persistence tests, typecheck, hardening/mutations, local/clean/topology gates, and full regression locally.~~
- [ ] ~~4.4 Update safety/architecture/decision truth and integrate only through a separately authorized owned session.~~
