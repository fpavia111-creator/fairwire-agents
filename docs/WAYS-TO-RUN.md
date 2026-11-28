# Four ways to run these agents

Every agent here is the same program four ways. All four go through the same allow / ask / block policy, the same human approvals, caps, kill switch and audit log. Pick the lightest one your setup allows.

| Way | Best for | What the model sees up front |
|---|---|---|
| **Agent Skill** (`skills/<agent>/SKILL.md`, in the Claude Code plugin) | Claude Code and other hosts that load skills and have a shell | One line per agent until a task needs it |
| **Command line** (`<agent> call <tool> '<json>'`) | Scripts, cron jobs, any agent with a shell | Nothing: the model already knows how to run a command |
| **Your own code** (`runtime.toolSchemas()` + `runtime.run()`) | Your app calling the Claude or OpenAI API directly, no server process | Only the tools you pass |
| **MCP server** (`<agent> mcp`) | Claude Desktop, Cursor and other hosts with no shell; the multi-customer gateway | Every tool's full definition |

## 1. Agent Skill

Install the plugin from this repository's marketplace (`/plugin marketplace add fpavia111-creator/<repo>`, then `/plugin install <agent>@<marketplace>`). The skill tells the model to run the agent with `npx -y <agent>@<version>`, to check a tool's arguments with `help <tool>` before its first call, and to stop at every ASK tool until the person approves it themselves. `npm run skills` rewrites the skills from the manifests; CI runs `npm run skills:check`.

## 2. Command line

```bash
npx -y <agent> tools                       # tools and their decision
npx -y <agent> help <tool>                 # one tool's arguments
npx -y <agent> call <tool> '{"file":"export.csv"}'
npx -y <agent> approve <approval_id> --as "Your Name"   # a person, once
```

Long results are cut to about 20,000 characters (about 5,000 tokens): every total and summary stays, long lists keep their first rows, and the whole result is written to `<state folder>/results/…json`. `--full` prints everything; `--max-chars N` (or `<FAMILY>_MAX_RESULT_CHARS`, `FAIR_MAX_RESULT_CHARS`) changes the limit, `0` turns it off. When the state folder is encrypted, no plain copy is written.

## 3. Your own code (no server)

```js
import { manifest } from '<agent>';
import { AgentRuntime } from '<family>-core';

const rt = new AgentRuntime(manifest, { root: '/path/to/exports' });
const tools = rt.toolSchemas('anthropic');   // or 'openai'
// pass `tools` to the Messages API; when the model picks one:
const result = await rt.run(toolUse.name, toolUse.input);   // same gate, result cut to size
```

`npx -y <agent> tools --json --format anthropic` prints the same definitions.

Code execution works the same way: a short script can call `rt.call(...)` (the full result, never cut), filter or total the rows, and print only the answer, so the rows never enter the model's context.

## 4. MCP server

```bash
npx -y <agent> mcp
```

The server cuts long results the same way as the command line.
