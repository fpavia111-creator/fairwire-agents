// Fairwire Change Calendar: change calendar review. Pure functions.
import { str, low, yes, toMs, hourOf, weekdayOf, overlaps, pct, finding } from 'fairwire-core';

export const CHECKS = Object.freeze({
  in_freeze_window: 'A change scheduled inside a change freeze (medium for emergency changes).',
  not_approved: 'A normal or emergency change with no approval recorded.',
  overlapping_changes: 'Two changes to the same system whose windows overlap (high when both are high risk).',
  no_backout_plan: 'A normal or emergency change with no back-out plan.',
  risky_in_business_hours: 'A high-risk change scheduled to start in business hours on a working day.',
  repeat_failed_changes: 'A system whose changes failed or were rolled back several times.',
  no_test_evidence: 'A normal change with no test evidence recorded.',
  emergency_share: 'Emergency changes are a larger share of all changes than your limit (planning is being skipped).',
});

export const CHANGE_FIELDS = Object.freeze({
  change_id: { aliases: ['Change', 'Change ID', 'Number', 'ID', 'Key'], required: true },
  system: { aliases: ['System', 'Configuration Item', 'CI', 'Service', 'Application'], required: true },
  title: { aliases: ['Title', 'Short Description', 'Summary', 'Description'] },
  start: { type: 'datetime', aliases: ['Planned Start', 'Start', 'Start Date', 'Scheduled Start', 'Window Start'], required: true },
  end: { type: 'datetime', aliases: ['Planned End', 'End', 'End Date', 'Scheduled End', 'Window End'] },
  risk: { aliases: ['Risk', 'Risk Level', 'Impact'] },
  type: { aliases: ['Type', 'Change Type', 'Category'] },
  approval: { aliases: ['Approval', 'Approved', 'Approval Status', 'CAB Approval'] },
  backout_plan: { aliases: ['Backout Plan', 'Back-out Plan', 'Rollback Plan', 'Backout'] },
  test_evidence: { aliases: ['Test Evidence', 'Test Plan', 'Tested', 'Testing'] },
  outcome: { aliases: ['Outcome', 'Close Code', 'Result', 'Implementation Result'] },
  requester: { aliases: ['Requested By', 'Requester', 'Owner', 'Assigned To'], pii: 'name' },
});
export const FREEZE_FIELDS = Object.freeze({
  name: { aliases: ['Name', 'Freeze', 'Blackout', 'Reason'], required: true },
  start: { type: 'datetime', aliases: ['Start', 'From', 'Start Date'], required: true },
  end: { type: 'datetime', aliases: ['End', 'To', 'End Date'], required: true },
});

export const SETTINGS_SCHEMA = { type: 'object', additionalProperties: false, properties: {
  business_hours: { type: 'array', items: { type: 'integer', minimum: 0, maximum: 24 }, minItems: 2, maxItems: 2, description: 'First and last hour of business, e.g. [8, 18] (default)' },
  emergency_share_pct: { type: 'number', minimum: 1, maximum: 100, description: 'Share of emergency changes above which it is flagged (default 15)' },
  failed_min: { type: 'integer', minimum: 2, description: 'Failed or rolled-back changes on one system before it is flagged (default 2)' },
} };
export const DEFAULTS = Object.freeze({ business_hours: [8, 18], emergency_share_pct: 15, failed_min: 2 });

const filled = (v) => { const t = str(v); return !!t && yes(t) !== false && !/^(n\/a|none|-|tbd|todo)$/i.test(t); };

export function reviewChanges(rows, freezeRows = [], settings = {}) {
  const s = { ...DEFAULTS, ...settings };
  const cs = rows.filter((r) => str(r.change_id) && str(r.system) && Number.isFinite(toMs(r.start))).map((r) => { const start = str(r.start); const end = Number.isFinite(toMs(r.end)) ? str(r.end) : new Date(toMs(start) + 3600000).toISOString().slice(0, 19).replace('T', ' '); const type = low(r.type); return { id: str(r.change_id), system: str(r.system), sys: low(r.system), start, end, t0: toMs(start), t1: toMs(end), risk: low(r.risk), type: /emerg/.test(type) ? 'emergency' : /standard|pre-?approved/.test(type) ? 'standard' : 'normal', approved: /approv|yes|true|granted/i.test(str(r.approval)) && !/not|pending|reject|requested/i.test(str(r.approval)), backout: filled(r.backout_plan), tested: filled(r.test_evidence), failed: /fail|rolled|backed out|unsuccess/i.test(str(r.outcome)) }; });
  const fz = freezeRows.filter((r) => str(r.name) && Number.isFinite(toMs(r.start)) && Number.isFinite(toMs(r.end))).map((r) => ({ name: str(r.name), start: str(r.start), end: str(r.end), t0: toMs(r.start), t1: toMs(r.end) }))
    .sort((a, b) => a.t0 - b.t0 || (a.name < b.name ? -1 : a.name > b.name ? 1 : a.t1 - b.t1));
  const latestEnd = []; for (const f of fz) latestEnd.push(Math.max(latestEnd.length ? latestEnd[latestEnd.length - 1] : -Infinity, f.t1));
  /** The earliest-starting freeze window that overlaps [t0, t1), or undefined (end exclusive, as overlaps()). */
  const freezeFor = (t0, t1) => {
    if (!(t0 < t1) || !fz.length) return undefined;
    let lo = 0, hi = fz.length; while (lo < hi) { const m = (lo + hi) >> 1; if (fz[m].t0 < t1) lo = m + 1; else hi = m; }
    const n = lo; lo = 0; hi = n; while (lo < hi) { const m = (lo + hi) >> 1; if (latestEnd[m] > t0) hi = m; else lo = m + 1; }
    return lo < n ? fz[lo] : undefined;
  };
  const items = []; const [h0, h1] = s.business_hours;
  for (const c of cs) {
    const f = freezeFor(c.t0, c.t1);
    if (f) items.push(finding('in_freeze_window', c.type === 'emergency' ? 'medium' : 'high', c.id, `${c.id} on ${c.system} (${c.start}) falls inside the freeze window "${f.name}".`, c.type === 'emergency' ? 'Make sure the emergency is real and the freeze owner has agreed.' : 'Move it after the freeze, or get the freeze owner\'s written exception.', { subject: c.system }));
    if (c.type !== 'standard' && !c.approved) items.push(finding('not_approved', 'high', c.id, `${c.type === 'emergency' ? 'Emergency change' : 'Change'} ${c.id} on ${c.system} has no approval recorded.`, 'Get the approval before the window, or postpone the change.', { subject: c.system }));
    if (c.type !== 'standard' && !c.backout) items.push(finding('no_backout_plan', 'medium', c.id, `${c.id} on ${c.system} has no back-out plan.`, 'Write down how to undo it and how long that takes.', { subject: c.system }));
    if (c.type === 'normal' && !c.tested) items.push(finding('no_test_evidence', 'low', c.id, `${c.id} on ${c.system} has no test evidence.`, 'Attach what was tested and where.', { subject: c.system }));
    const h = hourOf(c.start); const wd = weekdayOf(c.start);
    if (/high|major|critical/.test(c.risk) && h !== null && h >= h0 && h < h1 && wd >= 1 && wd <= 5) items.push(finding('risky_in_business_hours', 'medium', c.id, `High-risk change ${c.id} on ${c.system} starts at ${c.start}, during business hours.`, 'Move it to a quiet window unless the business has agreed.', { subject: c.system }));
  }
  const bySys = new Map(); for (const c of cs) { const l = bySys.get(c.sys); if (l) l.push(c); else bySys.set(c.sys, [c]); }
  for (const [, list] of bySys) {
    const l = [...list].sort((a, b) => a.t0 - b.t0 || (a.id < b.id ? -1 : 1));
    for (let i = 0; i < l.length; i++) for (let j = i + 1; j < l.length && l[j].t0 < l[i].t1; j++) if (l[i].t0 < l[i].t1 && l[j].t0 < l[j].t1 && l[i].t0 < l[j].t1) { const both = /high/.test(l[i].risk) && /high/.test(l[j].risk); items.push(finding('overlapping_changes', both ? 'high' : 'medium', `${l[i].id}+${l[j].id}`, `${l[i].id} and ${l[j].id} both change ${l[i].system} at the same time (${l[i].start} and ${l[j].start}).`, 'Merge them or move one, so a failure can be traced to one change.', { subject: l[i].system })); }
    const failed = l.filter((c) => c.failed); if (failed.length >= s.failed_min) items.push(finding('repeat_failed_changes', 'medium', l[0].system, `${failed.length} changes on ${l[0].system} failed or were rolled back (${failed.map((c) => c.id).join(', ')}).`, 'Review how changes to this system are tested before the next one.', { subject: l[0].system }));
  }
  const em = cs.filter((c) => c.type === 'emergency').length; const share = pct(em, cs.length);
  if (cs.length >= 5 && share > s.emergency_share_pct) items.push(finding('emergency_share', 'low', 'emergency', `${share}% of changes (${em} of ${cs.length}) were emergencies.`, 'Look at why work skips normal planning; frequent emergencies hide risk.', { subject: 'all systems' }));
  return { changes: cs.length, systems: bySys.size, emergency: em, failed: cs.filter((c) => c.failed).length, freezes: fz.length, items };
}
