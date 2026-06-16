import React, { useMemo } from 'react';
import { modelShortName } from './BrewAgentCard';

/**
 * Per-server --parallel override. Each distinct model among the selected agents
 * gets a number input; leaving it blank = auto (one slot per agent). The value
 * is written onto the matching roles as `parallel`, which the deploy body sends
 * verbatim ({...role}) and the proxy honours per model group. Capping slots
 * below the agent count shrinks KV memory (extra agents queue on shared slots).
 */
export default function BrewSlotsPerServer({ roles, selected, roleModels, setRoles }) {
  const groups = useMemo(() => {
    const m = {};
    for (const r of roles) {
      if (!selected.has(r.name)) continue;
      const model = roleModels[r.name];
      if (!model) continue;
      (m[model] = m[model] || []).push(r);
    }
    return Object.entries(m);
  }, [roles, selected, roleModels]);

  if (groups.length === 0) return null;

  const setParallel = (model, value) => {
    const v = value === '' ? undefined : Math.max(1, Math.min(64, parseInt(value, 10) || 1));
    setRoles(prev => prev.map(r =>
      (selected.has(r.name) && roleModels[r.name] === model) ? { ...r, parallel: v } : r));
  };

  return (
    <div className="brew-slots-server">
      <div className="brew-profile-label">Slots / server (parallel)</div>
      {groups.map(([model, rs]) => {
        const cur = rs.find(r => r.parallel)?.parallel;
        return (
          <div key={model} className="brew-slots-row">
            <span className="brew-slots-model" title={model}>{modelShortName(model)}</span>
            <input
              type="number" min={1} max={64}
              className="brew-slots-input"
              placeholder={String(rs.length)}
              value={cur ?? ''}
              onChange={e => setParallel(model, e.target.value)}
              title={`Concurrent slots for this model. Blank = ${rs.length} (one per agent).`}
            />
            <span className="brew-slots-hint">/ {rs.length} agent{rs.length === 1 ? '' : 's'}</span>
          </div>
        );
      })}
    </div>
  );
}
