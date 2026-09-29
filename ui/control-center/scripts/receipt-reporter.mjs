// VD-02 / corrections task 4.2 — the G18 UI-harness execution receipt writer.
//
// A vitest reporter: after every Control Center test run that executed the F-18
// harness file it records the harness's per-test outcomes, the repository
// HEAD and tree state the run executed at, and the committed ApiErrorKind
// member list under the gitignored artifacts/ scratch. It never fails a run:
// a write failure leaves any previous receipt in place (and, being SHA-bound,
// that receipt proves nothing about a later commit). The pure builder and the
// consuming evaluator live in bin/lib/ui-harness-receipt.mjs.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  UI_HARNESS_RECEIPT_PATH,
  UI_HARNESS_TYPES_PATH,
  buildUiHarnessReceipt,
} from '../../../bin/lib/ui-harness-receipt.mjs';

const repositoryRoot = path.resolve(fileURLToPath(new URL('../../..', import.meta.url)));

function git(args) {
  // A fixed, minimal environment: never the parent environment.
  const environment = { PATH: '/usr/bin:/bin', HOME: repositoryRoot, GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_NOSYSTEM: '1', GIT_OPTIONAL_LOCKS: '0', LANG: 'C', LC_ALL: 'C' };
  const result = spawnSync('git', args, { cwd: repositoryRoot, env: environment, encoding: 'utf8', timeout: 15_000, shell: false });
  return result.status === 0 && typeof result.stdout === 'string' ? result.stdout : null;
}

export default class ReceiptReporter {
  onFinished(files = []) {
    try {
      const head = git(['rev-parse', 'HEAD']);
      const porcelain = git(['status', '--porcelain']);
      let typesSource = null;
      try {
        typesSource = fs.readFileSync(path.join(repositoryRoot, UI_HARNESS_TYPES_PATH), 'utf8');
      } catch {
        typesSource = null;
      }
      const receipt = buildUiHarnessReceipt({
        files,
        headSha: head === null ? null : head.trim(),
        treeClean: porcelain === null ? null : porcelain.trim() === '',
        typesSource,
        executedAt: new Date().toISOString(),
      });
      if (receipt === null) return;
      const target = path.join(repositoryRoot, UI_HARNESS_RECEIPT_PATH);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      const temporary = `${target}.${process.pid}.tmp`;
      fs.writeFileSync(temporary, `${JSON.stringify(receipt, null, 2)}\n`, { mode: 0o600 });
      fs.renameSync(temporary, target);
    } catch {
      // Receipt emission is evidence, never a test outcome.
    }
  }
}
