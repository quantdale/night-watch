// M8 (9.1) test seam: authorize the DEV lane for a launcher's OWN boundary
// tests. The shipped registry refuses every DEV launch unconditionally; these
// tests point the guard at a copy that names an owner citation, so the
// launcher's own argument validation stays reachable and keeps its meaning.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const REPO_ROOT = path.resolve(__dirname, '..', '..');

/** Environment that clears the DEV-lane refusal for a controlled test run. */
export function authorizedDevLaneEnvironment(extra: Record<string, string | undefined> = {}): Record<string, string | undefined> {
  const registry = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'config', 'dev-lane-preconditions.v1.json'), 'utf8')) as {
    ownerAuthorizations: string[];
  };
  registry.ownerAuthorizations = ['D-146'];
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nw-dev-lane-auth-'));
  const registryPath = path.join(dir, 'dev-lane-preconditions.v1.json');
  fs.writeFileSync(registryPath, JSON.stringify(registry, null, 2));
  return {
    ...extra,
    NIGHTWATCH_DEV_LANE_OWNER_TOKEN: 'D-146',
    NIGHTWATCH_DEV_LANE_REGISTRY_PATH: registryPath,
  };
}
