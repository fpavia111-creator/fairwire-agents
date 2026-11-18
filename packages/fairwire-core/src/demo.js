import { mkdtempSync, cpSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { AgentRuntime } from './runtime.js';

/**
 * Pseudonym key for the demo only. The demo data is fictional, so a fixed key per agent is safe and keeps the
 * demo output (and the README built from it) the same on every run. Real runs use the per-install key
 * in the state folder (see loadPiiKey), never this one.
 */
export const demoPiiKey = (manifest) => createHash('sha256').update(`fairwire demo key ${manifest.name}`).digest();

/** Copy bundled fixtures into a temp folder and return a runtime rooted there. */
export function demoRuntime(manifest, fixturesDir, options = {}) {
  const root = mkdtempSync(join(tmpdir(), `${manifest.name}-demo-`));
  cpSync(fixturesDir, root, { recursive: true });
  return new AgentRuntime(manifest, { root, piiKey: demoPiiKey(manifest), ...options });
}

export function printStep(label, r) {
  const head = `\n▶ ${label}\n  status: ${r.status}  decision: ${r.decision}${r.approved_by ? `  approved by: ${r.approved_by}` : ''}${r.auto ? '  (auto)' : ''}`;
  process.stdout.write(head + '\n');
  if (r.reason && r.status !== 'executed') process.stdout.write(`  reason: ${r.reason}\n`);
  if (r.result && r.result.summary) process.stdout.write(`  ${r.result.summary}\n`);
}

/**
 * The demo every Fairwire agent runs: copies the package's fixtures/ into a temporary
 * folder (as fixtures/, so the eval case arguments work as they are), then runs the check,
 * one explanation, the report, the draft (Auto opted in for the draft only), the one-click
 * request (which still waits for a person) and one refused live action.
 *
 * d: { title, args, explain?: { label, args }, draft?: { label, args }, refused: toolName }
 */
export async function standardDemo(manifest, fixturesDir, d) {
  const root = mkdtempSync(join(tmpdir(), `${manifest.name}-demo-`));
  cpSync(fixturesDir, join(root, 'fixtures'), { recursive: true });
  const prefix = manifest.tools[0].name.split('_')[0];
  const draftTool = manifest.tools.find((t) => /_draft_/.test(t.name));
  const reqTool = manifest.tools.find((t) => /_request_/.test(t.name));
  const rt = new AgentRuntime(manifest, { root, mode: 'auto', autoActions: draftTool ? [draftTool.name] : [], piiKey: demoPiiKey(manifest) });
  process.stdout.write(`${d.title} (fictional data) in a temporary folder, Auto on for the draft only\n`);
  const c = await rt.call(`${prefix}_check`, d.args);
  printStep('Check the exported files', c);
  for (const i of (c.result && c.result.items) || []) process.stdout.write(`    ${i.severity.padEnd(7)} ${String(i.code).padEnd(26)} ${String(i.subject ?? i.key).slice(0, 40)}\n`);
  if (d.explain) printStep(d.explain.label, await rt.call(`${prefix}_explain`, { ...d.args, ...d.explain.args }));
  printStep('Write the worklist', await rt.call(`${prefix}_write_report`, d.args));
  if (draftTool) {
    const dr = await rt.call(draftTool.name, { ...d.args, ...((d.draft && d.draft.args) || {}) });
    printStep((d.draft && d.draft.label) || 'Draft the note', dr);
    if (reqTool && dr.status === 'executed') printStep('Auto: approving it still waits for one named person', await rt.call(reqTool.name, { draft: dr.result.draft, draft_sha256: dr.result.draft_sha256 }));
  }
  if (d.refused) printStep('The agent tries to change the live system itself', await rt.call(d.refused, {}));
}
