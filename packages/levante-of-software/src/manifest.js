import { readFileSync } from 'node:fs';
import { wireAgent, fileArg, SETTINGS_ARG, settingsFrom, LIMITS } from 'fairwire-core';
import { INSTALL_FIELDS, ENTITLEMENT_FIELDS, SETTINGS_SCHEMA, DEFAULTS, reviewSoftware } from './logic.js';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const args = {
  installs: fileArg('Software inventory under --root (Intune discovered apps, Configuration Manager, Lansweeper, PDQ or any CSV, Excel or JSON): one row per device and installed product with version and publisher'),
  entitlements: fileArg('Optional licence list: product, seats owned and annual cost'),
  settings: SETTINGS_ARG('approved, prohibited, min_versions, shelfware_pct, shelfware_min_seats'),
};

export const manifest = wireAgent({
  pkg, prefix: 'levante', title: 'Levante of Software',
  description: 'Compares installed software with the licences you own and your catalogue: prohibited software, products installed on more devices than you have licences for, versions older than your minimum, unapproved software, licences nobody uses and products in many versions. Drafts a true-up note; never uninstalls anything.',
  args, required: ['installs'],
  sources: { installs: { label: 'Installed software', args: ['installs'], fields: INSTALL_FIELDS }, entitlements: { label: 'Licences owned', args: ['entitlements'], fields: ENTITLEMENT_FIELDS } },
  configSchemas: { levante_settings: SETTINGS_SCHEMA },
  run: (a, ctx) => reviewSoftware(ctx.records(a.installs, 'installs'), a.entitlements ? ctx.records(a.entitlements, 'entitlements') : [], settingsFrom(a, ctx, 'levante_settings', DEFAULTS)),
  summary: (o) => `${o.installs} install(s) of ${o.products} product(s) on ${o.devices} device(s), ${o.licensed_products} licensed product(s): ${o.open} open finding(s), ${o.high} high.`,
  check: { title: 'Review software against licences', description: 'Count devices per product and list prohibited, over-deployed, outdated, unapproved, unused and fragmented software.' },
  explain: { arg: 'product', argSchema: { type: 'string', maxLength: 200, description: 'Product name from levante_check' }, title: 'Explain one product', description: 'Every finding for one product.', match: (i, v) => String(i.key).toLowerCase() === String(v).toLowerCase() },
  report: {
    title: 'Software installs against licences', base: 'levante-software',
    limits: [LIMITS.files, 'Products are matched by name (case and bracketed editions ignored); licence terms such as per-user, per-core or second-device rights are not modelled, so a vendor\'s count can differ.', 'Not a licence compliance opinion; your agreement with each vendor decides what you owe.', LIMITS.defaults, LIMITS.live],
  },
  note: { noun: 'true_up_note', verb: 'send', category: 'binding_send', actor: 'the software asset owner', to: 'software asset manager and procurement', subject: 'Software licence gaps and removals', ask: 'Please remove prohibited software first and decide on the shortfalls before the vendor\'s next count.' },
  refused: [
    { name: 'endpoint_uninstall_software', category: 'production_deploy', description: 'Levante never uninstalls or blocks software on a device.' },
    { name: 'vendor_order_licences', category: 'move_money', description: 'Levante never orders licences.' },
  ],
  prompt: { title: 'Review software and licences', description: 'Walks the host model through a software review with Levante.', text: 'You are helping a software asset manager compare installs with licences using levante-of-software. Levante only reads exports. 1. Call levante_check; lead with prohibited software and over-deployed products. 2. Use levante_explain for one product. 3. Call levante_write_report. 4. Offer levante_draft_true_up_note; levante_request_send waits for one named click.' },
});
