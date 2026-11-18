// Sirocco of Cloud: cloud bill review from AWS, Azure or Google Cloud cost exports. Pure functions.
import { num, str, low, monthOf, isoDate, daysBetween, pct, round2, finding } from 'fairwire-core';

export const CHECKS = Object.freeze({
  region_not_allowed: 'Spend in a region outside your list (often a forgotten test or a mistake, sometimes a stolen account).',
  month_jump: 'A service in an account that cost much more this month than last month.',
  untagged_spend: 'A share of the month\'s spend with no owner tag, so nobody is accountable for it.',
  commitment_expiring: 'A savings plan, reservation or committed-use discount that ends soon; renewing or not changes next month\'s bill.',
  dev_always_on: 'A development or test resource billed for (almost) every hour of the month, nights and weekends included.',
  egress_share: 'Data transfer out of the cloud is a large share of an account\'s spend.',
  marketplace_charge: 'A marketplace or third-party charge on the cloud bill, for its owner to confirm.',
});

export const COST_FIELDS = Object.freeze({
  date: { type: 'date', aliases: ['Date', 'Usage Date', 'Billing Period', 'Month', 'lineItem/UsageStartDate', 'Usage start time'], required: true },
  account: { aliases: ['Account', 'Account ID', 'Subscription', 'SubscriptionName', 'Project', 'Project name', 'lineItem/UsageAccountId'] },
  service: { aliases: ['Service', 'Product', 'MeterCategory', 'Service description', 'lineItem/ProductCode', 'Service Name'], required: true },
  region: { aliases: ['Region', 'Location', 'ResourceLocation', 'product/region', 'Region/Zone'] },
  resource_id: { aliases: ['Resource ID', 'ResourceId', 'lineItem/ResourceId', 'Resource', 'Resource name'] },
  cost: { type: 'money', aliases: ['Cost', 'CostInBillingCurrency', 'Unblended Cost', 'lineItem/UnblendedCost', 'Cost ($)', 'Amount'], required: true },
  owner: { aliases: ['Owner', 'Tag: owner', 'resourceTags/user:owner', 'Owner Tag', 'Cost Center', 'Team'] },
  environment: { aliases: ['Environment', 'Env', 'Tag: environment', 'resourceTags/user:env', 'Stage'] },
  usage_type: { aliases: ['Usage Type', 'lineItem/UsageType', 'MeterName', 'SKU description', 'Meter'] },
  usage_hours: { type: 'number', aliases: ['Usage Hours', 'Hours', 'Running Hours', 'Usage Quantity (Hrs)'] },
  charge_type: { aliases: ['Charge Type', 'lineItem/LineItemType', 'ChargeType', 'Cost type'] },
});
export const COMMIT_FIELDS = Object.freeze({
  commitment: { aliases: ['Commitment', 'ID', 'Savings Plan ID', 'Reservation ID', 'Name'], required: true },
  type: { aliases: ['Type', 'Commitment Type', 'Plan Type'] },
  end_date: { type: 'date', aliases: ['End Date', 'Expires', 'Expiration', 'Term End'], required: true },
  monthly_amount: { type: 'money', aliases: ['Monthly Amount', 'Monthly Commitment', 'Amount', 'Recurring Fee'] },
});

export const SETTINGS_SCHEMA = { type: 'object', additionalProperties: false, properties: {
  allowed_regions: { type: 'array', items: { type: 'string' }, maxItems: 100, description: 'Regions you use (no check when empty)' },
  jump_pct: { type: 'number', minimum: 1, description: 'Month-on-month rise in percent that is flagged (default 50)' },
  jump_min: { type: 'number', minimum: 0, description: 'Smallest rise in money worth flagging (default 100)' },
  untagged_pct: { type: 'number', minimum: 0, maximum: 100, description: 'Share of the month\'s spend with no owner above which it is flagged (default 10)' },
  dev_environments: { type: 'array', items: { type: 'string' }, maxItems: 20, description: 'Environment tag values that mean development or test (default dev, test, staging, qa, sandbox)' },
  always_on_share: { type: 'number', minimum: 0.5, maximum: 1, description: 'Share of the month\'s hours that counts as always on (default 0.95)' },
  egress_pct: { type: 'number', minimum: 1, maximum: 100, description: 'Share of an account\'s spend on data transfer out above which it is flagged (default 10)' },
  commitment_notice_days: { type: 'integer', minimum: 1, description: 'Days before a commitment ends to start flagging it (default 60)' },
} };
export const DEFAULTS = Object.freeze({ allowed_regions: [], jump_pct: 50, jump_min: 100, untagged_pct: 10, dev_environments: ['dev', 'test', 'staging', 'qa', 'sandbox'], always_on_share: 0.95, egress_pct: 10, commitment_notice_days: 60 });

const isCredit = (r) => /credit|refund|discount|savingsplannegation|tax/i.test(r.charge) || r.cost < 0;
const isEgress = (r) => /datatransfer-out|data transfer out|egress|internet data transfer|outbound/i.test(`${r.usage} ${r.service}`);
const isMarket = (r) => /marketplace|third.?party/i.test(`${r.service} ${r.charge}`);
const hoursIn = (m) => { const [y, mo] = m.split('-').map(Number); return new Date(Date.UTC(y, mo, 0)).getUTCDate() * 24; };

export function reviewCloud(rows, commitRows = [], settings = {}, asOf) {
  const s = { ...DEFAULTS, ...settings };
  const ls = rows.map((r) => ({ month: monthOf(r.date), account: str(r.account) || '(no account)', service: str(r.service), region: low(r.region), resource: str(r.resource_id), cost: num(r.cost) || 0, owner: str(r.owner), env: low(r.environment), usage: str(r.usage_type), hours: num(r.usage_hours), charge: str(r.charge_type) })).filter((l) => l.month && l.service);
  const months = [...new Set(ls.map((l) => l.month))].sort(); const cur = months.at(-1); const prev = months.at(-2);
  const now = ls.filter((l) => l.month === cur && !isCredit(l)); const before = ls.filter((l) => l.month === prev && !isCredit(l));
  const total = round2(now.reduce((t, l) => t + l.cost, 0)); const items = [];
  const sumBy = (list, key) => { const m = new Map(); for (const l of list) m.set(key(l), round2((m.get(key(l)) || 0) + l.cost)); return m; };
  if (s.allowed_regions.length) { const allowed = s.allowed_regions.map(low); const bad = sumBy(now.filter((l) => l.region && !['global', 'none', ''].includes(l.region) && !allowed.includes(l.region)), (l) => `${l.account}|${l.region}`); for (const [k, v] of bad) { const [acc, reg] = k.split('|'); items.push(finding('region_not_allowed', 'high', k, `${acc} spent ${v} in ${reg} in ${cur}, a region outside your list.`, 'Find what runs there and who started it; stop it if nobody owns it, and consider a policy that blocks the region.', { subject: acc, amount: v })); } }
  if (prev) { const a = sumBy(now, (l) => `${l.account}|${l.service}`); const b = sumBy(before, (l) => `${l.account}|${l.service}`); for (const [k, v] of a) { const p = b.get(k) || 0; const d = round2(v - p); if (d >= s.jump_min && (p === 0 || (100 * d) / p >= s.jump_pct)) { const [acc, svc] = k.split('|'); items.push(finding('month_jump', p === 0 || d >= 5 * s.jump_min ? 'medium' : 'low', k, `${svc} in ${acc} cost ${v} in ${cur} against ${p} in ${prev} (+${d}).`, 'Ask the account owner what changed; look at new resources and usage types first.', { subject: acc, amount: d })); } } }
  const untagged = round2(now.filter((l) => !l.owner).reduce((t, l) => t + l.cost, 0)); const up = pct(untagged, total);
  if (total && up > s.untagged_pct) items.push(finding('untagged_spend', 'medium', cur, `${untagged} of ${total} spent in ${cur} (${up}%) has no owner tag.`, 'Tag the resources, or enforce an owner tag with a policy so new resources cannot be created without one.', { subject: cur, amount: untagged }));
  const dev = new Set(s.dev_environments.map(low));
  for (const l of now) if (dev.has(l.env) && l.hours !== null && l.hours >= s.always_on_share * hoursIn(cur)) items.push(finding('dev_always_on', 'low', l.resource || `${l.account}|${l.service}`, `${l.env} resource ${l.resource || l.service} in ${l.account} ran ${l.hours} of ${hoursIn(cur)} hours in ${cur} (${l.cost}).`, 'Stop it nights and weekends with a schedule, if nobody needs it then.', { subject: l.account, amount: l.cost }));
  const byAcc = sumBy(now, (l) => l.account); const egress = sumBy(now.filter(isEgress), (l) => l.account);
  for (const [acc, e] of egress) { const sh = pct(e, byAcc.get(acc)); if (sh > s.egress_pct) items.push(finding('egress_share', 'low', acc, `Data transfer out was ${e} of ${byAcc.get(acc)} in ${acc} in ${cur} (${sh}%).`, 'Find the largest sources of outbound traffic; a CDN, compression or keeping traffic in one region often helps.', { subject: acc, amount: e })); }
  for (const l of now.filter(isMarket)) items.push(finding('marketplace_charge', 'low', `${l.account}|${l.resource || l.usage || l.service}`, `${l.account} paid ${l.cost} for a marketplace product (${l.resource || l.usage || l.service}) in ${cur}.`, 'Confirm with its owner that it is still used and on the right contract.', { subject: l.account, amount: l.cost }));
  for (const c of commitRows) { const end = isoDate(c.end_date); if (!end || !asOf) continue; const days = daysBetween(asOf, end); if (days >= 0 && days <= s.commitment_notice_days) items.push(finding('commitment_expiring', 'medium', str(c.commitment), `${str(c.type) || 'Commitment'} ${str(c.commitment)} ends on ${end} (in ${days} days)${num(c.monthly_amount) !== null ? `; it covers ${num(c.monthly_amount)} a month` : ''}.`, 'Decide whether to renew, change or let it lapse, based on the last three months of use.', { subject: str(c.commitment), ends: end })); }
  const credits = round2(ls.filter((l) => l.month === cur && isCredit(l)).reduce((t, l) => t + l.cost, 0));
  return { months, month: cur || null, total, previous_total: prev ? round2(before.reduce((t, l) => t + l.cost, 0)) : null, credits, untagged_pct: total ? up : 0, by_service: [...sumBy(now, (l) => l.service).entries()].map(([service, cost]) => ({ service, cost })).sort((a, b) => b.cost - a.cost || (a.service < b.service ? -1 : 1)), items };
}
