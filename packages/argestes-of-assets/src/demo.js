import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { standardDemo } from 'fairwire-core';

// The demo runs the eval case "check-totals" and the agent's draft on the fictional fixtures.
const cases = JSON.parse(readFileSync(new URL('../evals/cases.json', import.meta.url), 'utf8')).cases;
const base = cases.find((c) => c.id === 'check-totals');
const explain = cases.find((c) => /_explain$/.test(c.tool) && !c.expect.status);
const draft = cases.find((c) => /_draft_/.test(c.tool) && c.approve);

export async function demo(manifest) {
  const refused = manifest.tools.filter((t) => (manifest.policy.rules.find((r) => r.tool === t.name) || {}).decision === 'block')[0];
  await standardDemo(manifest, fileURLToPath(new URL('../fixtures', import.meta.url)), {
    title: 'Argestes of Assets demo', args: base.args,
    explain: explain ? { label: 'Explain one finding', args: explain.args } : null,
    draft: draft ? { label: 'Draft the note for a person', args: draft.args } : null,
    refused: refused ? refused.name : null,
  });
}
