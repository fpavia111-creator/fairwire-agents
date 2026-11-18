# Tramontane of Directory

Directory hygiene from Active Directory or Entra exports: computer objects not seen for months, unsupported operating systems, accounts with passwords that never expire or are not required, disabled accounts still in groups, empty groups, groups with no owner and nested group loops. Drafts clean-up lists; never edits the directory.

Part of **Fairwire**, the IT and network family of [Mythos Machines](https://fair-agents.com) agents. The software is free (MIT); you pay a fixed price for the setup on your files. It reads files your IT team exports, on your own computer, and drafts notes. Every change to a live device, firewall, DNS zone, directory or cloud account stays one named person's click.

## What it checks

| Finding | What it means |
|---|---|
| `password_not_required` | An enabled user account flagged "password not required" (it may have an empty password). |
| `nested_group_loop` | Groups that contain each other in a loop, which breaks access reviews and some applications. |
| `password_never_expires` | An enabled user account whose password never expires (low for accounts you mark as service accounts). |
| `unsupported_os_computer` | An enabled computer object with an operating system past its vendor end of support. |
| `disabled_in_groups` | A disabled account that is still a member of groups (medium when one of them is privileged). |
| `stale_computer` | An enabled computer object that has not logged on for longer than your limit. |
| `group_without_owner` | A group with no owner (managed by), so nobody reviews who is in it. |
| `empty_group` | A group with no members. |

Findings come back worst first (high, medium, low). A finding a named person has reviewed can be accepted as known, with a reason and a date to look again; it then moves to "Accepted as known" instead of counting as open.

## Settings

Pass a settings file with `settings`. Every setting is optional; a misspelt setting is refused by name.

| Setting | What it does |
|---|---|
| `stale_days` | Days without a logon after which a computer counts as stale (default 90) |
| `unsupported_os` | Operating systems past end of support (default Windows 7, 8, 10, Server 2008, Server 2012) |
| `privileged_groups` | Groups that grant admin rights (default Domain Admins, Enterprise Admins, Schema Admins, Administrators, Account Operators, Backup Operators) |
| `service_account_prefixes` | Name prefixes of service accounts, e.g. "svc-" (their non-expiring passwords are low, not medium) |
| `builtin_groups` | Groups that need no owner (default the built-in admin and user groups) |

## What it never does

- `directory_modify_object` is refused: Tramontane never edits, disables, moves or deletes a directory object.
- `directory_remove_member` is refused: Tramontane never removes anyone from a group.
- `tramontane_request_send` waits for one named person's click, even in Auto (`binding_send`).
- `tramontane_accept_learning` waits for one named person's click, even in Auto (`accept_learning`).
- `tramontane_retire_memory` waits for one named person's click, even in Auto (`accept_learning`).
- `directory_modify_object` waits for one named person's click, even in Auto (`production_deploy`).
- `directory_remove_member` waits for one named person's click, even in Auto (`revoke_access`).

<!-- generated:start -->

## A demo run

`npx -y tramontane-of-directory demo` runs the agent on the fictional files in [`fixtures/`](fixtures) in a temporary folder. Captured output:

```text
Tramontane of Directory demo (fictional data) in a temporary folder, Auto on for the draft only

▶ Check the exported files
  status: executed  decision: allow
  17 object(s): 6 user(s), 5 computer(s), 6 group(s): 11 open finding(s), 1 high.
    high    password_not_required      user
    medium  disabled_in_groups         user
    medium  nested_group_loop          group
    medium  password_never_expires     user
    medium  unsupported_os_computer    computer
    medium  unsupported_os_computer    computer
    low     group_without_owner        group
    low     password_never_expires     user
    low     stale_computer             computer
    low     stale_computer             computer
    info    empty_group                group

▶ Explain one finding
  status: executed  decision: allow
  medium nested_group_loop: Groups Finance Readers > Finance Share contain each other in a loop. Fix: Break the loop by removing one of the nested memberships.

▶ Write the worklist
  status: executed  decision: allow
  Directory hygiene written: 17 object(s): 6 user(s), 5 computer(s), 6 group(s): 11 open finding(s), 1 high.

▶ Draft the note for a person
  status: executed  decision: allow  (auto)
  cleanup list 2026-11-18 drafted with 1 open marker(s) ([TO CONFIRM identity and directory administrators]). Nothing was sent.

▶ Auto: approving it still waits for one named person
  status: needs_approval  decision: ask
  reason: binding_send stays one-click, even in Auto

▶ The agent tries to change the live system itself
  status: blocked  decision: block
  reason: Tramontane never edits, disables, moves or deletes a directory object.
```

## Tools

| Tool | What it does | Policy |
|---|---|---|
| `tramontane_check` | Review the directory export and list risky password flags, group loops, unsupported and stale computers, disabled members, ownerless and empty groups. | runs |
| `tramontane_explain` | Every finding for one user, computer or group. | runs |
| `tramontane_write_report` | Write tramontane-directory.csv (one row per finding, with blank owner and decision columns) and tramontane-directory.html into out_dir (default fairwire-out/tramontane). | runs |
| `tramontane_draft_cleanup_list` | Write drafts/cleanup_list-<date>.md: the open findings at or above min_severity (default medium), each with what to do, addressed to identity and directory administrators. | asks first (Auto can be opted in) |
| `tramontane_request_send` | After one named human click (even in Auto), record that the reviewed cleanup list draft is approved in cleanup_list-requests.csv. | one named click, even in Auto (`binding_send`) |
| `tramontane_recall` | Search this agent's own memory of the customer's setup: accepted facts (in use) and facts waiting for a person. | runs |
| `tramontane_learn` | Propose one fact about the customer's setup for this agent to remember. | runs |
| `tramontane_accept_learning` | A named person accepts or rejects a fact waiting in this agent's memory. | one named click, even in Auto (`accept_learning`) |
| `tramontane_retire_memory` | A named person stops an accepted fact from applying. | one named click, even in Auto (`accept_learning`) |
| `directory_modify_object` | Tramontane never edits, disables, moves or deletes a directory object. | refused |
| `directory_remove_member` | Tramontane never removes anyone from a group. | refused |

Any tool name not in this table is blocked, including names a model invents. `refused` tools are listed so a model can see they exist and are refused.

## Columns it reads

Table inputs can be CSV, TSV, semicolon- or pipe-separated text, Excel `.xlsx`, JSON or JSONL. Columns are matched by the agent's own name, then by the English names below, then by their names in German, French, Spanish, Portuguese, Italian, Japanese, Chinese and Korean. Dates become `YYYY-MM-DD`; amounts and counts are read with either decimal mark. Every result lists under `sources` how each file was read.

### Directory objects (`objects`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `type` (required) | text | Type, Object Class, ObjectClass, Object Type | Typ, Type, 種類, 类型 |
| `name` (required) | text | Name, SamAccountName, sAMAccountName, Display Name, CN | Name, Nom, 名前, 名称 |
| `enabled` | text | Enabled, Account Enabled, Status | Aktiviert, Activé, 有効, 已启用 |
| `last_logon` | date | LastLogonDate, Last Logon, lastLogonTimestamp, Last Sign-in, ApproximateLastSignInDateTime | Letzte Anmeldung, Dernière connexion, 最終ログイン, 最后登录 |
| `os` | text | OperatingSystem, Operating System, OS | Betriebssystem, Système d’exploitation, OS, 操作系统 |
| `pwd_never_expires` | text | PasswordNeverExpires, Password Never Expires, DONT_EXPIRE_PASSWORD | - |
| `pwd_not_required` | text | PasswordNotRequired, Password Not Required, PASSWD_NOTREQD | - |
| `member_of` | text | MemberOf, Member Of, Groups | - |
| `members` | number | Members, Member Count, MemberCount | - |
| `managed_by` | text | ManagedBy, Managed By, Owner, Owners | - |
| `nested_groups` | text | Nested Groups, Member Groups, Group Members | - |

### Files from other countries

A German export in Windows-1252 with semicolons, `1.234,56` and `03.11.2026`, or a Japanese one in Shift_JIS with `2026/11/03`, is read the same way as the English file. [`fixtures/intl/`](fixtures/intl) has both versions of the demo data, and the eval cases `intl-de-*` and `intl-ja-*` require the same results as the English case. Columns named differently? Run `npx tramontane-of-directory inspect <file>` (names and shapes only, never values) and name them in `fairwire-sources.json`:

```json
{ "files": { "exports/devices.csv": { "columns": { "host": "Gerätename" }, "date_order": "dmy" } } }
```

## Memory

tramontane-of-directory can remember facts about your setup so the next run does not have to be told again. `tramontane_learn` only proposes a fact; it changes nothing until a named person accepts it with `tramontane_accept_learning`, which is one click even in Auto. Facts live in one hash-chained file per agent under `.fairwire/memory/`; if the chain does not verify, no fact is used. Credentials, personal identifiers and text that reads like instructions to an AI are refused. Run without memory with `--no-memory`.

| Kind | What an accepted fact changes |
|---|---|
| `known_exception` | that finding is listed under "Accepted as known" instead of as open, until review_by (when given) has passed. |
| `note` | nothing (shown by recall only) |

```bash
tramontane-of-directory memory list
tramontane-of-directory memory accept MEM-1a2b3c4d5e6f --as "Your Name"
tramontane-of-directory memory retire MEM-1a2b3c4d5e6f --as "Your Name" --reason "rule removed"
```

## Install

Node 20 or newer. No other dependencies.

```bash
npx -y tramontane-of-directory demo
npx -y tramontane-of-directory mcp --root /path/to/your/files
```

Claude Desktop, Cursor and other MCP hosts:

```json
{
  "mcpServers": {
    "tramontane-of-directory": {
      "command": "npx",
      "args": [
        "-y",
        "tramontane-of-directory",
        "mcp",
        "--root",
        "/path/to/your/files"
      ]
    }
  }
}
```

Claude Code: `claude mcp add tramontane-of-directory -- npx -y tramontane-of-directory mcp --root .`, or install the `tramontane-of-directory` plugin from this repository's marketplace.

## Modes and approvals

- **Review** (`--mode review`): reads and reports only.
- **Assist** (default): the policy above. A tool that asks returns an `approval_id`; a person approves it once with `tramontane-of-directory approve <id> --as "Your Name"` (or on the local approvals page, `tramontane-of-directory approvals`), and the same call is repeated.
- **Auto** (`--mode auto --auto <tool,...>`): opt-in per tool, with step caps and a kill switch (`tramontane-of-directory kill`). Paying, sending, posting to a ledger or a live system and accepting a learned fact stay **one named click even in Auto**; an approval is tied to the sha256 of the reviewed draft, so a changed draft needs a new click.

## CLI

```bash
tramontane-of-directory tools                 # every tool, its policy and arguments
tramontane-of-directory sources               # the columns each input is read from
tramontane-of-directory inspect <file>        # how a file would be read (names and shapes, never values)
tramontane-of-directory call tramontane_check '{"objects":"<objects>"}'
tramontane-of-directory eval                  # the private eval cases on the fictional fixtures
tramontane-of-directory demo
```

## Audit log and data

Every call is written to `.fairwire/audit.jsonl` under the root: hash-chained JSON lines, with arguments stored as a hash, signed with an Ed25519 key when you configure one. Everything runs on your machine on files you choose. No network calls, no telemetry, no credentials. The bundled fixtures are fictional.

<!-- generated:end -->

## Limits

- Reads only the files you export and give it. It does not log in to a firewall, switch, controller, cloud console, identity provider or any other live system.
- Last logon dates in Active Directory replicate slowly (lastLogonTimestamp can lag by up to two weeks); stale means "probably", so disable before deleting.
- Thresholds are working defaults in a settings file you control; they are not a vendor rule, a requirement of any standard or a security guarantee.
- Results returned to the AI model have the names of people, sign-in names, e-mail addresses, phone numbers and client addresses masked. The files written here keep the real values: keep them in a secure folder.
- It changes nothing on a live device, firewall, DNS zone, directory or cloud account. Every change it suggests is a draft that one named person applies.
- Export layouts were written from knowledge of common exports and have not been tested on live customer accounts. Run `inspect` on a new export and name columns in `fairwire-sources.json` when they differ.

## Licence

MIT. Fictional data only in `fixtures/`.
