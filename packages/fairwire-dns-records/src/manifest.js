import { readFileSync, statSync } from 'node:fs';
import { wireAgent, fileArg, SETTINGS_ARG, settingsFrom, LIMITS } from 'fairwire-core';
import { RECORD_FIELDS, SETTINGS_SCHEMA, DEFAULTS, reviewZones } from './logic.js';
import { looksLikeZoneFile, parseZoneFile } from './zonefile.js';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const args = {
  records: fileArg('DNS zone export under --root: a zone (master) file as BIND, Windows DNS, Cloudflare or a zone transfer writes it, or a CSV, Excel or JSON list (Route 53, Azure DNS) with zone, name, type, value and TTL'),
  settings: SETTINGS_ARG('public_zones, owned_cidrs, active_cloud_hosts, cloud_suffixes, ttl_min, ttl_max'),
};

export const manifest = wireAgent({
  pkg, prefix: 'dns_records', title: 'Fairwire DNS Records',
  description: 'Reviews DNS zone exports: names pointing at cloud services that may no longer exist (subdomain takeover risk), CNAMEs next to other records, public names pointing at private addresses, addresses outside the ranges you own, duplicates, TTLs outside your limits and wildcards. Offline; drafts a change request and never edits DNS.',
  args, required: ['records'],
  sources: { records: { label: 'DNS records', args: ['records'], fields: RECORD_FIELDS } },
  configSchemas: { dns_records_settings: SETTINGS_SCHEMA },
  run: (a, ctx) => {
    const settings = settingsFrom(a, ctx, 'dns_records_settings', DEFAULTS);
    // A zone (master) file is read here; anything else goes through the usual table reader.
    if (statSync(ctx.path(a.records)).size <= 200 * 1024 * 1024) {
      const text = ctx.readText(a.records);
      if (looksLikeZoneFile(text)) { const z = parseZoneFile(text); return { ...reviewZones(z.rows, settings), format: 'zone file', ...(z.includes || z.skipped ? { zone_file: { includes_not_followed: z.includes, lines_not_read: z.skipped } } : {}) }; }
    }
    return reviewZones(ctx.records(a.records, 'records'), settings);
  },
  summary: (o) => `${o.records} record(s) for ${o.names} name(s) in ${o.zones} zone(s), ${o.cnames} CNAME(s): ${o.open} open finding(s), ${o.high} high.`,
  check: { title: 'Review DNS zones', description: 'Review the zone export and list takeover-prone CNAMEs, CNAME conflicts, private or foreign addresses, duplicates, TTL problems and wildcards.' },
  explain: { arg: 'name', argSchema: { type: 'string', maxLength: 300, description: 'Record name or zone from dns_records_check' }, title: 'Explain one name or zone', description: 'Every finding for one record name or zone.', match: (i, v) => i.key === v || String(i.key).split('|')[0] === String(v).toLowerCase() || i.subject === String(v).toLowerCase() },
  report: {
    title: 'DNS zone hygiene', base: 'dns-records',
    sections: (o) => [{ title: 'By zone', rows: o.by_zone, columns: ['zone', 'records', 'findings'] }],
    limits: [LIMITS.files, 'Works offline from the export: it does not resolve names or ask cloud providers whether a resource exists. List the cloud host names that still exist in active_cloud_hosts to sharpen the takeover check.', 'Mail records (SPF, DKIM, DMARC, MX) and certificates are covered by the Fairbooks mail authentication and certificate agents, not here.', LIMITS.defaults, LIMITS.live],
  },
  note: { noun: 'change_request', verb: 'submit', category: 'production_deploy', actor: 'the DNS owner', to: 'DNS and network change board', subject: 'DNS records to change or remove', ask: 'Please remove dangling records today; check each other change with the service owner first.' },
  refused: [
    { name: 'dns_update_record', category: 'production_deploy', description: 'Fairwire DNS Records never creates, changes or deletes a DNS record.' },
    { name: 'dns_live_lookup', category: 'production_deploy', description: 'Fairwire DNS Records never queries live DNS or cloud APIs; it reads the export you give it.' },
  ],
  prompt: { title: 'Review DNS zones', description: 'Walks the host model through a zone review with Fairwire DNS Records.', text: 'You are helping a DNS owner review zone exports with fairwire-dns-records. Fairwire DNS Records works offline. 1. Call dns_records_check; lead with dangling CNAMEs and CNAME conflicts. 2. Use dns_records_explain for one name. 3. Call dns_records_write_report. 4. Offer dns_records_draft_change_request; dns_records_request_submit waits for one named click and the DNS owner makes the change.' },
});
