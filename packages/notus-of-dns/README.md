# Notus of Dns

DNS query review from resolver logs: names asked again and again, clients with many NXDOMAIN answers, long random-looking names (a tunnelling signal), SERVFAIL spikes, clients asking outside resolvers, and blocked names by client. Drafts a note for the network owner.

Part of **Fairwire**, the IT and network family of [Mythos Machines](https://fair-agents.com) agents. The software is free (MIT); you pay a fixed price for the setup on your files. It reads files your IT team exports, on your own computer, and drafts notes. Every change to a live device, firewall, DNS zone, directory or cloud account stays one named person's click.

## What it checks

| Finding | What it means |
|---|---|
| `possible_tunnel` | Many long, random-looking names under one domain from one client: a common sign of data sent out through DNS (tunnelling) or malware. |
| `outside_resolver` | A client asked a resolver that is not on your list of inside resolvers, so your DNS filtering and logs are bypassed. |
| `blocked_client` | A client kept asking for names your resolver blocks (often an infected or misconfigured device). |
| `nxdomain_client` | A client got "no such name" for most of its queries (stale settings, a removed server, or malware guessing names). |
| `servfail_name` | A name that failed with SERVFAIL for a large share of queries (a broken zone or upstream). |
| `chatty_name` | One client asked for one name very many times (very short TTLs or an app polling; a cache or longer TTL would cut the traffic). |

Findings come back worst first (high, medium, low). A finding a named person has reviewed can be accepted as known, with a reason and a date to look again; it then moves to "Accepted as known" instead of counting as open.

## Settings

Pass a settings file with `settings`. Every setting is optional; a misspelt setting is refused by name.

| Setting | What it does |
|---|---|
| `internal_resolvers` | Addresses of your own resolvers; queries to any other resolver are flagged (no check when empty) |
| `chatty_min` | Queries for one name from one client before it is flagged (default 1000) |
| `nxdomain_min` | NXDOMAIN answers a client needs before its share is judged (default 20) |
| `nxdomain_share_pct` | NXDOMAIN share of a client above which it is flagged (default 50) |
| `servfail_min` | Queries a name needs before its SERVFAIL share is judged (default 10) |
| `servfail_share_pct` | SERVFAIL share above which a name is flagged (default 25) |
| `blocked_min` | Blocked queries from one client before it is flagged (default 10) |
| `tunnel_names_min` | Distinct long random-looking names under one domain from one client before it is flagged (default 10) |
| `long_label` | Characters in the first label that make a name long (default 30) |
| `entropy_min` | Character entropy (bits) above which a long label looks random (default 3.5) |
| `ignore_domains` | Domains whose long names are expected (some security and CDN services), e.g. "example-av.net" |

## What it never does

- `dns_resolver_block_domain` is refused: Notus never blocks a domain or changes a resolver.
- `endpoint_isolate` is refused: Notus never isolates a device.
- `notus_request_send` waits for one named person's click, even in Auto (`binding_send`).
- `notus_accept_learning` waits for one named person's click, even in Auto (`accept_learning`).
- `notus_retire_memory` waits for one named person's click, even in Auto (`accept_learning`).
- `dns_resolver_block_domain` waits for one named person's click, even in Auto (`production_deploy`).
- `endpoint_isolate` waits for one named person's click, even in Auto (`production_deploy`).

<!-- generated:start -->

## A demo run

`npx -y notus-of-dns demo` runs the agent on the fictional files in [`fixtures/`](fixtures) in a temporary folder. Captured output:

```text
Notus of Dns demo (fictional data) in a temporary folder, Auto on for the draft only

▶ Check the exported files
  status: executed  decision: allow
  1455 queries from 8 client(s) for 21 name(s), 5.8% NXDOMAIN, 98.4% repeats: 6 open finding(s), 1 high.
    high    possible_tunnel            10.0.1.11
    medium  blocked_client             10.0.1.14
    medium  nxdomain_client            10.0.1.12
    medium  outside_resolver           10.0.1.13
    low     chatty_name                10.0.1.10
    low     servfail_name              api.vendor.example

▶ Explain one finding
  status: executed  decision: allow
  high possible_tunnel: 10.0.1.11 asked for 12 long random-looking names under example.net. Fix: Find the process on this device that makes these queries; block the domain at the resolver if nobody can explain it.

▶ Write the worklist
  status: executed  decision: allow
  DNS query review written: 1455 queries from 8 client(s) for 21 name(s), 5.8% NXDOMAIN, 98.4% repeats: 6 open finding(s), 1 high.

▶ Draft the note for a person
  status: executed  decision: allow  (auto)
  network note 2026-11-18 drafted with 1 open marker(s) ([TO CONFIRM network and security team]). Nothing was sent.

▶ Auto: approving it still waits for one named person
  status: needs_approval  decision: ask
  reason: binding_send stays one-click, even in Auto

▶ The agent tries to change the live system itself
  status: blocked  decision: block
  reason: Notus never blocks a domain or changes a resolver.
```

## Tools

| Tool | What it does | Policy |
|---|---|---|
| `notus_check` | Review the query log and list possible tunnelling, outside resolvers, blocked lookups, NXDOMAIN-heavy clients, failing names and chatty names. | runs |
| `notus_explain` | Every finding for one client address or queried name. | runs |
| `notus_write_report` | Write notus-dns.csv (one row per finding, with blank owner and decision columns) and notus-dns.html into out_dir (default fairwire-out/notus). | runs |
| `notus_draft_network_note` | Write drafts/network_note-<date>.md: the open findings at or above min_severity (default medium), each with what to do, addressed to network and security team. | asks first (Auto can be opted in) |
| `notus_request_send` | After one named human click (even in Auto), record that the reviewed network note draft is approved in network_note-requests.csv. | one named click, even in Auto (`binding_send`) |
| `notus_recall` | Search this agent's own memory of the customer's setup: accepted facts (in use) and facts waiting for a person. | runs |
| `notus_learn` | Propose one fact about the customer's setup for this agent to remember. | runs |
| `notus_accept_learning` | A named person accepts or rejects a fact waiting in this agent's memory. | one named click, even in Auto (`accept_learning`) |
| `notus_retire_memory` | A named person stops an accepted fact from applying. | one named click, even in Auto (`accept_learning`) |
| `dns_resolver_block_domain` | Notus never blocks a domain or changes a resolver. | refused |
| `endpoint_isolate` | Notus never isolates a device. | refused |

Any tool name not in this table is blocked, including names a model invents. `refused` tools are listed so a model can see they exist and are refused.

## Columns it reads

Table inputs can be CSV, TSV, semicolon- or pipe-separated text, Excel `.xlsx`, JSON or JSONL. Columns are matched by the agent's own name, then by the English names below, then by their names in German, French, Spanish, Portuguese, Italian, Japanese, Chinese and Korean. Dates become `YYYY-MM-DD`; amounts and counts are read with either decimal mark. Every result lists under `sources` how each file was read.

### DNS queries (`queries`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `client` (required) | text | Client IP, Client, Source IP, Source, client_ip, Requestor | Hostname, Nom d’hôte, ホスト名, 主机名 |
| `query` (required) | text | Query Name, Query, QName, Domain, Name, FQDN | - |
| `qtype` | text | Query Type, QType, Type, Record Type, RR Type | - |
| `rcode` | text | Response Code, RCode, Response, Status, Reply Code, Result Code | - |
| `count` | number | Count, Queries, Hits, Requests, Total | - |
| `resolver` | text | Resolver, Server, DNS Server, Upstream, Destination IP, Server IP | - |
| `action` | text | Action, Policy Action, Blocked, Filter Action, Disposition | Aktion, Action, アクション, 动作 |
| `at` | date and time | Timestamp, Time, Date, Query Time | - |

### Files from other countries

A German export in Windows-1252 with semicolons, `1.234,56` and `03.11.2026`, or a Japanese one in Shift_JIS with `2026/11/03`, is read the same way as the English file. [`fixtures/intl/`](fixtures/intl) has both versions of the demo data, and the eval cases `intl-de-*` and `intl-ja-*` require the same results as the English case. Columns named differently? Run `npx notus-of-dns inspect <file>` (names and shapes only, never values) and name them in `fairwire-sources.json`:

```json
{ "files": { "exports/devices.csv": { "columns": { "host": "Gerätename" }, "date_order": "dmy" } } }
```

## Memory

notus-of-dns can remember facts about your setup so the next run does not have to be told again. `notus_learn` only proposes a fact; it changes nothing until a named person accepts it with `notus_accept_learning`, which is one click even in Auto. Facts live in one hash-chained file per agent under `.fairwire/memory/`; if the chain does not verify, no fact is used. Credentials, personal identifiers and text that reads like instructions to an AI are refused. Run without memory with `--no-memory`.

| Kind | What an accepted fact changes |
|---|---|
| `known_exception` | that finding is listed under "Accepted as known" instead of as open, until review_by (when given) has passed. |
| `note` | nothing (shown by recall only) |

```bash
notus-of-dns memory list
notus-of-dns memory accept MEM-1a2b3c4d5e6f --as "Your Name"
notus-of-dns memory retire MEM-1a2b3c4d5e6f --as "Your Name" --reason "rule removed"
```

## Install

Node 20 or newer. No other dependencies.

```bash
npx -y notus-of-dns demo
npx -y notus-of-dns mcp --root /path/to/your/files
```

Claude Desktop, Cursor and other MCP hosts:

```json
{
  "mcpServers": {
    "notus-of-dns": {
      "command": "npx",
      "args": [
        "-y",
        "notus-of-dns",
        "mcp",
        "--root",
        "/path/to/your/files"
      ]
    }
  }
}
```

Claude Code: `claude mcp add notus-of-dns -- npx -y notus-of-dns mcp --root .`, or install the `notus-of-dns` plugin from this repository's marketplace.

## Modes and approvals

- **Review** (`--mode review`): reads and reports only.
- **Assist** (default): the policy above. A tool that asks returns an `approval_id`; a person approves it once with `notus-of-dns approve <id> --as "Your Name"` (or on the local approvals page, `notus-of-dns approvals`), and the same call is repeated.
- **Auto** (`--mode auto --auto <tool,...>`): opt-in per tool, with step caps and a kill switch (`notus-of-dns kill`). Paying, sending, posting to a ledger or a live system and accepting a learned fact stay **one named click even in Auto**; an approval is tied to the sha256 of the reviewed draft, so a changed draft needs a new click.

## CLI

```bash
notus-of-dns tools                 # every tool, its policy and arguments
notus-of-dns sources               # the columns each input is read from
notus-of-dns inspect <file>        # how a file would be read (names and shapes, never values)
notus-of-dns call notus_check '{"queries":"<queries>"}'
notus-of-dns eval                  # the private eval cases on the fictional fixtures
notus-of-dns demo
```

## Audit log and data

Every call is written to `.fairwire/audit.jsonl` under the root: hash-chained JSON lines, with arguments stored as a hash, signed with an Ed25519 key when you configure one. Everything runs on your machine on files you choose. No network calls, no telemetry, no credentials. The bundled fixtures are fictional.

<!-- generated:end -->

## Limits

- Reads only the files you export and give it. It does not log in to a firewall, switch, controller, cloud console, identity provider or any other live system.
- A random-looking name is a signal, not proof: some security, CDN and telemetry services use long names; list them in ignore_domains.
- Domains are grouped by their last two labels (three for names like example.co.uk), which can merge or split some domains.
- Thresholds are working defaults in a settings file you control; they are not a vendor rule, a requirement of any standard or a security guarantee.
- It changes nothing on a live device, firewall, DNS zone, directory or cloud account. Every change it suggests is a draft that one named person applies.
- Export layouts were written from knowledge of common exports and have not been tested on live customer accounts. Run `inspect` on a new export and name columns in `fairwire-sources.json` when they differ.

## Licence

MIT. Fictional data only in `fixtures/`.
