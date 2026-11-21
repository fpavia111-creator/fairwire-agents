import { P, inFamily, FAMILY, familyOf } from './family.js';
// Argument descriptions for MCP tool schemas.
//
// A model picks and fills tool arguments from inputSchema alone, so every
// argument needs a description. A pack can describe an argument inline in its
// schema, or in manifest.argDocs ({ "arg": "...", "tool_name.arg": "..." }).
// Arguments still without one get a description from the shared glossary below
// when their name follows a convention every pack uses (out_dir, as_of, a file
// path with its _sha256 twin, *_column, ...). Inline text always wins, then
// "tool.arg", then "arg", then the glossary. Shared schema objects are never
// mutated: documented properties are copies.

const words = (s) => s.replace(/_/g, ' ');

/** Glossary for names whose meaning is the same in every pack. Returns null when unsure. */
function glossary(arg, props, toolName) {
  const prefix = toolName.split('_')[0];
  const sha = /^(.+)_sha256$/.exec(arg);
  if (sha && props[sha[1]]) return `SHA-256 of the ${words(sha[1])} file's text, exactly as returned when it was written. The call is refused if the file changed since, so the approval covers exactly what was reviewed.`;
  if (props[`${arg}_sha256`]) return `Path under --root to the ${words(arg)} file written by the earlier step (the file you reviewed).`;
  const col = /^(.+)_column$/.exec(arg);
  if (col) return `Name of the column in the input file that holds the ${words(col[1])}.`;
  switch (arg) {
    case 'out_dir': return P().argDocs.out_dir || `Folder under --root for the files this writes (default ${P().outDir}/${prefix}).`;
    case 'as_of': return 'Date to measure ages, due dates and deadlines from, as YYYY-MM-DD.';
    case 'reason': return 'Why, in a sentence. Kept with the request and in the audit log, so a reviewer can see it.';
    case 'title': return 'Title printed at the top of the report.';
    case 'timeout_ms': return 'Network timeout per request, in milliseconds.';
    case 'accept_open_issues': return 'Set true, together with a note, to go ahead while open markers or issues remain. Default false (refused while any remain).';
    case 'note': return props.accept_open_issues ? 'Why it is fine to go ahead with open issues; required when accept_open_issues is true. Kept in the audit log.' : 'A short note kept with the record.';
    default: return null;
  }
}

/** Copy of a tool's inputSchema with every top-level argument described where possible. */
export function documentSchema(tool, argDocs = {}) {
  const s = tool.inputSchema;
  if (!s || !s.properties) return s;
  let changed = false;
  const props = {};
  for (const [k, p] of Object.entries(s.properties)) {
    if (p && typeof p === 'object' && !p.description) {
      const d = argDocs[`${tool.name}.${k}`] || argDocs[k] || glossary(k, s.properties, tool.name);
      if (d) { props[k] = { ...p, description: d }; changed = true; continue; }
    }
    props[k] = p;
  }
  return changed ? { ...s, properties: props } : s;
}

/** [{ tool, arg }] for every top-level argument that still has no description. */
export function undocumentedArgs(manifest) {
  const out = [];
  for (const t of manifest.tools || []) {
    for (const [k, p] of Object.entries((t.inputSchema && t.inputSchema.properties) || {})) if (!p || !p.description) out.push({ tool: t.name, arg: k });
  }
  return out;
}

/** argDocs keys that name no real argument (typos), as manifest errors. */
export function argDocsProblems(m) {
  if (m.argDocs === undefined) return [];
  if (!m.argDocs || typeof m.argDocs !== 'object' || Array.isArray(m.argDocs)) return ['argDocs must be an object of { "arg" | "tool.arg": "description" }'];
  const names = new Set((m.tools || []).flatMap((t) => Object.keys((t.inputSchema && t.inputSchema.properties) || {}).flatMap((a) => [a, `${t.name}.${a}`])));
  const errs = [];
  for (const [k, v] of Object.entries(m.argDocs)) {
    if (!names.has(k)) errs.push(`argDocs: "${k}" is not an argument of any tool`);
    if (typeof v !== 'string' || v.trim().length < 3) errs.push(`argDocs: "${k}" needs a description`);
  }
  return errs;
}
