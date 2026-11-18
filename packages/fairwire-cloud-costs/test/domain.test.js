// Cloud bills: regions, month-on-month jumps, tags, always-on dev, egress, marketplace, commitments.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reviewCloud } from '../src/index.js';

const l = (month, over = {}) => ({ date: `${month}-01`, account: 'acc', service: 'EC2', region: 'us-east-1', resource_id: 'r1', cost: '100', owner: 'team', environment: 'prod', usage_type: 'BoxUsage', usage_hours: '', charge_type: 'Usage', ...over });
const codes = (rows, c = [], s = {}, asOf = '2026-11-18') => reviewCloud(rows, c, s, asOf).items.map((i) => `${i.key}:${i.code}`).sort();

test('only the latest month is judged, against the month before it', () => {
  const o = reviewCloud([l('2026-08', { cost: '9999' }), l('2026-09'), l('2026-10', { cost: '120' })], [], {}, '2026-11-18');
  assert.equal(o.month, '2026-10'); assert.equal(o.total, 120); assert.equal(o.previous_total, 100);
});

test('a jump needs both the percentage and the minimum amount; a new service counts from zero', () => {
  assert.ok(codes([l('2026-09'), l('2026-10', { cost: '250' })]).includes('acc|EC2:month_jump'));
  assert.ok(!codes([l('2026-09'), l('2026-10', { cost: '180' })]).includes('acc|EC2:month_jump'), '+80 is under the minimum of 100');
  assert.ok(!codes([l('2026-09', { cost: '1000' }), l('2026-10', { cost: '1400' })]).includes('acc|EC2:month_jump'), '+40% is under 50%');
  assert.ok(codes([l('2026-09'), l('2026-10', { service: 'Bedrock', cost: '300' })]).includes('acc|Bedrock:month_jump'));
});

test('regions outside the list are high; global lines are ignored', () => {
  const rows = [l('2026-10', { region: 'ap-south-1' }), l('2026-10', { region: 'global', service: 'Route53' })];
  assert.deepEqual(codes(rows, [], { allowed_regions: ['us-east-1'] }).filter((c) => c.endsWith('region_not_allowed')), ['acc|ap-south-1:region_not_allowed']);
  assert.deepEqual(codes(rows).filter((c) => c.endsWith('region_not_allowed')), []);
});

test('untagged spend is a share of the month, credits left out', () => {
  const rows = [l('2026-10', { cost: '80' }), l('2026-10', { owner: '', cost: '20' }), l('2026-10', { charge_type: 'Credit', cost: '-500', owner: '' })];
  const o = reviewCloud(rows, [], {}, '2026-11-18');
  assert.equal(o.total, 100); assert.equal(o.untagged_pct, 20); assert.equal(o.credits, -500);
  assert.ok(o.items.some((i) => i.code === 'untagged_spend'));
  assert.ok(!reviewCloud(rows, [], { untagged_pct: 25 }, '2026-11-18').items.some((i) => i.code === 'untagged_spend'));
});

test('dev resources running the whole month are flagged; prod and part-time dev are not', () => {
  assert.ok(codes([l('2026-10', { environment: 'Dev', usage_hours: '744' })]).includes('r1:dev_always_on'));
  assert.ok(!codes([l('2026-10', { environment: 'dev', usage_hours: '300' })]).includes('r1:dev_always_on'));
  assert.ok(!codes([l('2026-10', { environment: 'prod', usage_hours: '744' })]).includes('r1:dev_always_on'));
  assert.ok(codes([l('2026-11', { environment: 'sandbox', usage_hours: '700' })]).includes('r1:dev_always_on'), '700 of 720 hours in November');
});

test('egress share and marketplace lines are found by their usage words', () => {
  const rows = [l('2026-10', { cost: '800' }), l('2026-10', { service: 'Bandwidth', usage_type: 'Internet Data Transfer Out', cost: '200' }), l('2026-10', { service: 'AWS Marketplace', resource_id: 'vendor-x', cost: '50' })];
  const c = codes(rows); assert.ok(c.includes('acc:egress_share')); assert.ok(c.includes('acc|vendor-x:marketplace_charge'));
});

test('commitments ending inside the notice window are flagged; already ended or far off are not', () => {
  const com = [{ commitment: 'A', end_date: '2026-12-01' }, { commitment: 'B', end_date: '2026-11-01' }, { commitment: 'C', end_date: '2027-05-01' }];
  assert.deepEqual(codes([l('2026-10')], com).filter((x) => x.endsWith('commitment_expiring')), ['A:commitment_expiring']);
});
