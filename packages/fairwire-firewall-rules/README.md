# Fairwire Firewall Rules

Firewall rule review from a rule export (Palo Alto, FortiGate or any CSV): any-to-any allows, risky ports open from the internet, rules with no hits, rules shadowed by an earlier rule, duplicates, expired temporary rules, rules with no owner or ticket, and allows with logging off. Drafts a change request; never touches the firewall.

Part of **Fairwire**, the IT and network family of [Mythos Machines](https://fair-agents.com) agents. The software is free (MIT); you pay a fixed price for the setup on your files. It reads files your IT team exports, on your own computer, and drafts notes. Every change to a live device, firewall, DNS zone, directory or cloud account stays one named person's click.

## What it checks

| Finding | What it means |
|---|---|
| `any_any_allow` | An enabled rule allows any source to any destination on any service. |
| `internet_to_risky_port` | An enabled rule allows traffic from the internet to a port that should rarely be open (RDP, SMB, FTP, Telnet, databases and the like), or to any port. |
| `expired_temporary_rule` | A rule with an end date in the past is still enabled. |
| `shadowed_rule` | An earlier rule already matches everything this rule matches, so this rule never takes effect. |
| `duplicate_rule` | Two enabled rules are the same in zones, addresses, service and action. |
| `unused_rule` | An enabled allow rule with no hits, or no hit for longer than your limit. |
| `no_owner_or_ticket` | An enabled allow rule with no owner, or with neither a ticket nor a description saying why it exists. |
| `allow_without_logging` | An enabled allow rule with logging off. |
| `disabled_rule` | A disabled rule still in the policy (clutter that makes reviews slower). |

Findings come back worst first (high, medium, low). A finding a named person has reviewed can be accepted as known, with a reason and a date to look again; it then moves to "Accepted as known" instead of counting as open.

## Settings

Pass a settings file with `settings`. Every setting is optional; a misspelt setting is refused by name.

| Setting | What it does |
|---|---|
| `internet_zones` | Zone or interface names that mean the internet (default untrust, outside, internet, wan) |
| `risky_ports` | Ports that should not be open from the internet (default: RDP, SMB, FTP, Telnet, databases and others) |
| `unused_days` | Days since the last hit after which an allow rule counts as unused (default 90) |

## What it never does

- `firewall_commit_changes` is refused: Fairwire Firewall Rules never edits, disables, deletes or commits a firewall rule.
- `firewall_api_login` is refused: Fairwire Firewall Rules never logs in to a firewall or its manager; it reads the export you give it.
- `firewall_request_submit` waits for one named person's click, even in Auto (`production_deploy`).
- `firewall_accept_learning` waits for one named person's click, even in Auto (`accept_learning`).
- `firewall_retire_memory` waits for one named person's click, even in Auto (`accept_learning`).
- `firewall_commit_changes` waits for one named person's click, even in Auto (`production_deploy`).
- `firewall_api_login` waits for one named person's click, even in Auto (`production_deploy`).

<!-- generated:start -->

## A demo run

`npx -y fairwire-firewall-rules demo` runs the agent on the fictional files in [`fixtures/`](fixtures) in a temporary folder. Captured output:

```text
Fairwire Firewall Rules demo (fictional data) in a temporary folder, Auto on for the draft only

▶ Check the exported files
  status: executed  decision: allow
  11 rule(s), 10 enabled (9 allow, 1 deny): 13 open finding(s), 3 high.
    high    any_any_allow              any-any-test
    high    internet_to_risky_port     rdp-from-internet
    high    internet_to_risky_port     temp-vendor-ftp
    medium  expired_temporary_rule     temp-vendor-ftp
    medium  shadowed_rule              allow-web-out-copy
    low     allow_without_logging      any-any-test
    low     duplicate_rule             allow-dns-out-2
    low     no_owner_or_ticket         any-any-test
    low     unused_rule                allow-dns-out-2
    low     unused_rule                allow-web-out-copy
    low     unused_rule                legacy-smb
    low     unused_rule                temp-vendor-ftp
    info    disabled_rule              old-rule

▶ Explain one finding
  status: executed  decision: allow
  high internet_to_risky_port: Rule temp-vendor-ftp allows the internet to reach 10.0.5.30 on FTP (21). Fix: Put this service behind the VPN or a gateway, or limit the source to known addresses.
medium expired_temporary_rule: Rule temp-vendor-ftp was meant to end on 2026-09-30 and is still enabled. Fix: Disable it, or renew it with a new end date and ticket.
low unused_rule: Allow rule temp-vendor-ftp has not been hit since 2026-08-02. Fix: Confirm with the owner, then disable it for a cycle before deleting it.

▶ Write the worklist
  status: executed  decision: allow
  Firewall rule review written: 11 rule(s), 10 enabled (9 allow, 1 deny): 13 open finding(s), 3 high.

▶ Draft the note for a person
  status: executed  decision: allow  (auto)
  change request 2026-11-18 drafted with 1 open marker(s) ([TO CONFIRM firewall change board]). Nothing was sent.

▶ Auto: approving it still waits for one named person
  status: needs_approval  decision: ask
  reason: production_deploy stays one-click, even in Auto

▶ The agent tries to change the live system itself
  status: blocked  decision: block
  reason: Fairwire Firewall Rules never edits, disables, deletes or commits a firewall rule.
```

## Tools

| Tool | What it does | Policy |
|---|---|---|
| `firewall_check` | Review the rule export in policy order and list risky, shadowed, duplicate, expired, unused, ownerless and unlogged rules. | runs |
| `firewall_explain` | Every finding for one rule. | runs |
| `firewall_write_report` | Write firewall-rules.csv (one row per finding, with blank owner and decision columns) and firewall-rules.html into out_dir (default fairwire-out/firewall). | runs |
| `firewall_draft_change_request` | Write drafts/change_request-<date>.md: the open findings at or above min_severity (default medium), each with what to do, addressed to firewall change board. | asks first (Auto can be opted in) |
| `firewall_request_submit` | After one named human click (even in Auto), record that the reviewed change request draft is approved in change_request-requests.csv. | one named click, even in Auto (`production_deploy`) |
| `firewall_recall` | Search this agent's own memory of the customer's setup: accepted facts (in use) and facts waiting for a person. | runs |
| `firewall_learn` | Propose one fact about the customer's setup for this agent to remember. | runs |
| `firewall_accept_learning` | A named person accepts or rejects a fact waiting in this agent's memory. | one named click, even in Auto (`accept_learning`) |
| `firewall_retire_memory` | A named person stops an accepted fact from applying. | one named click, even in Auto (`accept_learning`) |
| `firewall_commit_changes` | Fairwire Firewall Rules never edits, disables, deletes or commits a firewall rule. | refused |
| `firewall_api_login` | Fairwire Firewall Rules never logs in to a firewall or its manager; it reads the export you give it. | refused |

Any tool name not in this table is blocked, including names a model invents. `refused` tools are listed so a model can see they exist and are refused.

## Columns it reads

Table inputs can be CSV, TSV, semicolon- or pipe-separated text, Excel `.xlsx`, JSON or JSONL. Columns are matched by the agent's own name, then by the English names below, then by their names in German, French, Spanish, Portuguese, Italian, Japanese, Chinese and Korean. Dates become `YYYY-MM-DD`; amounts and counts are read with either decimal mark. Every result lists under `sources` how each file was read.

### Firewall rules (`rules`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `rule_id` (required) | text | Name, Rule Name, Rule, Policy ID, ID, Rule ID | - |
| `position` | number | Position, Order, Sequence, Seq, Index, # | - |
| `enabled` | text | Enabled, Status, State, Disabled | Aktiviert, Activé, 有効, 已启用 |
| `action` (required) | text | Action, Policy Action, Decision | Aktion, Action, アクション, 动作 |
| `src_zone` | text | Source Zone, From, From Zone, Source Interface, Src Zone, Ingress | - |
| `dst_zone` | text | Destination Zone, To, To Zone, Destination Interface, Dst Zone, Egress | - |
| `source` | text | Source Address, Source, Src Address, Sources, Src | Quelle, Source, 送信元, 源 |
| `destination` | text | Destination Address, Destination, Dst Address, Destinations, Dst | Ziel-IP, IP destination, 宛先IP, 目的IP |
| `service` | text | Service, Services, Port, Ports, Destination Port, Service Port | Service, Service, サービス, 服务 |
| `hits` | number | Hit Count, Hits, Hitcount, Rule Usage Hit Count, Bytes Hit Count | Treffer, Occurrences, ヒット数, 命中次数 |
| `last_hit` | date | Last Hit, Last Hit Timestamp, Last Used, Last Matched | Letzter Treffer, Dernière correspondance, 最終ヒット, 最后命中 |
| `log` | text | Log, Logging, Log at Session End, Log Traffic | - |
| `description` | text | Description, Comment, Comments, Remarks | Beschreibung, Description, 摘要, 摘要 |
| `owner` | text | Owner, Rule Owner, Requested By, Contact | Verantwortlich, Responsable, 担当者, 负责人 |
| `ticket` | text | Ticket, Change, Change Ticket, Tag, Reference | Ticketnummer, N° de ticket, チケット番号, 工单号 |
| `expires` | date | Expires, Expiry, End Date, Valid Until, Schedule End | Ablaufdatum, Date d'expiration, 有効期限, 到期日 |

Named exports recognised by their column names:

| System | Export | Recognised by | Layout checked against vendor docs |
|---|---|---|---|
| Palo Alto Networks PAN-OS | Security policy rules exported to CSV from the web interface | Name, Source Zone, Destination Zone, Service, Action | no |
| Fortinet FortiGate | Firewall policy list exported to CSV | Policy ID, Source Interface, Destination Interface, Service, Action | no |

Where a layout says "checked", its column names were compared with the vendor's documentation on that date. The other layouts were written from knowledge of the export and were not checked. None was tested against a live account.

### Files from other countries

A German export in Windows-1252 with semicolons, `1.234,56` and `03.11.2026`, or a Japanese one in Shift_JIS with `2026/11/03`, is read the same way as the English file. [`fixtures/intl/`](fixtures/intl) has both versions of the demo data, and the eval cases `intl-de-*` and `intl-ja-*` require the same results as the English case. Columns named differently? Run `npx fairwire-firewall-rules inspect <file>` (names and shapes only, never values) and name them in `fairwire-sources.json`:

```json
{ "files": { "exports/devices.csv": { "columns": { "host": "Gerätename" }, "date_order": "dmy" } } }
```

## Memory

fairwire-firewall-rules can remember facts about your setup so the next run does not have to be told again. `firewall_learn` only proposes a fact; it changes nothing until a named person accepts it with `firewall_accept_learning`, which is one click even in Auto. Facts live in one hash-chained file per agent under `.fairwire/memory/`; if the chain does not verify, no fact is used. Credentials, personal identifiers and text that reads like instructions to an AI are refused. Run without memory with `--no-memory`.

| Kind | What an accepted fact changes |
|---|---|
| `known_exception` | that finding is listed under "Accepted as known" instead of as open, until review_by (when given) has passed. |
| `note` | nothing (shown by recall only) |

```bash
fairwire-firewall-rules memory list
fairwire-firewall-rules memory accept MEM-1a2b3c4d5e6f --as "Your Name"
fairwire-firewall-rules memory retire MEM-1a2b3c4d5e6f --as "Your Name" --reason "rule removed"
```

## Install

Node 20 or newer. No other dependencies.

```bash
npx -y fairwire-firewall-rules demo
npx -y fairwire-firewall-rules mcp --root /path/to/your/files
```

Claude Desktop, Cursor and other MCP hosts:

```json
{
  "mcpServers": {
    "fairwire-firewall-rules": {
      "command": "npx",
      "args": [
        "-y",
        "fairwire-firewall-rules",
        "mcp",
        "--root",
        "/path/to/your/files"
      ]
    }
  }
}
```

Claude Code: `claude mcp add fairwire-firewall-rules -- npx -y fairwire-firewall-rules mcp --root .`, or install the `fairwire-firewall-rules` plugin from this repository's marketplace.

## Modes and approvals

- **Review** (`--mode review`): reads and reports only.
- **Assist** (default): the policy above. A tool that asks returns an `approval_id`; a person approves it once with `fairwire-firewall-rules approve <id> --as "Your Name"` (or on the local approvals page, `fairwire-firewall-rules approvals`), and the same call is repeated.
- **Auto** (`--mode auto --auto <tool,...>`): opt-in per tool, with step caps and a kill switch (`fairwire-firewall-rules kill`). Paying, sending, posting to a ledger or a live system and accepting a learned fact stay **one named click even in Auto**; an approval is tied to the sha256 of the reviewed draft, so a changed draft needs a new click.

## CLI

```bash
fairwire-firewall-rules tools                 # every tool, its policy and arguments
fairwire-firewall-rules sources               # the columns each input is read from
fairwire-firewall-rules inspect <file>        # how a file would be read (names and shapes, never values)
fairwire-firewall-rules call firewall_check '{"rules":"<rules>"}'
fairwire-firewall-rules eval                  # the private eval cases on the fictional fixtures
fairwire-firewall-rules demo
```

## Audit log and data

Every call is written to `.fairwire/audit.jsonl` under the root: hash-chained JSON lines, with arguments stored as a hash, signed with an Ed25519 key when you configure one. Everything runs on your machine on files you choose. No network calls, no telemetry, no credentials. The bundled fixtures are fictional.

<!-- generated:end -->

## Limits

- Reads only the files you export and give it. It does not log in to a firewall, switch, controller, cloud console, identity provider or any other live system.
- Shadowing is judged from zones, addresses and ports as exported; address objects and groups are compared by name unless the export expands them, and application-based rules are not modelled.
- Hit counts reset when a firewall reboots or a rule is edited; an unused rule is a question for its owner, not a deletion list.
- Thresholds are working defaults in a settings file you control; they are not a vendor rule, a requirement of any standard or a security guarantee.
- It changes nothing on a live device, firewall, DNS zone, directory or cloud account. Every change it suggests is a draft that one named person applies.
- Export layouts were written from knowledge of common exports and have not been tested on live customer accounts. Run `inspect` on a new export and name columns in `fairwire-sources.json` when they differ.

## Licence

MIT. Fictional data only in `fixtures/`.
