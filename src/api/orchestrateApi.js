import { API_BASE } from './base';
export { submitOrchestrateStream, splitIntoChunks } from './orchestrateApi.stream';

/**
 * Persist an orchestrate run into the coordinator's shared history
 * so it appears in the conversation thread alongside streaming runs.
 */
export async function saveOrchestrateHistory({ prompt, result, mode, sessionId, temperature = 0.2 }) {
  try {
    const res = await fetch(`${API_BASE}/api/history/entry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, result, mode, session_id: sessionId, temperature }),
    });
    if (!res.ok) {
      console.error('[orchestrate] history save failed:', res.status);
    }
  } catch (err) {
    console.error('[orchestrate] history save network error:', err);
  }
}

/**
 * POST /api/orchestrate — blocking JSON call to the Python mode dispatcher.
 * Returns { result, session_id, mode, meta }.
 * opts: { useRag, ragTopK, ragMinScore } — forwarded for server-side RAG retrieval.
 */
export async function submitOrchestrate(mode, prompt, params = {}, opts = {}) {
  const body = { mode, prompt, params };
  // Always send an explicit use_rag so the toggle's OFF state wins. The orchestrate
  // service defaults use_rag from the roster only when the field is absent, so omitting
  // it when off would let roster agents (use_rag=true) enable RAG against the user's intent.
  body.use_rag = !!opts.useRag;
  if (opts.useRag) {
    if (opts.ragTopK) body.rag_top_k = opts.ragTopK;
    if (typeof opts.ragMinScore === 'number') body.rag_min_score = opts.ragMinScore;
    if (opts.ragRerank) body.rag_rerank = true;
  }
  let res;
  try {
    res = await fetch(`${API_BASE}/api/orchestrate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch (err) {
    console.error('[orchestrate] network error:', err);
    throw new Error(`Orchestrate network error: ${err.message}`);
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const msg = body.error || `orchestrate HTTP ${res.status}`;
    console.error('[orchestrate] server error:', msg);
    throw new Error(msg);
  }
  return res.json();
}
