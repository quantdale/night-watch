// Campaign 15.B — checkpoint-role classification, adversarially.
//
// `config/ci-block-record.v1.json` is the exact-head CI authority. Certifying a new
// checkpoint REQUIRES observing the run at it and refreshing the record, but the
// record is also the thing that must never be rewritable. Before this guard it was
// neither guarded nor checkpoint-approved, so any re-observation made the whole
// S..HEAD range substantive and demoted every working-tree probe — the exact
// structural conflict the terminal certification campaign hit.
//
// These tests drive `checkpointRoleViolations` over a REAL Git repository and prove
// both directions:
//   (a) the ONE admissible re-observation is admitted; and
//   (b) every real source, configuration, validation and authority change still
//       invalidates the certification — including a forged run, a rewritten
//       history entry, a moved revisit date and an unapproved path.
//
// Nothing here approves a path broadly: `config/ci-block-record.v1.json` remains
// admissible ONLY as a values-only re-observation whose recorded head is provably
// an ancestor of the commit being judged.

import { test, expect } from '@playwright/test';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { checkpointRoleViolations } from '../../bin/lib/checkpoint-role.mjs';
import { bindingReceiptVerifier } from '../../bin/lib/checkpoint-binding.mjs';

const CI_FILE = 'config/ci-block-record.v1.json';
const RUN_A = '12345678';
const RUN_B = '87654321';
const JOB_A = '111111111111';
const JOB_B = '222222222222';

interface Repo {
  readonly root: string;
  S: string;
  git(args: string[]): string | null;
  write(file: string, text: string): void;
  commit(message: string): string;
  rangeViolations(from: string, to?: string): string[];
  cleanup(): void;
}

function repo(): Repo {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'nw-ciblock-'));
  const environment = {
    PATH: process.env.PATH ?? '', HOME: root, GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_NOSYSTEM: '1',
    GIT_AUTHOR_NAME: 'nw', GIT_AUTHOR_EMAIL: 'nw@example.invalid', GIT_COMMITTER_NAME: 'nw', GIT_COMMITTER_EMAIL: 'nw@example.invalid', LANG: 'C',
  };
  const raw = (args: string[]) => spawnSync('git', args, { cwd: root, env: environment, encoding: 'utf8', shell: false });
  const git = (args: string[]): string | null => (raw(args).status === 0 ? (raw(args).stdout ?? '') : null);
  raw(['init', '--quiet', '-b', 'main']);
  const write = (file: string, text: string) => {
    fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    fs.writeFileSync(path.join(root, file), text);
  };
  const commit = (message: string): string => {
    raw(['add', '--all']);
    raw(['commit', '--quiet', '--no-gpg-sign', '-m', message]);
    return (raw(['rev-parse', 'HEAD']).stdout ?? '').trim();
  };
  const rangeViolations = (from: string, to: string = (raw(['rev-parse', 'HEAD']).stdout ?? '').trim()) => checkpointRoleViolations(root,
    git(['diff', '--name-only', '--no-renames', `${from}..${to}`])?.split('\n').map((line) => line.trim()).filter(Boolean) ?? [],
    { kind: 'range', from, to, verifyBindingReceipt: bindingReceiptVerifier(root) });
  const result: Repo = { root, S: '', git, write, commit, rangeViolations, cleanup: () => fs.rmSync(root, { recursive: true, force: true }) };
  write('src/code.ts', 'export const x = 1;\n');
  write('src/other.ts', 'export const y = 2;\n');
  write('docs/CURRENT_STATE.md', 'seed\n');
  result.write(CI_FILE, ciRecord(RUN_A, JOB_A, result.S));
  result.S = commit('S — the certified checkpoint');
  return result;
}

/** A syntactically valid CI block record whose observation is provably inside history. */
function ciRecord(runId: string, jobId: string, observedSha: string, extra: (record: Record<string, unknown>) => void = () => {}) {
  const record: Record<string, unknown> = {
    schemaVersion: 'nightwatch.ci-block-record.v1',
    definitionName: 'Nightwatch exact-head CI block record (F-02)',
    note: 'a fixed descriptive note',
    runId,
    jobId,
    observedSha,
    blockClass: 'EXECUTED_PASS',
    observedDate: '2026-10-11',
    ownerAction: 'None required.',
    revisitCondition: 'Re-observe each push.',
    revisitDate: '2026-12-31',
    observedStepCount: 15,
    routeSelection: { state: 'SELECTED_BY_OWNER', ownerDecision: '3.11', selectedRouteId: 'github-hosted-execution-restored' },
    history: [],
  };
  extra(record);
  return `${JSON.stringify(record, null, 2)}\n`;
}

test.describe('15.B the CI block record re-observation guard', () => {
  test('the admissible re-observation is admitted and the descendant stays documentary', () => {
    const r = repo();
    try {
      // A new checkpoint with a REAL implementation change in it (the checkpoint's own commit).
      r.write('src/code.ts', 'export const x = 2;\n');
      r.commit("S' — a new substantive checkpoint");
      // Then ONLY the observation is refreshed — no implementation change at all.
      const sPrime = r.git(['rev-parse', 'HEAD'])?.trim() ?? '';
      r.write(CI_FILE, ciRecord(RUN_B, JOB_B, sPrime, (record) => {
        record.history = [{ runId: RUN_B, jobId: JOB_B, observedSha: sPrime, observedDate: '2026-10-11', classification: 'EXECUTED_PASS', detail: 'green at S', runCreatedAt: '2026-10-11T00:00:00Z' }];
      }));
      r.commit('docs: record the executed run at the new checkpoint');
      // The re-observation commit alone is documentary, so judging only that commit's
      // change against the checkpoint it observes yields no violation.
      expect(r.rangeViolations(sPrime)).toEqual([]);
    } finally {
      r.cleanup();
    }
  });

  test('a REAL source change still invalidates the classification', () => {
    const r = repo();
    try {
      r.write('src/code.ts', 'export const x = 3;\n');
      r.commit('feat: a real implementation change');
      expect(r.rangeViolations(r.S)).toEqual(['src/code.ts']);
    } finally {
      r.cleanup();
    }
  });

  test('a REAL validation change still invalidates the classification', () => {
    const r = repo();
    try {
      r.write('tests/unit/projectState.test.ts', '// a new assertion\n');
      r.commit('test: a new validation assertion');
      expect(r.rangeViolations(r.S)).toEqual(['tests/unit/projectState.test.ts']);
    } finally {
      r.cleanup();
    }
  });

  test('a REAL configuration change still invalidates the classification', () => {
    const r = repo();
    try {
      r.write('config/release-evidence.v1.json', `${JSON.stringify({ schemaVersion: 'nightwatch.release-evidence.v1', bindings: [] }, null, 2)}\n`);
      r.commit('feat: change an unlisted binding file');
      expect(r.rangeViolations(r.S)).toContain('config/release-evidence.v1.json');
    } finally {
      r.cleanup();
    }
  });

  test('recording a run at a head that is NOT in the repository fails closed', () => {
    const r = repo();
    try {
      const forged = 'f'.repeat(40);
      r.write(CI_FILE, ciRecord(RUN_B, JOB_B, forged, (record) => {
        record.history = [{ runId: RUN_B, jobId: JOB_B, observedSha: forged, observedDate: '2026-10-11', classification: 'EXECUTED_PASS' }];
      }));
      r.commit('docs: record a run at a head this repository never had');
      expect(r.rangeViolations(r.S)).toEqual([CI_FILE]);
    } finally {
      r.cleanup();
    }
  });

  test('recording a run at a head that is not an ANCESTOR of the judged commit fails closed', () => {
    const r = repo();
    try {
      // A head that exists in this repository's object database but is on a
      // DIVERGENT branch, so it is never an ancestor of the commit being judged.
      r.write('src/other.ts', 'export const y = 99;\n');
      r.git(['checkout', '--quiet', '-b', 'side']);
      r.write('src/code.ts', 'export const x = 42;\n');
      const divergent = r.commit('an unrelated branch head');
      r.git(['checkout', '--quiet', 'main']);
      // Back on main: refresh the observation to name the divergent head.
      r.write(CI_FILE, ciRecord(RUN_B, JOB_B, divergent, (record) => {
        record.history = [{ runId: RUN_B, jobId: JOB_B, observedSha: divergent, observedDate: '2026-10-11', classification: 'EXECUTED_PASS' }];
      }));
      r.commit('docs: record a divergent head as the observed run');
      const head = r.git(['rev-parse', 'HEAD'])?.trim() ?? '';
      expect(head).not.toBe('');
      expect(divergent).not.toBe(head);
      // The recorded head exists but is not an ancestor of the re-observation commit.
      expect(r.rangeViolations(r.S, head)).toEqual([CI_FILE]);
    } finally {
      r.cleanup();
    }
  });

  test('rewriting a recorded history entry fails closed', () => {
    const r = repo();
    try {
      const withHistory = ciRecord(RUN_A, JOB_A, r.S, (record) => {
        record.history = [{ runId: RUN_A, jobId: JOB_A, observedSha: r.S, observedDate: '2026-10-08', classification: 'EXECUTED_PASS' }];
      });
      r.write(CI_FILE, withHistory);
      r.commit('docs: seed one observed run');
      const edited = ciRecord(RUN_A, JOB_A, r.S, (record) => {
        record.history = [{ runId: RUN_A, jobId: JOB_A, observedSha: r.S, observedDate: '2026-10-09', classification: 'EXECUTED_FAIL' }];
      });
      r.write(CI_FILE, edited);
      r.commit('docs: rewrite that run');
      expect(r.rangeViolations(r.S)).toEqual([CI_FILE]);
    } finally {
      r.cleanup();
    }
  });

  test('removing a recorded history entry fails closed', () => {
    const r = repo();
    try {
      r.write(CI_FILE, ciRecord(RUN_A, JOB_A, r.S, (record) => {
        record.history = [{ runId: RUN_A, jobId: JOB_A, observedSha: r.S, observedDate: '2026-10-08', classification: 'EXECUTED_PASS' }];
      }));
      r.commit('docs: seed one observed run');
      r.write(CI_FILE, ciRecord(RUN_A, JOB_A, r.S));
      r.commit('docs: drop the history');
      expect(r.rangeViolations(r.S)).toEqual([CI_FILE]);
    } finally {
      r.cleanup();
    }
  });

  test('moving the revisit date earlier (manufacturing freshness) fails closed', () => {
    const r = repo();
    try {
      r.write(CI_FILE, ciRecord(RUN_B, JOB_B, r.S, (record) => { record.revisitDate = '2026-01-01'; }));
      r.commit('docs: make an old run look fresh');
      expect(r.rangeViolations(r.S)).toEqual([CI_FILE]);
    } finally {
      r.cleanup();
    }
  });

  test('changing the route selection or the schema version fails closed', () => {
    const r = repo();
    try {
      r.write(CI_FILE, ciRecord(RUN_A, JOB_A, r.S, (record) => {
        record.routeSelection = { state: 'SELECTED_BY_OWNER', ownerDecision: '3.11', selectedRouteId: 'some-other-route' };
      }));
      r.commit('docs: reselect the execution route');
      expect(r.rangeViolations(r.S)).toEqual([CI_FILE]);
    } finally {
      r.cleanup();
    }
  });

  test('a re-observation with no matching history entry fails closed', () => {
    const r = repo();
    try {
      r.write(CI_FILE, ciRecord(RUN_B, JOB_B, r.S, (record) => {
        record.history = [{ runId: RUN_A, jobId: JOB_A, observedSha: r.S, observedDate: '2026-10-08', classification: 'EXECUTED_PASS' }];
      }));
      r.commit('docs: change the observation without recording it');
      expect(r.rangeViolations(r.S)).toEqual([CI_FILE]);
    } finally {
      r.cleanup();
    }
  });

  test('an appended entry with an undeclared classification fails closed', () => {
    const r = repo();
    try {
      r.write(CI_FILE, ciRecord(RUN_B, JOB_B, r.S, (record) => {
        record.history = [{ runId: RUN_B, jobId: JOB_B, observedSha: r.S, observedDate: '2026-10-11', classification: 'EXECUTED_MAYBE' }];
      }));
      r.commit('docs: record an undeclared classification');
      expect(r.rangeViolations(r.S)).toEqual([CI_FILE]);
    } finally {
      r.cleanup();
    }
  });

  test('an additively WIDENED record fails closed', () => {
    const r = repo();
    try {
      r.write(CI_FILE, ciRecord(RUN_B, JOB_B, r.S, (record) => {
        record.someNewAuthorityField = { approve: true };
        record.history = [{ runId: RUN_B, jobId: JOB_B, observedSha: r.S, observedDate: '2026-10-11', classification: 'EXECUTED_PASS' }];
      }));
      r.commit('docs: add an unknown field');
      expect(r.rangeViolations(r.S)).toEqual([CI_FILE]);
    } finally {
      r.cleanup();
    }
  });

  test('an unapproved path inside the range still makes the descendant substantive', () => {
    const r = repo();
    try {
      // Even a perfectly admissible CI re-observation cannot rescue a range that
      // also contains a real implementation change.
      r.write('src/other.ts', 'export const y = 4;\n');
      const sPrime = r.commit("S' — new checkpoint");
      r.write(CI_FILE, ciRecord(RUN_B, JOB_B, sPrime, (record) => {
        record.history = [{ runId: RUN_B, jobId: JOB_B, observedSha: sPrime, observedDate: '2026-10-11', classification: 'EXECUTED_PASS' }];
      }));
      r.write('src/code.ts', 'export const x = 5;\n');
      r.commit('feat: a real change beside the re-observation');
      expect(r.rangeViolations(r.S)).toContain('src/code.ts');
    } finally {
      r.cleanup();
    }
  });

  test('an unapproved evidence-receipt path fails closed', () => {
    const r = repo();
    try {
      // `evidence/<sha>/…` is NOT the guarded `evidence/certification/<sha>/…`
      // shape, so it can never be admitted by the ADD_ONLY guard.
      r.write('evidence/3ff77954d613ce17e907d55e3a51e05efa5d90e8/some-subject.json', '{"not":"a certification path"}\n');
      r.commit('docs: write outside the certification directory');
      expect(r.rangeViolations(r.S)).toContain('evidence/3ff77954d613ce17e907d55e3a51e05efa5d90e8/some-subject.json');
    } finally {
      r.cleanup();
    }
  });
});
