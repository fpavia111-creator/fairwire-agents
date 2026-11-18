# Angelia of Signins

Sign-in log review from Entra ID, Okta or Google exports: password spraying from one address, failed-login bursts, legacy protocols, sign-ins from countries outside your list, the same account in two far-apart places, sign-in attempts on disabled accounts and service accounts used interactively. Names masked for the model. Drafts notes; never blocks an account.

Part of **Fairwire**, the IT and network family of [Mythos Machines](https://fair-agents.com) agents. The software is free (MIT); you pay a fixed price for the setup on your files. It reads files your IT team exports, on your own computer, and drafts notes. Every change to a live device, firewall, DNS zone, directory or cloud account stays one named person's click.

## What it checks

| Finding | What it means |
|---|---|
| `password_spray` | One address failing to sign in to many different accounts in a short time (password spraying). |
| `success_after_failures` | A successful sign-in right after a run of failures for the same account (a guessed password?). |
| `two_places_at_once` | Successful sign-ins for one account from two countries within a time no one could travel. |
| `legacy_protocol` | A successful sign-in over a legacy protocol (IMAP, POP, SMTP AUTH, basic Exchange ActiveSync) that cannot do MFA. |
| `country_not_allowed` | A successful sign-in from a country outside your list. |
| `service_account_interactive` | A service account signing in interactively, as a person would. |
| `failed_burst` | Many failed sign-ins for one account with no success (a stale saved password or someone guessing). |
| `disabled_account_attempts` | Sign-in attempts on a disabled account. |

Findings come back worst first (high, medium, low). A finding a named person has reviewed can be accepted as known, with a reason and a date to look again; it then moves to "Accepted as known" instead of counting as open.

## Settings

Pass a settings file with `settings`. Every setting is optional; a misspelt setting is refused by name.

| Setting | What it does |
|---|---|
| `allowed_countries` | Countries people sign in from, as the log writes them (no check when empty) |
| `spray_users` | Distinct accounts one address must fail on to count as spraying (default 10) |
| `spray_minutes` | Window for the spraying check in minutes (default 60) |
| `burst_failures` | Failures for one account that make a burst (default 10) |
| `burst_minutes` | Window for a burst in minutes (default 30) |
| `travel_hours` | Hours within which two countries are flagged (default 2) |
| `service_accounts` | Service account names, or prefixes ending in * (default "svc-*") |

## What it never does

- `idp_block_user` is refused: Angelia never blocks an account, revokes sessions or resets a password.
- `idp_add_named_location` is refused: Angelia never changes sign-in policies or named locations.
- `angelia_request_send` waits for one named person's click, even in Auto (`binding_send`).
- `angelia_accept_learning` waits for one named person's click, even in Auto (`accept_learning`).
- `angelia_retire_memory` waits for one named person's click, even in Auto (`accept_learning`).
- `idp_block_user` waits for one named person's click, even in Auto (`revoke_access`).
- `idp_add_named_location` waits for one named person's click, even in Auto (`production_deploy`).

<!-- generated:start -->

## A demo run

`npx -y angelia-of-signins demo` runs the agent on the fictional files in [`fixtures/`](fixtures) in a temporary folder. Captured output:

```text
Angelia of Signins demo (fictional data) in a temporary folder, Auto on for the draft only

▶ Check the exported files
  status: executed  decision: allow
  44 sign-in(s) for 21 account(s) from 9 address(es), 35 failed: 8 open finding(s), 3 high.
    high    password_spray             IP-b2531b7c
    high    success_after_failures     USR-01bd91bd
    high    two_places_at_once         USR-b9c5a619
    medium  country_not_allowed        USR-b9c5a619
    medium  legacy_protocol            USR-c3aa97dc
    medium  service_account_interactive USR-8de9de6a
    low     disabled_account_attempts  USR-f60fac2a
    low     failed_burst               USR-03f6d344

▶ Explain one finding
  status: executed  decision: allow
  high two_places_at_once: USR-b9c5a619 signed in from US at 2026-11-16 09:00:00 and from RO at 2026-11-16 09:50:00. Fix: Ask the person; a VPN can explain it, a stolen session cannot.
medium country_not_allowed: USR-b9c5a619 signed in from RO. Fix: Confirm the trip; add a location-based policy if no one works from there.

▶ Write the worklist
  status: executed  decision: allow
  Sign-in log review written: 44 sign-in(s) for 21 account(s) from 9 address(es), 35 failed: 8 open finding(s), 3 high.

▶ Draft the note for a person
  status: executed  decision: allow  (auto)
  security note 2026-11-18 drafted with 1 open marker(s) ([TO CONFIRM security operations and identity team]). Nothing was sent.

▶ Auto: approving it still waits for one named person
  status: needs_approval  decision: ask
  reason: binding_send stays one-click, even in Auto

▶ The agent tries to change the live system itself
  status: blocked  decision: block
  reason: Angelia never blocks an account, revokes sessions or resets a password.
```

## Tools

| Tool | What it does | Policy |
|---|---|---|
| `angelia_check` | Review the sign-in log and list spraying, guessed passwords, impossible travel, legacy protocols, countries, service accounts, failed bursts and disabled-account attempts. | runs |
| `angelia_explain` | Every finding for one account or source address. | runs |
| `angelia_write_report` | Write angelia-signins.csv (one row per finding, with blank owner and decision columns) and angelia-signins.html into out_dir (default fairwire-out/angelia). | runs |
| `angelia_draft_security_note` | Write drafts/security_note-<date>.md: the open findings at or above min_severity (default medium), each with what to do, addressed to security operations and identity team. | asks first (Auto can be opted in) |
| `angelia_request_send` | After one named human click (even in Auto), record that the reviewed security note draft is approved in security_note-requests.csv. | one named click, even in Auto (`binding_send`) |
| `angelia_recall` | Search this agent's own memory of the customer's setup: accepted facts (in use) and facts waiting for a person. | runs |
| `angelia_learn` | Propose one fact about the customer's setup for this agent to remember. | runs |
| `angelia_accept_learning` | A named person accepts or rejects a fact waiting in this agent's memory. | one named click, even in Auto (`accept_learning`) |
| `angelia_retire_memory` | A named person stops an accepted fact from applying. | one named click, even in Auto (`accept_learning`) |
| `idp_block_user` | Angelia never blocks an account, revokes sessions or resets a password. | refused |
| `idp_add_named_location` | Angelia never changes sign-in policies or named locations. | refused |

Any tool name not in this table is blocked, including names a model invents. `refused` tools are listed so a model can see they exist and are refused.

## Columns it reads

Table inputs can be CSV, TSV, semicolon- or pipe-separated text, Excel `.xlsx`, JSON or JSONL. Columns are matched by the agent's own name, then by the English names below, then by their names in German, French, Spanish, Portuguese, Italian, Japanese, Chinese and Korean. Dates become `YYYY-MM-DD`; amounts and counts are read with either decimal mark. Every result lists under `sources` how each file was read.

### Sign-ins (`signins`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `at` (required) | date and time | Date (UTC), Date, Time, Timestamp, published, Created | - |
| `user` (required) | text | User principal name, User, Username, UPN, actor.alternateId, Account | Benutzer, Utilisateur, ユーザー, 用户 |
| `app` | text | Application, App, Resource, target.displayName, Service | Anwendung, Application, アプリケーション, 应用 |
| `client_ip` | text | IP address, IP Address, Client IP, client.ipAddress, Source IP | IP-Adresse, Adresse IP, IPアドレス, IP地址 |
| `country` | text | Location, Country, client.geographicalContext.country, Country/Region | Land, Pays, 国, 国家 |
| `result` (required) | text | Status, Result, outcome.result, Outcome, Sign-in status | - |
| `failure_reason` | text | Failure reason, Reason, outcome.reason, Error | - |
| `client_app` | text | Client app, Client App, Protocol, client.userAgent.rawUserAgent, Authentication Protocol | - |
| `interactive` | text | Interactive, Sign-in type, Is interactive, Login Type | - |

Named exports recognised by their column names:

| System | Export | Recognised by | Layout checked against vendor docs |
|---|---|---|---|
| Microsoft Entra ID | Sign-in logs downloaded as CSV | User principal name, Application, IP address, Status | no |
| Okta | System Log exported as CSV | actor.alternateId, eventType, outcome.result | no |

Where a layout says "checked", its column names were compared with the vendor's documentation on that date. The other layouts were written from knowledge of the export and were not checked. None was tested against a live account.

### Files from other countries

A German export in Windows-1252 with semicolons, `1.234,56` and `03.11.2026`, or a Japanese one in Shift_JIS with `2026/11/03`, is read the same way as the English file. [`fixtures/intl/`](fixtures/intl) has both versions of the demo data, and the eval cases `intl-de-*` and `intl-ja-*` require the same results as the English case. Columns named differently? Run `npx angelia-of-signins inspect <file>` (names and shapes only, never values) and name them in `fairwire-sources.json`:

```json
{ "files": { "exports/devices.csv": { "columns": { "host": "Gerätename" }, "date_order": "dmy" } } }
```

## Memory

angelia-of-signins can remember facts about your setup so the next run does not have to be told again. `angelia_learn` only proposes a fact; it changes nothing until a named person accepts it with `angelia_accept_learning`, which is one click even in Auto. Facts live in one hash-chained file per agent under `.fairwire/memory/`; if the chain does not verify, no fact is used. Credentials, personal identifiers and text that reads like instructions to an AI are refused. Run without memory with `--no-memory`.

| Kind | What an accepted fact changes |
|---|---|
| `known_exception` | that finding is listed under "Accepted as known" instead of as open, until review_by (when given) has passed. |
| `note` | nothing (shown by recall only) |

```bash
angelia-of-signins memory list
angelia-of-signins memory accept MEM-1a2b3c4d5e6f --as "Your Name"
angelia-of-signins memory retire MEM-1a2b3c4d5e6f --as "Your Name" --reason "rule removed"
```

## Install

Node 20 or newer. No other dependencies.

```bash
npx -y angelia-of-signins demo
npx -y angelia-of-signins mcp --root /path/to/your/files
```

Claude Desktop, Cursor and other MCP hosts:

```json
{
  "mcpServers": {
    "angelia-of-signins": {
      "command": "npx",
      "args": [
        "-y",
        "angelia-of-signins",
        "mcp",
        "--root",
        "/path/to/your/files"
      ]
    }
  }
}
```

Claude Code: `claude mcp add angelia-of-signins -- npx -y angelia-of-signins mcp --root .`, or install the `angelia-of-signins` plugin from this repository's marketplace.

## Modes and approvals

- **Review** (`--mode review`): reads and reports only.
- **Assist** (default): the policy above. A tool that asks returns an `approval_id`; a person approves it once with `angelia-of-signins approve <id> --as "Your Name"` (or on the local approvals page, `angelia-of-signins approvals`), and the same call is repeated.
- **Auto** (`--mode auto --auto <tool,...>`): opt-in per tool, with step caps and a kill switch (`angelia-of-signins kill`). Paying, sending, posting to a ledger or a live system and accepting a learned fact stay **one named click even in Auto**; an approval is tied to the sha256 of the reviewed draft, so a changed draft needs a new click.

## CLI

```bash
angelia-of-signins tools                 # every tool, its policy and arguments
angelia-of-signins sources               # the columns each input is read from
angelia-of-signins inspect <file>        # how a file would be read (names and shapes, never values)
angelia-of-signins call angelia_check '{"signins":"<signins>"}'
angelia-of-signins eval                  # the private eval cases on the fictional fixtures
angelia-of-signins demo
```

## Audit log and data

Every call is written to `.fairwire/audit.jsonl` under the root: hash-chained JSON lines, with arguments stored as a hash, signed with an Ed25519 key when you configure one. Everything runs on your machine on files you choose. No network calls, no telemetry, no credentials. The bundled fixtures are fictional.

<!-- generated:end -->

## Limits

- Reads only the files you export and give it. It does not log in to a firewall, switch, controller, cloud console, identity provider or any other live system.
- Countries come from the identity provider's address lookup, which can be wrong for mobile networks and VPNs; two countries is a question, not proof.
- The log shows what the identity provider saw; sign-ins to apps that do not use it are not here.
- Thresholds are working defaults in a settings file you control; they are not a vendor rule, a requirement of any standard or a security guarantee.
- Results returned to the AI model have the names of people, sign-in names, e-mail addresses, phone numbers and client addresses masked. The files written here keep the real values: keep them in a secure folder.
- It changes nothing on a live device, firewall, DNS zone, directory or cloud account. Every change it suggests is a draft that one named person applies.
- Export layouts were written from knowledge of common exports and have not been tested on live customer accounts. Run `inspect` on a new export and name columns in `fairwire-sources.json` when they differ.

## Licence

MIT. Fictional data only in `fixtures/`.
