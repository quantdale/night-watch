/**
 * Child-process configuration for the Phase 2A authenticated observer.
 *
 * The CLI option is the only source of an explicit UI override. An ambient
 * NIGHTWATCH_UI_URL must not leak into the gate or observation when the
 * option was omitted, because the canonical selected-environment target is
 * the safe default.
 */
export function parseObserveAuthenticatedArgs(args) {
  let env;
  let storage;
  let uiUrl;
  let help = false;
  for (const arg of args) {
    if (arg === '--help' || arg === '-h') {
      help = true;
    } else if (arg.startsWith('--env=')) {
      if (env !== undefined) throw new Error('observe:authenticated accepts --env only once');
      env = arg.slice('--env='.length);
    } else if (arg.startsWith('--storage-state=')) {
      if (storage !== undefined) throw new Error('observe:authenticated accepts --storage-state only once');
      storage = arg.slice('--storage-state='.length);
    } else if (arg.startsWith('--ui-url=')) {
      if (uiUrl !== undefined) throw new Error('observe:authenticated accepts --ui-url only once');
      uiUrl = arg.slice('--ui-url='.length);
    } else {
      throw new Error(`observe:authenticated does not accept option ${arg}`);
    }
  }
  if (uiUrl !== undefined && uiUrl.trim() === '') {
    throw new Error('observe:authenticated rejects an explicit blank --ui-url; omit it to use the canonical environment target');
  }
  if (help) return { help: true, env, storage, uiUrl };
  if (env === undefined || storage === undefined || storage.trim() === '') {
    throw new Error('observe:authenticated requires exactly one --env=dev|next and --storage-state=/absolute/external/state.json');
  }
  return { help: false, env, storage, uiUrl };
}

export function buildObserveAuthenticatedEnvironment(parentEnvironment, options) {
  const { NIGHTWATCH_UI_URL: _ambientUiUrl, ...inheritedEnvironment } = parentEnvironment;
  return {
    ...inheritedEnvironment,
    NIGHTWATCH_ENV: options.env,
    NIGHTWATCH_STORAGE_STATE: options.storage,
    ...(options.uiUrl === undefined ? {} : { NIGHTWATCH_UI_URL: options.uiUrl }),
  };
}
