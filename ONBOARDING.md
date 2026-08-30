# Fresh-machine onboarding

This is the canonical bootstrap entry point for a new workstation or a fresh coding-agent environment. Complete this document before implementation work. The objective is a reproducible machine that can build, test, inspect, and operate this repository without rediscovering tooling mid-campaign.

## 1. Preflight rule

1. Clone the repository and enter its root.
2. Confirm the intended repository/branch and fetch current `origin/main`.
3. Read the repository control-plane documents before changing code: `AGENTS.md`, `README.md`, `docs/SAFETY_MODEL.md`, `docs/CURRENT_STATE.md`, `.agent/`, active OpenSpec state.
4. Install/verify the machine prerequisites below.
5. Enable the committed agent integrations and repository-local skills.
6. Restore dependencies from lockfiles/pins; do not casually upgrade them during bootstrap.
7. Run the baseline validation commands.
8. Only then begin a development campaign. If a prerequisite cannot be satisfied, record it as an environment blocker rather than weakening a gate.

Credentials, API keys, signing material, account logins, licensed assets, and other secrets are machine/user responsibilities. Never commit them.

## 2. Supported host and prerequisites

**Primary host:** Node.js cross-platform authoring; Linux capability is required for Bubblewrap namespace containment qualification; browser scenarios are intentionally loopback/local by default.

**Required machine tools**
- Git
- Node.js >= 20 + npm
- Playwright Chromium/system Chrome
- TypeScript toolchain from the lockfile

**Task-dependent / optional tools**
- Bubblewrap on supported Linux hosts for L6 process-network-containment proof
- owner-provided authenticated storage state only for explicitly authorized DEV validation


## 3. Agent setup

- Load repository instructions before acting. Prefer committed repository state over chat history.
- Repository-local skills: `goal`.
- Discover and use committed agent adapter/config directories in-place; do not duplicate them globally unless the harness cannot load repository-local configuration.
- Relevant committed agent surfaces: `.agent/`, `.agents/`, `.claude/`, `.kimi-code/`, `.opencode/`.
- MCP policy: No root `.mcp.json` is committed. Nightwatch's safety/evidence system is the authority; do not introduce an MCP that can bypass outbound-request policy, repository boundaries, or owner-only publication rules.
- Keep diagnostic/documentation MCPs narrow. An MCP does not grant architecture, publishing, production, or gate-bypass authority.
- Authenticate GitHub and coding-agent CLIs separately on the machine. Never store tokens in tracked files.

## 4. Bootstrap

```bash
npm ci
npx playwright install chromium
npm run agent:check
npm run project:check
```

Fresh-machine validation must stay on the local fixture/loopback path unless the repository's explicit authorization workflow says otherwise. Never probe production or external Alphaus infrastructure during setup.


## 5. Editor/LSP baseline

Use the repository-local TypeScript server. Keep Playwright types and safety-policy code diagnostics active; do not suppress type errors around environment/network policy.

The editor is optional; reliable language diagnostics are not.

## 6. Baseline verification

```bash
npm run typecheck
npm run hardening:check
npm run quality-gate:spec
npm run gate:inventory
npm run test:semantic-compat
npm run gate:local
npm run campaign:synthetic
```

A fresh machine is **development-ready** when all applicable non-external gates pass. Hardware/device/signing/account gates may remain explicitly blocked when repository state already classifies them that way.

## 7. Fresh-agent instruction

> Read `ONBOARDING.md` first. Set up every applicable prerequisite, repository-local skill, MCP/plugin, dependency, browser/device/runtime tool, and validation gate described there. Then read the repository's durable agent state and only start implementation after preflight is green or a genuine environment blocker is recorded. Do not replace pinned tooling, skip gates, or invent work to compensate for a missing machine capability.
