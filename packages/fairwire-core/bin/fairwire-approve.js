#!/usr/bin/env node
import { resolve, join } from 'node:path';
import { ApprovalStore } from '../src/approvals.js';
import { parseFlags } from '../src/cli.js';

const { flags, pos } = parseFlags(process.argv.slice(2));
if (!pos[0] || flags.help) {
  process.stdout.write('Usage: fairwire-approve <approval_id> --as "Your Name" [--dir .fairwire] [--note "why"]\n');
  process.exit(pos[0] ? 0 : 2);
}
try {
  const dir = resolve(flags.dir || join(process.cwd(), '.fairwire'));
  const rec = new ApprovalStore(dir).approve(pos[0], flags.as, flags.note || '');
  process.stdout.write(`Approved ${rec.id} as ${rec.approved_by} (${dir}). It can be used once.\n`);
} catch (e) {
  process.stderr.write(`fairwire-approve: ${e.message}\n`);
  process.exit(1);
}
