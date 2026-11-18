// Fairwire Network Traffic: network flow review. Pure functions, no I/O: flow rows in, findings out.
import { num, str, low, isPrivateIp, inAnyCidr, cleanIp, isIp, portName, hourOf, weekdayOf, round1, pct, humanBytes, finding, CLEARTEXT, RISKY_INBOUND_PORTS } from 'fairwire-core';

export const CHECKS = Object.freeze({
  inbound_risky_port: 'An address on the internet reached an inside host on a port that should rarely be open to the internet (RDP, SMB, Telnet, databases and the like).',
  cleartext_protocol: 'Traffic between an inside host and the internet on a protocol that sends data without encryption (Telnet, FTP and POP3 are high; HTTP, IMAP, SNMP and LDAP are medium).',
  large_upload_after_hours: 'An inside host sent more than your limit to one outside address outside business hours.',
  possible_port_scan: 'One address tried many different ports on one host with tiny flows.',
  top_talker_share: 'One inside host carried more than your share of all bytes.',
  top_destination_share: 'One outside address received more than your share of all bytes sent out.',
  small_packets: 'A host\'s flows average very small packets over many packets (chatty traffic worth batching, or probing).',
});

export const FLOW_FIELDS = Object.freeze({
  src_ip: { aliases: ['Source IP', 'Src IP', 'Src Addr', 'srcaddr', 'sa', 'Source Address', 'src'], required: true },
  dst_ip: { aliases: ['Destination IP', 'Dst IP', 'Dst Addr', 'dstaddr', 'da', 'Destination Address', 'dst'], required: true },
  dst_port: { type: 'number', aliases: ['Destination Port', 'Dst Port', 'dstport', 'dp', 'DPort'] },
  protocol: { aliases: ['Protocol', 'Proto', 'pr', 'IP Protocol', 'Application Protocol'] },
  bytes: { type: 'number', aliases: ['Bytes', 'Octets', 'ibyt', 'In Bytes', 'Total Bytes', 'byt', 'Byte Count'], required: true },
  packets: { type: 'number', aliases: ['Packets', 'Pkts', 'ipkt', 'In Packets', 'Packet Count'] },
  start: { type: 'datetime', aliases: ['Start', 'First Seen', 'ts', 'Start Time', 'First Switched', 'Timestamp', 'Date first seen'] },
  src_host: { aliases: ['Source Host', 'Source Hostname', 'Src Name', 'Host'] },
});

export const SETTINGS_SCHEMA = { type: 'object', additionalProperties: false, properties: {
  internal_cidrs: { type: 'array', items: { type: 'string' }, maxItems: 200, description: 'Your inside address ranges (default: private ranges such as 10.0.0.0/8)' },
  risky_ports: { type: 'array', items: { type: 'integer', minimum: 0, maximum: 65535 }, maxItems: 500, description: 'Ports that should not be reachable from the internet (default: RDP, SMB, Telnet, databases and others)' },
  allowed_inbound: { type: 'array', items: { type: 'string' }, maxItems: 500, description: 'Inside host:port pairs that are meant to be open, e.g. "10.0.5.10:3389" for a published gateway' },
  business_hours: { type: 'array', items: { type: 'integer', minimum: 0, maximum: 24 }, minItems: 2, maxItems: 2, description: 'First and last hour of the working day, e.g. [7, 19] (default)' },
  large_upload_bytes: { type: 'number', minimum: 1, description: 'Bytes to one outside address out of hours that count as a large upload (default 500000000)' },
  top_share_pct: { type: 'number', minimum: 1, maximum: 100, description: 'Share of all bytes above which one host or destination is flagged (default 40)' },
  small_packet_bytes: { type: 'number', minimum: 1, description: 'Average packet size under which a host is flagged (default 100)' },
  min_packets: { type: 'integer', minimum: 1, description: 'Packets a host needs before the small-packet check applies (default 1000)' },
  scan_ports: { type: 'integer', minimum: 2, description: 'Distinct ports one source tries on one host before it counts as a possible scan (default 20)' },
} };
export const DEFAULTS = Object.freeze({ internal_cidrs: [], risky_ports: RISKY_INBOUND_PORTS, allowed_inbound: [], business_hours: [7, 19], large_upload_bytes: 500e6, top_share_pct: 40, small_packet_bytes: 100, min_packets: 1000, scan_ports: 20 });

const HIGH_CLEAR = new Set([21, 23, 110, 69]);
const NAMED_PORT = { http: 80, ftp: 21, telnet: 23, pop3: 110, imap: 143, tftp: 69, snmp: 161, ldap: 389 };

/** Read flows into a common shape; rows with no valid addresses are counted, not used. */
export function readFlows(rows) {
  const flows = []; let skipped = 0;
  for (const r of rows) {
    const src = cleanIp(r.src_ip), dst = cleanIp(r.dst_ip);
    if (!isIp(src) || !isIp(dst)) { skipped++; continue; }
    const proto = low(r.protocol);
    let port = num(r.dst_port);
    if (port === null && NAMED_PORT[proto] !== undefined) port = NAMED_PORT[proto];
    flows.push({ src, dst, port, proto, bytes: Math.max(0, num(r.bytes) || 0), packets: Math.max(0, num(r.packets) || 0), start: str(r.start), src_host: str(r.src_host) });
  }
  return { flows, skipped };
}

export function reviewFlows(rows, settings = {}) {
  const s = { ...DEFAULTS, ...settings };
  const inside = (ip) => (s.internal_cidrs.length ? inAnyCidr(ip, s.internal_cidrs) : isPrivateIp(ip));
  const { flows, skipped } = readFlows(rows);
  const risky = new Set(s.risky_ports.map(Number));
  const allowed = new Set(s.allowed_inbound.map((x) => low(x)));
  const items = [];
  const total = flows.reduce((t, f) => t + f.bytes, 0);
  const add = (m, k, f) => { const e = m.get(k) || { bytes: 0, flows: 0, packets: 0, peers: new Set(), ports: new Set() }; e.bytes += f.bytes; e.flows++; e.packets += f.packets; m.set(k, e); return e; };

  // Inbound to risky ports.
  const inbound = new Map();
  for (const f of flows) if (!inside(f.src) && inside(f.dst) && f.port !== null && risky.has(f.port) && !allowed.has(`${f.dst}:${f.port}`)) add(inbound, `${f.dst}:${f.port}`, f).peers.add(f.src);
  for (const [k, e] of inbound) { const [host, port] = k.split(':'); items.push(finding('inbound_risky_port', 'high', k, `${e.peers.size} outside address(es) reached ${host} on ${portName(Number(port))} (port ${port}) in ${e.flows} flow(s), ${humanBytes(e.bytes)}.`, 'Close the port at the edge or put it behind the VPN; if it is meant to be open, add it to allowed_inbound with a note.', { subject: host, port: Number(port), peers: e.peers.size, bytes: e.bytes })); }

  // Cleartext protocols across the edge.
  const clear = new Map();
  for (const f of flows) {
    const crosses = inside(f.src) !== inside(f.dst); if (!crosses) continue;
    const named = CLEARTEXT.names.includes(f.proto);
    if (!(named || (f.port !== null && CLEARTEXT.ports.includes(f.port)))) continue;
    const host = inside(f.src) ? f.src : f.dst; const port = f.port ?? NAMED_PORT[f.proto] ?? 0;
    add(clear, `${host}:${port}`, f).peers.add(inside(f.src) ? f.dst : f.src);
  }
  for (const [k, e] of clear) { const [host, port] = k.split(':'); const p = Number(port); items.push(finding('cleartext_protocol', HIGH_CLEAR.has(p) ? 'high' : 'medium', k, `${host} exchanged ${humanBytes(e.bytes)} with ${e.peers.size} outside address(es) over ${portName(p)} (port ${p}), which is not encrypted.`, p === 80 || p === 8080 ? 'Move the service or client to HTTPS.' : `Replace ${portName(p)} with its encrypted form (SSH, SFTP, IMAPS, SNMPv3, LDAPS).`, { subject: host, port: p, bytes: e.bytes })); }

  // Large uploads out of hours.
  const [h0, h1] = s.business_hours; const ups = new Map();
  for (const f of flows) {
    if (!inside(f.src) || inside(f.dst)) continue;
    const h = hourOf(f.start); const wd = weekdayOf(f.start);
    const off = h !== null && (h < h0 || h >= h1 || wd === 0 || wd === 6);
    if (off) add(ups, `${f.src}>${f.dst}`, f);
  }
  for (const [k, e] of ups) if (e.bytes >= s.large_upload_bytes) { const [src, dst] = k.split('>'); items.push(finding('large_upload_after_hours', 'high', k, `${src} sent ${humanBytes(e.bytes)} to ${dst} outside business hours in ${e.flows} flow(s).`, 'Confirm with the host owner that this was a planned backup or sync; if not, treat it as a possible data leak.', { subject: src, bytes: e.bytes })); }

  // Possible port scans.
  const scans = new Map();
  for (const f of flows) if (f.port !== null && f.packets <= 3) add(scans, `${f.src}>${f.dst}`, f).ports.add(f.port);
  for (const [k, e] of scans) if (e.ports.size >= s.scan_ports) { const [src, dst] = k.split('>'); items.push(finding('possible_port_scan', 'medium', k, `${src} tried ${e.ports.size} different ports on ${dst} with tiny flows.`, inside(src) ? 'Ask who runs scans from this host; if nobody, check the host.' : 'Block the source at the edge if it keeps trying.', { subject: src, ports: e.ports.size })); }

  // Shares.
  const byHost = new Map(); const byDest = new Map(); let out = 0;
  for (const f of flows) {
    if (inside(f.src)) add(byHost, f.src, f); else if (inside(f.dst)) add(byHost, f.dst, f);
    if (inside(f.src) && !inside(f.dst)) { add(byDest, f.dst, f); out += f.bytes; }
  }
  if (total) for (const [h, e] of byHost) { const sh = pct(e.bytes, total); if (sh > s.top_share_pct) items.push(finding('top_talker_share', 'low', h, `${h} carried ${sh}% of all bytes (${humanBytes(e.bytes)} of ${humanBytes(total)}).`, 'Check whether this host should be on its own link, scheduled off-peak or rate-limited.', { subject: h, share_pct: sh, bytes: e.bytes })); }
  if (out) for (const [d, e] of byDest) { const sh = pct(e.bytes, out); if (sh > s.top_share_pct) items.push(finding('top_destination_share', 'low', d, `${d} received ${sh}% of the bytes sent out (${humanBytes(e.bytes)}).`, 'Confirm what service this is and that it is expected.', { subject: d, share_pct: sh, bytes: e.bytes })); }

  // Small packets.
  for (const [h, e] of byHost) if (e.packets >= s.min_packets) { const avg = round1(e.bytes / e.packets); if (avg < s.small_packet_bytes) items.push(finding('small_packets', 'low', h, `${h} averaged ${avg} bytes per packet over ${e.packets} packets.`, 'Look at what sends many tiny packets; batching or a longer polling interval may help.', { subject: h, avg_packet_bytes: avg })); }

  const byProtocol = {};
  for (const f of flows) { const p = f.proto || (f.port !== null ? portName(f.port).toLowerCase() : 'unknown'); byProtocol[p] = (byProtocol[p] || 0) + f.bytes; }
  return {
    flows: flows.length, skipped_rows: skipped, bytes: total, inside_hosts: byHost.size, outside_destinations: byDest.size,
    by_protocol: Object.fromEntries(Object.entries(byProtocol).sort(([a], [b]) => (a < b ? -1 : 1))),
    hosts: [...byHost.entries()].map(([host, e]) => ({ host, bytes: e.bytes, flows: e.flows })).sort((a, b) => b.bytes - a.bytes || (a.host < b.host ? -1 : 1)),
    items,
  };
}
