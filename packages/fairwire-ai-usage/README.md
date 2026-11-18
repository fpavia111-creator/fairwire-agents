# Fairwire AI Usage

AI usage review from an LLM usage or request log: the same prompt sent again and again, very large prompts, a large model used for tiny jobs, answers cut off at the output limit, and spend by app and model from a price table you supply. Drafts notes for the app owner.

Part of **Fairwire**, the IT and network family of [Mythos Machines](https://fair-agents.com) agents. The software is free (MIT); you pay a fixed price for the setup on your files. It reads files your IT team exports, on your own computer, and drafts notes. Every change to a live device, firewall, DNS zone, directory or cloud account stays one named person's click.

## What it checks

| Finding | What it means |
|---|---|
| `repeated_prompt` | The same prompt was sent again and again without a cache hit: the extra copies are tokens a prompt cache or a stored answer could save. |
| `large_prompt` | Requests over your prompt-size limit (whole documents pasted in, long histories kept). |
| `oversized_model` | A model you list as large used for many tiny requests that a smaller model could likely handle. |
| `cut_off_answers` | Answers stopped at the output limit (stop reason "length" or "max_tokens"), so users saw cut-off text. |
| `large_payload` | Requests whose payload was over your byte limit (images or files sent whole). |
| `no_app_tag` | Requests with no app or project tag, so nobody owns their cost. |

Findings come back worst first (high, medium, low). A finding a named person has reviewed can be accepted as known, with a reason and a date to look again; it then moves to "Accepted as known" instead of counting as open.

## Settings

Pass a settings file with `settings`. Every setting is optional; a misspelt setting is refused by name.

| Setting | What it does |
|---|---|
| `prices` | Your price table by model name, from your provider contract: { "model": { "input_per_mtok": n, "output_per_mtok": n, "cached_per_mtok": n } }. Without it, no costs are shown. |
| `large_models` | Model names you consider large (for the oversized-model check) |
| `repeat_min` | Copies of one prompt before it is flagged (default 3) |
| `large_prompt_tokens` | Prompt tokens above which a request is large (default 50000) |
| `tiny_prompt_tokens` | Prompt tokens under which a request is tiny (default 500) |
| `tiny_output_tokens` | Output tokens under which a request is tiny (default 100) |
| `tiny_requests_min` | Tiny requests on a large model before it is flagged (default 5) |
| `cutoff_min` | Cut-off answers in one app before it is flagged (default 3) |
| `large_payload_bytes` | Payload bytes above which a request is flagged (default 500000) |

## What it never does

- `llm_gateway_change_config` is refused: Fairwire AI Usage never changes a model, cache or limit in your gateway or app.
- `api_key_revoke` is refused: Fairwire AI Usage never revokes an API key.
- `ai_usage_request_send` waits for one named person's click, even in Auto (`binding_send`).
- `ai_usage_accept_learning` waits for one named person's click, even in Auto (`accept_learning`).
- `ai_usage_retire_memory` waits for one named person's click, even in Auto (`accept_learning`).
- `llm_gateway_change_config` waits for one named person's click, even in Auto (`production_deploy`).
- `api_key_revoke` waits for one named person's click, even in Auto (`revoke_access`).

<!-- generated:start -->

## A demo run

`npx -y fairwire-ai-usage demo` runs the agent on the fictional files in [`fixtures/`](fixtures) in a temporary folder. Captured output:

```text
Fairwire AI Usage demo (fictional data) in a temporary folder, Auto on for the draft only

▶ Check the exported files
  status: executed  decision: allow
  23 request(s), 258200 input and 13244 output tokens, 0.4% of input cached, spend 4.55: 6 open finding(s), 0 high.
    medium  cut_off_answers            doc-summarizer
    medium  large_prompt               doc-summarizer
    medium  repeated_prompt            support-bot
    low     large_payload              doc-summarizer
    low     no_app_tag                 (no app)
    low     oversized_model            code-helper

▶ Explain one finding
  status: executed  decision: allow
  medium cut_off_answers: 3 of 5 answers in doc-summarizer stopped at the output limit. Fix: Raise the output limit for this app or ask for shorter answers in the prompt.
medium large_prompt: 3 request(s) in doc-summarizer sent over 50000 prompt tokens (largest 82000). Fix: Send only the parts of the document the question needs, or summarise long histories.
low large_payload: 1 request(s) in doc-summarizer carried more than 500000 bytes (largest 900000). Fix: Resize images and send text instead of whole files where you can.

▶ Write the worklist
  status: executed  decision: allow
  AI usage review written: 23 request(s), 258200 input and 13244 output tokens, 0.4% of input cached, spend 4.55: 6 open finding(s), 0 high.

▶ Draft the note for a person
  status: executed  decision: allow  (auto)
  owner note 2026-11-18 drafted with 1 open marker(s) ([TO CONFIRM the owner of each app]). Nothing was sent.

▶ Auto: approving it still waits for one named person
  status: needs_approval  decision: ask
  reason: binding_send stays one-click, even in Auto

▶ The agent tries to change the live system itself
  status: blocked  decision: block
  reason: Fairwire AI Usage never changes a model, cache or limit in your gateway or app.
```

## Tools

| Tool | What it does | Policy |
|---|---|---|
| `ai_usage_check` | Review the request log and list repeated prompts, large prompts and payloads, oversized models, cut-off answers and untagged spend. | runs |
| `ai_usage_explain` | Every finding for one app or project. | runs |
| `ai_usage_write_report` | Write ai-usage.csv (one row per finding, with blank owner and decision columns) and ai-usage.html into out_dir (default fairwire-out/ai_usage). | runs |
| `ai_usage_draft_owner_note` | Write drafts/owner_note-<date>.md: the open findings at or above min_severity (default medium), each with what to do, addressed to the owner of each app. | asks first (Auto can be opted in) |
| `ai_usage_request_send` | After one named human click (even in Auto), record that the reviewed owner note draft is approved in owner_note-requests.csv. | one named click, even in Auto (`binding_send`) |
| `ai_usage_recall` | Search this agent's own memory of the customer's setup: accepted facts (in use) and facts waiting for a person. | runs |
| `ai_usage_learn` | Propose one fact about the customer's setup for this agent to remember. | runs |
| `ai_usage_accept_learning` | A named person accepts or rejects a fact waiting in this agent's memory. | one named click, even in Auto (`accept_learning`) |
| `ai_usage_retire_memory` | A named person stops an accepted fact from applying. | one named click, even in Auto (`accept_learning`) |
| `llm_gateway_change_config` | Fairwire AI Usage never changes a model, cache or limit in your gateway or app. | refused |
| `api_key_revoke` | Fairwire AI Usage never revokes an API key. | refused |

Any tool name not in this table is blocked, including names a model invents. `refused` tools are listed so a model can see they exist and are refused.

## Columns it reads

Table inputs can be CSV, TSV, semicolon- or pipe-separated text, Excel `.xlsx`, JSON or JSONL. Columns are matched by the agent's own name, then by the English names below, then by their names in German, French, Spanish, Portuguese, Italian, Japanese, Chinese and Korean. Dates become `YYYY-MM-DD`; amounts and counts are read with either decimal mark. Every result lists under `sources` how each file was read.

### LLM requests (`usage`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `request_id` (required) | text | Request ID, ID, request id, Trace ID, Call ID | Anfrage-ID, N° de demande, 申請番号, 申请编号 |
| `at` | date and time | Timestamp, Time, Created, Date, created_at | - |
| `app` | text | App, Application, Project, Service, Workspace, API Key Name | Anwendung, Application, アプリケーション, 应用 |
| `user` | text | User, User ID, Caller, Email, End User | Benutzer, Utilisateur, ユーザー, 用户 |
| `model` | text | Model, Model ID, Model Name, Engine | Modell, Modèle, モデル, 型号 |
| `prompt_tokens` (required) | number | Input Tokens, Prompt Tokens, input_tokens, Tokens In | Token, Jetons, トークン数, 令牌数 |
| `output_tokens` | number | Output Tokens, Completion Tokens, output_tokens, Tokens Out | - |
| `cached_tokens` | number | Cached Tokens, Cache Read Tokens, cache_read_input_tokens, Cached Input Tokens | - |
| `stop_reason` | text | Stop Reason, Finish Reason, finish_reason, stop_reason | - |
| `bytes` | number | Bytes, Payload Bytes, Request Size, Size | Bytes, Octets, バイト数, 字节数 |
| `prompt` | text | Prompt, Prompt Text, Input, Message, Query | - |
| `prompt_hash` | text | Prompt Hash, Input Hash, Prompt Fingerprint | - |

### Files from other countries

A German export in Windows-1252 with semicolons, `1.234,56` and `03.11.2026`, or a Japanese one in Shift_JIS with `2026/11/03`, is read the same way as the English file. [`fixtures/intl/`](fixtures/intl) has both versions of the demo data, and the eval cases `intl-de-*` and `intl-ja-*` require the same results as the English case. Columns named differently? Run `npx fairwire-ai-usage inspect <file>` (names and shapes only, never values) and name them in `fairwire-sources.json`:

```json
{ "files": { "exports/devices.csv": { "columns": { "host": "Gerätename" }, "date_order": "dmy" } } }
```

## Memory

fairwire-ai-usage can remember facts about your setup so the next run does not have to be told again. `ai_usage_learn` only proposes a fact; it changes nothing until a named person accepts it with `ai_usage_accept_learning`, which is one click even in Auto. Facts live in one hash-chained file per agent under `.fairwire/memory/`; if the chain does not verify, no fact is used. Credentials, personal identifiers and text that reads like instructions to an AI are refused. Run without memory with `--no-memory`.

| Kind | What an accepted fact changes |
|---|---|
| `known_exception` | that finding is listed under "Accepted as known" instead of as open, until review_by (when given) has passed. |
| `note` | nothing (shown by recall only) |

```bash
fairwire-ai-usage memory list
fairwire-ai-usage memory accept MEM-1a2b3c4d5e6f --as "Your Name"
fairwire-ai-usage memory retire MEM-1a2b3c4d5e6f --as "Your Name" --reason "rule removed"
```

## Install

Node 20 or newer. No other dependencies.

```bash
npx -y fairwire-ai-usage demo
npx -y fairwire-ai-usage mcp --root /path/to/your/files
```

Claude Desktop, Cursor and other MCP hosts:

```json
{
  "mcpServers": {
    "fairwire-ai-usage": {
      "command": "npx",
      "args": [
        "-y",
        "fairwire-ai-usage",
        "mcp",
        "--root",
        "/path/to/your/files"
      ]
    }
  }
}
```

Claude Code: `claude mcp add fairwire-ai-usage -- npx -y fairwire-ai-usage mcp --root .`, or install the `fairwire-ai-usage` plugin from this repository's marketplace.

## Modes and approvals

- **Review** (`--mode review`): reads and reports only.
- **Assist** (default): the policy above. A tool that asks returns an `approval_id`; a person approves it once with `fairwire-ai-usage approve <id> --as "Your Name"` (or on the local approvals page, `fairwire-ai-usage approvals`), and the same call is repeated.
- **Auto** (`--mode auto --auto <tool,...>`): opt-in per tool, with step caps and a kill switch (`fairwire-ai-usage kill`). Paying, sending, posting to a ledger or a live system and accepting a learned fact stay **one named click even in Auto**; an approval is tied to the sha256 of the reviewed draft, so a changed draft needs a new click.

## CLI

```bash
fairwire-ai-usage tools                 # every tool, its policy and arguments
fairwire-ai-usage sources               # the columns each input is read from
fairwire-ai-usage inspect <file>        # how a file would be read (names and shapes, never values)
fairwire-ai-usage call ai_usage_check '{"usage":"<usage>"}'
fairwire-ai-usage eval                  # the private eval cases on the fictional fixtures
fairwire-ai-usage demo
```

## Audit log and data

Every call is written to `.fairwire/audit.jsonl` under the root: hash-chained JSON lines, with arguments stored as a hash, signed with an Ed25519 key when you configure one. Everything runs on your machine on files you choose. No network calls, no telemetry, no credentials. The bundled fixtures are fictional.

<!-- generated:end -->

## Limits

- Reads only the files you export and give it. It does not log in to a firewall, switch, controller, cloud console, identity provider or any other live system.
- Costs use only the price table you supply; without one no cost is shown. They are arithmetic on the logged tokens, not your invoice.
- Prompts are compared by a hash of their text; prompt text is never returned or written to the report.
- Thresholds are working defaults in a settings file you control; they are not a vendor rule, a requirement of any standard or a security guarantee.
- Results returned to the AI model have the names of people, sign-in names, e-mail addresses, phone numbers and client addresses masked. The files written here keep the real values: keep them in a secure folder.
- Export layouts were written from knowledge of common exports and have not been tested on live customer accounts. Run `inspect` on a new export and name columns in `fairwire-sources.json` when they differ.

## Licence

MIT. Fictional data only in `fixtures/`.
