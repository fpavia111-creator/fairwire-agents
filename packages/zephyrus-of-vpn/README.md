# Zephyrus of Vpn

VPN and remote-access log review: sign-ins from countries outside your list, the same account in two far-apart places at once, failed-login bursts, sessions longer than your limit, accounts of leavers still connecting, shared accounts and old client versions. Names masked for the model. Drafts notes; never disables an account.

Part of **Fairwire**, the IT and network family of [Mythos Machines](https://fair-agents.com) agents. The software is free (MIT); you pay a fixed price for the setup on your files. It reads files your IT team exports, on your own computer, and drafts notes. Every change to a live device, firewall, DNS zone, directory or cloud account stays one named person's click.

## What it checks

| Finding | What it means |
|---|---|
| `leaver_connected` | Someone on your leavers list connected after their last day. |
| `two_places_at_once` | One account connected from two countries within a time no one could travel. |
| `country_not_allowed` | A successful connection from a country outside your list. |
| `failed_login_burst` | Many failed sign-ins for one account in a few minutes (password guessing, or a stale saved password). |
| `shared_account` | One account had overlapping sessions from different addresses (a shared or stolen login). |
| `long_session` | A session longer than your limit. |
| `old_client` | A VPN client older than the version you require. |

Findings come back worst first (high, medium, low). A finding a named person has reviewed can be accepted as known, with a reason and a date to look again; it then moves to "Accepted as known" instead of counting as open.

## Settings

Pass a settings file with `settings`. Every setting is optional; a misspelt setting is refused by name.

| Setting | What it does |
|---|---|
| `allowed_countries` | Countries people may connect from, as the export writes them (no check when empty) |
| `travel_hours` | Hours within which connections from two countries are flagged (default 2) |
| `burst_failures` | Failed sign-ins for one account that make a burst (default 10) |
| `burst_minutes` | Minutes the burst must fall within (default 15) |
| `max_session_hours` | Longest acceptable session in hours (default 24) |
| `min_client_version` | Oldest VPN client version you accept, e.g. "5.0" (no check when empty) |

## What it never does

- `vpn_disconnect_session` is refused: Zephyrus never disconnects a session or disables an account; the identity owner does.
- `gateway_block_country` is refused: Zephyrus never changes the VPN gateway.
- `zephyrus_request_send` waits for one named person's click, even in Auto (`binding_send`).
- `zephyrus_accept_learning` waits for one named person's click, even in Auto (`accept_learning`).
- `zephyrus_retire_memory` waits for one named person's click, even in Auto (`accept_learning`).
- `vpn_disconnect_session` waits for one named person's click, even in Auto (`revoke_access`).
- `gateway_block_country` waits for one named person's click, even in Auto (`production_deploy`).

<!-- generated:start -->

## A demo run

`npx -y zephyrus-of-vpn demo` runs the agent on the fictional files in [`fixtures/`](fixtures) in a temporary folder. Captured output:

```text
Zephyrus of Vpn demo (fictional data) in a temporary folder, Auto on for the draft only

▶ Check the exported files
  status: executed  decision: allow
  26 session(s) and sign-in(s) for 9 account(s), 12 failed, from 3 countr(ies): 7 open finding(s), 2 high.
    high    leaver_connected           USR-7f4ad3cd
    high    two_places_at_once         USR-bc8278d5
    medium  country_not_allowed        USR-bc8278d5
    medium  failed_login_burst         USR-cbbebe42
    medium  shared_account             USR-56e1a00f
    low     long_session               USR-eec8b717
    low     old_client                 USR-20e1b909

▶ Explain one finding
  status: executed  decision: allow
  high two_places_at_once: USR-bc8278d5 connected from US at 2026-11-16 09:00:00 and from RO at 2026-11-16 09:40:00. Fix: Ask the person; if it was not them, reset the password and revoke their sessions.
medium country_not_allowed: USR-bc8278d5 connected 1 time(s) from RO. Fix: Confirm the trip with the person or their manager; block the country at the gateway if no one travels there.

▶ Write the worklist
  status: executed  decision: allow
  Remote access review written: 26 session(s) and sign-in(s) for 9 account(s), 12 failed, from 3 countr(ies): 7 open finding(s), 2 high.

▶ Draft the note for a person
  status: executed  decision: allow  (auto)
  access note 2026-11-18 drafted with 1 open marker(s) ([TO CONFIRM security and identity team]). Nothing was sent.

▶ Auto: approving it still waits for one named person
  status: needs_approval  decision: ask
  reason: binding_send stays one-click, even in Auto

▶ The agent tries to change the live system itself
  status: blocked  decision: block
  reason: Zephyrus never disconnects a session or disables an account; the identity owner does.
```

## Tools

| Tool | What it does | Policy |
|---|---|---|
| `zephyrus_check` | Review the VPN log by account and list leavers connecting, impossible travel, countries outside your list, failed bursts, shared accounts, long sessions and old clients. | runs |
| `zephyrus_explain` | Every finding for one account. | runs |
| `zephyrus_write_report` | Write zephyrus-vpn.csv (one row per finding, with blank owner and decision columns) and zephyrus-vpn.html into out_dir (default fairwire-out/zephyrus). | runs |
| `zephyrus_draft_access_note` | Write drafts/access_note-<date>.md: the open findings at or above min_severity (default medium), each with what to do, addressed to security and identity team. | asks first (Auto can be opted in) |
| `zephyrus_request_send` | After one named human click (even in Auto), record that the reviewed access note draft is approved in access_note-requests.csv. | one named click, even in Auto (`binding_send`) |
| `zephyrus_recall` | Search this agent's own memory of the customer's setup: accepted facts (in use) and facts waiting for a person. | runs |
| `zephyrus_learn` | Propose one fact about the customer's setup for this agent to remember. | runs |
| `zephyrus_accept_learning` | A named person accepts or rejects a fact waiting in this agent's memory. | one named click, even in Auto (`accept_learning`) |
| `zephyrus_retire_memory` | A named person stops an accepted fact from applying. | one named click, even in Auto (`accept_learning`) |
| `vpn_disconnect_session` | Zephyrus never disconnects a session or disables an account; the identity owner does. | refused |
| `gateway_block_country` | Zephyrus never changes the VPN gateway. | refused |

Any tool name not in this table is blocked, including names a model invents. `refused` tools are listed so a model can see they exist and are refused.

## Columns it reads

Table inputs can be CSV, TSV, semicolon- or pipe-separated text, Excel `.xlsx`, JSON or JSONL. Columns are matched by the agent's own name, then by the English names below, then by their names in German, French, Spanish, Portuguese, Italian, Japanese, Chinese and Korean. Dates become `YYYY-MM-DD`; amounts and counts are read with either decimal mark. Every result lists under `sources` how each file was read.

### VPN sessions (`sessions`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `user` (required) | text | User, Username, User Name, Login, Account, UPN | Benutzer, Utilisateur, ユーザー, 用户 |
| `connected_at` (required) | date and time | Connected, Start, Start Time, Login Time, Session Start, Timestamp | - |
| `disconnected_at` | date and time | Disconnected, End, End Time, Logout Time, Session End | - |
| `client_ip` | text | Client IP, Public IP, Source IP, Remote IP, Real IP, Outside IP | IP-Adresse, Adresse IP, IPアドレス, IP地址 |
| `country` | text | Country, Geo, Location, Country Code, Source Country | Land, Pays, 国, 国家 |
| `result` | text | Result, Status, Outcome, Auth Result, Event | - |
| `client_version` | text | Client Version, Agent Version, Version, Client | - |
| `gateway` | text | Gateway, Portal, Concentrator, Server | - |

### Leavers (`leavers`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `user` (required) | text | User, Username, Login, Account, UPN, Email | Benutzer, Utilisateur, ユーザー, 用户 |
| `end_date` (required) | date | End Date, Last Day, Termination Date, Leaving Date, Exit Date | Austrittsdatum, Date de sortie, 退職日, 离职日期 |

### Files from other countries

A German export in Windows-1252 with semicolons, `1.234,56` and `03.11.2026`, or a Japanese one in Shift_JIS with `2026/11/03`, is read the same way as the English file. [`fixtures/intl/`](fixtures/intl) has both versions of the demo data, and the eval cases `intl-de-*` and `intl-ja-*` require the same results as the English case. Columns named differently? Run `npx zephyrus-of-vpn inspect <file>` (names and shapes only, never values) and name them in `fairwire-sources.json`:

```json
{ "files": { "exports/devices.csv": { "columns": { "host": "Gerätename" }, "date_order": "dmy" } } }
```

## Memory

zephyrus-of-vpn can remember facts about your setup so the next run does not have to be told again. `zephyrus_learn` only proposes a fact; it changes nothing until a named person accepts it with `zephyrus_accept_learning`, which is one click even in Auto. Facts live in one hash-chained file per agent under `.fairwire/memory/`; if the chain does not verify, no fact is used. Credentials, personal identifiers and text that reads like instructions to an AI are refused. Run without memory with `--no-memory`.

| Kind | What an accepted fact changes |
|---|---|
| `known_exception` | that finding is listed under "Accepted as known" instead of as open, until review_by (when given) has passed. |
| `note` | nothing (shown by recall only) |

```bash
zephyrus-of-vpn memory list
zephyrus-of-vpn memory accept MEM-1a2b3c4d5e6f --as "Your Name"
zephyrus-of-vpn memory retire MEM-1a2b3c4d5e6f --as "Your Name" --reason "rule removed"
```

## Install

Node 20 or newer. No other dependencies.

```bash
npx -y zephyrus-of-vpn demo
npx -y zephyrus-of-vpn mcp --root /path/to/your/files
```

Claude Desktop, Cursor and other MCP hosts:

```json
{
  "mcpServers": {
    "zephyrus-of-vpn": {
      "command": "npx",
      "args": [
        "-y",
        "zephyrus-of-vpn",
        "mcp",
        "--root",
        "/path/to/your/files"
      ]
    }
  }
}
```

Claude Code: `claude mcp add zephyrus-of-vpn -- npx -y zephyrus-of-vpn mcp --root .`, or install the `zephyrus-of-vpn` plugin from this repository's marketplace.

## Modes and approvals

- **Review** (`--mode review`): reads and reports only.
- **Assist** (default): the policy above. A tool that asks returns an `approval_id`; a person approves it once with `zephyrus-of-vpn approve <id> --as "Your Name"` (or on the local approvals page, `zephyrus-of-vpn approvals`), and the same call is repeated.
- **Auto** (`--mode auto --auto <tool,...>`): opt-in per tool, with step caps and a kill switch (`zephyrus-of-vpn kill`). Paying, sending, posting to a ledger or a live system and accepting a learned fact stay **one named click even in Auto**; an approval is tied to the sha256 of the reviewed draft, so a changed draft needs a new click.

## CLI

```bash
zephyrus-of-vpn tools                 # every tool, its policy and arguments
zephyrus-of-vpn sources               # the columns each input is read from
zephyrus-of-vpn inspect <file>        # how a file would be read (names and shapes, never values)
zephyrus-of-vpn call zephyrus_check '{"sessions":"<sessions>"}'
zephyrus-of-vpn eval                  # the private eval cases on the fictional fixtures
zephyrus-of-vpn demo
```

## Audit log and data

Every call is written to `.fairwire/audit.jsonl` under the root: hash-chained JSON lines, with arguments stored as a hash, signed with an Ed25519 key when you configure one. Everything runs on your machine on files you choose. No network calls, no telemetry, no credentials. The bundled fixtures are fictional.

<!-- generated:end -->

## Limits

- Reads only the files you export and give it. It does not log in to a firewall, switch, controller, cloud console, identity provider or any other live system.
- Countries are the ones your gateway wrote; a VPN or mobile network can place a person in another country, so two countries is a question to ask, not proof.
- Thresholds are working defaults in a settings file you control; they are not a vendor rule, a requirement of any standard or a security guarantee.
- Results returned to the AI model have the names of people, sign-in names, e-mail addresses, phone numbers and client addresses masked. The files written here keep the real values: keep them in a secure folder.
- It changes nothing on a live device, firewall, DNS zone, directory or cloud account. Every change it suggests is a draft that one named person applies.
- Export layouts were written from knowledge of common exports and have not been tested on live customer accounts. Run `inspect` on a new export and name columns in `fairwire-sources.json` when they differ.

## Licence

MIT. Fictional data only in `fixtures/`.
