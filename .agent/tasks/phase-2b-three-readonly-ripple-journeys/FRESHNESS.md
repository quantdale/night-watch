# Phase 2B Ripple source freshness

Recorded 2026-08-12 from locally available refs. No repository was fetched,
pulled, reset, stashed, checked out, or modified.

| Repository | Branch | Checked-out SHA | Local tracking SHA | Relationship | Worktree note |
|---|---|---|---|---|---|
| `mobingilabs/ripple-ui` | `dev` | `d80b161b684d9153c7e5acaa65ae1752d93d8ba9` | `origin/dev` = `e46b8ed6540b647574bdb96ec59eca42fc8acdef` | 0 ahead / 21 behind | Pre-existing deleted `openspec/changes/add-reserveshield-export-report/*` and untracked `AGENTS.md`; preserved exactly. |
| `mobingilabs/ripple-api` | `master` | `27bb007ad0c798800b6bd3b29760c966422966e7` | `origin/master` = same | synced | Pre-existing untracked `AGENTS.md`; preserved exactly. |
| `alphauslabs/blueapi` | `main` | `691422e5dc81afd263d064986fb50fcb3ea432a9` | `origin/main` = `421c5cad0200bd42eb5d6d07999f70fa83c67863` | 0 ahead / 2 behind | Pre-existing untracked `AGENTS.md`; preserved exactly. |
| `alphauslabs/blueinternal` | `main` | `bc629fa8adc9f5407a2b957bd1b2aecdc8b0d623` | `origin/main` = same | synced | Pre-existing untracked `AGENTS.md`; preserved exactly. |
| `alphauslabs/alupi` | `dev` | `60fcad696ec6f6b373b2eb9a3e05b5b0defee629` | `origin/dev` = same | synced | No relevant worktree change observed. |

The selected UI route/component/API files have no diff between the checked-out
Ripple UI SHA and the locally available `origin/dev` SHA. This records local
source freshness only; it does not claim that local source equals the deployed
DEV artifact. Ripple API is synced with its local tracking ref. The selected
contracts use only source facts present at these SHAs.

Relevant source dependencies inspected:

- Ripple UI router, authenticated menu, account management, and v2 exchange
  rate pages/API modules.
- Ripple API route configuration and `Account`, `ExchangeRate`, and
  `InvoiceTemplate` handlers where needed for semantic proof.
- Blue API `billing/v1/billing.proto` for the read-query contract used to
  reject Cost Drift for DEV; the selected journeys do not intentionally call
  its unresolved endpoint.
- Ouchan billing service source for the same rejected Cost Drift proof only;
  no runtime or database activity was performed.

