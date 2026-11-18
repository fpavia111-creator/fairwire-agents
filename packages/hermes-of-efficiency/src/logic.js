// Hermes of Efficiency: AI usage review from an LLM usage or request log. Pure functions.
// Prompt text is hashed and never returned: prompts can hold personal or confidential data.
import { createHash } from 'node:crypto';
import { num, str, low, pct, round2, finding } from 'fairwire-core';

export const CHECKS = Object.freeze({
  repeated_prompt: 'The same prompt was sent again and again without a cache hit: the extra copies are tokens a prompt cache or a stored answer could save.',
  large_prompt: 'Requests over your prompt-size limit (whole documents pasted in, long histories kept).',
  oversized_model: 'A model you list as large used for many tiny requests that a smaller model could likely handle.',
  cut_off_answers: 'Answers stopped at the output limit (stop reason "length" or "max_tokens"), so users saw cut-off text.',
  large_payload: 'Requests whose payload was over your byte limit (images or files sent whole).',
  no_app_tag: 'Requests with no app or project tag, so nobody owns their cost.',
});

export const REQUEST_FIELDS = Object.freeze({
  request_id: { aliases: ['Request ID', 'ID', 'request id', 'Trace ID', 'Call ID'], required: true },
  at: { type: 'datetime', aliases: ['Timestamp', 'Time', 'Created', 'Date', 'created_at'] },
  app: { aliases: ['App', 'Application', 'Project', 'Service', 'Workspace', 'API Key Name', 'Tag'] },
  user: { aliases: ['User', 'User ID', 'Caller', 'Email', 'End User'], pii: 'user' },
  model: { aliases: ['Model', 'Model ID', 'Model Name', 'Engine'] },
  prompt_tokens: { type: 'number', aliases: ['Input Tokens', 'Prompt Tokens', 'input_tokens', 'Tokens In'], required: true },
  output_tokens: { type: 'number', aliases: ['Output Tokens', 'Completion Tokens', 'output_tokens', 'Tokens Out'] },
  cached_tokens: { type: 'number', aliases: ['Cached Tokens', 'Cache Read Tokens', 'cache_read_input_tokens', 'Cached Input Tokens'] },
  stop_reason: { aliases: ['Stop Reason', 'Finish Reason', 'finish_reason', 'stop_reason'] },
  bytes: { type: 'number', aliases: ['Bytes', 'Payload Bytes', 'Request Size', 'Size'] },
  prompt: { aliases: ['Prompt', 'Prompt Text', 'Input', 'Message', 'Query'] },
  prompt_hash: { aliases: ['Prompt Hash', 'Input Hash', 'Prompt Fingerprint'] },
});

const PRICE = { type: 'object', additionalProperties: false, properties: { input_per_mtok: { type: 'number', minimum: 0, description: 'Price per million input tokens' }, output_per_mtok: { type: 'number', minimum: 0, description: 'Price per million output tokens' }, cached_per_mtok: { type: 'number', minimum: 0, description: 'Price per million cached input tokens' } } };
export const SETTINGS_SCHEMA = { type: 'object', additionalProperties: false, properties: {
  prices: { type: 'object', additionalProperties: PRICE, description: 'Your price table by model name, from your provider contract: { "model": { "input_per_mtok": n, "output_per_mtok": n, "cached_per_mtok": n } }. Without it, no costs are shown.' },
  large_models: { type: 'array', items: { type: 'string' }, maxItems: 100, description: 'Model names you consider large (for the oversized-model check)' },
  repeat_min: { type: 'integer', minimum: 2, description: 'Copies of one prompt before it is flagged (default 3)' },
  large_prompt_tokens: { type: 'integer', minimum: 1, description: 'Prompt tokens above which a request is large (default 50000)' },
  tiny_prompt_tokens: { type: 'integer', minimum: 1, description: 'Prompt tokens under which a request is tiny (default 500)' },
  tiny_output_tokens: { type: 'integer', minimum: 1, description: 'Output tokens under which a request is tiny (default 100)' },
  tiny_requests_min: { type: 'integer', minimum: 1, description: 'Tiny requests on a large model before it is flagged (default 5)' },
  cutoff_min: { type: 'integer', minimum: 1, description: 'Cut-off answers in one app before it is flagged (default 3)' },
  large_payload_bytes: { type: 'number', minimum: 1, description: 'Payload bytes above which a request is flagged (default 500000)' },
} };
export const DEFAULTS = Object.freeze({ prices: {}, large_models: [], repeat_min: 3, large_prompt_tokens: 50000, tiny_prompt_tokens: 500, tiny_output_tokens: 100, tiny_requests_min: 5, cutoff_min: 3, large_payload_bytes: 500000 });

const fingerprint = (r) => { const h = str(r.prompt_hash); if (h) return `hash:${low(h)}`; const p = low(r.prompt).replace(/\s+/g, ' '); return p.length >= 20 ? createHash('sha256').update(p).digest('hex').slice(0, 12) : null; };

/** Cost of one request from the price table, or null when the model has no price. */
export function costOf(r, prices) {
  const p = prices[r.model]; if (!p) return null;
  const cached = Math.min(r.cached, r.prompt);
  const c = ((r.prompt - cached) * (p.input_per_mtok || 0) + cached * (p.cached_per_mtok ?? p.input_per_mtok ?? 0) + r.output * (p.output_per_mtok || 0)) / 1e6;
  return Math.round(c * 10000) / 10000;
}

export function reviewUsage(rows, settings = {}) {
  const s = { ...DEFAULTS, ...settings };
  const reqs = rows.filter((r) => str(r.request_id)).map((r) => ({ id: str(r.request_id), app: str(r.app), model: str(r.model) || '(unknown)', prompt: Math.max(0, num(r.prompt_tokens) || 0), output: Math.max(0, num(r.output_tokens) || 0), cached: Math.max(0, num(r.cached_tokens) || 0), stop: low(r.stop_reason), bytes: num(r.bytes), fp: fingerprint(r) }));
  for (const r of reqs) r.cost = costOf(r, s.prices);
  const priced = reqs.some((r) => r.cost !== null);
  const money = (list) => (priced ? round2(list.reduce((t, r) => t + (r.cost || 0), 0)) : null);
  const items = [];
  const appOf = (r) => r.app || '(no app)';

  const byFp = new Map();
  for (const r of reqs) if (r.fp && r.cached === 0) byFp.set(r.fp, [...(byFp.get(r.fp) || []), r]);
  for (const [fp, list] of byFp) if (list.length >= s.repeat_min) {
    const extra = list.slice(1).reduce((t, r) => t + r.prompt, 0); const apps = [...new Set(list.map(appOf))].sort();
    const save = priced ? money(list.slice(1)) : null;
    items.push(finding('repeated_prompt', 'medium', `prompt#${fp.replace(/^hash:/, '').slice(0, 12)}`, `One prompt was sent ${list.length} times with no cache hit in ${apps.join(', ')}: ${extra} extra input tokens${save !== null ? ` (about ${save} at your prices)` : ''}.`, 'Turn on prompt caching for the fixed part of the prompt, or store and reuse the answer.', { subject: apps.join(', '), copies: list.length, extra_tokens: extra }));
  }
  const groupApp = (pred) => { const m = new Map(); for (const r of reqs) if (pred(r)) m.set(appOf(r), [...(m.get(appOf(r)) || []), r]); return m; };
  for (const [app, list] of groupApp((r) => r.prompt > s.large_prompt_tokens)) items.push(finding('large_prompt', 'medium', app, `${list.length} request(s) in ${app} sent over ${s.large_prompt_tokens} prompt tokens (largest ${Math.max(...list.map((r) => r.prompt))}).`, 'Send only the parts of the document the question needs, or summarise long histories.', { subject: app, requests: list.length }));
  const large = new Set(s.large_models);
  const tiny = new Map(); for (const r of reqs) if (large.has(r.model) && r.prompt < s.tiny_prompt_tokens && r.output < s.tiny_output_tokens) { const k = `${appOf(r)}|${r.model}`; tiny.set(k, [...(tiny.get(k) || []), r]); }
  for (const [k, list] of tiny) if (list.length >= s.tiny_requests_min) { const [app, model] = k.split('|'); items.push(finding('oversized_model', 'low', k, `${app} sent ${list.length} tiny request(s) to ${model}${priced ? ` costing ${money(list)}` : ''}.`, 'Try a smaller model for these requests and compare the answers on a sample.', { subject: app, requests: list.length })); }
  for (const [app, list] of groupApp((r) => r.stop === 'length' || r.stop === 'max_tokens')) if (list.length >= s.cutoff_min) { const all = reqs.filter((r) => appOf(r) === app).length; items.push(finding('cut_off_answers', 'medium', app, `${list.length} of ${all} answers in ${app} stopped at the output limit.`, 'Raise the output limit for this app or ask for shorter answers in the prompt.', { subject: app, requests: list.length })); }
  for (const [app, list] of groupApp((r) => r.bytes !== null && r.bytes > s.large_payload_bytes)) items.push(finding('large_payload', 'low', app, `${list.length} request(s) in ${app} carried more than ${s.large_payload_bytes} bytes (largest ${Math.max(...list.map((r) => r.bytes))}).`, 'Resize images and send text instead of whole files where you can.', { subject: app, requests: list.length }));
  const untagged = reqs.filter((r) => !r.app);
  if (untagged.length) items.push(finding('no_app_tag', 'low', '(no app)', `${untagged.length} request(s) have no app or project tag${priced ? ` (${money(untagged)} of spend)` : ''}.`, 'Give every API key or project a name and an owner.', { subject: '(no app)', requests: untagged.length }));

  const by = (key) => { const m = {}; for (const r of reqs) { const k = key(r); const e = m[k] || (m[k] = { requests: 0, prompt_tokens: 0, output_tokens: 0, cost: priced ? 0 : null }); e.requests++; e.prompt_tokens += r.prompt; e.output_tokens += r.output; if (priced) e.cost = round2(e.cost + (r.cost || 0)); } return Object.fromEntries(Object.entries(m).sort(([a], [b]) => (a < b ? -1 : 1))); };
  const promptTotal = reqs.reduce((t, r) => t + r.prompt, 0);
  return { requests: reqs.length, prompt_tokens: promptTotal, output_tokens: reqs.reduce((t, r) => t + r.output, 0), cached_pct: pct(reqs.reduce((t, r) => t + Math.min(r.cached, r.prompt), 0), promptTotal), cost: money(reqs), by_app: by(appOf), by_model: by((r) => r.model), items };
}
