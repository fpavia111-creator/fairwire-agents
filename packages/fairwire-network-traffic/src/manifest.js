import { readFileSync } from 'node:fs';
import { wireAgent, fileArg, SETTINGS_ARG, settingsFrom, LIMITS, humanBytes } from 'fairwire-core';
import { FLOW_FIELDS, SETTINGS_SCHEMA, DEFAULTS, reviewFlows } from './logic.js';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const args = {
  flows: fileArg('Flow export under --root (NetFlow, IPFIX or sFlow collector export as CSV, Excel or JSON): one row per flow with source, destination, port, protocol, bytes, packets and start time'),
  settings: SETTINGS_ARG('internal_cidrs, risky_ports, allowed_inbound, business_hours, large_upload_bytes, top_share_pct, small_packet_bytes, min_packets, scan_ports'),
};
const run = (a, ctx) => reviewFlows(ctx.records(a.flows, 'flows'), settingsFrom(a, ctx, 'traffic_settings', DEFAULTS));

export const manifest = wireAgent({
  pkg, prefix: 'traffic', title: 'Fairwire Network Traffic',
  description: 'Reviews a NetFlow, IPFIX or sFlow export: risky ports reached from the internet, cleartext protocols across the edge, large uploads out of hours, possible port scans, one host or destination taking most of the bytes, and very small packets. Drafts a change request a network owner applies.',
  args, required: ['flows'],
  sources: { flows: { label: 'Flow records', args: ['flows'], fields: FLOW_FIELDS } },
  configSchemas: { traffic_settings: SETTINGS_SCHEMA },
  run, summary: (o) => `${o.flows} flow(s), ${humanBytes(o.bytes)} between ${o.inside_hosts} inside host(s) and ${o.outside_destinations} outside destination(s): ${o.open} open finding(s), ${o.high} high.`,
  check: { title: 'Review network flows', description: 'Review the flow export and list findings worst first: inbound risky ports, cleartext protocols, out-of-hours uploads, scans, top talkers and small packets.' },
  explain: { arg: 'host', argSchema: { type: 'string', maxLength: 100, description: 'Inside or outside address from traffic_check' }, title: 'Explain one host', description: 'Everything found for one address.', match: (i, v) => i.subject === v || i.key === v || String(i.key).startsWith(`${v}:`) || String(i.key).split('>').includes(v) },
  report: {
    title: 'Network flow review', base: 'network-traffic',
    sections: (o) => [{ title: 'By host', rows: o.hosts.slice(0, 20).map((h) => ({ host: h.host, bytes: h.bytes, flows: h.flows })), columns: ['host', 'bytes', 'flows'] }, { title: 'By protocol', rows: Object.entries(o.by_protocol).map(([protocol, bytes]) => ({ protocol, bytes })), columns: ['protocol', 'bytes'] }],
    limits: [LIMITS.files, 'Flow data shows who talked to whom and how much, not what was said: a finding is a lead for a person to confirm, not proof of an attack or a leak.', 'Inside and outside are decided by internal_cidrs (private ranges by default); NAT can hide the real inside host.', LIMITS.defaults, LIMITS.live],
  },
  note: { noun: 'change_request', verb: 'submit', category: 'production_deploy', actor: 'the network owner', to: 'network change board', subject: 'Network changes to review from the flow export', ask: 'Please confirm each item with the host owner before any port is closed or any rule is changed.' },
  refused: [
    { name: 'firewall_block_address', category: 'production_deploy', description: 'Fairwire Network Traffic never blocks an address or changes a firewall; the network owner does.' },
    { name: 'switch_shutdown_port', category: 'production_deploy', description: 'Fairwire Network Traffic never shuts a switch port or isolates a host.' },
  ],
  prompt: {
    title: 'Review a flow export', description: 'Walks the host model through a flow review with Fairwire Network Traffic.',
    text: 'You are helping an IT lead review a NetFlow, IPFIX or sFlow export with fairwire-network-traffic. Rules: Fairwire Network Traffic only reads the export and drafts notes; firewall_block_address and switch_shutdown_port are refused. 1. Call traffic_check. Lead with high findings (inbound risky ports, Telnet or FTP across the edge, large uploads out of hours). 2. Use traffic_explain for any address the person asks about. 3. Call traffic_write_report for the worklist. 4. Offer traffic_draft_change_request; traffic_request_submit waits for one named click and the network owner makes the change.',
  },
});
