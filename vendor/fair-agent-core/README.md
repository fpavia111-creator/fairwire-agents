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
