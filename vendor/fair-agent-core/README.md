# fair-agent-core

The one engine under every Fair agent product: pack manifests, the allow / ask /
block policy gate, Review, Assist and Auto modes with caps and a kill switch, human
approvals, hash-chained audit logs, memory, export readers in nine languages, report
pages, a zero-dependency MCP server, fixture-based evals, and optional AES-256-GCM
encryption of the files an agent keeps about its own work. Node 20 or newer. No
dependencies.

A product describes itself once and gets an engine that speaks with its name:

```js
import * as core from 'fair-agent-core';
const family = core.defineFamily({ id: 'fairhaul', brand: 'Fairhaul', dialect: { /* reading rules */ }, masking: { /* the product's own masker */ } });
export const { AgentRuntime, AuditLog, ApprovalStore /* ... */ } = core.bindApi(core, family);
```

`src/family.js` lists every setting. `src/state.js` explains state encryption: what
it covers, where the key comes from, and what it does not cover. The suite's
`docs/ARCHITECTURE.md` and `docs/SECURITY.md` have the full picture.

This software holds no security certification.

## 8.1.0 (28 Nov 2026): lighter ways to run

- **Results cut to size.** The MCP server, `call` on the command line and `runtime.run()` cut a
  result longer than 20,000 characters (about 5,000 tokens): every total and summary stays, long
  lists keep their first rows, and the whole result is written to `<state>/results/` (not when the
  state is encrypted). A 2,000-row review went from 1.5 MB to 22 KB. `runtime.call()` is unchanged.
  Limit: `--max-chars N`, `<FAMILY>_MAX_RESULT_CHARS` or `FAIR_MAX_RESULT_CHARS`; `0` = no limit; `--full`.
- **No server needed.** `runtime.toolSchemas('anthropic' | 'openai' | 'mcp')` and
  `<agent> tools --json --format anthropic` give tool definitions to pass to a model API directly
  (blocked tools left out); `runtime.run(name, input)` runs the one the model picked through the
  same gate. `<agent> help <tool>` prints one tool's arguments.
- **Agent Skills.** `renderSkill(runtime)` and `<agent> skill` write a SKILL.md that drives the
  agent from the command line, with the approval rule spelled out.
