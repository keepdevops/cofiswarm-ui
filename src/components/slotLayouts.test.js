import { resolveSlotLayout, SLOT_LAYOUT_FAST, SLOT_LAYOUT_QUALITY, isSlotLayout } from './slotLayouts';

const roles = [
  'architect', 'database', 'debugger', 'foreman', 'frontend', 'mlx-scout',
  'optimizer', 'programmer', 'reviewer', 'scout', 'security', 'synthesis', 'tester',
].map(name => ({ name }));

const models = [
  { path: '/m/large/Qwen2.5-14B-Instruct-Q4_K_M.gguf', backend: 'llama' },
  { path: '/m/medium/qwen2.5-coder-7b-instruct-q4_k_m.gguf', backend: 'llama' },
  { path: '/m/large/gemma-2-9b-it-Q4_K_M.gguf', backend: 'llama' },
  { path: '/m/medium/Meta-Llama-3.1-8B-Instruct-Q4_K_M.gguf', backend: 'llama' },
  { path: '/m/small/gemma-2-2b-it-Q4_K_M.gguf', backend: 'llama' },
  { path: '/m/MLX/MLX/Llama-3.2-1B-Instruct-4bit', backend: 'mlx' },
];

const distinctModels = (roleModels) => new Set(Object.values(roleModels)).size;

test('Fast layout selects all 13 agents across 5 models, no 14B', () => {
  const { selected, roleModels, parallel } = resolveSlotLayout(SLOT_LAYOUT_FAST, roles, models);
  expect(selected.size).toBe(13);
  expect(distinctModels(roleModels)).toBe(5);
  expect(Object.values(roleModels).some(p => /14B/.test(p))).toBe(false);
  expect(roleModels.architect).toMatch(/coder-7b/);
  expect(roleModels['mlx-scout']).toMatch(/Llama-3\.2-1B-Instruct-4bit/);
  expect(parallel).toEqual({}); // Fast has no slot caps
});

test('Quality layout: 14B reasoning agents + coder + gemma-2b, with parallel caps', () => {
  const { selected, roleModels, parallel } = resolveSlotLayout(SLOT_LAYOUT_QUALITY, roles, models);
  expect(selected.size).toBe(9);
  expect(distinctModels(roleModels)).toBe(3);
  expect(roleModels.architect).toMatch(/Qwen2\.5-14B/);
  expect(roleModels.programmer).toMatch(/coder-7b/);
  // the 14B reasoning agents are capped to 2 slots
  expect(parallel.architect).toBe(2);
  expect(parallel.security).toBe(2);
  expect(parallel.programmer).toBeUndefined(); // coder agent, no cap
});

test('roles whose model is unavailable are skipped, not mis-assigned', () => {
  const noGemma = models.filter(m => !/gemma/.test(m.path));
  const { selected, roleModels } = resolveSlotLayout(SLOT_LAYOUT_FAST, roles, noGemma);
  expect(selected.has('reviewer')).toBe(false); // gemma-9b gone
  expect(roleModels.reviewer).toBeUndefined();
  expect(selected.has('architect')).toBe(true); // coder-7b still present
});

test('isSlotLayout recognizes layout ids only', () => {
  expect(isSlotLayout(SLOT_LAYOUT_FAST)).toBe(true);
  expect(isSlotLayout(SLOT_LAYOUT_QUALITY)).toBe(true);
  expect(isSlotLayout('safe')).toBe(false);
  expect(isSlotLayout('layout6')).toBe(false);
});
