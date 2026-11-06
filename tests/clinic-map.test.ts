import { test } from 'node:test';
import assert from 'node:assert/strict';
import { baseline } from '../shared/baseline';
import { initialSelection } from '../shared/demo';
import { clinicMapData } from '../shared/clinic-map';
import coordinates from '../data/clinic-coordinates.json';

test('map uses saved address matches only for included, verified clinics', () => {
  const clinics = clinicMapData(baseline, initialSelection);
  assert.equal(clinics.length, 17);
  assert.equal(clinics.filter(c => c.coordinate).length, 10);
  assert.ok(clinics.find(c => c.id === 'kidworks-austin-1')?.reason?.includes('address'));
  assert.equal(clinics.find(c => c.id === 'capital-austin-1')?.coordinate, null);
  assert.ok(!clinics.some(c => c.id === 'tesoros-austin-1'));
  assert.ok(!clinicMapData(baseline, {...initialSelection, 'achieve@austin': 'excluded'}).some(c => c.id === 'achieve-austin-1'));
});
test('changed addresses and unverified physical presence invalidate cached pin placement', () => {
  const data = structuredClone(baseline);
  const location = data.locations.find(l => l.id === 'achieve-austin-1')!;
  location.address = 'Changed address';
  assert.equal(clinicMapData(data, initialSelection).find(c => c.id === location.id)?.coordinate, null);
  location.address = baseline.locations.find(l => l.id === location.id)!.address;
  data.evidence.filter(e => e.scopeId === location.id).forEach(e => { e.verification = 'unverified'; });
  assert.equal(clinicMapData(data, initialSelection).find(c => c.id === location.id)?.coordinate, null);
});
test('saved map coordinates remain bound to known addresses and the two Texas metros', () => {
  assert.equal(new Set(coordinates.locations.map(p => p.locationId)).size, coordinates.locations.length);
  for (const p of coordinates.locations) {
    assert.equal(baseline.locations.find(l => l.id === p.locationId)?.address, p.inputAddress);
    assert.ok(Number.isFinite(p.lat) && Number.isFinite(p.lon));
    assert.ok(p.lat > 29 && p.lat < 31 && p.lon > -99 && p.lon < -97);
    assert.match(p.sourceUrl, /^https:\/\/www.openstreetmap.org\/(node|way|relation)\/\d+$/);
  }
});
