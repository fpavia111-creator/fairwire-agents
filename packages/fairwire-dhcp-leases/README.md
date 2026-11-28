# Fairwire DHCP Leases

DHCP lease review: scopes near exhaustion, the same address leased to two devices, one device leasing in several scopes, reservations inside the dynamic range, leases from a DHCP server you do not run, and devices missing from your asset list. Drafts a note; never changes a scope.

Part of **Fairwire**, the IT and network family of [Fair Agents](https://fair-agents.com) agents. The software is free (MIT); you pay a fixed price for the setup on your files. It reads files your IT team exports, on your own computer, and drafts notes. Every change to a live device, firewall, DNS zone, directory or cloud account stays one named person's click.

## What it checks

| Finding | What it means |
|---|---|
| `rogue_dhcp_server` | Leases handed out by a DHCP server that is not on your list (a home router or test box plugged in by mistake can break a whole floor). |
| `ip_conflict` | One address leased to two different devices at the same time. |
| `scope_near_exhaustion` | A scope whose active leases fill more than your share of its dynamic range. |
| `reservation_in_dynamic_range` | A reservation inside the range the server hands out dynamically (it can collide with a lease). |
| `unknown_devices` | Devices holding leases that are not in your asset list. |
| `mac_in_many_scopes` | One device holding leases in several scopes at once. |
| `random_mac_share` | A scope where many leases go to private (random) MAC addresses, which use up addresses faster and make devices hard to track. |

Findings come back worst first (high, medium, low). A finding a named person has reviewed can be accepted as known, with a reason and a date to look again; it then moves to "Accepted as known" instead of counting as open.

## Settings

Pass a settings file with `settings`. Every setting is optional; a misspelt setting is refused by name.

| Setting | What it does |
|---|---|
| `authorized_servers` | Addresses or names of your own DHCP servers (no rogue check when empty) |
| `exhaustion_pct` | Share of a dynamic range in use above which a scope is flagged (default 85) |
| `random_share_pct` | Share of leases with private MAC addresses above which a scope is noted (default 30) |

## What it never does

- `dhcp_change_scope` is refused: Fairwire DHCP Leases never changes a scope, reservation or lease.
- `switch_block_port` is refused: Fairwire DHCP Leases never blocks the port of a rogue server; a person does.
- `dhcp_request_send` waits for one named person's click, even in Auto (`binding_send`).
- `dhcp_accept_learning` waits for one named person's click, even in Auto (`accept_learning`).
- `dhcp_retire_memory` waits for one named person's click, even in Auto (`accept_learning`).
- `dhcp_change_scope` waits for one named person's click, even in Auto (`production_deploy`).
- `switch_block_port` waits for one named person's click, even in Auto (`production_deploy`).

<!-- generated:start -->

## A demo run

`npx -y fairwire-dhcp-leases demo` runs the agent on the fictional files in [`fixtures/`](fixtures) in a temporary folder. Captured output:

```text
Fairwire DHCP Leases demo (fictional data) in a temporary folder, Auto on for the draft only

▶ Check the exported files
  status: executed  decision: allow
  98 lease(s), 94 active, 93 device(s) in 2 scope(s): 8 open finding(s), 3 high.
    high    ip_conflict                10.10.1.120
    high    ip_conflict                10.10.1.150
    high    rogue_dhcp_server          192.168.0.1
    medium  scope_near_exhaustion      10.10.1.0/24
    low     mac_in_many_scopes         da:1a:2b:00:00:05
    low     reservation_in_dynamic_range 10.10.1.0/24
    low     unknown_devices            10.10.1.0/24
    info    random_mac_share           10.10.1.0/24

▶ Explain one finding
  status: executed  decision: allow
  medium scope_near_exhaustion: Scope 10.10.1.0/24 (Users floor 1) has 88% of its 100 dynamic addresses in use. Fix: Widen the range, shorten the lease time, or move guests and phones to their own scope.
low reservation_in_dynamic_range: Reservation 10.10.1.120 (badge-reader) sits inside the dynamic range of 10.10.1.0/24. Fix: Move reservations outside the dynamic range, or exclude the address from the range.
low unknown_devices: 5 device(s) with leases in 10.10.1.0/24 are not in your asset list (for example 00:1a:2b:00:00:53, 00:1a:2b:00:00:54, 00:1a:2b:00:00:55). Fix: Identify them by host name and switch port, then add them to the asset list or remove them.
info random_mac_share: 33.3% of the 90 leases in 10.10.1.0/24 go to private (random) MAC addresses. Fix: Shorter lease times keep these from filling the scope; device-based rules need another identifier.

▶ Write the worklist
  status: executed  decision: allow
  DHCP lease review written: 98 lease(s), 94 active, 93 device(s) in 2 scope(s): 8 open finding(s), 3 high.

▶ Draft the note for a person
  status: executed  decision: allow  (auto)
  network note 2026-11-18 drafted with 1 open marker(s) ([TO CONFIRM network team]). Nothing was sent.

▶ Auto: approving it still waits for one named person
  status: needs_approval  decision: ask
  reason: binding_send stays one-click, even in Auto

▶ The agent tries to change the live system itself
  status: blocked  decision: block
  reason: Fairwire DHCP Leases never changes a scope, reservation or lease.
```

## Tools

| Tool | What it does | Policy |
|---|---|---|
| `dhcp_check` | Review active leases and list rogue servers, address conflicts, nearly full scopes, misplaced reservations, unknown devices and devices in several scopes. | runs |
| `dhcp_explain` | Every finding for one scope, address, device or server. | runs |
| `dhcp_write_report` | Write dhcp-leases.csv (one row per finding, with blank owner and decision columns) and dhcp-leases.html into out_dir (default fairwire-out/dhcp). | runs |
| `dhcp_draft_network_note` | Write drafts/network_note-<date>.md: the open findings at or above min_severity (default medium), each with what to do, addressed to network team. | asks first (Auto can be opted in) |
| `dhcp_request_send` | After one named human click (even in Auto), record that the reviewed network note draft is approved in network_note-requests.csv. | one named click, even in Auto (`binding_send`) |
| `dhcp_recall` | Search this agent's own memory of the customer's setup: accepted facts (in use) and facts waiting for a person. | runs |
| `dhcp_learn` | Propose one fact about the customer's setup for this agent to remember. | runs |
| `dhcp_accept_learning` | A named person accepts or rejects a fact waiting in this agent's memory. | one named click, even in Auto (`accept_learning`) |
| `dhcp_retire_memory` | A named person stops an accepted fact from applying. | one named click, even in Auto (`accept_learning`) |
| `dhcp_change_scope` | Fairwire DHCP Leases never changes a scope, reservation or lease. | refused |
| `switch_block_port` | Fairwire DHCP Leases never blocks the port of a rogue server; a person does. | refused |

Any tool name not in this table is blocked, including names a model invents. `refused` tools are listed so a model can see they exist and are refused.

## Columns it reads

Table inputs can be CSV, TSV, semicolon- or pipe-separated text, Excel `.xlsx`, JSON or JSONL. Columns are matched by the agent's own name, then by the English names below, then by their names in German, French, Spanish, Portuguese, Italian, Japanese, Chinese and Korean. Dates become `YYYY-MM-DD`; amounts and counts are read with either decimal mark. Every result lists under `sources` how each file was read.

### DHCP leases (`leases`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `ip` (required) | text | IP Address, Client IP Address, Address, IP, Leased IP | IP-Adresse, Adresse IP, IPアドレス, IP地址 |
| `mac` (required) | text | MAC Address, Unique ID, Client ID, Hardware Address, MAC | MAC-Adresse, Adresse MAC, MACアドレス, MAC地址 |
| `hostname` | text | Name, Host Name, Hostname, Client Name, Device Name | Hostname, Nom d’hôte, ホスト名, 主机名 |
| `scope` | text | Scope, Scope ID, Subnet, Pool, Network | - |
| `lease_expires` | date and time | Lease Expiration, Expires, Lease Expiry, End, Expiry | - |
| `server` | text | Server, DHCP Server, Served By, Server IP | Hostname, Nom d’hôte, ホスト名, 主机名 |
| `reservation` | text | Reservation, Reserved, Type, Static | - |

Named exports recognised by their column names:

| System | Export | Recognised by | Layout checked against vendor docs |
|---|---|---|---|
| Windows Server DHCP | Address leases exported from the DHCP console | Client IP Address, Name, Lease Expiration, Unique ID | no |

Where a layout says "checked", its column names were compared with the vendor's documentation on that date. The other layouts were written from knowledge of the export and were not checked. None was tested against a live account.

### DHCP scopes (`scopes`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `scope` (required) | text | Scope, Scope ID, Subnet, Network, Name | - |
| `start` (required) | text | Start, Start Address, Range Start, First IP | Startzeit, Heure de début, 開始日時, 开始时间 |
| `end` (required) | text | End, End Address, Range End, Last IP | Endzeit, Heure de fin, 終了日時, 结束时间 |
| `name` | text | Scope Name, Description | Name, Nom, 名前, 名称 |

### Asset list (`assets`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `mac` (required) | text | MAC Address, MAC, Wi-Fi MAC, Ethernet MAC | MAC-Adresse, Adresse MAC, MACアドレス, MAC地址 |
| `hostname` | text | Name, Hostname, Device Name, Asset Name | Hostname, Nom d’hôte, ホスト名, 主机名 |

### Files from other countries

A German export in Windows-1252 with semicolons, `1.234,56` and `03.11.2026`, or a Japanese one in Shift_JIS with `2026/11/03`, is read the same way as the English file. [`fixtures/intl/`](fixtures/intl) has both versions of the demo data, and the eval cases `intl-de-*` and `intl-ja-*` require the same results as the English case. Columns named differently? Run `npx fairwire-dhcp-leases inspect <file>` (names and shapes only, never values) and name them in `fairwire-sources.json`:

```json
{ "files": { "exports/devices.csv": { "columns": { "host": "Gerätename" }, "date_order": "dmy" } } }
```

## Memory

fairwire-dhcp-leases can remember facts about your setup so the next run does not have to be told again. `dhcp_learn` only proposes a fact; it changes nothing until a named person accepts it with `dhcp_accept_learning`, which is one click even in Auto. Facts live in one hash-chained file per agent under `.fairwire/memory/`; if the chain does not verify, no fact is used. Credentials, personal identifiers and text that reads like instructions to an AI are refused. Run without memory with `--no-memory`.

| Kind | What an accepted fact changes |
|---|---|
| `known_exception` | that finding is listed under "Accepted as known" instead of as open, until review_by (when given) has passed. |
| `note` | nothing (shown by recall only) |

```bash
fairwire-dhcp-leases memory list
fairwire-dhcp-leases memory accept MEM-1a2b3c4d5e6f --as "Your Name"
fairwire-dhcp-leases memory retire MEM-1a2b3c4d5e6f --as "Your Name" --reason "rule removed"
```

## Install

Node 20 or newer. No other dependencies.

```bash
npx -y fairwire-dhcp-leases demo
npx -y fairwire-dhcp-leases mcp --root /path/to/your/files
```

Claude Desktop, Cursor and other MCP hosts:

```json
{
  "mcpServers": {
    "fairwire-dhcp-leases": {
      "command": "npx",
      "args": [
        "-y",
        "fairwire-dhcp-leases",
        "mcp",
        "--root",
        "/path/to/your/files"
      ]
    }
  }
}
```

Claude Code: `claude mcp add fairwire-dhcp-leases -- npx -y fairwire-dhcp-leases mcp --root .`, or install the `fairwire-dhcp-leases` plugin from this repository's marketplace.

## Modes and approvals

- **Review** (`--mode review`): reads and reports only.
- **Assist** (default): the policy above. A tool that asks returns an `approval_id`; a person approves it once with `fairwire-dhcp-leases approve <id> --as "Your Name"` (or on the local approvals page, `fairwire-dhcp-leases approvals`), and the same call is repeated.
- **Auto** (`--mode auto --auto <tool,...>`): opt-in per tool, with step caps and a kill switch (`fairwire-dhcp-leases kill`). Paying, sending, posting to a ledger or a live system and accepting a learned fact stay **one named click even in Auto**; an approval is tied to the sha256 of the reviewed draft, so a changed draft needs a new click.

## CLI

```bash
fairwire-dhcp-leases tools                 # every tool, its policy and arguments
fairwire-dhcp-leases sources               # the columns each input is read from
fairwire-dhcp-leases inspect <file>        # how a file would be read (names and shapes, never values)
fairwire-dhcp-leases call dhcp_check '{"leases":"<leases>"}'
fairwire-dhcp-leases eval                  # the private eval cases on the fictional fixtures
fairwire-dhcp-leases demo
```

## Audit log and data

Every call is written to `.fairwire/audit.jsonl` under the root: hash-chained JSON lines, with arguments stored as a hash, signed with an Ed25519 key when you configure one. Everything runs on your machine on files you choose. No network calls, no telemetry, no credentials. The bundled fixtures are fictional.

<!-- generated:end -->

## Limits

- Reads only the files you export and give it. It does not log in to a firewall, switch, controller, cloud console, identity provider or any other live system.
- Leases are active when they have not expired by the as-of date; a device that left without releasing its lease still counts until then.
- Thresholds are working defaults in a settings file you control; they are not a vendor rule, a requirement of any standard or a security guarantee.
- It changes nothing on a live device, firewall, DNS zone, directory or cloud account. Every change it suggests is a draft that one named person applies.
- Export layouts were written from knowledge of common exports and have not been tested on live customer accounts. Run `inspect` on a new export and name columns in `fairwire-sources.json` when they differ.

## License

MIT. Fictional data only in `fixtures/`.
