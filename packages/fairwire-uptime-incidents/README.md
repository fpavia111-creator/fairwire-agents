# Fairwire Uptime Incidents

Uptime and incident review: services below their availability target, time to acknowledge and to resolve against your targets, incidents with no review written, the same service failing again and again, incidents that followed a change, and the error budget left. Drafts review notes.

Part of **Fairwire**, the IT and network family of [Fair Agents](https://fair-agents.com) agents. The software is free (MIT); you pay a fixed price for the setup on your files. It reads files your IT team exports, on your own computer, and drafts notes. Every change to a live device, firewall, DNS zone, directory or cloud account stays one named person's click.

## What it checks

| Finding | What it means |
|---|---|
| `below_slo` | A service whose availability was below its target. |
| `missing_postmortem` | A major incident (SEV1 or SEV2 by default) resolved with no review written. |
| `repeat_failures` | The same service had several incidents in the period. |
| `slow_acknowledge` | An incident acknowledged later than the target for its severity. |
| `slow_resolve` | An incident resolved later than the target for its severity. |
| `error_budget_nearly_spent` | A service still meeting its target but with most of its error budget used. |
| `change_caused` | Incidents linked to a change (a sign to look at change testing for that service). |

Findings come back worst first (high, medium, low). A finding a named person has reviewed can be accepted as known, with a reason and a date to look again; it then moves to "Accepted as known" instead of counting as open.

## Settings

Pass a settings file with `settings`. Every setting is optional; a misspelt setting is refused by name.

| Setting | What it does |
|---|---|
| `ack_minutes` | Acknowledge target in minutes per severity (default SEV1 15, SEV2 30, SEV3 60, SEV4 240) |
| `resolve_hours` | Resolve target in hours per severity (default SEV1 4, SEV2 8, SEV3 24, SEV4 72) |
| `postmortem_for` | Severities that need a written review (default SEV1, SEV2) |
| `repeat_min` | Incidents on one service in the file before it is flagged (default 3) |
| `default_slo_pct` | Availability target for services with none in the file (default 99.9) |
| `budget_warn_pct` | Share of the error budget used that is flagged (default 80) |

## What it never does

- `status_page_publish` is refused: Fairwire Uptime Incidents never posts to a status page or tells customers anything.
- `oncall_page_responder` is refused: Fairwire Uptime Incidents never pages anyone.
- `incidents_request_send` waits for one named person's click, even in Auto (`binding_send`).
- `incidents_accept_learning` waits for one named person's click, even in Auto (`accept_learning`).
- `incidents_retire_memory` waits for one named person's click, even in Auto (`accept_learning`).
- `status_page_publish` waits for one named person's click, even in Auto (`binding_send`).
- `oncall_page_responder` waits for one named person's click, even in Auto (`binding_send`).

<!-- generated:start -->

## A demo run

`npx -y fairwire-uptime-incidents demo` runs the agent on the fictional files in [`fixtures/`](fixtures) in a temporary folder. Captured output:

```text
Fairwire Uptime Incidents demo (fictional data) in a temporary folder, Auto on for the draft only

▶ Check the exported files
  status: executed  decision: allow
  6 incident(s) on 4 service(s), 4 major, mean time to resolve 7.58 hours: 10 open finding(s), 1 high.
    high    below_slo                  Customer portal
    medium  missing_postmortem         Customer portal
    medium  missing_postmortem         VPN
    medium  repeat_failures            Customer portal
    medium  slow_acknowledge           Customer portal
    medium  slow_acknowledge           Email
    medium  slow_resolve               Customer portal
    medium  slow_resolve               Email
    low     change_caused              Customer portal
    low     error_budget_nearly_spent  Email

▶ Explain one finding
  status: executed  decision: allow
  high below_slo: Customer portal was available 99.62% against a target of 99.9%. Fix: Agree a recovery plan with the service owner; tell the people who rely on the target.
medium missing_postmortem: SEV1 incident IR-201 on Customer portal is resolved with no review written. Fix: Hold a blameless review and record the actions with owners.
medium repeat_failures: Customer portal had 3 incidents (IR-201, IR-202, IR-203). Fix: Look for a shared cause across them and fund a fix, not another patch.
medium slow_acknowledge: SEV1 incident IR-201 on Customer portal was acknowledged after 40 minutes; the target is 15. Fix: Check the on-call rota and paging for that time.
medium slow_resolve: SEV1 incident IR-201 on Customer portal took 6.5 hours to resolve; the target is 4. Fix: Cover it in the review: what slowed diagnosis or recovery?
low change_caused: 2 incident(s) on Customer portal followed a change (CHG-5101, CHG-5140). Fix: Review how changes to this service are tested and rolled back.

▶ Write the worklist
  status: executed  decision: allow
  Uptime and incidents written: 6 incident(s) on 4 service(s), 4 major, mean time to resolve 7.58 hours: 10 open finding(s), 1 high.

▶ Draft the note for a person
  status: executed  decision: allow  (auto)
  review note 2026-11-18 drafted with 1 open marker(s) ([TO CONFIRM service owners and the incident manager]). Nothing was sent.

▶ Auto: approving it still waits for one named person
  status: needs_approval  decision: ask
  reason: binding_send stays one-click, even in Auto

▶ The agent tries to change the live system itself
  status: blocked  decision: block
  reason: Fairwire Uptime Incidents never posts to a status page or tells customers anything.
```

## Tools

| Tool | What it does | Policy |
|---|---|---|
| `incidents_check` | Review incidents and availability for the period and list missed targets, missing reviews, repeat failures, slow responses, budget burn and change-related incidents. | runs |
| `incidents_explain` | Every finding for one service or incident. | runs |
| `incidents_write_report` | Write uptime-incidents.csv (one row per finding, with blank owner and decision columns) and uptime-incidents.html into out_dir (default fairwire-out/incidents). | runs |
| `incidents_draft_review_note` | Write drafts/review_note-<date>.md: the open findings at or above min_severity (default medium), each with what to do, addressed to service owners and the incident manager. | asks first (Auto can be opted in) |
| `incidents_request_send` | After one named human click (even in Auto), record that the reviewed review note draft is approved in review_note-requests.csv. | one named click, even in Auto (`binding_send`) |
| `incidents_recall` | Search this agent's own memory of the customer's setup: accepted facts (in use) and facts waiting for a person. | runs |
| `incidents_learn` | Propose one fact about the customer's setup for this agent to remember. | runs |
| `incidents_accept_learning` | A named person accepts or rejects a fact waiting in this agent's memory. | one named click, even in Auto (`accept_learning`) |
| `incidents_retire_memory` | A named person stops an accepted fact from applying. | one named click, even in Auto (`accept_learning`) |
| `status_page_publish` | Fairwire Uptime Incidents never posts to a status page or tells customers anything. | refused |
| `oncall_page_responder` | Fairwire Uptime Incidents never pages anyone. | refused |

Any tool name not in this table is blocked, including names a model invents. `refused` tools are listed so a model can see they exist and are refused.

## Columns it reads

Table inputs can be CSV, TSV, semicolon- or pipe-separated text, Excel `.xlsx`, JSON or JSONL. Columns are matched by the agent's own name, then by the English names below, then by their names in German, French, Spanish, Portuguese, Italian, Japanese, Chinese and Korean. Dates become `YYYY-MM-DD`; amounts and counts are read with either decimal mark. Every result lists under `sources` how each file was read.

### Incidents (`incidents`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `incident_id` (required) | text | Incident, Incident ID, ID, Number, Key | - |
| `service` (required) | text | Service, Application, System, Component, Business Service | Service, Service, サービス, 服务 |
| `severity` | text | Severity, Priority, SEV, Impact, Urgency | Schweregrad, Gravité, 重大度, 严重程度 |
| `started_at` (required) | date and time | Started, Start, Opened, Created, Triggered At, Detected | Startzeit, Heure de début, 開始日時, 开始时间 |
| `acknowledged_at` | date and time | Acknowledged, Acknowledged At, Ack Time, First Response | - |
| `resolved_at` | date and time | Resolved, Resolved At, Closed, End | Gelöst am, Résolu le, 解決日時, 解决时间 |
| `postmortem` | text | Postmortem, Post-incident Review, PIR, Review, RCA Link | - |
| `change_id` | text | Change, Change ID, Caused by Change, Related Change | - |

### Availability (`uptime`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `service` (required) | text | Service, Monitor, Check, Application | Service, Service, サービス, 服务 |
| `availability_pct` (required) | number | Availability %, Uptime %, Availability, Uptime, SLI | - |
| `target_pct` | number | Target %, SLO, Target, SLA % | - |

### Files from other countries

A German export in Windows-1252 with semicolons, `1.234,56` and `03.11.2026`, or a Japanese one in Shift_JIS with `2026/11/03`, is read the same way as the English file. [`fixtures/intl/`](fixtures/intl) has both versions of the demo data, and the eval cases `intl-de-*` and `intl-ja-*` require the same results as the English case. Columns named differently? Run `npx fairwire-uptime-incidents inspect <file>` (names and shapes only, never values) and name them in `fairwire-sources.json`:

```json
{ "files": { "exports/devices.csv": { "columns": { "host": "Gerätename" }, "date_order": "dmy" } } }
```

## Memory

fairwire-uptime-incidents can remember facts about your setup so the next run does not have to be told again. `incidents_learn` only proposes a fact; it changes nothing until a named person accepts it with `incidents_accept_learning`, which is one click even in Auto. Facts live in one hash-chained file per agent under `.fairwire/memory/`; if the chain does not verify, no fact is used. Credentials, personal identifiers and text that reads like instructions to an AI are refused. Run without memory with `--no-memory`.

| Kind | What an accepted fact changes |
|---|---|
| `known_exception` | that finding is listed under "Accepted as known" instead of as open, until review_by (when given) has passed. |
| `note` | nothing (shown by recall only) |

```bash
fairwire-uptime-incidents memory list
fairwire-uptime-incidents memory accept MEM-1a2b3c4d5e6f --as "Your Name"
fairwire-uptime-incidents memory retire MEM-1a2b3c4d5e6f --as "Your Name" --reason "rule removed"
```

## Install

Node 20 or newer. No other dependencies.

```bash
npx -y fairwire-uptime-incidents demo
npx -y fairwire-uptime-incidents mcp --root /path/to/your/files
```

Claude Desktop, Cursor and other MCP hosts:

```json
{
  "mcpServers": {
    "fairwire-uptime-incidents": {
      "command": "npx",
      "args": [
        "-y",
        "fairwire-uptime-incidents",
        "mcp",
        "--root",
        "/path/to/your/files"
      ]
    }
  }
}
```

Claude Code: `claude mcp add fairwire-uptime-incidents -- npx -y fairwire-uptime-incidents mcp --root .`, or install the `fairwire-uptime-incidents` plugin from this repository's marketplace.

## Modes and approvals

- **Review** (`--mode review`): reads and reports only.
- **Assist** (default): the policy above. A tool that asks returns an `approval_id`; a person approves it once with `fairwire-uptime-incidents approve <id> --as "Your Name"` (or on the local approvals page, `fairwire-uptime-incidents approvals`), and the same call is repeated.
- **Auto** (`--mode auto --auto <tool,...>`): opt-in per tool, with step caps and a kill switch (`fairwire-uptime-incidents kill`). Paying, sending, posting to a ledger or a live system and accepting a learned fact stay **one named click even in Auto**; an approval is tied to the sha256 of the reviewed draft, so a changed draft needs a new click.

## CLI

```bash
fairwire-uptime-incidents tools                 # every tool, its policy and arguments
fairwire-uptime-incidents sources               # the columns each input is read from
fairwire-uptime-incidents inspect <file>        # how a file would be read (names and shapes, never values)
fairwire-uptime-incidents call incidents_check '{"incidents":"<incidents>"}'
fairwire-uptime-incidents eval                  # the private eval cases on the fictional fixtures
fairwire-uptime-incidents demo
```

## Audit log and data

Every call is written to `.fairwire/audit.jsonl` under the root: hash-chained JSON lines, with arguments stored as a hash, signed with an Ed25519 key when you configure one. Everything runs on your machine on files you choose. No network calls, no telemetry, no credentials. The bundled fixtures are fictional.

<!-- generated:end -->

## Limits

- Reads only the files you export and give it. It does not log in to a firewall, switch, controller, cloud console, identity provider or any other live system.
- Availability is the figure your monitoring exported for the period; targets are yours, not contractual SLAs unless you say so.
- Times are measured from the start time in the export; detection delays before that are not visible.
- Thresholds are working defaults in a settings file you control; they are not a vendor rule, a requirement of any standard or a security guarantee.
- It changes nothing on a live device, firewall, DNS zone, directory or cloud account. Every change it suggests is a draft that one named person applies.
- Export layouts were written from knowledge of common exports and have not been tested on live customer accounts. Run `inspect` on a new export and name columns in `fairwire-sources.json` when they differ.

## License

MIT. Fictional data only in `fixtures/`.
