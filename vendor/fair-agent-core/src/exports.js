// Export layouts: files from real systems that agents recognise. Each family brings
// its own catalogue (see its data/exports.js); the code that uses one is here.
//
// basis:
//   'documented'  the column names were checked against the vendor's own
//                 documentation (source and date given);
//   'recalled'    the layout was written from knowledge of the export and was
//                 not checked against documentation or a live account.
// Neither kind was tested against a live account.
import { P } from './family.js';

/** One catalogue entry. */
export const exportEntry = (id, system, label, signature, extra = {}) => Object.freeze({ id, system, label, signature, basis: 'recalled', ...extra });
/** A catalogue from a list of entries. */
export const exportCatalogue = (entries) => Object.freeze(Object.fromEntries(entries.map((x) => [x.id, x])));

/** The neutral catalogue is empty; each family's binding carries its own as EXPORTS. */
export const EXPORTS = Object.freeze({});

/** A profile for an agent: a catalogue entry plus the agent's column map. */
export function exportProfile(key, map, extra = {}) {
  const base = P().exports[key];
  if (!base) throw new Error(`unknown export "${key}"`);
  return { ...base, map, ...extra };
}

export const EXPORTS_BASIS_NOTE = P().exportsNote;

/**
 * Row hook for grouped reports (QuickBooks style): a row with only its first
 * cell filled names the group for the rows under it; "Total for ..." rows end it.
 * The group name is written to `field` on each detail row.
 */
export function carryGroup(field, { groupColumn = '', isDetail } = {}) {
  return (rows) => {
    const out = []; let group = '';
    for (const r of rows) {
      const label = String(r[groupColumn] ?? '').trim();
      const detail = isDetail ? isDetail(r) : Object.entries(r).some(([k, v]) => k !== groupColumn && k !== field && String(v ?? '').trim() !== '');
      if (label && /^(grand\s+)?total\b/i.test(label)) continue;
      if (label && !detail) { group = label; continue; }
      if (!detail) continue;
      const { [groupColumn]: _drop, ...rest } = r;
      out.push({ ...rest, [field]: String(r[field] ?? '').trim() || label || group });
    }
    return out;
  };
}

/** Row hook: keep the first row for each value of `field` (Shopify repeats an order once per line item). */
export function firstRowPer(field) {
  return (rows) => { const seen = new Set(); return rows.filter((r) => { const k = String(r[field] ?? ''); if (!k || seen.has(k)) return false; seen.add(k); return true; }); };
}

/** "First Last" from two columns, for exports that split the name. */
export const fullName = (first, last) => ({ from: [first, last], compute: (_r, get) => [get(first), get(last)].map((v) => String(v ?? '').trim()).filter(Boolean).join(' ') });
