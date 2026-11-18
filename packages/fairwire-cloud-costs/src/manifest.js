import { readFileSync } from 'node:fs';
import { wireAgent, fileArg, SETTINGS_ARG, AS_OF_ARG, settingsFrom, LIMITS, exportProfile, today } from 'fairwire-core';
import { COST_FIELDS, COMMIT_FIELDS, SETTINGS_SCHEMA, DEFAULTS, reviewCloud } from './logic.js';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const args = {
  costs: fileArg('Cloud cost export under --root (AWS Cost and Usage Report, Azure cost details, Google Cloud billing export or any CSV, Excel or JSON) covering at least the last two months: one row per day or month per resource with account, service, region, cost, owner and environment tags, usage type and hours'),
  commitments: fileArg('Optional list of savings plans, reservations or committed-use discounts with their end dates'),
  settings: SETTINGS_ARG('allowed_regions, jump_pct, jump_min, untagged_pct, dev_environments, always_on_share, egress_pct, commitment_notice_days'),
  as_of: AS_OF_ARG,
};
const PROFILES = [
  exportProfile('aws_cur', { date: 'lineItem/UsageStartDate', account: 'lineItem/UsageAccountId', service: 'lineItem/ProductCode', region: 'product/region', resource_id: 'lineItem/ResourceId', cost: 'lineItem/UnblendedCost', usage_type: 'lineItem/UsageType', charge_type: 'lineItem/LineItemType' }),
  exportProfile('azure_cost_details', { date: 'Date', account: 'SubscriptionName', service: 'MeterCategory', region: 'ResourceLocation', resource_id: 'ResourceId', cost: 'CostInBillingCurrency', usage_type: 'MeterName', charge_type: 'ChargeType' }),
  exportProfile('gcp_billing_report', { date: 'Usage start time', account: 'Project name', service: 'Service description', usage_type: 'SKU description', cost: 'Cost ($)' }),
];

export const manifest = wireAgent({
  pkg, prefix: 'cloud_costs', title: 'Fairwire Cloud Costs',
  description: 'Reviews AWS, Azure and Google Cloud cost exports for the latest month: spend in regions outside your list, services that jumped month on month, spend with no owner tag, commitments about to end, dev and test resources running all month, data egress and marketplace charges. Drafts notes for owners; never changes a cloud account.',
  args, required: ['costs'],
  sources: { costs: { label: 'Cloud cost lines', args: ['costs'], fields: COST_FIELDS, profiles: PROFILES }, commitments: { label: 'Commitments', args: ['commitments'], fields: COMMIT_FIELDS } },
  configSchemas: { cloud_costs_settings: SETTINGS_SCHEMA },
  run: (a, ctx) => reviewCloud(ctx.records(a.costs, 'costs'), a.commitments ? ctx.records(a.commitments, 'commitments') : [], settingsFrom(a, ctx, 'cloud_costs_settings', DEFAULTS), a.as_of || today()),
  summary: (o) => `${o.month ? `${o.month}: ${o.total} spent${o.previous_total !== null ? ` (previous month ${o.previous_total})` : ''}, credits ${o.credits}, ${o.untagged_pct}% untagged` : 'No cost lines'}: ${o.open} open finding(s), ${o.high} high.`,
  check: { title: 'Review the cloud bill', description: 'Review the latest month of cloud costs against the month before and list region, jump, tagging, commitment, always-on, egress and marketplace findings.' },
  explain: { arg: 'account', argSchema: { type: 'string', maxLength: 200, description: 'Account, subscription or project from cloud_costs_check' }, title: 'Explain one account', description: 'Every finding for one account, subscription or project.', match: (i, v) => i.subject === v || String(i.key).split('|')[0] === v || i.key === v },
  report: {
    title: 'Cloud bill review', base: 'cloud-costs',
    sections: (o) => [{ title: 'By service', rows: o.by_service.slice(0, 25), columns: ['service', 'cost'] }],
    limits: [LIMITS.files, 'Amounts are the costs in your export, in its currency, before or after discounts as the export shows them; this is not an invoice check against your contract.', 'Month-on-month rises compare the last two months in the file; a month that is not complete yet looks smaller.', LIMITS.defaults, LIMITS.estimate, LIMITS.live],
  },
  note: { noun: 'owner_note', verb: 'send', category: 'binding_send', actor: 'the cloud cost owner', to: 'account owners and finance', subject: 'Cloud spend to look at', ask: 'Please explain or fix each item; nothing is stopped or deleted until the owner agrees.' },
  refused: [
    { name: 'cloud_stop_resource', category: 'production_deploy', description: 'Fairwire Cloud Costs never stops, resizes or deletes a cloud resource.' },
    { name: 'cloud_buy_commitment', category: 'move_money', description: 'Fairwire Cloud Costs never buys or renews a savings plan, reservation or commitment.' },
  ],
  prompt: { title: 'Review the cloud bill', description: 'Walks the host model through a cloud bill review with Fairwire Cloud Costs.', text: 'You are helping a finance or IT lead review the cloud bill with fairwire-cloud-costs. Fairwire Cloud Costs only reads exports. 1. Call cloud_costs_check; lead with regions outside the list and the largest jumps. 2. Use cloud_costs_explain for one account. 3. Call cloud_costs_write_report. 4. Offer cloud_costs_draft_owner_note; cloud_costs_request_send waits for one named click.' },
});
