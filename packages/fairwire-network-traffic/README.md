# Fairwire Network Traffic

Network flow review from a NetFlow, IPFIX or sFlow export: cleartext protocols, risky ports reached from the internet, one host or destination taking most of the bytes, large uploads out of hours and very small packets. Writes a worklist and drafts a change request a network owner applies.

Part of **Fairwire**, the IT and network family of [Mythos Machines](https://fair-agents.com) agents. The software is free (MIT); you pay a fixed price for the setup on your files. It reads files your IT team exports, on your own computer, and drafts notes. Every change to a live device, firewall, DNS zone, directory or cloud account stays one named person's click.

## What it checks

| Finding | What it means |
|---|---|
| `inbound_risky_port` | An address on the internet reached an inside host on a port that should rarely be open to the internet (RDP, SMB, Telnet, databases and the like). |
| `cleartext_protocol` | Traffic between an inside host and the internet on a protocol that sends data without encryption (Telnet, FTP and POP3 are high; HTTP, IMAP, SNMP and LDAP are medium). |
| `large_upload_after_hours` | An inside host sent more than your limit to one outside address outside business hours. |
| `possible_port_scan` | One address tried many different ports on one host with tiny flows. |
| `top_talker_share` | One inside host carried more than your share of all bytes. |
| `top_destination_share` | One outside address received more than your share of all bytes sent out. |
| `small_packets` | A host's flows average very small packets over many packets (chatty traffic worth batching, or probing). |

Findings come back worst first (high, medium, low). A finding a named person has reviewed can be accepted as known, with a reason and a date to look again; it then moves to "Accepted as known" instead of counting as open.

## Settings

Pass a settings file with `settings`. Every setting is optional; a misspelt setting is refused by name.

| Setting | What it does |
|---|---|
| `internal_cidrs` | Your inside address ranges (default: private ranges such as 10.0.0.0/8) |
| `risky_ports` | Ports that should not be reachable from the internet (default: RDP, SMB, Telnet, databases and others) |
| `allowed_inbound` | Inside host:port pairs that are meant to be open, e.g. "10.0.5.10:3389" for a published gateway |
| `business_hours` | First and last hour of the working day, e.g. [7, 19] (default) |
| `large_upload_bytes` | Bytes to one outside address out of hours that count as a large upload (default 500000000) |
| `top_share_pct` | Share of all bytes above which one host or destination is flagged (default 40) |
| `share_min_hosts` | Inside hosts (or outside destinations) the export must hold before one of them carrying most of the bytes is flagged (default 5; with fewer, one host always dominates) |
| `small_packet_bytes` | Average packet size under which a host is flagged (default 100) |
| `min_packets` | Packets a host needs before the small-packet check applies (default 1000) |
| `scan_ports` | Distinct ports one source tries on one host before it counts as a possible scan (default 20) |

## What it never does

- `firewall_block_address` is refused: Fairwire Network Traffic never blocks an address or changes a firewall; the network owner does.
- `switch_shutdown_port` is refused: Fairwire Network Traffic never shuts a switch port or isolates a host.
- `traffic_request_submit` waits for one named person's click, even in Auto (`production_deploy`).
- `traffic_accept_learning` waits for one named person's click, even in Auto (`accept_learning`).
- `traffic_retire_memory` waits for one named person's click, even in Auto (`accept_learning`).
- `firewall_block_address` waits for one named person's click, even in Auto (`production_deploy`).
- `switch_shutdown_port` waits for one named person's click, even in Auto (`production_deploy`).

<!-- generated:start -->

## A demo run

`npx -y fairwire-network-traffic demo` runs the agent on the fictional files in [`fixtures/`](fixtures) in a temporary folder. Captured output:

```text
Fairwire Network Traffic demo (fictional data) in a temporary folder, Auto on for the draft only

▶ Check the exported files
  status: executed  decision: allow
  36 flow(s), 764 MB between 11 inside host(s) and 6 outside destination(s): 9 open finding(s), 4 high.
    high    cleartext_protocol         10.0.2.15
    high    inbound_risky_port         10.0.5.20
    high    inbound_risky_port         10.0.5.30
    high    large_upload_after_hours   10.0.3.50
    medium  cleartext_protocol         10.0.2.40
    medium  possible_port_scan         10.0.9.99
    low     small_packets              10.0.7.7
    low     top_destination_share      203.0.113.200
    low     top_talker_share           10.0.3.50

▶ Explain one finding
  status: executed  decision: allow
  high large_upload_after_hours: 10.0.3.50 sent 700 MB to 203.0.113.200 outside business hours in 2 flow(s). Fix: Confirm with the host owner that this was a planned backup or sync; if not, treat it as a possible data leak.
low top_talker_share: 10.0.3.50 carried 94.2% of all bytes (720 MB of 764 MB). Fix: Check whether this host should be on its own link, scheduled off-peak or rate-limited.

▶ Write the worklist
  status: executed  decision: allow
  Network flow review written: 36 flow(s), 764 MB between 11 inside host(s) and 6 outside destination(s): 9 open finding(s), 4 high.

▶ Draft the note for a person
  status: executed  decision: allow  (auto)
  change request 2026-11-19 drafted with 1 open marker(s) ([TO CONFIRM network change board]). Nothing was sent.

▶ Auto: approving it still waits for one named person
  status: needs_approval  decision: ask
  reason: production_deploy stays one-click, even in Auto

▶ The agent tries to change the live system itself
  status: blocked  decision: block
  reason: Fairwire Network Traffic never blocks an address or changes a firewall; the network owner does.
```

## Tools

| Tool | What it does | Policy |
|---|---|---|
| `traffic_check` | Review the flow export and list findings worst first: inbound risky ports, cleartext protocols, out-of-hours uploads, scans, top talkers and small packets. | runs |
| `traffic_explain` | Everything found for one address. | runs |
| `traffic_write_report` | Write network-traffic.csv (one row per finding, with blank owner and decision columns) and network-traffic.html into out_dir (default fairwire-out/traffic). | runs |
| `traffic_draft_change_request` | Write drafts/change_request-<date>.md: the open findings at or above min_severity (default medium), each with what to do, addressed to network change board. | asks first (Auto can be opted in) |
| `traffic_request_submit` | After one named human click (even in Auto), record that the reviewed change request draft is approved in change_request-requests.csv. | one named click, even in Auto (`production_deploy`) |
| `traffic_recall` | Search this agent's own memory of the customer's setup: accepted facts (in use) and facts waiting for a person. | runs |
| `traffic_learn` | Propose one fact about the customer's setup for this agent to remember. | runs |
| `traffic_accept_learning` | A named person accepts or rejects a fact waiting in this agent's memory. | one named click, even in Auto (`accept_learning`) |
| `traffic_retire_memory` | A named person stops an accepted fact from applying. | one named click, even in Auto (`accept_learning`) |
| `firewall_block_address` | Fairwire Network Traffic never blocks an address or changes a firewall; the network owner does. | refused |
| `switch_shutdown_port` | Fairwire Network Traffic never shuts a switch port or isolates a host. | refused |

Any tool name not in this table is blocked, including names a model invents. `refused` tools are listed so a model can see they exist and are refused.

## Columns it reads

Table inputs can be CSV, TSV, semicolon- or pipe-separated text, Excel `.xlsx`, JSON or JSONL. Columns are matched by the agent's own name, then by the English names below, then by their names in German, French, Spanish, Portuguese, Italian, Japanese, Chinese and Korean. Dates become `YYYY-MM-DD`; amounts and counts are read with either decimal mark. Every result lists under `sources` how each file was read.

### Flow records (`flows`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `src_ip` (required) | text | Source IP, Src IP, Src Addr, srcaddr, sa, Source Address | Quell-IP, IP source, 送信元IP, 源IP |
| `dst_ip` (required) | text | Destination IP, Dst IP, Dst Addr, dstaddr, da, Destination Address | Ziel-IP, IP destination, 宛先IP, 目的IP |
| `dst_port` | number | Destination Port, Dst Port, dstport, dp, DPort | Zielport, Port de destination, 宛先ポート, 目的端口 |
| `protocol` | text | Protocol, Proto, pr, IP Protocol, Application Protocol | Protokoll, Protocole, プロトコル, 协议 |
| `bytes` (required) | number | Bytes, Octets, ibyt, In Bytes, Total Bytes, byt | Bytes, Octets, バイト数, 字节数 |
| `packets` | number | Packets, Pkts, ipkt, In Packets, Packet Count | Pakete, Paquets, パケット数, 数据包数 |
| `start` | date and time | Start, First Seen, ts, Start Time, First Switched, Timestamp | Startzeit, Heure de début, 開始日時, 开始时间 |
| `src_host` | text | Source Host, Source Hostname, Src Name, Host | - |

### Files from other countries

A German export in Windows-1252 with semicolons, `1.234,56` and `03.11.2026`, or a Japanese one in Shift_JIS with `2026/11/03`, is read the same way as the English file. [`fixtures/intl/`](fixtures/intl) has both versions of the demo data, and the eval cases `intl-de-*` and `intl-ja-*` require the same results as the English case. Columns named differently? Run `npx fairwire-network-traffic inspect <file>` (names and shapes only, never values) and name them in `fairwire-sources.json`:

```json
{ "files": { "exports/devices.csv": { "columns": { "host": "Gerätename" }, "date_order": "dmy" } } }
```

## Memory

fairwire-network-traffic can remember facts about your setup so the next run does not have to be told again. `traffic_learn` only proposes a fact; it changes nothing until a named person accepts it with `traffic_accept_learning`, which is one click even in Auto. Facts live in one hash-chained file per agent under `.fairwire/memory/`; if the chain does not verify, no fact is used. Credentials, personal identifiers and text that reads like instructions to an AI are refused. Run without memory with `--no-memory`.

| Kind | What an accepted fact changes |
|---|---|
| `known_exception` | that finding is listed under "Accepted as known" instead of as open, until review_by (when given) has passed. |
| `note` | nothing (shown by recall only) |

```bash
fairwire-network-traffic memory list
fairwire-network-traffic memory accept MEM-1a2b3c4d5e6f --as "Your Name"
fairwire-network-traffic memory retire MEM-1a2b3c4d5e6f --as "Your Name" --reason "rule removed"
```

## Install

Node 20 or newer. No other dependencies.

```bash
npx -y fairwire-network-traffic demo
npx -y fairwire-network-traffic mcp --root /path/to/your/files
```

Claude Desktop, Cursor and other MCP hosts:

```json
{
  "mcpServers": {
    "fairwire-network-traffic": {
      "command": "npx",
      "args": [
        "-y",
        "fairwire-network-traffic",
        "mcp",
        "--root",
        "/path/to/your/files"
      ]
    }
  }
}
```

Claude Code: `claude mcp add fairwire-network-traffic -- npx -y fairwire-network-traffic mcp --root .`, or install the `fairwire-network-traffic` plugin from this repository's marketplace.

## Modes and approvals

- **Review** (`--mode review`): reads and reports only.
- **Assist** (default): the policy above. A tool that asks returns an `approval_id`; a person approves it once with `fairwire-network-traffic approve <id> --as "Your Name"` (or on the local approvals page, `fairwire-network-traffic approvals`), and the same call is repeated.
- **Auto** (`--mode auto --auto <tool,...>`): opt-in per tool, with step caps and a kill switch (`fairwire-network-traffic kill`). Paying, sending, posting to a ledger or a live system and accepting a learned fact stay **one named click even in Auto**; an approval is tied to the sha256 of the reviewed draft, so a changed draft needs a new click.

## CLI

```bash
fairwire-network-traffic tools                 # every tool, its policy and arguments
fairwire-network-traffic sources               # the columns each input is read from
fairwire-network-traffic inspect <file>        # how a file would be read (names and shapes, never values)
fairwire-network-traffic call traffic_check '{"flows":"<flows>"}'
fairwire-network-traffic eval                  # the private eval cases on the fictional fixtures
fairwire-network-traffic demo
```

## Audit log and data

Every call is written to `.fairwire/audit.jsonl` under the root: hash-chained JSON lines, with arguments stored as a hash, signed with an Ed25519 key when you configure one. Everything runs on your machine on files you choose. No network calls, no telemetry, no credentials. The bundled fixtures are fictional.

<!-- generated:end -->

## Limits

- Reads only the files you export and give it. It does not log in to a firewall, switch, controller, cloud console, identity provider or any other live system.
- Flow data shows who talked to whom and how much, not what was said: a finding is a lead for a person to confirm, not proof of an attack or a leak.
- Inside and outside are decided by internal_cidrs (private ranges by default); NAT can hide the real inside host.
- Thresholds are working defaults in a settings file you control; they are not a vendor rule, a requirement of any standard or a security guarantee.
- It changes nothing on a live device, firewall, DNS zone, directory or cloud account. Every change it suggests is a draft that one named person applies.
- Export layouts were written from knowledge of common exports and have not been tested on live customer accounts. Run `inspect` on a new export and name columns in `fairwire-sources.json` when they differ.

## Licence

MIT. Fictional data only in `fixtures/`.
