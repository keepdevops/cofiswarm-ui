import { computeRiskEstimate, RAM_BLOCK_RATIO, RAM_WARN_RATIO, RAM_TOTAL_GB } from './SwarmConfig.risk';
import { parseModelSizeBillions, HEAVY_ROLES } from './SwarmConfig.layoutHelpers';

// Conservative Q4 bytes-per-parameter, matching SwarmConfig.risk.helpers.
const Q4_GB_PER_B = 0.55;
const FALLBACK_SIZE_B = 8;

/**
 * RAM target ratio per profile: conservative profiles leave headroom (WARN line),
 * aggressive ones use most of RAM (BLOCK/OOM line). So `safe` won't sit at ~92%.
 */
export function profileTargetRatio(profileId) {
  switch (profileId) {
    case 'safe':     return RAM_WARN_RATIO;                         // ~0.78 — most headroom
    case 'balanced': return (RAM_WARN_RATIO + RAM_BLOCK_RATIO) / 2; // ~0.85
    case 'mixed':    return (RAM_WARN_RATIO + RAM_BLOCK_RATIO) / 2; // ~0.85
    case 'max':      return RAM_BLOCK_RATIO;                        // ~0.92 — use most RAM
    default:         return RAM_BLOCK_RATIO;
  }
}

/** Model weight in GB — prefer reported size_bytes, else derive from the size-in-B name. */
export function modelGb(meta) {
  if (meta?.size_bytes > 0) return meta.size_bytes / 1e9;
  const b = parseModelSizeBillions(meta?.path) ?? FALLBACK_SIZE_B;
  return b * Q4_GB_PER_B;
}

/**
 * Make a profile's roster fit the RAM budget so deploying it won't OOM.
 *
 * Strategy (chosen): prefer smaller models first, then trim agents only if it still
 * won't fit. Each step re-projects via computeRiskEstimate (weights + KV + OS/mode
 * overhead) against the block (OOM) threshold of the live host total RAM.
 *
 * @returns {{ selected:Set<string>, roleModels:Object, downsized:Array, trimmed:string[],
 *             projectedGb:number, ramTotalGb:number, targetGb:number }}
 */
export function fitProfileRoster({ picked, roleModels, roles, models, hostMemory, activeMode, deployedAgents = [], targetRatio = RAM_BLOCK_RATIO }) {
  const selected = new Set(picked);
  const nextModels = { ...roleModels };
  const originalModels = { ...roleModels };
  const trimmed = [];

  const ramTotalGb = hostMemory?.ok && Number.isFinite(hostMemory.total_gb)
    ? hostMemory.total_gb : RAM_TOTAL_GB;
  const targetGb = ramTotalGb * targetRatio; // per-profile budget (block=OOM line, warn=headroom)

  const metaFor = (path) => models.find(m => m.path === path);
  const project = () =>
    computeRiskEstimate(roles, selected, nextModels, models, hostMemory, activeMode, deployedAgents).totalRamGb;

  // Phase 1 — downsize the heaviest MODEL group (all roles sharing it) to the next-smaller
  // same-backend model. Operating per-group (not per-role) is essential: a model's weight
  // is counted once per server, so downsizing a single role out of a shared model would
  // split the group and *add* the smaller model's weight on top of the unchanged big one.
  let guard = 0;
  while (project() > targetGb && guard++ < 200) {
    const byModel = new Map(); // current model path -> [roleNames]
    for (const name of selected) {
      const path = nextModels[name];
      if (!path) continue;
      (byModel.get(path) || byModel.set(path, []).get(path)).push(name);
    }
    let best = null; // { rolesUsing, nextPath, curGb }
    for (const [path, rolesUsing] of byModel) {
      const meta = metaFor(path);
      const curGb = modelGb(meta);
      const smaller = models
        .filter(m => m.backend === meta?.backend && modelGb(m) < curGb - 1e-9)
        .sort((a, b) => modelGb(b) - modelGb(a))[0]; // largest still below current = next step down
      if (smaller && (!best || curGb > best.curGb)) {
        best = { rolesUsing, nextPath: smaller.path, curGb };
      }
    }
    if (!best) break; // nothing left to downsize
    for (const name of best.rolesUsing) nextModels[name] = best.nextPath;
  }

  // Phase 2 — trim the lowest-priority role (non-heavy first, then largest footprint)
  // until it fits or only one agent remains.
  guard = 0;
  while (project() > targetGb && selected.size > 1 && guard++ < 200) {
    const victim = [...selected].sort((a, b) => {
      const ha = HEAVY_ROLES.has(a) ? 1 : 0;
      const hb = HEAVY_ROLES.has(b) ? 1 : 0;
      if (ha !== hb) return ha - hb;            // non-heavy (0) trimmed first
      return modelGb(metaFor(nextModels[b])) - modelGb(metaFor(nextModels[a])); // heaviest first
    })[0];
    selected.delete(victim);
    delete nextModels[victim];
    trimmed.push(victim);
  }

  const downsized = [...selected]
    .filter(n => nextModels[n] && originalModels[n] && nextModels[n] !== originalModels[n])
    .map(n => ({ role: n, from: originalModels[n], to: nextModels[n] }));

  return { selected, roleModels: nextModels, downsized, trimmed, projectedGb: project(), ramTotalGb, targetGb };
}
