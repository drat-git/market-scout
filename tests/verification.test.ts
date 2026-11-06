import { test } from 'node:test';
import assert from 'node:assert/strict';
import { baseline } from '../shared/baseline';
import { DEFAULT_CRITERIA } from '../shared/schema';
import { screeningDetails, screen } from '../shared/screen';

test('branch checklist explains company-wide services without verifying branch availability', () => {
  const report = screeningDetails(baseline, 'tesoros@austin', DEFAULT_CRITERIA);
  assert.equal(report.result, 'uncertain');
  assert.equal(report.groups.length, 2);
  for (const group of report.groups) {
    assert.equal(group.checks.find(c => c.id === 'pediatric')!.state, 'yes');
    assert.equal(group.checks.find(c => c.id === 'geography')!.state, 'yes');
    const core = group.checks.find(c => c.id === 'core')!;
    assert.equal(core.state, 'unknown');
    assert.match(core.detail, /Listed for the company/);
    assert.ok(core.nextStep);
    assert.ok(core.evidenceIds.every(id => baseline.evidence.some(e => e.id === id)));
  }
});
test('extra required service yields a specific gap and next step', () => {
  const criteria = { ...DEFAULT_CRITERIA, requiredServices: ['occupational', 'sensory'] as ('occupational'|'sensory')[] };
  const report = screeningDetails(baseline, 'achieve@austin', criteria);
  const checks = report.groups[0].checks;
  assert.equal(checks.find(c => c.id === 'required:occupational')!.state, 'yes');
  const sensory = checks.find(c => c.id === 'required:sensory')!;
  assert.equal(sensory.state, 'unknown');
  assert.match(sensory.nextStep!, /sensory integration/);
  assert.match(report.summary, /Sensory integration not confirmed/);
  assert.equal(screen(baseline, ['achieve@austin'], criteria)[0].reasons[0], report.summary);
});
test('checklist explains service coverage without presenting it as a physical clinic', () => {
  const physical = screeningDetails(baseline, 'teamcare@san-antonio', DEFAULT_CRITERIA);
  assert.match(physical.summary, /No clinic is documented/);
  assert.equal(physical.groups[0].checks.find(c => c.id === 'geography')!.state, 'unknown');
  const coverage = screeningDetails(baseline, 'teamcare@san-antonio', { ...DEFAULT_CRITERIA, geography: 'coverage' });
  assert.equal(coverage.result, 'match');
  assert.equal(coverage.scopeName, 'service area');
});
test('conflicting and unverified claims explain distinct verification failures', () => {
  const data = structuredClone(baseline);
  const e = data.evidence.find(e => e.scopeId === 'achieve-austin-1')!;
  e.verification = 'unverified';
  let report = screeningDetails(data, 'achieve@austin', DEFAULT_CRITERIA);
  assert.match(report.groups[0].checks.find(c => c.id === 'geography')!.detail, /not been verified/);
  e.verification = 'source-checked';
  data.evidence.push({ ...e, id: 'synthetic-conflict', facts: ['physical-presence'], supports: false });
  report = screeningDetails(data, 'achieve@austin', DEFAULT_CRITERIA);
  assert.equal(report.result, 'uncertain');
  assert.match(report.groups[0].checks.find(c => c.id === 'geography')!.detail, /sources conflict/);
});
