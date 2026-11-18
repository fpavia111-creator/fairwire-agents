# Argestes of Assets

Asset inventory against the CMDB: devices seen on the network or in device management but missing from the CMDB, CMDB records not seen for months, duplicate serial numbers, retired records still active, missing owners or locations, and warranties ending. Drafts CMDB fix lists; never edits the CMDB.

Part of **Fairwire**, the IT and network family of [Mythos Machines](https://fair-agents.com) agents. The software is free (MIT); you pay a fixed price for the setup on your files. It reads files your IT team exports, on your own computer, and drafts notes. Every change to a live device, firewall, DNS zone, directory or cloud account stays one named person's click.

## What it checks

| Finding | What it means |
|---|---|
| `retired_but_seen` | A CMDB record marked retired or disposed, but the device was seen on the network or in device management recently. |
| `not_in_cmdb` | A device seen on the network or in device management with no CMDB record. |
| `duplicate_serial` | Two or more CMDB records with the same serial number. |
| `hostname_mismatch` | The CMDB and the discovery source name the same serial number differently (a rename that was not recorded). |
| `ghost_record` | An active CMDB record not seen by any source for longer than your limit (lost, stolen, or retired without updating the CMDB). |
| `missing_owner_or_location` | An active CMDB record with no owner or no location. |
| `warranty_ended` | An active device whose warranty or support has ended, or ends within your notice window. |

Findings come back worst first (high, medium, low). A finding a named person has reviewed can be accepted as known, with a reason and a date to look again; it then moves to "Accepted as known" instead of counting as open.

## Settings

Pass a settings file with `settings`. Every setting is optional; a misspelt setting is refused by name.

| Setting | What it does |
|---|---|
| `ghost_days` | Days without being seen after which an active record counts as a ghost (default 90) |
| `recent_days` | Days within which a retired device seen again is flagged (default 30) |
| `warranty_notice_days` | Days before the warranty end to start flagging (default 60) |
| `retired_words` | Status words that mean retired (default retired, disposed, decommissioned, stolen, lost) |

## What it never does

- `cmdb_update_record` is refused: Argestes never edits, merges or retires a CMDB record.
- `device_wipe` is refused: Argestes never wipes or locks a device.
- `argestes_request_send` waits for one named person's click, even in Auto (`binding_send`).
- `argestes_accept_learning` waits for one named person's click, even in Auto (`accept_learning`).
- `argestes_retire_memory` waits for one named person's click, even in Auto (`accept_learning`).
- `cmdb_update_record` waits for one named person's click, even in Auto (`production_deploy`).
- `device_wipe` waits for one named person's click, even in Auto (`delete_personal_data`).

<!-- generated:start -->

## A demo run

`npx -y argestes-of-assets demo` runs the agent on the fictional files in [`fixtures/`](fixtures) in a temporary folder. Captured output:

```text
Argestes of Assets demo (fictional data) in a temporary folder, Auto on for the draft only

▶ Check the exported files
  status: executed  decision: allow
  10 CMDB record(s) (9 active) against 11 device(s) seen, 10 matched: 10 open finding(s), 1 high.
    high    retired_but_seen           AST-1003
    medium  duplicate_serial           SN-A1006
    medium  not_in_cmdb                CAM-LOBBY
    medium  not_in_cmdb                LAPTOP-201
    low     ghost_record               AST-1010
    low     hostname_mismatch          AST-1009
    low     missing_owner_or_location  AST-1004
    low     missing_owner_or_location  AST-1008
    low     warranty_ended             AST-1005
    info    warranty_ended             AST-1004

▶ Explain one finding
  status: executed  decision: allow
  low missing_owner_or_location: AST-1004 has no location. Fix: Fill in who has it and where it is.
info warranty_ended: AST-1004 warranty or support ends on 2026-12-15. Fix: Plan a replacement or extend support if the device is still needed.

▶ Write the worklist
  status: executed  decision: allow
  Assets against the CMDB written: 10 CMDB record(s) (9 active) against 11 device(s) seen, 10 matched: 10 open finding(s), 1 high.

▶ Draft the note for a person
  status: executed  decision: allow  (auto)
  cmdb fix list 2026-11-18 drafted with 1 open marker(s) ([TO CONFIRM asset and CMDB owner]). Nothing was sent.

▶ Auto: approving it still waits for one named person
  status: needs_approval  decision: ask
  reason: binding_send stays one-click, even in Auto

▶ The agent tries to change the live system itself
  status: blocked  decision: block
  reason: Argestes never edits, merges or retires a CMDB record.
```

## Tools

| Tool | What it does | Policy |
|---|---|---|
| `argestes_check` | Match devices seen by serial, then by host name, and list retired-but-seen, unknown, duplicate, renamed, ghost, incomplete and out-of-warranty records. | runs |
| `argestes_explain` | Every finding for one record or device. | runs |
| `argestes_write_report` | Write argestes-assets.csv (one row per finding, with blank owner and decision columns) and argestes-assets.html into out_dir (default fairwire-out/argestes). | runs |
| `argestes_draft_cmdb_fix_list` | Write drafts/cmdb_fix_list-<date>.md: the open findings at or above min_severity (default medium), each with what to do, addressed to asset and CMDB owner. | asks first (Auto can be opted in) |
| `argestes_request_send` | After one named human click (even in Auto), record that the reviewed cmdb fix list draft is approved in cmdb_fix_list-requests.csv. | one named click, even in Auto (`binding_send`) |
| `argestes_recall` | Search this agent's own memory of the customer's setup: accepted facts (in use) and facts waiting for a person. | runs |
| `argestes_learn` | Propose one fact about the customer's setup for this agent to remember. | runs |
| `argestes_accept_learning` | A named person accepts or rejects a fact waiting in this agent's memory. | one named click, even in Auto (`accept_learning`) |
| `argestes_retire_memory` | A named person stops an accepted fact from applying. | one named click, even in Auto (`accept_learning`) |
| `cmdb_update_record` | Argestes never edits, merges or retires a CMDB record. | refused |
| `device_wipe` | Argestes never wipes or locks a device. | refused |

Any tool name not in this table is blocked, including names a model invents. `refused` tools are listed so a model can see they exist and are refused.

## Columns it reads

Table inputs can be CSV, TSV, semicolon- or pipe-separated text, Excel `.xlsx`, JSON or JSONL. Columns are matched by the agent's own name, then by the English names below, then by their names in German, French, Spanish, Portuguese, Italian, Japanese, Chinese and Korean. Dates become `YYYY-MM-DD`; amounts and counts are read with either decimal mark. Every result lists under `sources` how each file was read.

### CMDB records (`cmdb`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `asset_id` (required) | text | Asset ID, Asset Tag, CI, Name, sys_id, Configuration Item | - |
| `hostname` | text | Hostname, Host Name, Device Name, Computer Name, DNS Name | Hostname, Nom d’hôte, ホスト名, 主机名 |
| `serial` | text | Serial Number, Serial, Service Tag, serial_number | Seriennummer, Numéro de série, シリアル番号, 序列号 |
| `status` | text | Status, Install Status, Lifecycle, State, Operational Status | Status, Statut, ステータス, 状态 |
| `owner` | text | Owner, Assigned To, User, Custodian, Managed By | Verantwortlich, Responsable, 担当者, 负责人 |
| `location` | text | Location, Site, Building, Room | Lagerort, Emplacement, 保管場所, 库位 |
| `model` | text | Model, Model ID, Product | Modell, Modèle, モデル, 型号 |
| `warranty_end` | date | Warranty End, Warranty Expiration, Support End, End of Support, Warranty Expires | - |

### Devices seen (`seen`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `hostname` | text | Hostname, Device Name, Computer Name, Name, DNS Name | Hostname, Nom d’hôte, ホスト名, 主机名 |
| `serial` | text | Serial Number, Serial, Service Tag, Hardware Serial | Seriennummer, Numéro de série, シリアル番号, 序列号 |
| `source` | text | Source, Discovered By, Tool, System | Quelle, Source, 送信元, 源 |
| `last_seen` (required) | date and time | Last Seen, Last Check-in, Last Contact, Last Sync, Last Discovered | Zuletzt gesehen, Vu pour la dernière fois, 最終確認日時, 最后出现时间 |

### Files from other countries

A German export in Windows-1252 with semicolons, `1.234,56` and `03.11.2026`, or a Japanese one in Shift_JIS with `2026/11/03`, is read the same way as the English file. [`fixtures/intl/`](fixtures/intl) has both versions of the demo data, and the eval cases `intl-de-*` and `intl-ja-*` require the same results as the English case. Columns named differently? Run `npx argestes-of-assets inspect <file>` (names and shapes only, never values) and name them in `fairwire-sources.json`:

```json
{ "files": { "exports/devices.csv": { "columns": { "host": "Gerätename" }, "date_order": "dmy" } } }
```

## Memory

argestes-of-assets can remember facts about your setup so the next run does not have to be told again. `argestes_learn` only proposes a fact; it changes nothing until a named person accepts it with `argestes_accept_learning`, which is one click even in Auto. Facts live in one hash-chained file per agent under `.fairwire/memory/`; if the chain does not verify, no fact is used. Credentials, personal identifiers and text that reads like instructions to an AI are refused. Run without memory with `--no-memory`.

| Kind | What an accepted fact changes |
|---|---|
| `known_exception` | that finding is listed under "Accepted as known" instead of as open, until review_by (when given) has passed. |
| `note` | nothing (shown by recall only) |

```bash
argestes-of-assets memory list
argestes-of-assets memory accept MEM-1a2b3c4d5e6f --as "Your Name"
argestes-of-assets memory retire MEM-1a2b3c4d5e6f --as "Your Name" --reason "rule removed"
```

## Install

Node 20 or newer. No other dependencies.

```bash
npx -y argestes-of-assets demo
npx -y argestes-of-assets mcp --root /path/to/your/files
```

Claude Desktop, Cursor and other MCP hosts:

```json
{
  "mcpServers": {
    "argestes-of-assets": {
      "command": "npx",
      "args": [
        "-y",
        "argestes-of-assets",
        "mcp",
        "--root",
        "/path/to/your/files"
      ]
    }
  }
}
```

Claude Code: `claude mcp add argestes-of-assets -- npx -y argestes-of-assets mcp --root .`, or install the `argestes-of-assets` plugin from this repository's marketplace.

## Modes and approvals

- **Review** (`--mode review`): reads and reports only.
- **Assist** (default): the policy above. A tool that asks returns an `approval_id`; a person approves it once with `argestes-of-assets approve <id> --as "Your Name"` (or on the local approvals page, `argestes-of-assets approvals`), and the same call is repeated.
- **Auto** (`--mode auto --auto <tool,...>`): opt-in per tool, with step caps and a kill switch (`argestes-of-assets kill`). Paying, sending, posting to a ledger or a live system and accepting a learned fact stay **one named click even in Auto**; an approval is tied to the sha256 of the reviewed draft, so a changed draft needs a new click.

## CLI

```bash
argestes-of-assets tools                 # every tool, its policy and arguments
argestes-of-assets sources               # the columns each input is read from
argestes-of-assets inspect <file>        # how a file would be read (names and shapes, never values)
argestes-of-assets call argestes_check '{"cmdb":"<cmdb>","seen":"<seen>"}'
argestes-of-assets eval                  # the private eval cases on the fictional fixtures
argestes-of-assets demo
```

## Audit log and data

Every call is written to `.fairwire/audit.jsonl` under the root: hash-chained JSON lines, with arguments stored as a hash, signed with an Ed25519 key when you configure one. Everything runs on your machine on files you choose. No network calls, no telemetry, no credentials. The bundled fixtures are fictional.

<!-- generated:end -->

## Limits

- Reads only the files you export and give it. It does not log in to a firewall, switch, controller, cloud console, identity provider or any other live system.
- Devices are matched by serial number first and by host name (without the domain) second; two devices that share a name and have no serial can be matched wrongly.
- A device not seen may be switched off or in a drawer; a ghost record is a question for its owner.
- Thresholds are working defaults in a settings file you control; they are not a vendor rule, a requirement of any standard or a security guarantee.
- Results returned to the AI model have the names of people, sign-in names, e-mail addresses, phone numbers and client addresses masked. The files written here keep the real values: keep them in a secure folder.
- Export layouts were written from knowledge of common exports and have not been tested on live customer accounts. Run `inspect` on a new export and name columns in `fairwire-sources.json` when they differ.

## Licence

MIT. Fictional data only in `fixtures/`.
