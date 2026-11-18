import { readFileSync } from 'node:fs';
import { wireAgent, fileArg, SETTINGS_ARG, settingsFrom, LIMITS } from 'fairwire-core';
import { LINE_FIELDS, LEAVER_FIELDS, SETTINGS_SCHEMA, DEFAULTS, reviewTelecom } from './logic.js';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const args = {
  lines: fileArg('Telecom bill detail under --root (carrier portal or telecom expense export as CSV, Excel or JSON) covering at least two months: one row per line per month with number, user, type, plan, charges, data and minutes used, allowance, roaming and premium charges'),
  leavers: fileArg('Optional list of people who left, with their last day'),
  settings: SETTINGS_ARG('unused_months, roaming_max, plan_use_pct'),
};

export const manifest = wireAgent({
  pkg, prefix: 'telecom', title: 'Fairwire Telecom Bills',
  description: 'Reviews telecom bills: lines still billed for leavers, lines with no use for months, roaming spikes, premium and third-party charges, plans much bigger than the use and people with two mobile lines. Phone numbers and names are masked for the model. Drafts cancellation lists; never cancels a line.',
  args, required: ['lines'],
  sources: { lines: { label: 'Telecom lines by month', args: ['lines'], fields: LINE_FIELDS }, leavers: { label: 'Leavers', args: ['leavers'], fields: LEAVER_FIELDS } },
  configSchemas: { telecom_settings: SETTINGS_SCHEMA },
  run: (a, ctx) => reviewTelecom(ctx.records(a.lines, 'lines'), a.leavers ? ctx.records(a.leavers, 'leavers') : [], settingsFrom(a, ctx, 'telecom_settings', DEFAULTS)),
  summary: (o) => `${o.month ? `${o.month}: ${o.lines} line(s) billed ${o.total}, roaming ${o.roaming}` : 'No lines'}: ${o.open} open finding(s), ${o.high} high.`,
  check: { title: 'Review the telecom bill', description: 'Review the latest month of line charges against earlier months and list leavers\' lines, unused lines, roaming, premium charges, oversized plans and duplicate lines.' },
  explain: { arg: 'line', argSchema: { type: 'string', maxLength: 100, description: 'Line number from telecom_check (the pseudonym is fine)' }, title: 'Explain one line', description: 'Every finding for one line.', match: (i, v, ctx) => i.key === v || (ctx.pii && ctx.pii.same(i.key, v, 'phone')) },
  report: {
    title: 'Telecom bill review', base: 'telecom-bills',
    limits: [LIMITS.files, 'Use and charges are the carrier\'s figures; a line with no use may be a backup or alarm line on purpose.', LIMITS.defaults, LIMITS.pii, LIMITS.estimate],
  },
  note: { noun: 'cancellation_list', verb: 'send', category: 'binding_send', actor: 'the telecom owner', to: 'telecom administrator', subject: 'Lines to cancel or change', ask: 'Please confirm each line with its user or manager before anything is cancelled with the carrier.' },
  refused: [
    { name: 'carrier_cancel_line', category: 'production_deploy', description: 'Fairwire Telecom Bills never cancels, suspends or changes a line with the carrier.' },
    { name: 'carrier_dispute_charge', category: 'binding_send', description: 'Fairwire Telecom Bills never files a dispute with the carrier; a person sends the reviewed list.' },
  ],
  prompt: { title: 'Review the telecom bill', description: 'Walks the host model through a telecom bill review with Fairwire Telecom Bills.', text: 'You are helping an IT or finance lead review telecom bills with fairwire-telecom-bills. Numbers and names are pseudonyms. 1. Call telecom_check; lead with leavers\' lines and unused lines. 2. Use telecom_explain for a line. 3. Call telecom_write_report (the file has real numbers). 4. Offer telecom_draft_cancellation_list; telecom_request_send waits for one named click.' },
});
