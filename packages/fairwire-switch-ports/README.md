# Fairwire Switch Ports

Switch port and VLAN inventory review: user ports in VLAN 1, trunks that carry every VLAN, half duplex and CRC errors, enabled ports unused for months, ports with no description, access ports in a VLAN your plan does not allow, and VLANs nobody uses. Drafts a change request; never changes a switch.

Part of **Fairwire**, the IT and network family of [Mythos Machines](https://fair-agents.com) agents. The software is free (MIT); you pay a fixed price for the setup on your files. It reads files your IT team exports, on your own computer, and drafts notes. Every change to a live device, firewall, DNS zone, directory or cloud account stays one named person's click.

## What it checks

| Finding | What it means |
|---|---|
| `trunk_all_vlans` | A trunk port that carries every VLAN instead of the ones it needs. |
| `access_in_vlan1` | An access port in use in VLAN 1, the default VLAN that should carry no user traffic. |
| `half_duplex` | A port that came up at half duplex (usually a speed or duplex mismatch that slows the link). |
| `crc_errors` | A port with more CRC errors than your limit (a bad cable, transceiver or port). |
| `vlan_not_in_plan` | An access port in a VLAN that is not in your plan. |
| `unused_enabled_port` | A port that is enabled but has not been used for longer than your limit (an open socket anyone can plug into). |
| `no_description` | A trunk or uplink port with no description, so nobody knows what it connects. |
| `unused_vlan` | A VLAN in your VLAN list that no port uses. |

Findings come back worst first (high, medium, low). A finding a named person has reviewed can be accepted as known, with a reason and a date to look again; it then moves to "Accepted as known" instead of counting as open.

## Settings

Pass a settings file with `settings`. Every setting is optional; a misspelt setting is refused by name.

| Setting | What it does |
|---|---|
| `allowed_access_vlans` | VLANs access ports may use (no check when empty) |
| `crc_max` | CRC errors above which a port is flagged (default 100) |
| `unused_days` | Days without use after which an enabled port is flagged (default 60) |

## What it never does

- `switch_apply_config` is refused: Fairwire Switch Ports never changes a port, VLAN or trunk on a switch.
- `switch_ssh_session` is refused: Fairwire Switch Ports never logs in to a switch; it reads the export you give it.
- `switch_ports_request_submit` waits for one named person's click, even in Auto (`production_deploy`).
- `switch_ports_accept_learning` waits for one named person's click, even in Auto (`accept_learning`).
- `switch_ports_retire_memory` waits for one named person's click, even in Auto (`accept_learning`).
- `switch_apply_config` waits for one named person's click, even in Auto (`production_deploy`).
- `switch_ssh_session` waits for one named person's click, even in Auto (`production_deploy`).

<!-- generated:start -->

## A demo run

`npx -y fairwire-switch-ports demo` runs the agent on the fictional files in [`fixtures/`](fixtures) in a temporary folder. Captured output:

```text
Fairwire Switch Ports demo (fictional data) in a temporary folder, Auto on for the draft only

▶ Check the exported files
  status: executed  decision: allow
  12 port(s) on 2 switch(es), 9 up, 3 trunk(s), 5 VLAN(s) in use: 8 open finding(s), 0 high.
    medium  access_in_vlan1            sw-floor-2
    medium  crc_errors                 sw-core-01
    medium  half_duplex                sw-floor-2
    medium  trunk_all_vlans            sw-core-01
    low     no_description             sw-core-01
    low     unused_enabled_port        sw-floor-2
    low     vlan_not_in_plan           sw-floor-2
    info    unused_vlan                VLAN 40

▶ Explain one finding
  status: executed  decision: allow
  medium access_in_vlan1: Access port sw-floor-2 Gi1/0/5 is in use in VLAN 1. Fix: Move it to the right user or device VLAN.
medium half_duplex: sw-floor-2 Gi1/0/6 is up at half duplex. Fix: Set both ends to auto (or both to the same fixed speed and duplex) and check the cable.
low unused_enabled_port: sw-floor-2 Gi1/0/7 is enabled but unused since 2026-07-01. Fix: Shut the port, or put it in an unused VLAN, until someone needs it.
low vlan_not_in_plan: sw-floor-2 Gi1/0/9 is in VLAN 99, which is not in your plan. Fix: Move the port to a planned VLAN or add the VLAN to the plan with a reason.

▶ Write the worklist
  status: executed  decision: allow
  Switch port and VLAN review written: 12 port(s) on 2 switch(es), 9 up, 3 trunk(s), 5 VLAN(s) in use: 8 open finding(s), 0 high.

▶ Draft the note for a person
  status: executed  decision: allow  (auto)
  change request 2026-11-18 drafted with 1 open marker(s) ([TO CONFIRM network change board]). Nothing was sent.

▶ Auto: approving it still waits for one named person
  status: needs_approval  decision: ask
  reason: production_deploy stays one-click, even in Auto

▶ The agent tries to change the live system itself
  status: blocked  decision: block
  reason: Fairwire Switch Ports never changes a port, VLAN or trunk on a switch.
```

## Tools

| Tool | What it does | Policy |
|---|---|---|
| `switch_ports_check` | Review the port inventory and list trunk, VLAN, duplex, error, unused-port and description problems. | runs |
| `switch_ports_explain` | Every finding for one switch or port. | runs |
| `switch_ports_write_report` | Write switch-ports.csv (one row per finding, with blank owner and decision columns) and switch-ports.html into out_dir (default fairwire-out/switch_ports). | runs |
| `switch_ports_draft_change_request` | Write drafts/change_request-<date>.md: the open findings at or above min_severity (default medium), each with what to do, addressed to network change board. | asks first (Auto can be opted in) |
| `switch_ports_request_submit` | After one named human click (even in Auto), record that the reviewed change request draft is approved in change_request-requests.csv. | one named click, even in Auto (`production_deploy`) |
| `switch_ports_recall` | Search this agent's own memory of the customer's setup: accepted facts (in use) and facts waiting for a person. | runs |
| `switch_ports_learn` | Propose one fact about the customer's setup for this agent to remember. | runs |
| `switch_ports_accept_learning` | A named person accepts or rejects a fact waiting in this agent's memory. | one named click, even in Auto (`accept_learning`) |
| `switch_ports_retire_memory` | A named person stops an accepted fact from applying. | one named click, even in Auto (`accept_learning`) |
| `switch_apply_config` | Fairwire Switch Ports never changes a port, VLAN or trunk on a switch. | refused |
| `switch_ssh_session` | Fairwire Switch Ports never logs in to a switch; it reads the export you give it. | refused |

Any tool name not in this table is blocked, including names a model invents. `refused` tools are listed so a model can see they exist and are refused.

## Columns it reads

Table inputs can be CSV, TSV, semicolon- or pipe-separated text, Excel `.xlsx`, JSON or JSONL. Columns are matched by the agent's own name, then by the English names below, then by their names in German, French, Spanish, Portuguese, Italian, Japanese, Chinese and Korean. Dates become `YYYY-MM-DD`; amounts and counts are read with either decimal mark. Every result lists under `sources` how each file was read.

### Switch ports (`ports`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `switch` (required) | text | Switch, Device, Hostname, Switch Name, Device Name | Gerät, Appareil, デバイス, 设备 |
| `port` (required) | text | Port, Interface, Port Name, Ifname, Port ID | Port, Port, ポート, 端口 |
| `description` | text | Description, Port Description, Alias, Name | Beschreibung, Description, 摘要, 摘要 |
| `admin_status` | text | Admin Status, Admin, Enabled, Shutdown | - |
| `oper_status` | text | Oper Status, Status, Link, Link Status, State | - |
| `mode` | text | Mode, Switchport Mode, Type, Port Mode | Verkehrsträger, Mode de transport, 輸送モード, 运输方式 |
| `vlan` | number | VLAN, Access VLAN, Native VLAN, PVID, Untagged VLAN | VLAN, VLAN, VLAN, VLAN |
| `allowed_vlans` | text | Allowed VLANs, Trunk VLANs, Tagged VLANs, VLAN List | - |
| `duplex` | text | Duplex, Duplex Mode | - |
| `crc_errors` | number | CRC Errors, CRC, FCS Errors, Input CRC | - |
| `last_used` | date and time | Last Used, Last Input, Last Change, Last Link Up, Last Activity | Letzter Treffer, Dernière correspondance, 最終ヒット, 最后命中 |

### VLANs (`vlans`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `vlan` (required) | number | VLAN, VLAN ID, ID, Tag | VLAN, VLAN, VLAN, VLAN |
| `name` | text | Name, VLAN Name, Description | Name, Nom, 名前, 名称 |

### Files from other countries

A German export in Windows-1252 with semicolons, `1.234,56` and `03.11.2026`, or a Japanese one in Shift_JIS with `2026/11/03`, is read the same way as the English file. [`fixtures/intl/`](fixtures/intl) has both versions of the demo data, and the eval cases `intl-de-*` and `intl-ja-*` require the same results as the English case. Columns named differently? Run `npx fairwire-switch-ports inspect <file>` (names and shapes only, never values) and name them in `fairwire-sources.json`:

```json
{ "files": { "exports/devices.csv": { "columns": { "host": "Gerätename" }, "date_order": "dmy" } } }
```

## Memory

fairwire-switch-ports can remember facts about your setup so the next run does not have to be told again. `switch_ports_learn` only proposes a fact; it changes nothing until a named person accepts it with `switch_ports_accept_learning`, which is one click even in Auto. Facts live in one hash-chained file per agent under `.fairwire/memory/`; if the chain does not verify, no fact is used. Credentials, personal identifiers and text that reads like instructions to an AI are refused. Run without memory with `--no-memory`.

| Kind | What an accepted fact changes |
|---|---|
| `known_exception` | that finding is listed under "Accepted as known" instead of as open, until review_by (when given) has passed. |
| `note` | nothing (shown by recall only) |

```bash
fairwire-switch-ports memory list
fairwire-switch-ports memory accept MEM-1a2b3c4d5e6f --as "Your Name"
fairwire-switch-ports memory retire MEM-1a2b3c4d5e6f --as "Your Name" --reason "rule removed"
```

## Install

Node 20 or newer. No other dependencies.

```bash
npx -y fairwire-switch-ports demo
npx -y fairwire-switch-ports mcp --root /path/to/your/files
```

Claude Desktop, Cursor and other MCP hosts:

```json
{
  "mcpServers": {
    "fairwire-switch-ports": {
      "command": "npx",
      "args": [
        "-y",
        "fairwire-switch-ports",
        "mcp",
        "--root",
        "/path/to/your/files"
      ]
    }
  }
}
```

Claude Code: `claude mcp add fairwire-switch-ports -- npx -y fairwire-switch-ports mcp --root .`, or install the `fairwire-switch-ports` plugin from this repository's marketplace.

## Modes and approvals

- **Review** (`--mode review`): reads and reports only.
- **Assist** (default): the policy above. A tool that asks returns an `approval_id`; a person approves it once with `fairwire-switch-ports approve <id> --as "Your Name"` (or on the local approvals page, `fairwire-switch-ports approvals`), and the same call is repeated.
- **Auto** (`--mode auto --auto <tool,...>`): opt-in per tool, with step caps and a kill switch (`fairwire-switch-ports kill`). Paying, sending, posting to a ledger or a live system and accepting a learned fact stay **one named click even in Auto**; an approval is tied to the sha256 of the reviewed draft, so a changed draft needs a new click.

## CLI

```bash
fairwire-switch-ports tools                 # every tool, its policy and arguments
fairwire-switch-ports sources               # the columns each input is read from
fairwire-switch-ports inspect <file>        # how a file would be read (names and shapes, never values)
fairwire-switch-ports call switch_ports_check '{"ports":"<ports>"}'
fairwire-switch-ports eval                  # the private eval cases on the fictional fixtures
fairwire-switch-ports demo
```

## Audit log and data

Every call is written to `.fairwire/audit.jsonl` under the root: hash-chained JSON lines, with arguments stored as a hash, signed with an Ed25519 key when you configure one. Everything runs on your machine on files you choose. No network calls, no telemetry, no credentials. The bundled fixtures are fictional.

<!-- generated:end -->

## Limits

- Reads only the files you export and give it. It does not log in to a firewall, switch, controller, cloud console, identity provider or any other live system.
- Error counters and last-use times are as the switch reported them; counters reset when a switch restarts.
- VLANs used only on switches missing from the export look unused here.
- Thresholds are working defaults in a settings file you control; they are not a vendor rule, a requirement of any standard or a security guarantee.
- It changes nothing on a live device, firewall, DNS zone, directory or cloud account. Every change it suggests is a draft that one named person applies.
- Export layouts were written from knowledge of common exports and have not been tested on live customer accounts. Run `inspect` on a new export and name columns in `fairwire-sources.json` when they differ.

## Licence

MIT. Fictional data only in `fixtures/`.
