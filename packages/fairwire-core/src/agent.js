// Builds a Fairwire agent manifest from a short description, so every agent has the
// same shape:
//
//   <prefix>_check          read    run the checks on the exported files, findings worst first
//   <prefix>_explain        read    (optional) everything found for one host, user, rule ...
//   <prefix>_write_report   report  CSV worklist (owner and decision columns) + HTML page (+ .ics)
//   <prefix>_draft_<noun>   write   a note or change request marked DRAFT (asks first)
//   <prefix>_request_<verb> action  one named person's click, tied to the draft's sha256
//   <prefix>_recall/learn/accept_learning/retire_memory   accepted exceptions ("known and accepted")
//   refused tools           listed so a model can see that live changes are refused
//
// The agent's own code is `run(a, ctx)`: read files through ctx, return
// { items: [{ code, severity, key, subject, message, fix, ... }], ...totals }.
// Every finding has a code (a word), a severity (high, medium, low or info) and a key
// that names what it is about (a rule, a host, a user). The builder sorts findings worst
// first, applies accepted exceptions, counts by code and writes the report.
import { defineManifest } from './manifest.js';
import { MODEL_PIN, writeWorklist, draftPair, refusedTools, LIMITS } from './kit.js';
import { memoryTools } from './memory.js';
import { toIcs } from './formats.js';
import { isoDate } from './it.js';

export const SEVERITIES = Object.freeze(['high', 'medium', 'low', 'info']);
const RANK = { high: 0, medium: 1, low: 2, info: 3 };
const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

/** The memory kind every agent has: a reviewed finding a named person accepted as known. */
export const KNOWN_EXCEPTION = Object.freeze({
  description: 'A finding a person reviewed and accepted as known, with a reason and a date to look again. code is the finding code and key the thing it is about, both as the result shows them (a pseudonym is fine), e.g. {"code": "any_any_allow", "key": "rule 12", "note": "lab firewall, isolated", "review_by": "2027-03-01"}.',
  effect: 'that finding is listed under "Accepted as known" instead of as open, until review_by (when given) has passed.',
  schema: { type: 'object', additionalProperties: false, required: ['code', 'key'], properties: { code: { type: 'string', minLength: 1, maxLength: 60 }, key: { type: 'string', minLength: 1, maxLength: 200 }, note: { type: 'string', maxLength: 300 }, review_by: { type: 'string', format: 'date' } } },
});

const LIMIT_ARG = { type: 'integer', minimum: 1, maximum: 5000, description: 'Most findings to return to the model (the report file always has all of them)' };
const SEVERITY_ARG = { type: 'string', enum: ['high', 'medium', 'low', 'info'], description: 'Only findings of this severity' };
const CODE_ARG = { type: 'string', maxLength: 60, description: 'Only findings with this code' };

/** Standard file argument. */
export const fileArg = (description) => ({ type: 'string', description });
export const AS_OF_ARG = { type: 'string', format: 'date', description: 'Date to measure ages and deadlines from, YYYY-MM-DD (default today)' };
export const SETTINGS_ARG = (what) => ({ type: 'string', description: `Optional settings JSON under --root: ${what}` });

/** Sort findings worst first, then by code and key, so the order never depends on the order of the rows. */
export function sortFindings(items) {
  return [...items].sort((x, y) => (RANK[x.severity] ?? 9) - (RANK[y.severity] ?? 9) || cmp(x.code, y.code) || cmp(String(x.key), String(y.key)) || cmp(String(x.message), String(y.message)));
}

/** Counts by code: { code: { severity, count } } sorted by code. */
export function byFinding(items) {
  const m = {};
  for (const i of items) { const e = m[i.code] || (m[i.code] = { severity: i.severity, count: 0 }); e.count++; if ((RANK[i.severity] ?? 9) < (RANK[e.severity] ?? 9)) e.severity = i.severity; }
  return Object.fromEntries(Object.entries(m).sort(([a], [b]) => cmp(a, b)));
}

const KINDS_FOR_SAME = ['user', 'name', 'phone', 'ip', 'host', 'device_id'];
function matchesException(ctx, item, v, asOf) {
  if (String(v.code).toLowerCase() !== String(item.code).toLowerCase()) return false;
  if (v.review_by && asOf && isoDate(v.review_by) < asOf) return false;
  const raw = String(item.key ?? '');
  if (raw.toLowerCase() === String(v.key).trim().toLowerCase()) return true;
  return !!ctx.pii && KINDS_FOR_SAME.some((k) => ctx.pii.same(raw, v.key, k));
}

/**
 * cfg: {
 *   pkg, prefix, title, description,
 *   args: { name: schema }, required: [names]     file and option arguments of check and report
 *   sources, configSchemas, memoryKinds (extra kinds), argDocs,
 *   run(a, ctx) -> { items, ...totals }            items: { code, severity, key, subject, message, fix, ... }
 *   summary(o) -> string                           one line, numbers only from o
 *   check: { title, description },
 *   explain: { arg, argSchema, title, description, match(item, value, ctx) -> bool },
 *   reads: [{ name, title, description, properties, required, run(a, ctx) }],
 *   report: { title, base, rows(o)?, htmlColumns?, sections(o)?, limits?, ics(o)? -> [{ date, summary, description }] },
 *   drafts: draftPair cfg without prefix/outDir,
 *   refused: [{ name, category, description }],
 *   prompt: { title, description, text, arguments }
 * }
 */
export function wireAgent(cfg) {
  const { pkg, prefix } = cfg;
  const out = `fairwire-out/${prefix}`;
  const MEMORY = memoryTools(prefix, { known_exception: KNOWN_EXCEPTION, ...(cfg.memoryKinds || {}) });
  const refused = refusedTools(cfg.refused || []);
  const drafts = cfg.drafts ? draftPair({ prefix, outDir: out, ...cfg.drafts }) : cfg.note ? draftPair({ prefix, outDir: out, ...noteDraft(cfg, () => evaluate) }) : { tools: [], rules: [] };
  const checkName = `${prefix}_check`, explainName = `${prefix}_explain`, reportName = `${prefix}_write_report`;

  /**
   * Run the agent's checks, sort, apply accepted exceptions and count.
   * cfg.needs ({ code: [field, ...] }) names the columns a "value is missing" check depends on. When the
   * export has no such column at all (not just empty cells), that check would flag every row, so its
   * findings are dropped and checks_skipped says why. Found by the final pass on real exports.
   */
  async function evaluate(a, ctx) {
    const seen = new Set();
    const watched = cfg.needs ? new Proxy(ctx, { get(t, p) {
      if (p === 'records') return (...args) => { const rows = t.records(...args); for (const r of rows.slice(0, 200)) if (r && typeof r === 'object') for (const k of Object.keys(r)) seen.add(k); return rows; };
      const v = Reflect.get(t, p); return typeof v === 'function' ? v.bind(t) : v;
    } }) : ctx;
    const o = await cfg.run(a, watched);
    const skipped = [];
    if (cfg.needs && seen.size) for (const [code, fields] of Object.entries(cfg.needs)) { const absent = [].concat(fields).filter((f) => !seen.has(f)); if (absent.length) skipped.push({ code, absent }); }
    const skip = new Set(skipped.map((s) => s.code));
    if (skipped.length) { o.items = (o.items || []).filter((i) => !skip.has(i.code)); o.checks_skipped = skipped.map((s) => `${s.code}: the export has no ${s.absent.join(' or ')} column`); }
    const asOf = isoDate(a.as_of) || isoDate(new Date().toISOString());
    const facts = ctx.memoryFacts('known_exception').map((f) => ({ ...f.value, id: f.id, accepted_by: f.accepted_by }));
    const items = sortFindings(o.items || []).map((i) => {
      const f = facts.find((x) => matchesException(ctx, i, x, asOf));
      return f ? { ...i, accepted: true, accepted_by: f.accepted_by, accepted_note: f.note || '', memory_id: f.id } : i;
    });
    const open = items.filter((i) => !i.accepted);
    return { ...o, items, open: open.length, accepted: items.length - open.length, high: open.filter((i) => i.severity === 'high').length, by_finding: byFinding(open) };
  }
  const line = (o) => `${cfg.summary(o)}${o.accepted ? ` ${o.accepted} finding(s) accepted as known.` : ''}${o.checks_skipped ? ` ${o.checks_skipped.length} check(s) skipped for a column the export does not have.` : ''}`;

  const tools = [
    {
      name: checkName, kind: 'read', title: cfg.check.title, description: cfg.check.description,
      inputSchema: { type: 'object', additionalProperties: false, required: cfg.required || [], properties: { ...cfg.args, severity: SEVERITY_ARG, code: CODE_ARG, limit: LIMIT_ARG } },
      handler: async (a, ctx) => {
        const o = await evaluate(a, ctx);
        const shown = o.items.filter((i) => (!a.severity || i.severity === a.severity) && (!a.code || i.code === a.code));
        const { items: _all, ...rest } = o;
        const lim = a.limit || 200;
        return { summary: line(o), ...rest, findings: shown.length, items: shown.slice(0, lim), ...(shown.length > lim ? { more: shown.length - lim } : {}) };
      },
    },
    ...(cfg.explain ? [{
      name: explainName, kind: 'read', title: cfg.explain.title, description: cfg.explain.description,
      inputSchema: { type: 'object', additionalProperties: false, required: [...(cfg.required || []), cfg.explain.arg], properties: { ...cfg.args, [cfg.explain.arg]: cfg.explain.argSchema } },
      handler: async (a, ctx) => {
        const o = await evaluate(a, ctx);
        const want = String(a[cfg.explain.arg]).trim();
        const hits = o.items.filter((i) => cfg.explain.match(i, want, ctx));
        if (!hits.length) throw new Error(`nothing found for ${cfg.explain.arg} "${want.slice(0, 80)}"; pass one from ${checkName}`);
        return { summary: hits.map((i) => `${i.severity} ${i.code}${i.accepted ? ' (accepted as known)' : ''}: ${i.message}${i.fix ? ` Fix: ${i.fix}` : ''}`).join('\n'), findings: hits.length, items: hits };
      },
    }] : []),
    ...(cfg.reads || []).map((r) => ({
      name: r.name, kind: 'read', title: r.title, description: r.description,
      inputSchema: { type: 'object', additionalProperties: false, required: r.required || [], properties: r.properties },
      handler: async (a, ctx) => r.run(a, ctx, evaluate),
    })),
    {
      name: reportName, kind: 'report', title: `Write the ${cfg.report.title.toLowerCase()} worklist`,
      description: `Write ${cfg.report.base}.csv (one row per finding, with blank owner and decision columns) and ${cfg.report.base}.html${cfg.report.ics ? `, plus ${cfg.report.base}.ics (one reminder per date to act by)` : ''} into out_dir (default ${out}). Nothing is sent or changed.`,
      inputSchema: { type: 'object', additionalProperties: false, required: cfg.required || [], properties: { ...cfg.args, out_dir: { type: 'string' } } },
      handler: async (a, ctx) => {
        const o = await evaluate(a, ctx);
        const rowsOf = cfg.report.rows || ((x) => x.items.map((i) => ({ severity: i.severity, code: i.code, subject: i.subject ?? i.key, message: i.message, fix: i.fix || '' })));
        const rows = rowsOf(o).map((r, k) => ({ ...r, status: o.items[k] && o.items[k].accepted ? 'accepted' : 'open', owner: '', decision: '' }));
        const dir = a.out_dir || out;
        const accepted = o.items.filter((i) => i.accepted).map((i) => ({ code: i.code, key: i.key, accepted_by: i.accepted_by, note: i.accepted_note }));
        const sections = [
          { title: 'By finding', rows: Object.entries(o.by_finding).map(([code, v]) => ({ code, severity: v.severity, count: v.count })), columns: ['code', 'severity', 'count'] },
          ...(cfg.report.sections ? cfg.report.sections(o) : []),
          ...(accepted.length ? [{ title: 'Accepted as known', rows: accepted, columns: ['code', 'key', 'accepted_by', 'note'] }] : []),
        ];
        const w = writeWorklist(ctx, dir, cfg.report.base, {
          title: cfg.report.title, intro: line(o), rows,
          columns: rows.length ? Object.keys(rows[0]) : ['severity', 'code', 'subject', 'message', 'fix', 'status', 'owner', 'decision'],
          htmlColumns: cfg.report.htmlColumns || ['severity', 'code', 'subject', 'message', 'fix', 'status'],
          sections, limits: cfg.report.limits || [LIMITS.files, LIMITS.live, LIMITS.defaults],
        });
        if (cfg.report.ics) {
          const ev = cfg.report.ics(o).filter((e) => isoDate(e.date));
          if (ev.length) w.files.push(ctx.writeFile(ctx.outDir(dir), `${cfg.report.base}.ics`, toIcs(ev.map((e, k) => ({ uid: `${prefix}-${isoDate(e.date)}-${k}@fairwire`, date: isoDate(e.date), summary: e.summary, description: e.description || `Written by ${pkg.name}.`, reminders: [2] })), { calName: cfg.report.title })));
        }
        return { summary: `${cfg.report.title} written: ${line(o)}`, open: o.open, accepted: o.accepted, high: o.high, ...w };
      },
    },
    ...drafts.tools,
    ...MEMORY.tools,
    ...refused.tools,
  ];
  return defineManifest({
    name: pkg.name, version: pkg.version, description: cfg.description, model: MODEL_PIN,
    caps: { maxSteps: 60, maxSpendUsd: 0 },
    configSchemas: cfg.configSchemas || {},
    memory: { prefix, kinds: { known_exception: KNOWN_EXCEPTION, ...(cfg.memoryKinds || {}) } },
    sources: cfg.sources || {},
    argDocs: cfg.argDocs || {},
    prompts: cfg.prompt ? [{ name: `${prefix}_review`, arguments: [], ...cfg.prompt }] : [],
    tools,
    policy: { rules: [
      { tool: checkName, decision: 'allow' },
      ...(cfg.explain ? [{ tool: explainName, decision: 'allow' }] : []),
      ...(cfg.reads || []).map((r) => ({ tool: r.name, decision: 'allow' })),
      { tool: reportName, decision: 'allow' },
      ...drafts.rules,
      ...MEMORY.rules,
      ...refused.rules,
      { tool: '*', decision: 'block', reason: `Not on the ${cfg.title} allowlist.` },
    ] },
  });
}

const SEV_ORDER = ['high', 'medium', 'low', 'info'];
const cell = (v) => String(v ?? '').replace(/[|]/g, '/').replace(/[\r\n]+/g, ' ').trim();

/**
 * The standard draft: a note listing the open findings at or above a severity, for the person
 * or team who acts on them. cfg.note: { noun, verb, category, actor, to, subject, ask }.
 */
function noteDraft(cfg, getEvaluate) {
  const n = cfg.note;
  return {
    noun: n.noun, verb: n.verb || 'send', category: n.category || 'binding_send', actor: n.actor || 'a person',
    description: `Write drafts/${n.noun}-<date>.md: the open findings at or above min_severity (default medium), each with what to do, addressed to ${n.to}. Marked DRAFT; nothing is sent or changed. Approving it goes through ${cfg.prefix}_request_${n.verb || 'send'} (one named click); ${n.actor || 'a person'} acts on it.`,
    required: cfg.required || [],
    args: { ...cfg.args, to: { type: 'string', maxLength: 200, description: `Who the note goes to (default: a placeholder for ${n.to} to confirm)` }, min_severity: { type: 'string', enum: ['high', 'medium', 'low', 'info'], description: 'Lowest severity to include (default medium)' } },
    build: async (a, ctx) => {
      const o = await getEvaluate()(a, ctx);
      const floor = SEV_ORDER.indexOf(a.min_severity || 'medium');
      const items = o.items.filter((i) => !i.accepted && SEV_ORDER.indexOf(i.severity) <= floor);
      if (!items.length) throw new Error(`no open findings at ${a.min_severity || 'medium'} or above to put in the note`);
      const day = isoDate(a.as_of) || isoDate(new Date().toISOString());
      const text = [
        `**To:** ${a.to ? cell(a.to) : `[TO CONFIRM ${n.to}]`}`,
        `**Subject:** ${n.subject} (${items.length} item(s), ${day})`, '',
        cell(cfg.summary(o)), '',
        '| # | Severity | Finding | About | Suggested next step |', '|---|---|---|---|---|',
        ...items.map((i, k) => `| ${k + 1} | ${i.severity} | ${cell(i.message)} | ${cell(i.subject ?? i.key)} | ${cell(i.fix)} |`), '',
        n.ask, '',
        `Nothing in this note has been applied. ${n.actor ? n.actor[0].toUpperCase() + n.actor.slice(1) : 'A person'} decides and makes each change.`,
      ].join('\n');
      return { id: day, to: a.to || null, text, extra: { items: items.length } };
    },
  };
}

/** Read an optional settings file, validated against the agent's schema, merged over defaults. */
export function settingsFrom(a, ctx, schemaName, defaults) {
  const s = a.settings ? ctx.readJson(a.settings, schemaName) : {};
  return { ...defaults, ...s };
}

/** A finding. */
export const finding = (code, severity, key, message, fix = '', extra = {}) => ({ code, severity, key: String(key ?? ''), subject: extra.subject ?? String(key ?? ''), message, fix, ...extra });
