# Icarus of Retries

Retry cost review from API or LLM request logs: tokens and bytes spent on retries, retries of errors that cannot succeed (4xx), retry storms with no back-off, 429s retried before Retry-After, and endpoints whose retry share is highest. Drafts notes for the service owner.

Part of **Fairwire**, the IT and network family of [Mythos Machines](https://fair-agents.com) agents. The software is free (MIT); you pay a fixed price for the setup on your files. It reads files your IT team exports, on your own computer, and drafts notes. Every change to a live device, firewall, DNS zone, directory or cloud account stays one named person's click.

## What it checks

| Finding | What it means |
|---|---|
| `retry_after_ignored` | After a 429 or 503 that said how long to wait (Retry-After), the next attempt came sooner. |
| `retry_on_client_error` | A request was retried after an error that cannot succeed on retry (400, 401, 403, 404, 422 and the like). |
| `no_backoff` | Attempts came less than your minimum gap apart, or the wait did not grow between attempts (a retry storm). |
| `retry_spend` | An endpoint where retries used more than your share of its tokens or bytes. |
| `retries_exhausted` | Requests that still failed after their last attempt. |
| `server_error_rate` | An endpoint whose first attempts fail with 5xx more often than your limit. |

Findings come back worst first (high, medium, low). A finding a named person has reviewed can be accepted as known, with a reason and a date to look again; it then moves to "Accepted as known" instead of counting as open.

## Settings

Pass a settings file with `settings`. Every setting is optional; a misspelt setting is refused by name.

| Setting | What it does |
|---|---|
| `min_gap_seconds` | Shortest acceptable wait between attempts in seconds (default 1) |
| `retry_share_pct` | Share of an endpoint's tokens or bytes spent on retries above which it is flagged (default 10) |
| `server_error_pct` | Share of first attempts with 5xx above which an endpoint is flagged (default 5) |
| `retryable_4xx` | 4xx codes that may succeed on retry (default 408, 409, 425, 429) |

## What it never does

- `gateway_set_rate_limit` is refused: Icarus never changes a gateway, rate limit or client setting.
- `service_restart` is refused: Icarus never restarts a service.
- `icarus_request_send` waits for one named person's click, even in Auto (`binding_send`).
- `icarus_accept_learning` waits for one named person's click, even in Auto (`accept_learning`).
- `icarus_retire_memory` waits for one named person's click, even in Auto (`accept_learning`).
- `gateway_set_rate_limit` waits for one named person's click, even in Auto (`production_deploy`).
- `service_restart` waits for one named person's click, even in Auto (`production_deploy`).

<!-- generated:start -->

## A demo run

`npx -y icarus-of-retries demo` runs the agent on the fictional files in [`fixtures/`](fixtures) in a temporary folder. Captured output:

```text
Icarus of Retries demo (fictional data) in a temporary folder, Auto on for the draft only

▶ Check the exported files
  status: executed  decision: allow
  25 request(s), 33 attempt(s), 8 retry(ies) using 6600 tokens (22%) and 4 MB: 10 open finding(s), 1 high.
    high    retry_after_ignored        /v1/chat
    medium  no_backoff                 /v1/chat
    medium  retry_on_client_error      /v1/embed
    medium  retry_spend                /v1/chat
    medium  retry_spend                /v1/embed
    medium  retry_spend                /v1/files
    low     retries_exhausted          /v1/embed
    low     retries_exhausted          /v1/files
    low     server_error_rate          /v1/chat
    low     server_error_rate          /v1/files

▶ Explain one finding
  status: executed  decision: allow
  high retry_after_ignored: 1 retry(ies) on /v1/chat came before the wait the server asked for: R-003 (waited 2s of 10s). Fix: Read the Retry-After header and wait at least that long; most client libraries have an option for it.
medium no_backoff: 1 request(s) on /v1/chat retried with no growing wait: R-002. Fix: Use exponential back-off with jitter and a cap on attempts.
medium retry_spend: Retries on /v1/chat used 6000 of 27300 tokens (22%) and 24 KB of 112 KB (21.4%). Fix: Fix the causes above first; then cap attempts so a bad hour cannot multiply the bill.
low server_error_rate: 5.9% of first attempts on /v1/chat failed with 5xx (1 of 17). Fix: Raise it with the service owner or provider with these request ids.

▶ Write the worklist
  status: executed  decision: allow
  Retry cost review written: 25 request(s), 33 attempt(s), 8 retry(ies) using 6600 tokens (22%) and 4 MB: 10 open finding(s), 1 high.

▶ Draft the note for a person
  status: executed  decision: allow  (auto)
  owner note 2026-11-18 drafted with 1 open marker(s) ([TO CONFIRM the owner of each service]). Nothing was sent.

▶ Auto: approving it still waits for one named person
  status: needs_approval  decision: ask
  reason: binding_send stays one-click, even in Auto

▶ The agent tries to change the live system itself
  status: blocked  decision: block
  reason: Icarus never changes a gateway, rate limit or client setting.
```

## Tools

| Tool | What it does | Policy |
|---|---|---|
| `icarus_check` | Group attempts by request id and list ignored Retry-After, retries of client errors, retry storms, retry spend, exhausted requests and 5xx-heavy endpoints. | runs |
| `icarus_explain` | Every finding for one endpoint. | runs |
| `icarus_write_report` | Write icarus-retries.csv (one row per finding, with blank owner and decision columns) and icarus-retries.html into out_dir (default fairwire-out/icarus). | runs |
| `icarus_draft_owner_note` | Write drafts/owner_note-<date>.md: the open findings at or above min_severity (default medium), each with what to do, addressed to the owner of each service. | asks first (Auto can be opted in) |
| `icarus_request_send` | After one named human click (even in Auto), record that the reviewed owner note draft is approved in owner_note-requests.csv. | one named click, even in Auto (`binding_send`) |
| `icarus_recall` | Search this agent's own memory of the customer's setup: accepted facts (in use) and facts waiting for a person. | runs |
| `icarus_learn` | Propose one fact about the customer's setup for this agent to remember. | runs |
| `icarus_accept_learning` | A named person accepts or rejects a fact waiting in this agent's memory. | one named click, even in Auto (`accept_learning`) |
| `icarus_retire_memory` | A named person stops an accepted fact from applying. | one named click, even in Auto (`accept_learning`) |
| `gateway_set_rate_limit` | Icarus never changes a gateway, rate limit or client setting. | refused |
| `service_restart` | Icarus never restarts a service. | refused |

Any tool name not in this table is blocked, including names a model invents. `refused` tools are listed so a model can see they exist and are refused.

## Columns it reads

Table inputs can be CSV, TSV, semicolon- or pipe-separated text, Excel `.xlsx`, JSON or JSONL. Columns are matched by the agent's own name, then by the English names below, then by their names in German, French, Spanish, Portuguese, Italian, Japanese, Chinese and Korean. Dates become `YYYY-MM-DD`; amounts and counts are read with either decimal mark. Every result lists under `sources` how each file was read.

### Request attempts (`requests`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `request_id` (required) | text | Request ID, Correlation ID, Trace ID, Operation ID, id | Anfrage-ID, N° de demande, 申請番号, 申请编号 |
| `attempt` | number | Attempt, Try, Retry Number, Attempt Number | - |
| `at` | date and time | Timestamp, Time, Start, Sent At, Date | - |
| `endpoint` | text | Endpoint, Path, Route, URL, Operation, Method | - |
| `status` | number | Status, Status Code, HTTP Status, Code, Response Code | Status, Statut, ステータス, 状态 |
| `tokens` | number | Tokens, Total Tokens, Input Tokens, Token Count | Token, Jetons, トークン数, 令牌数 |
| `bytes` | number | Bytes, Request Bytes, Payload Bytes, Size | Bytes, Octets, バイト数, 字节数 |
| `retry_after` | number | Retry-After, Retry After, Retry After (s), Backoff Hint | - |

### Files from other countries

A German export in Windows-1252 with semicolons, `1.234,56` and `03.11.2026`, or a Japanese one in Shift_JIS with `2026/11/03`, is read the same way as the English file. [`fixtures/intl/`](fixtures/intl) has both versions of the demo data, and the eval cases `intl-de-*` and `intl-ja-*` require the same results as the English case. Columns named differently? Run `npx icarus-of-retries inspect <file>` (names and shapes only, never values) and name them in `fairwire-sources.json`:

```json
{ "files": { "exports/devices.csv": { "columns": { "host": "Gerätename" }, "date_order": "dmy" } } }
```

## Memory

icarus-of-retries can remember facts about your setup so the next run does not have to be told again. `icarus_learn` only proposes a fact; it changes nothing until a named person accepts it with `icarus_accept_learning`, which is one click even in Auto. Facts live in one hash-chained file per agent under `.fairwire/memory/`; if the chain does not verify, no fact is used. Credentials, personal identifiers and text that reads like instructions to an AI are refused. Run without memory with `--no-memory`.

| Kind | What an accepted fact changes |
|---|---|
| `known_exception` | that finding is listed under "Accepted as known" instead of as open, until review_by (when given) has passed. |
| `note` | nothing (shown by recall only) |

```bash
icarus-of-retries memory list
icarus-of-retries memory accept MEM-1a2b3c4d5e6f --as "Your Name"
icarus-of-retries memory retire MEM-1a2b3c4d5e6f --as "Your Name" --reason "rule removed"
```

## Install

Node 20 or newer. No other dependencies.

```bash
npx -y icarus-of-retries demo
npx -y icarus-of-retries mcp --root /path/to/your/files
```

Claude Desktop, Cursor and other MCP hosts:

```json
{
  "mcpServers": {
    "icarus-of-retries": {
      "command": "npx",
      "args": [
        "-y",
        "icarus-of-retries",
        "mcp",
        "--root",
        "/path/to/your/files"
      ]
    }
  }
}
```

Claude Code: `claude mcp add icarus-of-retries -- npx -y icarus-of-retries mcp --root .`, or install the `icarus-of-retries` plugin from this repository's marketplace.

## Modes and approvals

- **Review** (`--mode review`): reads and reports only.
- **Assist** (default): the policy above. A tool that asks returns an `approval_id`; a person approves it once with `icarus-of-retries approve <id> --as "Your Name"` (or on the local approvals page, `icarus-of-retries approvals`), and the same call is repeated.
- **Auto** (`--mode auto --auto <tool,...>`): opt-in per tool, with step caps and a kill switch (`icarus-of-retries kill`). Paying, sending, posting to a ledger or a live system and accepting a learned fact stay **one named click even in Auto**; an approval is tied to the sha256 of the reviewed draft, so a changed draft needs a new click.

## CLI

```bash
icarus-of-retries tools                 # every tool, its policy and arguments
icarus-of-retries sources               # the columns each input is read from
icarus-of-retries inspect <file>        # how a file would be read (names and shapes, never values)
icarus-of-retries call icarus_check '{"requests":"<requests>"}'
icarus-of-retries eval                  # the private eval cases on the fictional fixtures
icarus-of-retries demo
```

## Audit log and data

Every call is written to `.fairwire/audit.jsonl` under the root: hash-chained JSON lines, with arguments stored as a hash, signed with an Ed25519 key when you configure one. Everything runs on your machine on files you choose. No network calls, no telemetry, no credentials. The bundled fixtures are fictional.

<!-- generated:end -->

## Limits

- Reads only the files you export and give it. It does not log in to a firewall, switch, controller, cloud console, identity provider or any other live system.
- Attempts are grouped by the request id in your log; a client that gives each attempt a new id hides its retries.
- Tokens and bytes are the figures in the log; no prices are applied.
- Thresholds are working defaults in a settings file you control; they are not a vendor rule, a requirement of any standard or a security guarantee.
- It changes nothing on a live device, firewall, DNS zone, directory or cloud account. Every change it suggests is a draft that one named person applies.
- Export layouts were written from knowledge of common exports and have not been tested on live customer accounts. Run `inspect` on a new export and name columns in `fairwire-sources.json` when they differ.

## Licence

MIT. Fictional data only in `fixtures/`.
