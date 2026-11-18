import { readFileSync } from 'node:fs';
import { wireAgent, fileArg, SETTINGS_ARG, AS_OF_ARG, settingsFrom, LIMITS, today } from 'fairwire-core';
import { PRINTER_FIELDS, ASSET_FIELDS, SETTINGS_SCHEMA, DEFAULTS, reviewPrinters } from './logic.js';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const args = {
  printers: fileArg('Print fleet export under --root (PaperCut, print management or managed print services report as CSV, Excel or JSON): one row per printer with site, model, status, last report, firmware, mono and colour pages this month, supply level, lease and click charges and lease end'),
  assets: fileArg('Optional asset list of printers'),
  settings: SETTINGS_ARG('offline_days, idle_pages, cost_per_page_max, color_share_pct, supply_min_pct, lease_notice_days'),
  as_of: AS_OF_ARG,
};

export const manifest = wireAgent({
  pkg, prefix: 'ostro', title: 'Ostro of Printers',
  description: 'Reviews a print fleet export: printers offline, leases ending, printers nobody uses, cost per page above your limit, high colour share, low supplies, old firmware and printers missing from your asset list. Drafts a consolidation note; never changes a printer.',
  args, required: ['printers'],
  sources: { printers: { label: 'Printers', args: ['printers'], fields: PRINTER_FIELDS }, assets: { label: 'Printer assets', args: ['assets'], fields: ASSET_FIELDS } },
  configSchemas: { ostro_settings: SETTINGS_SCHEMA },
  run: (a, ctx) => reviewPrinters(ctx.records(a.printers, 'printers'), a.assets ? ctx.records(a.assets, 'assets') : [], settingsFrom(a, ctx, 'ostro_settings', DEFAULTS), a.as_of || today()),
  summary: (o) => `${o.printers} printer(s), ${o.pages} page(s) this month, ${o.cost} in lease and clicks (${o.cost_per_page} a page): ${o.open} open finding(s), ${o.high} high.`,
  check: { title: 'Review the print fleet', description: 'Review the print fleet export and list offline, idle, costly, colour-heavy, low-supply, outdated and unrecorded printers and leases ending.' },
  explain: { arg: 'printer', argSchema: { type: 'string', maxLength: 200, description: 'Printer name or site from ostro_check' }, title: 'Explain one printer or site', description: 'Every finding for one printer or site.', match: (i, v) => i.key === v || i.site === v },
  report: {
    title: 'Print fleet review', base: 'ostro-printers',
    sections: (o) => [{ title: 'By site', rows: o.by_site, columns: ['site', 'printers', 'pages', 'cost'] }],
    limits: [LIMITS.files, 'Cost per page is lease plus click charges over this month\'s pages; paper, power and staff time are not included.', LIMITS.defaults, LIMITS.estimate, LIMITS.live],
  },
  note: { noun: 'consolidation_note', verb: 'send', category: 'binding_send', actor: 'the facilities or IT owner', to: 'facilities and the print supplier', subject: 'Printers to remove, change or renew', ask: 'Please confirm with each site before any printer is removed or any lease is changed.' },
  refused: [
    { name: 'printer_apply_settings', category: 'production_deploy', description: 'Ostro never changes printer settings, drivers or firmware.' },
    { name: 'supplier_order_supplies', category: 'move_money', description: 'Ostro never orders supplies or signs a lease.' },
  ],
  prompt: { title: 'Review the print fleet', description: 'Walks the host model through a print fleet review with Ostro.', text: 'You are helping an IT or facilities lead review printers with ostro-of-printers. Ostro only reads exports. 1. Call ostro_check; lead with leases ending and idle printers. 2. Use ostro_explain for one site. 3. Call ostro_write_report. 4. Offer ostro_draft_consolidation_note; ostro_request_send waits for one named click.' },
});
