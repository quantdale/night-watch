## ADDED Requirements

### Requirement: Every production child-process call is discovered and classified
The system SHALL syntax-discover every production import, require, alias, namespace access, wrapper, and invocation of child-process authority and bind every call site to exactly one closed execution profile. Unknown, duplicate, dynamic, unclassified, and stale entries SHALL fail hardening. Coverage SHALL be non-zero and machine-receipted with call-site count and digest.

#### Scenario: New launcher is added outside the historical list
- **WHEN** a tracked production file adds a child-process invocation
- **THEN** hardening fails until the exact call site is classified and proven, regardless of filename

#### Scenario: Wrapper hides the invocation
- **WHEN** a helper wraps or aliases a child-process primitive
- **THEN** the wrapper and every reachable production caller remain in the discovered authority graph rather than disappearing from the census

### Requirement: Every process has an explicit minimal environment
Every invocation SHALL supply an explicit environment derived from the shared minimal builder or a narrower profile. Ambient parent spread/default inheritance SHALL be forbidden. Credential-bearing variables SHALL be granted only to the exact scoped observer invocation that needs them and absent from descendants/unrelated calls.

#### Scenario: Parent carries randomized secrets
- **WHEN** the parent has cloud, GitHub, package, SSH, model-provider, custom, and randomized secret sentinels
- **THEN** a non-credential child observes none of them

#### Scenario: GitHub observer needs a token
- **WHEN** a classified remote observer invokes `gh`
- **THEN** only the declared GitHub token/host and minimum runtime keys are present, and subsequent Git/test/tool children do not inherit them

### Requirement: Executable and argv authority is exact
Each profile SHALL resolve an allowed executable without shell interpretation and pass a bounded literal/validated argv vector. Offline repository tools SHALL use the exact installed binary and SHALL NOT use `npx` acquisition, ambient PATH substitution, package scripts with undeclared expansion, or computed shell strings.

#### Scenario: PATH contains an attacker-controlled first entry
- **WHEN** an offline command is launched with a fake same-named executable earlier in PATH
- **THEN** the fake executable is not run and executable identity evidence names the admitted repository/runtime binary

#### Scenario: Local binary is absent
- **WHEN** the required locked tool is not installed
- **THEN** the offline command refuses categorically without downloading or contacting a registry

### Requirement: Process resources and descendants are bounded
Every invocation SHALL set a deadline, stdout/stderr byte budgets or deliberate ignored streams, controlled stdin, `shell: false`, and deterministic process-group/descendant termination. Authority-bearing launchers SHALL NOT use inherited stdio; bounded forwarding MAY preserve safe operator output.

#### Scenario: Child hangs and forks a descendant
- **WHEN** a synthetic child exceeds its deadline after spawning a descendant
- **THEN** the process group is terminated, the bounded result is categorical, and no descendant remains

#### Scenario: Child emits unbounded output
- **WHEN** stdout or stderr exceeds its declared ceiling
- **THEN** collection stops, the process tree is terminated, and only bounded diagnostic metadata is emitted

### Requirement: Offline and networked profiles are mechanically distinct
Offline profiles SHALL have no network or package-acquisition authority and SHALL prove that property with executing tests. Remote/authenticated profiles SHALL name their allowed destination/credential class and remain subordinate to existing owner, target, and containment gates.

#### Scenario: Offline mutation campaign attempts DNS or HTTP
- **WHEN** a test tool or transitive child attempts network access
- **THEN** the attempt is denied/observed and the campaign cannot report an offline success

#### Scenario: Authenticated launcher lacks containment readiness
- **WHEN** an authenticated profile cannot qualify its required containment and termination controls
- **THEN** it refuses before spawning or disclosing credential paths

### Requirement: Public process diagnostics preserve privacy
Receipts and failures SHALL contain only safe call-site/profile IDs, executable digests or safe names, exit/signal classes, durations, byte counts, and categorical errors. They SHALL NOT contain environment values, credentials, raw argv secrets, absolute/home paths, unbounded output, or customer data.

#### Scenario: Child error includes environment and home path
- **WHEN** a child writes sensitive host detail before failure
- **THEN** the public/durable diagnostic contains only bounded redacted metadata

### Requirement: Boundary enforcement is non-vacuous
Authoritative tests SHALL execute representative calls from every profile with secret sentinels, fake binaries, hung/noisy descendants, network attempts, and scoped credentials. Mutation probes SHALL detect removal of explicit env, timeout, byte limit, shell prohibition, local binary resolution, group termination, credential narrowing, call-site discovery, and classification freshness.

#### Scenario: Manual launcher list returns
- **WHEN** a mutation makes discovery depend on an incomplete filename list or excludes an invocation family
- **THEN** census comparison/mutation proof fails with the missing call-site identity

#### Scenario: Environment option is deleted
- **WHEN** a mutation removes the explicit environment from any registered call
- **THEN** static enforcement and a representative child sentinel test fail
