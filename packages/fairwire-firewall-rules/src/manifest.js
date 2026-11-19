import { readFileSync } from 'node:fs';
import { wireAgent, fileArg, SETTINGS_ARG, AS_OF_ARG, settingsFrom, LIMITS, exportProfile, today } from 'fairwire-core';
import { RULE_FIELDS, SETTINGS_SCHEMA, DEFAULTS, reviewRules } from './logic.js';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const args = {
  rules: fileArg('Firewall rule export under --root (Palo Alto, FortiGate, pfSense, ASA or any CSV, Excel or JSON): one row per rule in policy order with zones, addresses, service, action, hit count, last hit, logging, owner, ticket and end date'),
  settings: SETTINGS_ARG('internet_zones, risky_ports, unused_days'),
  as_of: AS_OF_ARG,
};
const PROFILES = [
  exportProfile('paloalto_security_rules', { rule_id: 'Name', src_zone: 'Source Zone', dst_zone: 'Destination Zone', source: 'Source Address', destination: 'Destination Address', service: 'Service', action: 'Action', hits: 'Rule Usage Hit Count', last_hit: 'Rule Usage Last Hit', description: 'Description', ticket: 'Tags' }),
  exportProfile('fortigate_policies', { rule_id: 'Policy ID', src_zone: 'Source Interface', dst_zone: 'Destination Interface', source: 'Source', destination: 'Destination', service: 'Service', action: 'Action', enabled: 'Status', log: 'Log', description: 'Comments' }),
];

export const manifest = wireAgent({
  // Columns the "value is missing" checks depend on: an export without the column skips the check instead of flagging every row.
  needs: { no_owner_or_ticket: ['owner'] },
  pkg, prefix: 'firewall', title: 'Fairwire Firewall Rules',
  description: 'Reviews a firewall rule export: any-to-any allows, risky ports open from the internet, expired temporary rules, rules shadowed by an earlier rule, duplicates, unused rules, rules with no owner or ticket, allows with logging off and disabled rules left in the policy. Drafts a change request; never touches the firewall.',
  args, required: ['rules'],
  sources: { rules: { label: 'Firewall rules', args: ['rules'], fields: RULE_FIELDS, profiles: PROFILES } },
  configSchemas: { firewall_settings: SETTINGS_SCHEMA },
  run: (a, ctx) => reviewRules(ctx.records(a.rules, 'rules'), settingsFrom(a, ctx, 'firewall_settings', DEFAULTS), a.as_of || today()),
  summary: (o) => `${o.rules} rule(s), ${o.enabled} enabled (${o.allow} allow, ${o.deny} deny): ${o.open} open finding(s), ${o.high} high.`,
  check: { title: 'Review firewall rules', description: 'Review the rule export in policy order and list risky, shadowed, duplicate, expired, unused, ownerless and unlogged rules.' },
  explain: { arg: 'rule', argSchema: { type: 'string', maxLength: 200, description: 'Rule name or id from firewall_check' }, title: 'Explain one rule', description: 'Every finding for one rule.', match: (i, v) => i.key === v || i.shadowed_by === v },
  report: {
    title: 'Firewall rule review', base: 'firewall-rules',
    sections: (o) => [{ title: 'By rule', rows: [...new Set(o.items.map((i) => i.key))].map((rule) => ({ rule, findings: o.items.filter((i) => i.key === rule).map((i) => i.code).join(' ') })), columns: ['rule', 'findings'] }],
    limits: [LIMITS.files, 'Shadowing is judged from zones, addresses and ports as exported; address objects and groups are compared by name unless the export expands them, and application-based rules are not modelled.', 'Hit counts reset when a firewall reboots or a rule is edited; an unused rule is a question for its owner, not a deletion list.', LIMITS.defaults, LIMITS.live],
  },
  note: { noun: 'change_request', verb: 'submit', category: 'production_deploy', actor: 'the firewall owner', to: 'firewall change board', subject: 'Firewall rule changes to review', ask: 'Please review each rule with its owner. Approving this request records that the change board agreed; the firewall owner makes each change in a change window.' },
  refused: [
    { name: 'firewall_commit_changes', category: 'production_deploy', description: 'Fairwire Firewall Rules never edits, disables, deletes or commits a firewall rule.' },
    { name: 'firewall_api_login', category: 'production_deploy', description: 'Fairwire Firewall Rules never logs in to a firewall or its manager; it reads the export you give it.' },
  ],
  prompt: { title: 'Review firewall rules', description: 'Walks the host model through a firewall rule review with Fairwire Firewall Rules.', text: 'You are helping a network lead review firewall rules with fairwire-firewall-rules. Fairwire Firewall Rules only reads the export; firewall_commit_changes is refused. 1. Call firewall_check and lead with any-to-any allows and internet-facing risky ports. 2. Use firewall_explain for a rule. 3. Call firewall_write_report. 4. Offer firewall_draft_change_request; firewall_request_submit waits for one named click and the firewall owner makes the change.' },
});
