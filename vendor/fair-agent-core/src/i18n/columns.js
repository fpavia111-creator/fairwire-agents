// Column names that exports in German, French, Spanish, Portuguese, Italian,
// Japanese, Chinese and Korean use for the fields agents read, keyed by the
// agent's own field name. adaptRecords tries these only after the agent's own
// name and its English aliases found nothing, and never for a column another
// field already took, so files that read correctly before read the same way.
//
// The words themselves are each family's data (its data/columns.js): a freight
// export and a medical billing export use different vocabularies. This file holds
// what is common: the languages, the index, and the lookups.
import { normHeader } from '../intl.js';
import { P } from '../family.js';

export const COLUMN_LANGUAGES = ['de', 'fr', 'es', 'pt', 'it', 'ja', 'zh', 'ko'];

/** One field's names by language: W([de], [fr], [es], [pt], [it], [ja], [zh], [ko]). */
export const W = (de, fr, es, pt, it, ja, zh, ko) => ({ de, fr, es, pt, it, ja, zh, ko });

/** The neutral vocabulary is empty; each family's binding carries its own. */
export const COLUMN_WORDS = Object.freeze({});
export const FIELD_CONCEPTS = Object.freeze({});

const built = new WeakMap();
/** Index of a family's vocabulary: { byField, known }. Built once per family. */
function vocabulary(family = P()) {
  let v = built.get(family);
  if (v) return v;
  const byField = new Map();
  for (const [field, langs] of Object.entries(family.columnWords)) {
    const list = []; const seen = new Map();
    for (const lang of COLUMN_LANGUAGES) for (const w of langs[lang] || []) {
      const k = normHeader(w);
      if (!k) continue;
      // A word shared by languages (摘要 in Japanese and Chinese) is listed once, with both.
      if (seen.has(k)) { const e = seen.get(k); if (!e.lang.split(', ').includes(lang)) e.lang += `, ${lang}`; continue; }
      const e = { lang, word: w }; seen.set(k, e); list.push(e);
    }
    byField.set(field, list);
  }
  const known = new Set([...byField.values()].flat().map((x) => normHeader(x.word)).concat(Object.keys(family.columnWords).map(normHeader)).filter((k) => k && k.length > 1));
  v = { byField, known }; built.set(family, v);
  return v;
}

/** Translated column names for one of an agent's fields: [{ lang, word }], [] when there are none. */
export function translatedNames(field) { return vocabulary().byField.get(field) || []; }

/** The translated names of a concept in one language, or every language (for agents that pick columns themselves). */
export function namesFor(concept, lang = null) {
  const c = P().columnWords[concept];
  if (!c) return [];
  return lang ? [...(c[lang] || [])] : COLUMN_LANGUAGES.flatMap((l) => c[l] || []);
}

/** Every known column name of the family in force, normalised: used to tell which text encoding a file was saved in. */
export function knownHeaderWords() { return vocabulary().known; }
export const KNOWN_HEADER_WORDS = Object.freeze(new Set());
