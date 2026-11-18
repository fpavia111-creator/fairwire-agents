// Ostro of Printers: print fleet review. Pure functions.
import { num, str, low, isoDate, daysBetween, hostKey, versionCompare, pct, round2, finding } from 'fairwire-core';

export const CHECKS = Object.freeze({
  printer_offline: 'A printer that is offline or has not reported for longer than your limit.',
  lease_ending: 'A printer lease ending within your notice window (decide to renew, replace or return).',
  idle_printer: 'A printer that prints fewer pages a month than your limit (a candidate to remove or consolidate).',
  high_cost_per_page: 'A printer whose lease and click charges come to more per page than your limit.',
  high_color_share: 'A printer where colour is a large share of the pages.',
  low_supplies: 'A toner or ink level under your limit.',
  old_firmware: 'A printer on older firmware than others of the same model.',
  not_in_assets: 'A printer in the print management export that is not in your asset list.',
});

export const PRINTER_FIELDS = Object.freeze({
  printer: { aliases: ['Printer', 'Device', 'Device Name', 'Name', 'Queue', 'Printer Name'], required: true },
  site: { aliases: ['Site', 'Location', 'Office', 'Building'] },
  model: { aliases: ['Model', 'Device Model', 'Product'] },
  status: { aliases: ['Status', 'State', 'Online'] },
  last_seen: { type: 'datetime', aliases: ['Last Seen', 'Last Contact', 'Last Report', 'Last Communication'] },
  firmware: { aliases: ['Firmware', 'Firmware Version', 'Version'] },
  mono_pages: { type: 'number', aliases: ['Mono Pages', 'Black Pages', 'B/W Pages', 'Mono Pages (month)'] },
  color_pages: { type: 'number', aliases: ['Colour Pages', 'Color Pages', 'Color Pages (month)'] },
  supply_pct: { type: 'number', aliases: ['Lowest Supply %', 'Toner %', 'Supply Level', 'Toner Level', 'Ink Level'] },
  lease_monthly: { type: 'money', aliases: ['Lease Monthly', 'Monthly Lease', 'Rental', 'Service Fee'] },
  mono_click: { type: 'number', aliases: ['Mono Click', 'Mono CPP', 'Black Click Rate', 'Mono Cost Per Page'] },
  color_click: { type: 'number', aliases: ['Colour Click', 'Color Click', 'Color CPP', 'Color Cost Per Page'] },
  lease_end: { type: 'date', aliases: ['Lease End', 'Contract End', 'End Date', 'Lease Expiry'] },
});
export const ASSET_FIELDS = Object.freeze({ printer: { aliases: ['Printer', 'Device Name', 'Name', 'Hostname', 'Asset Name'], required: true } });

export const SETTINGS_SCHEMA = { type: 'object', additionalProperties: false, properties: {
  offline_days: { type: 'integer', minimum: 1, description: 'Days without a report after which a printer counts as offline (default 3)' },
  idle_pages: { type: 'integer', minimum: 1, description: 'Pages a month under which a printer counts as idle (default 100)' },
  cost_per_page_max: { type: 'number', minimum: 0, description: 'Cost per page above which a printer is flagged (default 0.25)' },
  color_share_pct: { type: 'number', minimum: 1, maximum: 100, description: 'Colour share above which a printer is flagged (default 40)' },
  supply_min_pct: { type: 'number', minimum: 0, maximum: 100, description: 'Supply level under which a printer is flagged (default 10)' },
  lease_notice_days: { type: 'integer', minimum: 1, description: 'Days before the lease end to start flagging (default 90)' },
} };
export const DEFAULTS = Object.freeze({ offline_days: 3, idle_pages: 100, cost_per_page_max: 0.25, color_share_pct: 40, supply_min_pct: 10, lease_notice_days: 90 });

export function reviewPrinters(rows, assetRows = [], settings = {}, asOf) {
  const s = { ...DEFAULTS, ...settings };
  const ps = rows.filter((r) => str(r.printer)).map((r) => ({ name: str(r.printer), key: hostKey(r.printer), site: str(r.site), model: str(r.model), status: low(r.status), seen: isoDate(r.last_seen), fw: str(r.firmware), mono: num(r.mono_pages) || 0, color: num(r.color_pages) || 0, supply: num(r.supply_pct), lease: num(r.lease_monthly) || 0, mclick: num(r.mono_click) || 0, cclick: num(r.color_click) || 0, end: isoDate(r.lease_end) }));
  const newest = {}; for (const p of ps) if (p.model && p.fw && (!newest[p.model] || versionCompare(p.fw, newest[p.model]) > 0)) newest[p.model] = p.fw;
  const assets = new Set(assetRows.map((a) => hostKey(a.printer)).filter(Boolean));
  const items = []; const sites = {};
  for (const p of ps) {
    const pages = p.mono + p.color; const cost = round2(p.lease + p.mono * p.mclick + p.color * p.cclick);
    const e = sites[p.site || '(no site)'] || (sites[p.site || '(no site)'] = { site: p.site || '(no site)', printers: 0, pages: 0, cost: 0 }); e.printers++; e.pages += pages; e.cost = round2(e.cost + cost);
    if (/offline|error|unreachable|down/.test(p.status) || (p.seen && asOf && daysBetween(p.seen, asOf) > s.offline_days)) items.push(finding('printer_offline', 'medium', p.name, `${p.name}${p.site ? ` at ${p.site}` : ''} is offline${p.seen ? ` (last report ${p.seen})` : ''}.`, 'Check power, network and paper jams; if nobody misses it, consider removing it.', { subject: p.name, site: p.site }));
    if (p.end && asOf) { const d = daysBetween(asOf, p.end); if (d <= s.lease_notice_days) items.push(finding('lease_ending', 'medium', p.name, `The lease on ${p.name} ${d < 0 ? 'ended' : 'ends'} on ${p.end}${d >= 0 ? ` (in ${d} days)` : ''}.`, 'Decide whether to renew, replace or return it before the notice date in the lease.', { subject: p.name, site: p.site })); }
    if (pages < s.idle_pages) items.push(finding('idle_printer', 'medium', p.name, `${p.name} printed ${pages} page(s) this month${cost ? ` and cost ${cost}` : ''}.`, 'Remove it or move its users to a nearby printer.', { subject: p.name, site: p.site }));
    else { const cpp = round2(cost / pages); if (cpp > s.cost_per_page_max) items.push(finding('high_cost_per_page', 'low', p.name, `${p.name} costs ${cpp} a page (${cost} for ${pages} pages).`, 'Compare its lease and click rates with the rest of the fleet at renewal.', { subject: p.name, site: p.site })); }
    const cs = pct(p.color, pages); if (pages >= s.idle_pages && cs > s.color_share_pct) items.push(finding('high_color_share', 'low', p.name, `${cs}% of the pages on ${p.name} are colour.`, 'Set colour to opt-in in the driver defaults.', { subject: p.name, site: p.site }));
    if (p.supply !== null && p.supply < s.supply_min_pct) items.push(finding('low_supplies', 'low', p.name, `${p.name} is down to ${p.supply}% on its lowest supply.`, 'Order the cartridge (or check that the supplier auto-ships).', { subject: p.name, site: p.site }));
    if (p.model && p.fw && versionCompare(p.fw, newest[p.model]) < 0) items.push(finding('old_firmware', 'low', p.name, `${p.name} (${p.model}) runs firmware ${p.fw}; others of the model run ${newest[p.model]}.`, 'Update it in a quiet hour.', { subject: p.name, site: p.site }));
    if (assets.size && !assets.has(p.key)) items.push(finding('not_in_assets', 'low', p.name, `${p.name} is not in your asset list.`, 'Add it, with its location and lease.', { subject: p.name, site: p.site }));
  }
  const pages = ps.reduce((t, p) => t + p.mono + p.color, 0); const cost = round2(Object.values(sites).reduce((t, e) => t + e.cost, 0));
  return { printers: ps.length, pages, cost, cost_per_page: pages ? round2(cost / pages) : 0, by_site: Object.values(sites).sort((a, b) => (a.site < b.site ? -1 : 1)), items };
}
