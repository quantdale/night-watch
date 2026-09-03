// @ts-check

/**
 * Campaign certification registry validation — pure.
 *
 * The rule this implements was previously written six times, once per
 * campaign, inline in each campaign's own hardening boundary function. Three
 * campaigns never wrote it — C-01, C-02a and C-06 — and nothing detected the
 * omission, so six load-bearing suites shipped that no authoritative gate
 * group had ever run. A rule each campaign must remember to add is not a rule.
 *
 * It lives here, taking all of its inputs as data, so that the same function
 * enforces the repository (`bin/hardening-check.mjs`) and is negative-probed
 * exhaustively by `tests/unit/r12CampaignCertification.test.ts`. A guard whose
 * failure paths are only ever exercised by hand is a guard nobody knows works.
 */

/** Lane manifest path → the REQUIRED gate group whose command executes it. */
export const LANE_GATE_COMMANDS = Object.freeze({
  'config/synthetic-campaign.v1.json': 'SYNTHETIC_CAMPAIGN',
  'config/semantic-compatibility.v1.json': 'SEMANTIC_COMPATIBILITY',
});

export const CAMPAIGN_CERTIFICATION_SCHEMA_VERSION = 'nightwatch.campaign-certification.v1';
const SUITE_PATH = /^tests\/(?:unit|smoke)\/[A-Za-z0-9._/-]+\.test\.ts$/;
const DEFAULT_CAMPAIGN_TASK_PATTERN = '-(c|r)[0-9]+[a-z]*-v[0-9]+$';

/**
 * Collect every suite path a lane manifest causes a gate group to execute.
 * The two authoritative manifests carry different shapes, so both are read.
 *
 * @param {any} manifest
 * @returns {string[]}
 */
export function laneSuites(manifest) {
  if (manifest === null || typeof manifest !== 'object') return [];
  const suites = [];
  for (const entry of Array.isArray(manifest.phaseSuites) ? manifest.phaseSuites : []) {
    for (const file of Array.isArray(entry?.files) ? entry.files : []) suites.push(file);
  }
  for (const file of Array.isArray(manifest.supportFiles) ? manifest.supportFiles : []) suites.push(file);
  for (const file of Array.isArray(manifest.files) ? manifest.files : []) suites.push(file);
  return suites;
}

/**
 * @typedef {object} CampaignCertificationInput
 * @property {any} registry            parsed `config/campaign-certification.v1.json`
 * @property {any} gate                parsed `config/quality-gate.v1.json`
 * @property {Map<string, any>} lanes  lane manifest path → parsed manifest (absent key = unreadable)
 * @property {string[]} campaignTasks  campaign task directory names discovered in the ledger
 * @property {(suite: string) => boolean} suiteExists
 */

/**
 * Validate the registry. Returns every violation found, in a deterministic
 * order; an empty array means the three conjuncts hold.
 *
 * @param {CampaignCertificationInput} input
 * @returns {string[]}
 */
export function validateCampaignCertification(input) {
  const errors = [];
  const fail = (/** @type {string} */ message) => { errors.push(message); };
  const { registry, gate, lanes, campaignTasks, suiteExists } = input;

  if (registry === null || typeof registry !== 'object' || Array.isArray(registry)) {
    fail('the campaign certification registry must be a JSON object');
    return errors;
  }
  if (registry.schemaVersion !== CAMPAIGN_CERTIFICATION_SCHEMA_VERSION) {
    fail(`the campaign certification registry must declare schemaVersion ${CAMPAIGN_CERTIFICATION_SCHEMA_VERSION}`);
    return errors;
  }
  if (!Array.isArray(registry.lanes) || registry.lanes.length === 0) {
    fail('the campaign certification registry must declare a non-empty lanes array');
    return errors;
  }
  if (!Array.isArray(registry.campaigns) || registry.campaigns.length === 0) {
    fail('the campaign certification registry must declare a non-empty campaigns array');
    return errors;
  }

  // A lane counts only if a REQUIRED gate group executes it. This is read from
  // the gate definition rather than taken on the registry's word, so the
  // registry cannot authorise its own lanes.
  const requiredCommands = new Set(
    (Array.isArray(gate?.groups) ? gate.groups : [])
      .filter((group) => group?.required === true)
      .map((group) => group?.commandKey),
  );
  const registered = new Set();
  for (const lane of registry.lanes) {
    const command = LANE_GATE_COMMANDS[lane];
    if (!command) {
      fail(`campaign certification lane ${lane} is not an authoritative gate manifest`);
      continue;
    }
    if (!requiredCommands.has(command)) {
      fail(`campaign certification lane ${lane} maps to gate group ${command}, which is not a REQUIRED gate group`);
      continue;
    }
    if (!lanes.has(lane)) {
      fail(`campaign certification lane ${lane} could not be read as JSON`);
      continue;
    }
    for (const suite of laneSuites(lanes.get(lane))) registered.add(suite);
  }

  let pattern;
  try {
    pattern = new RegExp(
      typeof registry.campaignTaskPattern === 'string' ? registry.campaignTaskPattern : DEFAULT_CAMPAIGN_TASK_PATTERN,
    );
  } catch {
    fail('the campaign certification registry campaignTaskPattern must be a valid regular expression');
    return errors;
  }
  const ledger = campaignTasks.filter((name) => pattern.test(name));
  if (ledger.length === 0) {
    // A totality rule over an empty set proves nothing, so an empty ledger is
    // itself the failure rather than a silent pass.
    fail('the campaign task ledger matched no campaign directory; the totality rule would be vacuous');
  }

  const declaredIds = new Set();
  const declaredTasks = new Set();
  const declaredSuites = new Set();
  for (const campaign of registry.campaigns) {
    const id = campaign?.id;
    if (typeof id !== 'string' || id === '' || typeof campaign?.task !== 'string' || campaign.task === '' || !Array.isArray(campaign?.suites)) {
      fail(`campaign certification entry ${JSON.stringify(id ?? null)} must carry a non-empty string id, a non-empty string task and a suites array`);
      continue;
    }
    if (declaredIds.has(id)) fail(`campaign certification registry declares campaign ${id} more than once`);
    declaredIds.add(id);
    if (declaredTasks.has(campaign.task)) fail(`campaign certification registry declares task ${campaign.task} more than once`);
    declaredTasks.add(campaign.task);
    // An empty suite set is admissible only as a DECLARED fact carrying its
    // reason. "This campaign certifies through no suite of its own" must never
    // be the silent default, because that is exactly how a suite disappears.
    if (campaign.suites.length === 0 && (typeof campaign.reason !== 'string' || campaign.reason.trim() === '')) {
      fail(`campaign ${id} declares no certification suite and no reason; an absent suite set must be an explicit declared fact`);
    }
    for (const suite of campaign.suites) {
      if (typeof suite !== 'string' || !SUITE_PATH.test(suite)) {
        fail(`campaign ${id} declares a malformed certification suite path ${JSON.stringify(suite)}`);
        continue;
      }
      if (declaredSuites.has(suite)) {
        fail(`certification suite ${suite} is declared by more than one campaign`);
        continue;
      }
      declaredSuites.add(suite);
      if (!suiteExists(suite)) {
        fail(`campaign ${id} certification suite ${suite} is declared but does not exist on disk`);
        continue;
      }
      if (!registered.has(suite)) {
        fail(`campaign ${id} certification suite ${suite} is not registered in any authoritative quality-gate lane`);
      }
    }
  }

  for (const task of ledger) {
    if (!declaredTasks.has(task)) {
      fail(`campaign task ${task} is in the task ledger but declares no certification suites in config/campaign-certification.v1.json`);
    }
  }
  return errors;
}
