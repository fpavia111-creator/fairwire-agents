# Echo of Voip

Call quality review from a phone system or SBC call-detail export: low MOS, packet loss, jitter and latency over your limits, one-way audio, short dropped calls, and sites or trunks where poor calls cluster. Drafts a ticket for the voice provider; never changes a codec or route.

Part of **Fairwire**, the IT and network family of [Mythos Machines](https://fair-agents.com) agents. The software is free (MIT); you pay a fixed price for the setup on your files. It reads files your IT team exports, on your own computer, and drafts notes. Every change to a live device, firewall, DNS zone, directory or cloud account stays one named person's click.

## What it checks

| Finding | What it means |
|---|---|
| `poor_call` | A call with MOS, packet loss, jitter or one-way latency outside your limits (high when MOS is under 3.1). |
| `one_way_audio` | A call where one side received (almost) no audio packets. |
| `site_poor_share` | A site where more than your share of calls were poor. |
| `trunk_poor_share` | A trunk or carrier where more than your share of calls were poor. |
| `poor_hour` | An hour of the day with at least twice the overall share of poor calls (a sign of congestion). |
| `short_dropped_calls` | One number with several calls shorter than your limit (dropped or failed calls). |

Findings come back worst first (high, medium, low). A finding a named person has reviewed can be accepted as known, with a reason and a date to look again; it then moves to "Accepted as known" instead of counting as open.

## Settings

Pass a settings file with `settings`. Every setting is optional; a misspelt setting is refused by name.

| Setting | What it does |
|---|---|
| `mos_min` | Lowest acceptable MOS (default 3.6) |
| `loss_pct_max` | Highest acceptable packet loss in percent (default 1) |
| `jitter_ms_max` | Highest acceptable jitter in ms (default 30) |
| `latency_ms_max` | Highest acceptable one-way latency in ms (default 150) |
| `short_call_seconds` | Calls shorter than this count as possibly dropped (default 10) |
| `short_calls_min` | Short calls from one number before it is flagged (default 3) |
| `poor_share_pct` | Share of poor calls above which a site or trunk is flagged (default 20) |
| `min_calls` | Calls a site, trunk or hour needs before shares are judged (default 5) |

## What it never does

- `pbx_change_codec` is refused: Echo never changes a codec, route or trunk on the phone system.
- `provider_ticket_submit` is refused: Echo never opens a ticket with the provider itself; a person sends the reviewed draft.
- `echo_request_send` waits for one named person's click, even in Auto (`binding_send`).
- `echo_accept_learning` waits for one named person's click, even in Auto (`accept_learning`).
- `echo_retire_memory` waits for one named person's click, even in Auto (`accept_learning`).
- `pbx_change_codec` waits for one named person's click, even in Auto (`production_deploy`).
- `provider_ticket_submit` waits for one named person's click, even in Auto (`binding_send`).

<!-- generated:start -->

## A demo run

`npx -y echo-of-voip demo` runs the agent on the fictional files in [`fixtures/`](fixtures) in a temporary folder. Captured output:

```text
Echo of Voip demo (fictional data) in a temporary folder, Auto on for the draft only

▶ Check the exported files
  status: executed  decision: allow
  37 call(s), 114.2 minute(s), 6 poor (16.2%): 11 open finding(s), 3 high.
    high    one_way_audio              HQ
    high    poor_call                  Branch-2
    high    site_poor_share            Warehouse
    medium  poor_call                  Warehouse
    medium  poor_call                  Warehouse
    medium  poor_call                  Warehouse
    medium  poor_call                  Warehouse
    medium  poor_call                  Warehouse
    medium  short_dropped_calls        Branch-2
    medium  trunk_poor_share           carrier-b
    low     poor_hour                  14:00

▶ Explain one finding
  status: executed  decision: allow
  high site_poor_share: 50% of calls at Warehouse were poor (5 of 10). Fix: Look at the site's internet link, Wi-Fi and QoS before blaming the phones.
medium poor_call: Call WH-006 at Warehouse on carrier-b (G.729) had MOS 3.3, loss 2.5%, jitter 45 ms. Fix: Check the site's uplink and QoS markings at that time; if it repeats, raise it with the carrier.
medium poor_call: Call WH-007 at Warehouse on carrier-b (G.729) had MOS 3.3, loss 2.5%, jitter 45 ms. Fix: Check the site's uplink and QoS markings at that time; if it repeats, raise it with the carrier.
medium poor_call: Call WH-008 at Warehouse on carrier-b (G.729) had MOS 3.3, loss 2.5%, jitter 45 ms. Fix: Check the site's uplink and QoS markings at that time; if it repeats, raise it with the carrier.
medium poor_call: Call WH-009 at Warehouse on carrier-b (G.729) had MOS 3.3, loss 2.5%, jitter 45 ms. Fix: Check the site's uplink and QoS markings at that time; if it repeats, raise it with the carrier.
medium poor_call: Call WH-010 at Warehouse on carrier-b (G.729) had MOS 3.3, loss 2.5%, jitter 45 ms. Fix: Check the site's uplink and QoS markings at that time; if it repeats, raise it with the carrier.

▶ Write the worklist
  status: executed  decision: allow
  Call quality review written: 37 call(s), 114.2 minute(s), 6 poor (16.2%): 11 open finding(s), 3 high.

▶ Draft the note for a person
  status: executed  decision: allow  (auto)
  provider ticket 2026-11-18 drafted with 1 open marker(s) ([TO CONFIRM voice provider support]). Nothing was sent.

▶ Auto: approving it still waits for one named person
  status: needs_approval  decision: ask
  reason: binding_send stays one-click, even in Auto

▶ The agent tries to change the live system itself
  status: blocked  decision: block
  reason: Echo never changes a codec, route or trunk on the phone system.
```

## Tools

| Tool | What it does | Policy |
|---|---|---|
| `echo_check` | Check every call against your quality limits and list poor calls, one-way audio, sites, trunks and hours where poor calls cluster, and numbers with many short calls. | runs |
| `echo_explain` | Every finding for one site, trunk or call id. | runs |
| `echo_write_report` | Write echo-calls.csv (one row per finding, with blank owner and decision columns) and echo-calls.html into out_dir (default fairwire-out/echo). | runs |
| `echo_draft_provider_ticket` | Write drafts/provider_ticket-<date>.md: the open findings at or above min_severity (default medium), each with what to do, addressed to voice provider support. | asks first (Auto can be opted in) |
| `echo_request_send` | After one named human click (even in Auto), record that the reviewed provider ticket draft is approved in provider_ticket-requests.csv. | one named click, even in Auto (`binding_send`) |
| `echo_recall` | Search this agent's own memory of the customer's setup: accepted facts (in use) and facts waiting for a person. | runs |
| `echo_learn` | Propose one fact about the customer's setup for this agent to remember. | runs |
| `echo_accept_learning` | A named person accepts or rejects a fact waiting in this agent's memory. | one named click, even in Auto (`accept_learning`) |
| `echo_retire_memory` | A named person stops an accepted fact from applying. | one named click, even in Auto (`accept_learning`) |
| `pbx_change_codec` | Echo never changes a codec, route or trunk on the phone system. | refused |
| `provider_ticket_submit` | Echo never opens a ticket with the provider itself; a person sends the reviewed draft. | refused |

Any tool name not in this table is blocked, including names a model invents. `refused` tools are listed so a model can see they exist and are refused.

## Columns it reads

Table inputs can be CSV, TSV, semicolon- or pipe-separated text, Excel `.xlsx`, JSON or JSONL. Columns are matched by the agent's own name, then by the English names below, then by their names in German, French, Spanish, Portuguese, Italian, Japanese, Chinese and Korean. Dates become `YYYY-MM-DD`; amounts and counts are read with either decimal mark. Every result lists under `sources` how each file was read.

### Calls (`calls`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `call_id` (required) | text | Call ID, CallID, Call-ID, Session ID, Record ID, Unique ID | - |
| `started_at` | date and time | Start Time, Start, Call Start, Date/Time, Timestamp, Setup Time | Startzeit, Heure de début, 開始日時, 开始时间 |
| `duration` | number | Duration, Duration (s), Duration (sec), billsec, Call Duration, Talk Time | Dauer, Durée, 時間, 时长 |
| `site` | text | Site, Location, Branch, Office | Standort, Site, 拠点, 站点 |
| `trunk` | text | Trunk, Carrier, Gateway, SIP Trunk, Route | - |
| `codec` | text | Codec, Codec Name, Audio Codec, Payload | Codec, Codec, コーデック, 编解码器 |
| `mos` | number | MOS, MOS Score, Avg MOS, Mean Opinion Score, Quality | - |
| `loss_pct` | number | Packet Loss %, Loss %, Packet Loss, Loss, Lost Packets % | Paketverlust, Perte de paquets, パケットロス, 丢包率 |
| `jitter_ms` | number | Jitter, Jitter (ms), Avg Jitter, Max Jitter | Jitter, Gigue, ジッター, 抖动 |
| `latency_ms` | number | Latency, Latency (ms), One-way Delay, Delay (ms), RTT/2 | Latenz, Latence, 遅延, 延迟 |
| `packets_sent` | number | Packets Sent, RTP Packets Sent, Tx Packets | - |
| `packets_received` | number | Packets Received, RTP Packets Received, Rx Packets | - |
| `caller_number` | text | Caller, Calling Number, From, Source Number, ANI, Caller ID | - |

### Files from other countries

A German export in Windows-1252 with semicolons, `1.234,56` and `03.11.2026`, or a Japanese one in Shift_JIS with `2026/11/03`, is read the same way as the English file. [`fixtures/intl/`](fixtures/intl) has both versions of the demo data, and the eval cases `intl-de-*` and `intl-ja-*` require the same results as the English case. Columns named differently? Run `npx echo-of-voip inspect <file>` (names and shapes only, never values) and name them in `fairwire-sources.json`:

```json
{ "files": { "exports/devices.csv": { "columns": { "host": "Gerätename" }, "date_order": "dmy" } } }
```

## Memory

echo-of-voip can remember facts about your setup so the next run does not have to be told again. `echo_learn` only proposes a fact; it changes nothing until a named person accepts it with `echo_accept_learning`, which is one click even in Auto. Facts live in one hash-chained file per agent under `.fairwire/memory/`; if the chain does not verify, no fact is used. Credentials, personal identifiers and text that reads like instructions to an AI are refused. Run without memory with `--no-memory`.

| Kind | What an accepted fact changes |
|---|---|
| `known_exception` | that finding is listed under "Accepted as known" instead of as open, until review_by (when given) has passed. |
| `note` | nothing (shown by recall only) |

```bash
echo-of-voip memory list
echo-of-voip memory accept MEM-1a2b3c4d5e6f --as "Your Name"
echo-of-voip memory retire MEM-1a2b3c4d5e6f --as "Your Name" --reason "rule removed"
```

## Install

Node 20 or newer. No other dependencies.

```bash
npx -y echo-of-voip demo
npx -y echo-of-voip mcp --root /path/to/your/files
```

Claude Desktop, Cursor and other MCP hosts:

```json
{
  "mcpServers": {
    "echo-of-voip": {
      "command": "npx",
      "args": [
        "-y",
        "echo-of-voip",
        "mcp",
        "--root",
        "/path/to/your/files"
      ]
    }
  }
}
```

Claude Code: `claude mcp add echo-of-voip -- npx -y echo-of-voip mcp --root .`, or install the `echo-of-voip` plugin from this repository's marketplace.

## Modes and approvals

- **Review** (`--mode review`): reads and reports only.
- **Assist** (default): the policy above. A tool that asks returns an `approval_id`; a person approves it once with `echo-of-voip approve <id> --as "Your Name"` (or on the local approvals page, `echo-of-voip approvals`), and the same call is repeated.
- **Auto** (`--mode auto --auto <tool,...>`): opt-in per tool, with step caps and a kill switch (`echo-of-voip kill`). Paying, sending, posting to a ledger or a live system and accepting a learned fact stay **one named click even in Auto**; an approval is tied to the sha256 of the reviewed draft, so a changed draft needs a new click.

## CLI

```bash
echo-of-voip tools                 # every tool, its policy and arguments
echo-of-voip sources               # the columns each input is read from
echo-of-voip inspect <file>        # how a file would be read (names and shapes, never values)
echo-of-voip call echo_check '{"calls":"<calls>"}'
echo-of-voip eval                  # the private eval cases on the fictional fixtures
echo-of-voip demo
```

## Audit log and data

Every call is written to `.fairwire/audit.jsonl` under the root: hash-chained JSON lines, with arguments stored as a hash, signed with an Ed25519 key when you configure one. Everything runs on your machine on files you choose. No network calls, no telemetry, no credentials. The bundled fixtures are fictional.

<!-- generated:end -->

## Limits

- Reads only the files you export and give it. It does not log in to a firewall, switch, controller, cloud console, identity provider or any other live system.
- MOS, loss, jitter and latency are the figures your phone system or SBC exported; the agent does not measure calls. Calls with no quality figures are only checked for one-way audio and length.
- Thresholds are working defaults in a settings file you control; they are not a vendor rule, a requirement of any standard or a security guarantee.
- Results returned to the AI model have the names of people, sign-in names, e-mail addresses, phone numbers and client addresses masked. The files written here keep the real values: keep them in a secure folder.
- Export layouts were written from knowledge of common exports and have not been tested on live customer accounts. Run `inspect` on a new export and name columns in `fairwire-sources.json` when they differ.

## Licence

MIT. Fictional data only in `fixtures/`.
