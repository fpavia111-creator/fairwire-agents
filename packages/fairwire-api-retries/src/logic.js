// Fairwire API Retries: what retries cost, from API or LLM request logs. Pure functions.
import { num, str, toMs, pct, humanBytes, finding } from 'fairwire-core';

export const CHECKS = Object.freeze({
  retry_after_ignored: 'After a 429 or 503 that said how long to wait (Retry-After), the next attempt came sooner.',
  retry_on_client_error: 'A request was retried after an error that cannot succeed on retry (400, 401, 403, 404, 422 and the like).',
  no_backoff: 'Attempts came less than your minimum gap apart, or the wait did not grow between attempts (a retry storm).',
  retry_spend: 'An endpoint where retries used more than your share of its tokens or bytes.',
  retries_exhausted: 'Requests that still failed after their last attempt.',
  server_error_rate: 'An endpoint whose first attempts fail with 5xx more often than your limit.',
});

export const REQUEST_FIELDS = Object.freeze({
  request_id: { aliases: ['Request ID', 'Correlation ID', 'Trace ID', 'Operation ID', 'id'], required: true },
  attempt: { type: 'number', aliases: ['Attempt', 'Try', 'Retry Number', 'Attempt Number'] },
  at: { type: 'datetime', aliases: ['Timestamp', 'Time', 'Start', 'Sent At', 'Date'] },
  endpoint: { aliases: ['Endpoint', 'Path', 'Route', 'URL', 'Operation', 'Method'] },
  status: { type: 'number', aliases: ['Status', 'Status Code', 'HTTP Status', 'Code', 'Response Code'] },
  tokens: { type: 'number', aliases: ['Tokens', 'Total Tokens', 'Input Tokens', 'Token Count'] },
  bytes: { type: 'number', aliases: ['Bytes', 'Request Bytes', 'Payload Bytes', 'Size'] },
  retry_after: { type: 'number', aliases: ['Retry-After', 'Retry After', 'Retry After (s)', 'Backoff Hint'] },
});

export const SETTINGS_SCHEMA = { type: 'object', additionalProperties: false, properties: {
  min_gap_seconds: { type: 'number', minimum: 0, description: 'Shortest acceptable wait between attempts in seconds (default 1)' },
  retry_share_pct: { type: 'number', minimum: 1, maximum: 100, description: 'Share of an endpoint\'s tokens or bytes spent on retries above which it is flagged (default 10)' },
  server_error_pct: { type: 'number', minimum: 1, maximum: 100, description: 'Share of first attempts with 5xx above which an endpoint is flagged (default 5)' },
  retryable_4xx: { type: 'array', items: { type: 'integer', minimum: 400, maximum: 499 }, maxItems: 20, description: '4xx codes that may succeed on retry (default 408, 409, 425, 429)' },
} };
export const DEFAULTS = Object.freeze({ min_gap_seconds: 1, retry_share_pct: 10, server_error_pct: 5, retryable_4xx: [408, 409, 425, 429] });

const failed = (st) => st === null || st >= 400;

export function reviewRetries(rows, settings = {}) {
  const s = { ...DEFAULTS, ...settings };
  const byReq = new Map();
  for (const r of rows) { const id = str(r.request_id); if (!id) continue; byReq.set(id, [...(byReq.get(id) || []), { attempt: num(r.attempt) || 1, at: str(r.at), ms: toMs(r.at), endpoint: str(r.endpoint) || '(no endpoint)', status: num(r.status), tokens: Math.max(0, num(r.tokens) || 0), bytes: Math.max(0, num(r.bytes) || 0), retry_after: num(r.retry_after) }]); }
  const ep = new Map(); const E = (k) => { if (!ep.has(k)) ep.set(k, { requests: 0, first5xx: 0, tokens: 0, bytes: 0, rtokens: 0, rbytes: 0, client: [], storm: [], ignored: [], exhausted: [] }); return ep.get(k); };
  let attempts = 0, retries = 0;
  for (const [id, list] of byReq) {
    list.sort((a, b) => a.attempt - b.attempt || (a.ms || 0) - (b.ms || 0));
    const e = E(list[0].endpoint); e.requests++; if (list[0].status !== null && list[0].status >= 500) e.first5xx++;
    attempts += list.length; retries += list.length - 1;
    let lastGap = null; let storm = false;
    list.forEach((a, k) => {
      e.tokens += a.tokens; e.bytes += a.bytes;
      if (k === 0) return;
      e.rtokens += a.tokens; e.rbytes += a.bytes;
      const prev = list[k - 1];
      if (prev.status !== null && prev.status >= 400 && prev.status < 500 && !s.retryable_4xx.includes(prev.status)) e.client.push(`${id} (${prev.status})`);
      const gap = Number.isFinite(a.ms) && Number.isFinite(prev.ms) ? (a.ms - prev.ms) / 1000 : null;
      if (gap !== null) {
        if (gap < s.min_gap_seconds || (lastGap !== null && list.length >= 3 && gap <= lastGap && gap < 30)) storm = true;
        if ((prev.status === 429 || prev.status === 503) && prev.retry_after !== null && gap < prev.retry_after) e.ignored.push(`${id} (waited ${Math.round(gap * 10) / 10}s of ${prev.retry_after}s)`);
        lastGap = gap;
      }
    });
    if (storm) e.storm.push(id);
    if (list.length > 1 && failed(list.at(-1).status)) e.exhausted.push(id);
  }
  const items = []; const uniq = (l) => [...new Set(l)].sort();
  for (const [k, e] of ep) {
    if (e.ignored.length) items.push(finding('retry_after_ignored', 'high', k, `${e.ignored.length} retry(ies) on ${k} came before the wait the server asked for: ${uniq(e.ignored).slice(0, 3).join(', ')}.`, 'Read the Retry-After header and wait at least that long; most client libraries have an option for it.', { subject: k, requests: e.ignored.length }));
    if (e.client.length) items.push(finding('retry_on_client_error', 'medium', k, `${e.client.length} retry(ies) on ${k} followed an error that will not change on retry: ${uniq(e.client).slice(0, 3).join(', ')}.`, 'Retry only timeouts, 429 and 5xx; fix the request instead of repeating it.', { subject: k, requests: e.client.length }));
    if (e.storm.length) items.push(finding('no_backoff', 'medium', k, `${e.storm.length} request(s) on ${k} retried with no growing wait: ${uniq(e.storm).slice(0, 3).join(', ')}.`, 'Use exponential back-off with jitter and a cap on attempts.', { subject: k, requests: e.storm.length }));
    const tsh = pct(e.rtokens, e.tokens), bsh = pct(e.rbytes, e.bytes); const sh = Math.max(tsh, bsh);
    if (sh > s.retry_share_pct) items.push(finding('retry_spend', 'medium', k, `Retries on ${k} used ${e.rtokens} of ${e.tokens} tokens (${tsh}%) and ${humanBytes(e.rbytes)} of ${humanBytes(e.bytes)} (${bsh}%).`, 'Fix the causes above first; then cap attempts so a bad hour cannot multiply the bill.', { subject: k, share_pct: sh, retry_tokens: e.rtokens, retry_bytes: e.rbytes }));
    if (e.exhausted.length) items.push(finding('retries_exhausted', 'low', k, `${e.exhausted.length} request(s) on ${k} still failed after their last attempt: ${uniq(e.exhausted).slice(0, 3).join(', ')}.`, 'Check that these reach an error queue or a person, not a silent drop.', { subject: k, requests: e.exhausted.length }));
    const f5 = pct(e.first5xx, e.requests); if (e.first5xx && f5 > s.server_error_pct) items.push(finding('server_error_rate', 'low', k, `${f5}% of first attempts on ${k} failed with 5xx (${e.first5xx} of ${e.requests}).`, 'Raise it with the service owner or provider with these request ids.', { subject: k, share_pct: f5 }));
  }
  const tot = [...ep.values()].reduce((t, e) => ({ tokens: t.tokens + e.tokens, rtokens: t.rtokens + e.rtokens, bytes: t.bytes + e.bytes, rbytes: t.rbytes + e.rbytes }), { tokens: 0, rtokens: 0, bytes: 0, rbytes: 0 });
  return {
    requests: byReq.size, attempts, retries, retry_tokens: tot.rtokens, retry_tokens_pct: pct(tot.rtokens, tot.tokens), retry_bytes: tot.rbytes,
    endpoints: [...ep.entries()].map(([endpoint, e]) => ({ endpoint, requests: e.requests, tokens: e.tokens, retry_tokens: e.rtokens, retry_bytes: e.rbytes })).sort((a, b) => (a.endpoint < b.endpoint ? -1 : 1)),
    items,
  };
}
