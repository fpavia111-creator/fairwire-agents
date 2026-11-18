// Uptime and incidents: targets by severity, reviews, repeats, changes, availability and error budgets.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reviewIncidents, sevOf } from '../src/index.js';

const at = (min) => new Date(Date.UTC(2026, 9, 10, 8, 0) + min * 60000).toISOString().slice(0, 19).replace('T', ' ');
const i = (id, over = {}) => ({ incident_id: id, service: 'Portal', severity: 'SEV3', started_at: at(0), acknowledged_at: at(10), resolved_at: at(120), postmortem: 'https://wiki.example/x', change_id: '', ...over });
const codes = (inc, up = [], s = {}) => reviewIncidents(inc, up, s).items.map((x) => `${x.key}:${x.code}`).sort();

test('severities are read from numbers and words', () => {
  assert.deepEqual(['SEV1', 'P2', 'Critical', 'High', 'Minor', ''].map(sevOf), ['SEV1', 'SEV2', 'SEV1', 'SEV2', 'SEV4', 'SEV3']);
});

test('acknowledge and resolve targets depend on severity', () => {
  assert.deepEqual(codes([i('a', { severity: 'SEV1', acknowledged_at: at(20), resolved_at: at(200) })]), ['a:slow_acknowledge']);
  assert.deepEqual(codes([i('a', { severity: 'SEV1', acknowledged_at: at(10), resolved_at: at(300) })]), ['a:slow_resolve']);
  assert.deepEqual(codes([i('a', { severity: 'SEV1', acknowledged_at: at(20), resolved_at: at(200) })], [], { ack_minutes: { SEV1: 30 } }), []);
});

test('major incidents need a review once resolved; open ones do not yet', () => {
  assert.deepEqual(codes([i('a', { severity: 'SEV2', postmortem: '' })]), ['a:missing_postmortem']);
  assert.deepEqual(codes([i('a', { severity: 'SEV2', postmortem: 'N/A' })]), ['a:missing_postmortem']);
  assert.deepEqual(codes([i('a', { severity: 'SEV2', postmortem: '', resolved_at: '' })]), []);
  assert.deepEqual(codes([i('a', { postmortem: '' })]), [], 'SEV3 needs none by default');
});

test('repeat failures per service, with service names compared without case', () => {
  assert.ok(codes([i('a'), i('b', { service: 'portal' }), i('c')]).includes('Portal:repeat_failures'));
  assert.ok(!codes([i('a'), i('b')]).includes('Portal:repeat_failures'));
});

test('incidents linked to a change are counted per service', () => {
  const o = reviewIncidents([i('a', { change_id: 'CHG-1' }), i('b', { change_id: 'CHG-1' })], [], {});
  assert.match(o.items.find((x) => x.code === 'change_caused').message, /2 incident\(s\) on Portal followed a change \(CHG-1\)/);
});

test('availability below target is high; most of the error budget used is low', () => {
  assert.deepEqual(codes([], [{ service: 'A', availability_pct: '99.5', target_pct: '99.9' }]), ['uptime:A:below_slo']);
  assert.deepEqual(codes([], [{ service: 'A', availability_pct: '99.91', target_pct: '99.9' }]), ['uptime:A:error_budget_nearly_spent']);
  assert.deepEqual(codes([], [{ service: 'A', availability_pct: '99.99' }]), [], 'default target 99.9');
});

test('mean time to resolve uses resolved incidents only', () => {
  const o = reviewIncidents([i('a', { resolved_at: at(60) }), i('b', { resolved_at: at(180) }), i('c', { resolved_at: '' })], [], {});
  assert.equal(o.mttr_hours, 2); assert.equal(o.incidents, 3);
});
