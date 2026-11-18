// Building blocks the Fairwire agents share: worklist files, the
// draft → one-click request pair, refused tools, and small table helpers.
// Every agent still owns its own manifest and policy; these only remove repetition.
import { readFileSync, existsSync, appendFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { toCsv } from './csv.js';
import { sha256, safePath } from './util.js';
import { escapeHtml, htmlPage, safeMarkdown, safeFileName } from './formats.js';
import { reportText, ENGLISH_NOTE } from './report-text.js';

export const MODEL_PIN = Object.freeze({ provider: 'anthropic', id: 'claude-sonnet-5-5', note: 'Declared host-model pin. The tools are deterministic and call no model.' });
export const OPEN_MARKER = /\[(TO CONFIRM|MISSING|CHECK|ATTACH)[^\]]*\]/g;

const rel = (ctx, f) => relative(ctx.root, f).split('\\').join('/');

/** Hash of several output files (name + content hash), recorded in the audit line. */
export const filesHash = (files) => sha256(files.map((f) => `${String(f).split(/[\\/]/).pop()}:${sha256(readFileSync(f))}`).join('\n'));

/** Append one row to a CSV log, writing the header the first time. */
export function appendRow(dir, name, row, columns) {
  const f = join(dir, name);
  const csv = toCsv([row], columns);
  appendFileSync(f, existsSync(f) ? csv.split('\n').slice(1).join('\n') : csv);
  return f;
}

/** A small HTML table from rows. Values are escaped. t (from reportText) puts the column headings in the report language. */
export function htmlTable(rows, columns, labels = {}, t = null) {
  if (!rows.length) return `<p class="mut">${escapeHtml(t ? t.page('None.') : 'None.')}</p>`;
  const head = columns.map((c) => `<th>${escapeHtml(t ? t.column(c, labels[c]) : labels[c] || c.replace(/_/g, ' '))}</th>`).join('');
  const body = rows.map((r) => `<tr>${columns.map((c) => { const v = r[c]; return `<td>${escapeHtml(v === null || v === undefined ? '' : Array.isArray(v) ? v.join(', ') : typeof v === 'object' ? JSON.stringify(v) : String(v))}</td>`; }).join('')}</tr>`).join('\n');
  return `<table><thead><tr>${head}</tr></thead><tbody>\n${body}\n</tbody></table>`;
}

/**
 * Write a worklist as CSV (for people to fill in) and HTML (to read), plus an
 * optional summary block. Returns { files, output_sha256 }.
 *
 * The page follows the report language (ctx.lang, from --lang): headings, section
 * headings and common column names. The CSV does not change with the language, so a
 * script reads the same columns everywhere; finding texts and limits stay in English
 * and the page footer says so.
 */
export function writeWorklist(ctx, dir, base, { title, intro = '', rows, columns, htmlColumns, labels = {}, sections = [], limits = [] }) {
  const out = ctx.outDir(dir);
  const t = reportText(ctx.lang);
  const csv = ctx.writeFile(out, `${base}.csv`, toCsv(rows, columns));
  const body = [
    `<h1>${escapeHtml(t.title(title))}</h1>`,
    intro ? `<p class="mut">${escapeHtml(intro)}</p>` : '',
    ...sections.map((s) => `<h2>${escapeHtml(t.section(s.title))}</h2>${s.html || htmlTable(s.rows || [], s.columns || [], labels, t)}`),
    `<h2>${escapeHtml(t.page(`All rows (${rows.length})`))}</h2>`,
    htmlTable(rows, htmlColumns || columns, labels, t),
    limits.length ? `<h2>${escapeHtml(t.page('Limits'))}</h2><ul>${limits.map((l) => `<li>${escapeHtml(l)}</li>`).join('')}</ul>` : '',
  ].join('\n');
  const foot = 'Written by a Fairwire agent from your files. Nothing was sent or changed.';
  const html = ctx.writeFile(out, `${base}.html`, htmlPage({ title: t.title(title), bodyHtml: body, footer: t.english ? foot : `${t.page(foot)} ${t.page(ENGLISH_NOTE)}`, lang: t.lang }));
  const files = [csv, html];
  return { files, output_sha256: filesHash(files) };
}

/** Tools listed so a host model can see them and see they are refused. */
export function refusedTools(list) {
  return {
    tools: list.map(({ name, category, description }) => ({ name, kind: 'action', category, description: `Listed so agents can see it is refused. ${description}`, inputSchema: { type: 'object', additionalProperties: false, properties: {} } })),
    rules: list.map(({ name, reason, description }) => ({ tool: name, decision: 'block', reason: reason || description })),
  };
}

const str = { type: 'string' };

/**
 * The draft → one-click pair.
 *
 *   <prefix>_draft_<noun>     kind 'write': writes drafts/<noun>-<id>.md marked DRAFT and returns its sha256.
 *   <prefix>_request_<verb>   kind 'action' in a one-click category: re-hashes the draft, refuses if it
 *                             changed or still has open markers (unless accept_open_issues with a note),
 *                             then appends an approved row to <noun>-requests.csv. A person acts on it.
 *
 * cfg: { prefix, noun, verb, category, outDir, title, description, args (properties), required,
 *        build(a, ctx) → { id, to, text }, requestDescription, actor }
 */
export function draftPair(cfg) {
  const { prefix, noun, verb = 'send', category = 'binding_send', outDir, actor = 'a person' } = cfg;
  const draftName = `${prefix}_draft_${noun}`, reqName = `${prefix}_request_${verb}`;
  const draftTool = {
    name: draftName, kind: 'write', title: cfg.title || `Draft a ${noun.replace(/_/g, ' ')}`,
    description: cfg.description,
    inputSchema: { type: 'object', additionalProperties: false, required: cfg.required || [], properties: { ...cfg.args, out_dir: str } },
    handler: async (a, ctx) => {
      const d = await cfg.build(a, ctx);
      const header = `> DRAFT. Not sent. Written by ${ctx.manifest ? ctx.manifest.name : prefix} on ${new Date().toISOString().slice(0, 10)} from your files. Check every figure before ${actor} uses it.\n\n`;
      const text = safeMarkdown(header + d.text);
      const dir = join(ctx.outDir(a.out_dir || outDir), 'drafts');
      const f = ctx.writeFile(dir, `${noun}-${safeFileName(d.id)}.md`, text);
      const markers = [...new Set((text.match(OPEN_MARKER) || []))];
      return { summary: `${noun.replace(/_/g, ' ')} ${d.id} drafted${d.amount !== undefined ? ` for ${d.amount}` : ''} with ${markers.length} open marker(s)${markers.length ? ` (${markers.join(', ')})` : ''}. Nothing was sent.`, id: d.id, to: d.to || null, amount: d.amount ?? null, draft: rel(ctx, f), draft_sha256: sha256(text), open_markers: markers.length, markers, file: f, ...(d.extra || {}) };
    },
  };
  const reqTool = {
    name: reqName, kind: 'action', category, title: `Approve the ${noun.replace(/_/g, ' ')} (one click)`,
    description: cfg.requestDescription || `After one named human click (even in Auto), record that the reviewed ${noun.replace(/_/g, ' ')} draft is approved in ${noun}-requests.csv. Tied to draft_sha256; refuses while open markers remain unless accept_open_issues is true with a note. ${actor[0].toUpperCase() + actor.slice(1)} acts on it; the agent never does.`,
    inputSchema: { type: 'object', additionalProperties: false, required: ['draft', 'draft_sha256'], properties: { draft: { type: 'string', description: 'Draft path returned by the draft tool' }, draft_sha256: { type: 'string', description: 'sha256 returned by the draft tool' }, to: { type: 'string', description: 'Who it goes to; must match the draft when the draft names someone' }, accept_open_issues: { type: 'boolean' }, note: str, out_dir: str } },
    handler: async (a, ctx) => {
      const f = safePath(ctx.root, a.draft);
      const text = readFileSync(f, 'utf8');
      if (sha256(text) !== a.draft_sha256) throw new Error('draft_sha256 does not match the draft on disk; review the current draft and pass its new sha256');
      const open = [...new Set(text.match(OPEN_MARKER) || [])];
      if (open.length && !(a.accept_open_issues === true && String(a.note || '').trim())) throw new Error(`the draft still has open markers (${open.join(', ')}); fix them, or pass accept_open_issues: true with a note saying why`);
      const toLine = (/^\*\*To:\*\*\s*(.+)$/m.exec(text) || [])[1];
      if (a.to && toLine && !/^\[TO CONFIRM/.test(toLine) && toLine.trim() !== String(a.to).trim()) throw new Error(`to ("${a.to}") differs from the draft's To line ("${toLine.trim()}")`);
      const id = (new RegExp(`${noun}-(.+)\\.md$`).exec(f.split(/[\\/]/).pop()) || [])[1] || '';
      const file = appendRow(ctx.outDir(a.out_dir || outDir), `${noun}-requests.csv`, { approved_at: new Date().toISOString(), id, to: a.to || toLine || '', draft: rel(ctx, f), draft_sha256: a.draft_sha256, open_markers: open.length, note: a.note || '', status: `approved - ${actor} acts on it` }, ['approved_at', 'id', 'to', 'draft', 'draft_sha256', 'open_markers', 'note', 'status']);
      return { summary: `${noun.replace(/_/g, ' ')} ${id} approved and recorded. Nothing was sent, paid or changed by the agent.`, file: rel(ctx, file) };
    },
  };
  return { tools: [draftTool, reqTool], rules: [{ tool: draftName, decision: 'ask', reason: 'A draft is written only after a person says yes (or Auto is opted in).' }, { tool: reqName, decision: 'ask', reason: `${category}: one named human click, even in Auto.` }] };
}

/** Standard one-line limit sentences used in reports. */
export const LIMITS = Object.freeze({
  files: 'Reads only the files you export and give it. It does not log in to a firewall, switch, controller, cloud console, identity provider or any other live system.',
  live: 'It changes nothing on a live device, firewall, DNS zone, directory or cloud account. Every change it suggests is a draft that one named person applies.',
  defaults: 'Thresholds are working defaults in a settings file you control; they are not a vendor rule, a requirement of any standard or a security guarantee.',
  advice: 'Not legal, compliance or security-certification advice. A person decides what to change, renew, cancel or report.',
  pii: 'Results returned to the AI model have the names of people, sign-in names, e-mail addresses, phone numbers and client addresses masked. The files written here keep the real values: keep them in a secure folder.',
  estimate: 'Totals are arithmetic on the numbers in your files, not forecasts or quotes.',
});
