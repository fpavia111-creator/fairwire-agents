# Fairwire DNS Records

DNS zone hygiene from a zone export: names pointing at cloud services that may no longer exist (takeover risk), public names pointing at private addresses, duplicate and conflicting records, very short or very long TTLs, wildcards and records pointing at addresses you no longer own. Drafts a change request; never edits DNS.

Part of **Fairwire**, the IT and network family of [Fair Agents](https://fair-agents.com) agents. The software is free (MIT); you pay a fixed price for the setup on your files. It reads files your IT team exports, on your own computer, and drafts notes. Every change to a live device, firewall, DNS zone, directory or cloud account stays one named person's click.

## What it checks

| Finding | What it means |
|---|---|
| `dangling_cname` | A name pointing (CNAME) at a cloud service host name that may no longer exist: whoever creates that cloud resource next can serve content on your name (subdomain takeover). |
| `cname_conflict` | A name with a CNAME and other records at the same time, which DNS does not allow and resolvers handle unpredictably. |
| `private_ip_in_public_zone` | A public zone record pointing at a private address (it leaks your internal layout and never works from outside). |
| `ip_not_owned` | A record pointing at a public address outside the ranges you own (it may now belong to someone else). |
| `duplicate_record` | The same record listed twice. |
| `ttl_out_of_range` | A time-to-live shorter or longer than your limits. |
| `wildcard_record` | A wildcard record, which answers for every name under it, including typos and names an attacker chooses. |

Findings come back worst first (high, medium, low). A finding a named person has reviewed can be accepted as known, with a reason and a date to look again; it then moves to "Accepted as known" instead of counting as open.

## Settings

Pass a settings file with `settings`. Every setting is optional; a misspelt setting is refused by name.

| Setting | What it does |
|---|---|
| `public_zones` | Zones published on the internet (default: every zone in the file) |
| `owned_cidrs` | Public address ranges you own or rent (no ownership check when empty) |
| `active_cloud_hosts` | Cloud host names that still exist in your accounts; a CNAME to a cloud host not on this list is high (medium when the list is empty) |
| `cloud_suffixes` | Extra cloud service host suffixes to treat as takeover-prone |
| `ttl_min` | Shortest acceptable TTL in seconds (default 60) |
| `ttl_max` | Longest acceptable TTL in seconds (default 604800, one week) |

## What it never does

- `dns_update_record` is refused: Fairwire DNS Records never creates, changes or deletes a DNS record.
- `dns_live_lookup` is refused: Fairwire DNS Records never queries live DNS or cloud APIs; it reads the export you give it.
- `dns_records_request_submit` waits for one named person's click, even in Auto (`production_deploy`).
- `dns_records_accept_learning` waits for one named person's click, even in Auto (`accept_learning`).
- `dns_records_retire_memory` waits for one named person's click, even in Auto (`accept_learning`).
- `dns_update_record` waits for one named person's click, even in Auto (`production_deploy`).
- `dns_live_lookup` waits for one named person's click, even in Auto (`production_deploy`).

<!-- generated:start -->

## A demo run

`npx -y fairwire-dns-records demo` runs the agent on the fictional files in [`fixtures/`](fixtures) in a temporary folder. Captured output:

```text
Fairwire DNS Records demo (fictional data) in a temporary folder, Auto on for the draft only

▶ Check the exported files
  status: executed  decision: allow
  14 record(s) for 12 name(s) in 2 zone(s), 5 CNAME(s): 8 open finding(s), 2 high.
    high    cname_conflict             example.com
    high    dangling_cname             example.com
    medium  ip_not_owned               example.com
    medium  private_ip_in_public_zone  example.com
    low     duplicate_record           example.com
    low     ttl_out_of_range           example.com
    low     ttl_out_of_range           example.com
    low     wildcard_record            example.com

▶ Explain one finding
  status: executed  decision: allow
  high cname_conflict: status.example.com has a CNAME and also TXT records. Fix: Keep either the CNAME or the other records, not both.
low ttl_out_of_range: CNAME record status.example.com has a TTL of 30 seconds. Fix: Raise it unless you are about to move the record; very short TTLs add load and cost.

▶ Write the worklist
  status: executed  decision: allow
  DNS zone hygiene written: 14 record(s) for 12 name(s) in 2 zone(s), 5 CNAME(s): 8 open finding(s), 2 high.

▶ Draft the note for a person
  status: executed  decision: allow  (auto)
  change request 2026-11-18 drafted with 1 open marker(s) ([TO CONFIRM DNS and network change board]). Nothing was sent.

▶ Auto: approving it still waits for one named person
  status: needs_approval  decision: ask
  reason: production_deploy stays one-click, even in Auto

▶ The agent tries to change the live system itself
  status: blocked  decision: block
  reason: Fairwire DNS Records never creates, changes or deletes a DNS record.
```

## Tools

| Tool | What it does | Policy |
|---|---|---|
| `dns_records_check` | Review the zone export and list takeover-prone CNAMEs, CNAME conflicts, private or foreign addresses, duplicates, TTL problems and wildcards. | runs |
| `dns_records_explain` | Every finding for one record name or zone. | runs |
| `dns_records_write_report` | Write dns-records.csv (one row per finding, with blank owner and decision columns) and dns-records.html into out_dir (default fairwire-out/dns_records). | runs |
| `dns_records_draft_change_request` | Write drafts/change_request-<date>.md: the open findings at or above min_severity (default medium), each with what to do, addressed to DNS and network change board. | asks first (Auto can be opted in) |
| `dns_records_request_submit` | After one named human click (even in Auto), record that the reviewed change request draft is approved in change_request-requests.csv. | one named click, even in Auto (`production_deploy`) |
| `dns_records_recall` | Search this agent's own memory of the customer's setup: accepted facts (in use) and facts waiting for a person. | runs |
| `dns_records_learn` | Propose one fact about the customer's setup for this agent to remember. | runs |
| `dns_records_accept_learning` | A named person accepts or rejects a fact waiting in this agent's memory. | one named click, even in Auto (`accept_learning`) |
| `dns_records_retire_memory` | A named person stops an accepted fact from applying. | one named click, even in Auto (`accept_learning`) |
| `dns_update_record` | Fairwire DNS Records never creates, changes or deletes a DNS record. | refused |
| `dns_live_lookup` | Fairwire DNS Records never queries live DNS or cloud APIs; it reads the export you give it. | refused |

Any tool name not in this table is blocked, including names a model invents. `refused` tools are listed so a model can see they exist and are refused.

## Columns it reads

Table inputs can be CSV, TSV, semicolon- or pipe-separated text, Excel `.xlsx`, JSON or JSONL. Columns are matched by the agent's own name, then by the English names below, then by their names in German, French, Spanish, Portuguese, Italian, Japanese, Chinese and Korean. Dates become `YYYY-MM-DD`; amounts and counts are read with either decimal mark. Every result lists under `sources` how each file was read.

### DNS records (`records`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `zone` | text | Zone, Zone Name, Domain, Hosted Zone | Zone, Zone, ゾーン, 区域 |
| `name` (required) | text | Name, Record Name, Host, Hostname, FQDN | Name, Nom, 名前, 名称 |
| `type` (required) | text | Type, Record Type, RR Type | Typ, Type, 種類, 类型 |
| `value` (required) | text | Value, Data, Target, Points To, Content, Record Data | - |
| `ttl` | number | TTL, Time To Live, TTL (s) | TTL, TTL, TTL, TTL |

### Files from other countries

A German export in Windows-1252 with semicolons, `1.234,56` and `03.11.2026`, or a Japanese one in Shift_JIS with `2026/11/03`, is read the same way as the English file. [`fixtures/intl/`](fixtures/intl) has both versions of the demo data, and the eval cases `intl-de-*` and `intl-ja-*` require the same results as the English case. Columns named differently? Run `npx fairwire-dns-records inspect <file>` (names and shapes only, never values) and name them in `fairwire-sources.json`:

```json
{ "files": { "exports/devices.csv": { "columns": { "host": "Gerätename" }, "date_order": "dmy" } } }
```

## Memory

fairwire-dns-records can remember facts about your setup so the next run does not have to be told again. `dns_records_learn` only proposes a fact; it changes nothing until a named person accepts it with `dns_records_accept_learning`, which is one click even in Auto. Facts live in one hash-chained file per agent under `.fairwire/memory/`; if the chain does not verify, no fact is used. Credentials, personal identifiers and text that reads like instructions to an AI are refused. Run without memory with `--no-memory`.

| Kind | What an accepted fact changes |
|---|---|
| `known_exception` | that finding is listed under "Accepted as known" instead of as open, until review_by (when given) has passed. |
| `note` | nothing (shown by recall only) |

```bash
fairwire-dns-records memory list
fairwire-dns-records memory accept MEM-1a2b3c4d5e6f --as "Your Name"
fairwire-dns-records memory retire MEM-1a2b3c4d5e6f --as "Your Name" --reason "rule removed"
```

## Install

Node 20 or newer. No other dependencies.

```bash
npx -y fairwire-dns-records demo
npx -y fairwire-dns-records mcp --root /path/to/your/files
```

Claude Desktop, Cursor and other MCP hosts:

```json
{
  "mcpServers": {
    "fairwire-dns-records": {
      "command": "npx",
      "args": [
        "-y",
        "fairwire-dns-records",
        "mcp",
        "--root",
        "/path/to/your/files"
      ]
    }
  }
}
```

Claude Code: `claude mcp add fairwire-dns-records -- npx -y fairwire-dns-records mcp --root .`, or install the `fairwire-dns-records` plugin from this repository's marketplace.

## Modes and approvals

- **Review** (`--mode review`): reads and reports only.
- **Assist** (default): the policy above. A tool that asks returns an `approval_id`; a person approves it once with `fairwire-dns-records approve <id> --as "Your Name"` (or on the local approvals page, `fairwire-dns-records approvals`), and the same call is repeated.
- **Auto** (`--mode auto --auto <tool,...>`): opt-in per tool, with step caps and a kill switch (`fairwire-dns-records kill`). Paying, sending, posting to a ledger or a live system and accepting a learned fact stay **one named click even in Auto**; an approval is tied to the sha256 of the reviewed draft, so a changed draft needs a new click.

## CLI

```bash
fairwire-dns-records tools                 # every tool, its policy and arguments
fairwire-dns-records sources               # the columns each input is read from
fairwire-dns-records inspect <file>        # how a file would be read (names and shapes, never values)
fairwire-dns-records call dns_records_check '{"records":"<records>"}'
fairwire-dns-records eval                  # the private eval cases on the fictional fixtures
fairwire-dns-records demo
```

## Audit log and data

Every call is written to `.fairwire/audit.jsonl` under the root: hash-chained JSON lines, with arguments stored as a hash, signed with an Ed25519 key when you configure one. Everything runs on your machine on files you choose. No network calls, no telemetry, no credentials. The bundled fixtures are fictional.

<!-- generated:end -->

## Limits

- Reads only the files you export and give it. It does not log in to a firewall, switch, controller, cloud console, identity provider or any other live system.
- Works offline from the export: it does not resolve names or ask cloud providers whether a resource exists. List the cloud host names that still exist in active_cloud_hosts to sharpen the takeover check.
- Mail records (SPF, DKIM, DMARC, MX) and certificates are covered by the Fairbooks mail authentication and certificate agents, not here.
- Thresholds are working defaults in a settings file you control; they are not a vendor rule, a requirement of any standard or a security guarantee.
- It changes nothing on a live device, firewall, DNS zone, directory or cloud account. Every change it suggests is a draft that one named person applies.
- Export layouts were written from knowledge of common exports and have not been tested on live customer accounts. Run `inspect` on a new export and name columns in `fairwire-sources.json` when they differ.

## License

MIT. Fictional data only in `fixtures/`.
