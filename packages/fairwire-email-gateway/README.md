# Fairwire Email Gateway

Email gateway review from Proofpoint, Mimecast, Defender or similar exports: high-confidence phishing released from quarantine, allow-listed senders that sent malware, the people targeted most, mail pulled back late, outbound spam from an internal mailbox and data-loss rule hits. Names masked for the model. Drafts notes; never releases or deletes mail.

Part of **Fairwire**, the IT and network family of [Fair Agents](https://fair-agents.com) agents. The software is free (MIT); you pay a fixed price for the setup on your files. It reads files your IT team exports, on your own computer, and drafts notes. Every change to a live device, firewall, DNS zone, directory or cloud account stays one named person's click.

## What it checks

| Finding | What it means |
|---|---|
| `released_threat` | A message the gateway judged phishing or malware that someone released from quarantine. |
| `allowlist_sent_threat` | A sender on an allow list that sent phishing, malware or spam (allow lists skip checks). |
| `outbound_spam` | An internal mailbox sending many messages the gateway judged spam or phishing (a sign the account is compromised). |
| `late_clawback` | Phishing that reached inboxes and was pulled back later than your limit. |
| `most_targeted` | A person who received many phishing or malware messages (worth extra training or protection). |
| `dlp_hits` | An internal sender who triggered data-loss rules several times. |

Findings come back worst first (high, medium, low). A finding a named person has reviewed can be accepted as known, with a reason and a date to look again; it then moves to "Accepted as known" instead of counting as open.

## Settings

Pass a settings file with `settings`. Every setting is optional; a misspelt setting is refused by name.

| Setting | What it does |
|---|---|
| `outbound_spam_min` | Outbound spam or phishing from one mailbox before it is flagged (default 20) |
| `clawback_minutes` | Minutes after delivery by which phishing should be pulled back (default 60) |
| `targeted_min` | Phishing or malware messages to one person before they count as most targeted (default 5) |
| `dlp_min` | Data-loss rule hits from one sender before they are flagged (default 3) |

## What it never does

- `gateway_release_message` is refused: Fairwire Email Gateway never releases, deletes or pulls back a message.
- `gateway_change_allowlist` is refused: Fairwire Email Gateway never changes allow lists, block lists or policies.
- `email_gateway_request_send` waits for one named person's click, even in Auto (`binding_send`).
- `email_gateway_accept_learning` waits for one named person's click, even in Auto (`accept_learning`).
- `email_gateway_retire_memory` waits for one named person's click, even in Auto (`accept_learning`).
- `gateway_release_message` waits for one named person's click, even in Auto (`binding_send`).
- `gateway_change_allowlist` waits for one named person's click, even in Auto (`production_deploy`).

<!-- generated:start -->

## A demo run

`npx -y fairwire-email-gateway demo` runs the agent on the fictional files in [`fixtures/`](fixtures) in a temporary folder. Captured output:

```text
Fairwire Email Gateway demo (fictional data) in a temporary folder, Auto on for the draft only

▶ Check the exported files
  status: executed  decision: allow
  60 message(s), 35 inbound (28.6% quarantined or blocked), 25 outbound, 11 threat(s): 6 open finding(s), 3 high.
    high    allowlist_sent_threat      USR-a546b0bf
    high    outbound_spam              USR-9da76359
    high    released_threat            USR-3f16ee48
    medium  late_clawback              USR-27a00472
    low     dlp_hits                   USR-e466f4ac
    low     most_targeted              USR-de6606a5

▶ Explain one finding
  status: executed  decision: allow
  high released_threat: Message MSG-0027 to USR-3f16ee48 was judged Phish and released from quarantine. Fix: Pull the message back, check whether links were clicked or attachments opened, and review who may release threats.

▶ Write the worklist
  status: executed  decision: allow
  Email gateway review written: 60 message(s), 35 inbound (28.6% quarantined or blocked), 25 outbound, 11 threat(s): 6 open finding(s), 3 high.

▶ Draft the note for a person
  status: executed  decision: allow  (auto)
  security note 2026-11-18 drafted with 1 open marker(s) ([TO CONFIRM security operations]). Nothing was sent.

▶ Auto: approving it still waits for one named person
  status: needs_approval  decision: ask
  reason: binding_send stays one-click, even in Auto

▶ The agent tries to change the live system itself
  status: blocked  decision: block
  reason: Fairwire Email Gateway never releases, deletes or pulls back a message.
```

## Tools

| Tool | What it does | Policy |
|---|---|---|
| `email_gateway_check` | Review the gateway log and list released threats, allow-list abuse, outbound spam, late pull-backs, targeted people and data-loss hits. | runs |
| `email_gateway_explain` | Every finding for one address or message. | runs |
| `email_gateway_write_report` | Write email-gateway.csv (one row per finding, with blank owner and decision columns) and email-gateway.html into out_dir (default fairwire-out/email_gateway). | runs |
| `email_gateway_draft_security_note` | Write drafts/security_note-<date>.md: the open findings at or above min_severity (default medium), each with what to do, addressed to security operations. | asks first (Auto can be opted in) |
| `email_gateway_request_send` | After one named human click (even in Auto), record that the reviewed security note draft is approved in security_note-requests.csv. | one named click, even in Auto (`binding_send`) |
| `email_gateway_recall` | Search this agent's own memory of the customer's setup: accepted facts (in use) and facts waiting for a person. | runs |
| `email_gateway_learn` | Propose one fact about the customer's setup for this agent to remember. | runs |
| `email_gateway_accept_learning` | A named person accepts or rejects a fact waiting in this agent's memory. | one named click, even in Auto (`accept_learning`) |
| `email_gateway_retire_memory` | A named person stops an accepted fact from applying. | one named click, even in Auto (`accept_learning`) |
| `gateway_release_message` | Fairwire Email Gateway never releases, deletes or pulls back a message. | refused |
| `gateway_change_allowlist` | Fairwire Email Gateway never changes allow lists, block lists or policies. | refused |

Any tool name not in this table is blocked, including names a model invents. `refused` tools are listed so a model can see they exist and are refused.

## Columns it reads

Table inputs can be CSV, TSV, semicolon- or pipe-separated text, Excel `.xlsx`, JSON or JSONL. Columns are matched by the agent's own name, then by the English names below, then by their names in German, French, Spanish, Portuguese, Italian, Japanese, Chinese and Korean. Dates become `YYYY-MM-DD`; amounts and counts are read with either decimal mark. Every result lists under `sources` how each file was read.

### Gateway messages (`messages`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `message_id` (required) | text | Message ID, Message-ID, ID, Network Message ID | - |
| `received_at` | date and time | Received, Date, Timestamp, Received Time, Delivery Time | - |
| `direction` | text | Direction, Mail Direction, Flow | Richtung, Sens, 入出庫区分, 方向 |
| `sender` | text | Sender, From, Sender Address, P1 Sender | Absender, Expéditeur, 送信者, 发件人 |
| `recipient` | text | Recipient, To, Recipients, Recipient Address | Empfänger, Destinataire, 受信者, 收件人 |
| `verdict` | text | Verdict, Threat, Classification, Detection, Threat Type | Bewertung, Verdict, 判定, 判定结果 |
| `action` | text | Action, Delivery Action, Disposition, Status | Aktion, Action, アクション, 动作 |
| `allowlisted` | text | Allowlisted, Allow Listed, Safe Sender, Bypass, Override | - |
| `clawed_back_at` | date and time | Clawed Back, Removed At, ZAP Time, Remediated At, Pulled Back | - |
| `dlp_rule` | text | DLP Rule, Policy Match, DLP Policy, Content Rule | - |

### Files from other countries

A German export in Windows-1252 with semicolons, `1.234,56` and `03.11.2026`, or a Japanese one in Shift_JIS with `2026/11/03`, is read the same way as the English file. [`fixtures/intl/`](fixtures/intl) has both versions of the demo data, and the eval cases `intl-de-*` and `intl-ja-*` require the same results as the English case. Columns named differently? Run `npx fairwire-email-gateway inspect <file>` (names and shapes only, never values) and name them in `fairwire-sources.json`:

```json
{ "files": { "exports/devices.csv": { "columns": { "host": "Gerätename" }, "date_order": "dmy" } } }
```

## Memory

fairwire-email-gateway can remember facts about your setup so the next run does not have to be told again. `email_gateway_learn` only proposes a fact; it changes nothing until a named person accepts it with `email_gateway_accept_learning`, which is one click even in Auto. Facts live in one hash-chained file per agent under `.fairwire/memory/`; if the chain does not verify, no fact is used. Credentials, personal identifiers and text that reads like instructions to an AI are refused. Run without memory with `--no-memory`.

| Kind | What an accepted fact changes |
|---|---|
| `known_exception` | that finding is listed under "Accepted as known" instead of as open, until review_by (when given) has passed. |
| `note` | nothing (shown by recall only) |

```bash
fairwire-email-gateway memory list
fairwire-email-gateway memory accept MEM-1a2b3c4d5e6f --as "Your Name"
fairwire-email-gateway memory retire MEM-1a2b3c4d5e6f --as "Your Name" --reason "rule removed"
```

## Install

Node 20 or newer. No other dependencies.

```bash
npx -y fairwire-email-gateway demo
npx -y fairwire-email-gateway mcp --root /path/to/your/files
```

Claude Desktop, Cursor and other MCP hosts:

```json
{
  "mcpServers": {
    "fairwire-email-gateway": {
      "command": "npx",
      "args": [
        "-y",
        "fairwire-email-gateway",
        "mcp",
        "--root",
        "/path/to/your/files"
      ]
    }
  }
}
```

Claude Code: `claude mcp add fairwire-email-gateway -- npx -y fairwire-email-gateway mcp --root .`, or install the `fairwire-email-gateway` plugin from this repository's marketplace.

## Modes and approvals

- **Review** (`--mode review`): reads and reports only.
- **Assist** (default): the policy above. A tool that asks returns an `approval_id`; a person approves it once with `fairwire-email-gateway approve <id> --as "Your Name"` (or on the local approvals page, `fairwire-email-gateway approvals`), and the same call is repeated.
- **Auto** (`--mode auto --auto <tool,...>`): opt-in per tool, with step caps and a kill switch (`fairwire-email-gateway kill`). Paying, sending, posting to a ledger or a live system and accepting a learned fact stay **one named click even in Auto**; an approval is tied to the sha256 of the reviewed draft, so a changed draft needs a new click.

## CLI

```bash
fairwire-email-gateway tools                 # every tool, its policy and arguments
fairwire-email-gateway sources               # the columns each input is read from
fairwire-email-gateway inspect <file>        # how a file would be read (names and shapes, never values)
fairwire-email-gateway call email_gateway_check '{"messages":"<messages>"}'
fairwire-email-gateway eval                  # the private eval cases on the fictional fixtures
fairwire-email-gateway demo
```

## Audit log and data

Every call is written to `.fairwire/audit.jsonl` under the root: hash-chained JSON lines, with arguments stored as a hash, signed with an Ed25519 key when you configure one. Everything runs on your machine on files you choose. No network calls, no telemetry, no credentials. The bundled fixtures are fictional.

<!-- generated:end -->

## Limits

- Reads only the files you export and give it. It does not log in to a firewall, switch, controller, cloud console, identity provider or any other live system.
- Verdicts are the gateway's own; a message it missed is not in this review. Pair it with sign-in logs for compromised accounts.
- Mail authentication records (SPF, DKIM, DMARC) are checked by the Fairbooks mail authentication agent, not here.
- Thresholds are working defaults in a settings file you control; they are not a vendor rule, a requirement of any standard or a security guarantee.
- Results returned to the AI model have the names of people, sign-in names, e-mail addresses, phone numbers and client addresses masked. The files written here keep the real values: keep them in a secure folder.
- It changes nothing on a live device, firewall, DNS zone, directory or cloud account. Every change it suggests is a draft that one named person applies.
- Export layouts were written from knowledge of common exports and have not been tested on live customer accounts. Run `inspect` on a new export and name columns in `fairwire-sources.json` when they differ.

## License

MIT. Fictional data only in `fixtures/`.
