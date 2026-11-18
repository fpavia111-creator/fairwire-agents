# Fairwire Endpoint Protection

Endpoint protection coverage: devices in your asset list with no security agent, agents not reporting, old signatures or agent versions, protection or tamper protection off, passive mode, two security products on one device and high alerts left open. Drafts notes; never isolates or changes a device.

Part of **Fairwire**, the IT and network family of [Mythos Machines](https://fair-agents.com) agents. The software is free (MIT); you pay a fixed price for the setup on your files. It reads files your IT team exports, on your own computer, and drafts notes. Every change to a live device, firewall, DNS zone, directory or cloud account stays one named person's click.

## What it checks

| Finding | What it means |
|---|---|
| `no_agent` | A device in your asset list with no endpoint security agent in the console export. |
| `protection_off` | Real-time protection is turned off on a device. |
| `open_high_alert` | A high or critical alert still open after your limit. |
| `tamper_off` | Tamper protection is off, so malware or a user can switch the agent off. |
| `passive_mode` | The agent runs in passive mode (detects but does not block) on a device where it should block. |
| `agent_not_reporting` | An agent that has not checked in for longer than your limit. |
| `old_signatures` | Detection signatures older than your limit. |
| `two_products` | Two different security products on one device (they can conflict and slow the device). |
| `old_agent` | An agent version older than the one you require. |

Findings come back worst first (high, medium, low). A finding a named person has reviewed can be accepted as known, with a reason and a date to look again; it then moves to "Accepted as known" instead of counting as open.

## Settings

Pass a settings file with `settings`. Every setting is optional; a misspelt setting is refused by name.

| Setting | What it does |
|---|---|
| `stale_days` | Days without a check-in after which an agent counts as not reporting (default 7) |
| `signature_max_days` | Days after which signatures count as old (default 3) |
| `alert_open_days` | Days a high or critical alert may stay open (default 2) |
| `min_agent_version` | Oldest agent version you accept (no check when empty) |
| `passive_ok` | Devices where passive mode is intended (another product blocks) |
| `asset_types_without_agent` | Asset types that cannot run an agent and are skipped by the coverage check (default printer, camera, phone, network) |

## What it never does

- `edr_isolate_device` is refused: Fairwire Endpoint Protection never isolates, scans or changes a device.
- `edr_change_policy` is refused: Fairwire Endpoint Protection never changes a security policy or exclusion.
- `endpoints_request_send` waits for one named person's click, even in Auto (`binding_send`).
- `endpoints_accept_learning` waits for one named person's click, even in Auto (`accept_learning`).
- `endpoints_retire_memory` waits for one named person's click, even in Auto (`accept_learning`).
- `edr_isolate_device` waits for one named person's click, even in Auto (`production_deploy`).
- `edr_change_policy` waits for one named person's click, even in Auto (`production_deploy`).

<!-- generated:start -->

## A demo run

`npx -y fairwire-endpoint-protection demo` runs the agent on the fictional files in [`fixtures/`](fixtures) in a temporary folder. Captured output:

```text
Fairwire Endpoint Protection demo (fictional data) in a temporary folder, Auto on for the draft only

▶ Check the exported files
  status: executed  decision: allow
  8 device(s) with an agent, 80% of 10 in-scope assets covered, 3 open alert(s): 10 open finding(s), 4 high.
    high    no_agent                   PC-108
    high    no_agent                   SRV-202
    high    open_high_alert            PC-102
    high    protection_off             PC-103
    medium  agent_not_reporting        PC-106
    medium  old_signatures             PC-106
    medium  passive_mode               PC-105
    medium  tamper_off                 PC-104
    low     old_agent                  PC-106
    low     two_products               PC-107

▶ Explain one finding
  status: executed  decision: allow
  medium agent_not_reporting: Defender on PC-106 last checked in on 2026-11-03. Fix: Check that the device is on and the agent service runs; reinstall it if needed.
medium old_signatures: Defender signatures on PC-106 date from 2026-11-02. Fix: Check the device can reach its update source.
low old_agent: PC-106 runs Defender 4.18.23110, older than 4.18.24000. Fix: Update the agent.

▶ Write the worklist
  status: executed  decision: allow
  Endpoint protection coverage written: 8 device(s) with an agent, 80% of 10 in-scope assets covered, 3 open alert(s): 10 open finding(s), 4 high.

▶ Draft the note for a person
  status: executed  decision: allow  (auto)
  security note 2026-11-18 drafted with 1 open marker(s) ([TO CONFIRM security operations]). Nothing was sent.

▶ Auto: approving it still waits for one named person
  status: needs_approval  decision: ask
  reason: binding_send stays one-click, even in Auto

▶ The agent tries to change the live system itself
  status: blocked  decision: block
  reason: Fairwire Endpoint Protection never isolates, scans or changes a device.
```

## Tools

| Tool | What it does | Policy |
|---|---|---|
| `endpoints_check` | Review the security console export against the asset list and list uncovered devices, protection gaps, stale agents and signatures, product clashes and old high alerts. | runs |
| `endpoints_explain` | Every finding for one device or alert. | runs |
| `endpoints_write_report` | Write endpoint-protection.csv (one row per finding, with blank owner and decision columns) and endpoint-protection.html into out_dir (default fairwire-out/endpoints). | runs |
| `endpoints_draft_security_note` | Write drafts/security_note-<date>.md: the open findings at or above min_severity (default medium), each with what to do, addressed to security operations. | asks first (Auto can be opted in) |
| `endpoints_request_send` | After one named human click (even in Auto), record that the reviewed security note draft is approved in security_note-requests.csv. | one named click, even in Auto (`binding_send`) |
| `endpoints_recall` | Search this agent's own memory of the customer's setup: accepted facts (in use) and facts waiting for a person. | runs |
| `endpoints_learn` | Propose one fact about the customer's setup for this agent to remember. | runs |
| `endpoints_accept_learning` | A named person accepts or rejects a fact waiting in this agent's memory. | one named click, even in Auto (`accept_learning`) |
| `endpoints_retire_memory` | A named person stops an accepted fact from applying. | one named click, even in Auto (`accept_learning`) |
| `edr_isolate_device` | Fairwire Endpoint Protection never isolates, scans or changes a device. | refused |
| `edr_change_policy` | Fairwire Endpoint Protection never changes a security policy or exclusion. | refused |

Any tool name not in this table is blocked, including names a model invents. `refused` tools are listed so a model can see they exist and are refused.

## Columns it reads

Table inputs can be CSV, TSV, semicolon- or pipe-separated text, Excel `.xlsx`, JSON or JSONL. Columns are matched by the agent's own name, then by the English names below, then by their names in German, French, Spanish, Portuguese, Italian, Japanese, Chinese and Korean. Dates become `YYYY-MM-DD`; amounts and counts are read with either decimal mark. Every result lists under `sources` how each file was read.

### Protected devices (`devices`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `device` (required) | text | Device Name, Device, Hostname, Computer Name, Endpoint, Machine Name | Gerät, Appareil, デバイス, 设备 |
| `product` | text | Product, Agent, Security Product, Sensor, Antivirus | Produkt, Produit, 製品, 产品 |
| `agent_version` | text | Agent Version, Sensor Version, Client Version, Version | Version, Version, バージョン, 版本 |
| `signature_date` | date | Signature Date, Definitions Date, Security Intelligence Updated, Definition Version Date, Signature Updated | - |
| `last_seen` | date and time | Last Seen, Last Device Update, Last Check-in, Last Contact, Last Communication | Zuletzt gesehen, Vu pour la dernière fois, 最終確認日時, 最后出现时间 |
| `protection` | text | Real-time Protection, Protection, RTP, Real Time Protection Enabled, Health State | - |
| `tamper_protection` | text | Tamper Protection, Tamper, Uninstall Protection | - |
| `mode` | text | Mode, Antivirus Mode, Defender Mode, Prevention Mode, Policy Mode | Verkehrsträger, Mode de transport, 輸送モード, 运输方式 |

Named exports recognised by their column names:

| System | Export | Recognised by | Layout checked against vendor docs |
|---|---|---|---|
| Microsoft Defender for Endpoint | Device inventory exported to CSV | Device Name, Onboarding Status, Health State | no |

Where a layout says "checked", its column names were compared with the vendor's documentation on that date. The other layouts were written from knowledge of the export and were not checked. None was tested against a live account.

### Asset list (`assets`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `device` (required) | text | Device Name, Hostname, Name, Computer Name, Asset Name | Gerät, Appareil, デバイス, 设备 |
| `type` | text | Type, Device Type, Class, Category | Typ, Type, 種類, 类型 |

### Alerts (`alerts`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `alert_id` (required) | text | Alert ID, ID, Incident ID, Detection ID | - |
| `device` (required) | text | Device Name, Device, Hostname, Computer Name | Gerät, Appareil, デバイス, 设备 |
| `severity` | text | Severity, Priority, Risk | Schweregrad, Gravité, 重大度, 严重程度 |
| `status` | text | Status, State, Resolution | Status, Statut, ステータス, 状态 |
| `created` | date and time | Created, First Seen, Alert Time, Detected, Timestamp | - |
| `title` | text | Title, Alert, Name, Threat | Produkt, Produit, 製品, 产品 |

### Files from other countries

A German export in Windows-1252 with semicolons, `1.234,56` and `03.11.2026`, or a Japanese one in Shift_JIS with `2026/11/03`, is read the same way as the English file. [`fixtures/intl/`](fixtures/intl) has both versions of the demo data, and the eval cases `intl-de-*` and `intl-ja-*` require the same results as the English case. Columns named differently? Run `npx fairwire-endpoint-protection inspect <file>` (names and shapes only, never values) and name them in `fairwire-sources.json`:

```json
{ "files": { "exports/devices.csv": { "columns": { "host": "Gerätename" }, "date_order": "dmy" } } }
```

## Memory

fairwire-endpoint-protection can remember facts about your setup so the next run does not have to be told again. `endpoints_learn` only proposes a fact; it changes nothing until a named person accepts it with `endpoints_accept_learning`, which is one click even in Auto. Facts live in one hash-chained file per agent under `.fairwire/memory/`; if the chain does not verify, no fact is used. Credentials, personal identifiers and text that reads like instructions to an AI are refused. Run without memory with `--no-memory`.

| Kind | What an accepted fact changes |
|---|---|
| `known_exception` | that finding is listed under "Accepted as known" instead of as open, until review_by (when given) has passed. |
| `note` | nothing (shown by recall only) |

```bash
fairwire-endpoint-protection memory list
fairwire-endpoint-protection memory accept MEM-1a2b3c4d5e6f --as "Your Name"
fairwire-endpoint-protection memory retire MEM-1a2b3c4d5e6f --as "Your Name" --reason "rule removed"
```

## Install

Node 20 or newer. No other dependencies.

```bash
npx -y fairwire-endpoint-protection demo
npx -y fairwire-endpoint-protection mcp --root /path/to/your/files
```

Claude Desktop, Cursor and other MCP hosts:

```json
{
  "mcpServers": {
    "fairwire-endpoint-protection": {
      "command": "npx",
      "args": [
        "-y",
        "fairwire-endpoint-protection",
        "mcp",
        "--root",
        "/path/to/your/files"
      ]
    }
  }
}
```

Claude Code: `claude mcp add fairwire-endpoint-protection -- npx -y fairwire-endpoint-protection mcp --root .`, or install the `fairwire-endpoint-protection` plugin from this repository's marketplace.

## Modes and approvals

- **Review** (`--mode review`): reads and reports only.
- **Assist** (default): the policy above. A tool that asks returns an `approval_id`; a person approves it once with `fairwire-endpoint-protection approve <id> --as "Your Name"` (or on the local approvals page, `fairwire-endpoint-protection approvals`), and the same call is repeated.
- **Auto** (`--mode auto --auto <tool,...>`): opt-in per tool, with step caps and a kill switch (`fairwire-endpoint-protection kill`). Paying, sending, posting to a ledger or a live system and accepting a learned fact stay **one named click even in Auto**; an approval is tied to the sha256 of the reviewed draft, so a changed draft needs a new click.

## CLI

```bash
fairwire-endpoint-protection tools                 # every tool, its policy and arguments
fairwire-endpoint-protection sources               # the columns each input is read from
fairwire-endpoint-protection inspect <file>        # how a file would be read (names and shapes, never values)
fairwire-endpoint-protection call endpoints_check '{"devices":"<devices>"}'
fairwire-endpoint-protection eval                  # the private eval cases on the fictional fixtures
fairwire-endpoint-protection demo
```

## Audit log and data

Every call is written to `.fairwire/audit.jsonl` under the root: hash-chained JSON lines, with arguments stored as a hash, signed with an Ed25519 key when you configure one. Everything runs on your machine on files you choose. No network calls, no telemetry, no credentials. The bundled fixtures are fictional.

<!-- generated:end -->

## Limits

- Reads only the files you export and give it. It does not log in to a firewall, switch, controller, cloud console, identity provider or any other live system.
- Coverage compares device names (without the domain); a device renamed in one system and not the other shows as uncovered.
- An agent that reports healthy can still miss a threat; this is a coverage and hygiene check, not a security assessment.
- Thresholds are working defaults in a settings file you control; they are not a vendor rule, a requirement of any standard or a security guarantee.
- It changes nothing on a live device, firewall, DNS zone, directory or cloud account. Every change it suggests is a draft that one named person applies.
- Export layouts were written from knowledge of common exports and have not been tested on live customer accounts. Run `inspect` on a new export and name columns in `fairwire-sources.json` when they differ.

## Licence

MIT. Fictional data only in `fixtures/`.
