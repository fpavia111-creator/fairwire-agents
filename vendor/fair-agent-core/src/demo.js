import { mkdtempSync, cpSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { AgentRuntime } from './runtime.js';
import { P, familyOf } from './family.js';

/** Copy bundled fixtures into a temp folder and return a runtime rooted there. */
export function demoRuntime(manifest, fixturesDir, options = {}) {
  const root = mkdtempSync(join(tmpdir(), `${manifest.name}-demo-`));
  cpSync(fixturesDir, root, { recursive: true });
  const family = familyOf(manifest) || P();
  // Demos of families that mask personal data run only on bundled fictional fixtures, so they use a
  // fixed pseudonym key: the same demo prints the same pseudonyms. Real runs use a random key per folder.
  const key = family.masking ? { [family.masking.keyOptions[0]]: createHash('sha256').update(`${family.id} demo key: fictional fixtures only`).digest() } : {};
  return new AgentRuntime(manifest, { root, family, ...key, ...options });
}

export function printStep(label, r) {
  const head = `\n▶ ${label}\n  status: ${r.status}  decision: ${r.decision}${r.approved_by ? `  approved by: ${r.approved_by}` : ''}${r.auto ? '  (auto)' : ''}`;
  process.stdout.write(head + '\n');
  if (r.reason && r.status !== 'executed') process.stdout.write(`  reason: ${r.reason}\n`);
  if (r.result && r.result.summary) process.stdout.write(`  ${r.result.summary}\n`);
}
