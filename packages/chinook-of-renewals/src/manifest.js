import { readFileSync } from 'node:fs';
import { wireAgent, fileArg, SETTINGS_ARG, AS_OF_ARG, settingsFrom, LIMITS, today } from 'fairwire-core';
import { CONTRACT_FIELDS, SPEND_FIELDS, SETTINGS_SCHEMA, DEFAULTS, reviewContracts } from './logic.js';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const args = {
  contracts: fileArg('IT contract register under --root (spreadsheet, contract tool or procurement export as CSV, Excel or JSON): one row per contract with vendor, service, owner, start and end dates, auto-renewal, notice days, annual value and renewal uplift'),
  spend: fileArg('Optional payments to vendors (accounts payable export) with vendor, amount and date'),
  settings: SETTINGS_ARG('lookahead_days, urgent_days, uplift_cap_pct, spend_margin_pct'),
  as_of: AS_OF_ARG,
};

export const manifest = wireAgent({
  pkg, prefix: 'chinook', title: 'Chinook of Renewals',
  description: 'Reviews IT contracts and renewals: notice deadlines for auto-renewing contracts, deadlines already missed, price rises above your cap, contracts with no owner, two contracts for one service, vendors paid with no contract, payments after a contract ended and spend above the contract value. Writes a deadline calendar and drafts notice letters for a person to send.',
  args, required: ['contracts'],
  sources: { contracts: { label: 'Contracts', args: ['contracts'], fields: CONTRACT_FIELDS }, spend: { label: 'Vendor payments', args: ['spend'], fields: SPEND_FIELDS } },
  configSchemas: { chinook_settings: SETTINGS_SCHEMA },
  run: (a, ctx) => reviewContracts(ctx.records(a.contracts, 'contracts'), a.spend ? ctx.records(a.spend, 'spend') : [], settingsFrom(a, ctx, 'chinook_settings', DEFAULTS), a.as_of || today()),
  summary: (o) => `${o.contracts} contract(s), ${o.active} active worth ${o.annual_value} a year, ${o.auto_renewing} auto-renewing: ${o.open} open finding(s), ${o.high} high.`,
  check: { title: 'Review IT contracts and renewals', description: 'Review the contract register and payments and list notice deadlines, missed notices, uplifts, owners, overlaps and spend problems.' },
  explain: { arg: 'vendor', argSchema: { type: 'string', maxLength: 200, description: 'Vendor or contract id from chinook_check' }, title: 'Explain one vendor or contract', description: 'Every finding for one vendor or contract.', match: (i, v) => i.key === v || String(i.subject).toLowerCase() === String(v).toLowerCase() },
  report: {
    title: 'IT contracts and renewals', base: 'chinook-renewals',
    sections: (o) => [{ title: 'By vendor', rows: o.deadlines, columns: ['vendor', 'id', 'deadline'] }],
    ics: (o) => o.deadlines.map((d) => ({ date: d.deadline, summary: `Notice deadline: ${d.vendor} (${d.id})`, description: 'Written by chinook-of-renewals. Give notice in writing before this date if the contract should not renew.' })),
    limits: [LIMITS.files, 'Dates and notice periods are the ones in your register; the contract itself decides how notice must be given. Not legal advice.', 'Vendor names are compared without legal forms (Inc, Ltd, GmbH); two different vendors with the same name can be merged.', LIMITS.defaults, LIMITS.pii],
  },
  note: { noun: 'notice_letter', verb: 'send', category: 'binding_send', actor: 'the contract owner', to: 'each vendor\'s contract contact', subject: 'Notice regarding the renewal of our agreement', ask: 'We are reviewing this agreement before its renewal date. Please treat this letter as our notice under the agreement, and confirm receipt in writing.' },
  refused: [
    { name: 'vendor_send_notice', category: 'binding_send', description: 'Chinook never sends a notice or signs a renewal; the contract owner sends the reviewed letter.' },
    { name: 'ap_hold_payment', category: 'move_money', description: 'Chinook never stops, holds or makes a payment.' },
  ],
  prompt: { title: 'Review IT contracts', description: 'Walks the host model through a renewal review with Chinook.', text: 'You are helping an IT manager review contracts with chinook-of-renewals. Chinook only reads the register and payments. 1. Call chinook_check; lead with notice deadlines in the next two weeks and payments after a contract ended. 2. Use chinook_explain for a vendor. 3. Call chinook_write_report (it writes a deadline calendar). 4. Offer chinook_draft_notice_letter; chinook_request_send waits for one named click and the contract owner sends it.' },
});
