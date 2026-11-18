# MCP quality checklist for Fairwire agents

The rules below were first written for the Mythos family and are applied here to the
30 Fairwire freight agents built on `fairwire-core`.

## What the check found on the 30 Fairwire agents (2026-11-16, ver 2)

`npm run mcp:check` drives every agent through the official MCP SDK client over real stdio.

| Check | Result |
|---|---|
| Connects, lists and calls over real stdio with the official SDK client | 30 of 30 |
| Tool names valid under the 2025-11-25 spec | all 270 |
| Input schemas compile (JSON Schema 2020-12) | all |
| Tool arguments with no description | 0 |
| Tools with an output schema | 210 (every tool except the 60 listed-but-refused ones) |
| Unknown tool name | answered as a tool error, not a protocol error |
| Issues | 0 |

Context cost: all 30 agents' tool lists together are about 50k tokens as a model sees
them (about 1.7k per agent). Fine for one or a few agents; installing all 30 at once
in a client without tool search would use a large part of a context window.

## Rules for a new family

1. **Describe every argument.** Inline `description`, or `argDocs` in the manifest.
   Shared names (`out_dir`, `as_of`, `reason`, `title`, `note`, `accept_open_issues`,
   `timeout_ms`, `*_column`, a file plus its `*_sha256`) are covered by the core glossary.
   State units and defaults ("days", "fraction 0-1", "default 30"); a model guesses otherwise.
2. **Give every `enum` a `type`.** Some hosts reject a bare `enum`.
3. **Name tools `<prefix>_<verb>_<noun>`**, letters, digits, `_`, `-`, `.` only, 128 max.
4. **Error reasons say what to pass**, e.g. `pass "logs": ["path/to/audit.jsonl"]`.
5. **Keep tool descriptions short and front-loaded.** The first sentence is what a model
   uses to pick a tool. The core prefixes `[ALLOW]`, `[ASK · category]` or `[BLOCK]`.
6. **Never write to stdout** outside the MCP server. Logs go to stderr.
7. **Run `npm run mcp:check`** before every handoff (needs
   `npm i --no-save @modelcontextprotocol/sdk ajv ajv-formats`; test-only, not shipped).

## Not done yet (candidates for a next round)

- **In-chat approvals via MCP elicitation.** Hosts that support elicitation could show the
  approve/reject form inside the chat instead of the separate approvals page. This changes
  the trust model (the host relays the click), so it should be opt-in and never apply to
  one-click categories. Owner decision.
- Requests are handled one at a time, so a long tool call delays `ping` and ignores
  `notifications/cancelled`. Fine for local files; matters for slow network tools.
- Real-model evaluations (the MCP builder guide's 10-question XML evals) need an API key
  and were not run. The fixture-based evals in each package still pass.
