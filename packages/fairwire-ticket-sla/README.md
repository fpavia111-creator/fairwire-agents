# Fairwire Ticket SLA

Ticket SLA aging from a service desk export: tickets past their response or resolution target by priority, aging buckets, tickets with no assignee, tickets reopened again and again, tickets parked on hold and the teams with the most breaches. Drafts a status note; never closes a ticket.

Part of **Fairwire**, the IT and network family of [Fair Agents](https://fair-agents.com) agents. The software is free (MIT); you pay a fixed price for the setup on your files. It reads files your IT team exports, on your own computer, and drafts notes. Every change to a live device, firewall, DNS zone, directory or cloud account stays one named person's click.

## What it checks

| Finding | What it means |
|---|---|
| `resolution_breached` | An open ticket past its resolution target (high for P1 and P2). |
| `response_breached` | An open ticket with no first response past its response target, or a first response that came late. |
| `no_assignee` | An open ticket older than a day with nobody assigned. |
| `team_breach_rate` | A team where more than your share of tickets breached their resolution target. |
| `parked_on_hold` | A ticket on hold for longer than your limit (on hold often stops the SLA clock). |
| `reopened_often` | A ticket reopened several times (the fix did not hold). |

Findings come back worst first (high, medium, low). A finding a named person has reviewed can be accepted as known, with a reason and a date to look again; it then moves to "Accepted as known" instead of counting as open.

## Settings

Pass a settings file with `settings`. Every setting is optional; a misspelt setting is refused by name.

| Setting | What it does |
|---|---|
| `response_hours` | First response target in hours per priority, e.g. {"P1": 1, "P2": 4, "P3": 8, "P4": 24} (default) |
| `resolve_hours` | Resolution target in hours per priority, e.g. {"P1": 4, "P2": 24, "P3": 72, "P4": 120} (default) |
| `hold_days` | Days on hold after which a ticket is flagged (default 7) |
| `reopen_min` | Reopens after which a ticket is flagged (default 2) |
| `team_breach_pct` | Share of a team's tickets breached above which the team is flagged (default 20) |

## What it never does

- `itsm_update_ticket` is refused: Fairwire Ticket SLA never edits, assigns, closes or reprioritises a ticket.
- `itsm_notify_requester` is refused: Fairwire Ticket SLA never messages requesters.
- `tickets_request_send` waits for one named person's click, even in Auto (`binding_send`).
- `tickets_accept_learning` waits for one named person's click, even in Auto (`accept_learning`).
- `tickets_retire_memory` waits for one named person's click, even in Auto (`accept_learning`).
- `itsm_update_ticket` waits for one named person's click, even in Auto (`production_deploy`).
- `itsm_notify_requester` waits for one named person's click, even in Auto (`binding_send`).

<!-- generated:start -->

## A demo run

`npx -y fairwire-ticket-sla demo` runs the agent on the fictional files in [`fixtures/`](fixtures) in a temporary folder. Captured output:

```text
Fairwire Ticket SLA demo (fictional data) in a temporary folder, Auto on for the draft only

▶ Check the exported files
  status: executed  decision: allow
  11 ticket(s), 6 open (1 older than 30 days): 11 open finding(s), 1 high.
    high    resolution_breached        Service Desk
    medium  no_assignee                Service Desk
    medium  resolution_breached        Applications
    medium  resolution_breached        Applications
    medium  response_breached          Service Desk
    medium  response_breached          Network
    medium  team_breach_rate           Applications
    medium  team_breach_rate           Service Desk
    low     parked_on_hold             Applications
    low     parked_on_hold             Applications
    low     reopened_often             Service Desk

▶ Explain one finding
  status: executed  decision: allow
  medium resolution_breached: P3 ticket INC-1004 (Applications) has been open 207 hours; the target is 72. Fix: Escalate it to the team lead today, or agree a new date with the requester.
medium resolution_breached: P4 ticket INC-1011 (Applications) has been open 1167 hours; the target is 120. Fix: Escalate it to the team lead today, or agree a new date with the requester.
medium team_breach_rate: 100% of the tickets for Applications missed their resolution target (4 of 4). Fix: Look at staffing, triage and the priorities the team receives.
low parked_on_hold: Ticket INC-1004 is "On Hold" and was opened 8.6 days ago. Fix: Chase the person it waits for, or close it with a note.
low parked_on_hold: Ticket INC-1011 is "Awaiting user" and was opened 48.6 days ago. Fix: Chase the person it waits for, or close it with a note.

▶ Write the worklist
  status: executed  decision: allow
  Ticket SLA aging written: 11 ticket(s), 6 open (1 older than 30 days): 11 open finding(s), 1 high.

▶ Draft the note for a person
  status: executed  decision: allow  (auto)
  status note 2026-11-18 drafted with 1 open marker(s) ([TO CONFIRM service desk team leads]). Nothing was sent.

▶ Auto: approving it still waits for one named person
  status: needs_approval  decision: ask
  reason: binding_send stays one-click, even in Auto

▶ The agent tries to change the live system itself
  status: blocked  decision: block
  reason: Fairwire Ticket SLA never edits, assigns, closes or reprioritises a ticket.
```

## Tools

| Tool | What it does | Policy |
|---|---|---|
| `tickets_check` | Review tickets against your response and resolution targets and list breaches, unassigned tickets, team breach rates, parked and reopened tickets. | runs |
| `tickets_explain` | Every finding for one ticket or team. | runs |
| `tickets_write_report` | Write ticket-sla.csv (one row per finding, with blank owner and decision columns) and ticket-sla.html into out_dir (default fairwire-out/tickets). | runs |
| `tickets_draft_status_note` | Write drafts/status_note-<date>.md: the open findings at or above min_severity (default medium), each with what to do, addressed to service desk team leads. | asks first (Auto can be opted in) |
| `tickets_request_send` | After one named human click (even in Auto), record that the reviewed status note draft is approved in status_note-requests.csv. | one named click, even in Auto (`binding_send`) |
| `tickets_recall` | Search this agent's own memory of the customer's setup: accepted facts (in use) and facts waiting for a person. | runs |
| `tickets_learn` | Propose one fact about the customer's setup for this agent to remember. | runs |
| `tickets_accept_learning` | A named person accepts or rejects a fact waiting in this agent's memory. | one named click, even in Auto (`accept_learning`) |
| `tickets_retire_memory` | A named person stops an accepted fact from applying. | one named click, even in Auto (`accept_learning`) |
| `itsm_update_ticket` | Fairwire Ticket SLA never edits, assigns, closes or reprioritises a ticket. | refused |
| `itsm_notify_requester` | Fairwire Ticket SLA never messages requesters. | refused |

Any tool name not in this table is blocked, including names a model invents. `refused` tools are listed so a model can see they exist and are refused.

## Columns it reads

Table inputs can be CSV, TSV, semicolon- or pipe-separated text, Excel `.xlsx`, JSON or JSONL. Columns are matched by the agent's own name, then by the English names below, then by their names in German, French, Spanish, Portuguese, Italian, Japanese, Chinese and Korean. Dates become `YYYY-MM-DD`; amounts and counts are read with either decimal mark. Every result lists under `sources` how each file was read.

### Tickets (`tickets`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `ticket` (required) | text | Number, Ticket, Ticket ID, Issue key, ID, Incident | Ticketnummer, N° de ticket, チケット番号, 工单号 |
| `priority` | text | Priority, Urgency, Severity, Impact | Priorität, Priorité, 優先度, 优先级 |
| `opened_at` (required) | date and time | Opened, Created, opened_at, Created Date, Submitted | Erstellt am, Ouvert le, 起票日時, 创建时间 |
| `first_response_at` | date and time | First Response, First Responded, Responded At, First Reply | - |
| `resolved_at` | date and time | Resolved, Resolved At, Closed, Resolution Date, resolved_at | Gelöst am, Résolu le, 解決日時, 解决时间 |
| `state` | text | State, Status, Ticket Status, incident_state, Incident state | - |
| `team` | text | Assignment group, Team, Group, Queue, assignment_group | Team, Équipe, 担当チーム, 团队 |
| `assignee` | text | Assigned to, Assignee, Agent, Technician, Owner | - |
| `reopen_count` | number | Reopen Count, Reopened, Times Reopened | - |

Named exports recognised by their column names:

| System | Export | Recognised by | Layout checked against vendor docs |
|---|---|---|---|
| ServiceNow | Incident list exported to CSV | number, priority, opened_at, state, assignment_group | no |
| Jira Service Management | Issue search exported to CSV | Issue key, Priority, Created, Status | no |

Where a layout says "checked", its column names were compared with the vendor's documentation on that date. The other layouts were written from knowledge of the export and were not checked. None was tested against a live account.

### Files from other countries

A German export in Windows-1252 with semicolons, `1.234,56` and `03.11.2026`, or a Japanese one in Shift_JIS with `2026/11/03`, is read the same way as the English file. [`fixtures/intl/`](fixtures/intl) has both versions of the demo data, and the eval cases `intl-de-*` and `intl-ja-*` require the same results as the English case. Columns named differently? Run `npx fairwire-ticket-sla inspect <file>` (names and shapes only, never values) and name them in `fairwire-sources.json`:

```json
{ "files": { "exports/devices.csv": { "columns": { "host": "Gerätename" }, "date_order": "dmy" } } }
```

## Memory

fairwire-ticket-sla can remember facts about your setup so the next run does not have to be told again. `tickets_learn` only proposes a fact; it changes nothing until a named person accepts it with `tickets_accept_learning`, which is one click even in Auto. Facts live in one hash-chained file per agent under `.fairwire/memory/`; if the chain does not verify, no fact is used. Credentials, personal identifiers and text that reads like instructions to an AI are refused. Run without memory with `--no-memory`.

| Kind | What an accepted fact changes |
|---|---|
| `known_exception` | that finding is listed under "Accepted as known" instead of as open, until review_by (when given) has passed. |
| `note` | nothing (shown by recall only) |

```bash
fairwire-ticket-sla memory list
fairwire-ticket-sla memory accept MEM-1a2b3c4d5e6f --as "Your Name"
fairwire-ticket-sla memory retire MEM-1a2b3c4d5e6f --as "Your Name" --reason "rule removed"
```

## Install

Node 20 or newer. No other dependencies.

```bash
npx -y fairwire-ticket-sla demo
npx -y fairwire-ticket-sla mcp --root /path/to/your/files
```

Claude Desktop, Cursor and other MCP hosts:

```json
{
  "mcpServers": {
    "fairwire-ticket-sla": {
      "command": "npx",
      "args": [
        "-y",
        "fairwire-ticket-sla",
        "mcp",
        "--root",
        "/path/to/your/files"
      ]
    }
  }
}
```

Claude Code: `claude mcp add fairwire-ticket-sla -- npx -y fairwire-ticket-sla mcp --root .`, or install the `fairwire-ticket-sla` plugin from this repository's marketplace.

## Modes and approvals

- **Review** (`--mode review`): reads and reports only.
- **Assist** (default): the policy above. A tool that asks returns an `approval_id`; a person approves it once with `fairwire-ticket-sla approve <id> --as "Your Name"` (or on the local approvals page, `fairwire-ticket-sla approvals`), and the same call is repeated.
- **Auto** (`--mode auto --auto <tool,...>`): opt-in per tool, with step caps and a kill switch (`fairwire-ticket-sla kill`). Paying, sending, posting to a ledger or a live system and accepting a learned fact stay **one named click even in Auto**; an approval is tied to the sha256 of the reviewed draft, so a changed draft needs a new click.

## CLI

```bash
fairwire-ticket-sla tools                 # every tool, its policy and arguments
fairwire-ticket-sla sources               # the columns each input is read from
fairwire-ticket-sla inspect <file>        # how a file would be read (names and shapes, never values)
fairwire-ticket-sla call tickets_check '{"tickets":"<tickets>"}'
fairwire-ticket-sla eval                  # the private eval cases on the fictional fixtures
fairwire-ticket-sla demo
```

## Audit log and data

Every call is written to `.fairwire/audit.jsonl` under the root: hash-chained JSON lines, with arguments stored as a hash, signed with an Ed25519 key when you configure one. Everything runs on your machine on files you choose. No network calls, no telemetry, no credentials. The bundled fixtures are fictional.

<!-- generated:end -->

## Limits

- Reads only the files you export and give it. It does not log in to a firewall, switch, controller, cloud console, identity provider or any other live system.
- Targets are counted in calendar hours from the opened time; business hours, holidays and SLA pauses in your tool are not modelled, so your tool's own SLA flag wins where they differ.
- Thresholds are working defaults in a settings file you control; they are not a vendor rule, a requirement of any standard or a security guarantee.
- Results returned to the AI model have the names of people, sign-in names, e-mail addresses, phone numbers and client addresses masked. The files written here keep the real values: keep them in a secure folder.
- It changes nothing on a live device, firewall, DNS zone, directory or cloud account. Every change it suggests is a draft that one named person applies.
- Export layouts were written from knowledge of common exports and have not been tested on live customer accounts. Run `inspect` on a new export and name columns in `fairwire-sources.json` when they differ.

## License

MIT. Fictional data only in `fixtures/`.
