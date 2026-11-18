import { readFileSync } from 'node:fs';
import { wireAgent, fileArg, SETTINGS_ARG, settingsFrom, LIMITS } from 'fairwire-core';
import { MESSAGE_FIELDS, SETTINGS_SCHEMA, DEFAULTS, reviewMail } from './logic.js';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const args = {
  messages: fileArg('Email gateway message log under --root (Proofpoint, Mimecast, Defender for Office 365, Barracuda or any CSV, Excel or JSON): one row per message and recipient with direction, sender, verdict, action, allow-list flag, pull-back time and data-loss rule'),
  settings: SETTINGS_ARG('outbound_spam_min, clawback_minutes, targeted_min, dlp_min'),
};

export const manifest = wireAgent({
  pkg, prefix: 'email_gateway', title: 'Fairwire Email Gateway',
  description: 'Reviews email security gateway logs: phishing or malware released from quarantine, allow-listed senders that sent threats, internal mailboxes sending spam, phishing pulled back late, the people targeted most and repeated data-loss rule hits. Addresses are masked for the model. Drafts notes; never releases or deletes mail.',
  args, required: ['messages'],
  sources: { messages: { label: 'Gateway messages', args: ['messages'], fields: MESSAGE_FIELDS } },
  configSchemas: { email_gateway_settings: SETTINGS_SCHEMA },
  run: (a, ctx) => reviewMail(ctx.records(a.messages, 'messages'), settingsFrom(a, ctx, 'email_gateway_settings', DEFAULTS)),
  summary: (o) => `${o.messages} message(s), ${o.inbound} inbound (${o.quarantined_pct}% quarantined or blocked), ${o.outbound} outbound, ${o.threats} threat(s): ${o.open} open finding(s), ${o.high} high.`,
  check: { title: 'Review the email gateway', description: 'Review the gateway log and list released threats, allow-list abuse, outbound spam, late pull-backs, targeted people and data-loss hits.' },
  explain: { arg: 'address', argSchema: { type: 'string', maxLength: 300, description: 'Address or message id from email_gateway_check (a pseudonym is fine)' }, title: 'Explain one address or message', description: 'Every finding for one address or message.', match: (i, v, ctx) => i.key === v || i.subject === v || (ctx.pii && (ctx.pii.same(i.key, v, 'user') || ctx.pii.same(i.subject, v, 'user'))) },
  report: {
    title: 'Email gateway review', base: 'email-gateway',
    limits: [LIMITS.files, 'Verdicts are the gateway\'s own; a message it missed is not in this review. Pair it with sign-in logs for compromised accounts.', 'Mail authentication records (SPF, DKIM, DMARC) are checked by the Fairbooks mail authentication agent, not here.', LIMITS.defaults, LIMITS.pii, LIMITS.live],
  },
  note: { noun: 'security_note', verb: 'send', category: 'binding_send', actor: 'the email security owner', to: 'security operations', subject: 'Email threats to follow up', ask: 'Please handle released threats and the suspected compromised mailbox today.' },
  refused: [
    { name: 'gateway_release_message', category: 'binding_send', description: 'Fairwire Email Gateway never releases, deletes or pulls back a message.' },
    { name: 'gateway_change_allowlist', category: 'production_deploy', description: 'Fairwire Email Gateway never changes allow lists, block lists or policies.' },
  ],
  prompt: { title: 'Review the email gateway', description: 'Walks the host model through a gateway review with Fairwire Email Gateway.', text: 'You are helping a security lead review email gateway logs with fairwire-email-gateway. Addresses are pseudonyms. 1. Call email_gateway_check; lead with released threats and outbound spam. 2. Use email_gateway_explain for an address. 3. Call email_gateway_write_report (the file has real addresses). 4. Offer email_gateway_draft_security_note; email_gateway_request_send waits for one named click.' },
});
