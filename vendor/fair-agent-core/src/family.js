// One engine, several agent families. A family keeps its own names (state folder,
// environment variables, built-in tool names), its own reading rules where the
// families genuinely differ, and its own data (export layouts, column vocabulary).
//
// The family in force travels with the call through AsyncLocalStorage, so two
// families can run side by side in one process (as they do behind the gateway)
// without sharing a setting. Outside any family the neutral "fair" profile applies.
import { AsyncLocalStorage } from 'node:async_hooks';

const als = new AsyncLocalStorage();
export const FAMILY = Symbol.for('fair-agent-core.family');

/**
 * Reading rules that differ between families. Each is a choice an existing family
 * made and tested; none is switched for a family that did not have it.
 *   units           convert kg/km/cm columns to the unit the agent works in
 *   ownName         a column that is the agent's own field name in another letter case:
 *                   'keep' (not a rename), 'count' (counted as adapted), 'map' (listed as mapped),
 *                   'rekey' (counted, and the rows are re-keyed from the file's spelling)
 *   aliasSkipsTaken an "also called" name is not used for a column another field already took
 *   percentWord     '%' in a column heading reads as the word "pct"
 *   emptyMarks      "?", NULL and #N/A read as empty (N/A, none and dashes too in dates and numbers)
 *   decimals        how a number column with no telling value picks its decimal mark:
 *                   'column' (each column alone), 'file' (the rest of the file, then the
 *                   separator), 'hint' (other amounts, dotted dates, or header language)
 *   groupedEvidence 1.234.567 counts as proof of thousands grouping
 *   monthHeaders    a header row may be one known heading plus a column per month
 *   localValues     a file in the agent's own column names still counts as adapted when its dates or
 *                   amounts are written the local way (12.11.2026, 1.234,50)
 *   legalTails      'extended' also drops A/S, AB, B.V., N.V., K.K., Pte. at the end of a name
 */
const DIALECT = Object.freeze({ units: false, ownName: 'keep', decimals: 'file', groupedEvidence: false, monthHeaders: false, legalTails: 'basic', localValues: false, aliasSkipsTaken: false, emptyMarks: false, percentWord: false });

const HIDDEN = /secret|token|password|key|tin|ssn|card|iban|account|email|phone|dob|birth/i;
const MASKING = ['name', 'prop', 'method', 'options', 'optionLabel', 'env', 'keyOptions', 'keyForm', 'modes', 'Masker', 'loadKey', 'auditField', 'off', 'done', 'ctx', 'rawRecords', 'deep', 'maskSummary', 'reason', 'onReadJson', 'cliFlags', 'cliEnv', 'cliHelp'];

/**
 * Personal-data masking a family brings (its own masker class and vocabulary):
 *   name        what tools see it as (ctx.phi, ctx.pii) and the source-field attribute that names a kind
 *   prop/method the runtime's own names: <prop>Mode, <prop>Key, <method>()
 *   options     runtime options that set the mode; env: the <FAMILY>_<env> variable that does (or null)
 *   keyOptions  runtime options that give the pseudonym key; keyForm 'hex' (hex or Buffer) or 'buffer'
 *   modes, Masker, loadKey   the family's masker
 *   auditField  the audit-line field written when the mode is not "mask" (or null)
 *   off(out, masker), done(masked, report)   the result as returned with masking off / on
 *   ctx         'always': a tool context always has a masker; 'given': only inside a call
 *   deep        approval previews, results and errors are masked before they are logged
 *   maskSummary the audit summary is masked; reason: 'mask', 'clip' (clip then mask) or 'none'
 */
function defineMasking(id, m) {
  if (!m) return null;
  for (const k of Object.keys(m)) if (!MASKING.includes(k)) throw new Error(`family ${id}: unknown masking setting "${k}"`);
  for (const k of ['name', 'prop', 'method', 'options', 'keyOptions', 'modes', 'Masker', 'loadKey', 'off', 'done']) if (m[k] == null) throw new Error(`family ${id}: masking.${k} is required`);
  return Object.freeze({ optionLabel: m.options[0], env: null, keyForm: 'hex', auditField: null, ctx: 'always', rawRecords: false, deep: false, maskSummary: false, reason: 'mask', onReadJson: null, cliFlags: m.options, cliEnv: m.env || null, cliHelp: null, ...m });
}

export function defineFamily(spec) {
  const id = String(spec.id || ''); if (!/^[a-z][a-z0-9]{1,20}$/.test(id)) throw new Error('family id must be a short lowercase word');
  const brand = spec.brand || id[0].toUpperCase() + id.slice(1); const upper = id.toUpperCase();
  const corePkg = spec.corePkg || `${id}-core`;
  for (const k of Object.keys(spec.dialect || {})) if (!(k in DIALECT)) throw new Error(`family ${id}: unknown reading rule "${k}"`);
  return Object.freeze({
    id, brand, upper, corePkg,
    stateDir: `.${id}`, outDir: `${id}-out`, sourcesFile: `${id}-sources.json`, licensePrefix: `${upper}1`,
    infoTool: `${id}_info`, inspectTool: `${id}_inspect_input`, signatureHeader: `x-${id}-signature`,
    approveBin: spec.approveBin || `${id}-approve`,
    icsProdId: spec.icsProdId || `-//${brand}//${corePkg}//EN`,
    env: (name) => `${upper}_${name}`,
    dialect: Object.freeze({ ...DIALECT, ...(spec.dialect || {}) }),
    masking: defineMasking(id, spec.masking),
    previewHidden: spec.previewHidden || HIDDEN,
    // Longest path and longest single folder or file name a tool may be given (nameChars null: no per-name limit).
    limits: Object.freeze({ pathChars: 1024, nameChars: 255, ...(spec.limits || {}) }),
    // What an agent's short tool prefix may look like.
    prefixPattern: spec.prefixPattern || /^[a-z][a-z0-9]{1,20}$/,
    // Wording of argument descriptions the family words its own way ({ out_dir: '...' }).
    argDocs: Object.freeze({ ...(spec.argDocs || {}) }),
    exports: Object.freeze({ ...(spec.exports || {}) }),
    exportsNote: spec.exportsNote || 'Where a layout says "checked", its column names were compared with the vendor\'s documentation on that date. The other layouts were written from knowledge of the export and were not checked. None was tested against a live account.',
    columnWords: spec.columnWords || {}, fieldConcepts: Object.freeze({ ...(spec.fieldConcepts || {}) }),
    memoryExample: spec.memoryExample || null, prefixHint: spec.prefixHint || ', e.g. "ladon"',
  });
}

/** The neutral profile: used when the engine is called outside any family. */
export const FAIR = defineFamily({ id: 'fair', brand: 'Fair', corePkg: 'fair-agent-core' });

/** The family in force for the running call. */
export const P = () => als.getStore() || FAIR;
/** Run fn with a family in force (no cost when it already is). */
export const inFamily = (family, fn, ...args) => (als.getStore() === family ? fn(...args) : als.run(family, fn, ...args));
export const familyOf = (manifest) => (manifest && manifest[FAMILY]) || null;

const isClass = (v) => typeof v === 'function' && /^class[\s{]/.test(Function.prototype.toString.call(v));

// A class whose constructor runs with the family in force (so what it reads at
// construction, such as the state key, is the family's). Same prototype: instanceof holds both ways.
function boundClass(C, family) {
  function Bound(...a) { return inFamily(family, () => Reflect.construct(C, a, new.target || Bound)); }
  Bound.prototype = C.prototype; Object.setPrototypeOf(Bound, C);
  return Object.defineProperty(Bound, 'name', { value: C.name });
}

/**
 * The engine's API with one family in force: every function runs under that family,
 * and the constants that carry family data (EXPORTS, SOURCES_FILE, ...) are the family's.
 * `api` is the engine namespace (all exports); `consts` replaces named constants.
 */
export function bindApi(api, family, consts = {}) {
  const out = {};
  for (const [k, v] of Object.entries(api)) {
    if (k in consts) out[k] = consts[k];
    else if (typeof v === 'function' && !isClass(v)) out[k] = Object.defineProperty((...a) => inFamily(family, v, ...a), 'name', { value: v.name });
    else if (isClass(v) && v.familyBound) out[k] = v.familyBound(family);
    else if (isClass(v)) out[k] = boundClass(v, family);
    else out[k] = v;
  }
  return Object.freeze(out);
}
