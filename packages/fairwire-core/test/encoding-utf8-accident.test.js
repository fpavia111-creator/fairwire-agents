// A short legacy header that is valid UTF-8 by accident (added 18 Nov 2026).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decodeText } from '../src/encoding.js';

test('a GBK header that happens to be valid UTF-8 is read as GBK (状态 is the bytes D7 B4 CC AC)', () => {
  const buf = Buffer.concat([Buffer.from([0xd7, 0xb4, 0xcc, 0xac]), Buffer.from(',Name,Amount\nPending,Ann,1\n')]);
  const r = decodeText(buf);
  assert.equal(r.encoding, 'gb18030'); assert.match(r.text, /^状态,Name/);
});

test('real UTF-8 with accented, Chinese, Japanese or Korean headers stays UTF-8', () => {
  for (const s of ['Fälligkeit,Betrag\n1,2\n', '状态,金额\n1,2\n', 'ステータス,金額\n1,2\n', '상태,금액\n1,2\n', 'Statut,Montant dû\n1,2\n']) assert.equal(decodeText(Buffer.from(s, 'utf8')).encoding, 'utf-8', s);
});
