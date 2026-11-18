# Fairwire Telecom Bills

Telecom bill review: mobile lines with no use for months, lines still billed for people who left, roaming and premium charges, plans much bigger than the use, two lines for one person and fixed lines nobody calls from. Phone numbers masked for the model. Drafts cancellation lists; never cancels a line.

Part of **Fairwire**, the IT and network family of [Mythos Machines](https://fair-agents.com) agents. The software is free (MIT); you pay a fixed price for the setup on your files. It reads files your IT team exports, on your own computer, and drafts notes. Every change to a live device, firewall, DNS zone, directory or cloud account stays one named person's click.

## What it checks

| Finding | What it means |
|---|---|
| `line_of_leaver` | A line still billed for someone who has left. |
| `unused_line` | A line with no calls and no data in each of the last months you set (still billed). |
| `roaming_spike` | Roaming charges on a line above your limit in the latest month. |
| `premium_charges` | Premium-rate or third-party charges on a line (often subscriptions nobody asked for). |
| `oversized_plan` | A line using a small share of its data allowance month after month (a smaller plan would do). |
| `two_lines_one_user` | One person with two or more active mobile lines. |

Findings come back worst first (high, medium, low). A finding a named person has reviewed can be accepted as known, with a reason and a date to look again; it then moves to "Accepted as known" instead of counting as open.

## Settings

Pass a settings file with `settings`. Every setting is optional; a misspelt setting is refused by name.

| Setting | What it does |
|---|---|
| `unused_months` | Months in a row with no use before a line is flagged (default 2) |
| `roaming_max` | Roaming charges in one month above which a line is flagged (default 50) |
| `plan_use_pct` | Share of the data allowance under which a plan counts as oversized, every month (default 20) |

## What it never does

- `carrier_cancel_line` is refused: Fairwire Telecom Bills never cancels, suspends or changes a line with the carrier.
- `carrier_dispute_charge` is refused: Fairwire Telecom Bills never files a dispute with the carrier; a person sends the reviewed list.
- `telecom_request_send` waits for one named person's click, even in Auto (`binding_send`).
- `telecom_accept_learning` waits for one named person's click, even in Auto (`accept_learning`).
- `telecom_retire_memory` waits for one named person's click, even in Auto (`accept_learning`).
- `carrier_cancel_line` waits for one named person's click, even in Auto (`production_deploy`).
- `carrier_dispute_charge` waits for one named person's click, even in Auto (`binding_send`).

<!-- generated:start -->

## A demo run

`npx -y fairwire-telecom-bills demo` runs the agent on the fictional files in [`fixtures/`](fixtures) in a temporary folder. Captured output:

```text
Fairwire Telecom Bills demo (fictional data) in a temporary folder, Auto on for the draft only

▶ Check the exported files
  status: executed  decision: allow
  2026-10: 8 line(s) billed 562.49, roaming 267.5: 7 open finding(s), 1 high.
    high    line_of_leaver             PERSON-7101624a
    medium  roaming_spike              PERSON-d0bec31c
    medium  unused_line                PERSON-a203c0f9
    medium  unused_line                PERSON-3edeb565
    low     oversized_plan             PERSON-9a2be67b
    low     premium_charges            PERSON-be9a9b63
    low     two_lines_one_user         PERSON-59dd52e6

▶ Explain one finding
  status: executed  decision: allow
  medium roaming_spike: Line +TEL-d11473b6 (PERSON-d0bec31c) ran up 267.5 in roaming in 2026-10. Fix: Add a travel pass before trips, or cap roaming on the line.

▶ Write the worklist
  status: executed  decision: allow
  Telecom bill review written: 2026-10: 8 line(s) billed 562.49, roaming 267.5: 7 open finding(s), 1 high.

▶ Draft the note for a person
  status: executed  decision: allow  (auto)
  cancellation list 2026-11-18 drafted with 1 open marker(s) ([TO CONFIRM telecom administrator]). Nothing was sent.

▶ Auto: approving it still waits for one named person
  status: needs_approval  decision: ask
  reason: binding_send stays one-click, even in Auto

▶ The agent tries to change the live system itself
  status: blocked  decision: block
  reason: Fairwire Telecom Bills never cancels, suspends or changes a line with the carrier.
```

## Tools

| Tool | What it does | Policy |
|---|---|---|
| `telecom_check` | Review the latest month of line charges against earlier months and list leavers' lines, unused lines, roaming, premium charges, oversized plans and duplicate lines. | runs |
| `telecom_explain` | Every finding for one line. | runs |
| `telecom_write_report` | Write telecom-bills.csv (one row per finding, with blank owner and decision columns) and telecom-bills.html into out_dir (default fairwire-out/telecom). | runs |
| `telecom_draft_cancellation_list` | Write drafts/cancellation_list-<date>.md: the open findings at or above min_severity (default medium), each with what to do, addressed to telecom administrator. | asks first (Auto can be opted in) |
| `telecom_request_send` | After one named human click (even in Auto), record that the reviewed cancellation list draft is approved in cancellation_list-requests.csv. | one named click, even in Auto (`binding_send`) |
| `telecom_recall` | Search this agent's own memory of the customer's setup: accepted facts (in use) and facts waiting for a person. | runs |
| `telecom_learn` | Propose one fact about the customer's setup for this agent to remember. | runs |
| `telecom_accept_learning` | A named person accepts or rejects a fact waiting in this agent's memory. | one named click, even in Auto (`accept_learning`) |
| `telecom_retire_memory` | A named person stops an accepted fact from applying. | one named click, even in Auto (`accept_learning`) |
| `carrier_cancel_line` | Fairwire Telecom Bills never cancels, suspends or changes a line with the carrier. | refused |
| `carrier_dispute_charge` | Fairwire Telecom Bills never files a dispute with the carrier; a person sends the reviewed list. | refused |

Any tool name not in this table is blocked, including names a model invents. `refused` tools are listed so a model can see they exist and are refused.

## Columns it reads

Table inputs can be CSV, TSV, semicolon- or pipe-separated text, Excel `.xlsx`, JSON or JSONL. Columns are matched by the agent's own name, then by the English names below, then by their names in German, French, Spanish, Portuguese, Italian, Japanese, Chinese and Korean. Dates become `YYYY-MM-DD`; amounts and counts are read with either decimal mark. Every result lists under `sources` how each file was read.

### Telecom lines by month (`lines`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `line_number` (required) | text | Line Number, Phone Number, Mobile Number, MSISDN, Number, Wireless Number | Rufnummer, Numéro de ligne, 回線番号, 号码 |
| `month` (required) | date | Month, Bill Period, Billing Period, Invoice Date, Bill Date | - |
| `user` | text | User, User Name, Employee, Assigned To, Subscriber | Benutzer, Utilisateur, ユーザー, 用户 |
| `line_type` | text | Line Type, Type, Service Type, Device Type | - |
| `plan` | text | Plan, Rate Plan, Tariff, Price Plan | Tarif, Forfait, 料金プラン, 套餐 |
| `monthly_charge` | amount | Monthly Charge, Total Charges, Total, Amount, Line Total | Betrag, Montant, 金額, 金额 |
| `data_gb` | number | Data (GB), Data Used (GB), Data GB, Data Usage | Daten (GB), Données (Go), データ通信量（GB）, 流量（GB） |
| `data_allowance_gb` | number | Data Allowance (GB), Allowance GB, Plan Data (GB), Included Data | - |
| `minutes` | number | Minutes, Voice Minutes, Minutes Used, Call Minutes | Minuten, Minutes, 通話分数, 分钟数 |
| `roaming_charge` | amount | Roaming, Roaming Charges, International Roaming, Roaming Amount | - |
| `premium_charge` | amount | Premium, Premium Charges, Third Party Charges, Purchases, Content Charges | - |

### Leavers (`leavers`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `user` (required) | text | User, Employee, Name, User Name | Benutzer, Utilisateur, ユーザー, 用户 |
| `end_date` (required) | date | End Date, Last Day, Termination Date, Leaving Date | Austrittsdatum, Date de sortie, 退職日, 离职日期 |

### Files from other countries

A German export in Windows-1252 with semicolons, `1.234,56` and `03.11.2026`, or a Japanese one in Shift_JIS with `2026/11/03`, is read the same way as the English file. [`fixtures/intl/`](fixtures/intl) has both versions of the demo data, and the eval cases `intl-de-*` and `intl-ja-*` require the same results as the English case. Columns named differently? Run `npx fairwire-telecom-bills inspect <file>` (names and shapes only, never values) and name them in `fairwire-sources.json`:

```json
{ "files": { "exports/devices.csv": { "columns": { "host": "Gerätename" }, "date_order": "dmy" } } }
```

## Memory

fairwire-telecom-bills can remember facts about your setup so the next run does not have to be told again. `telecom_learn` only proposes a fact; it changes nothing until a named person accepts it with `telecom_accept_learning`, which is one click even in Auto. Facts live in one hash-chained file per agent under `.fairwire/memory/`; if the chain does not verify, no fact is used. Credentials, personal identifiers and text that reads like instructions to an AI are refused. Run without memory with `--no-memory`.

| Kind | What an accepted fact changes |
|---|---|
| `known_exception` | that finding is listed under "Accepted as known" instead of as open, until review_by (when given) has passed. |
| `note` | nothing (shown by recall only) |

```bash
fairwire-telecom-bills memory list
fairwire-telecom-bills memory accept MEM-1a2b3c4d5e6f --as "Your Name"
fairwire-telecom-bills memory retire MEM-1a2b3c4d5e6f --as "Your Name" --reason "rule removed"
```

## Install

Node 20 or newer. No other dependencies.

```bash
npx -y fairwire-telecom-bills demo
npx -y fairwire-telecom-bills mcp --root /path/to/your/files
```

Claude Desktop, Cursor and other MCP hosts:

```json
{
  "mcpServers": {
    "fairwire-telecom-bills": {
      "command": "npx",
      "args": [
        "-y",
        "fairwire-telecom-bills",
        "mcp",
        "--root",
        "/path/to/your/files"
      ]
    }
  }
}
```

Claude Code: `claude mcp add fairwire-telecom-bills -- npx -y fairwire-telecom-bills mcp --root .`, or install the `fairwire-telecom-bills` plugin from this repository's marketplace.

## Modes and approvals

- **Review** (`--mode review`): reads and reports only.
- **Assist** (default): the policy above. A tool that asks returns an `approval_id`; a person approves it once with `fairwire-telecom-bills approve <id> --as "Your Name"` (or on the local approvals page, `fairwire-telecom-bills approvals`), and the same call is repeated.
- **Auto** (`--mode auto --auto <tool,...>`): opt-in per tool, with step caps and a kill switch (`fairwire-telecom-bills kill`). Paying, sending, posting to a ledger or a live system and accepting a learned fact stay **one named click even in Auto**; an approval is tied to the sha256 of the reviewed draft, so a changed draft needs a new click.

## CLI

```bash
fairwire-telecom-bills tools                 # every tool, its policy and arguments
fairwire-telecom-bills sources               # the columns each input is read from
fairwire-telecom-bills inspect <file>        # how a file would be read (names and shapes, never values)
fairwire-telecom-bills call telecom_check '{"lines":"<lines>"}'
fairwire-telecom-bills eval                  # the private eval cases on the fictional fixtures
fairwire-telecom-bills demo
```

## Audit log and data

Every call is written to `.fairwire/audit.jsonl` under the root: hash-chained JSON lines, with arguments stored as a hash, signed with an Ed25519 key when you configure one. Everything runs on your machine on files you choose. No network calls, no telemetry, no credentials. The bundled fixtures are fictional.

<!-- generated:end -->

## Limits

- Reads only the files you export and give it. It does not log in to a firewall, switch, controller, cloud console, identity provider or any other live system.
- Use and charges are the carrier's figures; a line with no use may be a backup or alarm line on purpose.
- Thresholds are working defaults in a settings file you control; they are not a vendor rule, a requirement of any standard or a security guarantee.
- Results returned to the AI model have the names of people, sign-in names, e-mail addresses, phone numbers and client addresses masked. The files written here keep the real values: keep them in a secure folder.
- Totals are arithmetic on the numbers in your files, not forecasts or quotes.
- Export layouts were written from knowledge of common exports and have not been tested on live customer accounts. Run `inspect` on a new export and name columns in `fairwire-sources.json` when they differ.

## Licence

MIT. Fictional data only in `fixtures/`.
