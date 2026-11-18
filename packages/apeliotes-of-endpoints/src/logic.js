// Apeliotes of Endpoints: endpoint protection coverage. Pure functions.
import { str, low, yes, isoDate, daysBetween, hostKey, versionCompare, pct, finding } from 'fairwire-core';

export const CHECKS = Object.freeze({
  no_agent: 'A device in your asset list with no endpoint security agent in the console export.',
  protection_off: 'Real-time protection is turned off on a device.',
  open_high_alert: 'A high or critical alert still open after your limit.',
  tamper_off: 'Tamper protection is off, so malware or a user can switch the agent off.',
  passive_mode: 'The agent runs in passive mode (detects but does not block) on a device where it should block.',
  agent_not_reporting: 'An agent that has not checked in for longer than your limit.',
  old_signatures: 'Detection signatures older than your limit.',
  two_products: 'Two different security products on one device (they can conflict and slow the device).',
  old_agent: 'An agent version older than the one you require.',
});

export const DEVICE_FIELDS = Object.freeze({
  device: { aliases: ['Device Name', 'Device', 'Hostname', 'Computer Name', 'Endpoint', 'Machine Name'], required: true },
  product: { aliases: ['Product', 'Agent', 'Security Product', 'Sensor', 'Antivirus'] },
  agent_version: { aliases: ['Agent Version', 'Sensor Version', 'Client Version', 'Version'] },
  signature_date: { type: 'date', aliases: ['Signature Date', 'Definitions Date', 'Security Intelligence Updated', 'Definition Version Date', 'Signature Updated'] },
  last_seen: { type: 'datetime', aliases: ['Last Seen', 'Last Device Update', 'Last Check-in', 'Last Contact', 'Last Communication'] },
  protection: { aliases: ['Real-time Protection', 'Protection', 'RTP', 'Real Time Protection Enabled', 'Health State'] },
  tamper_protection: { aliases: ['Tamper Protection', 'Tamper', 'Uninstall Protection'] },
  mode: { aliases: ['Mode', 'Antivirus Mode', 'Defender Mode', 'Prevention Mode', 'Policy Mode'] },
});
export const ASSET_FIELDS = Object.freeze({
  device: { aliases: ['Device Name', 'Hostname', 'Name', 'Computer Name', 'Asset Name'], required: true },
  type: { aliases: ['Type', 'Device Type', 'Class', 'Category'] },
});
export const ALERT_FIELDS = Object.freeze({
  alert_id: { aliases: ['Alert ID', 'ID', 'Incident ID', 'Detection ID'], required: true },
  device: { aliases: ['Device Name', 'Device', 'Hostname', 'Computer Name'], required: true },
  severity: { aliases: ['Severity', 'Priority', 'Risk'] },
  status: { aliases: ['Status', 'State', 'Resolution'] },
  created: { type: 'datetime', aliases: ['Created', 'First Seen', 'Alert Time', 'Detected', 'Timestamp'] },
  title: { aliases: ['Title', 'Alert', 'Name', 'Threat'] },
});

export const SETTINGS_SCHEMA = { type: 'object', additionalProperties: false, properties: {
  stale_days: { type: 'integer', minimum: 1, description: 'Days without a check-in after which an agent counts as not reporting (default 7)' },
  signature_max_days: { type: 'integer', minimum: 1, description: 'Days after which signatures count as old (default 3)' },
  alert_open_days: { type: 'integer', minimum: 0, description: 'Days a high or critical alert may stay open (default 2)' },
  min_agent_version: { type: 'string', maxLength: 40, description: 'Oldest agent version you accept (no check when empty)' },
  passive_ok: { type: 'array', items: { type: 'string' }, maxItems: 1000, description: 'Devices where passive mode is intended (another product blocks)' },
  asset_types_without_agent: { type: 'array', items: { type: 'string' }, maxItems: 50, description: 'Asset types that cannot run an agent and are skipped by the coverage check (default printer, camera, phone, network)' },
} };
export const DEFAULTS = Object.freeze({ stale_days: 7, signature_max_days: 3, alert_open_days: 2, min_agent_version: '', passive_ok: [], asset_types_without_agent: ['printer', 'camera', 'phone', 'network', 'switch', 'access point'] });

const OFF = /^(off|disabled|no|false|0|inactive|not running|unhealthy)$/i;

export function reviewEndpoints({ devices = [], assets = [], alerts = [] }, settings = {}, asOf) {
  const s = { ...DEFAULTS, ...settings };
  const ds = devices.filter((r) => str(r.device)).map((r) => ({ key: hostKey(r.device), name: str(r.device), product: str(r.product) || 'agent', version: str(r.agent_version), sig: isoDate(r.signature_date), seen: isoDate(r.last_seen), protection: str(r.protection), tamper: str(r.tamper_protection), mode: low(r.mode) }));
  const byDev = new Map(); for (const d of ds) byDev.set(d.key, [...(byDev.get(d.key) || []), d]);
  const items = [];
  for (const [, list] of byDev) {
    const d = list[0]; const n = d.name;
    const products = [...new Set(list.map((x) => low(x.product)))];
    if (products.length > 1) items.push(finding('two_products', 'low', n, `${n} reports ${products.length} security products (${[...new Set(list.map((x) => x.product))].sort().join(', ')}).`, 'Keep one product in blocking mode and remove the other, or set the second to passive on purpose.', { subject: n }));
    for (const x of list) {
      if (OFF.test(x.protection) || yes(x.protection) === false) items.push(finding('protection_off', 'high', n, `Real-time protection is off on ${n} (${x.product}).`, 'Turn it back on and find out who or what turned it off.', { subject: n }));
      if (x.tamper && (OFF.test(x.tamper) || yes(x.tamper) === false)) items.push(finding('tamper_off', 'medium', n, `Tamper protection is off on ${n} (${x.product}).`, 'Turn tamper protection on in the console policy for this device.', { subject: n }));
      if (/passive|detect only|audit|monitor/.test(x.mode) && !s.passive_ok.map(hostKey).includes(x.key)) items.push(finding('passive_mode', 'medium', n, `${x.product} on ${n} runs in ${x.mode} mode and does not block threats.`, 'Switch it to active or blocking mode, or list the device in passive_ok if another product blocks.', { subject: n }));
      if (x.seen && asOf && daysBetween(x.seen, asOf) > s.stale_days) items.push(finding('agent_not_reporting', 'medium', n, `${x.product} on ${n} last checked in on ${x.seen}.`, 'Check that the device is on and the agent service runs; reinstall it if needed.', { subject: n }));
      if (x.sig && asOf && daysBetween(x.sig, asOf) > s.signature_max_days) items.push(finding('old_signatures', 'medium', n, `${x.product} signatures on ${n} date from ${x.sig}.`, 'Check the device can reach its update source.', { subject: n }));
      if (s.min_agent_version && x.version && versionCompare(x.version, s.min_agent_version) < 0) items.push(finding('old_agent', 'low', n, `${n} runs ${x.product} ${x.version}, older than ${s.min_agent_version}.`, 'Update the agent.', { subject: n }));
    }
  }
  const skip = s.asset_types_without_agent.map(low);
  const covered = new Set(byDev.keys()); let inScope = 0;
  for (const a of assets) {
    const k = hostKey(a.device); if (!k) continue; const t = low(a.type);
    if (t && skip.some((x) => t.includes(x))) continue; inScope++;
    if (!covered.has(k)) items.push(finding('no_agent', 'high', str(a.device), `${str(a.device)} is in your asset list but has no security agent in the export.`, 'Install the agent, or record why this device cannot run one.', { subject: str(a.device) }));
  }
  for (const al of alerts) {
    const sev = low(al.severity); const open = !/resolved|closed|remediated|dismissed|false positive/i.test(str(al.status));
    if (open && /high|critical|severe/.test(sev) && asOf && isoDate(al.created) && daysBetween(al.created, asOf) > s.alert_open_days) items.push(finding('open_high_alert', 'high', str(al.alert_id), `${str(al.severity)} alert ${str(al.alert_id)}${str(al.title) ? ` (${str(al.title)})` : ''} on ${str(al.device)} has been open since ${isoDate(al.created)}.`, 'Investigate and close it, or escalate to your security provider.', { subject: str(al.device) }));
  }
  return { devices: byDev.size, assets_in_scope: inScope, covered_pct: inScope ? pct([...new Set(assets.map((a) => hostKey(a.device)))].filter((k) => covered.has(k)).length, inScope) : null, open_alerts: alerts.filter((a) => !/resolved|closed|remediated|dismissed|false positive/i.test(str(a.status))).length, items };
}
