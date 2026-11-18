import { readFileSync } from 'node:fs';
import { wireAgent, fileArg, SETTINGS_ARG, settingsFrom, LIMITS, humanBytes } from 'fairwire-core';
import { REQUEST_FIELDS, SETTINGS_SCHEMA, DEFAULTS, reviewRetries } from './logic.js';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const args = {
  requests: fileArg('API or LLM request log under --root (gateway, proxy or app log as CSV, Excel or JSON): one row per attempt with request id, attempt number, time, endpoint, status, tokens, bytes and Retry-After'),
  settings: SETTINGS_ARG('min_gap_seconds, retry_share_pct, server_error_pct, retryable_4xx'),
};

export const manifest = wireAgent({
  pkg, prefix: 'icarus', title: 'Icarus of Retries',
  description: 'Reviews API and LLM request logs for what retries cost: tokens and bytes spent on retries per endpoint, retries of errors that cannot succeed, retry storms with no back-off, 429s retried before Retry-After, requests that failed after every attempt and endpoints with many 5xx. Drafts notes for the service owner.',
  args, required: ['requests'],
  sources: { requests: { label: 'Request attempts', args: ['requests'], fields: REQUEST_FIELDS } },
  configSchemas: { icarus_settings: SETTINGS_SCHEMA },
  run: (a, ctx) => reviewRetries(ctx.records(a.requests, 'requests'), settingsFrom(a, ctx, 'icarus_settings', DEFAULTS)),
  summary: (o) => `${o.requests} request(s), ${o.attempts} attempt(s), ${o.retries} retry(ies) using ${o.retry_tokens} tokens (${o.retry_tokens_pct}%) and ${humanBytes(o.retry_bytes)}: ${o.open} open finding(s), ${o.high} high.`,
  check: { title: 'Review retries', description: 'Group attempts by request id and list ignored Retry-After, retries of client errors, retry storms, retry spend, exhausted requests and 5xx-heavy endpoints.' },
  explain: { arg: 'endpoint', argSchema: { type: 'string', maxLength: 300, description: 'Endpoint from icarus_check' }, title: 'Explain one endpoint', description: 'Every finding for one endpoint.', match: (i, v) => i.key === v },
  report: {
    title: 'Retry cost review', base: 'icarus-retries',
    sections: (o) => [{ title: 'By endpoint', rows: o.endpoints, columns: ['endpoint', 'requests', 'tokens', 'retry_tokens', 'retry_bytes'] }],
    limits: [LIMITS.files, 'Attempts are grouped by the request id in your log; a client that gives each attempt a new id hides its retries.', 'Tokens and bytes are the figures in the log; no prices are applied.', LIMITS.defaults, LIMITS.live],
  },
  note: { noun: 'owner_note', verb: 'send', category: 'binding_send', actor: 'the service owner', to: 'the owner of each service', subject: 'Retry behaviour to fix', ask: 'Please plan the client changes and tell us when they are released.' },
  refused: [
    { name: 'gateway_set_rate_limit', category: 'production_deploy', description: 'Icarus never changes a gateway, rate limit or client setting.' },
    { name: 'service_restart', category: 'production_deploy', description: 'Icarus never restarts a service.' },
  ],
  prompt: { title: 'Review retries', description: 'Walks the host model through a retry review with Icarus.', text: 'You are helping an engineering lead review retries with icarus-of-retries. Icarus only reads the log. 1. Call icarus_check; lead with ignored Retry-After and retries of client errors. 2. Use icarus_explain for one endpoint. 3. Call icarus_write_report. 4. Offer icarus_draft_owner_note; icarus_request_send waits for one named click.' },
});
