import { readFileSync } from 'node:fs';
import { wireAgent, fileArg, SETTINGS_ARG, AS_OF_ARG, settingsFrom, LIMITS, today } from 'fairwire-core';
import { PORT_FIELDS, VLAN_FIELDS, SETTINGS_SCHEMA, DEFAULTS, reviewPorts } from './logic.js';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const args = {
  ports: fileArg('Switch port inventory under --root (NMS, controller or "show interfaces" export as CSV, Excel or JSON): one row per port with switch, port, description, admin and link status, mode, VLAN, allowed VLANs, duplex, CRC errors and last use'),
  vlans: fileArg('Optional VLAN list (id and name) to find VLANs nobody uses'),
  settings: SETTINGS_ARG('allowed_access_vlans, crc_max, unused_days'),
  as_of: AS_OF_ARG,
};

export const manifest = wireAgent({
  // Columns the "value is missing" checks depend on: an export without the column skips the check instead of flagging every row.
  needs: { no_description: ['description'] },
  pkg, prefix: 'switch_ports', title: 'Fairwire Switch Ports',
  description: 'Reviews a switch port and VLAN inventory: trunks carrying every VLAN, access ports in VLAN 1, half duplex links, CRC errors, ports in VLANs outside your plan, enabled ports unused for months, trunks with no description and VLANs nobody uses. Drafts a change request; never changes a switch.',
  args, required: ['ports'],
  sources: { ports: { label: 'Switch ports', args: ['ports'], fields: PORT_FIELDS }, vlans: { label: 'VLANs', args: ['vlans'], fields: VLAN_FIELDS } },
  configSchemas: { switch_ports_settings: SETTINGS_SCHEMA },
  run: (a, ctx) => reviewPorts(ctx.records(a.ports, 'ports'), a.vlans ? ctx.records(a.vlans, 'vlans') : [], settingsFrom(a, ctx, 'switch_ports_settings', DEFAULTS), a.as_of || today()),
  summary: (o) => `${o.ports} port(s) on ${o.switches} switch(es), ${o.ports_up} up, ${o.trunks} trunk(s), ${o.vlans_used} VLAN(s) in use: ${o.open} open finding(s), ${o.high} high.`,
  check: { title: 'Review switch ports', description: 'Review the port inventory and list trunk, VLAN, duplex, error, unused-port and description problems.' },
  explain: { arg: 'switch', argSchema: { type: 'string', maxLength: 200, description: 'Switch name, or "switch port" from switch_ports_check' }, title: 'Explain one switch or port', description: 'Every finding for one switch or port.', match: (i, v) => i.subject === v || i.key === v },
  report: {
    title: 'Switch port and VLAN review', base: 'switch-ports',
    sections: (o) => [{ title: 'By switch', rows: o.by_switch, columns: ['switch', 'ports', 'findings'] }],
    limits: [LIMITS.files, 'Error counters and last-use times are as the switch reported them; counters reset when a switch restarts.', 'VLANs used only on switches missing from the export look unused here.', LIMITS.defaults, LIMITS.live],
  },
  note: { noun: 'change_request', verb: 'submit', category: 'production_deploy', actor: 'the network owner', to: 'network change board', subject: 'Switch port changes to review', ask: 'Please plan these port changes for a maintenance window; check each unused port with the site before shutting it.' },
  refused: [
    { name: 'switch_apply_config', category: 'production_deploy', description: 'Fairwire Switch Ports never changes a port, VLAN or trunk on a switch.' },
    { name: 'switch_ssh_session', category: 'production_deploy', description: 'Fairwire Switch Ports never logs in to a switch; it reads the export you give it.' },
  ],
  prompt: { title: 'Review switch ports', description: 'Walks the host model through a port review with Fairwire Switch Ports.', text: 'You are helping a network lead review a switch port inventory with fairwire-switch-ports. Fairwire Switch Ports only reads exports. 1. Call switch_ports_check; lead with trunks carrying every VLAN and user ports in VLAN 1. 2. Use switch_ports_explain for one switch. 3. Call switch_ports_write_report. 4. Offer switch_ports_draft_change_request; switch_ports_request_submit waits for one named click.' },
});
