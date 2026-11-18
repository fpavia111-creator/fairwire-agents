# Fairwire Wi-Fi Health

Wi-Fi controller export review: access points down or on old firmware, 2.4 GHz channels other than 1, 6 and 11, crowded channels, open, WEP or TKIP networks, too many SSIDs per radio, weak clients and rogue access points. Drafts a change request; never changes the controller.

Part of **Fairwire**, the IT and network family of [Mythos Machines](https://fair-agents.com) agents. The software is free (MIT); you pay a fixed price for the setup on your files. It reads files your IT team exports, on your own computer, and drafts notes. Every change to a live device, firewall, DNS zone, directory or cloud account stays one named person's click.

## What it checks

| Finding | What it means |
|---|---|
| `rogue_ap` | A rogue access point seen on your wired network, or one broadcasting one of your own network names (an "evil twin"). |
| `weak_security` | A network (SSID) with WEP or WPA-TKIP (high), or with no password (medium; low for a guest network). |
| `ap_offline` | An access point that is offline or has not been seen for longer than your limit. |
| `old_firmware` | An access point on older firmware than others of the same model (or than your minimum). |
| `bad_24_channel` | A 2.4 GHz radio on a channel other than 1, 6 or 11, so it overlaps its neighbours. |
| `crowded_channel` | A radio whose channel is busier than your limit. |
| `too_many_ssids` | A radio broadcasting more network names than your limit (each one costs airtime). |
| `weak_clients` | An access point with several clients at a weak signal (coverage gap or wrong placement). |
| `sticky_24_clients` | Several clients that can use 5 GHz are stuck on 2.4 GHz on one access point. |

Findings come back worst first (high, medium, low). A finding a named person has reviewed can be accepted as known, with a reason and a date to look again; it then moves to "Accepted as known" instead of counting as open.

## Settings

Pass a settings file with `settings`. Every setting is optional; a misspelt setting is refused by name.

| Setting | What it does |
|---|---|
| `offline_hours` | Hours without contact after which an access point counts as offline (default 24) |
| `utilization_max` | Channel utilization percent above which a radio is crowded (default 70) |
| `max_ssids` | Network names one radio may broadcast (default 4) |
| `weak_rssi` | Signal in dBm under which a client is weak (default -75) |
| `weak_clients_min` | Weak clients on one access point before it is flagged (default 3) |
| `sticky_min` | 5 GHz-capable clients on 2.4 GHz on one access point before it is flagged (default 3) |
| `min_firmware` | Lowest firmware per model, e.g. {"MR46": "10.4"}; without it, the newest version seen for the model is the reference |

## What it never does

- `controller_apply_config` is refused: Fairwire Wi-Fi Health never changes channels, SSIDs, security or firmware on the controller.
- `wifi_contain_rogue` is refused: Fairwire Wi-Fi Health never starts rogue containment (it can disrupt neighbours and may be unlawful in some places).
- `wifi_request_submit` waits for one named person's click, even in Auto (`production_deploy`).
- `wifi_accept_learning` waits for one named person's click, even in Auto (`accept_learning`).
- `wifi_retire_memory` waits for one named person's click, even in Auto (`accept_learning`).
- `controller_apply_config` waits for one named person's click, even in Auto (`production_deploy`).
- `wifi_contain_rogue` waits for one named person's click, even in Auto (`production_deploy`).

<!-- generated:start -->

## A demo run

`npx -y fairwire-wifi-health demo` runs the agent on the fictional files in [`fixtures/`](fixtures) in a temporary folder. Captured output:

```text
Fairwire Wi-Fi Health demo (fictional data) in a temporary folder, Auto on for the draft only

▶ Check the exported files
  status: executed  decision: allow
  5 access point(s) (10 radios, 1 offline), 5 network(s), 9 client(s): 12 open finding(s), 5 high.
    high    ap_offline                 AP-WH-01
    high    rogue_ap                   Corp
    high    rogue_ap                   Free-WiFi
    high    weak_security              Legacy-Cam
    high    weak_security              Scanner
    medium  bad_24_channel             AP-HQ-02
    medium  old_firmware               AP-HQ-03
    low     crowded_channel            AP-HQ-02
    low     sticky_24_clients          AP-HQ-01
    low     too_many_ssids             AP-HQ-02
    low     weak_clients               AP-HQ-02
    low     weak_security              Guest

▶ Explain one finding
  status: executed  decision: allow
  medium bad_24_channel: AP-HQ-02 uses 2.4 GHz channel 3, which overlaps channels 1, 6 and 11. Fix: Move it to 1, 6 or 11, whichever its neighbours use least.
low crowded_channel: A radio on AP-HQ-02 is 80% busy. Fix: Check for interference, lower the transmit power of neighbours or add an access point.
low too_many_ssids: AP-HQ-02 broadcasts 6 network names. Fix: Merge networks that differ only by VLAN, or stop broadcasting unused ones.
low weak_clients: 3 client(s) on AP-HQ-02 have a signal under -75 dBm. Fix: Survey the area; move or add an access point.

▶ Write the worklist
  status: executed  decision: allow
  Wi-Fi review written: 5 access point(s) (10 radios, 1 offline), 5 network(s), 9 client(s): 12 open finding(s), 5 high.

▶ Draft the note for a person
  status: executed  decision: allow  (auto)
  change request 2026-11-18 drafted with 1 open marker(s) ([TO CONFIRM network team]). Nothing was sent.

▶ Auto: approving it still waits for one named person
  status: needs_approval  decision: ask
  reason: production_deploy stays one-click, even in Auto

▶ The agent tries to change the live system itself
  status: blocked  decision: block
  reason: Fairwire Wi-Fi Health never changes channels, SSIDs, security or firmware on the controller.
```

## Tools

| Tool | What it does | Policy |
|---|---|---|
| `wifi_check` | Review the controller exports and list rogues, weak security, offline and outdated access points, channel problems and client signal problems. | runs |
| `wifi_explain` | Every finding for one access point, network or rogue. | runs |
| `wifi_write_report` | Write wifi-health.csv (one row per finding, with blank owner and decision columns) and wifi-health.html into out_dir (default fairwire-out/wifi). | runs |
| `wifi_draft_change_request` | Write drafts/change_request-<date>.md: the open findings at or above min_severity (default medium), each with what to do, addressed to network team. | asks first (Auto can be opted in) |
| `wifi_request_submit` | After one named human click (even in Auto), record that the reviewed change request draft is approved in change_request-requests.csv. | one named click, even in Auto (`production_deploy`) |
| `wifi_recall` | Search this agent's own memory of the customer's setup: accepted facts (in use) and facts waiting for a person. | runs |
| `wifi_learn` | Propose one fact about the customer's setup for this agent to remember. | runs |
| `wifi_accept_learning` | A named person accepts or rejects a fact waiting in this agent's memory. | one named click, even in Auto (`accept_learning`) |
| `wifi_retire_memory` | A named person stops an accepted fact from applying. | one named click, even in Auto (`accept_learning`) |
| `controller_apply_config` | Fairwire Wi-Fi Health never changes channels, SSIDs, security or firmware on the controller. | refused |
| `wifi_contain_rogue` | Fairwire Wi-Fi Health never starts rogue containment (it can disrupt neighbours and may be unlawful in some places). | refused |

Any tool name not in this table is blocked, including names a model invents. `refused` tools are listed so a model can see they exist and are refused.

## Columns it reads

Table inputs can be CSV, TSV, semicolon- or pipe-separated text, Excel `.xlsx`, JSON or JSONL. Columns are matched by the agent's own name, then by the English names below, then by their names in German, French, Spanish, Portuguese, Italian, Japanese, Chinese and Korean. Dates become `YYYY-MM-DD`; amounts and counts are read with either decimal mark. Every result lists under `sources` how each file was read.

### Access point radios (`aps`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `ap` (required) | text | AP, AP Name, Name, Access Point, Device Name, Device | Gerät, Appareil, デバイス, 设备 |
| `site` | text | Site, Network, Location, Building | Standort, Site, 拠点, 站点 |
| `model` | text | Model, AP Model, Hardware | Modell, Modèle, モデル, 型号 |
| `firmware` | text | Firmware, Firmware Version, Version, Software Version | Firmware, Micrologiciel, ファームウェア, 固件 |
| `status` | text | Status, State, Online, Connection | Status, Statut, ステータス, 状态 |
| `last_seen` | date and time | Last Seen, Last Contact, Last Online, Last Heard | Zuletzt gesehen, Vu pour la dernière fois, 最終確認日時, 最后出现时间 |
| `band` | text | Band, Radio, Frequency, Radio Band | Frequenzband, Bande, 周波数帯, 频段 |
| `channel` | number | Channel, Chan, Primary Channel | Kanal, Canal, チャネル, 信道 |
| `utilization_pct` | number | Channel Utilization, Utilization, Utilization %, Busy %, Airtime % | - |
| `ssid_count` | number | SSIDs, SSID Count, WLANs, Number of SSIDs | - |

### Networks (SSIDs) (`ssids`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `ssid` (required) | text | SSID, Name, Network Name, WLAN | SSID, SSID, SSID, SSID |
| `security` (required) | text | Security, Authentication, Encryption, Auth, Security Mode | - |
| `enabled` | text | Enabled, Status, Broadcast | Aktiviert, Activé, 有効, 已启用 |

### Wireless clients (`clients`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `client` (required) | text | Client, MAC, MAC address, Description, Device | Hostname, Nom d’hôte, ホスト名, 主机名 |
| `ap` (required) | text | AP, AP Name, Access Point, Connected To | Gerät, Appareil, デバイス, 设备 |
| `band` | text | Band, Radio, Frequency | Frequenzband, Bande, 周波数帯, 频段 |
| `rssi` | number | RSSI, Signal, Signal Strength, RSSI (dBm), Signal (dBm) | - |
| `capable_5ghz` | text | 5 GHz Capable, Capable 5GHz, Dual Band, Supports 5 GHz | - |

### Rogue access points (`rogues`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `bssid` (required) | text | BSSID, MAC, Rogue MAC | - |
| `ssid` | text | SSID, Network Name | SSID, SSID, SSID, SSID |
| `on_wire` | text | On Wire, Wired, Seen on LAN, Wired Match | - |
| `classification` | text | Classification, Class, Type, Status | - |

### Files from other countries

A German export in Windows-1252 with semicolons, `1.234,56` and `03.11.2026`, or a Japanese one in Shift_JIS with `2026/11/03`, is read the same way as the English file. [`fixtures/intl/`](fixtures/intl) has both versions of the demo data, and the eval cases `intl-de-*` and `intl-ja-*` require the same results as the English case. Columns named differently? Run `npx fairwire-wifi-health inspect <file>` (names and shapes only, never values) and name them in `fairwire-sources.json`:

```json
{ "files": { "exports/devices.csv": { "columns": { "host": "Gerätename" }, "date_order": "dmy" } } }
```

## Memory

fairwire-wifi-health can remember facts about your setup so the next run does not have to be told again. `wifi_learn` only proposes a fact; it changes nothing until a named person accepts it with `wifi_accept_learning`, which is one click even in Auto. Facts live in one hash-chained file per agent under `.fairwire/memory/`; if the chain does not verify, no fact is used. Credentials, personal identifiers and text that reads like instructions to an AI are refused. Run without memory with `--no-memory`.

| Kind | What an accepted fact changes |
|---|---|
| `known_exception` | that finding is listed under "Accepted as known" instead of as open, until review_by (when given) has passed. |
| `note` | nothing (shown by recall only) |

```bash
fairwire-wifi-health memory list
fairwire-wifi-health memory accept MEM-1a2b3c4d5e6f --as "Your Name"
fairwire-wifi-health memory retire MEM-1a2b3c4d5e6f --as "Your Name" --reason "rule removed"
```

## Install

Node 20 or newer. No other dependencies.

```bash
npx -y fairwire-wifi-health demo
npx -y fairwire-wifi-health mcp --root /path/to/your/files
```

Claude Desktop, Cursor and other MCP hosts:

```json
{
  "mcpServers": {
    "fairwire-wifi-health": {
      "command": "npx",
      "args": [
        "-y",
        "fairwire-wifi-health",
        "mcp",
        "--root",
        "/path/to/your/files"
      ]
    }
  }
}
```

Claude Code: `claude mcp add fairwire-wifi-health -- npx -y fairwire-wifi-health mcp --root .`, or install the `fairwire-wifi-health` plugin from this repository's marketplace.

## Modes and approvals

- **Review** (`--mode review`): reads and reports only.
- **Assist** (default): the policy above. A tool that asks returns an `approval_id`; a person approves it once with `fairwire-wifi-health approve <id> --as "Your Name"` (or on the local approvals page, `fairwire-wifi-health approvals`), and the same call is repeated.
- **Auto** (`--mode auto --auto <tool,...>`): opt-in per tool, with step caps and a kill switch (`fairwire-wifi-health kill`). Paying, sending, posting to a ledger or a live system and accepting a learned fact stay **one named click even in Auto**; an approval is tied to the sha256 of the reviewed draft, so a changed draft needs a new click.

## CLI

```bash
fairwire-wifi-health tools                 # every tool, its policy and arguments
fairwire-wifi-health sources               # the columns each input is read from
fairwire-wifi-health inspect <file>        # how a file would be read (names and shapes, never values)
fairwire-wifi-health call wifi_check '{"aps":"<aps>"}'
fairwire-wifi-health eval                  # the private eval cases on the fictional fixtures
fairwire-wifi-health demo
```

## Audit log and data

Every call is written to `.fairwire/audit.jsonl` under the root: hash-chained JSON lines, with arguments stored as a hash, signed with an Ed25519 key when you configure one. Everything runs on your machine on files you choose. No network calls, no telemetry, no credentials. The bundled fixtures are fictional.

<!-- generated:end -->

## Limits

- Reads only the files you export and give it. It does not log in to a firewall, switch, controller, cloud console, identity provider or any other live system.
- Channel, utilization and signal are the controller's own readings at the time of export; a site survey is the way to confirm coverage.
- Firmware is compared with the newest version seen for the same model unless you set min_firmware; the vendor's advisories decide which version to run.
- Thresholds are working defaults in a settings file you control; they are not a vendor rule, a requirement of any standard or a security guarantee.
- It changes nothing on a live device, firewall, DNS zone, directory or cloud account. Every change it suggests is a draft that one named person applies.
- Export layouts were written from knowledge of common exports and have not been tested on live customer accounts. Run `inspect` on a new export and name columns in `fairwire-sources.json` when they differ.

## Licence

MIT. Fictional data only in `fixtures/`.
