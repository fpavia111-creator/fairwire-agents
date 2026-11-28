# Fairwire Software Licenses

Software installs against licenses: products installed on more devices than you own licenses for, licenses nobody uses, software not on your approved list, prohibited software, versions past end of support and several versions of one product. Drafts a true-up note; never uninstalls anything.

Part of **Fairwire**, the IT and network family of [Fair Agents](https://fair-agents.com) agents. The software is free (MIT); you pay a fixed price for the setup on your files. It reads files your IT team exports, on your own computer, and drafts notes. Every change to a live device, firewall, DNS zone, directory or cloud account stays one named person's click.

## What it checks

| Finding | What it means |
|---|---|
| `prohibited_software` | Software on your prohibited list installed on devices. |
| `over_deployed` | A product installed on more devices than you own licenses for. |
| `old_version` | Devices running a version older than the minimum you set (often unsupported or with known flaws). |
| `unapproved_software` | Software that is not on your approved list. |
| `unused_entitlements` | Licences you pay for that are not installed anywhere (shelfware). |
| `many_versions` | One product installed in three or more versions, which makes patching harder. |

Findings come back worst first (high, medium, low). A finding a named person has reviewed can be accepted as known, with a reason and a date to look again; it then moves to "Accepted as known" instead of counting as open.

## Settings

Pass a settings file with `settings`. Every setting is optional; a misspelt setting is refused by name.

| Setting | What it does |
|---|---|
| `approved` | Product names on your approved list (no check when empty); a name matches installs that start with it |
| `prohibited` | Product names that must not be installed |
| `min_versions` | Lowest acceptable version per product, e.g. {"7-Zip": "24.0"} |
| `shelfware_pct` | Share of licenses unused above which a product is flagged (default 20) |
| `shelfware_min_seats` | Unused licenses a product needs before it is flagged (default 5) |

## What it never does

- `endpoint_uninstall_software` is refused: Fairwire Software Licenses never uninstalls or blocks software on a device.
- `vendor_order_licences` is refused: Fairwire Software Licenses never orders licenses.
- `licenses_request_send` waits for one named person's click, even in Auto (`binding_send`).
- `licenses_accept_learning` waits for one named person's click, even in Auto (`accept_learning`).
- `licenses_retire_memory` waits for one named person's click, even in Auto (`accept_learning`).
- `endpoint_uninstall_software` waits for one named person's click, even in Auto (`production_deploy`).
- `vendor_order_licences` waits for one named person's click, even in Auto (`move_money`).

<!-- generated:start -->

## A demo run

`npx -y fairwire-software-licenses demo` runs the agent on the fictional files in [`fixtures/`](fixtures) in a temporary folder. Captured output:

```text
Fairwire Software Licenses demo (fictional data) in a temporary folder, Auto on for the draft only

▶ Check the exported files
  status: executed  decision: allow
  36 install(s) of 6 product(s) on 12 device(s), 3 licensed product(s): 6 open finding(s), 2 high.
    high    over_deployed              Visio Professional
    high    prohibited_software        uTorrent
    medium  old_version                7-Zip 24.08 (x64)
    medium  unapproved_software        Fun Game Launcher
    low     many_versions              7-Zip 24.08 (x64)
    low     unused_entitlements        Design Suite Pro

▶ Explain one finding
  status: executed  decision: allow
  high over_deployed: Visio Professional is installed on 7 device(s) but you own 5 licence(s) (2 short). Fix: Remove it where it is not needed, or buy the difference before the vendor audits you.

▶ Write the worklist
  status: executed  decision: allow
  Software installs against licences written: 36 install(s) of 6 product(s) on 12 device(s), 3 licensed product(s): 6 open finding(s), 2 high.

▶ Draft the note for a person
  status: executed  decision: allow  (auto)
  true up note 2026-11-18 drafted with 1 open marker(s) ([TO CONFIRM software asset manager and procurement]). Nothing was sent.

▶ Auto: approving it still waits for one named person
  status: needs_approval  decision: ask
  reason: binding_send stays one-click, even in Auto

▶ The agent tries to change the live system itself
  status: blocked  decision: block
  reason: Fairwire Software Licenses never uninstalls or blocks software on a device.
```

## Tools

| Tool | What it does | Policy |
|---|---|---|
| `licenses_check` | Count devices per product and list prohibited, over-deployed, outdated, unapproved, unused and fragmented software. | runs |
| `licenses_explain` | Every finding for one product. | runs |
| `licenses_write_report` | Write software-licenses.csv (one row per finding, with blank owner and decision columns) and software-licenses.html into out_dir (default fairwire-out/licenses). | runs |
| `licenses_draft_true_up_note` | Write drafts/true_up_note-<date>.md: the open findings at or above min_severity (default medium), each with what to do, addressed to software asset manager and procurement. | asks first (Auto can be opted in) |
| `licenses_request_send` | After one named human click (even in Auto), record that the reviewed true up note draft is approved in true_up_note-requests.csv. | one named click, even in Auto (`binding_send`) |
| `licenses_recall` | Search this agent's own memory of the customer's setup: accepted facts (in use) and facts waiting for a person. | runs |
| `licenses_learn` | Propose one fact about the customer's setup for this agent to remember. | runs |
| `licenses_accept_learning` | A named person accepts or rejects a fact waiting in this agent's memory. | one named click, even in Auto (`accept_learning`) |
| `licenses_retire_memory` | A named person stops an accepted fact from applying. | one named click, even in Auto (`accept_learning`) |
| `endpoint_uninstall_software` | Fairwire Software Licenses never uninstalls or blocks software on a device. | refused |
| `vendor_order_licences` | Fairwire Software Licenses never orders licences. | refused |

Any tool name not in this table is blocked, including names a model invents. `refused` tools are listed so a model can see they exist and are refused.

## Columns it reads

Table inputs can be CSV, TSV, semicolon- or pipe-separated text, Excel `.xlsx`, JSON or JSONL. Columns are matched by the agent's own name, then by the English names below, then by their names in German, French, Spanish, Portuguese, Italian, Japanese, Chinese and Korean. Dates become `YYYY-MM-DD`; amounts and counts are read with either decimal mark. Every result lists under `sources` how each file was read.

### Installed software (`installs`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `device` (required) | text | Device, Device Name, Computer, Computer Name, Hostname, Machine | Gerät, Appareil, デバイス, 设备 |
| `product` (required) | text | Product, Software, Application, Name, Display Name, Title | Produkt, Produit, 製品, 产品 |
| `version` | text | Version, Product Version, Display Version | Version, Version, バージョン, 版本 |
| `publisher` | text | Publisher, Vendor, Manufacturer | Hersteller, Éditeur, 発行元, 发行商 |

### Licences owned (`entitlements`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `product` (required) | text | Product, Software, Licence, License, Title, SKU Name | Produkt, Produit, 製品, 产品 |
| `seats` (required) | number | Seats, Licences, Licenses, Quantity, Entitlements, Purchased | Lizenzen, Licences, ライセンス数, 许可数 |
| `annual_cost` | amount | Annual Cost, Cost, Price per Year, Total Cost | Vertragswert, Valeur du contrat, 契約金額, 合同金额 |

### Files from other countries

A German export in Windows-1252 with semicolons, `1.234,56` and `03.11.2026`, or a Japanese one in Shift_JIS with `2026/11/03`, is read the same way as the English file. [`fixtures/intl/`](fixtures/intl) has both versions of the demo data, and the eval cases `intl-de-*` and `intl-ja-*` require the same results as the English case. Columns named differently? Run `npx fairwire-software-licenses inspect <file>` (names and shapes only, never values) and name them in `fairwire-sources.json`:

```json
{ "files": { "exports/devices.csv": { "columns": { "host": "Gerätename" }, "date_order": "dmy" } } }
```

## Memory

fairwire-software-licenses can remember facts about your setup so the next run does not have to be told again. `licenses_learn` only proposes a fact; it changes nothing until a named person accepts it with `licenses_accept_learning`, which is one click even in Auto. Facts live in one hash-chained file per agent under `.fairwire/memory/`; if the chain does not verify, no fact is used. Credentials, personal identifiers and text that reads like instructions to an AI are refused. Run without memory with `--no-memory`.

| Kind | What an accepted fact changes |
|---|---|
| `known_exception` | that finding is listed under "Accepted as known" instead of as open, until review_by (when given) has passed. |
| `note` | nothing (shown by recall only) |

```bash
fairwire-software-licenses memory list
fairwire-software-licenses memory accept MEM-1a2b3c4d5e6f --as "Your Name"
fairwire-software-licenses memory retire MEM-1a2b3c4d5e6f --as "Your Name" --reason "rule removed"
```

## Install

Node 20 or newer. No other dependencies.

```bash
npx -y fairwire-software-licenses demo
npx -y fairwire-software-licenses mcp --root /path/to/your/files
```

Claude Desktop, Cursor and other MCP hosts:

```json
{
  "mcpServers": {
    "fairwire-software-licenses": {
      "command": "npx",
      "args": [
        "-y",
        "fairwire-software-licenses",
        "mcp",
        "--root",
        "/path/to/your/files"
      ]
    }
  }
}
```

Claude Code: `claude mcp add fairwire-software-licenses -- npx -y fairwire-software-licenses mcp --root .`, or install the `fairwire-software-licenses` plugin from this repository's marketplace.

## Modes and approvals

- **Review** (`--mode review`): reads and reports only.
- **Assist** (default): the policy above. A tool that asks returns an `approval_id`; a person approves it once with `fairwire-software-licenses approve <id> --as "Your Name"` (or on the local approvals page, `fairwire-software-licenses approvals`), and the same call is repeated.
- **Auto** (`--mode auto --auto <tool,...>`): opt-in per tool, with step caps and a kill switch (`fairwire-software-licenses kill`). Paying, sending, posting to a ledger or a live system and accepting a learned fact stay **one named click even in Auto**; an approval is tied to the sha256 of the reviewed draft, so a changed draft needs a new click.

## CLI

```bash
fairwire-software-licenses tools                 # every tool, its policy and arguments
fairwire-software-licenses sources               # the columns each input is read from
fairwire-software-licenses inspect <file>        # how a file would be read (names and shapes, never values)
fairwire-software-licenses call licenses_check '{"installs":"<installs>"}'
fairwire-software-licenses eval                  # the private eval cases on the fictional fixtures
fairwire-software-licenses demo
```

## Audit log and data

Every call is written to `.fairwire/audit.jsonl` under the root: hash-chained JSON lines, with arguments stored as a hash, signed with an Ed25519 key when you configure one. Everything runs on your machine on files you choose. No network calls, no telemetry, no credentials. The bundled fixtures are fictional.

<!-- generated:end -->

## Limits

- Reads only the files you export and give it. It does not log in to a firewall, switch, controller, cloud console, identity provider or any other live system.
- Products are matched by name (case and bracketed editions ignored); license terms such as per-user, per-core or second-device rights are not modelled, so a vendor's count can differ.
- Not a license compliance opinion; your agreement with each vendor decides what you owe.
- Thresholds are working defaults in a settings file you control; they are not a vendor rule, a requirement of any standard or a security guarantee.
- It changes nothing on a live device, firewall, DNS zone, directory or cloud account. Every change it suggests is a draft that one named person applies.
- Export layouts were written from knowledge of common exports and have not been tested on live customer accounts. Run `inspect` on a new export and name columns in `fairwire-sources.json` when they differ.

## License

MIT. Fictional data only in `fixtures/`.
