import React from 'react';
import MetricsStripBadges from './MetricsStripBadges';
import ImportanceBar from './ImportanceBar';
import TruncationBadge from './TruncationBadge';

export default function MetricsStrip({ envelope }) {
  const meta = envelope?.meta || {};
  const timings  = meta.timings;
  const wallMs   = meta.wall_ms;
  const tb       = meta.token_budget || {};
  const tes      = meta.tes;
  const excluded = meta.excluded_unhealthy;

  if (!timings || typeof timings !== 'object' || Object.keys(timings).length === 0) {
    return null;
  }

  const rows = Object.entries(timings)
    .map(([name, m]) => ({ name, ...m }))
    .sort((a, b) => (b.total_ms || 0) - (a.total_ms || 0));

  const totalAgentMs = rows.reduce((s, r) => s + (r.total_ms || 0), 0);
  const totalTokens  = rows.reduce((s, r) => s + (r.completion_tokens || 0), 0);

  // KV prompt-cache reuse (llama agents report it; MLX omits). Aggregate ratio =
  // total cached prompt tokens / total prompt tokens across reporting agents.
  const reuseRows = rows.filter(r => typeof r.kv_reuse === 'number' && (r.prompt_tokens || 0) > 0);
  const aggCached = reuseRows.reduce((s, r) => s + (r.prompt_cached || 0), 0);
  const aggTotal  = reuseRows.reduce((s, r) => s + (r.prompt_tokens || 0), 0);
  const aggReuse  = aggTotal > 0 ? aggCached / aggTotal : null;

  return (
    <div className="metrics-strip">
      <div className="metrics-strip-header">
        <span className="metrics-strip-title">RUN METRICS</span>
        <span className="metrics-strip-totals">
          {wallMs != null && `wall ${(wallMs / 1000).toFixed(2)}s · `}
          agent ms {(totalAgentMs / 1000).toFixed(2)}s · {totalTokens} tok
          {aggReuse != null && (
            <span
              className="metrics-strip-kvreuse-total"
              title={`KV prompt-cache reuse — ${aggCached} of ${aggTotal} prompt tokens reused across agents`}
            >
              {' · ♻ KV reuse '}{Math.round(aggReuse * 100)}%
            </span>
          )}
          <MetricsStripBadges meta={meta} excluded={excluded} tes={tes} />
          <TruncationBadge truncation={meta.truncation} />
        </span>
      </div>
      {tb.budget > 0 && (
        <div className="metrics-strip-budget">
          <span className="metrics-strip-budget-label">SESSION TOKENS</span>
          <span className="metrics-strip-budget-value">
            {tb.consumed ?? 0} / {tb.budget}
            {tb.overrun && (
              <span style={{ marginLeft: '0.3rem', color: 'var(--color-danger, #ef4444)',
                             fontWeight: 600 }}>OVERRUN</span>
            )}
          </span>
          <div className="metrics-strip-budget-bar">
            <div className="metrics-strip-budget-bar-fill"
                 style={{
                   width: `${Math.min(100, ((tb.consumed ?? 0) / tb.budget) * 100).toFixed(1)}%`,
                   background: tb.overrun ? 'var(--color-danger, #ef4444)'
                     : tb.consumed / tb.budget > 0.9 ? 'var(--kv-warn, #ffae00)'
                     : 'var(--color-primary, #4a9eff)',
                 }} />
          </div>
        </div>
      )}
      <div className="metrics-strip-rows">
        {rows.map(r => {
          const pct = totalAgentMs > 0 ? (r.total_ms / totalAgentMs) * 100 : 0;
          const route = meta.routing?.[r.name];
          return (
            <div key={r.name} className="metrics-strip-row">
              <span className="metrics-strip-name">{r.name}</span>
              <span className="metrics-strip-ms">{((r.total_ms || 0) / 1000).toFixed(2)}s</span>
              <span className="metrics-strip-tokens">{r.completion_tokens || 0} tok</span>
              {typeof r.kv_reuse === 'number' && (
                <span
                  className={`metrics-strip-kvreuse${r.kv_reuse >= 0.5 ? ' metrics-strip-kvreuse--high' : ''}`}
                  title={`KV prompt-cache reuse — ${r.prompt_cached ?? 0} of ${r.prompt_tokens ?? 0} prompt tokens reused (${r.prompt_evaluated ?? 0} recomputed)`}
                >
                  ♻ {Math.round(r.kv_reuse * 100)}%
                </span>
              )}
              {route && (
                <span className="metrics-strip-route" title={route.reason || ''}>
                  {route.backend}
                </span>
              )}
              <div className="metrics-strip-bar">
                <div className="metrics-strip-bar-fill" style={{ width: `${pct.toFixed(1)}%` }} />
              </div>
              <span className="metrics-strip-pct">{pct.toFixed(0)}%</span>
            </div>
          );
        })}
      </div>
      <ImportanceBar importance={meta.importance} />
    </div>
  );
}
