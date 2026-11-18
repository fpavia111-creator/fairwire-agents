# Fairwire Contract Renewals

IT contracts and renewals: notice deadlines for auto-renewing contracts, price rises above your cap, contracts with no owner, two contracts for the same service, vendors paid with no contract on file and spend above the contract value. Writes a renewal calendar and drafts notice letters for a person to send.

Part of **Fairwire**, the IT and network family of [Mythos Machines](https://fair-agents.com) agents. The software is free (MIT); you pay a fixed price for the setup on your files. It reads files your IT team exports, on your own computer, and drafts notes. Every change to a live device, firewall, DNS zone, directory or cloud account stays one named person's click.

## What it checks

| Finding | What it means |
|---|---|
| `notice_deadline` | An auto-renewing contract whose notice deadline (end date minus notice period) falls inside your look-ahead window. |
| `expired_still_paid` | Payments to a vendor after its contract ended. |
| `notice_missed` | The notice deadline has passed, so the contract will renew unless the vendor agrees otherwise. |
| `uplift_above_cap` | A renewal price rise above your cap. |
| `spend_over_contract` | Payments to a vendor in the last 12 months above the contract value by more than your margin. |
| `spend_without_contract` | A vendor paid in the last 12 months with no contract on file. |
| `overlapping_contracts` | Two contracts for the same service running at the same time. |
| `no_owner` | A contract with no owner, so nobody decides about its renewal. |

Findings come back worst first (high, medium, low). A finding a named person has reviewed can be accepted as known, with a reason and a date to look again; it then moves to "Accepted as known" instead of counting as open.

## Settings

Pass a settings file with `settings`. Every setting is optional; a misspelt setting is refused by name.

| Setting | What it does |
|---|---|
| `lookahead_days` | Days ahead to look for notice deadlines (default 60) |
| `urgent_days` | Notice deadlines this close are high (default 14) |
| `uplift_cap_pct` | Largest renewal price rise you accept, in percent (default 5) |
| `spend_margin_pct` | Margin over the contract value before spend is flagged, in percent (default 10) |

## What it never does

- `vendor_send_notice` is refused: Fairwire Contract Renewals never sends a notice or signs a renewal; the contract owner sends the reviewed letter.
- `ap_hold_payment` is refused: Fairwire Contract Renewals never stops, holds or makes a payment.
- `renewals_request_send` waits for one named person's click, even in Auto (`binding_send`).
- `renewals_accept_learning` waits for one named person's click, even in Auto (`accept_learning`).
- `renewals_retire_memory` waits for one named person's click, even in Auto (`accept_learning`).
- `vendor_send_notice` waits for one named person's click, even in Auto (`binding_send`).
- `ap_hold_payment` waits for one named person's click, even in Auto (`move_money`).

<!-- generated:start -->

## A demo run

`npx -y fairwire-contract-renewals demo` runs the agent on the fictional files in [`fixtures/`](fixtures) in a temporary folder. Captured output:

```text
Fairwire Contract Renewals demo (fictional data) in a temporary folder, Auto on for the draft only

▶ Check the exported files
  status: executed  decision: allow
  6 contract(s), 5 active worth 64000 a year, 4 auto-renewing: 10 open finding(s), 4 high.
    high    expired_still_paid         Old Phone Co
    high    notice_deadline            Example Backup Inc.
    high    notice_deadline            Northwind Monitoring Ltd
    high    notice_deadline            Contoso Helpdesk
    medium  notice_missed              Tailspin Endpoint
    medium  overlapping_contracts      Fabrikam Security
    medium  spend_over_contract        Contoso Helpdesk
    medium  spend_without_contract     Litware Cloud Storage
    medium  uplift_above_cap           Northwind Monitoring Ltd
    low     no_owner                   Contoso Helpdesk

▶ Explain one finding
  status: executed  decision: allow
  high notice_deadline: Northwind Monitoring Ltd contract CT-102 (Network monitoring) renews on 2027-01-31 unless notice is given by 2026-12-02 (14 days). Fix: Decide now whether to renew, renegotiate or cancel; send any notice in writing before the deadline.
medium uplift_above_cap: Northwind Monitoring Ltd contract CT-102 rises 9% at renewal, above your cap of 5%. Fix: Negotiate the rise before the notice deadline, with usage figures in hand.

▶ Write the worklist
  status: executed  decision: allow
  IT contracts and renewals written: 6 contract(s), 5 active worth 64000 a year, 4 auto-renewing: 10 open finding(s), 4 high.

▶ Draft the note for a person
  status: executed  decision: allow  (auto)
  notice letter 2026-11-18 drafted with 1 open marker(s) ([TO CONFIRM each vendor's contract contact]). Nothing was sent.

▶ Auto: approving it still waits for one named person
  status: needs_approval  decision: ask
  reason: binding_send stays one-click, even in Auto

▶ The agent tries to change the live system itself
  status: blocked  decision: block
  reason: Fairwire Contract Renewals never sends a notice or signs a renewal; the contract owner sends the reviewed letter.
```

## Tools

| Tool | What it does | Policy |
|---|---|---|
| `renewals_check` | Review the contract register and payments and list notice deadlines, missed notices, uplifts, owners, overlaps and spend problems. | runs |
| `renewals_explain` | Every finding for one vendor or contract. | runs |
| `renewals_write_report` | Write contract-renewals.csv (one row per finding, with blank owner and decision columns) and contract-renewals.html, plus contract-renewals.ics (one reminder per date to act by) into out_dir (default fairwire-out/rene… | runs |
| `renewals_draft_notice_letter` | Write drafts/notice_letter-<date>.md: the open findings at or above min_severity (default medium), each with what to do, addressed to each vendor's contract contact. | asks first (Auto can be opted in) |
| `renewals_request_send` | After one named human click (even in Auto), record that the reviewed notice letter draft is approved in notice_letter-requests.csv. | one named click, even in Auto (`binding_send`) |
| `renewals_recall` | Search this agent's own memory of the customer's setup: accepted facts (in use) and facts waiting for a person. | runs |
| `renewals_learn` | Propose one fact about the customer's setup for this agent to remember. | runs |
| `renewals_accept_learning` | A named person accepts or rejects a fact waiting in this agent's memory. | one named click, even in Auto (`accept_learning`) |
| `renewals_retire_memory` | A named person stops an accepted fact from applying. | one named click, even in Auto (`accept_learning`) |
| `vendor_send_notice` | Fairwire Contract Renewals never sends a notice or signs a renewal; the contract owner sends the reviewed letter. | refused |
| `ap_hold_payment` | Fairwire Contract Renewals never stops, holds or makes a payment. | refused |

Any tool name not in this table is blocked, including names a model invents. `refused` tools are listed so a model can see they exist and are refused.

## Columns it reads

Table inputs can be CSV, TSV, semicolon- or pipe-separated text, Excel `.xlsx`, JSON or JSONL. Columns are matched by the agent's own name, then by the English names below, then by their names in German, French, Spanish, Portuguese, Italian, Japanese, Chinese and Korean. Dates become `YYYY-MM-DD`; amounts and counts are read with either decimal mark. Every result lists under `sources` how each file was read.

### Contracts (`contracts`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `contract_id` (required) | text | Contract ID, Contract, ID, Agreement, Reference | - |
| `vendor` (required) | text | Vendor, Supplier, Provider, Company | Lieferant, Fournisseur, 仕入先, 供应商 |
| `service` | text | Service, Product, Description, Category, Subject | Service, Service, サービス, 服务 |
| `owner` | text | Owner, Contract Owner, Business Owner, Responsible | Verantwortlich, Responsable, 担当者, 负责人 |
| `start_date` | date | Start Date, Start, Effective Date, Commencement | Eintrittsdatum, Date d'entrée, 入社日, 入职日期 |
| `end_date` (required) | date | End Date, End, Expiry, Renewal Date, Term End | Austrittsdatum, Date de sortie, 退職日, 离职日期 |
| `auto_renew` | text | Auto Renew, Auto-renewal, Evergreen, Renews Automatically | Automatische Verlängerung, Renouvellement automatique, 自動更新, 自动续费 |
| `notice_days` | number | Notice Days, Notice Period (days), Notice Period, Cancellation Notice | Kündigungsfrist (Tage), Préavis (jours), 解約予告期間（日）, 通知期（天） |
| `annual_value` | amount | Annual Value, Annual Cost, Contract Value, Yearly Amount | - |
| `uplift_pct` | number | Uplift %, Price Increase %, Renewal Uplift, Escalation % | - |

### Vendor payments (`spend`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `vendor` (required) | text | Vendor, Supplier, Payee, Vendor Name | Lieferant, Fournisseur, 仕入先, 供应商 |
| `amount` (required) | amount | Amount, Paid, Payment Amount, Total | Betrag, Montant, 金額, 金额 |
| `date` (required) | date | Date, Payment Date, Paid On, Invoice Date | Datum, Date, 日付, 日期 |

### Files from other countries

A German export in Windows-1252 with semicolons, `1.234,56` and `03.11.2026`, or a Japanese one in Shift_JIS with `2026/11/03`, is read the same way as the English file. [`fixtures/intl/`](fixtures/intl) has both versions of the demo data, and the eval cases `intl-de-*` and `intl-ja-*` require the same results as the English case. Columns named differently? Run `npx fairwire-contract-renewals inspect <file>` (names and shapes only, never values) and name them in `fairwire-sources.json`:

```json
{ "files": { "exports/devices.csv": { "columns": { "host": "Gerätename" }, "date_order": "dmy" } } }
```

## Memory

fairwire-contract-renewals can remember facts about your setup so the next run does not have to be told again. `renewals_learn` only proposes a fact; it changes nothing until a named person accepts it with `renewals_accept_learning`, which is one click even in Auto. Facts live in one hash-chained file per agent under `.fairwire/memory/`; if the chain does not verify, no fact is used. Credentials, personal identifiers and text that reads like instructions to an AI are refused. Run without memory with `--no-memory`.

| Kind | What an accepted fact changes |
|---|---|
| `known_exception` | that finding is listed under "Accepted as known" instead of as open, until review_by (when given) has passed. |
| `note` | nothing (shown by recall only) |

```bash
fairwire-contract-renewals memory list
fairwire-contract-renewals memory accept MEM-1a2b3c4d5e6f --as "Your Name"
fairwire-contract-renewals memory retire MEM-1a2b3c4d5e6f --as "Your Name" --reason "rule removed"
```

## Install

Node 20 or newer. No other dependencies.

```bash
npx -y fairwire-contract-renewals demo
npx -y fairwire-contract-renewals mcp --root /path/to/your/files
```

Claude Desktop, Cursor and other MCP hosts:

```json
{
  "mcpServers": {
    "fairwire-contract-renewals": {
      "command": "npx",
      "args": [
        "-y",
        "fairwire-contract-renewals",
        "mcp",
        "--root",
        "/path/to/your/files"
      ]
    }
  }
}
```

Claude Code: `claude mcp add fairwire-contract-renewals -- npx -y fairwire-contract-renewals mcp --root .`, or install the `fairwire-contract-renewals` plugin from this repository's marketplace.

## Modes and approvals

- **Review** (`--mode review`): reads and reports only.
- **Assist** (default): the policy above. A tool that asks returns an `approval_id`; a person approves it once with `fairwire-contract-renewals approve <id> --as "Your Name"` (or on the local approvals page, `fairwire-contract-renewals approvals`), and the same call is repeated.
- **Auto** (`--mode auto --auto <tool,...>`): opt-in per tool, with step caps and a kill switch (`fairwire-contract-renewals kill`). Paying, sending, posting to a ledger or a live system and accepting a learned fact stay **one named click even in Auto**; an approval is tied to the sha256 of the reviewed draft, so a changed draft needs a new click.

## CLI

```bash
fairwire-contract-renewals tools                 # every tool, its policy and arguments
fairwire-contract-renewals sources               # the columns each input is read from
fairwire-contract-renewals inspect <file>        # how a file would be read (names and shapes, never values)
fairwire-contract-renewals call renewals_check '{"contracts":"<contracts>"}'
fairwire-contract-renewals eval                  # the private eval cases on the fictional fixtures
fairwire-contract-renewals demo
```

## Audit log and data

Every call is written to `.fairwire/audit.jsonl` under the root: hash-chained JSON lines, with arguments stored as a hash, signed with an Ed25519 key when you configure one. Everything runs on your machine on files you choose. No network calls, no telemetry, no credentials. The bundled fixtures are fictional.

<!-- generated:end -->

## Limits

- Reads only the files you export and give it. It does not log in to a firewall, switch, controller, cloud console, identity provider or any other live system.
- Dates and notice periods are the ones in your register; the contract itself decides how notice must be given. Not legal advice.
- Vendor names are compared without legal forms (Inc, Ltd, GmbH); two different vendors with the same name can be merged.
- Thresholds are working defaults in a settings file you control; they are not a vendor rule, a requirement of any standard or a security guarantee.
- Results returned to the AI model have the names of people, sign-in names, e-mail addresses, phone numbers and client addresses masked. The files written here keep the real values: keep them in a secure folder.
- Export layouts were written from knowledge of common exports and have not been tested on live customer accounts. Run `inspect` on a new export and name columns in `fairwire-sources.json` when they differ.

## Licence

MIT. Fictional data only in `fixtures/`.
