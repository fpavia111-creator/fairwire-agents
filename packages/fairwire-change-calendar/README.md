# Fairwire Change Calendar

Change calendar review: changes on the same system that overlap, changes inside a freeze window, changes with no approval, back-out plan or test evidence, risky changes in business hours, emergency changes above your share and systems whose changes fail again and again. Drafts notes for the change board.

Part of **Fairwire**, the IT and network family of [Fair Agents](https://fair-agents.com) agents. The software is free (MIT); you pay a fixed price for the setup on your files. It reads files your IT team exports, on your own computer, and drafts notes. Every change to a live device, firewall, DNS zone, directory or cloud account stays one named person's click.

## What it checks

| Finding | What it means |
|---|---|
| `in_freeze_window` | A change scheduled inside a change freeze (medium for emergency changes). |
| `not_approved` | A normal or emergency change with no approval recorded. |
| `overlapping_changes` | Two changes to the same system whose windows overlap (high when both are high risk). |
| `no_backout_plan` | A normal or emergency change with no back-out plan. |
| `risky_in_business_hours` | A high-risk change scheduled to start in business hours on a working day. |
| `repeat_failed_changes` | A system whose changes failed or were rolled back several times. |
| `no_test_evidence` | A normal change with no test evidence recorded. |
| `emergency_share` | Emergency changes are a larger share of all changes than your limit (planning is being skipped). |

Findings come back worst first (high, medium, low). A finding a named person has reviewed can be accepted as known, with a reason and a date to look again; it then moves to "Accepted as known" instead of counting as open.

## Settings

Pass a settings file with `settings`. Every setting is optional; a misspelt setting is refused by name.

| Setting | What it does |
|---|---|
| `business_hours` | First and last hour of business, e.g. [8, 18] (default) |
| `emergency_share_pct` | Share of emergency changes above which it is flagged (default 15) |
| `failed_min` | Failed or rolled-back changes on one system before it is flagged (default 2) |
| `max_window_hours` | A planned window longer than this is a planning range, not an implementation window: it is counted (long_windows) but not compared for overlaps (default 72) |

## What it never does

- `itsm_approve_change` is refused: Fairwire Change Calendar never approves, schedules or cancels a change.
- `deploy_run_pipeline` is refused: Fairwire Change Calendar never runs a deployment.
- `changes_request_send` waits for one named person's click, even in Auto (`binding_send`).
- `changes_accept_learning` waits for one named person's click, even in Auto (`accept_learning`).
- `changes_retire_memory` waits for one named person's click, even in Auto (`accept_learning`).
- `itsm_approve_change` waits for one named person's click, even in Auto (`production_deploy`).
- `deploy_run_pipeline` waits for one named person's click, even in Auto (`production_deploy`).

<!-- generated:start -->

## A demo run

`npx -y fairwire-change-calendar demo` runs the agent on the fictional files in [`fixtures/`](fixtures) in a temporary folder. Captured output:

```text
Fairwire Change Calendar demo (fictional data) in a temporary folder, Auto on for the draft only

▶ Check the exported files
  status: executed  decision: allow
  8 change(s) on 5 system(s), 1 emergency, 2 failed, 1 freeze window(s): 8 open finding(s), 3 high.
    high    in_freeze_window           Web shop
    high    not_approved               Web shop
    high    overlapping_changes        ERP
    medium  no_backout_plan            Firewall
    medium  repeat_failed_changes      Web shop
    medium  risky_in_business_hours    Web shop
    low     emergency_share            all systems
    low     no_test_evidence           Web shop

▶ Explain one finding
  status: executed  decision: allow
  high in_freeze_window: CHG-6003 on Web shop (2026-11-27 10:00:00) falls inside the freeze window "Black Friday freeze". Fix: Move it after the freeze, or get the freeze owner's written exception.
high not_approved: Change CHG-6003 on Web shop has no approval recorded. Fix: Get the approval before the window, or postpone the change.
medium repeat_failed_changes: 2 changes on Web shop failed or were rolled back (CHG-5990, CHG-5995). Fix: Review how changes to this system are tested before the next one.
medium risky_in_business_hours: High-risk change CHG-6003 on Web shop starts at 2026-11-27 10:00:00, during business hours. Fix: Move it to a quiet window unless the business has agreed.
low no_test_evidence: CHG-6003 on Web shop has no test evidence. Fix: Attach what was tested and where.

▶ Write the worklist
  status: executed  decision: allow
  Change calendar review written: 8 change(s) on 5 system(s), 1 emergency, 2 failed, 1 freeze window(s): 8 open finding(s), 3 high.

▶ Draft the note for a person
  status: executed  decision: allow  (auto)
  cab note 2026-11-18 drafted with 1 open marker(s) ([TO CONFIRM change advisory board]). Nothing was sent.

▶ Auto: approving it still waits for one named person
  status: needs_approval  decision: ask
  reason: binding_send stays one-click, even in Auto

▶ The agent tries to change the live system itself
  status: blocked  decision: block
  reason: Fairwire Change Calendar never approves, schedules or cancels a change.
```

## Tools

| Tool | What it does | Policy |
|---|---|---|
| `changes_check` | Review planned and past changes and list freeze clashes, missing approvals, overlaps, missing back-out plans and tests, risky timing, repeat failures and emergency share. | runs |
| `changes_explain` | Every finding for one change or system. | runs |
| `changes_write_report` | Write change-calendar.csv (one row per finding, with blank owner and decision columns) and change-calendar.html into out_dir (default fairwire-out/changes). | runs |
| `changes_draft_cab_note` | Write drafts/cab_note-<date>.md: the open findings at or above min_severity (default medium), each with what to do, addressed to change advisory board. | asks first (Auto can be opted in) |
| `changes_request_send` | After one named human click (even in Auto), record that the reviewed cab note draft is approved in cab_note-requests.csv. | one named click, even in Auto (`binding_send`) |
| `changes_recall` | Search this agent's own memory of the customer's setup: accepted facts (in use) and facts waiting for a person. | runs |
| `changes_learn` | Propose one fact about the customer's setup for this agent to remember. | runs |
| `changes_accept_learning` | A named person accepts or rejects a fact waiting in this agent's memory. | one named click, even in Auto (`accept_learning`) |
| `changes_retire_memory` | A named person stops an accepted fact from applying. | one named click, even in Auto (`accept_learning`) |
| `itsm_approve_change` | Fairwire Change Calendar never approves, schedules or cancels a change. | refused |
| `deploy_run_pipeline` | Fairwire Change Calendar never runs a deployment. | refused |

Any tool name not in this table is blocked, including names a model invents. `refused` tools are listed so a model can see they exist and are refused.

## Columns it reads

Table inputs can be CSV, TSV, semicolon- or pipe-separated text, Excel `.xlsx`, JSON or JSONL. Columns are matched by the agent's own name, then by the English names below, then by their names in German, French, Spanish, Portuguese, Italian, Japanese, Chinese and Korean. Dates become `YYYY-MM-DD`; amounts and counts are read with either decimal mark. Every result lists under `sources` how each file was read.

### Changes (`changes`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `change_id` (required) | text | Change, Change ID, Number, ID, Key | - |
| `system` (required) | text | System, Configuration Item, CI, CI Name, CI Name (aff), Affected CI | Anwendung, Application, アプリケーション, 应用 |
| `title` | text | Title, Short Description, Summary, Description | Produkt, Produit, 製品, 产品 |
| `start` (required) | date and time | Planned Start, Start, Start Date, Scheduled Start, Window Start | Startzeit, Heure de début, 開始日時, 开始时间 |
| `end` | date and time | Planned End, End, End Date, Scheduled End, Window End | Endzeit, Heure de fin, 終了日時, 结束时间 |
| `risk` | text | Risk, Risk Level, Risk Assessment, Impact | - |
| `type` | text | Type, Change Type, Category | Typ, Type, 種類, 类型 |
| `emergency` | text | Emergency Change, Emergency, Is Emergency | - |
| `approval` | text | Approval, Approved, Approval Status, CAB Approval | - |
| `backout_plan` | text | Backout Plan, Back-out Plan, Rollback Plan, Backout | - |
| `test_evidence` | text | Test Evidence, Test Plan, Tested, Testing | - |
| `outcome` | text | Outcome, Close Code, Result, Implementation Result | - |
| `requester` | text | Requested By, Requester, Owner, Assigned To | - |

### Change freezes (`freezes`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `name` (required) | text | Name, Freeze, Blackout, Reason | Name, Nom, 名前, 名称 |
| `start` (required) | date and time | Start, From, Start Date | Startzeit, Heure de début, 開始日時, 开始时间 |
| `end` (required) | date and time | End, To, End Date | Endzeit, Heure de fin, 終了日時, 结束时间 |

### Files from other countries

A German export in Windows-1252 with semicolons, `1.234,56` and `03.11.2026`, or a Japanese one in Shift_JIS with `2026/11/03`, is read the same way as the English file. [`fixtures/intl/`](fixtures/intl) has both versions of the demo data, and the eval cases `intl-de-*` and `intl-ja-*` require the same results as the English case. Columns named differently? Run `npx fairwire-change-calendar inspect <file>` (names and shapes only, never values) and name them in `fairwire-sources.json`:

```json
{ "files": { "exports/devices.csv": { "columns": { "host": "Gerätename" }, "date_order": "dmy" } } }
```

## Memory

fairwire-change-calendar can remember facts about your setup so the next run does not have to be told again. `changes_learn` only proposes a fact; it changes nothing until a named person accepts it with `changes_accept_learning`, which is one click even in Auto. Facts live in one hash-chained file per agent under `.fairwire/memory/`; if the chain does not verify, no fact is used. Credentials, personal identifiers and text that reads like instructions to an AI are refused. Run without memory with `--no-memory`.

| Kind | What an accepted fact changes |
|---|---|
| `known_exception` | that finding is listed under "Accepted as known" instead of as open, until review_by (when given) has passed. |
| `note` | nothing (shown by recall only) |

```bash
fairwire-change-calendar memory list
fairwire-change-calendar memory accept MEM-1a2b3c4d5e6f --as "Your Name"
fairwire-change-calendar memory retire MEM-1a2b3c4d5e6f --as "Your Name" --reason "rule removed"
```

## Install

Node 20 or newer. No other dependencies.

```bash
npx -y fairwire-change-calendar demo
npx -y fairwire-change-calendar mcp --root /path/to/your/files
```

Claude Desktop, Cursor and other MCP hosts:

```json
{
  "mcpServers": {
    "fairwire-change-calendar": {
      "command": "npx",
      "args": [
        "-y",
        "fairwire-change-calendar",
        "mcp",
        "--root",
        "/path/to/your/files"
      ]
    }
  }
}
```

Claude Code: `claude mcp add fairwire-change-calendar -- npx -y fairwire-change-calendar mcp --root .`, or install the `fairwire-change-calendar` plugin from this repository's marketplace.

## Modes and approvals

- **Review** (`--mode review`): reads and reports only.
- **Assist** (default): the policy above. A tool that asks returns an `approval_id`; a person approves it once with `fairwire-change-calendar approve <id> --as "Your Name"` (or on the local approvals page, `fairwire-change-calendar approvals`), and the same call is repeated.
- **Auto** (`--mode auto --auto <tool,...>`): opt-in per tool, with step caps and a kill switch (`fairwire-change-calendar kill`). Paying, sending, posting to a ledger or a live system and accepting a learned fact stay **one named click even in Auto**; an approval is tied to the sha256 of the reviewed draft, so a changed draft needs a new click.

## CLI

```bash
fairwire-change-calendar tools                 # every tool, its policy and arguments
fairwire-change-calendar sources               # the columns each input is read from
fairwire-change-calendar inspect <file>        # how a file would be read (names and shapes, never values)
fairwire-change-calendar call changes_check '{"changes":"<changes>"}'
fairwire-change-calendar eval                  # the private eval cases on the fictional fixtures
fairwire-change-calendar demo
```

## Audit log and data

Every call is written to `.fairwire/audit.jsonl` under the root: hash-chained JSON lines, with arguments stored as a hash, signed with an Ed25519 key when you configure one. Everything runs on your machine on files you choose. No network calls, no telemetry, no credentials. The bundled fixtures are fictional.

<!-- generated:end -->

## Limits

- Reads only the files you export and give it. It does not log in to a firewall, switch, controller, cloud console, identity provider or any other live system.
- Business hours use the times as written in the export, in one time zone; changes across time zones need a setting per site.
- A recorded approval is taken at face value; this does not check who approved or whether they could.
- Thresholds are working defaults in a settings file you control; they are not a vendor rule, a requirement of any standard or a security guarantee.
- It changes nothing on a live device, firewall, DNS zone, directory or cloud account. Every change it suggests is a draft that one named person applies.
- Export layouts were written from knowledge of common exports and have not been tested on live customer accounts. Run `inspect` on a new export and name columns in `fairwire-sources.json` when they differ.

## License

MIT. Fictional data only in `fixtures/`.
