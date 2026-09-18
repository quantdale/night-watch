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

const onlyArgument = process.argv.find((argument) => argument.startsWith('--only='));
const onlyRule = onlyArgument?.slice('--only='.length);

if (process.argv.includes('--list-rules')) {
  const probeRegistry = JSON.parse(readDataFile(PROBE_REGISTRY_PATH));
  console.log(JSON.stringify({
    schemaVersion: 'nightwatch.hardening-rule-registry.v1',
    count: REGISTERED_RULES.length,
    rules: REGISTERED_RULES.map((rule) => ({
      name: rule.name, family: rule.family, quantifier: rule.quantifier, subject: rule.subject,
      probeCount: (probeRegistry.probes?.[rule.name] ?? []).length,
    })),
  }, null, 2));
  process.exit(0);
} else if (process.argv.includes('--probe-campaign')) {
  runRuleProbeCampaign(REGISTERED_RULES, onlyRule, fileURLToPath(import.meta.url));
} else if (process.argv.includes('--report-reachability')) {
  const config = readReferenceGraphConfig('SOURCE_REACHABILITY');
  const graph = referenceGraph();
  const findings = config === null ? [] : evaluateReferenceGraph(graph, config);
  console.log(`[reachability] files=${graph.files.length} parsed=${graph.parsed} edges=${graph.edges.length}`);
  for (const finding of findings) console.log(`[reachability] ${finding.code} ${finding.detail}`);
  console.log(`[reachability] findings=${findings.length} (reporting mode; nothing failed)`);
  process.exit(0);
} else if (process.argv.includes('--report-documentation-currency')) {
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
  if (onlyRule !== undefined && !REGISTERED_RULES.some((rule) => rule.name === onlyRule)) {
    console.error(`[hardening:check] ERROR: --only names an unregistered rule: ${onlyRule}`);
    process.exitCode = 2;
  } else {
    for (const rule of REGISTERED_RULES) {
      if (onlyRule !== undefined && rule.name !== onlyRule) continue;
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
