// Write text in a legacy encoding (for tests and the international check only).
// Node can decode Shift_JIS, GBK, EUC-KR and Big5 but has no encoder, so the
// reverse table is built once by decoding every two-byte sequence.
const tables = new Map();
const RANGES = {
  shift_jis: [[0x81, 0x9f], [0xe0, 0xfc], [0x40, 0xfc]],
  gbk: [[0x81, 0xfe], null, [0x40, 0xfe]],
  'euc-kr': [[0x81, 0xfe], null, [0x41, 0xfe]],
  big5: [[0x81, 0xfe], null, [0x40, 0xfe]],
};
function table(enc) {
  if (tables.has(enc)) return tables.get(enc);
  const [a, b, trail] = RANGES[enc]; const dec = new TextDecoder(enc); const m = new Map();
  const leads = []; for (const r of [a, b]) if (r) for (let i = r[0]; i <= r[1]; i++) leads.push(i);
  for (const l of leads) for (let t = trail[0]; t <= trail[1]; t++) {
    const ch = dec.decode(Uint8Array.from([l, t]));
    if (ch.length === 1 && ch !== '�' && !m.has(ch)) m.set(ch, [l, t]);
  }
  // Single-byte half-width katakana in Shift_JIS.
  if (enc === 'shift_jis') for (let i = 0xa1; i <= 0xdf; i++) { const ch = dec.decode(Uint8Array.from([i])); if (!m.has(ch)) m.set(ch, [i]); }
  tables.set(enc, m); return m;
}
/** Encode a string. enc: 'utf-8', 'utf-8-bom', 'windows-1252', 'shift_jis', 'gbk', 'euc-kr', 'big5'. */
export function encodeText(text, enc) {
  if (enc === 'utf-8') return Buffer.from(text, 'utf8');
  if (enc === 'utf-8-bom') return Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from(text, 'utf8')]);
  if (enc === 'windows-1252') {
    if (!tables.has(enc)) { const d = new TextDecoder('windows-1252'); const m = new Map(); for (let i = 0x80; i <= 0xff; i++) m.set(d.decode(Uint8Array.from([i])), i); tables.set(enc, m); }
    const m = tables.get(enc); const out = [];
    for (const ch of text) { const c = ch.codePointAt(0); if (c < 0x80) out.push(c); else { const b = m.get(ch); if (b === undefined) throw new Error(`"${ch}" has no windows-1252 byte`); out.push(b); } }
    return Buffer.from(out);
  }
  const m = table(enc); const out = [];
  for (const ch of text) { const c = ch.codePointAt(0); if (c < 0x80) out.push(c); else { const b = m.get(ch); if (!b) throw new Error(`"${ch}" has no ${enc} bytes`); out.push(...b); } }
  return Buffer.from(out);
}
