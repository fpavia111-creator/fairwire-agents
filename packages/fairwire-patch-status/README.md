# Fairwire Patch Status

Patch status review from WSUS, Intune, SCCM or any patch export: critical and high updates missing beyond your days-to-patch, devices that stopped reporting, pending reboots, updates that keep failing, operating systems past end of support, and the updates missing on the most devices. Drafts notes; never installs anything.

Part of **Fairwire**, the IT and network family of [Fair Agents](https://fair-agents.com) agents. The software is free (MIT); you pay a fixed price for the setup on your files. It reads files your IT team exports, on your own computer, and drafts notes. Every change to a live device, firewall, DNS zone, directory or cloud account stays one named person's click.

## What it checks

| Finding | What it means |
|---|---|
| `overdue_critical` | A device missing a critical update for longer than your days-to-patch for critical updates. |
| `unsupported_os` | A device on an operating system past its vendor end of support (no more security updates unless you pay for extended support). |
| `overdue_update` | A device missing an important or moderate update for longer than your days-to-patch. |
| `repeated_failure` | An update that failed to install on a device (or failed several times). |
| `not_reporting` | A device whose last patch scan is older than your limit, so its real state is unknown. |
| `pending_reboot` | A device with updates installed that wait for a restart to take effect. |
| `widely_missing` | One update missing on a large share of devices (often an approval or deployment problem, not the devices). |

Findings come back worst first (high, medium, low). A finding a named person has reviewed can be accepted as known, with a reason and a date to look again; it then moves to "Accepted as known" instead of counting as open.

## Settings

Pass a settings file with `settings`. Every setting is optional; a misspelt setting is refused by name.

| Setting | What it does |
|---|---|
| `days_to_patch` | Your patch policy: days after release by which each severity must be installed |
| `stale_scan_days` | Days since the last scan after which a device counts as not reporting (default 7) |
| `unsupported_os` | Operating systems past end of support, matched as text; "*" stands for any text, and LTSC, LTSB or IoT systems are only matched by an entry that names them (default: END_OF_SUPPORT_OS as of 19 Nov 2026: Windows 2000, XP, Vista, 7, 8, 8.1 and 10, Windows 10 LTSB, Windows 11 21H2 to 23H2 and Home and Pro 24H2, Windows Server 2003, 2008 and 2012) |
| `widely_missing_pct` | Share of devices missing one update above which it is flagged (default 20) |

## What it never does

- `patch_deploy_now` is refused: Fairwire Patch Status never approves, deploys or installs an update.
- `device_force_reboot` is refused: Fairwire Patch Status never restarts a device.
- `patches_request_send` waits for one named person's click, even in Auto (`binding_send`).
- `patches_accept_learning` waits for one named person's click, even in Auto (`accept_learning`).
- `patches_retire_memory` waits for one named person's click, even in Auto (`accept_learning`).
- `patch_deploy_now` waits for one named person's click, even in Auto (`production_deploy`).
- `device_force_reboot` waits for one named person's click, even in Auto (`production_deploy`).

<!-- generated:start -->

## A demo run

`npx -y fairwire-patch-status demo` runs the agent on the fictional files in [`fixtures/`](fixtures) in a temporary folder. Captured output:

```text
Fairwire Patch Status demo (fictional data) in a temporary folder, Auto on for the draft only

▶ Check the exported files
  status: executed  decision: allow
  12 device(s), 4 update(s), 6 fully patched (50%): 11 open finding(s), 4 high.
    high    overdue_critical           PC-107
    high    overdue_critical           PC-109
    high    overdue_critical           SRV-202
    high    unsupported_os             PC-110
    medium  not_reporting              SRV-202
    medium  overdue_update             PC-108
    medium  overdue_update             SRV-202
    medium  repeated_failure           PC-109
    low     pending_reboot             SRV-201
    low     widely_missing             KB5040001
    low     widely_missing             KB5040010

▶ Explain one finding
  status: executed  decision: allow
  high overdue_critical: SRV-202 is missing 1 critical update(s) past 14 days (oldest KB5040001, released 2026-10-14). Fix: Install them now, or record an exception with a reason and an end date.
medium not_reporting: SRV-202 last reported its patch state on 2026-10-20. Fix: Check that the device is on and its update agent is running; its findings below may be out of date.
medium overdue_update: SRV-202 is missing 1 other update(s) past your policy (oldest KB5040002, important, released 2026-10-14). Fix: Install them in the next patch window.

▶ Write the worklist
  status: executed  decision: allow
  Patch status written: 12 device(s), 4 update(s), 6 fully patched (50%): 11 open finding(s), 4 high.

▶ Draft the note for a person
  status: executed  decision: allow  (auto)
  patch note 2026-11-18 drafted with 1 open marker(s) ([TO CONFIRM desktop and server teams]). Nothing was sent.

▶ Auto: approving it still waits for one named person
  status: needs_approval  decision: ask
  reason: binding_send stays one-click, even in Auto

▶ The agent tries to change the live system itself
  status: blocked  decision: block
  reason: Fairwire Patch Status never approves, deploys or installs an update.
```

## Tools

| Tool | What it does | Policy |
|---|---|---|
| `patches_check` | Review patch state per device against your days-to-patch and list overdue updates, unsupported systems, failures, silent devices, pending restarts and updates missing everywhere. | runs |
| `patches_explain` | Every finding for one device or update. | runs |
| `patches_write_report` | Write patch-status.csv (one row per finding, with blank owner and decision columns) and patch-status.html into out_dir (default fairwire-out/patches). | runs |
| `patches_draft_patch_note` | Write drafts/patch_note-<date>.md: the open findings at or above min_severity (default medium), each with what to do, addressed to desktop and server teams. | asks first (Auto can be opted in) |
| `patches_request_send` | After one named human click (even in Auto), record that the reviewed patch note draft is approved in patch_note-requests.csv. | one named click, even in Auto (`binding_send`) |
| `patches_recall` | Search this agent's own memory of the customer's setup: accepted facts (in use) and facts waiting for a person. | runs |
| `patches_learn` | Propose one fact about the customer's setup for this agent to remember. | runs |
| `patches_accept_learning` | A named person accepts or rejects a fact waiting in this agent's memory. | one named click, even in Auto (`accept_learning`) |
| `patches_retire_memory` | A named person stops an accepted fact from applying. | one named click, even in Auto (`accept_learning`) |
| `patch_deploy_now` | Fairwire Patch Status never approves, deploys or installs an update. | refused |
| `device_force_reboot` | Fairwire Patch Status never restarts a device. | refused |

Any tool name not in this table is blocked, including names a model invents. `refused` tools are listed so a model can see they exist and are refused.

## Columns it reads

Table inputs can be CSV, TSV, semicolon- or pipe-separated text, Excel `.xlsx`, JSON or JSONL. Columns are matched by the agent's own name, then by the English names below, then by their names in German, French, Spanish, Portuguese, Italian, Japanese, Chinese and Korean. Dates become `YYYY-MM-DD`; amounts and counts are read with either decimal mark. Every result lists under `sources` how each file was read.

### Patch status (`patches`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `device` (required) | text | Device, Device Name, Computer, Computer Name, Hostname, Endpoint | Gerät, Appareil, デバイス, 设备 |
| `os` | text | OS, Operating System, OS Name, Platform | Betriebssystem, Système d’exploitation, OS, 操作系统 |
| `group` | text | Group, Device Group, Collection, Ring, Site | Gruppe, Groupe, グループ, 组 |
| `update` | text | Update, KB, Patch, Patch ID, Update ID, Article ID | - |
| `title` | text | Title, Update Title, Patch Name, Description | Produkt, Produit, 製品, 产品 |
| `severity` | text | Severity, Classification, MSRC Severity, Priority, Criticality | Schweregrad, Gravité, 重大度, 严重程度 |
| `state` | text | State, Status, Install State, Approval State, Compliance | - |
| `released` | date | Released, Release Date, Published, Date Released, Patch Release Date | - |
| `last_scan` | date and time | Last Scan, Last Scan Time, Last Check-in, Last Report, Last Contact | Letzter Scan, Dernière analyse, 最終スキャン, 最后扫描 |
| `failures` | number | Failures, Install Failures, Failed Attempts, Error Count | - |

### Files from other countries

A German export in Windows-1252 with semicolons, `1.234,56` and `03.11.2026`, or a Japanese one in Shift_JIS with `2026/11/03`, is read the same way as the English file. [`fixtures/intl/`](fixtures/intl) has both versions of the demo data, and the eval cases `intl-de-*` and `intl-ja-*` require the same results as the English case. Columns named differently? Run `npx fairwire-patch-status inspect <file>` (names and shapes only, never values) and name them in `fairwire-sources.json`:

```json
{ "files": { "exports/devices.csv": { "columns": { "host": "Gerätename" }, "date_order": "dmy" } } }
```

## Memory

fairwire-patch-status can remember facts about your setup so the next run does not have to be told again. `patches_learn` only proposes a fact; it changes nothing until a named person accepts it with `patches_accept_learning`, which is one click even in Auto. Facts live in one hash-chained file per agent under `.fairwire/memory/`; if the chain does not verify, no fact is used. Credentials, personal identifiers and text that reads like instructions to an AI are refused. Run without memory with `--no-memory`.

| Kind | What an accepted fact changes |
|---|---|
| `known_exception` | that finding is listed under "Accepted as known" instead of as open, until review_by (when given) has passed. |
| `note` | nothing (shown by recall only) |

```bash
fairwire-patch-status memory list
fairwire-patch-status memory accept MEM-1a2b3c4d5e6f --as "Your Name"
fairwire-patch-status memory retire MEM-1a2b3c4d5e6f --as "Your Name" --reason "rule removed"
```

## Install

Node 20 or newer. No other dependencies.

```bash
npx -y fairwire-patch-status demo
npx -y fairwire-patch-status mcp --root /path/to/your/files
```

Claude Desktop, Cursor and other MCP hosts:

```json
{
  "mcpServers": {
    "fairwire-patch-status": {
      "command": "npx",
      "args": [
        "-y",
        "fairwire-patch-status",
        "mcp",
        "--root",
        "/path/to/your/files"
      ]
    }
  }
}
```

Claude Code: `claude mcp add fairwire-patch-status -- npx -y fairwire-patch-status mcp --root .`, or install the `fairwire-patch-status` plugin from this repository's marketplace.

## Modes and approvals

- **Review** (`--mode review`): reads and reports only.
- **Assist** (default): the policy above. A tool that asks returns an `approval_id`; a person approves it once with `fairwire-patch-status approve <id> --as "Your Name"` (or on the local approvals page, `fairwire-patch-status approvals`), and the same call is repeated.
- **Auto** (`--mode auto --auto <tool,...>`): opt-in per tool, with step caps and a kill switch (`fairwire-patch-status kill`). Paying, sending, posting to a ledger or a live system and accepting a learned fact stay **one named click even in Auto**; an approval is tied to the sha256 of the reviewed draft, so a changed draft needs a new click.

## CLI

```bash
fairwire-patch-status tools                 # every tool, its policy and arguments
fairwire-patch-status sources               # the columns each input is read from
fairwire-patch-status inspect <file>        # how a file would be read (names and shapes, never values)
fairwire-patch-status call patches_check '{"patches":"<patches>"}'
fairwire-patch-status eval                  # the private eval cases on the fictional fixtures
fairwire-patch-status demo
```

## Audit log and data

Every call is written to `.fairwire/audit.jsonl` under the root: hash-chained JSON lines, with arguments stored as a hash, signed with an Ed25519 key when you configure one. Everything runs on your machine on files you choose. No network calls, no telemetry, no credentials. The bundled fixtures are fictional.

<!-- generated:end -->

## Limits

- Reads only the files you export and give it. It does not log in to a firewall, switch, controller, cloud console, identity provider or any other live system.
- Severity and release dates are the ones in your export; end-of-support defaults come from public vendor dates as of 2026 and do not know about extended support you bought.
- A device that stopped reporting may be patched or not; its rows show its last known state.
- Thresholds are working defaults in a settings file you control; they are not a vendor rule, a requirement of any standard or a security guarantee.
- It changes nothing on a live device, firewall, DNS zone, directory or cloud account. Every change it suggests is a draft that one named person applies.
- Export layouts were written from knowledge of common exports and have not been tested on live customer accounts. Run `inspect` on a new export and name columns in `fairwire-sources.json` when they differ.

## License

MIT. Fictional data only in `fixtures/`.
