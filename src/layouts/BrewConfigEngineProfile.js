import React from 'react';
import { ENGINES, PROFILES } from '../components/SwarmConfig.helpers';
import { SLOT_LAYOUTS, SLOT_LAYOUT_FAST } from '../components/slotLayouts';

export default function BrewConfigEngineProfile({
  models, engine, handleEngineChange, activeProfile, applyProfile, applySlotLayout, reset, profileFit,
}) {
  const fitted = profileFit && (profileFit.downsized.length > 0 || profileFit.trimmed.length > 0);
  return (
    <>
      <div className="brew-section">
        <div className="brew-section-header">
          <span className="brew-section-title">Engines</span>
        </div>
        <div className="brew-section-body">
          <div className="brew-engine-pills">
            {ENGINES.map(e => {
              const count = models.filter(m => m.backend === e.backend).length;
              return (
                <button
                  key={e.id}
                  type="button"
                  className={`brew-engine-pill${engine === e.id ? ' active' : ''}${count === 0 ? ' disabled' : ''}`}
                  onClick={() => count > 0 && handleEngineChange(e.id)}
                  title={`${count} model${count !== 1 ? 's' : ''} available`}
                >
                  {e.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="brew-section">
        <div className="brew-section-header">
          <span className="brew-section-title">Profile</span>
        </div>
        <div className="brew-section-body">
          <div className="brew-profile-label">Preset</div>
          <div className="brew-profile-dropdowns">
            <select
              className="brew-profile-select"
              value={activeProfile}
              onChange={e => applyProfile(e.target.value, reset)}
            >
              {PROFILES.map(([id, label]) => (
                <option key={id} value={id}>{label}</option>
              ))}
            </select>
          </div>
          {applySlotLayout && (
            <>
              <div className="brew-profile-label">Slots</div>
              <div className="brew-slot-toggle" role="group" aria-label="Slot layout">
                {SLOT_LAYOUTS.map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    className={`brew-slot-toggle-btn${activeProfile === id ? ' active' : ''}`}
                    onClick={() => applySlotLayout(id, reset)}
                    title={id === SLOT_LAYOUT_FAST
                      ? 'Fast: 5 models (no 14B), work spread — low latency, memory headroom (the reliable default)'
                      : 'Quality: brings back the 14B for reasoning agents, lean 3-server layout (capped) — slower, heavier'}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </>
          )}
          <p className="brew-profile-hint">
            Presets fill the roster; use <strong>Custom</strong> and click agents to pick individually.
          </p>
          {fitted && (
            <p
              className="brew-profile-fit"
              title={`Projected ~${profileFit.projectedGb.toFixed(1)} GB of ${profileFit.ramTotalGb.toFixed(0)} GB budget`}
            >
              ♻ Fitted to {profileFit.agents} agent{profileFit.agents === 1 ? '' : 's'} (~{profileFit.projectedGb.toFixed(0)} GB)
              {profileFit.downsized.length > 0 &&
                ` · ${profileFit.downsized.length} model${profileFit.downsized.length === 1 ? '' : 's'} downsized`}
              {profileFit.trimmed.length > 0 &&
                ` · ${profileFit.trimmed.length} trimmed to avoid OOM`}
            </p>
          )}
        </div>
      </div>
    </>
  );
}
