// Validation classification truth — pure rules over the validation universe,
// the lane-state record, package.json scripts, the default Playwright
// testMatch, the tracked Playwright configs and the fixture loaders.
//
// The measured defects this module closes:
//   1. six fixture smokes were classified LIVE_APP_SMOKE /
//      UNAVAILABLE_CAPABILITY while `playwright.config.ts` testMatch and
//      `npm test` execute them;
//   2. `BROWSER_WORKFLOW.evidenceLane` named `npm run test:browser`, which is
//      not a package.json script;
//   3. `playwright.capture.synthetic.config.ts` was referenced by nothing;
//   4. two `tests/fixtures/*` children forked the TypeScript loader.
//
// Pure: the caller supplies every input. No filesystem, no Git, no clock.

export const VALIDATION_CLASSIFICATION_VERSION = 'nightwatch.validation-classification.v1';

function escapeRegex(character) {
  return character.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Expand one Playwright glob (`**`, `*`, `?`, `{a,b}`) into an anchored RegExp. */
export function globToRegExp(glob) {
  const source = String(glob ?? '');
  let pattern = '^';
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (character === '*') {
      if (source[index + 1] === '*') {
        if (source[index + 2] === '/') {
          pattern += '(?:.*/)?';
          index += 2;
        } else {
          pattern += '.*';
          index += 1;
        }
      } else {
        pattern += '[^/]*';
      }
    } else if (character === '?') {
      pattern += '[^/]';
    } else if (character === '{') {
      const end = source.indexOf('}', index);
      if (end === -1) {
        pattern += '\\{';
      } else {
        const alternatives = source
          .slice(index + 1, end)
          .split(',')
          .map((entry) => escapeRegex(entry));
        pattern += `(?:${alternatives.join('|')})`;
        index = end;
      }
    } else {
      pattern += escapeRegex(character);
    }
  }
  return new RegExp(`${pattern}$`);
}

/** The `testMatch` globs declared by the default Playwright config source. */
export function extractTestMatchGlobs(playwrightConfigSource) {
  const match = /testMatch\s*:\s*\[([\s\S]*?)\]/.exec(String(playwrightConfigSource ?? ''));
  if (match === null) return [];
  return [...match[1].matchAll(/'([^']+)'|"([^"]+)"/g)]
    .map((entry) => entry[1] ?? entry[2])
    .filter((entry) => typeof entry === 'string' && entry !== '');
}

/** True when the repository-relative file matches one of the default globs. */
export function matchesDefaultTestMatch(file, globs) {
  return (globs ?? []).some((glob) => globToRegExp(glob).test(file));
}

/** Every `npm run <script>` token in a stored string. */
export function npmRunScripts(text) {
  return [...String(text ?? '').matchAll(/npm run ([A-Za-z0-9][A-Za-z0-9:_-]*)/g)].map((match) => match[1]);
}

/**
 * The four classification-truth rules. Every input is data; the caller reads
 * the repository. Returns `{ errors: [{ code, detail }] }`.
 */
export function classifyValidationTruth(input = {}) {
  const {
    universe = {},
    laneState = {},
    packageScripts = {},
    testMatchGlobs = [],
    trackedPlaywrightConfigs = [],
    packageScriptValues = [],
    binSources = [],
    retentionEvidence = '',
    fixtureSources = [],
  } = input;
  const errors = [];
  const classEntries = universe.classes ?? {};

  const laneClassByClass = new Map();
  for (const lane of laneState.lanes ?? []) {
    for (const className of lane.classes ?? []) laneClassByClass.set(className, lane.class);
  }

  // 1. An UNAVAILABLE class must not carry files the default runner executes.
  for (const [name, entry] of Object.entries(classEntries)) {
    if (laneClassByClass.get(name) !== 'UNAVAILABLE_CAPABILITY') continue;
    for (const file of entry?.files ?? []) {
      if (matchesDefaultTestMatch(file, testMatchGlobs)) {
        errors.push({
          code: 'VALIDATION_CLASS_UNAVAILABLE_BUT_DEFAULTED',
          detail: `${file} is in class ${name}, whose lane-state is UNAVAILABLE_CAPABILITY, but the default Playwright testMatch executes it`,
        });
      }
    }
  }

  // 2. Every stored `npm run <script>` reference must resolve.
  const knownScripts = new Set(Object.keys(packageScripts));
  const checkScripts = (text, source) => {
    for (const script of npmRunScripts(text)) {
      if (!knownScripts.has(script)) {
        errors.push({ code: 'VALIDATION_EVIDENCE_SCRIPT_MISSING', detail: `${script} referenced by ${source}` });
      }
    }
  };
  for (const [name, entry] of Object.entries(classEntries)) {
    checkScripts(entry?.evidenceLane, `universe class ${name}`);
  }
  for (const lane of laneState.lanes ?? []) {
    checkScripts(lane?.command, `lane-state ${lane?.laneId ?? 'unknown'}`);
  }

  // 3. Every tracked root Playwright config must be bound. The default runner
  // (`playwright test` with no --config) binds `playwright.config.ts` by
  // definition; every other config must be named. Script values default to the
  // script table so a pure caller that supplies only `packageScripts` still
  // gets the same judgement.
  const scriptValues = packageScriptValues.length > 0 ? packageScriptValues : Object.values(packageScripts).map(String);
  const referenceText = [...scriptValues, ...binSources.map((entry) => entry.source ?? ''), retentionEvidence].join('\n');
  const defaultRunnerBindsBaseConfig = scriptValues.some(
    (value) => /playwright\s+test/.test(String(value)) && !/--config/.test(String(value))
  );
  for (const config of trackedPlaywrightConfigs) {
    if (config === 'playwright.config.ts' && defaultRunnerBindsBaseConfig) continue;
    if (!referenceText.includes(config)) {
      errors.push({
        code: 'PLAYWRIGHT_CONFIG_UNBOUND',
        detail: `${config} is referenced by no package.json script, bin launcher, or retention entry`,
      });
    }
  }

  // 4. A fixture that transpiles TypeScript at runtime must use the shared
  // loader, not a local hook.
  for (const fixture of fixtureSources) {
    const source = String(fixture?.source ?? '');
    if (/transpileModule/.test(source) && !/typescript-runtime-loader/.test(source)) {
      errors.push({
        code: 'FIXTURE_TYPESCRIPT_LOADER_FORK',
        detail: `${fixture.file} transpiles TypeScript with a local hook instead of bin/lib/typescript-runtime-loader.mjs`,
      });
    }
  }

  return { errors };
}
