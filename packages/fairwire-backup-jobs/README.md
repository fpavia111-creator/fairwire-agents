# Fairwire Backup Jobs

Backup job results review: jobs failing again and again, systems with no good backup inside your recovery point, critical systems no job covers, backups much smaller than usual, no offsite or immutable copy, and retention shorter than your policy. Drafts notes; never starts or deletes a backup.

Part of **Fairwire**, the IT and network family of [Fair Agents](https://fair-agents.com) agents. The software is free (MIT); you pay a fixed price for the setup on your files. It reads files your IT team exports, on your own computer, and drafts notes. Every change to a live device, firewall, DNS zone, directory or cloud account stays one named person's click.

## What it checks

| Finding | What it means |
|---|---|
| `not_covered` | A system on your critical list that no backup job protects. |
| `no_recent_good_backup` | A system with no successful backup inside its recovery point objective (RPO). |
| `repeated_failures` | The last few runs for a system all failed. |
| `size_drop` | The last good backup is far smaller than usual (data may be missing from it). |
| `no_offsite_copy` | A critical system with no recent offsite or immutable copy (ransomware can reach copies kept next to the original). |
| `short_retention` | Backups kept for fewer days than your policy. |
| `warnings_ignored` | The last few runs for a system all ended with warnings. |

Findings come back worst first (high, medium, low). A finding a named person has reviewed can be accepted as known, with a reason and a date to look again; it then moves to "Accepted as known" instead of counting as open.

## Settings

Pass a settings file with `settings`. Every setting is optional; a misspelt setting is refused by name.

| Setting | What it does |
|---|---|
| `rpo_hours` | Default recovery point objective in hours when a system has none (default 24) |
| `failures_in_a_row` | Failed runs in a row before a system is flagged (default 3) |
| `warnings_in_a_row` | Warning runs in a row before a system is flagged (default 3) |
| `size_drop_pct` | Drop below the usual size, in percent, that is flagged (default 50) |
| `offsite_days` | Days within which a critical system needs an offsite or immutable copy (default 7) |
| `retention_days_min` | Days your policy says backups must be kept (default 30) |

## What it never does

- `backup_start_job` is refused: Fairwire Backup Jobs never starts, stops or edits a backup job.
- `backup_delete_restore_points` is refused: Fairwire Backup Jobs never deletes a backup or restore point.
- `backups_request_send` waits for one named person's click, even in Auto (`binding_send`).
- `backups_accept_learning` waits for one named person's click, even in Auto (`accept_learning`).
- `backups_retire_memory` waits for one named person's click, even in Auto (`accept_learning`).
- `backup_start_job` waits for one named person's click, even in Auto (`production_deploy`).
- `backup_delete_restore_points` waits for one named person's click, even in Auto (`delete_personal_data`).

<!-- generated:start -->

## A demo run

`npx -y fairwire-backup-jobs demo` runs the agent on the fictional files in [`fixtures/`](fixtures) in a temporary folder. Captured output:

```text
Fairwire Backup Jobs demo (fictional data) in a temporary folder, Auto on for the draft only

▶ Check the exported files
  status: executed  decision: allow
  26 run(s) for 4 system(s), 65.4% successful, 3 failed, 4 critical system(s) listed: 8 open finding(s), 2 high.
    high    no_recent_good_backup      FILE-01
    high    not_covered                APP-02
    medium  no_offsite_copy            FILE-01
    medium  no_offsite_copy            MAIL-01
    medium  repeated_failures          FILE-01
    medium  size_drop                  SQL-01
    low     short_retention            MAIL-01
    low     warnings_ignored           MAIL-01

▶ Explain one finding
  status: executed  decision: allow
  high no_recent_good_backup: FILE-01 has no good backup in the last 24 hours (last good run 2026-11-14 01:30:00). Fix: Run the job now and fix whatever stopped it.
medium no_offsite_copy: FILE-01 has no offsite or immutable copy since 2026-11-02. Fix: Add a copy job to an offsite or immutable target.
medium repeated_failures: The last 3 runs for FILE-01 (Nightly-Files) failed. Fix: Read the job log; common causes are credentials, a full repository or a changed host.

▶ Write the worklist
  status: executed  decision: allow
  Backup job results written: 26 run(s) for 4 system(s), 65.4% successful, 3 failed, 4 critical system(s) listed: 8 open finding(s), 2 high.

▶ Draft the note for a person
  status: executed  decision: allow  (auto)
  backup note 2026-11-17 drafted with 1 open marker(s) ([TO CONFIRM backup and infrastructure team]). Nothing was sent.

▶ Auto: approving it still waits for one named person
  status: needs_approval  decision: ask
  reason: binding_send stays one-click, even in Auto

▶ The agent tries to change the live system itself
  status: blocked  decision: block
  reason: Fairwire Backup Jobs never starts, stops or edits a backup job.
```

## Tools

| Tool | What it does | Policy |
|---|---|---|
| `backups_check` | Review the job history per system and list uncovered critical systems, missed RPOs, repeated failures and warnings, size drops, missing offsite copies and short retention. | runs |
| `backups_explain` | Every finding for one protected system. | runs |
| `backups_write_report` | Write backup-jobs.csv (one row per finding, with blank owner and decision columns) and backup-jobs.html into out_dir (default fairwire-out/backups). | runs |
| `backups_draft_backup_note` | Write drafts/backup_note-<date>.md: the open findings at or above min_severity (default medium), each with what to do, addressed to backup and infrastructure team. | asks first (Auto can be opted in) |
| `backups_request_send` | After one named human click (even in Auto), record that the reviewed backup note draft is approved in backup_note-requests.csv. | one named click, even in Auto (`binding_send`) |
| `backups_recall` | Search this agent's own memory of the customer's setup: accepted facts (in use) and facts waiting for a person. | runs |
| `backups_learn` | Propose one fact about the customer's setup for this agent to remember. | runs |
| `backups_accept_learning` | A named person accepts or rejects a fact waiting in this agent's memory. | one named click, even in Auto (`accept_learning`) |
| `backups_retire_memory` | A named person stops an accepted fact from applying. | one named click, even in Auto (`accept_learning`) |
| `backup_start_job` | Fairwire Backup Jobs never starts, stops or edits a backup job. | refused |
| `backup_delete_restore_points` | Fairwire Backup Jobs never deletes a backup or restore point. | refused |

Any tool name not in this table is blocked, including names a model invents. `refused` tools are listed so a model can see they exist and are refused.

## Columns it reads

Table inputs can be CSV, TSV, semicolon- or pipe-separated text, Excel `.xlsx`, JSON or JSONL. Columns are matched by the agent's own name, then by the English names below, then by their names in German, French, Spanish, Portuguese, Italian, Japanese, Chinese and Korean. Dates become `YYYY-MM-DD`; amounts and counts are read with either decimal mark. Every result lists under `sources` how each file was read.

### Backup runs (`jobs`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `job` (required) | text | Job Name, Job, Policy, Backup Job, Plan | Job, Tâche, ジョブ, 作业 |
| `system` (required) | text | Object, VM, Server, System, Client, Source | Anwendung, Application, アプリケーション, 应用 |
| `status` (required) | text | Status, Result, State, Outcome, Session Result | Status, Statut, ステータス, 状态 |
| `started_at` (required) | date and time | Start Time, Started, Start, Creation Time | Startzeit, Heure de début, 開始日時, 开始时间 |
| `ended_at` | date and time | End Time, Finished, End, Stop Time | Endzeit, Heure de fin, 終了日時, 结束时间 |
| `size_bytes` | number | Backup Size, Transferred, Size, Bytes, Data Size | - |
| `copy_type` | text | Copy Type, Type, Target Type, Tier, Destination Type | - |
| `target` | text | Target, Repository, Destination, Storage, Vault | Beschreibung, Description, 摘要, 摘要 |
| `retention_days` | number | Retention, Retention Days, Restore Points Days, Keep Days | Aufbewahrung (Tage), Conservation (jours), 保存期間（日）, 保留天数 |

Named exports recognised by their column names:

| System | Export | Recognised by | Layout checked against vendor docs |
|---|---|---|---|
| Veeam Backup & Replication | Job session history exported to CSV | Job Name, Status, Start Time, End Time | no |

Where a layout says "checked", its column names were compared with the vendor's documentation on that date. The other layouts were written from knowledge of the export and were not checked. None was tested against a live account.

### Critical systems (`critical`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `system` (required) | text | System, Server, VM, Name, Application | Anwendung, Application, アプリケーション, 应用 |
| `rpo_hours` | number | RPO, RPO Hours, Recovery Point Objective | - |
| `tier` | text | Tier, Criticality, Class | Lizenz, Licence, ライセンス, 许可证 |

### Files from other countries

A German export in Windows-1252 with semicolons, `1.234,56` and `03.11.2026`, or a Japanese one in Shift_JIS with `2026/11/03`, is read the same way as the English file. [`fixtures/intl/`](fixtures/intl) has both versions of the demo data, and the eval cases `intl-de-*` and `intl-ja-*` require the same results as the English case. Columns named differently? Run `npx fairwire-backup-jobs inspect <file>` (names and shapes only, never values) and name them in `fairwire-sources.json`:

```json
{ "files": { "exports/devices.csv": { "columns": { "host": "Gerätename" }, "date_order": "dmy" } } }
```

## Memory

fairwire-backup-jobs can remember facts about your setup so the next run does not have to be told again. `backups_learn` only proposes a fact; it changes nothing until a named person accepts it with `backups_accept_learning`, which is one click even in Auto. Facts live in one hash-chained file per agent under `.fairwire/memory/`; if the chain does not verify, no fact is used. Credentials, personal identifiers and text that reads like instructions to an AI are refused. Run without memory with `--no-memory`.

| Kind | What an accepted fact changes |
|---|---|
| `known_exception` | that finding is listed under "Accepted as known" instead of as open, until review_by (when given) has passed. |
| `note` | nothing (shown by recall only) |

```bash
fairwire-backup-jobs memory list
fairwire-backup-jobs memory accept MEM-1a2b3c4d5e6f --as "Your Name"
fairwire-backup-jobs memory retire MEM-1a2b3c4d5e6f --as "Your Name" --reason "rule removed"
```

## Install

Node 20 or newer. No other dependencies.

```bash
npx -y fairwire-backup-jobs demo
npx -y fairwire-backup-jobs mcp --root /path/to/your/files
```

Claude Desktop, Cursor and other MCP hosts:

```json
{
  "mcpServers": {
    "fairwire-backup-jobs": {
      "command": "npx",
      "args": [
        "-y",
        "fairwire-backup-jobs",
        "mcp",
        "--root",
        "/path/to/your/files"
      ]
    }
  }
}
```

Claude Code: `claude mcp add fairwire-backup-jobs -- npx -y fairwire-backup-jobs mcp --root .`, or install the `fairwire-backup-jobs` plugin from this repository's marketplace.

## Modes and approvals

- **Review** (`--mode review`): reads and reports only.
- **Assist** (default): the policy above. A tool that asks returns an `approval_id`; a person approves it once with `fairwire-backup-jobs approve <id> --as "Your Name"` (or on the local approvals page, `fairwire-backup-jobs approvals`), and the same call is repeated.
- **Auto** (`--mode auto --auto <tool,...>`): opt-in per tool, with step caps and a kill switch (`fairwire-backup-jobs kill`). Paying, sending, posting to a ledger or a live system and accepting a learned fact stay **one named click even in Auto**; an approval is tied to the sha256 of the reviewed draft, so a changed draft needs a new click.

## CLI

```bash
fairwire-backup-jobs tools                 # every tool, its policy and arguments
fairwire-backup-jobs sources               # the columns each input is read from
fairwire-backup-jobs inspect <file>        # how a file would be read (names and shapes, never values)
fairwire-backup-jobs call backups_check '{"jobs":"<jobs>"}'
fairwire-backup-jobs eval                  # the private eval cases on the fictional fixtures
fairwire-backup-jobs demo
```

## Audit log and data

Every call is written to `.fairwire/audit.jsonl` under the root: hash-chained JSON lines, with arguments stored as a hash, signed with an Ed25519 key when you configure one. Everything runs on your machine on files you choose. No network calls, no telemetry, no credentials. The bundled fixtures are fictional.

<!-- generated:end -->

## Limits

- Reads only the files you export and give it. It does not log in to a firewall, switch, controller, cloud console, identity provider or any other live system.
- A successful job is not a tested restore: only a restore test shows the data comes back (see fairwire-restore-tests).
- Copy type is read from words like offsite, cloud, immutable or tape in the export; name your targets that way or the offsite check cannot see them.
- Thresholds are working defaults in a settings file you control; they are not a vendor rule, a requirement of any standard or a security guarantee.
- It changes nothing on a live device, firewall, DNS zone, directory or cloud account. Every change it suggests is a draft that one named person applies.
- Export layouts were written from knowledge of common exports and have not been tested on live customer accounts. Run `inspect` on a new export and name columns in `fairwire-sources.json` when they differ.

## License

MIT. Fictional data only in `fixtures/`.
