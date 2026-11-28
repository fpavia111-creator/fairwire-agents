# Fairwire Print Fleet

Print fleet review from a print management export: printers nobody uses, the cost per page by device, colour share, devices offline or on old firmware, low supplies, leases ending and printers missing from your asset list. Drafts a consolidation note; never changes a printer.

Part of **Fairwire**, the IT and network family of [Fair Agents](https://fair-agents.com) agents. The software is free (MIT); you pay a fixed price for the setup on your files. It reads files your IT team exports, on your own computer, and drafts notes. Every change to a live device, firewall, DNS zone, directory or cloud account stays one named person's click.

## What it checks

| Finding | What it means |
|---|---|
| `printer_offline` | A printer that is offline or has not reported for longer than your limit. |
| `lease_ending` | A printer lease ending within your notice window (decide to renew, replace or return). |
| `idle_printer` | A printer that prints fewer pages a month than your limit (a candidate to remove or consolidate). |
| `high_cost_per_page` | A printer whose lease and click charges come to more per page than your limit. |
| `high_color_share` | A printer where colour is a large share of the pages. |
| `low_supplies` | A toner or ink level under your limit. |
| `old_firmware` | A printer on older firmware than others of the same model. |
| `not_in_assets` | A printer in the print management export that is not in your asset list. |

Findings come back worst first (high, medium, low). A finding a named person has reviewed can be accepted as known, with a reason and a date to look again; it then moves to "Accepted as known" instead of counting as open.

## Settings

Pass a settings file with `settings`. Every setting is optional; a misspelt setting is refused by name.

| Setting | What it does |
|---|---|
| `offline_days` | Days without a report after which a printer counts as offline (default 3) |
| `idle_pages` | Pages a month under which a printer counts as idle (default 100) |
| `cost_per_page_max` | Cost per page above which a printer is flagged (default 0.25) |
| `color_share_pct` | Colour share above which a printer is flagged (default 40) |
| `supply_min_pct` | Supply level under which a printer is flagged (default 10) |
| `lease_notice_days` | Days before the lease end to start flagging (default 90) |

## What it never does

- `printer_apply_settings` is refused: Fairwire Print Fleet never changes printer settings, drivers or firmware.
- `supplier_order_supplies` is refused: Fairwire Print Fleet never orders supplies or signs a lease.
- `printers_request_send` waits for one named person's click, even in Auto (`binding_send`).
- `printers_accept_learning` waits for one named person's click, even in Auto (`accept_learning`).
- `printers_retire_memory` waits for one named person's click, even in Auto (`accept_learning`).
- `printer_apply_settings` waits for one named person's click, even in Auto (`production_deploy`).
- `supplier_order_supplies` waits for one named person's click, even in Auto (`move_money`).

<!-- generated:start -->

## A demo run

`npx -y fairwire-print-fleet demo` runs the agent on the fictional files in [`fixtures/`](fixtures) in a temporary folder. Captured output:

```text
Fairwire Print Fleet demo (fictional data) in a temporary folder, Auto on for the draft only

▶ Check the exported files
  status: executed  decision: allow
  7 printer(s), 17310 page(s) this month, 994.32 in lease and clicks (0.06 a page): 8 open finding(s), 0 high.
    medium  idle_printer               PRN-BR2-01
    medium  lease_ending               PRN-WH-01
    medium  printer_offline            PRN-BR2-02
    low     high_color_share           PRN-HQ-02
    low     high_cost_per_page         PRN-WH-01
    low     low_supplies               PRN-HQ-02
    low     not_in_assets              PRN-WH-02
    low     old_firmware               PRN-HQ-03

▶ Explain one finding
  status: executed  decision: allow
  medium idle_printer: PRN-BR2-01 printed 60 page(s) this month and cost 75.72. Fix: Remove it or move its users to a nearby printer.
medium printer_offline: PRN-BR2-02 at Branch 2 is offline (last report 2026-11-09). Fix: Check power, network and paper jams; if nobody misses it, consider removing it.

▶ Write the worklist
  status: executed  decision: allow
  Print fleet review written: 7 printer(s), 17310 page(s) this month, 994.32 in lease and clicks (0.06 a page): 8 open finding(s), 0 high.

▶ Draft the note for a person
  status: executed  decision: allow  (auto)
  consolidation note 2026-11-18 drafted with 1 open marker(s) ([TO CONFIRM facilities and the print supplier]). Nothing was sent.

▶ Auto: approving it still waits for one named person
  status: needs_approval  decision: ask
  reason: binding_send stays one-click, even in Auto

▶ The agent tries to change the live system itself
  status: blocked  decision: block
  reason: Fairwire Print Fleet never changes printer settings, drivers or firmware.
```

## Tools

| Tool | What it does | Policy |
|---|---|---|
| `printers_check` | Review the print fleet export and list offline, idle, costly, colour-heavy, low-supply, outdated and unrecorded printers and leases ending. | runs |
| `printers_explain` | Every finding for one printer or site. | runs |
| `printers_write_report` | Write print-fleet.csv (one row per finding, with blank owner and decision columns) and print-fleet.html into out_dir (default fairwire-out/printers). | runs |
| `printers_draft_consolidation_note` | Write drafts/consolidation_note-<date>.md: the open findings at or above min_severity (default medium), each with what to do, addressed to facilities and the print supplier. | asks first (Auto can be opted in) |
| `printers_request_send` | After one named human click (even in Auto), record that the reviewed consolidation note draft is approved in consolidation_note-requests.csv. | one named click, even in Auto (`binding_send`) |
| `printers_recall` | Search this agent's own memory of the customer's setup: accepted facts (in use) and facts waiting for a person. | runs |
| `printers_learn` | Propose one fact about the customer's setup for this agent to remember. | runs |
| `printers_accept_learning` | A named person accepts or rejects a fact waiting in this agent's memory. | one named click, even in Auto (`accept_learning`) |
| `printers_retire_memory` | A named person stops an accepted fact from applying. | one named click, even in Auto (`accept_learning`) |
| `printer_apply_settings` | Fairwire Print Fleet never changes printer settings, drivers or firmware. | refused |
| `supplier_order_supplies` | Fairwire Print Fleet never orders supplies or signs a lease. | refused |

Any tool name not in this table is blocked, including names a model invents. `refused` tools are listed so a model can see they exist and are refused.

## Columns it reads

Table inputs can be CSV, TSV, semicolon- or pipe-separated text, Excel `.xlsx`, JSON or JSONL. Columns are matched by the agent's own name, then by the English names below, then by their names in German, French, Spanish, Portuguese, Italian, Japanese, Chinese and Korean. Dates become `YYYY-MM-DD`; amounts and counts are read with either decimal mark. Every result lists under `sources` how each file was read.

### Printers (`printers`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `printer` (required) | text | Printer, Device, Device Name, Name, Queue, Printer Name | Gerät, Appareil, デバイス, 设备 |
| `site` | text | Site, Location, Office, Building | Standort, Site, 拠点, 站点 |
| `model` | text | Model, Device Model, Product | Modell, Modèle, モデル, 型号 |
| `status` | text | Status, State, Online | Status, Statut, ステータス, 状态 |
| `last_seen` | date and time | Last Seen, Last Contact, Last Report, Last Communication | Zuletzt gesehen, Vu pour la dernière fois, 最終確認日時, 最后出现时间 |
| `firmware` | text | Firmware, Firmware Version, Version | Firmware, Micrologiciel, ファームウェア, 固件 |
| `mono_pages` | number | Mono Pages, Black Pages, B/W Pages, Mono Pages (month) | - |
| `color_pages` | number | Colour Pages, Color Pages, Color Pages (month) | - |
| `supply_pct` | number | Lowest Supply %, Toner %, Supply Level, Toner Level, Ink Level | - |
| `lease_monthly` | amount | Lease Monthly, Monthly Lease, Rental, Service Fee | - |
| `mono_click` | number | Mono Click, Mono CPP, Black Click Rate, Mono Cost Per Page | - |
| `color_click` | number | Colour Click, Color Click, Color CPP, Color Cost Per Page | - |
| `lease_end` | date | Lease End, Contract End, End Date, Lease Expiry | - |

### Printer assets (`assets`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `printer` (required) | text | Printer, Device Name, Name, Hostname, Asset Name | Gerät, Appareil, デバイス, 设备 |

### Files from other countries

A German export in Windows-1252 with semicolons, `1.234,56` and `03.11.2026`, or a Japanese one in Shift_JIS with `2026/11/03`, is read the same way as the English file. [`fixtures/intl/`](fixtures/intl) has both versions of the demo data, and the eval cases `intl-de-*` and `intl-ja-*` require the same results as the English case. Columns named differently? Run `npx fairwire-print-fleet inspect <file>` (names and shapes only, never values) and name them in `fairwire-sources.json`:

```json
{ "files": { "exports/devices.csv": { "columns": { "host": "Gerätename" }, "date_order": "dmy" } } }
```

## Memory

fairwire-print-fleet can remember facts about your setup so the next run does not have to be told again. `printers_learn` only proposes a fact; it changes nothing until a named person accepts it with `printers_accept_learning`, which is one click even in Auto. Facts live in one hash-chained file per agent under `.fairwire/memory/`; if the chain does not verify, no fact is used. Credentials, personal identifiers and text that reads like instructions to an AI are refused. Run without memory with `--no-memory`.

| Kind | What an accepted fact changes |
|---|---|
| `known_exception` | that finding is listed under "Accepted as known" instead of as open, until review_by (when given) has passed. |
| `note` | nothing (shown by recall only) |

```bash
fairwire-print-fleet memory list
fairwire-print-fleet memory accept MEM-1a2b3c4d5e6f --as "Your Name"
fairwire-print-fleet memory retire MEM-1a2b3c4d5e6f --as "Your Name" --reason "rule removed"
```

## Install

Node 20 or newer. No other dependencies.

```bash
npx -y fairwire-print-fleet demo
npx -y fairwire-print-fleet mcp --root /path/to/your/files
```

Claude Desktop, Cursor and other MCP hosts:

```json
{
  "mcpServers": {
    "fairwire-print-fleet": {
      "command": "npx",
      "args": [
        "-y",
        "fairwire-print-fleet",
        "mcp",
        "--root",
        "/path/to/your/files"
      ]
    }
  }
}
```

Claude Code: `claude mcp add fairwire-print-fleet -- npx -y fairwire-print-fleet mcp --root .`, or install the `fairwire-print-fleet` plugin from this repository's marketplace.

## Modes and approvals

- **Review** (`--mode review`): reads and reports only.
- **Assist** (default): the policy above. A tool that asks returns an `approval_id`; a person approves it once with `fairwire-print-fleet approve <id> --as "Your Name"` (or on the local approvals page, `fairwire-print-fleet approvals`), and the same call is repeated.
- **Auto** (`--mode auto --auto <tool,...>`): opt-in per tool, with step caps and a kill switch (`fairwire-print-fleet kill`). Paying, sending, posting to a ledger or a live system and accepting a learned fact stay **one named click even in Auto**; an approval is tied to the sha256 of the reviewed draft, so a changed draft needs a new click.

## CLI

```bash
fairwire-print-fleet tools                 # every tool, its policy and arguments
fairwire-print-fleet sources               # the columns each input is read from
fairwire-print-fleet inspect <file>        # how a file would be read (names and shapes, never values)
fairwire-print-fleet call printers_check '{"printers":"<printers>"}'
fairwire-print-fleet eval                  # the private eval cases on the fictional fixtures
fairwire-print-fleet demo
```

## Audit log and data

Every call is written to `.fairwire/audit.jsonl` under the root: hash-chained JSON lines, with arguments stored as a hash, signed with an Ed25519 key when you configure one. Everything runs on your machine on files you choose. No network calls, no telemetry, no credentials. The bundled fixtures are fictional.

<!-- generated:end -->

## Limits

- Reads only the files you export and give it. It does not log in to a firewall, switch, controller, cloud console, identity provider or any other live system.
- Cost per page is lease plus click charges over this month's pages; paper, power and staff time are not included.
- Thresholds are working defaults in a settings file you control; they are not a vendor rule, a requirement of any standard or a security guarantee.
- Totals are arithmetic on the numbers in your files, not forecasts or quotes.
- It changes nothing on a live device, firewall, DNS zone, directory or cloud account. Every change it suggests is a draft that one named person applies.
- Export layouts were written from knowledge of common exports and have not been tested on live customer accounts. Run `inspect` on a new export and name columns in `fairwire-sources.json` when they differ.

## License

MIT. Fictional data only in `fixtures/`.
