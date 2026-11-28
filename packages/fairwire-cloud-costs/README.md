# Fairwire Cloud Costs

Cloud bill review from AWS, Azure or Google Cloud cost exports: services that jumped month on month, spend with no owner tag, spend in regions you do not use, dev and test resources charged around the clock, data egress, and commitments about to expire. Drafts notes for owners; never changes a cloud account.

Part of **Fairwire**, the IT and network family of [Fair Agents](https://fair-agents.com) agents. The software is free (MIT); you pay a fixed price for the setup on your files. It reads files your IT team exports, on your own computer, and drafts notes. Every change to a live device, firewall, DNS zone, directory or cloud account stays one named person's click.

## What it checks

| Finding | What it means |
|---|---|
| `region_not_allowed` | Spend in a region outside your list (often a forgotten test or a mistake, sometimes a stolen account). |
| `month_jump` | A service in an account that cost much more this month than last month. |
| `untagged_spend` | A share of the month's spend with no owner tag, so nobody is accountable for it. |
| `commitment_expiring` | A savings plan, reservation or committed-use discount that ends soon; renewing or not changes next month's bill. |
| `dev_always_on` | A development or test resource billed for (almost) every hour of the month, nights and weekends included. |
| `egress_share` | Data transfer out of the cloud is a large share of an account's spend. |
| `marketplace_charge` | A marketplace or third-party charge on the cloud bill, for its owner to confirm. |

Findings come back worst first (high, medium, low). A finding a named person has reviewed can be accepted as known, with a reason and a date to look again; it then moves to "Accepted as known" instead of counting as open.

## Settings

Pass a settings file with `settings`. Every setting is optional; a misspelt setting is refused by name.

| Setting | What it does |
|---|---|
| `allowed_regions` | Regions you use (no check when empty) |
| `jump_pct` | Month-on-month rise in percent that is flagged (default 50) |
| `jump_min` | Smallest rise in money worth flagging (default 100) |
| `untagged_pct` | Share of the month's spend with no owner above which it is flagged (default 10) |
| `dev_environments` | Environment tag values that mean development or test (default dev, test, staging, qa, sandbox) |
| `always_on_share` | Share of the month's hours that counts as always on (default 0.95) |
| `egress_pct` | Share of an account's spend on data transfer out above which it is flagged (default 10) |
| `commitment_notice_days` | Days before a commitment ends to start flagging it (default 60) |

## What it never does

- `cloud_stop_resource` is refused: Fairwire Cloud Costs never stops, resizes or deletes a cloud resource.
- `cloud_buy_commitment` is refused: Fairwire Cloud Costs never buys or renews a savings plan, reservation or commitment.
- `cloud_costs_request_send` waits for one named person's click, even in Auto (`binding_send`).
- `cloud_costs_accept_learning` waits for one named person's click, even in Auto (`accept_learning`).
- `cloud_costs_retire_memory` waits for one named person's click, even in Auto (`accept_learning`).
- `cloud_stop_resource` waits for one named person's click, even in Auto (`production_deploy`).
- `cloud_buy_commitment` waits for one named person's click, even in Auto (`move_money`).

<!-- generated:start -->

## A demo run

`npx -y fairwire-cloud-costs demo` runs the agent on the fictional files in [`fixtures/`](fixtures) in a temporary folder. Captured output:

```text
Fairwire Cloud Costs demo (fictional data) in a temporary folder, Auto on for the draft only

▶ Check the exported files
  status: executed  decision: allow
  2026-10: 4165 spent (previous month 2730), credits -50, 29.1% untagged: 10 open finding(s), 1 high.
    high    region_not_allowed         prod-acct
    medium  commitment_expiring        SP-001
    medium  month_jump                 prod-acct
    medium  month_jump                 prod-acct
    medium  untagged_spend             2026-10
    low     dev_always_on              dev-acct
    low     dev_always_on              prod-acct
    low     egress_share               prod-acct
    low     marketplace_charge         prod-acct
    low     month_jump                 prod-acct

▶ Explain one finding
  status: executed  decision: allow
  low dev_always_on: dev resource i-dev1 in dev-acct ran 744 of 744 hours in 2026-10 (310). Fix: Stop it nights and weekends with a schedule, if nobody needs it then.

▶ Write the worklist
  status: executed  decision: allow
  Cloud bill review written: 2026-10: 4165 spent (previous month 2730), credits -50, 29.1% untagged: 10 open finding(s), 1 high.

▶ Draft the note for a person
  status: executed  decision: allow  (auto)
  owner note 2026-11-18 drafted with 1 open marker(s) ([TO CONFIRM account owners and finance]). Nothing was sent.

▶ Auto: approving it still waits for one named person
  status: needs_approval  decision: ask
  reason: binding_send stays one-click, even in Auto

▶ The agent tries to change the live system itself
  status: blocked  decision: block
  reason: Fairwire Cloud Costs never stops, resizes or deletes a cloud resource.
```

## Tools

| Tool | What it does | Policy |
|---|---|---|
| `cloud_costs_check` | Review the latest month of cloud costs against the month before and list region, jump, tagging, commitment, always-on, egress and marketplace findings. | runs |
| `cloud_costs_explain` | Every finding for one account, subscription or project. | runs |
| `cloud_costs_write_report` | Write cloud-costs.csv (one row per finding, with blank owner and decision columns) and cloud-costs.html into out_dir (default fairwire-out/cloud_costs). | runs |
| `cloud_costs_draft_owner_note` | Write drafts/owner_note-<date>.md: the open findings at or above min_severity (default medium), each with what to do, addressed to account owners and finance. | asks first (Auto can be opted in) |
| `cloud_costs_request_send` | After one named human click (even in Auto), record that the reviewed owner note draft is approved in owner_note-requests.csv. | one named click, even in Auto (`binding_send`) |
| `cloud_costs_recall` | Search this agent's own memory of the customer's setup: accepted facts (in use) and facts waiting for a person. | runs |
| `cloud_costs_learn` | Propose one fact about the customer's setup for this agent to remember. | runs |
| `cloud_costs_accept_learning` | A named person accepts or rejects a fact waiting in this agent's memory. | one named click, even in Auto (`accept_learning`) |
| `cloud_costs_retire_memory` | A named person stops an accepted fact from applying. | one named click, even in Auto (`accept_learning`) |
| `cloud_stop_resource` | Fairwire Cloud Costs never stops, resizes or deletes a cloud resource. | refused |
| `cloud_buy_commitment` | Fairwire Cloud Costs never buys or renews a savings plan, reservation or commitment. | refused |

Any tool name not in this table is blocked, including names a model invents. `refused` tools are listed so a model can see they exist and are refused.

## Columns it reads

Table inputs can be CSV, TSV, semicolon- or pipe-separated text, Excel `.xlsx`, JSON or JSONL. Columns are matched by the agent's own name, then by the English names below, then by their names in German, French, Spanish, Portuguese, Italian, Japanese, Chinese and Korean. Dates become `YYYY-MM-DD`; amounts and counts are read with either decimal mark. Every result lists under `sources` how each file was read.

### Cloud cost lines (`costs`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `date` (required) | date | Date, Usage Date, Billing Period, Month, lineItem/UsageStartDate, Usage start time | Datum, Date, 日付, 日期 |
| `account` | text | Account, Account ID, Subscription, SubscriptionName, Project, Project name | Konto, Compte, 勘定科目, 科目代码 |
| `service` (required) | text | Service, Product, MeterCategory, Service description, lineItem/ProductCode, Service Name | Service, Service, サービス, 服务 |
| `region` | text | Region, Location, ResourceLocation, product/region, Region/Zone | Region, Région, リージョン, 地域 |
| `resource_id` | text | Resource ID, ResourceId, lineItem/ResourceId, Resource, Resource name | - |
| `cost` (required) | amount | Cost, CostInBillingCurrency, Unblended Cost, lineItem/UnblendedCost, Cost ($), Amount | Kosten, Coût, コスト, 费用 |
| `owner` | text | Owner, Tag: owner, resourceTags/user:owner, Owner Tag, Cost Center, Team | Verantwortlich, Responsable, 担当者, 负责人 |
| `environment` | text | Environment, Env, Tag: environment, resourceTags/user:env, Stage | - |
| `usage_type` | text | Usage Type, lineItem/UsageType, MeterName, SKU description, Meter | - |
| `usage_hours` | number | Usage Hours, Hours, Running Hours, Usage Quantity (Hrs) | - |
| `charge_type` | text | Charge Type, lineItem/LineItemType, ChargeType, Cost type | - |

Named exports recognised by their column names:

| System | Export | Recognised by | Layout checked against vendor docs |
|---|---|---|---|
| Amazon Web Services | Cost and Usage Report, CSV | lineItem/UsageAccountId, lineItem/ProductCode, lineItem/UnblendedCost | no |
| Microsoft Azure | Cost details export, CSV | SubscriptionName, MeterCategory, CostInBillingCurrency | no |
| Google Cloud | Billing report downloaded as CSV | Project name, Service description, SKU description | no |

Where a layout says "checked", its column names were compared with the vendor's documentation on that date. The other layouts were written from knowledge of the export and were not checked. None was tested against a live account.

### Commitments (`commitments`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `commitment` (required) | text | Commitment, ID, Savings Plan ID, Reservation ID, Name | - |
| `type` | text | Type, Commitment Type, Plan Type | Typ, Type, 種類, 类型 |
| `end_date` (required) | date | End Date, Expires, Expiration, Term End | Austrittsdatum, Date de sortie, 退職日, 离职日期 |
| `monthly_amount` | amount | Monthly Amount, Monthly Commitment, Amount, Recurring Fee | - |

### Files from other countries

A German export in Windows-1252 with semicolons, `1.234,56` and `03.11.2026`, or a Japanese one in Shift_JIS with `2026/11/03`, is read the same way as the English file. [`fixtures/intl/`](fixtures/intl) has both versions of the demo data, and the eval cases `intl-de-*` and `intl-ja-*` require the same results as the English case. Columns named differently? Run `npx fairwire-cloud-costs inspect <file>` (names and shapes only, never values) and name them in `fairwire-sources.json`:

```json
{ "files": { "exports/devices.csv": { "columns": { "host": "Gerätename" }, "date_order": "dmy" } } }
```

## Memory

fairwire-cloud-costs can remember facts about your setup so the next run does not have to be told again. `cloud_costs_learn` only proposes a fact; it changes nothing until a named person accepts it with `cloud_costs_accept_learning`, which is one click even in Auto. Facts live in one hash-chained file per agent under `.fairwire/memory/`; if the chain does not verify, no fact is used. Credentials, personal identifiers and text that reads like instructions to an AI are refused. Run without memory with `--no-memory`.

| Kind | What an accepted fact changes |
|---|---|
| `known_exception` | that finding is listed under "Accepted as known" instead of as open, until review_by (when given) has passed. |
| `note` | nothing (shown by recall only) |

```bash
fairwire-cloud-costs memory list
fairwire-cloud-costs memory accept MEM-1a2b3c4d5e6f --as "Your Name"
fairwire-cloud-costs memory retire MEM-1a2b3c4d5e6f --as "Your Name" --reason "rule removed"
```

## Install

Node 20 or newer. No other dependencies.

```bash
npx -y fairwire-cloud-costs demo
npx -y fairwire-cloud-costs mcp --root /path/to/your/files
```

Claude Desktop, Cursor and other MCP hosts:

```json
{
  "mcpServers": {
    "fairwire-cloud-costs": {
      "command": "npx",
      "args": [
        "-y",
        "fairwire-cloud-costs",
        "mcp",
        "--root",
        "/path/to/your/files"
      ]
    }
  }
}
```

Claude Code: `claude mcp add fairwire-cloud-costs -- npx -y fairwire-cloud-costs mcp --root .`, or install the `fairwire-cloud-costs` plugin from this repository's marketplace.

## Modes and approvals

- **Review** (`--mode review`): reads and reports only.
- **Assist** (default): the policy above. A tool that asks returns an `approval_id`; a person approves it once with `fairwire-cloud-costs approve <id> --as "Your Name"` (or on the local approvals page, `fairwire-cloud-costs approvals`), and the same call is repeated.
- **Auto** (`--mode auto --auto <tool,...>`): opt-in per tool, with step caps and a kill switch (`fairwire-cloud-costs kill`). Paying, sending, posting to a ledger or a live system and accepting a learned fact stay **one named click even in Auto**; an approval is tied to the sha256 of the reviewed draft, so a changed draft needs a new click.

## CLI

```bash
fairwire-cloud-costs tools                 # every tool, its policy and arguments
fairwire-cloud-costs sources               # the columns each input is read from
fairwire-cloud-costs inspect <file>        # how a file would be read (names and shapes, never values)
fairwire-cloud-costs call cloud_costs_check '{"costs":"<costs>"}'
fairwire-cloud-costs eval                  # the private eval cases on the fictional fixtures
fairwire-cloud-costs demo
```

## Audit log and data

Every call is written to `.fairwire/audit.jsonl` under the root: hash-chained JSON lines, with arguments stored as a hash, signed with an Ed25519 key when you configure one. Everything runs on your machine on files you choose. No network calls, no telemetry, no credentials. The bundled fixtures are fictional.

<!-- generated:end -->

## Limits

- Reads only the files you export and give it. It does not log in to a firewall, switch, controller, cloud console, identity provider or any other live system.
- Amounts are the costs in your export, in its currency, before or after discounts as the export shows them; this is not an invoice check against your contract.
- Month-on-month rises compare the last two months in the file; a month that is not complete yet looks smaller.
- Thresholds are working defaults in a settings file you control; they are not a vendor rule, a requirement of any standard or a security guarantee.
- Totals are arithmetic on the numbers in your files, not forecasts or quotes.
- It changes nothing on a live device, firewall, DNS zone, directory or cloud account. Every change it suggests is a draft that one named person applies.
- Export layouts were written from knowledge of common exports and have not been tested on live customer accounts. Run `inspect` on a new export and name columns in `fairwire-sources.json` when they differ.

## License

MIT. Fictional data only in `fixtures/`.
