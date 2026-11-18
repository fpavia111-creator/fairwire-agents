import { readFileSync } from 'node:fs';
import { wireAgent, fileArg, SETTINGS_ARG, settingsFrom, LIMITS } from 'fairwire-core';
import { REQUEST_FIELDS, SETTINGS_SCHEMA, DEFAULTS, reviewUsage } from './logic.js';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const args = {
  usage: fileArg('LLM usage or request log under --root (provider usage export, gateway or proxy log as CSV, Excel or JSON): one row per request with id, app, model, input, output and cached tokens, stop reason and size'),
  settings: SETTINGS_ARG('prices (your price table per model), large_models, repeat_min, large_prompt_tokens, tiny_prompt_tokens, tiny_output_tokens, tiny_requests_min, cutoff_min, large_payload_bytes'),
};

export const manifest = wireAgent({
  pkg, prefix: 'ai_usage', title: 'Fairwire AI Usage',
  description: 'Reviews an LLM usage or request log: the same prompt sent again and again with no cache hit, very large prompts and payloads, a large model used for tiny jobs, answers cut off at the output limit and requests no app owns, with spend by app and model from the price table you supply. Prompt text is never returned and users are masked.',
  args, required: ['usage'],
  sources: { usage: { label: 'LLM requests', args: ['usage'], fields: REQUEST_FIELDS } },
  configSchemas: { ai_usage_settings: SETTINGS_SCHEMA },
  run: (a, ctx) => reviewUsage(ctx.records(a.usage, 'usage'), settingsFrom(a, ctx, 'ai_usage_settings', DEFAULTS)),
  summary: (o) => `${o.requests} request(s), ${o.prompt_tokens} input and ${o.output_tokens} output tokens, ${o.cached_pct}% of input cached${o.cost !== null ? `, spend ${o.cost}` : ''}: ${o.open} open finding(s), ${o.high} high.`,
  check: { title: 'Review AI usage', description: 'Review the request log and list repeated prompts, large prompts and payloads, oversized models, cut-off answers and untagged spend.' },
  explain: { arg: 'app', argSchema: { type: 'string', maxLength: 100, description: 'App or project name from ai_usage_check' }, title: 'Explain one app', description: 'Every finding for one app or project.', match: (i, v) => i.subject === v || i.key === v || String(i.key).startsWith(`${v}|`) || String(i.subject).split(', ').includes(v) },
  report: {
    title: 'AI usage review', base: 'ai-usage',
    sections: (o) => [{ title: 'By application', rows: Object.entries(o.by_app).map(([app, e]) => ({ app, ...e })), columns: ['app', 'requests', 'prompt_tokens', 'output_tokens', 'cost'] }, { title: 'By model', rows: Object.entries(o.by_model).map(([model, e]) => ({ model, ...e })), columns: ['model', 'requests', 'prompt_tokens', 'output_tokens', 'cost'] }],
    limits: [LIMITS.files, 'Costs use only the price table you supply; without one no cost is shown. They are arithmetic on the logged tokens, not your invoice.', 'Prompts are compared by a hash of their text; prompt text is never returned or written to the report.', LIMITS.defaults, LIMITS.pii],
  },
  note: { noun: 'owner_note', verb: 'send', category: 'binding_send', actor: 'the app owner', to: 'the owner of each app', subject: 'AI usage changes to consider', ask: 'Please look at each item and tell us whether a change is planned.' },
  refused: [
    { name: 'llm_gateway_change_config', category: 'production_deploy', description: 'Fairwire AI Usage never changes a model, cache or limit in your gateway or app.' },
    { name: 'api_key_revoke', category: 'revoke_access', description: 'Fairwire AI Usage never revokes an API key.' },
  ],
  prompt: { title: 'Review AI usage', description: 'Walks the host model through an AI usage review with Fairwire AI Usage.', text: 'You are helping an engineering lead review LLM usage with fairwire-ai-usage. Fairwire AI Usage only reads the log; it never returns prompt text. 1. Call ai_usage_check; lead with repeated prompts and cut-off answers. 2. Use ai_usage_explain for one app. 3. Call ai_usage_write_report. 4. Offer ai_usage_draft_owner_note; ai_usage_request_send waits for one named click.' },
});
