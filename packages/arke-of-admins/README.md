# Arke of Admins

Privileged role review from directory role exports: more global administrators than your cap, standing assignments where you use just-in-time, admins without MFA, admin accounts that also read mail, roles held by guests, break-glass accounts that signed in or lack an exclusion note. Names masked for the model. Drafts notes; never removes a role.

Part of **Fairwire**, the IT and network family of [Mythos Machines](https://fair-agents.com) agents. The software is free (MIT); you pay a fixed price for the setup on your files. It reads files your IT team exports, on your own computer, and drafts notes. Every change to a live device, firewall, DNS zone, directory or cloud account stays one named person's click.

## What it checks

| Finding | What it means |
|---|---|
| `too_many_global_admins` | More people hold the top admin role than your cap. |
| `guest_with_admin_role` | A guest (external) account holds an admin role. |
| `admin_without_mfa` | An account with an admin role and no MFA registered. |
| `break_glass_signed_in` | An emergency (break-glass) account signed in recently; it should only be used in an emergency, and every use explained. |
| `standing_admin` | A permanent admin assignment where your policy says admins activate just in time. |
| `admin_reads_mail` | An admin account that also has a mailbox (a daily-use account doing admin work, the easiest one to phish). |
| `stale_admin` | An admin role held by an account that has not signed in for longer than your limit. |
| `break_glass_no_note` | An emergency account with no note on how it is stored, monitored and tested. |

Findings come back worst first (high, medium, low). A finding a named person has reviewed can be accepted as known, with a reason and a date to look again; it then moves to "Accepted as known" instead of counting as open.

## Settings

Pass a settings file with `settings`. Every setting is optional; a misspelt setting is refused by name.

| Setting | What it does |
|---|---|
| `global_roles` | Role names that are the top admin role (default Global Administrator, Company Administrator, Domain Admins, Enterprise Admins, Super Admin) |
| `max_global_admins` | Most people who should hold the top role, break-glass accounts not counted (default 4) |
| `require_jit` | Whether admins should be eligible and activate just in time rather than hold standing roles (default true) |
| `break_glass_accounts` | Emergency access accounts (also read from a break-glass column) |
| `stale_admin_days` | Days without a sign-in after which an admin counts as stale (default 90) |
| `break_glass_signin_days` | Days back within which a break-glass sign-in is flagged (default 30) |

## What it never does

- `idp_remove_role` is refused: Arke never removes or changes a role assignment.
- `idp_reset_break_glass` is refused: Arke never resets or uses a break-glass account.
- `arke_request_send` waits for one named person's click, even in Auto (`binding_send`).
- `arke_accept_learning` waits for one named person's click, even in Auto (`accept_learning`).
- `arke_retire_memory` waits for one named person's click, even in Auto (`accept_learning`).
- `idp_remove_role` waits for one named person's click, even in Auto (`revoke_access`).
- `idp_reset_break_glass` waits for one named person's click, even in Auto (`production_deploy`).

<!-- generated:start -->

## A demo run

`npx -y arke-of-admins demo` runs the agent on the fictional files in [`fixtures/`](fixtures) in a temporary folder. Captured output:

```text
Arke of Admins demo (fictional data) in a temporary folder, Auto on for the draft only

▶ Check the exported files
  status: executed  decision: allow
  10 admin role assignment(s) for 9 account(s), 5 top admin(s): 9 open finding(s), 4 high.
    high    admin_without_mfa          Global Administrator
    high    break_glass_signed_in      break-glass
    high    guest_with_admin_role      User Administrator
    high    too_many_global_admins     tenant
    medium  admin_reads_mail           Global Administrator
    medium  standing_admin             Global Administrator
    medium  standing_admin             User Administrator
    low     break_glass_no_note        break-glass
    low     stale_admin                Security Administrator

▶ Explain one finding
  status: executed  decision: allow
  medium admin_reads_mail: Admin account PERSON-cc1d5ecd (USR-7f46604c) also has a mailbox. Fix: Give the person a separate admin account without mail.
medium standing_admin: PERSON-cc1d5ecd (USR-7f46604c) holds Global Administrator permanently. Fix: Make the assignment eligible so it is activated just in time, with approval for the top roles.

▶ Write the worklist
  status: executed  decision: allow
  Privileged role review written: 10 admin role assignment(s) for 9 account(s), 5 top admin(s): 9 open finding(s), 4 high.

▶ Draft the note for a person
  status: executed  decision: allow  (auto)
  identity note 2026-11-18 drafted with 1 open marker(s) ([TO CONFIRM identity and security team]). Nothing was sent.

▶ Auto: approving it still waits for one named person
  status: needs_approval  decision: ask
  reason: binding_send stays one-click, even in Auto

▶ The agent tries to change the live system itself
  status: blocked  decision: block
  reason: Arke never removes or changes a role assignment.
```

## Tools

| Tool | What it does | Policy |
|---|---|---|
| `arke_check` | Review admin role assignments and list too many top admins, guests, missing MFA, break-glass use, standing roles, admins with mail and stale admins. | runs |
| `arke_explain` | Every finding for one admin account. | runs |
| `arke_write_report` | Write arke-admins.csv (one row per finding, with blank owner and decision columns) and arke-admins.html into out_dir (default fairwire-out/arke). | runs |
| `arke_draft_identity_note` | Write drafts/identity_note-<date>.md: the open findings at or above min_severity (default medium), each with what to do, addressed to identity and security team. | asks first (Auto can be opted in) |
| `arke_request_send` | After one named human click (even in Auto), record that the reviewed identity note draft is approved in identity_note-requests.csv. | one named click, even in Auto (`binding_send`) |
| `arke_recall` | Search this agent's own memory of the customer's setup: accepted facts (in use) and facts waiting for a person. | runs |
| `arke_learn` | Propose one fact about the customer's setup for this agent to remember. | runs |
| `arke_accept_learning` | A named person accepts or rejects a fact waiting in this agent's memory. | one named click, even in Auto (`accept_learning`) |
| `arke_retire_memory` | A named person stops an accepted fact from applying. | one named click, even in Auto (`accept_learning`) |
| `idp_remove_role` | Arke never removes or changes a role assignment. | refused |
| `idp_reset_break_glass` | Arke never resets or uses a break-glass account. | refused |

Any tool name not in this table is blocked, including names a model invents. `refused` tools are listed so a model can see they exist and are refused.

## Columns it reads

Table inputs can be CSV, TSV, semicolon- or pipe-separated text, Excel `.xlsx`, JSON or JSONL. Columns are matched by the agent's own name, then by the English names below, then by their names in German, French, Spanish, Portuguese, Italian, Japanese, Chinese and Korean. Dates become `YYYY-MM-DD`; amounts and counts are read with either decimal mark. Every result lists under `sources` how each file was read.

### Admin role assignments (`roles`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `user` (required) | text | User principal name, UPN, User, Principal, Account, Member | Benutzer, Utilisateur, ユーザー, 用户 |
| `display_name` | text | Display name, Name, Principal display name | - |
| `role` (required) | text | Role, Role name, Directory role, Group, Role Definition | Rolle, Rôle, ロール, 角色 |
| `assignment_type` | text | Assignment type, Assignment, State, Membership type, Type | - |
| `user_type` | text | User type, Account type, Principal type | - |
| `mfa` | text | MFA, MFA registered, Is MFA registered, Strong auth, Methods | Zwei-Faktor, Double authentification, 多要素認証, 多因素认证 |
| `mailbox` | text | Has mailbox, Mailbox, Licensed for email, Exchange license | E-Mail, E-mail, メールアドレス, 邮箱 |
| `last_sign_in` | date | Last sign-in, Last sign in, Last login, LastLogonDate | Letzte Anmeldung, Dernière connexion, 最終ログイン, 最后登录 |
| `break_glass` | text | Break glass, Emergency access, Break-glass | - |
| `note` | text | Note, Notes, Exclusion note, Documentation, Comment | - |

### Files from other countries

A German export in Windows-1252 with semicolons, `1.234,56` and `03.11.2026`, or a Japanese one in Shift_JIS with `2026/11/03`, is read the same way as the English file. [`fixtures/intl/`](fixtures/intl) has both versions of the demo data, and the eval cases `intl-de-*` and `intl-ja-*` require the same results as the English case. Columns named differently? Run `npx arke-of-admins inspect <file>` (names and shapes only, never values) and name them in `fairwire-sources.json`:

```json
{ "files": { "exports/devices.csv": { "columns": { "host": "Gerätename" }, "date_order": "dmy" } } }
```

## Memory

arke-of-admins can remember facts about your setup so the next run does not have to be told again. `arke_learn` only proposes a fact; it changes nothing until a named person accepts it with `arke_accept_learning`, which is one click even in Auto. Facts live in one hash-chained file per agent under `.fairwire/memory/`; if the chain does not verify, no fact is used. Credentials, personal identifiers and text that reads like instructions to an AI are refused. Run without memory with `--no-memory`.

| Kind | What an accepted fact changes |
|---|---|
| `known_exception` | that finding is listed under "Accepted as known" instead of as open, until review_by (when given) has passed. |
| `note` | nothing (shown by recall only) |

```bash
arke-of-admins memory list
arke-of-admins memory accept MEM-1a2b3c4d5e6f --as "Your Name"
arke-of-admins memory retire MEM-1a2b3c4d5e6f --as "Your Name" --reason "rule removed"
```

## Install

Node 20 or newer. No other dependencies.

```bash
npx -y arke-of-admins demo
npx -y arke-of-admins mcp --root /path/to/your/files
```

Claude Desktop, Cursor and other MCP hosts:

```json
{
  "mcpServers": {
    "arke-of-admins": {
      "command": "npx",
      "args": [
        "-y",
        "arke-of-admins",
        "mcp",
        "--root",
        "/path/to/your/files"
      ]
    }
  }
}
```

Claude Code: `claude mcp add arke-of-admins -- npx -y arke-of-admins mcp --root .`, or install the `arke-of-admins` plugin from this repository's marketplace.

## Modes and approvals

- **Review** (`--mode review`): reads and reports only.
- **Assist** (default): the policy above. A tool that asks returns an `approval_id`; a person approves it once with `arke-of-admins approve <id> --as "Your Name"` (or on the local approvals page, `arke-of-admins approvals`), and the same call is repeated.
- **Auto** (`--mode auto --auto <tool,...>`): opt-in per tool, with step caps and a kill switch (`arke-of-admins kill`). Paying, sending, posting to a ledger or a live system and accepting a learned fact stay **one named click even in Auto**; an approval is tied to the sha256 of the reviewed draft, so a changed draft needs a new click.

## CLI

```bash
arke-of-admins tools                 # every tool, its policy and arguments
arke-of-admins sources               # the columns each input is read from
arke-of-admins inspect <file>        # how a file would be read (names and shapes, never values)
arke-of-admins call arke_check '{"roles":"<roles>"}'
arke-of-admins eval                  # the private eval cases on the fictional fixtures
arke-of-admins demo
```

## Audit log and data

Every call is written to `.fairwire/audit.jsonl` under the root: hash-chained JSON lines, with arguments stored as a hash, signed with an Ed25519 key when you configure one. Everything runs on your machine on files you choose. No network calls, no telemetry, no credentials. The bundled fixtures are fictional.

<!-- generated:end -->

## Limits

- Reads only the files you export and give it. It does not log in to a firewall, switch, controller, cloud console, identity provider or any other live system.
- This looks at admin roles only; the Fairbooks agent ladon-of-access runs the wider access recertification across all apps.
- Roles granted through nested groups or app-specific admin settings that are not in the export are not seen.
- Thresholds are working defaults in a settings file you control; they are not a vendor rule, a requirement of any standard or a security guarantee.
- Results returned to the AI model have the names of people, sign-in names, e-mail addresses, phone numbers and client addresses masked. The files written here keep the real values: keep them in a secure folder.
- It changes nothing on a live device, firewall, DNS zone, directory or cloud account. Every change it suggests is a draft that one named person applies.
- Export layouts were written from knowledge of common exports and have not been tested on live customer accounts. Run `inspect` on a new export and name columns in `fairwire-sources.json` when they differ.

## Licence

MIT. Fictional data only in `fixtures/`.
