# Fairwire MFA Coverage

MFA coverage from an identity provider export: active users with no MFA registered, users with only SMS or voice, administrators without phishing-resistant MFA, people excluded from MFA policy, registered but never used, and shared accounts that can sign in. Names masked for the model. Drafts notes; never changes a policy.

Part of **Fairwire**, the IT and network family of [Mythos Machines](https://fair-agents.com) agents. The software is free (MIT); you pay a fixed price for the setup on your files. It reads files your IT team exports, on your own computer, and drafts notes. Every change to a live device, firewall, DNS zone, directory or cloud account stays one named person's click.

## What it checks

| Finding | What it means |
|---|---|
| `admin_without_strong_mfa` | An administrator with no phishing-resistant method (security key, passkey, Windows Hello or certificate). |
| `no_mfa` | An active account that can sign in with no second factor registered. |
| `excluded_from_mfa` | An active account excluded from the MFA policy that is not one of your listed break-glass accounts. |
| `weak_methods_only` | An account whose only second factors are SMS, voice calls or e-mail codes. |
| `shared_account_can_sign_in` | A shared or resource mailbox that can sign in directly (nobody owns its second factor). |
| `registered_never_used` | An account that signs in but has registered MFA it never uses (often a policy gap). |

Findings come back worst first (high, medium, low). A finding a named person has reviewed can be accepted as known, with a reason and a date to look again; it then moves to "Accepted as known" instead of counting as open.

## Settings

Pass a settings file with `settings`. Every setting is optional; a misspelt setting is refused by name.

| Setting | What it does |
|---|---|
| `break_glass` | Emergency access accounts that are excluded from MFA on purpose |
| `weak_methods` | Method words that count as weak (default sms, voice, phone call, text, email) |
| `strong_methods` | Method words that count as phishing-resistant (default fido2, security key, passkey, windows hello, certificate) |
| `unused_days` | Days without a second factor after which a registered account counts as not using it (default 90) |

## What it never does

- `idp_change_policy` is refused: Fairwire MFA Coverage never changes a conditional access or MFA policy.
- `idp_reset_methods` is refused: Fairwire MFA Coverage never resets or removes anyone's authentication methods.
- `mfa_request_send` waits for one named person's click, even in Auto (`binding_send`).
- `mfa_accept_learning` waits for one named person's click, even in Auto (`accept_learning`).
- `mfa_retire_memory` waits for one named person's click, even in Auto (`accept_learning`).
- `idp_change_policy` waits for one named person's click, even in Auto (`production_deploy`).
- `idp_reset_methods` waits for one named person's click, even in Auto (`revoke_access`).

<!-- generated:start -->

## A demo run

`npx -y fairwire-mfa-coverage demo` runs the agent on the fictional files in [`fixtures/`](fixtures) in a temporary folder. Captured output:

```text
Fairwire MFA Coverage demo (fictional data) in a temporary folder, Auto on for the draft only

▶ Check the exported files
  status: executed  decision: allow
  9 active account(s) of 10, 66.7% with MFA, 22.2% phishing-resistant, 3 admin(s): 8 open finding(s), 3 high.
    high    admin_without_strong_mfa   IT
    high    admin_without_strong_mfa   IT
    high    no_mfa                     Sales
    medium  excluded_from_mfa          Finance
    medium  shared_account_can_sign_in Facilities
    medium  weak_methods_only          Sales
    low     registered_never_used      Finance
    low     registered_never_used      Finance

▶ Explain one finding
  status: executed  decision: allow
  medium excluded_from_mfa: PERSON-dcd3514b (USR-e8b98e7f) is excluded from the MFA policy. Fix: Remove the exclusion, or record why and until when, and add it to the break-glass list only if it is one.
low registered_never_used: PERSON-dcd3514b (USR-e8b98e7f) signs in but has not used a second factor since 2026-08-01. Fix: Check which sign-ins skip MFA (trusted locations, legacy apps) and close the gap.

▶ Write the worklist
  status: executed  decision: allow
  MFA coverage written: 9 active account(s) of 10, 66.7% with MFA, 22.2% phishing-resistant, 3 admin(s): 8 open finding(s), 3 high.

▶ Draft the note for a person
  status: executed  decision: allow  (auto)
  identity note 2026-11-18 drafted with 1 open marker(s) ([TO CONFIRM identity and security team]). Nothing was sent.

▶ Auto: approving it still waits for one named person
  status: needs_approval  decision: ask
  reason: binding_send stays one-click, even in Auto

▶ The agent tries to change the live system itself
  status: blocked  decision: block
  reason: Fairwire MFA Coverage never changes a conditional access or MFA policy.
```

## Tools

| Tool | What it does | Policy |
|---|---|---|
| `mfa_check` | Review MFA registration per active account and list admins without strong MFA, accounts without MFA, exclusions, weak methods, shared accounts and unused MFA. | runs |
| `mfa_explain` | Every finding for one account. | runs |
| `mfa_write_report` | Write mfa-coverage.csv (one row per finding, with blank owner and decision columns) and mfa-coverage.html into out_dir (default fairwire-out/mfa). | runs |
| `mfa_draft_identity_note` | Write drafts/identity_note-<date>.md: the open findings at or above min_severity (default medium), each with what to do, addressed to identity and security team. | asks first (Auto can be opted in) |
| `mfa_request_send` | After one named human click (even in Auto), record that the reviewed identity note draft is approved in identity_note-requests.csv. | one named click, even in Auto (`binding_send`) |
| `mfa_recall` | Search this agent's own memory of the customer's setup: accepted facts (in use) and facts waiting for a person. | runs |
| `mfa_learn` | Propose one fact about the customer's setup for this agent to remember. | runs |
| `mfa_accept_learning` | A named person accepts or rejects a fact waiting in this agent's memory. | one named click, even in Auto (`accept_learning`) |
| `mfa_retire_memory` | A named person stops an accepted fact from applying. | one named click, even in Auto (`accept_learning`) |
| `idp_change_policy` | Fairwire MFA Coverage never changes a conditional access or MFA policy. | refused |
| `idp_reset_methods` | Fairwire MFA Coverage never resets or removes anyone's authentication methods. | refused |

Any tool name not in this table is blocked, including names a model invents. `refused` tools are listed so a model can see they exist and are refused.

## Columns it reads

Table inputs can be CSV, TSV, semicolon- or pipe-separated text, Excel `.xlsx`, JSON or JSONL. Columns are matched by the agent's own name, then by the English names below, then by their names in German, French, Spanish, Portuguese, Italian, Japanese, Chinese and Korean. Dates become `YYYY-MM-DD`; amounts and counts are read with either decimal mark. Every result lists under `sources` how each file was read.

### Accounts and MFA methods (`users`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `user` (required) | text | User principal name, UPN, User, Username, Login, Email | Benutzer, Utilisateur, ユーザー, 用户 |
| `display_name` | text | Display name, Name, Full Name | - |
| `enabled` | text | Account enabled, Enabled, Status, Active, Sign-in allowed | Aktiviert, Activé, 有効, 已启用 |
| `user_type` | text | User type, Type, Account Type, Recipient Type | - |
| `is_admin` | text | Is admin, Admin, Privileged, Has admin role, Administrator | - |
| `mfa_registered` | text | Is MFA registered, MFA Registered, MFA Enrolled, Multifactor, MFA Status | - |
| `methods` | text | Methods registered, Methods, Authentication Methods, Factors, Enrolled Factors | - |
| `excluded` | text | Excluded from MFA, MFA Exclusion, Excluded, Policy Exclusion | - |
| `last_sign_in` | date | Last sign-in, Last Sign In, Last Login, Last Activity | Letzte Anmeldung, Dernière connexion, 最終ログイン, 最后登录 |
| `last_mfa` | date | Last MFA, Last MFA Use, Last Second Factor, Last strong auth | - |
| `department` | text | Department, Team, Division | Abteilung, Département, 部署, 部门 |

Named exports recognised by their column names:

| System | Export | Recognised by | Layout checked against vendor docs |
|---|---|---|---|
| Microsoft Entra ID | User registration details (authentication methods) exported as CSV | User principal name, Is MFA registered | no |

Where a layout says "checked", its column names were compared with the vendor's documentation on that date. The other layouts were written from knowledge of the export and were not checked. None was tested against a live account.

### Files from other countries

A German export in Windows-1252 with semicolons, `1.234,56` and `03.11.2026`, or a Japanese one in Shift_JIS with `2026/11/03`, is read the same way as the English file. [`fixtures/intl/`](fixtures/intl) has both versions of the demo data, and the eval cases `intl-de-*` and `intl-ja-*` require the same results as the English case. Columns named differently? Run `npx fairwire-mfa-coverage inspect <file>` (names and shapes only, never values) and name them in `fairwire-sources.json`:

```json
{ "files": { "exports/devices.csv": { "columns": { "host": "Gerätename" }, "date_order": "dmy" } } }
```

## Memory

fairwire-mfa-coverage can remember facts about your setup so the next run does not have to be told again. `mfa_learn` only proposes a fact; it changes nothing until a named person accepts it with `mfa_accept_learning`, which is one click even in Auto. Facts live in one hash-chained file per agent under `.fairwire/memory/`; if the chain does not verify, no fact is used. Credentials, personal identifiers and text that reads like instructions to an AI are refused. Run without memory with `--no-memory`.

| Kind | What an accepted fact changes |
|---|---|
| `known_exception` | that finding is listed under "Accepted as known" instead of as open, until review_by (when given) has passed. |
| `note` | nothing (shown by recall only) |

```bash
fairwire-mfa-coverage memory list
fairwire-mfa-coverage memory accept MEM-1a2b3c4d5e6f --as "Your Name"
fairwire-mfa-coverage memory retire MEM-1a2b3c4d5e6f --as "Your Name" --reason "rule removed"
```

## Install

Node 20 or newer. No other dependencies.

```bash
npx -y fairwire-mfa-coverage demo
npx -y fairwire-mfa-coverage mcp --root /path/to/your/files
```

Claude Desktop, Cursor and other MCP hosts:

```json
{
  "mcpServers": {
    "fairwire-mfa-coverage": {
      "command": "npx",
      "args": [
        "-y",
        "fairwire-mfa-coverage",
        "mcp",
        "--root",
        "/path/to/your/files"
      ]
    }
  }
}
```

Claude Code: `claude mcp add fairwire-mfa-coverage -- npx -y fairwire-mfa-coverage mcp --root .`, or install the `fairwire-mfa-coverage` plugin from this repository's marketplace.

## Modes and approvals

- **Review** (`--mode review`): reads and reports only.
- **Assist** (default): the policy above. A tool that asks returns an `approval_id`; a person approves it once with `fairwire-mfa-coverage approve <id> --as "Your Name"` (or on the local approvals page, `fairwire-mfa-coverage approvals`), and the same call is repeated.
- **Auto** (`--mode auto --auto <tool,...>`): opt-in per tool, with step caps and a kill switch (`fairwire-mfa-coverage kill`). Paying, sending, posting to a ledger or a live system and accepting a learned fact stay **one named click even in Auto**; an approval is tied to the sha256 of the reviewed draft, so a changed draft needs a new click.

## CLI

```bash
fairwire-mfa-coverage tools                 # every tool, its policy and arguments
fairwire-mfa-coverage sources               # the columns each input is read from
fairwire-mfa-coverage inspect <file>        # how a file would be read (names and shapes, never values)
fairwire-mfa-coverage call mfa_check '{"users":"<users>"}'
fairwire-mfa-coverage eval                  # the private eval cases on the fictional fixtures
fairwire-mfa-coverage demo
```

## Audit log and data

Every call is written to `.fairwire/audit.jsonl` under the root: hash-chained JSON lines, with arguments stored as a hash, signed with an Ed25519 key when you configure one. Everything runs on your machine on files you choose. No network calls, no telemetry, no credentials. The bundled fixtures are fictional.

<!-- generated:end -->

## Limits

- Reads only the files you export and give it. It does not log in to a firewall, switch, controller, cloud console, identity provider or any other live system.
- Registration is not enforcement: an account can have MFA registered and still sign in without it where a policy allows that. Pair this with the sign-in log review (fairwire-sign-in-logs).
- Thresholds are working defaults in a settings file you control; they are not a vendor rule, a requirement of any standard or a security guarantee.
- Results returned to the AI model have the names of people, sign-in names, e-mail addresses, phone numbers and client addresses masked. The files written here keep the real values: keep them in a secure folder.
- It changes nothing on a live device, firewall, DNS zone, directory or cloud account. Every change it suggests is a draft that one named person applies.
- Export layouts were written from knowledge of common exports and have not been tested on live customer accounts. Run `inspect` on a new export and name columns in `fairwire-sources.json` when they differ.

## Licence

MIT. Fictional data only in `fixtures/`.
