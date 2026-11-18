# Eurybates of Mobiles

Mobile device inventory from Intune, Jamf or any MDM export: devices that stopped checking in, old operating systems, no encryption or passcode, jailbroken or rooted devices, devices of people who left and devices with no owner. Names masked for the model. Drafts notes; never wipes or locks a device.

Part of **Fairwire**, the IT and network family of [Mythos Machines](https://fair-agents.com) agents. The software is free (MIT); you pay a fixed price for the setup on your files. It reads files your IT team exports, on your own computer, and drafts notes. Every change to a live device, firewall, DNS zone, directory or cloud account stays one named person's click.

## What it checks

| Finding | What it means |
|---|---|
| `jailbroken` | A jailbroken or rooted device (its security controls cannot be trusted). |
| `leaver_device` | A device still enrolled to someone who has left. |
| `no_passcode_or_encryption` | A device with no passcode or no storage encryption. |
| `stale_check_in` | A device that has not checked in with device management for longer than your limit (lost, wiped by the user, or switched off). |
| `old_os` | A device on an operating system older than the minimum you set for its platform. |
| `noncompliant` | A device your device management marks as not compliant for another reason. |
| `no_owner` | A company device with nobody assigned to it. |

Findings come back worst first (high, medium, low). A finding a named person has reviewed can be accepted as known, with a reason and a date to look again; it then moves to "Accepted as known" instead of counting as open.

## Settings

Pass a settings file with `settings`. Every setting is optional; a misspelt setting is refused by name.

| Setting | What it does |
|---|---|
| `stale_days` | Days without a check-in after which a device is flagged (default 30) |
| `min_os` | Lowest OS version per platform, e.g. {"iOS": "17.0", "Android": "13"} (no check for platforms not listed) |

## What it never does

- `mdm_wipe_device` is refused: Eurybates never wipes, locks or retires a device.
- `mdm_change_policy` is refused: Eurybates never changes a compliance or configuration policy.
- `eurybates_request_send` waits for one named person's click, even in Auto (`binding_send`).
- `eurybates_accept_learning` waits for one named person's click, even in Auto (`accept_learning`).
- `eurybates_retire_memory` waits for one named person's click, even in Auto (`accept_learning`).
- `mdm_wipe_device` waits for one named person's click, even in Auto (`delete_personal_data`).
- `mdm_change_policy` waits for one named person's click, even in Auto (`production_deploy`).

<!-- generated:start -->

## A demo run

`npx -y eurybates-of-mobiles demo` runs the agent on the fictional files in [`fixtures/`](fixtures) in a temporary folder. Captured output:

```text
Eurybates of Mobiles demo (fictional data) in a temporary folder, Auto on for the draft only

▶ Check the exported files
  status: executed  decision: allow
  8 device(s), 2 personal: 8 open finding(s), 3 high.
    high    jailbroken                 android
    high    leaver_device              ios
    high    no_passcode_or_encryption  android
    medium  old_os                     android
    medium  old_os                     ios
    medium  stale_check_in             ios
    low     no_owner                   ipados
    low     noncompliant               android

▶ Explain one finding
  status: executed  decision: allow
  high jailbroken: AND-103 (Android, USR-e8c13d20) is reported jailbroken or rooted. Fix: Block it from company data and ask the person to restore the device or use another.
high no_passcode_or_encryption: AND-104 (USR-b470e760) has no encryption. Fix: Enforce a passcode and encryption policy; block access until the device complies.
medium old_os: AND-104 runs Android 12, under your minimum of 13. Fix: Ask the person to update; replace devices that cannot.
low noncompliant: AND-108 (USR-9dab2abc) is marked not compliant by device management. Fix: Check which policy it fails in the device management console.

▶ Write the worklist
  status: executed  decision: allow
  Mobile device inventory written: 8 device(s), 2 personal: 8 open finding(s), 3 high.

▶ Draft the note for a person
  status: executed  decision: allow  (auto)
  device note 2026-11-18 drafted with 1 open marker(s) ([TO CONFIRM endpoint and device management team]). Nothing was sent.

▶ Auto: approving it still waits for one named person
  status: needs_approval  decision: ask
  reason: binding_send stays one-click, even in Auto

▶ The agent tries to change the live system itself
  status: blocked  decision: block
  reason: Eurybates never wipes, locks or retires a device.
```

## Tools

| Tool | What it does | Policy |
|---|---|---|
| `eurybates_check` | Review the device management export and list jailbroken, leaver, unprotected, silent, outdated, non-compliant and unassigned devices. | runs |
| `eurybates_explain` | Every finding for one device or platform. | runs |
| `eurybates_write_report` | Write eurybates-mobiles.csv (one row per finding, with blank owner and decision columns) and eurybates-mobiles.html into out_dir (default fairwire-out/eurybates). | runs |
| `eurybates_draft_device_note` | Write drafts/device_note-<date>.md: the open findings at or above min_severity (default medium), each with what to do, addressed to endpoint and device management team. | asks first (Auto can be opted in) |
| `eurybates_request_send` | After one named human click (even in Auto), record that the reviewed device note draft is approved in device_note-requests.csv. | one named click, even in Auto (`binding_send`) |
| `eurybates_recall` | Search this agent's own memory of the customer's setup: accepted facts (in use) and facts waiting for a person. | runs |
| `eurybates_learn` | Propose one fact about the customer's setup for this agent to remember. | runs |
| `eurybates_accept_learning` | A named person accepts or rejects a fact waiting in this agent's memory. | one named click, even in Auto (`accept_learning`) |
| `eurybates_retire_memory` | A named person stops an accepted fact from applying. | one named click, even in Auto (`accept_learning`) |
| `mdm_wipe_device` | Eurybates never wipes, locks or retires a device. | refused |
| `mdm_change_policy` | Eurybates never changes a compliance or configuration policy. | refused |

Any tool name not in this table is blocked, including names a model invents. `refused` tools are listed so a model can see they exist and are refused.

## Columns it reads

Table inputs can be CSV, TSV, semicolon- or pipe-separated text, Excel `.xlsx`, JSON or JSONL. Columns are matched by the agent's own name, then by the English names below, then by their names in German, French, Spanish, Portuguese, Italian, Japanese, Chinese and Korean. Dates become `YYYY-MM-DD`; amounts and counts are read with either decimal mark. Every result lists under `sources` how each file was read.

### Mobile devices (`devices`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `device` (required) | text | Device name, Device, Name, Device ID | Gerät, Appareil, デバイス, 设备 |
| `user` | text | Primary user UPN, User, Assigned User, Owner, User principal name, Email | Benutzer, Utilisateur, ユーザー, 用户 |
| `platform` | text | OS, Platform, Operating System | Betriebssystem, Système d’exploitation, OS, 操作系统 |
| `os_version` | text | OS version, OS Version, Version | Betriebssystemversion, Version du système, OSバージョン, 操作系统版本 |
| `ownership` | text | Ownership, Owner Type, Device Ownership, Managed By | - |
| `last_check_in` | date and time | Last check-in, Last Check-in, Last Sync, Last Contact, Last Inventory | Letzte Synchronisierung, Dernière synchronisation, 最終チェックイン, 最后签入 |
| `encrypted` | text | Encrypted, Encryption, Storage Encrypted, FileVault | Verschlüsselt, Chiffré, 暗号化, 已加密 |
| `passcode` | text | Passcode, Passcode Present, Screen Lock, PIN Set | - |
| `jailbroken` | text | Jailbroken, Rooted, Jailbroken/Rooted, Compromised | - |
| `compliance` | text | Compliance, Compliance State, Compliant | Konformität, Conformité, 準拠状態, 合规状态 |
| `imei` | text | IMEI, Serial number, Serial, MEID | - |

Named exports recognised by their column names:

| System | Export | Recognised by | Layout checked against vendor docs |
|---|---|---|---|
| Microsoft Intune | All devices list exported to CSV | Device name, OS, OS version, Compliance, Last check-in | no |

Where a layout says "checked", its column names were compared with the vendor's documentation on that date. The other layouts were written from knowledge of the export and were not checked. None was tested against a live account.

### Leavers (`leavers`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `user` (required) | text | User, UPN, Email, Login | Benutzer, Utilisateur, ユーザー, 用户 |
| `end_date` (required) | date | End Date, Last Day, Termination Date, Leaving Date | Austrittsdatum, Date de sortie, 退職日, 离职日期 |

### Files from other countries

A German export in Windows-1252 with semicolons, `1.234,56` and `03.11.2026`, or a Japanese one in Shift_JIS with `2026/11/03`, is read the same way as the English file. [`fixtures/intl/`](fixtures/intl) has both versions of the demo data, and the eval cases `intl-de-*` and `intl-ja-*` require the same results as the English case. Columns named differently? Run `npx eurybates-of-mobiles inspect <file>` (names and shapes only, never values) and name them in `fairwire-sources.json`:

```json
{ "files": { "exports/devices.csv": { "columns": { "host": "Gerätename" }, "date_order": "dmy" } } }
```

## Memory

eurybates-of-mobiles can remember facts about your setup so the next run does not have to be told again. `eurybates_learn` only proposes a fact; it changes nothing until a named person accepts it with `eurybates_accept_learning`, which is one click even in Auto. Facts live in one hash-chained file per agent under `.fairwire/memory/`; if the chain does not verify, no fact is used. Credentials, personal identifiers and text that reads like instructions to an AI are refused. Run without memory with `--no-memory`.

| Kind | What an accepted fact changes |
|---|---|
| `known_exception` | that finding is listed under "Accepted as known" instead of as open, until review_by (when given) has passed. |
| `note` | nothing (shown by recall only) |

```bash
eurybates-of-mobiles memory list
eurybates-of-mobiles memory accept MEM-1a2b3c4d5e6f --as "Your Name"
eurybates-of-mobiles memory retire MEM-1a2b3c4d5e6f --as "Your Name" --reason "rule removed"
```

## Install

Node 20 or newer. No other dependencies.

```bash
npx -y eurybates-of-mobiles demo
npx -y eurybates-of-mobiles mcp --root /path/to/your/files
```

Claude Desktop, Cursor and other MCP hosts:

```json
{
  "mcpServers": {
    "eurybates-of-mobiles": {
      "command": "npx",
      "args": [
        "-y",
        "eurybates-of-mobiles",
        "mcp",
        "--root",
        "/path/to/your/files"
      ]
    }
  }
}
```

Claude Code: `claude mcp add eurybates-of-mobiles -- npx -y eurybates-of-mobiles mcp --root .`, or install the `eurybates-of-mobiles` plugin from this repository's marketplace.

## Modes and approvals

- **Review** (`--mode review`): reads and reports only.
- **Assist** (default): the policy above. A tool that asks returns an `approval_id`; a person approves it once with `eurybates-of-mobiles approve <id> --as "Your Name"` (or on the local approvals page, `eurybates-of-mobiles approvals`), and the same call is repeated.
- **Auto** (`--mode auto --auto <tool,...>`): opt-in per tool, with step caps and a kill switch (`eurybates-of-mobiles kill`). Paying, sending, posting to a ledger or a live system and accepting a learned fact stay **one named click even in Auto**; an approval is tied to the sha256 of the reviewed draft, so a changed draft needs a new click.

## CLI

```bash
eurybates-of-mobiles tools                 # every tool, its policy and arguments
eurybates-of-mobiles sources               # the columns each input is read from
eurybates-of-mobiles inspect <file>        # how a file would be read (names and shapes, never values)
eurybates-of-mobiles call eurybates_check '{"devices":"<devices>"}'
eurybates-of-mobiles eval                  # the private eval cases on the fictional fixtures
eurybates-of-mobiles demo
```

## Audit log and data

Every call is written to `.fairwire/audit.jsonl` under the root: hash-chained JSON lines, with arguments stored as a hash, signed with an Ed25519 key when you configure one. Everything runs on your machine on files you choose. No network calls, no telemetry, no credentials. The bundled fixtures are fictional.

<!-- generated:end -->

## Limits

- Reads only the files you export and give it. It does not log in to a firewall, switch, controller, cloud console, identity provider or any other live system.
- Jailbreak, encryption and passcode states are what the device last reported to device management; a device that stopped checking in may have changed since.
- Personal devices are judged on company data only; nothing here asks for a full wipe of a personal phone.
- Thresholds are working defaults in a settings file you control; they are not a vendor rule, a requirement of any standard or a security guarantee.
- Results returned to the AI model have the names of people, sign-in names, e-mail addresses, phone numbers and client addresses masked. The files written here keep the real values: keep them in a secure folder.
- It changes nothing on a live device, firewall, DNS zone, directory or cloud account. Every change it suggests is a draft that one named person applies.
- Export layouts were written from knowledge of common exports and have not been tested on live customer accounts. Run `inspect` on a new export and name columns in `fairwire-sources.json` when they differ.

## Licence

MIT. Fictional data only in `fixtures/`.
