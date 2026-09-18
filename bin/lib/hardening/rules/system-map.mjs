#!/usr/bin/env node
// @ts-check

/**
 * Invariant family: the production-observability System Map.
 *
 * The map's structural boundary and its transport boundary. Kept as its own
 * family because the map is a distinct product surface with its own evidence
 * taxonomy, and a change to it should not read as a change to an unrelated
 * boundary.
 */

import {
  fail,
  withoutComments,
  readIncludingComments,
  read,
  lineOfText,
  codeWithCommentsBlanked,
} from '../kernel.mjs';

/**
 * C-15b system map invariants.
 *
 * The map is the surface an operator trusts, so the rules that matter are the
 * ones that would let it lie quietly: an upgraded fact category, a bound that
 * hides its drop count, a layout whose identity omits a load-bearing input, or
 * a Control Center that grows a verb.
 */
export function checkC15bSystemMapBoundary() {
  const modules = ['src/core/systemMap/model.ts', 'src/core/systemMap/projections.ts', 'src/core/systemMap/layout.ts'];
  for (const file of modules) {
    let source;
    try {
      source = readIncludingComments(file);
    } catch {
      // TOTALITY: a missing module is a finding about THAT module. Returning
      // here abandoned the remaining modules and every later assertion in this
      // rule, so a reviewer repairing the first one discovered the second only
      // on the next run.
      fail(`C-15b the system map module ${file} is missing`);
      continue;
    }
    for (const [pattern, description] of [
      [/from\s+['"]node:fs['"]|require\(['"](?:node:)?fs['"]\)/, 'filesystem authority'],
      [/from\s+['"]node:child_process['"]/, 'process authority'],
      [/from\s+['"]node:(?:net|http|https|dgram|tls)['"]/, 'network authority'],
      [/\beval\s*\(|new\s+Function\s*\(/, 'dynamic evaluation'],
      [/Date\.now\(\)|new Date\(|Math\.random\(/, 'nondeterminism'],
    ]) {
      if (pattern.test(source)) fail(`${file} contains ${description}; the C-15b system map must be deterministic and data-only`);
    }
  }

  const model = readIncludingComments('src/core/systemMap/model.ts');
  const modelCode = read("src/core/systemMap/model.ts");
  const projections = readIncludingComments('src/core/systemMap/projections.ts');
  const projectionsCode = read("src/core/systemMap/projections.ts");
  const layout = readIncludingComments('src/core/systemMap/layout.ts');
  const layoutCode = read("src/core/systemMap/layout.ts");

  // --- evidence is never upgraded ---
  if (!/CATEGORY_RANK\[left\] <= CATEGORY_RANK\[right\] \? left : right/.test(modelCode)) {
    fail('C-15b weakerFactCategory must return the WEAKER category; a join may never strengthen its inputs');
  }
  if (/export function strongerFactCategory/.test(model)) {
    fail('C-15b must not expose a stronger-category helper; its absence is what guarantees no join can upgrade');
  }

  // --- bounds report exact drops, not a flag ---
  for (const field of ['limit', 'total', 'projected', 'dropped', 'truncated', 'remainingUnknown']) {
    if (!new RegExp(`readonly ${field}:`).test(model)) fail(`C-15b ProjectionBound must carry ${field}; a bare truncated flag cannot say how much was dropped`);
  }
  if (!/const dropped = Math\.max\(0, input\.total - input\.projected\);/.test(modelCode)) {
    fail('C-15b the drop count must be derived from the measured total, never asserted');
  }
  if (!/Math\.max\(0, Math\.trunc\(input\.nodeLimit\)\)/.test(projectionsCode)) {
    fail('C-15b projection limits must be clamped before slicing; a negative limit would WIDEN the projection');
  }

  // --- layout identity binds every load-bearing input ---
  for (const bound of ['graphDigest', 'engineId', 'engineVersion', 'projectionVersion', 'options']) {
    if (!new RegExp(`${bound}[,:]`).test(layout)) fail(`C-15b the layout identity must bind ${bound}`);
  }
  if (!/layoutDigest: prefixedDigest24\('systemmaplayout', \{[\s\S]{0,400}?engineVersion: LAYOUT_ENGINE_VERSION/.test(layoutCode)) {
    fail('C-15b the layout digest must include the engine version; a different engine must never collide with this identity');
  }

  // --- empty is not unmeasured ---
  if (!/measurement: 'UNMEASURED'/.test(projectionsCode)) {
    fail('C-15b the observed-production-paths query must report UNMEASURED; C-12 has not run and empty must never imply it did');
  }
  if (!/MEASUREMENT_STATES = \['MEASURED', 'UNMEASURED'\]/.test(projectionsCode)) {
    fail('C-15b a measured zero and an unmeasured zero must remain distinguishable');
  }

  // --- the seven-state coverage vocabulary is preserved ---
  for (const state of ['PROVEN', 'UNPROVEN', 'UNSUPPORTED', 'TRUNCATED', 'STALE', 'UNKNOWN', 'UNMEASURED']) {
    if (!new RegExp(`'${state}'`).test(model)) fail(`C-15b the coverage vocabulary lost ${state}`);
  }

  // --- the Control Center gains no authority ---
  const meta = read('src/controlCenter/adapters/metaAdapter.ts');
  if (!/executionAuthority: 'NONE'/.test(meta) || !/mutationAuthority: 'NONE'/.test(meta)) {
    fail('C-15b the Control Center must keep executionAuthority and mutationAuthority NONE');
  }
  for (const file of modules) {
    if (/prod-findings/.test(readIncludingComments(file))) fail(`${file} names the production findings store; C-10's exclusion is absolute`);
  }

}

// Rule invocations live in the registered runner at the bottom of this file.
// The registry is the enumeration authority: definition/registration parity
// and per-rule probe coverage are enforced by checkRuleEngineSoundness.
export function checkC15cSystemMapTransportBoundary() {
  const contract = readIncludingComments('src/controlCenter/contracts/systemMap.ts');
  const adapter = readIncludingComments('src/controlCenter/adapters/systemMapAdapter.ts');
  const router = readIncludingComments('src/controlCenter/server/router.ts');
  const routerCode = read("src/controlCenter/server/router.ts");
  const server = readIncludingComments('src/controlCenter/server/server.ts');
  // Group 19 split App.tsx into one module per view plus a shared module; the
  // transport-boundary assertions read every component module so the split
  // cannot hide a coercion or an evidence downgrade from this rule.
  const ui = [
    'ui/control-center/src/App.tsx',
    'ui/control-center/src/shared.tsx',
    'ui/control-center/src/views/OverviewView.tsx',
    'ui/control-center/src/views/RunsView.tsx',
    'ui/control-center/src/views/ExecutionGraphView.tsx',
    'ui/control-center/src/views/SourceView.tsx',
    'ui/control-center/src/views/FindingsView.tsx',
    'ui/control-center/src/views/ReviewerView.tsx',
    'ui/control-center/src/views/CampaignView.tsx',
    'ui/control-center/src/views/SafetyView.tsx',
    'ui/control-center/src/views/SystemMapView.tsx',
    'ui/control-center/src/views/PlaceholderView.tsx',
  ].map(readIncludingComments).join('\n');
  const apiClient = readIncludingComments('ui/control-center/src/api.ts');
  const adapterCode = withoutComments(adapter);
  const uiCode = withoutComments(ui);

  // --- the map describes; it never acts ---
  for (const marker of ["executionAuthority: 'NONE'", "mutationAuthority: 'NONE'"]) {
    if (!adapterCode.includes(marker)) {
      fail(`C-15c the system map adapter must state ${marker} on the wire; a map is not a control panel`);
    }
  }
  if (/executionAuthority: '(?!NONE)/.test(adapterCode) || /mutationAuthority: '(?!NONE)/.test(adapterCode)) {
    fail('C-15c no system map answer may carry an authority other than NONE');
  }

  // --- a bound must be able to say "unknown" ---
  const boundDecl = /export interface ControlCenterProjectionBoundDto \{[\s\S]*?\n\}/.exec(contract);
  if (boundDecl === null) {
    fail('C-15c could not read ControlCenterProjectionBoundDto; the bound contract cannot be verified');
  } else {
    const bound = withoutComments(boundDecl[0]);
    for (const field of ['total', 'dropped']) {
      if (!new RegExp(`readonly ${field}: number \\| null;`).test(bound)) {
        fail(`C-15c ProjectionBoundDto.${field} must be nullable; when the population is unknown a drop count is unknowable, and a non-nullable number forces the transport to invent one`);
      }
    }
    if (!/readonly remainingUnknown: boolean;/.test(bound)) {
      fail('C-15c ProjectionBoundDto must carry remainingUnknown, distinguishing a counted drop from an unknown remainder');
    }
  }

  // --- the UI may not render an unknown as a number ---
  const uiSource = codeWithCommentsBlanked(ui);
  for (const coercion of ['total ?? 0', 'dropped ?? 0', 'total || 0', 'dropped || 0', 'Number(bound.total)', 'Number(bound.dropped)']) {
    const line = lineOfText(uiSource, coercion);
    if (line > 0) {
      fail(`C-15c ui/control-center/src:${line} the UI must not coerce an unknown bound to a number (found ${coercion}); a zero tells the operator they have seen everything`);
    }
  }
  if (!/bound\.total === null \? 'unknown'/.test(uiCode) || !/bound\.dropped === null \? 'unknown'/.test(uiCode)) {
    fail("C-15c the UI must render a null total and a null dropped count as 'unknown'");
  }

  // --- an absence of measurement is not a clean result ---
  if (!/measurement === 'UNMEASURED'/.test(uiCode)) {
    fail('C-15c the UI must distinguish UNMEASURED from measured-and-empty; an unmeasured emptiness is not a clean result');
  }

  // --- unknown addresses are rejected, never guessed ---
  if (!/SYSTEM_MAP_LEVEL_SEGMENTS/.test(routerCode) || !/SYSTEM_MAP_QUERY_SEGMENTS/.test(routerCode)) {
    fail('C-15c the router must resolve system map segments against a closed enum, never by pattern');
  }
  if (/startsWith\('\/api\/v2\/system-map/.test(withoutComments(router))) {
    fail('C-15c system map routes must match exact segments, not a prefix; a prefix match answers a question the operator did not ask');
  }

  // --- transport stays read-only, and v1 is never reinterpreted ---
  const serverCode = withoutComments(server);
  if (!/'GET'|'HEAD'/.test(serverCode)) {
    fail('C-15c the control center server must constrain verbs; the system map transport is GET/HEAD only');
  }
  for (const verb of ['POST', 'PUT', 'PATCH', 'DELETE']) {
    if (new RegExp(`case '${verb}'`).test(serverCode)) {
      fail(`C-15c the control center server must not dispatch ${verb}`);
    }
  }

  // --- progressive disclosure is a transport property ---
  if (/\/api\/v2\/system-map\/all|fetchWholeMap|loadEntireSystemMap/.test(withoutComments(apiClient))) {
    fail('C-15c the client must request one disclosure level at a time; a whole-company payload filtered in the browser defeats bounded projection');
  }

  // --- the adapter projects; it never reaches out ---
  for (const forbidden of ['node:fs', 'node:child_process', 'node:net', 'node:https', 'node:http']) {
    if (adapter.includes(`from '${forbidden}'`)) {
      fail(`src/controlCenter/adapters/systemMapAdapter.ts must stay a pure projection (imports ${forbidden})`);
    }
  }
}
