// Fairwire Software Licenses: software installs against licences and your catalogue. Pure functions.
import { num, str, low, versionCompare, finding } from 'fairwire-core';

export const CHECKS = Object.freeze({
  prohibited_software: 'Software on your prohibited list installed on devices.',
  over_deployed: 'A product installed on more devices than you own licences for.',
  old_version: 'Devices running a version older than the minimum you set (often unsupported or with known flaws).',
  unapproved_software: 'Software that is not on your approved list.',
  unused_entitlements: 'Licences you pay for that are not installed anywhere (shelfware).',
  many_versions: 'One product installed in three or more versions, which makes patching harder.',
});

export const INSTALL_FIELDS = Object.freeze({
  device: { aliases: ['Device', 'Device Name', 'Computer', 'Computer Name', 'Hostname', 'Machine'], required: true },
  product: { aliases: ['Product', 'Software', 'Application', 'Name', 'Display Name', 'Title'], required: true },
  version: { aliases: ['Version', 'Product Version', 'Display Version'] },
  publisher: { aliases: ['Publisher', 'Vendor', 'Manufacturer'] },
});
export const ENTITLEMENT_FIELDS = Object.freeze({
  product: { aliases: ['Product', 'Software', 'Licence', 'License', 'Title', 'SKU Name'], required: true },
  seats: { type: 'number', aliases: ['Seats', 'Licences', 'Licenses', 'Quantity', 'Entitlements', 'Purchased'], required: true },
  annual_cost: { type: 'money', aliases: ['Annual Cost', 'Cost', 'Price per Year', 'Total Cost'] },
});

export const SETTINGS_SCHEMA = { type: 'object', additionalProperties: false, properties: {
  approved: { type: 'array', items: { type: 'string' }, maxItems: 2000, description: 'Product names on your approved list (no check when empty); a name matches installs that start with it' },
  prohibited: { type: 'array', items: { type: 'string' }, maxItems: 500, description: 'Product names that must not be installed' },
  min_versions: { type: 'object', additionalProperties: { type: 'string' }, description: 'Lowest acceptable version per product, e.g. {"7-Zip": "24.0"}' },
  shelfware_pct: { type: 'number', minimum: 1, maximum: 100, description: 'Share of licences unused above which a product is flagged (default 20)' },
  shelfware_min_seats: { type: 'integer', minimum: 1, description: 'Unused licences a product needs before it is flagged (default 5)' },
} };
export const DEFAULTS = Object.freeze({ approved: [], prohibited: [], min_versions: {}, shelfware_pct: 20, shelfware_min_seats: 5 });

/** A product name compared plainly: lower case, no bracketed parts, single spaces. */
export const productKey = (v) => low(v).replace(/\([^)]*\)/g, ' ').replace(/\s+/g, ' ').trim();
/** A listed name matches every install whose product starts with it (keys are worked out once, not per comparison). */
const startsWith = (installKey, k) => !!k && installKey.startsWith(k);

export function reviewSoftware(installRows, entRows = [], settings = {}) {
  const s = { ...DEFAULTS, ...settings };
  const ins = installRows.filter((r) => str(r.device) && str(r.product)).map((r) => ({ device: low(r.device), product: str(r.product), key: productKey(r.product), version: str(r.version) }));
  const items = []; const byProduct = new Map();
  for (const i of ins) { const l = byProduct.get(i.key); if (l) l.push(i); else byProduct.set(i.key, [i]); }
  const prohibited = s.prohibited.map(productKey); const approved = s.approved.map(productKey);
  const minKeys = Object.keys(s.min_versions).map((p) => [p, productKey(p)]);
  const devicesOf = (list) => new Set(list.map((i) => i.device)).size;
  for (const [key, list] of byProduct) {
    const name = list[0].product; const n = devicesOf(list);
    if (prohibited.some((k) => startsWith(key, k))) items.push(finding('prohibited_software', 'high', name, `${name} is on your prohibited list and is installed on ${n} device(s).`, 'Remove it from these devices and block it in your deployment tool.', { subject: name, devices: n }));
    else if (approved.length && !approved.some((k) => startsWith(key, k))) items.push(finding('unapproved_software', 'medium', name, `${name} is not on your approved list and is installed on ${n} device(s).`, 'Approve it with an owner, or remove it.', { subject: name, devices: n }));
    const minKey = (minKeys.find(([, k]) => startsWith(key, k)) || [])[0];
    if (minKey) { const old = list.filter((i) => i.version && versionCompare(i.version, s.min_versions[minKey]) < 0); if (old.length) items.push(finding('old_version', 'medium', name, `${devicesOf(old)} device(s) run ${name} older than ${s.min_versions[minKey]} (oldest ${old.map((i) => i.version).sort(versionCompare)[0]}).`, 'Update or remove these copies.', { subject: name, devices: devicesOf(old) })); }
    const vers = [...new Set(list.map((i) => i.version).filter(Boolean))];
    if (vers.length >= 3) items.push(finding('many_versions', 'low', name, `${name} is installed in ${vers.length} versions (${vers.sort(versionCompare).join(', ')}).`, 'Standardise on one version in your deployment tool.', { subject: name }));
  }
  const ents = entRows.filter((r) => str(r.product)).map((r) => ({ product: str(r.product), key: productKey(r.product), seats: num(r.seats) || 0, cost: num(r.annual_cost) }));
  // Devices per entitlement key, counted once per distinct key over the product groups (not once per install).
  const devicesByKey = new Map();
  const devicesFor = (k) => {
    if (!devicesByKey.has(k)) { const set = new Set(); if (k) for (const [key, list] of byProduct) if (key.startsWith(k)) for (const i of list) set.add(i.device); devicesByKey.set(k, set.size); }
    return devicesByKey.get(k);
  };
  for (const e of ents) {
    const n = devicesFor(e.key);
    if (n > e.seats) items.push(finding('over_deployed', 'high', e.product, `${e.product} is installed on ${n} device(s) but you own ${e.seats} licence(s) (${n - e.seats} short).`, 'Remove it where it is not needed, or buy the difference before the vendor audits you.', { subject: e.product, short: n - e.seats }));
    const unused = e.seats - n;
    if (unused >= s.shelfware_min_seats && (100 * unused) / Math.max(1, e.seats) > s.shelfware_pct) items.push(finding('unused_entitlements', 'low', e.product, `${unused} of ${e.seats} ${e.product} licence(s) are not installed anywhere${e.cost ? ` (about ${Math.round((e.cost * unused) / e.seats)} a year)` : ''}.`, 'Reduce the count at renewal, or reassign them before buying more.', { subject: e.product, unused }));
  }
  return { installs: ins.length, devices: new Set(ins.map((i) => i.device)).size, products: byProduct.size, licensed_products: ents.length, items };
}
