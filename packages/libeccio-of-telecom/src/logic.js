// Libeccio of Telecom: telecom bill review (mobile and fixed lines). Pure functions.
import { num, str, low, monthOf, isoDate, round2, finding } from 'fairwire-core';

export const CHECKS = Object.freeze({
  line_of_leaver: 'A line still billed for someone who has left.',
  unused_line: 'A line with no calls and no data in each of the last months you set (still billed).',
  roaming_spike: 'Roaming charges on a line above your limit in the latest month.',
  premium_charges: 'Premium-rate or third-party charges on a line (often subscriptions nobody asked for).',
  oversized_plan: 'A line using a small share of its data allowance month after month (a smaller plan would do).',
  two_lines_one_user: 'One person with two or more active mobile lines.',
});

export const LINE_FIELDS = Object.freeze({
  line_number: { aliases: ['Line Number', 'Phone Number', 'Mobile Number', 'MSISDN', 'Number', 'Wireless Number'], required: true, pii: 'phone' },
  month: { type: 'date', aliases: ['Month', 'Bill Period', 'Billing Period', 'Invoice Date', 'Bill Date'], required: true },
  user: { aliases: ['User', 'User Name', 'Employee', 'Assigned To', 'Subscriber'], pii: 'name' },
  line_type: { aliases: ['Line Type', 'Type', 'Service Type', 'Device Type'] },
  plan: { aliases: ['Plan', 'Rate Plan', 'Tariff', 'Price Plan'] },
  monthly_charge: { type: 'money', aliases: ['Monthly Charge', 'Total Charges', 'Total', 'Amount', 'Line Total'] },
  data_gb: { type: 'number', aliases: ['Data (GB)', 'Data Used (GB)', 'Data GB', 'Data Usage'] },
  data_allowance_gb: { type: 'number', aliases: ['Data Allowance (GB)', 'Allowance GB', 'Plan Data (GB)', 'Included Data'] },
  minutes: { type: 'number', aliases: ['Minutes', 'Voice Minutes', 'Minutes Used', 'Call Minutes'] },
  roaming_charge: { type: 'money', aliases: ['Roaming', 'Roaming Charges', 'International Roaming', 'Roaming Amount'] },
  premium_charge: { type: 'money', aliases: ['Premium', 'Premium Charges', 'Third Party Charges', 'Purchases', 'Content Charges'] },
});
export const LEAVER_FIELDS = Object.freeze({
  user: { aliases: ['User', 'Employee', 'Name', 'User Name'], required: true, pii: 'name' },
  end_date: { type: 'date', aliases: ['End Date', 'Last Day', 'Termination Date', 'Leaving Date'], required: true },
});

export const SETTINGS_SCHEMA = { type: 'object', additionalProperties: false, properties: {
  unused_months: { type: 'integer', minimum: 1, description: 'Months in a row with no use before a line is flagged (default 2)' },
  roaming_max: { type: 'number', minimum: 0, description: 'Roaming charges in one month above which a line is flagged (default 50)' },
  plan_use_pct: { type: 'number', minimum: 1, maximum: 100, description: 'Share of the data allowance under which a plan counts as oversized, every month (default 20)' },
} };
export const DEFAULTS = Object.freeze({ unused_months: 2, roaming_max: 50, plan_use_pct: 20 });

export function reviewTelecom(rows, leaverRows = [], settings = {}) {
  const s = { ...DEFAULTS, ...settings };
  const ls = rows.filter((r) => str(r.line_number) && monthOf(r.month)).map((r) => ({ line: str(r.line_number), month: monthOf(r.month), user: str(r.user), type: low(r.line_type) || 'mobile', plan: str(r.plan), charge: num(r.monthly_charge) || 0, data: num(r.data_gb), allow: num(r.data_allowance_gb), minutes: num(r.minutes), roaming: num(r.roaming_charge) || 0, premium: num(r.premium_charge) || 0 }));
  const months = [...new Set(ls.map((l) => l.month))].sort(); const cur = months.at(-1);
  const byLine = new Map(); for (const l of ls) byLine.set(l.line, [...(byLine.get(l.line) || []), l]);
  const leavers = new Map(leaverRows.filter((r) => str(r.user) && isoDate(r.end_date)).map((r) => [low(r.user), isoDate(r.end_date)]));
  const items = []; const userLines = new Map();
  for (const [line, list] of byLine) {
    list.sort((a, b) => (a.month < b.month ? -1 : 1));
    const last = list.at(-1); if (last.month !== cur) continue; const user = last.user;
    const end = user && leavers.get(low(user));
    if (end && end < `${cur}-01`) items.push(finding('line_of_leaver', 'high', line, `Line ${line} is still billed (${last.charge} in ${cur}) for ${user}, who left on ${end}.`, 'Cancel the line or move it to the person who took over the role.', { subject: user, amount: last.charge }));
    const recent = list.slice(-s.unused_months);
    if (recent.length >= s.unused_months && recent.every((m) => (m.data ?? 0) === 0 && (m.minutes ?? 0) === 0)) items.push(finding('unused_line', 'medium', line, `${last.type} line ${line}${user ? ` (${user})` : ''} had no calls or data for ${recent.length} month(s) but cost ${round2(recent.reduce((t, m) => t + m.charge, 0))}.`, 'Confirm with the user, then suspend or cancel it.', { subject: user || line, amount: last.charge }));
    if (last.roaming > s.roaming_max) items.push(finding('roaming_spike', 'medium', line, `Line ${line}${user ? ` (${user})` : ''} ran up ${last.roaming} in roaming in ${cur}.`, 'Add a travel pass before trips, or cap roaming on the line.', { subject: user || line, amount: last.roaming }));
    if (last.premium > 0) items.push(finding('premium_charges', 'low', line, `Line ${line} has ${last.premium} in premium or third-party charges in ${cur}.`, 'Ask the carrier to block premium services on company lines and to refund unrequested ones.', { subject: user || line, amount: last.premium }));
    const withAllow = list.filter((m) => m.allow && m.data !== null);
    if (withAllow.length >= 2 && withAllow.every((m) => (100 * m.data) / m.allow < s.plan_use_pct)) items.push(finding('oversized_plan', 'low', line, `Line ${line} used at most ${Math.max(...withAllow.map((m) => m.data))} GB of a ${withAllow.at(-1).allow} GB plan in ${withAllow.length} months.`, 'Move it to a smaller plan at the next change window.', { subject: user || line }));
    if (user && /mobile|cell|wireless|smartphone|phone/.test(last.type)) userLines.set(low(user), [...(userLines.get(low(user)) || []), { line, user }]);
  }
  for (const [, list] of userLines) if (list.length > 1) items.push(finding('two_lines_one_user', 'low', list[0].user, `${list[0].user} has ${list.length} active mobile lines (${list.map((x) => x.line).sort().join(', ')}).`, 'Check whether both are needed (a work phone and a data-only device is common).', { subject: list[0].user }));
  const now = ls.filter((l) => l.month === cur);
  return { month: cur || null, lines: now.length, total: round2(now.reduce((t, l) => t + l.charge, 0)), roaming: round2(now.reduce((t, l) => t + l.roaming, 0)), items };
}
