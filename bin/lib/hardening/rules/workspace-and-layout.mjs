#!/usr/bin/env node
// @ts-check

/**
 * Invariant family: workspace integrity, host capability and ephemeral layout.
 *
 * C-00 worktree/session topology, the declared host capability matrix, and the
 * ownership of every root output/scratch name. The shared property is that the
 * repository's own working surfaces are declared rather than discovered by
 * accident.
 */

import {
  root,
  fail,
  readIncludingComments,
  read,
  readDataFile,
  gitFiles,
} from '../kernel.mjs';
import { loadTypeScriptModule } from '../../typescript-runtime-loader.mjs';

export function checkHostCapabilityMatrix() {
  const matrixFile = 'docs/HOST-CAPABILITY-MATRIX.md';
  const matrix = readDataFile(matrixFile);
  if (matrix.length === 0) {
    fail(`${matrixFile} is missing; the qualified-host requirements must be documented`);
    return;
  }
  const manifest = JSON.parse(readDataFile('package.json'));
  for (const name of Object.keys({ ...(manifest.dependencies ?? {}), ...(manifest.devDependencies ?? {}) })) {
    if (!matrix.includes(`\`${name}\``)) {
      fail(`${matrixFile} does not assess the declared dependency '${name}'; a dependency without an assessment is an unevidenced claim`);
    }
  }
  // token -> the source that must still probe it
  for (const [token, source] of [
    ['nightwatch.l6-runtime-capability.v1', 'src/core/oops/sandbox.ts'],
    ['TOOLCHAIN_UNAVAILABLE', 'src/core/ownerLocalReproduction/contracts.ts'],
    ['DEFAULT_SIBLING_ROOT', 'src/core/source/siblingSource.ts'],
    ['deepContainmentLane', 'bin/quality-gate.mjs'],
  ]) {
    if (!read(source).includes(token)) {
      fail(`${source} no longer references '${token}'; the host capability matrix row for it is stale`);
      continue;
    }
    if (!matrix.includes(token)) {
      fail(`${matrixFile} does not name the probed host capability '${token}'`);
    }
  }
  // An unqualified host must never inherit a pass, and the matrix must say so.
  // Whitespace-tolerant on purpose: prose wraps, and a rule that a reflowed
  // paragraph can break is a rule that will be "fixed" by deleting it.
  if (!/unsupported\s+capability/i.test(matrix) || !/never\s+inherits?/i.test(matrix)) {
    fail(`${matrixFile} must state that an unqualified host reports unsupported capability and never inherits a pass`);
  }
}

export function checkC00WorkspaceIntegrity() {
  // C-00 concurrency and workspace hardening. The inspection core stays
  // read-only and importable by the continuity checker; every mutation lives
  // in the session CLI; the session CLI never rewrites shared history.
  const core = readIncludingComments('bin/workspace-integrity.mjs');
  const coreCode = read("bin/workspace-integrity.mjs");
  const mutationRe = /(?:fs|node:fs)[\s\S]{0,80}?\b(?:writeFile|writeFileSync|appendFile|appendFileSync|rename|renameSync|chmod|chmodSync|mkdir|mkdirSync|rm|rmSync|unlink|unlinkSync|createWriteStream)\b/;
  if (mutationRe.test(core)) fail('bin/workspace-integrity.mjs must stay read-only (no filesystem mutation)');
  if (/from 'node:(?:net|http|https|dns|tls)'/.test(core) || /\bfetch\s*\(/.test(core)) fail('bin/workspace-integrity.mjs must not open a network surface');
  if (/shell\s*:\s*true|stdio\s*:\s*['"]inherit['"]|(?<!\.)\bexec(?:File)?\s*\(/.test(core)) fail('bin/workspace-integrity.mjs exposes shell-capable or unbounded child execution');
  if (!/timeout:/.test(coreCode) || !/maxBuffer:/.test(coreCode)) fail('bin/workspace-integrity.mjs lacks bounded child execution');
  for (const invariant of ['WORKSPACE_FORBIDDEN_INDEX_FLAG', 'WORKSPACE_EXCLUDE_DRIFT', 'WORKSPACE_UNEXPECTED_HOOK', 'WORKSPACE_UNOWNED_SESSION_WORKTREE', 'WORKSPACE_UNDECLARED_TRACKED_DELETION', 'WORKSPACE_CANONICAL_DIRTY_WHILE_SESSION_LIVE']) {
    if (!coreCode.includes(invariant)) fail(`C-00 hygiene invariant missing from the inspection core: ${invariant}`);
  }
  if (!/skipWorktreeTags/.test(coreCode) || !/ASSUME_UNCHANGED/.test(coreCode)) fail('C-00 index-flag invariant must reject skip-worktree and assume-unchanged explicitly');
  const session = readIncludingComments('bin/nightwatch-session.mjs');
  const sessionCodeOnly = read('bin/nightwatch-session.mjs');
  const sessionCode = read("bin/nightwatch-session.mjs");
  if (/--force|--force-with-lease|push\s+--force|'rebase'|'--hard'|clean',\s*'-fd|'stash'/.test(session)) fail('bin/nightwatch-session.mjs must never force-push, rebase, hard-reset, clean, or stash');
  if (!/HEAD:refs\/heads\//.test(sessionCodeOnly)) fail('bin/nightwatch-session.mjs must integrate by pushing the session branch, never by checking out the canonical branch');
  if (!/SESSION_ALREADY_OWNED/.test(sessionCode) || !/SESSION_OWNER_STALE/.test(sessionCode) || !/flag: 'wx'/.test(sessionCode)) fail('bin/nightwatch-session.mjs must claim ownership with an exclusive create and distinguish live from stale owners');
  if (!/SESSION_REMOVE_REFUSED_LIVE_HOLDER/.test(sessionCode) || !/SESSION_REMOVE_REFUSED_UNMERGED/.test(sessionCode)) fail("bin/nightwatch-session.mjs must refuse to delete another session's live or unmerged work");
  if (!/SESSION_RECONCILE_CONFLICT/.test(sessionCode) || !/merge', '--abort/.test(sessionCode)) fail('bin/nightwatch-session.mjs must abort rather than silently resolve a reconcile conflict');
  const checker = readIncludingComments('bin/agent-state.mjs');
  const checkerCode = read("bin/agent-state.mjs");
  if (!/from '\.\/workspace-integrity\.mjs'/.test(checkerCode)) fail('bin/agent-state.mjs must consume the C-00 workspace inspection core');
  let policy;
  try {
    policy = JSON.parse(readDataFile('config/workspace-integrity.v1.json'));
  } catch {
    fail('config/workspace-integrity.v1.json must be valid JSON');
    return;
  }
  if (policy.schemaVersion !== 'nightwatch.workspace-integrity.v1') fail('C-00 workspace policy schema/version is invalid');
  if (!Array.isArray(policy.excludePolicy?.allowedEffectivePatterns) || policy.excludePolicy.allowedEffectivePatterns.length !== 0) fail('C-00 shared exclude policy must allow zero effective patterns');
  if (policy.hookPolicy?.allowedSuffix !== '.sample' || policy.hookPolicy?.requireUnsetHooksPath !== true) fail('C-00 hook policy must permit only samples and require core.hooksPath to be unset');
  if (policy.canonical?.mayHostImplementationSession !== false || policy.canonical?.requireCleanWhenSessionLive !== true) fail('C-00 canonical protection policy is weakened');
  const packageJson = readDataFile('package.json');
  for (const script of ['workspace:check', 'workspace:status', 'session:status', 'session:check']) {
    if (!packageJson.includes(`"${script}"`)) fail(`C-00 operator script missing: ${script}`);
  }
  if (!/"workspace:check"\s*:\s*"node bin\/workspace-integrity\.mjs check"/.test(packageJson)) fail('package.json must expose the fixed C-00 workspace checker entry point');
  // The synthetic file list moved out of the package script into a versioned
  // manifest, so this membership check follows it there. It must keep proving
  // MEMBERSHIP of the C-00 matrix, not merely that the string appears
  // somewhere: dropping the adversarial matrix out of the required campaign is
  // exactly the regression this guard exists to catch.
  const syntheticManifest = JSON.parse(readDataFile('config/synthetic-campaign.v1.json'));
  if (syntheticManifest?.schemaVersion !== 'nightwatch.synthetic-campaign.v1') fail('the synthetic campaign manifest schema is unsupported');
  const syntheticCampaignFiles = Array.isArray(syntheticManifest.files) ? syntheticManifest.files : [];
  if (!syntheticCampaignFiles.includes('tests/unit/workspaceIsolation.test.ts')) fail('the C-00 adversarial matrix must run inside the required synthetic campaign');
  if (!syntheticCampaignFiles.includes('tests/unit/l6Containment.test.ts')) fail('the L6 containment matrix must run inside the required synthetic campaign');
  if (syntheticManifest.execution?.workers !== 1 || syntheticManifest.execution?.retries !== 0 || syntheticManifest.execution?.serial !== true) {
    fail('the synthetic campaign must stay serial with zero retries');
  }
  if (!/"campaign:synthetic"\s*:\s*"node bin\/campaign-synthetic\.mjs"/.test(packageJson)) fail('package.json must expose the fixed synthetic campaign launcher entry point');
  const agents = readDataFile('AGENTS.md');
  if (!/ONE_WRITING_AGENT == ONE_WORKTREE == ONE_SESSION_IDENTITY/.test(agents)) fail('AGENTS.md must state the C-00 session/worktree invariant');
  // C-00 consequence: `.gitignore`'s `node_modules/` rule does not match a
  // `node_modules` SYMLINK, so sharing an install between worktrees can be
  // tracked by an ordinary `git add -A`. A session worktree installs its own
  // dependencies; the dependency tree is never a tracked path.
  for (const file of gitFiles()) {
    if (/(?:^|\/)node_modules(?:\/|$)/.test(file)) fail(`dependency tree must never be tracked: ${file}`);
  }
  // C-00 consequence: a fixture must never write into a directory derived from
  // the checkout's own parent. In an out-of-tree session worktree that parent
  // is the session-worktree root, and stray directories there corrupt the
  // worktree inventory an operator reads.
  const storageStateTest = readIncludingComments('tests/unit/storageState.test.ts');
  if (/(?:mkdirSync|writeFileSync)\([^)]*\bWORKSPACE_ROOT\b|path\.join\(WORKSPACE_ROOT,/.test(storageStateTest)) {
    fail('tests/unit/storageState.test.ts must not write into the real workspace root; use a disposable synthetic root');
  }
  // C-00 consequence: a writing agent's worktree lives outside the workspace
  // tree, so the REPOSITORIES root must never be derived from this checkout's
  // own location. These two surfaces previously did exactly that and broke in
  // an isolated worktree.
  // C-05 adds `bin/change-intelligence.mjs`. It had the same defect and was
  // never covered: `resolve(nightwatchRoot, '../..')` resolved to
  // `$HOME/.nightwatch` from a session worktree, so every git call failed with
  // ENOENT and `npm run change:shadow` could not run there at all. No gate
  // group executes that script, so nothing reported it.
  for (const file of ['tests/unit/changeIntelligenceBacktest.test.ts', 'scenarios/ripple/local.smoke.ts', 'bin/change-intelligence.mjs']) {
    // Distinct names: this rule binds a second `source` in the loop below, and
    // one name for two scopes is exactly what defeats the alias analysis.
    const rootResolverSource = readIncludingComments(file);
    const rootResolverCode = read(file);
    if (!/DEFAULT_SIBLING_ROOT/.test(rootResolverCode)) fail(`${file} must resolve the repositories root through DEFAULT_SIBLING_ROOT`);
    if (/__dirname,\s*'\.\.\/\.\.\/\.\.'|__dirname,\s*'\.\.',\s*'\.\.',\s*'\.\.'/.test(rootResolverSource)) {
      fail(`${file} must not derive the repositories root from its own checkout location`);
    }
  }
  // NW-02. These two private stores had the same defect with worse
  // consequences: the exclusion set that keeps owner state out of Nightwatch
  // and sibling source was derived from module location, so a configured root
  // beneath canonical source was rejected from the canonical checkout and
  // ACCEPTED from a C-00 session worktree. The judgement now belongs to one
  // authority; these surfaces must consume it and must not recompute it.
  const topologyAuthority = 'src/core/policy/sourceTopology.ts';
  const topologySource = read(topologyAuthority);
  if (!/DEFAULT_SIBLING_ROOT/.test(topologySource)) {
    fail(`${topologyAuthority} must resolve the repositories root through DEFAULT_SIBLING_ROOT`);
  }
  if (!/SOURCE_TOPOLOGY_REPOSITORIES_ROOT_AMBIGUOUS/.test(topologySource)) {
    fail(`${topologyAuthority} must fail closed on an ambiguous repositories root`);
  }
  // The call form, not the identifier: a rule satisfied by the surviving
  // import line would pass while the actual call site was replaced.
  for (const [file, errorCode] of [
    ['src/core/policy/privateArtifacts.ts', 'PRIVATE_ARTIFACT_ROOT_INSIDE_REPOSITORY'],
    ['src/core/prodEvidence/productionFindingsStore.ts', 'PRODUCTION_ARTIFACT_ROOT_INSIDE_REPOSITORY'],
  ]) {
    const source = read(file);
    const call = new RegExp(`assertOutsideSourceTopology\\(\\s*root\\s*,\\s*'${errorCode}'`);
    if (!call.test(source)) {
      fail(`${file} must refuse a private root through assertOutsideSourceTopology(root, '${errorCode}', ...)`);
    }
    if (/__dirname/.test(source)) {
      fail(`${file} must not derive a path-safety decision from its own checkout location`);
    }
  }
}

/**
 * F-06 (G5.8). Root output/scratch ownership.
 *
 * The repository root must not accumulate a new unowned output or scratch
 * path. `src/core/workspace/ephemeralLayout.ts` declares the two owned roots
 * (`test-results`, `.tmp-nightwatch`), the historical sibling pattern, and the
 * ownership classifier. This rule fails in BOTH directions between that
 * declaration and the tracked `.gitignore` vocabulary (a declared historical
 * pattern absent from `.gitignore`, and an ephemeral ignore line outside the
 * declared vocabulary), verifies the module's classification of
 * owned/historical/protected names, and rejects any tracked path living under
 * a root output/scratch name.
 */
export const ROOT_OUTPUT_DECLARED_PATTERNS = Object.freeze(['test-results/', 'test-results-*/', '.tmp-*/']);

export function checkRootOutputRootOwnership() {
  let layout;
  try {
    layout = loadTypeScriptModule('src/core/workspace/ephemeralLayout.ts', { root });
  } catch (error) {
    fail(`ROOT_OUTPUT_ROOT_UNOWNED src/core/workspace/ephemeralLayout.ts could not be loaded: ${error instanceof Error ? error.message : String(error)}`);
    return;
  }
  const ownedRoots = [layout.PLAYWRIGHT_OUTPUT_ROOT, layout.SCRATCH_ROOT];
  if (ownedRoots[0] !== 'test-results' || ownedRoots[1] !== '.tmp-nightwatch') {
    fail(`ROOT_OUTPUT_ROOT_UNOWNED the laid-out owned roots are ${JSON.stringify(ownedRoots)}, not ["test-results",".tmp-nightwatch"]; a different root is an unowned location`);
  }
  const pattern = layout.EPHEMERAL_ROOT_PATTERN;
  const classify = layout.isOwnedEphemeralRoot;
  if (!(pattern instanceof RegExp) || typeof classify !== 'function') {
    fail('ROOT_OUTPUT_ROOT_UNOWNED the layout module no longer exports the ephemeral root pattern and the ownership classifier');
    return;
  }
  // Both directions of the ownership classification: owned names match and
  // classify owned; historical siblings match and classify unowned; protected
  // and ordinary names match neither.
  for (const name of ownedRoots) {
    if (typeof name !== 'string' || !pattern.test(name) || classify(name) !== true) {
      fail(`ROOT_OUTPUT_ROOT_UNOWNED owned root ${String(name)} is not matched and classified owned by the layout module`);
    }
  }
  for (const name of ['test-results-20260809', '.tmp-narrow-test']) {
    if (!pattern.test(name) || classify(name) !== false) {
      fail(`ROOT_OUTPUT_ROOT_UNOWNED historical sibling ${name} is not matched and classified unowned by the layout module`);
    }
  }
  for (const name of ['artifacts', '.nightwatch', 'node_modules', 'dist', 'src', 'bin', 'test-results-', '.tmp']) {
    if (pattern.test(name) || classify(name) === true) {
      fail(`ROOT_OUTPUT_ROOT_UNOWNED non-ephemeral name ${name} is matched or classified owned; the root pattern is too broad`);
    }
  }
  // Direction 1: every declared historical pattern must actually ignore. A
  // declaration that .gitignore does not carry is stale.
  const ignored = new Set();
  for (const line of readDataFile('.gitignore').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed === '' || trimmed.startsWith('#')) continue;
    if (/^test-results\b/.test(trimmed) || /^\.tmp-/.test(trimmed) || /^\*\.tmp-/.test(trimmed)) ignored.add(trimmed);
  }
  for (const declared of ROOT_OUTPUT_DECLARED_PATTERNS) {
    if (!ignored.has(declared)) {
      fail(`ROOT_OUTPUT_ROOT_UNOWNED the declared root-output pattern ${declared} is not present in .gitignore; a root that matches it would not be ignored`);
    }
  }
  // Direction 2: every ephemeral ignore line must be in the declared
  // vocabulary. An undeclared instance or a broader pattern is drift.
  const declaredSet = new Set(ROOT_OUTPUT_DECLARED_PATTERNS);
  for (const line of ignored) {
    if (!declaredSet.has(line)) {
      fail(`ROOT_OUTPUT_ROOT_UNOWNED .gitignore declares ${line}, which is outside the declared root-output pattern vocabulary ${ROOT_OUTPUT_DECLARED_PATTERNS.join(', ')}`);
    }
  }
  // No tracked path may live under a root output/scratch name: the roots are
  // ephemeral by declaration and are never durable repository content.
  for (const file of gitFiles()) {
    const slash = file.indexOf('/');
    if (slash < 0) continue;
    const first = file.slice(0, slash);
    if (pattern.test(first)) {
      fail(`ROOT_OUTPUT_ROOT_UNOWNED ${file} is tracked under the root output/scratch name ${first}; runner output and scratch are never tracked`);
    }
  }
}

export const ROOT_PLAYWRIGHT_CONFIG_RE = /^playwright(?:\.[A-Za-z0-9_-]+)?\.config\.ts$/;

/**
 * F-06 (G5.8). Root Playwright output literals.
 *
 * Every root `playwright*.config.ts` either declares no `outputDir` (the
 * Playwright default applies) or resolves one through
 * `resolvePlaywrightOutputDir('<lane>')` from the owned layout module. A
 * literal output root, a derived value, or a reused lane fails with its file
 * and line: scattered roots are exactly the accumulation F-06 measured.
 */
export function checkRootOutputConfigLiteral() {
  const configs = gitFiles().filter((file) => ROOT_PLAYWRIGHT_CONFIG_RE.test(file)).sort();
  if (configs.length < 11) {
    fail(`ROOT_OUTPUT_CONFIG_LITERAL discovered ${configs.length} root playwright config(s); a sweep below eleven would pass vacuously`);
  }
  let resolved = 0;
  /** @type {Map<string, string>} */
  const lanes = new Map();
  for (const file of configs) {
    const source = read(file);
    const lines = source.split('\n');
    for (const outputMatch of source.matchAll(/outputDir\s*:/g)) {
      const line = source.slice(0, outputMatch.index).split('\n').length;
      const lineText = lines[line - 1] ?? '';
      const laneMatches = [...lineText.matchAll(/outputDir\s*:\s*resolvePlaywrightOutputDir\(\s*'([a-z0-9][a-z0-9-]{0,31})'\s*\)/g)];
      if (laneMatches.length !== 1) {
        fail(`ROOT_OUTPUT_CONFIG_LITERAL ${file}:${line} declares outputDir without resolvePlaywrightOutputDir('<lane>'); root output is owned by the layout module, never a literal`);
        continue;
      }
      if (!source.includes("from './src/core/workspace/ephemeralLayout'")) {
        fail(`ROOT_OUTPUT_CONFIG_LITERAL ${file}:${line} calls resolvePlaywrightOutputDir without importing the owned layout module`);
      }
      const lane = laneMatches[0]?.[1] ?? '';
      resolved += 1;
      if (lanes.has(lane)) {
        fail(`ROOT_OUTPUT_CONFIG_LITERAL ${file}:${line} reuses lane '${lane}' already declared by ${lanes.get(lane)}; two lanes would clobber one output directory`);
      } else {
        lanes.set(lane, file);
      }
    }
  }
  if (configs.length > 0 && resolved === 0) {
    fail('ROOT_OUTPUT_CONFIG_LITERAL no root playwright config resolves output through resolvePlaywrightOutputDir; the detector is broken rather than the layout clean');
  }
}
