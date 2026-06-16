/**
 * Shared API infrastructure: base URLs, request coalescing, models cache,
 * and response normalization helpers used by all swarm API modules.
 */

function normalizeApiBase() {
  const raw = process.env.REACT_APP_API_BASE;
  if (raw === undefined || raw === '') {
    return '/api';
  }
  const trimmed = raw.trim().replace(/\/+$/, '');
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
  }
  return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
}

export const API_BASE = normalizeApiBase();

/**
 * MLX compat routes on dispatch (:8010), proxied via UI nginx /api/mlx/*.
 * Override with REACT_APP_MLX_API_BASE.
 */
function normalizeMlxApiBase() {
  const raw = process.env.REACT_APP_MLX_API_BASE;
  if (raw !== undefined && raw !== '') {
    return raw.trim().replace(/\/+$/, '');
  }
  return '/api/mlx';
}

export const MLX_API_BASE = normalizeMlxApiBase();

/**
 * RAG ingest API — proxied via UI nginx /rag/* → rag :8001.
 * Override with REACT_APP_RAG_INGEST_BASE.
 */
export const RAG_INGEST_BASE = (process.env.REACT_APP_RAG_INGEST_BASE
  || '/rag').replace(/\/+$/, '');

/** Concurrent callers await one in-flight request (App + CONFIGURE + panels). */
const inflight = new Map();
export function coalesce(key, fn) {
  const existing = inflight.get(key);
  if (existing) return existing;
  const p = (async () => {
    try {
      return await fn();
    } finally {
      inflight.delete(key);
    }
  })();
  inflight.set(key, p);
  return p;
}

export let modelsCacheValue = null;
export let modelsCacheAt = 0;

export function invalidateModelsCache() {
  modelsCacheValue = null;
  modelsCacheAt = 0;
}

export function setModelsCache(value) {
  modelsCacheValue = value;
  modelsCacheAt = Date.now();
}

/**
 * Normalize a coordinator /api/architect response into { mode, agents, final, meta }.
 * Accepts both the envelope shape (new) and the legacy flat-map shape.
 */
export function normalizeArchitectResponse(raw) {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)
      && raw.agents && typeof raw.agents === 'object') {
    return {
      mode: raw.mode || null,
      agents: raw.agents,
      final: raw.final ?? null,
      meta: raw.meta || {},
    };
  }
  return { mode: null, agents: raw || {}, final: null, meta: {} };
}
