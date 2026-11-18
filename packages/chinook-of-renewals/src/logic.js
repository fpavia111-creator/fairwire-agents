// Chinook of Renewals: IT contracts, notice deadlines and spend against contracts. Pure functions.
import { num, str, low, yes, isoDate, addDays, daysBetween, round2, finding } from 'fairwire-core';

export const CHECKS = Object.freeze({
  notice_deadline: 'An auto-renewing contract whose notice deadline (end date minus notice period) falls inside your look-ahead window.',
  expired_still_paid: 'Payments to a vendor after its contract ended.',
  notice_missed: 'The notice deadline has passed, so the contract will renew unless the vendor agrees otherwise.',
  uplift_above_cap: 'A renewal price rise above your cap.',
  spend_over_contract: 'Payments to a vendor in the last 12 months above the contract value by more than your margin.',
  spend_without_contract: 'A vendor paid in the last 12 months with no contract on file.',
  overlapping_contracts: 'Two contracts for the same service running at the same time.',
  no_owner: 'A contract with no owner, so nobody decides about its renewal.',
});

export const CONTRACT_FIELDS = Object.freeze({
  contract_id: { aliases: ['Contract ID', 'Contract', 'ID', 'Agreement', 'Reference'], required: true },
  vendor: { aliases: ['Vendor', 'Supplier', 'Provider', 'Company'], required: true },
  service: { aliases: ['Service', 'Product', 'Description', 'Category', 'Subject'] },
  owner: { aliases: ['Owner', 'Contract Owner', 'Business Owner', 'Responsible'], pii: 'name' },
  start_date: { type: 'date', aliases: ['Start Date', 'Start', 'Effective Date', 'Commencement'] },
  end_date: { type: 'date', aliases: ['End Date', 'End', 'Expiry', 'Renewal Date', 'Term End'], required: true },
  auto_renew: { aliases: ['Auto Renew', 'Auto-renewal', 'Evergreen', 'Renews Automatically'] },
  notice_days: { type: 'number', aliases: ['Notice Days', 'Notice Period (days)', 'Notice Period', 'Cancellation Notice'] },
  annual_value: { type: 'money', aliases: ['Annual Value', 'Annual Cost', 'Contract Value', 'Yearly Amount'] },
  uplift_pct: { type: 'number', aliases: ['Uplift %', 'Price Increase %', 'Renewal Uplift', 'Escalation %'] },
});
export const SPEND_FIELDS = Object.freeze({
  vendor: { aliases: ['Vendor', 'Supplier', 'Payee', 'Vendor Name'], required: true },
  amount: { type: 'money', aliases: ['Amount', 'Paid', 'Payment Amount', 'Total'], required: true },
  date: { type: 'date', aliases: ['Date', 'Payment Date', 'Paid On', 'Invoice Date'], required: true },
});

export const SETTINGS_SCHEMA = { type: 'object', additionalProperties: false, properties: {
  lookahead_days: { type: 'integer', minimum: 1, description: 'Days ahead to look for notice deadlines (default 60)' },
  urgent_days: { type: 'integer', minimum: 1, description: 'Notice deadlines this close are high (default 14)' },
  uplift_cap_pct: { type: 'number', minimum: 0, description: 'Largest renewal price rise you accept, in percent (default 5)' },
  spend_margin_pct: { type: 'number', minimum: 0, description: 'Margin over the contract value before spend is flagged, in percent (default 10)' },
} };
export const DEFAULTS = Object.freeze({ lookahead_days: 60, urgent_days: 14, uplift_cap_pct: 5, spend_margin_pct: 10 });

const vkey = (v) => low(v).replace(/[.,]/g, '').replace(/\b(inc|llc|ltd|limited|corp|corporation|gmbh|co)\b/g, '').replace(/\s+/g, ' ').trim();

export function reviewContracts(contractRows, spendRows = [], settings = {}, asOf) {
  const s = { ...DEFAULTS, ...settings };
  const cs = contractRows.filter((r) => str(r.contract_id) && str(r.vendor) && isoDate(r.end_date)).map((r) => ({ id: str(r.contract_id), vendor: str(r.vendor), vk: vkey(r.vendor), service: str(r.service), owner: str(r.owner), start: isoDate(r.start_date), end: isoDate(r.end_date), auto: yes(r.auto_renew) === true, notice: num(r.notice_days) || 0, value: num(r.annual_value), uplift: num(r.uplift_pct) }));
  const items = []; const deadlines = [];
  for (const c of cs) {
    const deadline = addDays(c.end, -c.notice); const left = asOf ? daysBetween(asOf, deadline) : null; const active = !asOf || c.end >= asOf;
    if (c.auto && active && left !== null) {
      if (left >= 0 && left <= s.lookahead_days) { deadlines.push({ id: c.id, vendor: c.vendor, deadline }); items.push(finding('notice_deadline', left <= s.urgent_days ? 'high' : 'medium', c.id, `${c.vendor} contract ${c.id}${c.service ? ` (${c.service})` : ''} renews on ${c.end} unless notice is given by ${deadline} (${left} days).`, 'Decide now whether to renew, renegotiate or cancel; send any notice in writing before the deadline.', { subject: c.vendor, deadline })); }
      else if (left < 0) items.push(finding('notice_missed', 'medium', c.id, `The notice deadline for ${c.vendor} contract ${c.id} passed on ${deadline}; it renews on ${c.end}.`, 'Ask the vendor for a shorter renewal or a cancellation by agreement, and diary the next deadline.', { subject: c.vendor }));
      else if (left > s.lookahead_days) deadlines.push({ id: c.id, vendor: c.vendor, deadline });
    }
    if (active && c.uplift !== null && c.uplift > s.uplift_cap_pct) items.push(finding('uplift_above_cap', 'medium', c.id, `${c.vendor} contract ${c.id} rises ${c.uplift}% at renewal, above your cap of ${s.uplift_cap_pct}%.`, 'Negotiate the rise before the notice deadline, with usage figures in hand.', { subject: c.vendor }));
    if (active && !c.owner) items.push(finding('no_owner', 'low', c.id, `${c.vendor} contract ${c.id} has no owner.`, 'Name the person who decides on its renewal.', { subject: c.vendor }));
  }
  const live = cs.filter((c) => !asOf || c.end >= asOf);
  const bySvc = new Map(); for (const c of live) if (c.service) bySvc.set(low(c.service), [...(bySvc.get(low(c.service)) || []), c]);
  for (const [, list0] of bySvc) if (list0.length > 1) { const list = [...list0].sort((a, b) => (a.id < b.id ? -1 : 1)); const ids = list.map((c) => c.id).sort(); items.push(finding('overlapping_contracts', 'medium', ids.join('+'), `${list.length} contracts cover ${list[0].service} at once (${list.map((c) => `${c.id} with ${c.vendor}`).sort().join(', ')}).`, 'Keep one and plan the exit from the other at its next notice date.', { subject: list[0].vendor })); }
  const year = asOf ? addDays(asOf, -365) : null;
  const sp = spendRows.filter((r) => str(r.vendor) && isoDate(r.date)).map((r) => ({ vendor: str(r.vendor), vk: vkey(r.vendor), amount: num(r.amount) || 0, date: isoDate(r.date) })).filter((p) => !year || p.date >= year);
  const byV = new Map(); for (const p of sp) byV.set(p.vk, [...(byV.get(p.vk) || []), p]);
  for (const [vk, pays0] of byV) { const pays = [...pays0].sort((a, b) => (a.vendor < b.vendor ? -1 : a.vendor > b.vendor ? 1 : a.date < b.date ? -1 : 1));
    const total = round2(pays.reduce((t, p) => t + p.amount, 0)); const mine = cs.filter((c) => c.vk === vk);
    if (!mine.length) { items.push(finding('spend_without_contract', 'medium', pays[0].vendor, `${pays[0].vendor} was paid ${total} in the last 12 months with no contract on file.`, 'Find the contract or order form and add it, or move the spend to a contracted vendor.', { subject: pays[0].vendor, amount: total })); continue; }
    const lastEnd = mine.map((c) => c.end).sort().at(-1); const after = pays.filter((p) => p.date > lastEnd);
    if (after.length) items.push(finding('expired_still_paid', 'high', pays[0].vendor, `${pays[0].vendor} was paid ${round2(after.reduce((t, p) => t + p.amount, 0))} after its last contract ended on ${lastEnd}.`, 'Stop further payments until a contract is in place, or confirm the renewal paperwork exists.', { subject: pays[0].vendor }));
    const value = mine.filter((c) => c.value !== null).reduce((t, c) => t + c.value, 0);
    if (value && total > value * (1 + s.spend_margin_pct / 100)) items.push(finding('spend_over_contract', 'medium', pays[0].vendor, `${pays[0].vendor} was paid ${total} in the last 12 months against contracts worth ${value} a year.`, 'Check the invoices for extra charges, usage overages or a price that does not match the contract.', { subject: pays[0].vendor, amount: round2(total - value) }));
  }
  return { contracts: cs.length, active: live.length, annual_value: round2(live.reduce((t, c) => t + (c.value || 0), 0)), auto_renewing: live.filter((c) => c.auto).length, deadlines: deadlines.sort((a, b) => (a.deadline < b.deadline ? -1 : a.deadline > b.deadline ? 1 : a.id < b.id ? -1 : 1)), items };
}
