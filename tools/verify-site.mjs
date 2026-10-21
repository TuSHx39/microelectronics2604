// Offline content/resource acceptance checks. Run with Node.js, no packages needed.
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import vm from 'node:vm';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const context = { window: {} };
vm.runInNewContext(readFileSync(resolve(root, 'js/activities.js'), 'utf8'), context);
const activities = context.window.ACTIVITIES;
assert.equal(activities.length, 23);
assert.equal(new Set(activities.map(a => a.sourceId)).size, 23);
assert.equal(new Set(activities.map(a => a.boardId)).size, 23);
const bySource = new Map(activities.map(a => [a.sourceId, a]));
assert.equal(bySource.get('14').boardId, '15', 'Competition mapping must remain intact');
assert.equal(bySource.get('15').boardId, '16', 'AI mapping must remain intact');
assert.match(bySource.get('06').source.dateRaw, /2026月/);
assert.equal(bySource.get('16').date, '2026年9月12日');
assert.match(bySource.get('21').date, /待定/);
assert.match(bySource.get('21').summary, /130公里.*目标/);
assert.equal(activities.reduce((n, a) => n + a.photos.length, 0), 59);
for (const activity of activities) {
  for (const section of ['purpose', 'preparation', 'implementation', 'followUp']) {
    assert.ok(activity.details[section].length, `${activity.boardId}: missing ${section}`);
  }
  assert.equal(activity.details.results.length, 0, 'Unverified outcomes must not become results');
  assert.ok(activity.photos[activity.coverIndex], `${activity.boardId}: invalid cover`);
  assert.ok(!/持续迁建|精神之钙学习强国/.test(JSON.stringify(activity.details)));
  for (const key of ['aim', 'why', 'actions', 'takeaway']) assert.ok(activity.story[key], `${activity.boardId}: missing story ${key}`);
  assert.equal(activity.summary, activity.story.aim);
  for (const photo of activity.photos) {
    assert.ok(existsSync(resolve(root, photo.src)), `Missing photo: ${photo.src}`);
    assert.ok(photo.alt, `Missing accessible image description: ${photo.src}`);
    if (!/\/1-1\.[^.]+$/.test(photo.src)) assert.ok(!photo.alt.includes('院旗'), 'Only the Yan’an station photo has the academy flag');
    assert.equal(photo.caption, '', 'Caption approvals live in the separate editorial manifest');
    assert.ok(photo.width > 0 && photo.height > 0 && Math.max(photo.width, photo.height) <= 1920);
  }
}
const html = readFileSync(resolve(root, 'index.html'), 'utf8');
const css = readFileSync(resolve(root, 'css/style.css'), 'utf8');
for (const path of [...html.matchAll(/(?:src|href)="((?:assets|js|css)\/[^"#]+)"/g)].map(m => m[1])) {
  assert.ok(existsSync(resolve(root, path)), `Missing HTML resource: ${path}`);
}
for (const [, path] of css.matchAll(/url\("([^\"]+)"\)/g)) {
  assert.ok(existsSync(resolve(root, 'css', path)), `Missing CSS resource: ${path}`);
}
const editorial = JSON.parse(readFileSync(resolve(root, 'content/photo-editorial.json'), 'utf8'));
vm.runInNewContext(readFileSync(resolve(root, 'js/photo-editorial.js'), 'utf8'), context);
assert.equal(JSON.stringify(context.window.PHOTO_EDITORIAL), JSON.stringify(editorial), 'Browser captions must match canonical approvals');
assert.equal(Object.keys(editorial.photos).length, 59);
for (const photo of Object.values(editorial.photos)) {
  assert.ok(existsSync(resolve(root, photo.src)));
  assert.ok(['pending', 'confirmed'].includes(photo.status));
  if (photo.id !== '1-1') assert.ok(!`${photo.caption}${photo.proposedCaption}`.includes('院旗'));
  if (photo.status === 'confirmed') {
    assert.ok(photo.caption.trim());
    if (photo.boardId === '02') assert.ok(editorial.schools.some(s => s.id === photo.schoolId));
  }
}
for (const school of editorial.schools) assert.ok(existsSync(resolve(root, school.logo)));
console.log('PASS: 23 activity stories, 59 accessible images, separate reviewed captions, four local school emblems, ID/date/goal boundaries, all local resources.');
