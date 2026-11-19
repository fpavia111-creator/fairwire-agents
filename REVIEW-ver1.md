# Fairwire ver 1: review

18 November 2026. What was built, how it was checked, what was found and fixed, what is not checked yet, and every decision taken without Kurt's input (he asked for the suite to be built today without it).

## Scope

The Fairwire family (IT and networking) for fair-agents.com: `fairwire-core` and 31 agents, version 0.1.0 each, nothing published. The five prototypes were rebuilt from scratch on the shared core (their logic was a starting point only; they had one to three tests each):

| Prototype | Before | Now |
|---|---|---|
| `fairwire-network-traffic` (was `iris-of-traffic`) | bytes by protocol, HTTP share, average packet size | 7 checks: risky inbound ports, cleartext across the edge, out-of-hours uploads, scans, top talker and destination shares, small packets |
| `fairwire-call-quality` (was `echo-of-voip`) | MOS under 3.5, loss over 2%, small RTP packets | 6 checks: per-call limits, one-way audio, site, trunk and hour clusters, short dropped calls |
| `fairwire-ai-usage` (was `hermes-of-efficiency`) | repeated prompt text, large rows | 6 checks: repeated prompts by hash (prompt text never returned), large prompts and payloads, oversized models, cut-off answers, untagged spend, costs from your own price table |
| `fairwire-dns-queries` (was `notus-of-dns`) | repeated names, NXDOMAIN count | 6 checks: tunnelling signal (long high-entropy labels), outside resolvers, blocked lookups, NXDOMAIN-heavy clients, SERVFAIL names, chatty names |
| `fairwire-api-retries` (was `icarus-of-retries`) | tokens and bytes on attempts > 1 | 6 checks: ignored Retry-After, retried client errors, retry storms, retry spend, exhausted requests, 5xx rates |

The 26 new agents cover the IT team's exports named in the task: firewall rules, VPN, Wi-Fi, switch ports and VLANs, DHCP, assets against the CMDB, patches, endpoint protection, backups, restore tests, cloud bills, telecom bills, printers, MFA, directory hygiene, software licences, DNS zones, contracts and renewals, email gateway, sign-in logs, ticket SLAs, uptime and incidents, change calendar, admin roles, mobile devices and log retention. Each is named after that job (table below).

Left out on purpose because Fairbooks already has them: certificates and domains, mail authentication, MCP server review, configuration drift, access recertification and SaaS seats. "Stale accounts" and "privileged accounts" from the task list were narrowed so they do not repeat the Fairbooks access recertification agent: `fairwire-directory-hygiene` looks at computer objects, password flags and group hygiene, and `fairwire-admin-roles` at admin role assignments only (top-admin cap, guests, break-glass, just-in-time, admins with mail).

Every agent reads exports only and drafts notes. Changes to a live device, firewall, DNS zone, directory, device management or cloud account are listed as refused tools; the draft's approval is a one-click category (`production_deploy`, `binding_send`, `revoke_access`, `move_money` or `delete_personal_data`) that waits for a named person even in Auto, and that person then makes the change.

## Names

Kurt's naming rule of 18 November 2026 ("name it after what it does") came in after the first build: every agent is now `fairwire-<what it does>`, the bin is the package name, `mcpName` is `io.github.fpavia111-creator/<package name>`, and the tool prefix is the job in snake_case. The themed names were never published. Old and new:

| Now | Tool prefix | Was |
|---|---|---|
| `fairwire-admin-roles` | `admin_roles_` | `arke-of-admins` |
| `fairwire-ai-usage` | `ai_usage_` | `hermes-of-efficiency` |
| `fairwire-api-retries` | `retries_` | `icarus-of-retries` |
| `fairwire-asset-inventory` | `assets_` | `argestes-of-assets` |
| `fairwire-backup-jobs` | `backups_` | `meltemi-of-backups` |
| `fairwire-call-quality` | `call_quality_` | `echo-of-voip` |
| `fairwire-change-calendar` | `changes_` | `ceryx-of-changes` |
| `fairwire-cloud-costs` | `cloud_costs_` | `sirocco-of-cloud` |
| `fairwire-contract-renewals` | `renewals_` | `chinook-of-renewals` |
| `fairwire-dhcp-leases` | `dhcp_` | `kaikias-of-leases` |
| `fairwire-directory-hygiene` | `directory_` | `tramontane-of-directory` |
| `fairwire-dns-queries` | `dns_queries_` | `notus-of-dns` |
| `fairwire-dns-records` | `dns_records_` | `etesian-of-zones` |
| `fairwire-email-gateway` | `email_gateway_` | `pheme-of-gateways` |
| `fairwire-endpoint-protection` | `endpoints_` | `apeliotes-of-endpoints` |
| `fairwire-firewall-rules` | `firewall_` | `boreas-of-firewalls` |
| `fairwire-log-retention` | `logs_` | `ossa-of-logs` |
| `fairwire-mfa-coverage` | `mfa_` | `bora-of-mfa` |
| `fairwire-mobile-devices` | `mobile_` | `eurybates-of-mobiles` |
| `fairwire-network-traffic` | `traffic_` | `iris-of-traffic` |
| `fairwire-patch-status` | `patches_` | `skiron-of-patches` |
| `fairwire-print-fleet` | `printers_` | `ostro-of-printers` |
| `fairwire-restore-tests` | `restores_` | `aparctias-of-restores` |
| `fairwire-sign-in-logs` | `signins_` | `angelia-of-signins` |
| `fairwire-software-licenses` | `licenses_` | `levante-of-software` |
| `fairwire-switch-ports` | `switch_ports_` | `eurus-of-switchports` |
| `fairwire-telecom-bills` | `telecom_` | `libeccio-of-telecom` |
| `fairwire-ticket-sla` | `tickets_` | `talthybius-of-tickets` |
| `fairwire-uptime-incidents` | `incidents_` | `stentor-of-incidents` |
| `fairwire-vpn-access` | `vpn_` | `zephyrus-of-vpn` |
| `fairwire-wifi-health` | `wifi_` | `aura-of-wifi` |

All 31 new names were free on npm on 18 November 2026 (`npm view`, read-only). The rename was done by `scripts/rename-agents.cjs` (folders and bin files moved with `git mv`) and checked by `npm run check`, which now fails on a name, bin, `mcpName` or prefix that breaks the rule.

## Checks run, and results (build, 18 November; the final numbers are under "Final pass" below)

All on this machine: Windows 10, Node 24.20.0, npm 11.19.0.

| Check | Result |
|---|---|
| `npm test` (32 workspaces) | 885 tests, 885 pass (141 in fairwire-core, 24 in each of the 31 agents), after the rename |
| `npm run evals` | 652 eval cases, 652 pass (21 or 22 per agent: 6 or 7 hand-written domain cases, 13 generated safety and policy cases, 2 international cases) |
| `npm run check` (family rules) | 31 agents, 341 tools (279 distinct that run), 31 prefixes, all pass |
| `npm run hostile` | 3,266 calls, 1,691 planted values (formulas, HTML, `../` ids, AI-aimed instructions), 50 results flagged for instruction-like text, 0 findings |
| `npm run hostile:args` | 22,222 calls (every tool of every agent with no arguments, nulls, numbers, nested arrays, 200,000-character strings, NUL bytes, `../` paths, absolute paths, folders and missing files, plus the data pass above): 0 findings, no crash, no host path in an error, nothing written outside the root, no call over 10 seconds. Run again in full after the rename: 22,222 calls, 0 findings |
| `npm run intl` | 370 spreadsheet cases in 8 languages (German, French, Spanish, Portuguese, Italian, Japanese, Chinese, Korean): every case that passes in English passes in every language; 202 of 358 column names translated (German count) |
| `npm run bench` (1,000 and 10,000 rows) | after the rename and the last speed fixes: 93 tool runs across 31 agents, 0 need attention: median 548 ms at 10,000 rows, slowest 2.3 s (`fairwire-telecom-bills` check), every tool grows roughly in line with its input (`fairwire-out/bench/bench.md`) |
| `npm run release:check:offline` | passed with no warning on a clean, committed tree after the rename: 32 packages, 614 KB packed, no tests, state, keys or .npmrc in any package; package metadata and bins in order; secret scan of 957 files clean; honest-copy scan of 97 files clean; 885 tests; 652 evals; npm name check skipped offline (names checked separately below) |
| npm names (`npm view`, read-only) | all 32 names free on 18 November 2026: `fairwire-core` and the 31 job names (checked again after the rename) |
| MCP Registry | `node ..\add-mcp-registry.cjs fairwire-agents fairwire.html` run: `mcpName` and `server.json` in every agent |

Per agent: 4 shared tests (argument docs, one-click policy, evals, stdio MCP), up to 11 contract tests (eval coverage, readable errors, files outside the root refused, Review mode and kill switch, draft sha256, repeatable results, column order, extra columns, BOM and CRLF, padded values, row order, empty files, report language, own column layout), 2 memory and masking tests, and 7 domain tests written against the agent's logic.

## Found and fixed during the build

- **Pseudonyms changed between two runs** without a state folder, so the "same call, same result" contract failed for every agent with personal data. The contract tests now use a fixed test key (as Remedy does); production keeps a per-installation key in `.fairwire/pii.key`.
- **A pseudonym with a leading "+"** (`+TEL-…` for a phone number) did not match its raw value, so an accepted exception on a phone line never applied. `pii.same()` now ignores punctuation in front of a pseudonym.
- **German exports dropped seconds** from timestamps in the localiser, which turned `fairwire-api-retries`'s 2-second retry gaps into 0 and changed its findings. Seconds are now kept.
- **Click rates rounded to cents** in German exports (`fairwire-print-fleet`): per-page rates are numbers, not money, and keep their decimals.
- **Row order leaked into results**: `fairwire-directory-hygiene` named a group loop from whichever group came first, and `fairwire-contract-renewals` took a vendor's display name from the first payment row. Both now sort before naming.
- **`fairwire-ticket-sla`'s "open" total** collided with the builder's open-findings count; renamed `open_tickets`.
- **Logic fixes found by the fixtures**: `fairwire-api-retries` counted a request that ended in a 400 as recovered; `fairwire-ai-usage` rounded per-request costs to cents before adding; `fairwire-telecom-bills` reported an unused line also as an oversized plan; `fairwire-mobile-devices` reported an old OS also as non-compliant; `fairwire-endpoint-protection`, `fairwire-dhcp-leases`, `fairwire-asset-inventory` and `fairwire-restore-tests` had small wording and display fixes (original serials shown, failed tests due now, not in six months).
- **Builder note helper** broke when a shell heredoc turned `\r\n` into a real line break; rewritten.
- **Three agents did not scale** (first bench run): `fairwire-firewall-rules` compared every rule with every earlier rule and parsed each address again on every comparison (45 s at 10,000 rules), `fairwire-software-licenses` matched every licence against every install with a fresh text clean-up each time (43 s), and `fairwire-change-calendar` compared every change with every freeze window and every other change on the same system, parsing the timestamps each time (over 180 s, stopped). `fairwire-firewall-rules` now reads each rule's addresses once and looks only at earlier rules that could cover the first address (any, the same text, or a CIDR); `fairwire-software-licenses` counts devices once per product key; `fairwire-change-calendar` sorts once, finds the freeze window by binary search and stops the overlap sweep at the first change that starts after the current one ends. Now 0.8 s, 0.3 s and 0.9 s. The same findings come out (all tests and evals unchanged); `fairwire-change-calendar` now names the earliest-starting freeze window when a change falls in two, instead of whichever came first in the file. A later bench run found the same kind of slowdown, smaller, in the per-switch, per-scope and per-zone summaries of `fairwire-switch-ports`, `fairwire-dhcp-leases` and `fairwire-dns-records` (one filter per group); they now count in one pass (Switch Ports' report: 1.9 s to 0.2 s at 10,000 rows).
- **Hostile arguments hung on Windows**: a 200,000-character `out_dir` made Node 24's recursive `mkdir` never return, and the e-mail mask was quadratic on a 200,000-character string with no "@". Paths over 4,096 characters, or with a name over 255, are now refused before the disk is touched, and the e-mail pattern only starts where an address can start (linear time). Both have a core test. The hostile script itself now uses one sandbox per tool instead of one per call (Windows scans every new file), so the full pass runs in minutes.
- **Found by the rename to job names**: the core and the family scripts assumed a one-word tool prefix. An accepted exception approved through `call_quality_accept_learning` was stored as "unverified" and never applied, because the approval check only matched `<one word>_accept_learning` (8 agents failed their memory test); the memory and manifest checks refused prefixes with an underscore; the demo, argument docs and seven scripts read the prefix as the text before the first underscore; and eight scripts found agents by `-of-` in the folder name, so they would have run on no agents at all. All now take snake_case job words, and a core test covers a two-word prefix. The scaffolder (`fairwire-new-agent`) now makes `fairwire-<job>` packages and depends on the core's real version (it said `^0.2.0`, which does not exist), and the core README no longer names Lodestar agents left over from the fork.
- **README demo output changed on every build**: the demo used a fresh pseudonym key each run, so `npm run readme:check` could never pass for agents with personal data. The demo (fictional data only) now uses a fixed key per agent; real runs still use the per-installation key.
- **International check**: the three named vendor layouts (Palo Alto rules, AWS CUR, Entra sign-ins) failed in every language because translating their headers destroys the layout the agent recognises. Vendor exports keep their own column names in every country, so files under `fixtures/exports/` are left out of the translation check; the English cases still test them.

## Not checked yet (say this out loud)

- **Export layouts** come from general knowledge of each product's exports (marked "recalled" in the catalogue). No real customer export has been read. The first setup confirms them with `inspect` and `fairwire-sources.json`.
- **Thresholds and defaults** (days to patch, retention days, top-admin cap of 4, end-of-support operating systems, cloud service suffixes for takeover checks, MOS and jitter limits) are working defaults from public practice as of 2026, in settings files. A security lead should read them before a client relies on them.
- **No live checks**: `fairwire-dns-records` does not resolve names, `fairwire-cloud-costs` does not call cloud APIs, `fairwire-sign-in-logs`'s countries come from the identity provider. That is by design (local files only) and is said in each report's limits.
- **Translations**: report headings and sections in eight languages and the eight root READMEs were written by Claude and are not reviewed by native speakers. Finding texts, agent READMEs, sample reports and sales copy are English only.
- **Node 20 and 22, Linux and macOS**: only Node 24 on Windows was run here; the CI workflow covers the rest once pushed.
- **MCP SDK conformance** (`npm run mcp:check`) was not run: the official SDK is not installed in this repository and the brief does not require it. The stdio smoke test in every agent passed.
- No security engineer, network engineer or customer has reviewed the agents yet.

## Decisions taken (without Kurt's input, as asked)

1. **Family and agent names**: Fairwire; each agent named after its job (see Names). The first build used wind and messenger names; they were replaced the same day under Kurt's naming rule, before anything was published.
2. **31 agents**, not 30: the five prototypes plus 26 new ones, so every item in the task list has an agent except the ones Fairbooks already covers.
3. **Core**: forked from lodestar-core (with the uncommitted Windows fixes of 18 November) and added masking ported from remedy-core, IT helpers and the `wireAgent` builder, so every agent has the same tools and policy shape.
4. **Masking is on by default** for names, sign-in names, e-mail addresses, phone numbers, IMEIs and client addresses; host names and internal IPs stay visible in `mask` mode (the network agents need them) and are masked in `strict`.
5. **Accepted exceptions** ("known and accepted, with a reason and a review date") are a memory kind in every agent, accepted only by a named person.
6. **One draft per agent**, addressed to the team that acts, with a one-click request in the category that matches the action (change requests are `production_deploy`, notes are `binding_send`).
7. **Prices**: the approved proposals kept ($1,500 each for network traffic and DNS, call quality, AI usage and retries; support $250 a month); five group packages at $2,000 to $3,000; the whole family $9,500; partner rollout $15,000. The $3,500 "all checks" proposal dated from five agents and is replaced by the whole-family package (see `sales/pricing-page-ver1.md`).
8. **Sample reports**: firewall rules, sign-in logs, backup jobs, cloud costs, network traffic, ticket SLA, patch status and DNS records, in `sample-reports/` with an index page.
9. **npm**: nothing published, nothing pushed; local commits only, as Kurt Francisco Pavia with the noreply address.

## Final pass (19 November 2026)

Kurt asked every family for one final pass: the brief's eight-point checklist, his five review questions with numbers, and tests on real public data. Everything below ran on Windows 10, Node 24.20.0. The evidence is committed in `evidence/` and can be run again: `npm run accuracy`, `npm run model-view`, `npm run realdata` (downloads into the git-ignored `_realdata/`).

### Checklist

| # | Point | Result |
|---|---|---|
| 1 | Names | Every package, bin, `mcpName`, tool prefix, title, README and CHANGELOG uses `fairwire-<what it does>`; `npm run check` now fails on a name that breaks the rule. The themed names appear only in the Names table above, `scripts/names.json` and `scripts/rename-agents.cjs` (history). |
| 2 | Read as a buyer | Every agent README is generated from the agent (what it checks, settings, what it refuses, limits, a captured demo). Changed: DNS Records now says it reads zone files; Change Calendar lists the HP Service Manager columns and the planning-window setting; Network Traffic documents `share_min_hosts`. The README demo now shows a fixed date, so `readme:check` no longer fails on the next day. |
| 3 | Honest copy | Scanned READMEs, package files, `site.json`, the pricing page and sample reports for compliance, certification, savings and guarantee words: only disclaimers and product names (AWS "Savings Plan") were found. The package keyword `licence-compliance` was removed. |
| 4 | Binding actions | Every agent refuses live changes (firewall, DNS, directory, device, cloud, mail, payments) and drafts only; each draft's request is a one-click category that waits for a named person even in Auto (`npm run check`: 31 agents, 341 tools (279 distinct that run), every policy ending in a default block). |
| 5 | Full bar from a clean install | From a fresh `git clone` and `npm install` in `%TEMP%`: 892 tests pass, 653/653 evals, `intl` 370 cases in 8 languages, the hostile data pass 0 findings, accuracy and masking unchanged, `readme:check` and `plugin:check` pass, and `release:check:offline` passes on a clean tree (32 packages, 621 KB). In the main repository: `hostile:args` 22,228 calls, 0 findings; `bench` 93 tool runs at 10,000 rows, median 678 ms. One run took 13 s (Mobile Devices' report); run again alone it took 2.5 s, so that was load on this machine. The first fresh clone found a Windows problem: with `core.autocrlf` on, files were checked out with CRLF, npm then rewrote the 35 bin scripts and the generated-file checks failed. A `.gitattributes` now keeps LF (the fixtures for other countries keep their bytes) and the checks ignore line endings. |
| 6 | Fictional fixtures | Every e-mail address uses a reserved domain (`corp.example`, `example.test`, `vendor.example` and so on); addresses are private or documentation ranges, plus 8.8.8.8 as the example of an outside resolver; phone numbers are 555-01xx; companies are the usual fictional ones (Contoso, Fabrikam, Northwind). The Patch Status fleet moved from Windows 11 Pro 24H2 (servicing ended 13 Oct 2026) to 25H2. Masking is on by default. |
| 7 | `site.json`, pricing, agents | All 31 agents are named once in the pricing page; `site.json` and the pricing page carry the same 10 packages and prices; 31 checks in 5 groups. Sample reports regenerated (unchanged). |
| 8 | Package contents | `release:check:offline`: no tests, state, `fairwire-out`, keys or `.npmrc` in any package; secret scan clean; `_realdata/` is git-ignored. |

### Question 1: accuracy

Method (`scripts/accuracy.mjs`, cases in `evidence/accuracy-cases.json`):

- **Planted set:** each agent's own fixtures. The expected findings (code and key) were written from the planted problems listed in each `fixtures/README.md` and checked line by line against what the agent reports. Recall = expected findings found; "unexpected" = anything reported that is not on the list.
- **Clean set:** the same fixtures with the planted rows dropped, or set back to a normal value. No finding is expected.
- **Mutations:** the clean set with one row changed to plant one problem (for example a rule's hits set to 0); the named finding is expected.

Limits, said plainly: the fixtures, the expected lists and the agents were written by the same builder, so this measures whether the agents do what their fixtures describe, not how they do on a customer's data. Some clean sets are small (3 to 7 rows for the identity agents).

| Agent | Planted found | Unexpected | Clean rows | Findings on clean | Mutations caught |
|---|---:|---:|---:|---:|---:|
| `fairwire-admin-roles` | 9/9 | 0 | 4 | 0 | 3/3 |
| `fairwire-ai-usage` | 6/6 | 0 | 7 | 0 | 2/2 |
| `fairwire-api-retries` | 10/10 | 0 | 21 | 0 | 1/1 |
| `fairwire-asset-inventory` | 10/10 | 0 | 4 | 0 | 2/2 |
| `fairwire-backup-jobs` | 8/8 | 0 | 14 | 0 | 2/2 |
| `fairwire-call-quality` | 11/11 | 0 | 27 | 0 | 2/2 |
| `fairwire-change-calendar` | 8/8 | 0 | 5 | 0 | 2/2 |
| `fairwire-cloud-costs` | 10/10 | 0 | 14 | 0 | 2/2 |
| `fairwire-contract-renewals` | 10/10 | 0 | 10 | 0 | 2/2 |
| `fairwire-dhcp-leases` | 8/8 | 0 | 117 | 0 | 2/2 |
| `fairwire-directory-hygiene` | 11/11 | 0 | 6 | 0 | 2/2 |
| `fairwire-dns-queries` | 6/6 | 0 | 4 | 0 | 2/2 |
| `fairwire-dns-records` | 8/8 | 0 | 5 | 0 | 3/3 |
| `fairwire-email-gateway` | 6/6 | 0 | 20 | 0 | 2/2 |
| `fairwire-endpoint-protection` | 10/10 | 0 | 8 | 0 | 3/3 |
| `fairwire-firewall-rules` | 13/13 | 0 | 4 | 0 | 3/3 |
| `fairwire-log-retention` | 7/7 | 0 | 5 | 0 | 2/2 |
| `fairwire-mfa-coverage` | 8/8 | 0 | 3 | 0 | 3/3 |
| `fairwire-mobile-devices` | 8/8 | 0 | 5 | 0 | 2/2 |
| `fairwire-network-traffic` | 9/9 | 0 | 6 | 0 | 2/2 |
| `fairwire-patch-status` | 11/11 | 0 | 24 | 0 | 2/2 |
| `fairwire-print-fleet` | 8/8 | 0 | 12 | 0 | 2/2 |
| `fairwire-restore-tests` | 6/6 | 0 | 7 | 0 | 2/2 |
| `fairwire-sign-in-logs` | 8/8 | 0 | 5 | 0 | 2/2 |
| `fairwire-software-licenses` | 6/6 | 0 | 34 | 0 | 2/2 |
| `fairwire-switch-ports` | 8/8 | 0 | 10 | 0 | 2/2 |
| `fairwire-telecom-bills` | 7/7 | 0 | 13 | 0 | 2/2 |
| `fairwire-ticket-sla` | 11/11 | 0 | 3 | 0 | 2/2 |
| `fairwire-uptime-incidents` | 10/10 | 0 | 3 | 0 | 2/2 |
| `fairwire-vpn-access` | 7/7 | 0 | 10 | 0 | 2/2 |
| `fairwire-wifi-health` | 12/12 | 0 | 14 | 0 | 2/2 |
| **Family (31)** | **270/270** | **0** | **424** | **0** | **66/66** |

What the measurement found:

- **One real false positive, fixed:** on a clean export with 3 or 4 hosts, Network Traffic reported "one host carried most of the bytes" (true, but meaningless with so few hosts). Share findings now need at least `share_min_hosts` (default 5) hosts or destinations.
- **Two mistakes in my own cases, not in the agents:** a telecom "repair" left a line at 6 GB of a 50 GB plan (correctly reported as oversized), and a firewall mutation that opened SSH to the internet put the rule behind the default deny (correctly reported as shadowed; SSH is also not on the default risky list).

### Question 2: what reaches the AI model

When an assistant calls a tool, the result (summary and findings) passes through the masker before it leaves the computer. Files the tools write locally keep the real values. Per agent (`scripts/model-view.mjs`, `evidence/model-view.json`); every field not listed is sent in clear (dates, counts, amounts, codes, ids, device and host names, internal addresses, settings):

| Agent | Masked before the model sees it | Masked only in strict mode | Free text sent (scrubbed of e-mails, phones, known names) |
|---|---|---|---|
| `fairwire-admin-roles` | display_name, mailbox, user | - | note |
| `fairwire-ai-usage` | prompt (never returned; a hash only), user | - | - |
| `fairwire-api-retries` | none (no personal fields) | endpoint | - |
| `fairwire-asset-inventory` | owner | hostname | - |
| `fairwire-backup-jobs` | none (no personal fields) | - | - |
| `fairwire-call-quality` | caller_number | - | - |
| `fairwire-change-calendar` | requester | - | backout_plan, outcome, test_evidence, title |
| `fairwire-cloud-costs` | none (no personal fields) | - | - |
| `fairwire-contract-renewals` | owner | - | - |
| `fairwire-dhcp-leases` | none (no personal fields) | hostname, ip | - |
| `fairwire-directory-hygiene` | name (user objects) | - | - |
| `fairwire-dns-queries` | none (no personal fields) | - | query |
| `fairwire-dns-records` | none (no personal fields) | - | - |
| `fairwire-email-gateway` | recipient, sender | - | dlp_rule |
| `fairwire-endpoint-protection` | none (no personal fields) | device | title |
| `fairwire-firewall-rules` | owner | - | description |
| `fairwire-log-retention` | none (no personal fields) | host | - |
| `fairwire-mfa-coverage` | display_name, user | - | - |
| `fairwire-mobile-devices` | imei, user | device | - |
| `fairwire-network-traffic` | none (no personal fields) | dst_ip, src_ip | - |
| `fairwire-patch-status` | none (no personal fields) | device | title |
| `fairwire-print-fleet` | none (no personal fields) | - | - |
| `fairwire-restore-tests` | signed_off_by | - | - |
| `fairwire-sign-in-logs` | client_ip, user | - | failure_reason |
| `fairwire-software-licenses` | none (no personal fields) | device | - |
| `fairwire-switch-ports` | none (no personal fields) | - | description |
| `fairwire-telecom-bills` | line_number, user | - | plan |
| `fairwire-ticket-sla` | assignee | - | - |
| `fairwire-uptime-incidents` | none (no personal fields) | - | - |
| `fairwire-vpn-access` | client_ip, user | - | - |
| `fairwire-wifi-health` | none (no personal fields) | - | - |

- **Canary:** each agent's planted case ran in the default mode and every value of a masked field in its input files was searched for in what the model would receive: 262 personal values, 0 found. The per-agent memory test checks the same on every `npm test`.
- **Hostile inputs:** the data pass (planted formulas, HTML, `../` ids and instructions aimed at an AI) and the argument pass run again after this pass's changes: data pass 3,272 calls with 1,691 planted values, 0 findings; argument pass 22,228 calls (nulls, numbers, nested arrays, 200,000-character strings, NUL bytes, `../` and absolute paths, folders, missing files), 0 findings.
- **Free text** (rule descriptions, ticket titles, change titles, DLP rule names) is scrubbed of e-mail addresses, phone numbers and any name seen in a masked field, but a personal detail typed only into free text can get through. AI Usage never returns prompt text, only a hash of it.
- Results go to whatever model the user's assistant uses. For regulated data, use a local model or one covered by the user's own agreements. No claim of HIPAA, GDPR or any other compliance is made.

### Question 3: compatibility

| Vendor or system | Export | Basis |
|---|---|---|
| ServiceNow | Incident fields as in the public UCI audit log (`number`, `incident_state`, `priority`, `opened_at`, `resolved_at`, `assignment_group`) | tested on a public sample |
| HP Service Manager | Change records (BPI Challenge 2014) | tested on a public sample |
| BIND, Windows DNS, a zone transfer | DNS zone (master) file | tested on a public sample (the IANA root zone) |
| Palo Alto PAN-OS, FortiGate, Entra ID sign-ins, Entra MFA registration, Okta System Log, AWS CUR, Azure cost details, Google Cloud billing, Veeam, Intune, Defender for Endpoint, Windows DHCP, ServiceNow incident list, Jira Service Management | The 14 named layouts the agents recognise | written from knowledge of the vendors' documented exports; not compared line by line with the vendor pages and not tested on a real export |

Every other input is read by column name (with aliases in 9 languages). No customer export has been read. A 15th layout (Cisco Meraki clients) is in the core catalogue but no agent uses it.

### Question 4: commercial traction

None yet: no paying customers, and no checkout is live (the main session answers for the suite).

### Question 5: support and dated rules

| Rule | Where it lives | Source | As of | How a customer changes it |
|---|---|---|---|---|
| Windows end of support (`END_OF_SUPPORT_OS`) | `fairwire-core/src/it.js`, used by Patch Status and Directory Hygiene | Microsoft lifecycle dates, checked against endoflife.date by `npm run realdata` | 19 Nov 2026 | `unsupported_os` in the agent's settings file (for example drop "Windows 10" while paying for extended security updates) |
| Risky inbound ports | `fairwire-core/src/it.js` (`RISKY_INBOUND_PORTS`) | common hardening guidance (RDP, SMB, FTP, Telnet, databases, SNMP, TFTP); SSH left out on purpose | 18 Nov 2026 | `risky_ports` in Firewall Rules and Network Traffic settings |
| Cleartext protocols | `fairwire-core/src/it.js` (`CLEARTEXT`) | protocol specifications | 18 Nov 2026 | not a setting; changed in a release |
| Cloud host suffixes for takeover checks | `fairwire-dns-records/src/logic.js` | public lists of takeover-prone services, recalled | 18 Nov 2026 | `cloud_suffixes` and `active_cloud_hosts` |
| Weak and phishing-resistant MFA methods | `fairwire-mfa-coverage` defaults | public guidance on phishing-resistant MFA | 18 Nov 2026 | `weak_methods`, `strong_methods` |
| Legacy sign-in protocols | `fairwire-sign-in-logs/src/logic.js` | Microsoft basic-authentication retirement | 18 Nov 2026 | not a setting; changed in a release |
| Weak Wi-Fi security (WEP, TKIP, open) | `fairwire-wifi-health/src/logic.js` | Wi-Fi Alliance WPA2 and WPA3 | 18 Nov 2026 | not a setting; changed in a release |
| Mobile minimum OS | `fairwire-mobile-devices` (`min_os`, empty by default) | vendor support (endoflife.date shows iOS 15, 16, 18, 26, 27 and Android 14 to 17 still supported) | 19 Nov 2026 | `min_os`, for example `{"iOS": "18.0", "Android": "14"}` |
| Export layouts (14) | `fairwire-core/src/exports.js` | knowledge of vendor exports ("recalled") | 18 Nov 2026 | `fairwire-sources.json` (`columns`, `profile`, `date_order`) |
| Working thresholds (days to patch, retention days, SLA targets, MOS and jitter, top-admin cap, unused days and so on) | each agent's `DEFAULTS` in `src/logic.js` | common practice, not a standard | 18 Nov 2026 | the agent's settings file |

Mythos Machines updates the defaults in new releases; support after setup covers export layouts a vendor changes. Nobody is yet assigned to watch vendor lifecycle pages: re-running `npm run realdata` before each release is the current check.

### Real data

| Source (licence) | Format | Agent | What ran | What it found | False positives |
|---|---|---|---|---|---|
| [UCI incident management event log](https://archive.ics.uci.edu/dataset/498), a ServiceNow audit log of an IT company (CC BY 4.0; Amaral, Fantinato and Peres 2018) | CSV, day-first dates, `?` for empty, 141,712 event rows (2.4 MB zip) | Ticket SLA | 24,918 incidents (each incident's latest row, as an incident list export shows it) | 0 open (every incident ends Closed); 30 reopened twice or more (the file has 30); 57 teams above the 20% breach rate on the default targets; the first-response check skipped (no such column) | Compared with the instance's own SLA field (`made_sla`): 56 of the 57 flagged teams are also over 20% there; 1 is flagged only by the agent, 4 only by ServiceNow, whose SLA definitions are not published. The first run reported 1,556 closed incidents as open and breached (fixed). |
| [BPI Challenge 2014: change details](https://data.4tu.nl/datasets/e9c00fe9-c87a-450e-8bd6-d5e06a6b309a), Rabobank Group ICT, HP Service Manager (4TU General Terms of Use; van Dongen 2014) | semicolon CSV, day-first dates, one row per affected CI, 30,275 rows (6.7 MB, MD5 matches the publisher) | Change Calendar | 18,000 changes on 10,193 configuration items | 2,419 pairs of changes on the same item in overlapping implementation windows; 52 major changes starting in business hours; 35 emergency changes (0.2%); 6,230 changes with planning windows over 72 hours counted, not compared; approval, back-out and test checks skipped (no such columns) | The first run reported 38,564 overlaps, nearly all from planning windows of weeks or months (fixed). The 2,419 left were not verified: shared maintenance windows are common, so many may be intended. |
| [IANA root zone](https://www.internic.net/domain/root.zone) (published for public download; no licence stated) | DNS master file, 2.3 MB | DNS Records | all 25,020 records (A, AAAA, NS, DS, RRSIG, NSEC, DNSKEY, SOA, ZONEMD), 7,344 names | 0 findings, as expected for the root zone | 0 |
| [endoflife.date](https://endoflife.date) (MIT): Windows, Windows Server, iOS, Android | JSON | Patch Status and Directory Hygiene end-of-support list; Mobile Devices guidance | 53 ended Windows and Windows Server releases, written the way device exports name them per edition | 43 of 53 flagged after the fix (32 before); not covered: 9 Windows Server semi-annual-channel builds and one 2015 IoT release | 0 supported releases flagged after the fix (3 LTSC releases before) |

For the other 27 agents no public file in a vendor's real format with a clear licence was used in this pass. The search was short, not exhaustive. The FinOps FOCUS cloud billing samples were found, but no licence could be confirmed, so they were not used. Public Zeek DNS and connection logs are a candidate for DNS Queries and Network Traffic in ver 2. Those 27 agents are measured on fictional data only.

Fixes the real files led to (each with a test):

- **Empty markers:** "?" (the UCI file), "NULL", "(null)" and "#N/A" in a mapped column now read as empty; "N/A", "none" and dashes too in date and number columns. Before, 1,556 closed incidents with `?` as their resolution time were reported as open and breached.
- **Missing columns:** a "value is missing" check whose column is not in the export at all is skipped and named in `checks_skipped`, instead of flagging every row. 14 agents declare the columns (`needs`). A Palo Alto rule export, which has no owner column, no longer reports every rule as ownerless.
- **Ticket SLA:** ServiceNow's `incident_state` is read as the state; a closed ticket with no resolution time is not counted as breached.
- **Change Calendar:** reads `CI Name (aff)`, `Risk Assessment` and the separate `Emergency Change` column; planned windows longer than `max_window_hours` (72) are counted, not compared; a change is never paired with itself; the emergency share counts changes, not rows.
- **DNS Records:** reads zone (master) files; DNSSEC records next to a CNAME are not a conflict.
- **End of support:** one shared, dated list now covers Windows 2000, XP, Vista, Server 2003, LTSB and the Windows 11 feature updates whose servicing has ended (21H2 to 23H2, and Home and Pro 24H2). Long-term servicing editions (LTSC, IoT) are only matched by an entry that names them, so Windows 10 Enterprise LTSC 2021 is no longer flagged. Against endoflife.date it went from 32 to 43 of 53 ended releases flagged, and from 3 supported releases wrongly flagged to 0. Not covered: Windows Server semi-annual-channel builds and one 2015 IoT release.

### Final numbers

| Check | Result |
|---|---|
| `npm test` (clean clone) | 892 tests, 892 pass (146 in fairwire-core; 24 per agent, 25 in Change Calendar and DNS Records) |
| `npm run evals` | 653 cases, 653 pass |
| `npm run accuracy` | planted 270/270 found, 0 unexpected; 0 findings on 424 clean rows; 66/66 mutations caught |
| `npm run model-view` | 16 agents read personal fields; 262 personal values in the fixtures, 0 reached the model |
| `npm run hostile` / `hostile:args` | 3,272 and 22,228 calls, 0 findings |
| `npm run intl` | 370 cases in 8 languages, all pass |
| `npm run bench` | 93 tool runs at 10,000 rows, median 678 ms (one 13 s outlier, 2.5 s when run alone) |
| `npm run release:check:offline` (clean clone) | passed, no warning; 32 packages, 621 KB |
| `npm run realdata` | 3 public data files (24,918 incidents, 30,275 change rows, 25,020 DNS records) and the endoflife.date lists; findings and false positives in the table above |
| npm names | the 31 job names and `fairwire-core` were free on 18 November 2026 (the packages are now published by the main session) |

### For Kurt to decide

1. **Windows 10 in the default end-of-support list.** Devices whose owner pays for extended security updates are flagged too; the finding says so, and the customer can remove the entry. Keep it in the default?
2. **Mobile minimum OS.** The default checks no OS version (`min_os` is empty), so an old iPhone is not flagged unless the customer sets one. Set a default such as iOS 18 and Android 14?
3. **SSH from the internet** is not on the default risky-port list, because SSH gateways are often exposed on purpose. Add port 22?
4. **The BPI Challenge 2014 file** is under the 4TU General Terms of Use, not an open licence. Only results are published here, never the data; confirm that citing them on the site is fine.
5. **Format labels (settled 19 November 2026):** the 14 layouts are now labelled "written from knowledge of the export; not yet checked against documentation or a real export" in `sales/final-pass.json`, the suite's fixed wording. To move one to "checked against the vendor's published documentation", compare its columns with the vendor page first.
6. **The unused Meraki layout:** wire it to Wi-Fi Health or remove it.

## Ideas for ver 2

Read one real, de-identified export per vendor to mark layouts as checked; business-hours SLA clocks in `fairwire-ticket-sla`; a monthly "IT health pack" runner that runs the identity and device agents in order; money formatting in reports; native review of the translations. From the final pass: compare the 14 export layouts line by line with the vendors' pages; test DNS Queries and Network Traffic on public Zeek logs; a version-aware Windows rule (build numbers as well as names); a default minimum mobile OS if Kurt wants one.
