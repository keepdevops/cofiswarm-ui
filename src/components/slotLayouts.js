// Slot-layout presets — toggle the roster between two shapes that actually fit
// this machine (M3 Max / 36GB):
//   • Fast    — the reliable 5-model default (no 14B): each agent on a 7–9B or
//     smaller model, work spread for low latency and memory headroom.
//   • Quality — opt-in: brings back the Qwen2.5-14B for the reasoning agents but
//     stays lean (3 servers, fewer agents, the 14B capped to 2 parallel slots so
//     its KV stays small). Slower, heavier — use when you want max reasoning.
// Each layout maps a role → a model token matched (case-insensitive substring)
// against the available model paths, so it degrades gracefully if a model is
// missing rather than hard-failing.

export const SLOT_LAYOUT_FAST = 'fast';
export const SLOT_LAYOUT_QUALITY = 'quality';

export const SLOT_LAYOUTS = [
  [SLOT_LAYOUT_FAST, 'Fast'],
  [SLOT_LAYOUT_QUALITY, 'Quality'],
];

// role → model token (lower-cased substring of the model path/basename)
const LAYOUTS = {
  [SLOT_LAYOUT_FAST]: {
    architect: 'coder-7b', debugger: 'coder-7b', optimizer: 'coder-7b', programmer: 'coder-7b',
    database: 'meta-llama-3.1-8b', foreman: 'meta-llama-3.1-8b', frontend: 'meta-llama-3.1-8b',
    synthesis: 'meta-llama-3.1-8b', tester: 'meta-llama-3.1-8b',
    reviewer: 'gemma-2-9b', security: 'gemma-2-9b',
    scout: 'gemma-2-2b',
    'mlx-scout': 'llama-3.2-1b-instruct-4bit',
  },
  [SLOT_LAYOUT_QUALITY]: {
    architect: 'qwen2.5-14b', optimizer: 'qwen2.5-14b', synthesis: 'qwen2.5-14b',
    reviewer: 'qwen2.5-14b', security: 'qwen2.5-14b',
    programmer: 'coder-7b', debugger: 'coder-7b', database: 'coder-7b',
    scout: 'gemma-2-2b',
  },
};

// Per-role --parallel override per layout (caps KV on the heavy 14B so it stays
// responsive). Roles absent here get auto (one slot per agent).
const PARALLEL = {
  [SLOT_LAYOUT_QUALITY]: {
    architect: 2, optimizer: 2, synthesis: 2, reviewer: 2, security: 2,
  },
};

export function isSlotLayout(id) {
  return id === SLOT_LAYOUT_FAST || id === SLOT_LAYOUT_QUALITY;
}

/**
 * Resolve a slot layout against the live roster + available models.
 * @returns {{ selected: Set<string>, roleModels: Record<string,string>,
 *             parallel: Record<string,number> }}
 *   Roles whose model token has no matching available model are skipped
 *   (left unselected) rather than assigned a wrong model. `parallel` carries
 *   per-role slot caps for the layout (only for roles that were selected).
 */
export function resolveSlotLayout(layoutId, roles, models) {
  const map = LAYOUTS[layoutId] || {};
  const parallelMap = PARALLEL[layoutId] || {};
  const roleNames = new Set(roles.map(r => r.name));
  const selected = new Set();
  const roleModels = {};
  const parallel = {};
  for (const [role, token] of Object.entries(map)) {
    if (!roleNames.has(role)) continue;
    const match = models.find(m => String(m.path).toLowerCase().includes(token));
    if (match) {
      selected.add(role);
      roleModels[role] = match.path;
      if (parallelMap[role]) parallel[role] = parallelMap[role];
    }
  }
  return { selected, roleModels, parallel };
}
