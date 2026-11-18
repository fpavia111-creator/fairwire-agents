# Fairwire Restore Tests

Restore test review: critical systems with no restore test inside your interval, failed tests not re-run, restores slower than the recovery time objective, restored data older than the recovery point, and tests with no sign-off. Writes a test calendar and drafts the next test plan.

Part of **Fairwire**, the IT and network family of [Mythos Machines](https://fair-agents.com) agents. The software is free (MIT); you pay a fixed price for the setup on your files. It reads files your IT team exports, on your own computer, and drafts notes. Every change to a live device, firewall, DNS zone, directory or cloud account stays one named person's click.

## What it checks

| Finding | What it means |
|---|---|
| `never_tested` | A critical system with no restore test on record. |
| `failed_not_retested` | The latest restore test of a system failed and has not been run again successfully. |
| `test_overdue` | The last restore test is older than the test interval for that system. |
| `rto_missed` | The last restore took longer than the recovery time objective (RTO). |
| `rpo_missed` | The restored data was older than the recovery point objective (RPO). |
| `no_sign_off` | The last restore test has no named person signing off the result. |

Findings come back worst first (high, medium, low). A finding a named person has reviewed can be accepted as known, with a reason and a date to look again; it then moves to "Accepted as known" instead of counting as open.

## Settings

Pass a settings file with `settings`. Every setting is optional; a misspelt setting is refused by name.

| Setting | What it does |
|---|---|
| `test_interval_days` | Days between restore tests when a system has none of its own (default 180) |
| `rto_minutes` | Recovery time objective when a system has none (default 240) |
| `rpo_hours` | Recovery point objective when a system has none (default 24) |

## What it never does

- `backup_restore_to_production` is refused: Fairwire Restore Tests never starts a restore, least of all over a live system.
- `calendar_send_invites` is refused: Fairwire Restore Tests never sends calendar invitations; it writes an .ics file a person imports.
- `restores_request_send` waits for one named person's click, even in Auto (`binding_send`).
- `restores_accept_learning` waits for one named person's click, even in Auto (`accept_learning`).
- `restores_retire_memory` waits for one named person's click, even in Auto (`accept_learning`).
- `backup_restore_to_production` waits for one named person's click, even in Auto (`production_deploy`).
- `calendar_send_invites` waits for one named person's click, even in Auto (`binding_send`).

<!-- generated:start -->

## A demo run

`npx -y fairwire-restore-tests demo` runs the agent on the fictional files in [`fixtures/`](fixtures) in a temporary folder. Captured output:

```text
Fairwire Restore Tests demo (fictional data) in a temporary folder, Auto on for the draft only

▶ Check the exported files
  status: executed  decision: allow
  7 restore test(s) for 5 system(s), 5 passed, 5 critical system(s) listed: 6 open finding(s), 2 high.
    high    failed_not_retested        FILE-01
    high    never_tested               ERP-01
    medium  rpo_missed                 MAIL-01
    medium  rto_missed                 SQL-01
    medium  test_overdue               MAIL-01
    low     no_sign_off                WEB-01

▶ Explain one finding
  status: executed  decision: allow
  medium rpo_missed: The last restore of MAIL-01 brought back data 30 hours old; the RPO is 24. Fix: Back up more often, or agree a longer RPO with the system owner.
medium test_overdue: MAIL-01 was last restore-tested successfully on 2026-03-01; the test was due by 2026-08-28. Fix: Schedule the next restore test.

▶ Write the worklist
  status: executed  decision: allow
  Restore tests written: 7 restore test(s) for 5 system(s), 5 passed, 5 critical system(s) listed: 6 open finding(s), 2 high.

▶ Draft the note for a person
  status: executed  decision: allow  (auto)
  test plan 2026-11-18 drafted with 1 open marker(s) ([TO CONFIRM system owners and the backup team]). Nothing was sent.

▶ Auto: approving it still waits for one named person
  status: needs_approval  decision: ask
  reason: binding_send stays one-click, even in Auto

▶ The agent tries to change the live system itself
  status: blocked  decision: block
  reason: Fairwire Restore Tests never starts a restore, least of all over a live system.
```

## Tools

| Tool | What it does | Policy |
|---|---|---|
| `restores_check` | Review the restore test log against your critical systems and list missing, failed, overdue, slow, stale and unsigned tests. | runs |
| `restores_explain` | Every finding for one system. | runs |
| `restores_write_report` | Write restore-tests.csv (one row per finding, with blank owner and decision columns) and restore-tests.html, plus restore-tests.ics (one reminder per date to act by) into out_dir (default fairwire-out/restores). | runs |
| `restores_draft_test_plan` | Write drafts/test_plan-<date>.md: the open findings at or above min_severity (default medium), each with what to do, addressed to system owners and the backup team. | asks first (Auto can be opted in) |
| `restores_request_send` | After one named human click (even in Auto), record that the reviewed test plan draft is approved in test_plan-requests.csv. | one named click, even in Auto (`binding_send`) |
| `restores_recall` | Search this agent's own memory of the customer's setup: accepted facts (in use) and facts waiting for a person. | runs |
| `restores_learn` | Propose one fact about the customer's setup for this agent to remember. | runs |
| `restores_accept_learning` | A named person accepts or rejects a fact waiting in this agent's memory. | one named click, even in Auto (`accept_learning`) |
| `restores_retire_memory` | A named person stops an accepted fact from applying. | one named click, even in Auto (`accept_learning`) |
| `backup_restore_to_production` | Fairwire Restore Tests never starts a restore, least of all over a live system. | refused |
| `calendar_send_invites` | Fairwire Restore Tests never sends calendar invitations; it writes an .ics file a person imports. | refused |

Any tool name not in this table is blocked, including names a model invents. `refused` tools are listed so a model can see they exist and are refused.

## Columns it reads

Table inputs can be CSV, TSV, semicolon- or pipe-separated text, Excel `.xlsx`, JSON or JSONL. Columns are matched by the agent's own name, then by the English names below, then by their names in German, French, Spanish, Portuguese, Italian, Japanese, Chinese and Korean. Dates become `YYYY-MM-DD`; amounts and counts are read with either decimal mark. Every result lists under `sources` how each file was read.

### Restore tests (`tests`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `test_id` (required) | text | Test ID, ID, Reference, Ticket | - |
| `system` (required) | text | System, Application, Server, VM, Service | Anwendung, Application, アプリケーション, 应用 |
| `tested_on` (required) | date | Tested On, Test Date, Date, Performed | - |
| `result` (required) | text | Result, Outcome, Status, Pass/Fail | - |
| `restore_minutes` | number | Restore Minutes, Restore Time (min), Duration (min), Time to Restore | - |
| `data_age_hours` | number | Data Age Hours, Restore Point Age (h), Data Loss (h), Recovery Point Age | - |
| `signed_off_by` | text | Signed Off By, Approved By, Verified By, Reviewer | - |

### Critical systems (`critical`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `system` (required) | text | System, Application, Server, Name | Anwendung, Application, アプリケーション, 应用 |
| `rto_minutes` | number | RTO, RTO Minutes, Recovery Time Objective | - |
| `rpo_hours` | number | RPO, RPO Hours, Recovery Point Objective | - |
| `test_interval_days` | number | Test Interval Days, Test Every (days), Interval | - |

### Files from other countries

A German export in Windows-1252 with semicolons, `1.234,56` and `03.11.2026`, or a Japanese one in Shift_JIS with `2026/11/03`, is read the same way as the English file. [`fixtures/intl/`](fixtures/intl) has both versions of the demo data, and the eval cases `intl-de-*` and `intl-ja-*` require the same results as the English case. Columns named differently? Run `npx fairwire-restore-tests inspect <file>` (names and shapes only, never values) and name them in `fairwire-sources.json`:

```json
{ "files": { "exports/devices.csv": { "columns": { "host": "Gerätename" }, "date_order": "dmy" } } }
```

## Memory

fairwire-restore-tests can remember facts about your setup so the next run does not have to be told again. `restores_learn` only proposes a fact; it changes nothing until a named person accepts it with `restores_accept_learning`, which is one click even in Auto. Facts live in one hash-chained file per agent under `.fairwire/memory/`; if the chain does not verify, no fact is used. Credentials, personal identifiers and text that reads like instructions to an AI are refused. Run without memory with `--no-memory`.

| Kind | What an accepted fact changes |
|---|---|
| `known_exception` | that finding is listed under "Accepted as known" instead of as open, until review_by (when given) has passed. |
| `note` | nothing (shown by recall only) |

```bash
fairwire-restore-tests memory list
fairwire-restore-tests memory accept MEM-1a2b3c4d5e6f --as "Your Name"
fairwire-restore-tests memory retire MEM-1a2b3c4d5e6f --as "Your Name" --reason "rule removed"
```

## Install

Node 20 or newer. No other dependencies.

```bash
npx -y fairwire-restore-tests demo
npx -y fairwire-restore-tests mcp --root /path/to/your/files
```

Claude Desktop, Cursor and other MCP hosts:

```json
{
  "mcpServers": {
    "fairwire-restore-tests": {
      "command": "npx",
      "args": [
        "-y",
        "fairwire-restore-tests",
        "mcp",
        "--root",
        "/path/to/your/files"
      ]
    }
  }
}
```

Claude Code: `claude mcp add fairwire-restore-tests -- npx -y fairwire-restore-tests mcp --root .`, or install the `fairwire-restore-tests` plugin from this repository's marketplace.

## Modes and approvals

- **Review** (`--mode review`): reads and reports only.
- **Assist** (default): the policy above. A tool that asks returns an `approval_id`; a person approves it once with `fairwire-restore-tests approve <id> --as "Your Name"` (or on the local approvals page, `fairwire-restore-tests approvals`), and the same call is repeated.
- **Auto** (`--mode auto --auto <tool,...>`): opt-in per tool, with step caps and a kill switch (`fairwire-restore-tests kill`). Paying, sending, posting to a ledger or a live system and accepting a learned fact stay **one named click even in Auto**; an approval is tied to the sha256 of the reviewed draft, so a changed draft needs a new click.

## CLI

```bash
fairwire-restore-tests tools                 # every tool, its policy and arguments
fairwire-restore-tests sources               # the columns each input is read from
fairwire-restore-tests inspect <file>        # how a file would be read (names and shapes, never values)
fairwire-restore-tests call restores_check '{"tests":"<tests>"}'
fairwire-restore-tests eval                  # the private eval cases on the fictional fixtures
fairwire-restore-tests demo
```

## Audit log and data

Every call is written to `.fairwire/audit.jsonl` under the root: hash-chained JSON lines, with arguments stored as a hash, signed with an Ed25519 key when you configure one. Everything runs on your machine on files you choose. No network calls, no telemetry, no credentials. The bundled fixtures are fictional.

<!-- generated:end -->

## Limits

- Reads only the files you export and give it. It does not log in to a firewall, switch, controller, cloud console, identity provider or any other live system.
- A restore test is only as good as what was checked afterwards; the log should say who confirmed the data was usable.
- Thresholds are working defaults in a settings file you control; they are not a vendor rule, a requirement of any standard or a security guarantee.
- Results returned to the AI model have the names of people, sign-in names, e-mail addresses, phone numbers and client addresses masked. The files written here keep the real values: keep them in a secure folder.
- Export layouts were written from knowledge of common exports and have not been tested on live customer accounts. Run `inspect` on a new export and name columns in `fairwire-sources.json` when they differ.

## Licence

MIT. Fictional data only in `fixtures/`.
