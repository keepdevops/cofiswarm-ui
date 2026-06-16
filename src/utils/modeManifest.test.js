import { applyModeManifest, getModeManifestEntry, PYTHON_ORCHESTRATE_MODES } from './modeManifest';

describe('modeManifest', () => {
  it('keeps C++ production modes first in the UI list', () => {
    const api = [
      { name: 'flat', description: 'a', active: true },
      { name: 'pipeline', description: 'b', active: false },
    ];
    const out = applyModeManifest(api);
    expect(out.slice(0, 2).map(m => m.name)).toEqual(['flat', 'pipeline']);
    expect(out[0].backend).toBe('cpp');
  });

  it('appends Python orchestrate modes even when /api/modes omits them (MS-143 fix)', () => {
    const api = [
      { name: 'flat', active: true },
      { name: 'router', active: false },
    ];
    const out = applyModeManifest(api);
    const py = out.filter(m => m.backend === 'python').map(m => m.name).sort();
    expect(py).toEqual(['critic_debate', 'map_reduce', 'speculative', 'tree_of_thought']);
    expect(py).toEqual([...PYTHON_ORCHESTRATE_MODES].sort());
    expect(out.find(m => m.name === 'map_reduce').active).toBe(false);
  });

  it('includes all Python orchestrate modes in UI list (MS-25-2/3 + MS-26-1 enabled)', () => {
    const api = [
      { name: 'flat', active: true },
      { name: 'map_reduce', active: false },
      { name: 'speculative', active: false },
      { name: 'critic_debate', active: false },
      { name: 'tree_of_thought', active: false },
    ];
    const names = applyModeManifest(api).map(m => m.name);
    expect(names).toContain('map_reduce');
    expect(names).toContain('speculative');
    expect(names).toContain('critic_debate');
    expect(names).toContain('tree_of_thought');
  });

  it('getModeManifestEntry returns python backend and ui:true for all enabled orchestrate modes', () => {
    for (const mode of ['map_reduce', 'speculative', 'critic_debate', 'tree_of_thought']) {
      const entry = getModeManifestEntry(mode);
      expect(entry.backend).toBe('python');
      expect(entry.ui).toBe(true);
      expect(entry.enabled).toBe(true);
    }
  });
});
