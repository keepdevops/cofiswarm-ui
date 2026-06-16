import { fitProfileRoster, profileTargetRatio } from './SwarmConfig.profileFit';
import { computeRiskEstimate, RAM_BLOCK_RATIO, RAM_WARN_RATIO } from './SwarmConfig.risk';

const HOST = { ok: true, total_gb: 24, used_gb: 9 };
const targetGb = HOST.total_gb * RAM_BLOCK_RATIO; // ~22.1

const BIG = { path: 'big-22B.gguf', backend: 'llama', size_bytes: 15e9 };
const SMALL = { path: 'small-8B.gguf', backend: 'llama', size_bytes: 5e9 };

const role = (name, ctx = 2048) => ({ name, context: ctx, backend: 'llama' });
const projGb = (roles, selected, roleModels, models) =>
  computeRiskEstimate(roles, selected, roleModels, models, HOST, null).totalRamGb;

describe('fitProfileRoster', () => {
  it('leaves a roster that already fits untouched', () => {
    const roles = [role('tester')];
    const picked = ['tester'];
    const roleModels = { tester: SMALL.path };
    const out = fitProfileRoster({ picked, roleModels, roles, models: [BIG, SMALL], hostMemory: HOST, activeMode: null });
    expect(out.downsized).toEqual([]);
    expect(out.trimmed).toEqual([]);
    expect([...out.selected]).toEqual(['tester']);
    expect(out.projectedGb).toBeLessThanOrEqual(targetGb);
  });

  it('downsizes models (keeping all agents) when the big models would OOM but small ones fit', () => {
    const roles = [role('architect'), role('programmer')];
    const picked = ['architect', 'programmer'];
    const roleModels = { architect: BIG.path, programmer: BIG.path }; // shared big model
    // Sanity: the original projection would OOM.
    expect(projGb(roles, new Set(picked), roleModels, [BIG, SMALL])).toBeGreaterThan(targetGb);

    const out = fitProfileRoster({ picked, roleModels, roles, models: [BIG, SMALL], hostMemory: HOST, activeMode: null });
    expect(out.trimmed).toEqual([]);                 // no agents dropped
    expect(out.selected.size).toBe(2);               // all kept
    expect(out.downsized.length).toBe(2);            // both moved to the smaller model
    out.downsized.forEach(d => expect(d.to).toBe(SMALL.path));
    expect(out.projectedGb).toBeLessThanOrEqual(targetGb);
  });

  it('trims agents when even the smallest available models cannot fit', () => {
    // Four distinct same-size models with NO smaller option → Phase 1 is a no-op, must trim.
    const models = ['m1', 'm2', 'm3', 'm4'].map(n => ({ path: `${n}-8B.gguf`, backend: 'llama', size_bytes: 8e9 }));
    const roles = [role('architect'), role('programmer'), role('tester'), role('scout')];
    const picked = roles.map(r => r.name);
    const roleModels = Object.fromEntries(picked.map((n, i) => [n, models[i].path]));
    expect(projGb(roles, new Set(picked), roleModels, models)).toBeGreaterThan(targetGb);

    const out = fitProfileRoster({ picked, roleModels, roles, models, hostMemory: HOST, activeMode: null });
    expect(out.downsized).toEqual([]);               // nothing smaller to switch to
    expect(out.trimmed.length).toBeGreaterThan(0);   // had to drop agents
    expect(out.selected.size).toBeLessThan(picked.length);
    expect(out.projectedGb).toBeLessThanOrEqual(targetGb); // final roster does not OOM
  });

  it('safe leaves headroom (WARN), max uses most RAM (BLOCK)', () => {
    expect(profileTargetRatio('safe')).toBe(RAM_WARN_RATIO);
    expect(profileTargetRatio('max')).toBe(RAM_BLOCK_RATIO);
    expect(profileTargetRatio('balanced')).toBeGreaterThan(RAM_WARN_RATIO);
    expect(profileTargetRatio('balanced')).toBeLessThan(RAM_BLOCK_RATIO);
  });

  it('respects a tighter targetRatio (safe fits under the WARN line)', () => {
    const roles = [role('architect'), role('programmer')];
    const picked = ['architect', 'programmer'];
    const roleModels = { architect: BIG.path, programmer: BIG.path };
    const out = fitProfileRoster({
      picked, roleModels, roles, models: [BIG, SMALL], hostMemory: HOST, activeMode: null,
      targetRatio: RAM_WARN_RATIO,
    });
    expect(out.projectedGb).toBeLessThanOrEqual(HOST.total_gb * RAM_WARN_RATIO);
  });

  it('drops non-heavy roles before heavy ones when trimming', () => {
    const models = ['m1', 'm2', 'm3', 'm4'].map(n => ({ path: `${n}-8B.gguf`, backend: 'llama', size_bytes: 8e9 }));
    const roles = [role('architect'), role('programmer'), role('tester'), role('scout')];
    const picked = roles.map(r => r.name);
    const roleModels = Object.fromEntries(picked.map((n, i) => [n, models[i].path]));
    const out = fitProfileRoster({ picked, roleModels, roles, models, hostMemory: HOST, activeMode: null });
    // tester + scout (non-heavy) are trimmed before architect/programmer (heavy).
    expect(out.trimmed).toEqual(expect.arrayContaining(['tester', 'scout']));
    expect(out.selected.has('architect') || out.selected.has('programmer')).toBe(true);
  });
});
