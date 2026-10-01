#!/usr/bin/env node
// @ts-check

/**
 * Deterministic, offline repository hardening check.
 *
 * This is intentionally a small structural gate. It does not inspect a
 * network, credentials, sibling repositories, databases, or runtime state.
 *
 * G16.9 reduced this file to ORCHESTRATION. It owns argument parsing, mode
 * dispatch and reporting, and nothing else:
 *
 *   bin/lib/hardening/kernel.mjs          source accessors, findings, helpers
 *   bin/lib/hardening/rules/*.mjs         the rules, by invariant family
 *   bin/lib/hardening/registry.mjs        the enumeration authority
 *   bin/lib/hardening/probe-campaign.mjs  the rule mutation campaign
 *
 * A rule is NEVER defined here. `checkRuleEngineSoundness` fails a `check*`
 * definition in this file, because a rule that lives outside a family module
 * sits outside the registry's discovery and would never be enumerated.
 */
import { fileURLToPath } from 'node:url';
import { errors, readDataFile, PROBE_REGISTRY_PATH } from './lib/hardening/kernel.mjs';
import { REGISTERED_RULES } from './lib/hardening/registry.mjs';
import { runRuleProbeCampaign } from './lib/hardening/probe-campaign.mjs';
import {
  evaluateReferenceGraph,
  readReferenceGraphConfig,
  referenceGraph,
} from './lib/hardening/rules/source-integrity.mjs';
import { OPERATOR_CLI_SCHEMA, defineOperatorCli } from './lib/operator-cli.mjs';

/**
 * A-12 / 10.2: the shared operator-CLI contract. `--help`/`--print-metadata`
 * answer through the shared parser without running a rule, an unknown option is
 * refused with exit 2, and the six bounded modes below are unchanged.
 */
/** @type {import('./lib/operator-cli.mjs').OperatorCliMetadata} */
const CLI_METADATA = {
  schemaVersion: OPERATOR_CLI_SCHEMA,
  name: 'hardening-check',
  entry: 'bin/hardening-check.mjs',
  purpose: 'Run the offline structural invariants (and, in campaign mode, the registered mutation probes) that guard this repository.',
  group: 'validate',
  flags: [
    { name: '--only', shape: 'string', summary: 'run one named rule only' },
    { name: '--family', shape: 'string', repeatable: true, summary: 'run only rules in the named famil(ies)' },
    { name: '--list-rules', shape: 'boolean', summary: 'print the registered rule registry as one JSON document' },
    { name: '--probe-campaign', shape: 'boolean', summary: 'run the rule mutation campaign (every probe must be DETECTED)' },
    { name: '--report-reachability', shape: 'boolean', summary: 'report source reachability findings without failing' },
    { name: '--report-documentation-currency', shape: 'boolean', summary: 'report documentation-currency findings without failing' },
  ],
  json: false,
  authorization: 'LOCAL_ONLY',
  artifacts: [],
};

const cli = defineOperatorCli(CLI_METADATA, { entryUrl: import.meta.url });

if (cli.stop) {
  // The shared parser answered --help/--print-metadata or refused an argument;
  // no rule ran.
} else {

const onlyRule = typeof cli.flags['--only'] === 'string' ? cli.flags['--only'] : undefined;
// F-PERF-7: a bounded rule-family scope for test harnesses that prove one
// boundary family bites. The gate never passes this flag, so the full
// registry remains the gate rule set; an unknown family fails closed.
const familyArguments = (Array.isArray(cli.flags['--family'])
  ? cli.flags['--family']
  : typeof cli.flags['--family'] === 'string' ? [cli.flags['--family']] : [])
  .filter((value) => typeof value === 'string' && value.length > 0);

if (cli.flags['--list-rules'] === true) {
  let probeRegistry;
  try {
    probeRegistry = JSON.parse(readDataFile(PROBE_REGISTRY_PATH));
  } catch {
    console.error(`[hardening] PROBE_REGISTRY_UNREADABLE: ${PROBE_REGISTRY_PATH}`);
    process.exit(2);
  }
  console.log(JSON.stringify({
    schemaVersion: 'nightwatch.hardening-rule-registry.v1',
    count: REGISTERED_RULES.length,
    rules: REGISTERED_RULES.map((rule) => ({
      name: rule.name, family: rule.family, quantifier: rule.quantifier, subject: rule.subject,
      probeCount: (probeRegistry.probes?.[rule.name] ?? []).length,
    })),
  }, null, 2));
  process.exit(0);
} else if (cli.flags['--probe-campaign'] === true) {
  runRuleProbeCampaign(REGISTERED_RULES, onlyRule, fileURLToPath(import.meta.url));
} else if (cli.flags['--report-reachability'] === true) {
  const config = readReferenceGraphConfig('SOURCE_REACHABILITY');
  const graph = referenceGraph();
  const findings = config === null ? [] : evaluateReferenceGraph(graph, config);
  console.log(`[reachability] files=${graph.files.length} parsed=${graph.parsed} edges=${graph.edges.length}`);
  for (const finding of findings) console.log(`[reachability] ${finding.code} ${finding.detail}`);
  console.log(`[reachability] findings=${findings.length} (reporting mode; nothing failed)`);
  process.exit(0);
} else if (cli.flags['--report-documentation-currency'] === true) {
  // Reporting mode: the same three rules that run blocking in the gate, with
  // their findings printed instead of failing. Used to migrate documents
  // without turning the gate red while the repair is in progress.
  const documentationCurrencyRules = new Set(['checkDocumentRoleCurrency', 'checkAppendOnlyArchives', 'checkGovernedStatusWords']);
  const before = errors.length;
  for (const rule of REGISTERED_RULES) if (documentationCurrencyRules.has(rule.name)) rule.run();
  const found = errors.splice(before);
  for (const error of found) console.log(`[report] ${error}`);
  console.log(`[report] documentation-currency: ${found.length} finding${found.length === 1 ? '' : 's'} (reporting mode; nothing failed)`);
  process.exit(0);
} else {
  const knownFamilies = new Set(REGISTERED_RULES.map((rule) => rule.family));
  const unknownFamilies = familyArguments.filter((family) => !knownFamilies.has(family));
  if (onlyRule !== undefined && !REGISTERED_RULES.some((rule) => rule.name === onlyRule)) {
    console.error(`[hardening:check] ERROR: --only names an unregistered rule: ${onlyRule}`);
    process.exitCode = 2;
  } else if (unknownFamilies.length > 0) {
    console.error(`[hardening:check] ERROR: --family names an unregistered family: ${unknownFamilies.join(", ")}`);
    process.exitCode = 2;
  } else {
    for (const rule of REGISTERED_RULES) {
      if (onlyRule !== undefined && rule.name !== onlyRule) continue;
      if (familyArguments.length > 0 && !familyArguments.includes(rule.family)) continue;
      rule.run();
    }
  }
}

if (errors.length > 0) {
  for (const error of errors) console.error(`[hardening:check] ERROR: ${error}`);
  console.error(`[hardening:check] FAIL (${errors.length} error${errors.length === 1 ? '' : 's'})`);
  process.exitCode = process.exitCode === 2 ? 2 : 1;
} else if (process.exitCode === undefined) {
  console.log('[hardening:check] PASS: offline structural invariants hold');
}

}
