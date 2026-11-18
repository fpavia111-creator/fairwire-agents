import { readFileSync } from 'node:fs';
import { wireAgent, fileArg, SETTINGS_ARG, settingsFrom, LIMITS } from 'fairwire-core';
import { QUERY_FIELDS, SETTINGS_SCHEMA, DEFAULTS, reviewQueries } from './logic.js';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const args = {
  queries: fileArg('DNS query log under --root (Windows DNS, BIND, Pi-hole, Umbrella or resolver export as CSV, Excel or JSON): one row per query or per client and name with a count'),
  settings: SETTINGS_ARG('internal_resolvers, chatty_min, nxdomain_min, nxdomain_share_pct, servfail_min, servfail_share_pct, blocked_min, tunnel_names_min, long_label, entropy_min, ignore_domains'),
};

export const manifest = wireAgent({
  pkg, prefix: 'dns_queries', title: 'Fairwire DNS Queries',
  description: 'Reviews resolver query logs: long random-looking names under one domain (a tunnelling signal), clients asking outside resolvers, clients that keep asking for blocked names, clients with mostly NXDOMAIN answers, names that fail with SERVFAIL and names asked again and again. Drafts a note for the network owner.',
  args, required: ['queries'],
  sources: { queries: { label: 'DNS queries', args: ['queries'], fields: QUERY_FIELDS } },
  configSchemas: { dns_queries_settings: SETTINGS_SCHEMA },
  run: (a, ctx) => reviewQueries(ctx.records(a.queries, 'queries'), settingsFrom(a, ctx, 'dns_queries_settings', DEFAULTS)),
  summary: (o) => `${o.queries} queries from ${o.clients} client(s) for ${o.names} name(s), ${o.nxdomain_pct}% NXDOMAIN, ${o.repeated_pct}% repeats: ${o.open} open finding(s), ${o.high} high.`,
  check: { title: 'Review DNS queries', description: 'Review the query log and list possible tunnelling, outside resolvers, blocked lookups, NXDOMAIN-heavy clients, failing names and chatty names.' },
  explain: { arg: 'client', argSchema: { type: 'string', maxLength: 255, description: 'Client address or name from dns_queries_check' }, title: 'Explain one client or name', description: 'Every finding for one client address or queried name.', match: (i, v) => i.subject === v || i.key === v || String(i.key).split('>').includes(v) },
  report: {
    title: 'DNS query review', base: 'dns-queries',
    sections: (o) => [{ title: 'By client', rows: o.top_clients, columns: ['client', 'queries', 'nxdomain', 'blocked'] }],
    limits: [LIMITS.files, 'A random-looking name is a signal, not proof: some security, CDN and telemetry services use long names; list them in ignore_domains.', 'Domains are grouped by their last two labels (three for names like example.co.uk), which can merge or split some domains.', LIMITS.defaults, LIMITS.live],
  },
  note: { noun: 'network_note', verb: 'send', category: 'binding_send', actor: 'the network owner', to: 'network and security team', subject: 'DNS findings to look at', ask: 'Please check the devices named here before any domain is blocked or any setting is changed.' },
  refused: [
    { name: 'dns_resolver_block_domain', category: 'production_deploy', description: 'Fairwire DNS Queries never blocks a domain or changes a resolver.' },
    { name: 'endpoint_isolate', category: 'production_deploy', description: 'Fairwire DNS Queries never isolates a device.' },
  ],
  prompt: { title: 'Review DNS queries', description: 'Walks the host model through a DNS log review with Fairwire DNS Queries.', text: 'You are helping a network lead review DNS logs with fairwire-dns-queries. Fairwire DNS Queries only reads the log. 1. Call dns_queries_check; lead with possible tunnelling and outside resolvers. 2. Use dns_queries_explain for one client. 3. Call dns_queries_write_report. 4. Offer dns_queries_draft_network_note; dns_queries_request_send waits for one named click.' },
});
