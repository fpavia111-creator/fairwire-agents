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

## Checks run, and results

All on this machine: Windows 10, Node 24.20.0, npm 11.19.0.

| Check | Result |
|---|---|
| `npm test` (32 workspaces) | 885 tests, 885 pass (141 in fairwire-core, 24 in each of the 31 agents), after the rename |
| `npm run evals` | 652 eval cases, 652 pass (21 or 22 per agent: 6 or 7 hand-written domain cases, 13 generated safety and policy cases, 2 international cases) |
| `npm run check` (family rules) | 31 agents, 341 tools (279 distinct that run), 31 prefixes, all pass |
| `npm run hostile` | 3,266 calls, 1,691 planted values (formulas, HTML, `../` ids, AI-aimed instructions), 50 results flagged for instruction-like text, 0 findings |
| `npm run hostile:args` | 22,222 calls (every tool of every agent with no arguments, nulls, numbers, nested arrays, 200,000-character strings, NUL bytes, `../` paths, absolute paths, folders and missing files, plus the data pass above): 0 findings, no crash, no host path in an error, nothing written outside the root, no call over 10 seconds. Rerun for `fairwire-firewall-rules`, `fairwire-software-licenses` and `fairwire-change-calendar` after their speed fixes: 2,105 calls, 0 findings |
| `npm run intl` | 370 spreadsheet cases in 8 languages (German, French, Spanish, Portuguese, Italian, Japanese, Chinese, Korean): every case that passes in English passes in every language; 202 of 358 column names translated (German count) |
| `npm run bench` (1,000 and 10,000 rows) | 93 tool runs across 31 agents, 0 need attention: median 688 ms at 10,000 rows, slowest 3.4 s (`fairwire-admin-roles`'s report), every tool grows roughly in line with its input (`fairwire-out/bench/bench.md`) |
| `npm run release:check:offline` | passed: 32 packages, 615 KB packed, no tests, state, keys or .npmrc in any package; secret scan of 923 files clean; honest-copy scan of 97 files clean; 884 tests; npm name check skipped offline (names checked separately below). Its one warning was uncommitted changes, committed right after |
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
- **Three agents did not scale** (first bench run): `fairwire-firewall-rules` compared every rule with every earlier rule and parsed each address again on every comparison (45 s at 10,000 rules), `fairwire-software-licenses` matched every licence against every install with a fresh text clean-up each time (43 s), and `fairwire-change-calendar` compared every change with every freeze window and every other change on the same system, parsing the timestamps each time (over 180 s, stopped). `fairwire-firewall-rules` now reads each rule's addresses once and looks only at earlier rules that could cover the first address (any, the same text, or a CIDR); `fairwire-software-licenses` counts devices once per product key; `fairwire-change-calendar` sorts once, finds the freeze window by binary search and stops the overlap sweep at the first change that starts after the current one ends. Now 0.8 s, 0.3 s and 0.9 s. The same findings come out (all tests and evals unchanged); `fairwire-change-calendar` now names the earliest-starting freeze window when a change falls in two, instead of whichever came first in the file.
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

## Ideas for ver 2

Read one real, de-identified export per vendor to mark layouts as checked; business-hours SLA clocks in `fairwire-ticket-sla`; a monthly "IT health pack" runner that runs the identity and device agents in order; money formatting in reports; native review of the translations.
