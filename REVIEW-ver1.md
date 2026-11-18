# Fairwire ver 1: review

18 November 2026. What was built, how it was checked, what was found and fixed, what is not checked yet, and every decision taken without Kurt's input (he asked for the suite to be built today without it).

## Scope

The Fairwire family (IT and networking) for fair-agents.com: `fairwire-core` and 31 agents, version 0.1.0 each, nothing published. The five prototypes were rebuilt from scratch on the shared core (their logic was a starting point only; they had one to three tests each):

| Prototype | Before | Now |
|---|---|---|
| `iris-of-traffic` | bytes by protocol, HTTP share, average packet size | 7 checks: risky inbound ports, cleartext across the edge, out-of-hours uploads, scans, top talker and destination shares, small packets |
| `echo-of-voip` | MOS under 3.5, loss over 2%, small RTP packets | 6 checks: per-call limits, one-way audio, site, trunk and hour clusters, short dropped calls |
| `hermes-of-efficiency` | repeated prompt text, large rows | 6 checks: repeated prompts by hash (prompt text never returned), large prompts and payloads, oversized models, cut-off answers, untagged spend, costs from your own price table |
| `notus-of-dns` | repeated names, NXDOMAIN count | 6 checks: tunnelling signal (long high-entropy labels), outside resolvers, blocked lookups, NXDOMAIN-heavy clients, SERVFAIL names, chatty names |
| `icarus-of-retries` | tokens and bytes on attempts > 1 | 6 checks: ignored Retry-After, retried client errors, retry storms, retry spend, exhausted requests, 5xx rates |

The 26 new agents cover the IT team's exports named in the task: firewall rules (`boreas`), VPN (`zephyrus`), Wi-Fi (`aura`), switch ports and VLANs (`eurus`), DHCP (`kaikias`), assets against the CMDB (`argestes`), patches (`skiron`), endpoint protection (`apeliotes`), backups (`meltemi`), restore tests (`aparctias`), cloud bills (`sirocco`), telecom bills (`libeccio`), printers (`ostro`), MFA (`bora`), directory hygiene (`tramontane`), software licences (`levante`), DNS zones (`etesian`), contracts and renewals (`chinook`), email gateway (`pheme`), sign-in logs (`angelia`), ticket SLAs (`talthybius`), uptime and incidents (`stentor`), change calendar (`ceryx`), admin roles (`arke`), mobile devices (`eurybates`) and log retention (`ossa`).

Left out on purpose because Fairbooks already has them: certificates and domains (aegle), mail authentication (aeolus), MCP server review (nemesis), drift (tiresias), access recertification (ladon) and SaaS seats (helios). "Stale accounts" and "privileged accounts" from the task list were narrowed so they do not repeat ladon: `tramontane` looks at computer objects, password flags and group hygiene, and `arke` at admin role assignments only (top-admin cap, guests, break-glass, just-in-time, admins with mail).

Every agent reads exports only and drafts notes. Changes to a live device, firewall, DNS zone, directory, device management or cloud account are listed as refused tools; the draft's approval is a one-click category (`production_deploy`, `binding_send`, `revoke_access`, `move_money` or `delete_personal_data`) that waits for a named person even in Auto, and that person then makes the change.

## Checks run, and results

All on this machine: Windows 10, Node 24.20.0, npm 11.19.0.

| Check | Result |
|---|---|
| `npm test` (32 workspaces) | 884 tests, 884 pass (140 in fairwire-core, 24 in each of the 31 agents) |
| `npm run evals` | 652 eval cases, 652 pass (21 or 22 per agent: 6 or 7 hand-written domain cases, 13 generated safety and policy cases, 2 international cases) |
| `npm run check` (family rules) | 31 agents, 341 tools (279 distinct that run), 31 prefixes, all pass |
| `npm run hostile` | 3,266 calls, 1,691 planted values (formulas, HTML, `../` ids, AI-aimed instructions), 50 results flagged for instruction-like text, 0 findings |
| `npm run hostile:args` | 22,222 calls (every tool of every agent with no arguments, nulls, numbers, nested arrays, 200,000-character strings, NUL bytes, `../` paths, absolute paths, folders and missing files, plus the data pass above): 0 findings, no crash, no host path in an error, nothing written outside the root, no call over 10 seconds. Rerun for Boreas, Levante and Ceryx after their speed fixes: 2,105 calls, 0 findings |
| `npm run intl` | 370 spreadsheet cases in 8 languages (German, French, Spanish, Portuguese, Italian, Japanese, Chinese, Korean): every case that passes in English passes in every language; 202 of 358 column names translated (German count) |
| `npm run bench` (1,000 and 10,000 rows) | 93 tool runs across 31 agents, 0 need attention: median 688 ms at 10,000 rows, slowest 3.4 s (Arke's report), every tool grows roughly in line with its input (`fairwire-out/bench/bench.md`) |
| `npm run release:check:offline` | passed: 32 packages, 615 KB packed, no tests, state, keys or .npmrc in any package; secret scan of 923 files clean; honest-copy scan of 97 files clean; 884 tests; npm name check skipped offline (names checked separately below). Its one warning was uncommitted changes, committed right after |
| npm names (`npm view`, read-only) | all 32 names free on 18 November 2026 (fairwire-core and the 31 agents) |
| MCP Registry | `node ..\add-mcp-registry.cjs fairwire-agents fairwire.html` run: `mcpName` and `server.json` in every agent |

Per agent: 4 shared tests (argument docs, one-click policy, evals, stdio MCP), up to 11 contract tests (eval coverage, readable errors, files outside the root refused, Review mode and kill switch, draft sha256, repeatable results, column order, extra columns, BOM and CRLF, padded values, row order, empty files, report language, own column layout), 2 memory and masking tests, and 7 domain tests written against the agent's logic.

## Found and fixed during the build

- **Pseudonyms changed between two runs** without a state folder, so the "same call, same result" contract failed for every agent with personal data. The contract tests now use a fixed test key (as Remedy does); production keeps a per-installation key in `.fairwire/pii.key`.
- **A pseudonym with a leading "+"** (`+TEL-…` for a phone number) did not match its raw value, so an accepted exception on a phone line never applied. `pii.same()` now ignores punctuation in front of a pseudonym.
- **German exports dropped seconds** from timestamps in the localiser, which turned Icarus' 2-second retry gaps into 0 and changed its findings. Seconds are now kept.
- **Click rates rounded to cents** in German exports (Ostro): per-page rates are numbers, not money, and keep their decimals.
- **Row order leaked into results**: Tramontane named a group loop from whichever group came first, and Chinook took a vendor's display name from the first payment row. Both now sort before naming.
- **Talthybius' "open" total** collided with the builder's open-findings count; renamed `open_tickets`.
- **Logic fixes found by the fixtures**: Icarus counted a request that ended in a 400 as recovered; Hermes rounded per-request costs to cents before adding; Libeccio reported an unused line also as an oversized plan; Eurybates reported an old OS also as non-compliant; Apeliotes, Kaikias, Argestes and Aparctias had small wording and display fixes (original serials shown, failed tests due now, not in six months).
- **Builder note helper** broke when a shell heredoc turned `\r\n` into a real line break; rewritten.
- **Three agents did not scale** (first bench run): Boreas compared every rule with every earlier rule and parsed each address again on every comparison (45 s at 10,000 rules), Levante matched every licence against every install with a fresh text clean-up each time (43 s), and Ceryx compared every change with every freeze window and every other change on the same system, parsing the timestamps each time (over 180 s, stopped). Boreas now reads each rule's addresses once and looks only at earlier rules that could cover the first address (any, the same text, or a CIDR); Levante counts devices once per product key; Ceryx sorts once, finds the freeze window by binary search and stops the overlap sweep at the first change that starts after the current one ends. Now 0.8 s, 0.3 s and 0.9 s. The same findings come out (all tests and evals unchanged); Ceryx now names the earliest-starting freeze window when a change falls in two, instead of whichever came first in the file.
- **Hostile arguments hung on Windows**: a 200,000-character `out_dir` made Node 24's recursive `mkdir` never return, and the e-mail mask was quadratic on a 200,000-character string with no "@". Paths over 4,096 characters, or with a name over 255, are now refused before the disk is touched, and the e-mail pattern only starts where an address can start (linear time). Both have a core test. The hostile script itself now uses one sandbox per tool instead of one per call (Windows scans every new file), so the full pass runs in minutes.
- **README demo output changed on every build**: the demo used a fresh pseudonym key each run, so `npm run readme:check` could never pass for agents with personal data. The demo (fictional data only) now uses a fixed key per agent; real runs still use the per-installation key.
- **International check**: the three named vendor layouts (Palo Alto rules, AWS CUR, Entra sign-ins) failed in every language because translating their headers destroys the layout the agent recognises. Vendor exports keep their own column names in every country, so files under `fixtures/exports/` are left out of the translation check; the English cases still test them.

## Not checked yet (say this out loud)

- **Export layouts** come from general knowledge of each product's exports (marked "recalled" in the catalogue). No real customer export has been read. The first setup confirms them with `inspect` and `fairwire-sources.json`.
- **Thresholds and defaults** (days to patch, retention days, top-admin cap of 4, end-of-support operating systems, cloud service suffixes for takeover checks, MOS and jitter limits) are working defaults from public practice as of 2026, in settings files. A security lead should read them before a client relies on them.
- **No live checks**: Etesian does not resolve names, Sirocco does not call cloud APIs, Angelia's countries come from the identity provider. That is by design (local files only) and is said in each report's limits.
- **Translations**: report headings and sections in eight languages and the eight root READMEs were written by Claude and are not reviewed by native speakers. Finding texts, agent READMEs, sample reports and sales copy are English only.
- **Node 20 and 22, Linux and macOS**: only Node 24 on Windows was run here; the CI workflow covers the rest once pushed.
- **MCP SDK conformance** (`npm run mcp:check`) was not run: the official SDK is not installed in this repository and the brief does not require it. The stdio smoke test in every agent passed.
- No security engineer, network engineer or customer has reviewed the agents yet.

## Decisions taken (without Kurt's input, as asked)

1. **Family name and theme**: Fairwire; agents named after winds and Greek messengers (Boreas, Zephyrus, Notus, Eurus, Kaikias, Apeliotes, Skiron, Argestes, Aparctias, Meltemi, Etesian, Sirocco, Libeccio, Ostro, Bora, Tramontane, Levante, Chinook; Hermes, Iris, Echo, Angelia, Arke, Pheme, Ossa, Talthybius, Stentor, Ceryx, Eurybates). Icarus kept its prototype name.
2. **31 agents**, not 30: the five prototypes plus 26 new ones, so every item in the task list has an agent except the ones Fairbooks already covers.
3. **Core**: forked from lodestar-core (with the uncommitted Windows fixes of 18 November) and added masking ported from remedy-core, IT helpers and the `wireAgent` builder, so every agent has the same tools and policy shape.
4. **Masking is on by default** for names, sign-in names, e-mail addresses, phone numbers, IMEIs and client addresses; host names and internal IPs stay visible in `mask` mode (the network agents need them) and are masked in `strict`.
5. **Accepted exceptions** ("known and accepted, with a reason and a review date") are a memory kind in every agent, accepted only by a named person.
6. **One draft per agent**, addressed to the team that acts, with a one-click request in the category that matches the action (change requests are `production_deploy`, notes are `binding_send`).
7. **Prices**: the approved proposals kept ($1,500 each for network traffic and DNS, call quality, AI usage and retries; support $250 a month); five group packages at $2,000 to $3,000; the whole family $9,500; partner rollout $15,000. The $3,500 "all checks" proposal dated from five agents and is replaced by the whole-family package (see `sales/pricing-page-ver1.md`).
8. **Sample reports**: Boreas, Angelia, Meltemi, Sirocco, Iris, Talthybius, Skiron and Etesian, in `sample-reports/` with an index page.
9. **npm**: nothing published, nothing pushed; local commits only, as Kurt Francisco Pavia with the noreply address.

## Ideas for ver 2

Read one real, de-identified export per vendor to mark layouts as checked; business-hours SLA clocks in Talthybius; a monthly "IT health pack" runner that runs the five identity and device agents in order; money formatting in reports; native review of the translations.
