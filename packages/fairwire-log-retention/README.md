# Fairwire Log Retention

Log retention and coverage: log sources kept for less time than your policy, sources that went quiet, systems in your asset list sending no logs, daily volume jumps that raise cost, and sources kept far longer than policy. Drafts notes for the log platform owner; never changes retention.

Part of **Fairwire**, the IT and network family of [Fair Agents](https://fair-agents.com) agents. The software is free (MIT); you pay a fixed price for the setup on your files. It reads files your IT team exports, on your own computer, and drafts notes. Every change to a live device, firewall, DNS zone, directory or cloud account stays one named person's click.

## What it checks

| Finding | What it means |
|---|---|
| `retention_too_short` | Logs kept for fewer days than your policy for that kind of log (high for security logs). |
| `source_silent` | A log source that sent nothing for longer than your limit (high for security sources). |
| `asset_not_logging` | A system in your asset list that sends no logs at all. |
| `volume_jump` | A source sending far more data a day than its usual amount (cost, or something noisy going on). |
| `kept_too_long` | Logs kept far longer than your policy (cost, and personal data kept longer than needed). |

Findings come back worst first (high, medium, low). A finding a named person has reviewed can be accepted as known, with a reason and a date to look again; it then moves to "Accepted as known" instead of counting as open.

## Settings

Pass a settings file with `settings`. Every setting is optional; a misspelt setting is refused by name.

| Setting | What it does |
|---|---|
| `retention_policy_days` | Days to keep each category of log, e.g. {"security": 365, "network": 90, "application": 30} (default); other categories use "default" (90) |
| `silent_hours` | Hours without events after which a source counts as silent (default 24) |
| `volume_jump_pct` | Rise over the usual daily volume, in percent, that is flagged (default 100) |
| `too_long_factor` | How many times the policy a source may be kept before it is flagged (default 3) |
| `asset_types_logged` | Asset types expected to send logs (default server, firewall, domain controller, vpn, switch) |

## What it never does

- `siem_change_retention` is refused: Fairwire Log Retention never changes retention, ingestion or collection settings.
- `siem_delete_logs` is refused: Fairwire Log Retention never deletes logs.
- `logs_request_send` waits for one named person's click, even in Auto (`binding_send`).
- `logs_accept_learning` waits for one named person's click, even in Auto (`accept_learning`).
- `logs_retire_memory` waits for one named person's click, even in Auto (`accept_learning`).
- `siem_change_retention` waits for one named person's click, even in Auto (`production_deploy`).
- `siem_delete_logs` waits for one named person's click, even in Auto (`delete_personal_data`).

<!-- generated:start -->

## A demo run

`npx -y fairwire-log-retention demo` runs the agent on the fictional files in [`fixtures/`](fixtures) in a temporary folder. Captured output:

```text
Fairwire Log Retention demo (fictional data) in a temporary folder, Auto on for the draft only

▶ Check the exported files
  status: executed  decision: allow
  7 log source(s), 96.5 GB a day, 77.8% of 9 in-scope assets logging: 7 open finding(s), 2 high.
    high    retention_too_short        security
    high    source_silent              security
    medium  asset_not_logging          coverage
    medium  asset_not_logging          coverage
    medium  retention_too_short        network
    medium  volume_jump                application
    low     kept_too_long              application

▶ Explain one finding
  status: executed  decision: allow
  high retention_too_short: Firewall traffic@fw-edge-01 (security) is kept 90 days; your policy says 365. Fix: Raise the retention, or archive to cheaper storage for the rest of the period.
high source_silent: Domain controller security@dc-02 (security) has sent nothing since 2026-11-14 23:10:00. Fix: Check the forwarder or agent on the source and the collector it sends to.

▶ Write the worklist
  status: executed  decision: allow
  Log retention and coverage written: 7 log source(s), 96.5 GB a day, 77.8% of 9 in-scope assets logging: 7 open finding(s), 2 high.

▶ Draft the note for a person
  status: executed  decision: allow  (auto)
  logging note 2026-11-18 drafted with 1 open marker(s) ([TO CONFIRM security operations and the log platform owner]). Nothing was sent.

▶ Auto: approving it still waits for one named person
  status: needs_approval  decision: ask
  reason: binding_send stays one-click, even in Auto

▶ The agent tries to change the live system itself
  status: blocked  decision: block
  reason: Fairwire Log Retention never changes retention, ingestion or collection settings.
```

## Tools

| Tool | What it does | Policy |
|---|---|---|
| `logs_check` | Review the log source inventory against your retention policy and asset list and list short retention, silent sources, missing systems, volume jumps and over-long retention. | runs |
| `logs_explain` | Every finding for one log source, host or category. | runs |
| `logs_write_report` | Write log-retention.csv (one row per finding, with blank owner and decision columns) and log-retention.html into out_dir (default fairwire-out/logs). | runs |
| `logs_draft_logging_note` | Write drafts/logging_note-<date>.md: the open findings at or above min_severity (default medium), each with what to do, addressed to security operations and the log platform owner. | asks first (Auto can be opted in) |
| `logs_request_send` | After one named human click (even in Auto), record that the reviewed logging note draft is approved in logging_note-requests.csv. | one named click, even in Auto (`binding_send`) |
| `logs_recall` | Search this agent's own memory of the customer's setup: accepted facts (in use) and facts waiting for a person. | runs |
| `logs_learn` | Propose one fact about the customer's setup for this agent to remember. | runs |
| `logs_accept_learning` | A named person accepts or rejects a fact waiting in this agent's memory. | one named click, even in Auto (`accept_learning`) |
| `logs_retire_memory` | A named person stops an accepted fact from applying. | one named click, even in Auto (`accept_learning`) |
| `siem_change_retention` | Fairwire Log Retention never changes retention, ingestion or collection settings. | refused |
| `siem_delete_logs` | Fairwire Log Retention never deletes logs. | refused |

Any tool name not in this table is blocked, including names a model invents. `refused` tools are listed so a model can see they exist and are refused.

## Columns it reads

Table inputs can be CSV, TSV, semicolon- or pipe-separated text, Excel `.xlsx`, JSON or JSONL. Columns are matched by the agent's own name, then by the English names below, then by their names in German, French, Spanish, Portuguese, Italian, Japanese, Chinese and Korean. Dates become `YYYY-MM-DD`; amounts and counts are read with either decimal mark. Every result lists under `sources` how each file was read.

### Log sources (`sources`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `source` (required) | text | Source, Log Source, Data Source, Index, Table, Name | Quelle, Source, 送信元, 源 |
| `host` | text | Host, Hostname, Device, System, Computer | Hostname, Nom d’hôte, ホスト名, 主机名 |
| `category` | text | Category, Type, Log Type, Source Type | Kategorie, Catégorie, 経費科目, 费用类别 |
| `retention_days` (required) | number | Retention Days, Retention, Retention (days), Keep Days | Aufbewahrung (Tage), Conservation (jours), 保存期間（日）, 保留天数 |
| `last_event` | date and time | Last Event, Last Seen, Last Received, Latest Event, Last Log | - |
| `daily_gb` | number | Daily GB, GB per Day, Ingest GB/day, Volume (GB), Today GB | - |
| `avg_daily_gb` | number | Average Daily GB, Avg GB/day, Baseline GB, 30-day Average GB | - |

### Asset list (`assets`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `host` (required) | text | Host, Hostname, Device Name, Name, Asset | Hostname, Nom d’hôte, ホスト名, 主机名 |
| `type` | text | Type, Class, Category | Typ, Type, 種類, 类型 |

### Files from other countries

A German export in Windows-1252 with semicolons, `1.234,56` and `03.11.2026`, or a Japanese one in Shift_JIS with `2026/11/03`, is read the same way as the English file. [`fixtures/intl/`](fixtures/intl) has both versions of the demo data, and the eval cases `intl-de-*` and `intl-ja-*` require the same results as the English case. Columns named differently? Run `npx fairwire-log-retention inspect <file>` (names and shapes only, never values) and name them in `fairwire-sources.json`:

```json
{ "files": { "exports/devices.csv": { "columns": { "host": "Gerätename" }, "date_order": "dmy" } } }
```

## Memory

fairwire-log-retention can remember facts about your setup so the next run does not have to be told again. `logs_learn` only proposes a fact; it changes nothing until a named person accepts it with `logs_accept_learning`, which is one click even in Auto. Facts live in one hash-chained file per agent under `.fairwire/memory/`; if the chain does not verify, no fact is used. Credentials, personal identifiers and text that reads like instructions to an AI are refused. Run without memory with `--no-memory`.

| Kind | What an accepted fact changes |
|---|---|
| `known_exception` | that finding is listed under "Accepted as known" instead of as open, until review_by (when given) has passed. |
| `note` | nothing (shown by recall only) |

```bash
fairwire-log-retention memory list
fairwire-log-retention memory accept MEM-1a2b3c4d5e6f --as "Your Name"
fairwire-log-retention memory retire MEM-1a2b3c4d5e6f --as "Your Name" --reason "rule removed"
```

## Install

Node 20 or newer. No other dependencies.

```bash
npx -y fairwire-log-retention demo
npx -y fairwire-log-retention mcp --root /path/to/your/files
```

Claude Desktop, Cursor and other MCP hosts:

```json
{
  "mcpServers": {
    "fairwire-log-retention": {
      "command": "npx",
      "args": [
        "-y",
        "fairwire-log-retention",
        "mcp",
        "--root",
        "/path/to/your/files"
      ]
    }
  }
}
```

Claude Code: `claude mcp add fairwire-log-retention -- npx -y fairwire-log-retention mcp --root .`, or install the `fairwire-log-retention` plugin from this repository's marketplace.

## Modes and approvals

- **Review** (`--mode review`): reads and reports only.
- **Assist** (default): the policy above. A tool that asks returns an `approval_id`; a person approves it once with `fairwire-log-retention approve <id> --as "Your Name"` (or on the local approvals page, `fairwire-log-retention approvals`), and the same call is repeated.
- **Auto** (`--mode auto --auto <tool,...>`): opt-in per tool, with step caps and a kill switch (`fairwire-log-retention kill`). Paying, sending, posting to a ledger or a live system and accepting a learned fact stay **one named click even in Auto**; an approval is tied to the sha256 of the reviewed draft, so a changed draft needs a new click.

## CLI

```bash
fairwire-log-retention tools                 # every tool, its policy and arguments
fairwire-log-retention sources               # the columns each input is read from
fairwire-log-retention inspect <file>        # how a file would be read (names and shapes, never values)
fairwire-log-retention call logs_check '{"sources":"<sources>"}'
fairwire-log-retention eval                  # the private eval cases on the fictional fixtures
fairwire-log-retention demo
```

## Audit log and data

Every call is written to `.fairwire/audit.jsonl` under the root: hash-chained JSON lines, with arguments stored as a hash, signed with an Ed25519 key when you configure one. Everything runs on your machine on files you choose. No network calls, no telemetry, no credentials. The bundled fixtures are fictional.

<!-- generated:end -->

## Limits

- Reads only the files you export and give it. It does not log in to a firewall, switch, controller, cloud console, identity provider or any other live system.
- Retention defaults (365 days for security, 90 for network, 30 for application logs) are working defaults, not a legal requirement; your regulator, insurer or contracts decide what you must keep.
- A source counts as silent from the last event in the export; time zones in the export are taken as written.
- Thresholds are working defaults in a settings file you control; they are not a vendor rule, a requirement of any standard or a security guarantee.
- It changes nothing on a live device, firewall, DNS zone, directory or cloud account. Every change it suggests is a draft that one named person applies.
- Export layouts were written from knowledge of common exports and have not been tested on live customer accounts. Run `inspect` on a new export and name columns in `fairwire-sources.json` when they differ.

## License

MIT. Fictional data only in `fixtures/`.
