import { MODE_MANIFEST } from './modeManifestData';

const DEFAULT_META = { backend: 'cpp', enabled: true, ui: true, memoryWeight: 1 };

/**
 * Modes served by the Python orchestrate sidecar (:3003 /api/orchestrate). The
 * coordinator's /api/modes lists only C++ modes, so these are merged in from the
 * manifest and tracked client-side (the coordinator's set_active rejects them).
 */
export const PYTHON_ORCHESTRATE_MODES = new Set(
  Object.entries(MODE_MANIFEST)
    .filter(([, meta]) => meta.backend === 'python')
    .map(([name]) => name),
);

/**
 * Merge coordinator /api/modes entries with MS-24 mode manifest metadata, then
 * append the Python orchestrate modes (which /api/modes never reports).
 * Drops modes marked ui:false or enabled:false.
 */
export function applyModeManifest(apiModes) {
  if (!Array.isArray(apiModes)) return [];
  const cppModes = apiModes
    .map((m) => {
      const meta = MODE_MANIFEST[m.name] || DEFAULT_META;
      return {
        ...m,
        backend: meta.backend || DEFAULT_META.backend,
        enabled: meta.enabled !== false,
        ui: meta.ui !== false,
        manifestNote: meta.note || null,
        description: meta.description || null,
      };
    })
    .filter((m) => m.enabled && m.ui);

  const present = new Set(cppModes.map((m) => m.name));
  const pythonModes = Object.entries(MODE_MANIFEST)
    .filter(([name, meta]) => meta.backend === 'python'
      && meta.enabled !== false && meta.ui !== false && !present.has(name))
    .map(([name, meta]) => ({
      name,
      active: false,
      backend: meta.backend,
      enabled: true,
      ui: true,
      manifestNote: meta.note || null,
      description: meta.description || null,
    }));

  return [...cppModes, ...pythonModes];
}

export function getModeManifestEntry(name) {
  return MODE_MANIFEST[name] || DEFAULT_META;
}

export function getModeMemoryWeight(name) {
  const w = getModeManifestEntry(name).memoryWeight;
  return Number.isFinite(w) && w > 0 ? w : 1;
}

export { MODE_MANIFEST };
