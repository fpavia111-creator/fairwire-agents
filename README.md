# Fairwire IT and network agents

Thirty-one small MCP agents for IT teams. Each one owns **one job**, such as reviewing firewall rules, checking backup results, reading sign-in logs or reviewing the cloud bill, and cannot act outside it. They read the files your IT team already exports from firewalls, controllers, identity providers, device management, backup tools, service desks and cloud consoles, write reports on your machine, and draft notes. Every change to a live device, firewall, DNS zone, directory or cloud account stays **one named person's click**.

Part of [Fair Agents](https://fair-agents.com) (Fairwire on the site). The software is free (MIT); you pay a fixed price for the setup on your files.

MIT license · Node 20 or newer · local files only · no credentials · no dependencies · names and addresses masked for the model

Also in: [Deutsch](README.de.md) · [Français](README.fr.md) · [Español](README.es.md) · [Português (Brasil)](README.pt-BR.md) · [Italiano](README.it.md) · [日本語](README.ja.md) · [简体中文](README.zh-Hans.md) · [한국어](README.ko.md) (translated by Claude; native review pending)

## Try one

```bash
npx -y fairwire-firewall-rules demo     # firewall rule review on fictional rules
npx -y fairwire-sign-in-logs demo      # sign-in log review on fictional sign-ins
```

Every agent has a `demo` that runs on fictional files, an `eval` that checks it against its own test cases, and an MCP server (`npx -y <agent> mcp --root <folder>`) for Claude Desktop, Claude Code, Cursor and other MCP hosts. Each agent's README lists its checks, settings, tools and the columns it reads.

## The agents

**Network and edge**

| Agent | What it does | Waits for a person before |
|---|---|---|
| [`fairwire-firewall-rules`](packages/fairwire-firewall-rules) | Firewall rules: any-to-any, risky ports from the internet, shadowed, duplicate, expired, unused, ownerless and unlogged rules | Submitting a change request |
| [`fairwire-network-traffic`](packages/fairwire-network-traffic) | NetFlow, IPFIX or sFlow: risky ports reached from outside, cleartext protocols, out-of-hours uploads, scans, top talkers | Submitting a change request |
| [`fairwire-vpn-access`](packages/fairwire-vpn-access) | VPN logs: leavers connecting, two countries at once, failed bursts, shared accounts, long sessions, old clients | Sending an access note |
| [`fairwire-dns-queries`](packages/fairwire-dns-queries) | DNS query logs: tunnelling signals, outside resolvers, blocked lookups, NXDOMAIN-heavy clients, failing and chatty names | Sending a network note |
| [`fairwire-dns-records`](packages/fairwire-dns-records) | DNS zones: dangling cloud CNAMEs (takeover risk), CNAME conflicts, private or foreign addresses, TTLs, wildcards | Submitting a change request |
| [`fairwire-wifi-health`](packages/fairwire-wifi-health) | Wi-Fi controllers: rogues, WEP/TKIP/open networks, offline and outdated APs, bad channels, weak and sticky clients | Submitting a change request |
| [`fairwire-switch-ports`](packages/fairwire-switch-ports) | Switch ports and VLANs: trunks with every VLAN, VLAN 1, half duplex, CRC errors, unused ports, unused VLANs | Submitting a change request |
| [`fairwire-dhcp-leases`](packages/fairwire-dhcp-leases) | DHCP: rogue servers, conflicts, near-full scopes, misplaced reservations, unknown devices | Sending a network note |
| [`fairwire-call-quality`](packages/fairwire-call-quality) | Call quality: low MOS, loss, jitter, one-way audio, poor sites, trunks and hours, dropped calls | Sending a provider ticket |

**Identity, mail and admins**

| Agent | What it does | Waits for a person before |
|---|---|---|
| [`fairwire-sign-in-logs`](packages/fairwire-sign-in-logs) | Sign-in logs: password spraying, success after failures, impossible travel, legacy protocols, service accounts used by people | Sending a security note |
| [`fairwire-mfa-coverage`](packages/fairwire-mfa-coverage) | MFA coverage: admins without phishing-resistant MFA, no MFA, exclusions, SMS-only, shared mailboxes | Sending an identity note |
| [`fairwire-admin-roles`](packages/fairwire-admin-roles) | Admin roles: too many top admins, guests, no MFA, break-glass use, standing roles, admins with mail | Sending an identity note |
| [`fairwire-directory-hygiene`](packages/fairwire-directory-hygiene) | Directory hygiene: password flags, group loops, stale and unsupported computers, ownerless and empty groups | Sending a clean-up list |
| [`fairwire-email-gateway`](packages/fairwire-email-gateway) | Email gateway: released threats, allow-list abuse, outbound spam, late pull-backs, data-loss hits | Sending a security note |

**Devices and software**

| Agent | What it does | Waits for a person before |
|---|---|---|
| [`fairwire-asset-inventory`](packages/fairwire-asset-inventory) | CMDB against what is seen: retired but seen, unknown devices, duplicate serials, ghosts, warranties | Sending a CMDB fix list |
| [`fairwire-patch-status`](packages/fairwire-patch-status) | Patch status: overdue critical updates, unsupported OS, failures, silent devices, pending restarts | Sending a patch note |
| [`fairwire-endpoint-protection`](packages/fairwire-endpoint-protection) | Endpoint protection: no agent, protection or tamper off, passive mode, stale signatures, old high alerts | Sending a security note |
| [`fairwire-mobile-devices`](packages/fairwire-mobile-devices) | Mobile devices: jailbroken, leavers' devices, no passcode or encryption, silent, old OS | Sending a device note |
| [`fairwire-software-licenses`](packages/fairwire-software-licenses) | Software against licenses: prohibited, over-deployed, outdated, unapproved, shelfware | Sending a true-up note |
| [`fairwire-print-fleet`](packages/fairwire-print-fleet) | Print fleet: offline, idle, costly per page, colour-heavy, leases ending | Sending a consolidation note |

**Operations and resilience**

| Agent | What it does | Waits for a person before |
|---|---|---|
| [`fairwire-backup-jobs`](packages/fairwire-backup-jobs) | Backup results: uncovered critical systems, missed RPOs, repeat failures, size drops, no offsite copy | Sending a backup note |
| [`fairwire-restore-tests`](packages/fairwire-restore-tests) | Restore tests: never tested, failed, overdue, RTO and RPO missed, no sign-off; a test calendar | Sending a test plan |
| [`fairwire-uptime-incidents`](packages/fairwire-uptime-incidents) | Uptime and incidents: below target, missing reviews, repeat failures, slow response, error budgets | Sending a review note |
| [`fairwire-change-calendar`](packages/fairwire-change-calendar) | Change calendar: freeze clashes, no approval, overlaps, no back-out plan, risky timing | Sending a note to the change board |
| [`fairwire-ticket-sla`](packages/fairwire-ticket-sla) | Ticket SLAs: breaches by priority, unassigned, parked and reopened tickets, team breach rates | Sending a status note |
| [`fairwire-log-retention`](packages/fairwire-log-retention) | Logging: retention under policy, silent sources, systems not logging, volume jumps | Sending a logging note |

**IT spend and AI usage**

| Agent | What it does | Waits for a person before |
|---|---|---|
| [`fairwire-cloud-costs`](packages/fairwire-cloud-costs) | AWS, Azure and Google Cloud bills: regions, jumps, untagged spend, commitments, always-on dev, egress | Sending an owner note |
| [`fairwire-contract-renewals`](packages/fairwire-contract-renewals) | IT contracts: notice deadlines, uplifts, overlaps, spend without or after a contract; a deadline calendar | Sending a notice letter |
| [`fairwire-telecom-bills`](packages/fairwire-telecom-bills) | Telecom bills: leavers' lines, unused lines, roaming, premium charges, oversized plans | Sending a cancellation list |
| [`fairwire-ai-usage`](packages/fairwire-ai-usage) | AI usage: repeated prompts, large prompts, oversized models, cut-off answers, untagged spend | Sending an owner note |
| [`fairwire-api-retries`](packages/fairwire-api-retries) | API and LLM retries: ignored Retry-After, retried client errors, retry storms, retry spend | Sending an owner note |

Not here on purpose, because the Fairbooks agents already do them: certificates and domain expiry, mail authentication, MCP server review, configuration drift, access recertification and SaaS seats.

## How they behave

- **Read-only on your systems.** They read exported files under one folder (`--root`). They never log in to a firewall, controller, identity provider or cloud console.
- **Drafts, then one click.** Each agent drafts a note or change request marked DRAFT. Approving it is one named person's click, tied to the draft's sha256, even in Auto mode; the person then makes the change. Live actions (pushing rules, disabling accounts, wiping devices, stopping cloud resources) are listed and refused.
- **Personal data masked.** Names, sign-in names, e-mail addresses, phone numbers, device ids and client addresses become stable pseudonyms before results reach the model (`--pii mask`, the default). Files written for the team keep the real values.
- **Accepted as known.** A finding a named person reviewed can be accepted with a reason and a review date; it then stops counting as open.
- **Files from other countries.** Exports in nine languages read the same way: legacy encodings, `1.234,56`, day-first dates and local column names. Report pages follow `--lang de|fr|es|pt|it|ja|zh|ko`.
- **Audit log.** Every call is written to a hash-chained log under `.fairwire/`.

## Checks on this repository

```bash
npm test                        # every workspace
npm run evals                   # every agent's eval cases
npm run hostile                 # planted formulas, HTML, path tricks and AI-directed text in every fixture
npm run hostile:args            # broken arguments in every tool
npm run intl                    # every spreadsheet eval case in eight more languages
npm run bench                   # 1,000 and 10,000 rows per agent
npm run release:check:offline   # metadata, honest-copy scan, secret scan, npm pack
```

Results and decisions are in [docs/](docs/). Not legal, compliance or security-certification advice.
