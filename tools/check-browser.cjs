// Development-only browser acceptance. Requires `npm install --prefix .qa playwright`
// from the parent workspace, and an installed Edge (PLAYWRIGHT_CHANNEL overrides).
const { chromium } = require('../../.qa/node_modules/playwright');
const assert = require('node:assert/strict');
const { resolve } = require('node:path');
const { pathToFileURL } = require('node:url');
const { mkdirSync, writeFileSync } = require('node:fs');

(async () => {
  const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || 'msedge', headless: true });
  const failures = [], results = [];
  const output = resolve(__dirname, '../docs/qa');
  mkdirSync(output, { recursive: true });
  const url = pathToFileURL(resolve(__dirname, '../index.html')).href;
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  page.setDefaultTimeout(7000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  async function check(name, run) {
    try { await run(); results.push({ name, status: 'PASS' }); console.log(`PASS: ${name}`); }
    catch (error) { failures.push(name); results.push({ name, status: 'FAIL', message: error.message }); console.log(`FAIL: ${name}: ${error.message}`); await page.keyboard.press('Escape'); }
  }
  await page.goto(url);
  await page.locator('.intro-enter').click();
  await page.locator('.intro').waitFor({ state: 'hidden' });
  await check('offline font loads', async () => {
    await page.evaluate(() => document.fonts.ready);
    assert.ok(await page.evaluate(() => document.fonts.check('16px "Ma Shan Zheng"')));
  });
  await check('23 activity stories focus on purpose, practice and reflection', async () => {
    assert.equal(await page.locator('.activity').count(), 23);
    for (const id of ['01','02','03','04','05','06','07','08','09','10','11','12','13','14','15','16','17','18','19','20','21','22','23']) {
      await page.locator('[data-open-index]').first().click();
      await page.locator(`[data-activity="${id}"]`).click();
      await page.locator('.chapter-curtain').waitFor({ state: 'hidden' });
      assert.ok(await page.locator(`#activity-${id}`).evaluate(el => el.open));
      assert.deepEqual(await page.locator(`#activity-${id} .detail-body h4`).allTextContents(), ['活动初衷', '实践回顾', '收获与思考']);
      const body = await page.locator(`#activity-${id} .activity-body`).innerText();
      assert.ok(!/前期准备|后期工作|物资筹备|活动准备|活动安排|后续活动/.test(body), 'Do not display the planning checklist');
    }
  });
  await check('one expanded activity per chapter', async () => {
    await page.locator('[data-chapter="roots"]').first().click();
    await page.locator('#activity-01 summary').click();
    await page.locator('#activity-03 summary').click();
    assert.equal(await page.locator('#roots .activity[open]').count(), 1);
  });
  await check('lightbox buttons, keys, wraparound, swipe, close focus', async () => {
    await page.locator('[data-random-photo]').first().click();
    await page.locator('.lightbox-close').click();
    await page.locator('.hero-photo-primary button').click();
    assert.equal(await page.locator('.lightbox-counter').textContent(), '1 / 3');
    await page.keyboard.press('ArrowLeft');
    assert.equal(await page.locator('.lightbox-counter').textContent(), '3 / 3');
    await page.locator('.lightbox-next').click();
    assert.equal(await page.locator('.lightbox-counter').textContent(), '1 / 3');
    await page.locator('.lightbox-image').dispatchEvent('touchstart', { touches: [{identifier:1,clientX:280,clientY:300}] });
    await page.locator('.lightbox-image').dispatchEvent('touchend', { changedTouches: [{identifier:1,clientX:50,clientY:303}] });
    assert.equal(await page.locator('.lightbox-counter').textContent(), '2 / 3');
    await page.keyboard.press('Escape');
    assert.ok(await page.locator('.hero-photo-primary button').evaluate(el => el === document.activeElement));
  });
  await check('home/guide navigation clears open chapter on browser back', async () => {
    await page.locator('.directory-card[data-chapter="roots"]').click();
    await page.locator('.chapter-curtain').waitFor({state:'hidden'});
    await page.locator('.chapter-nav [data-chapter="chips"]').click();
    await page.locator('.chapter-curtain').waitFor({state:'hidden'});
    await page.goBack();
    await page.waitForFunction(() => !document.querySelector('#roots').hidden);
    await page.locator('.top-nav a[href="#guide"]').click();
    await page.waitForTimeout(80);
    assert.ok(await page.locator('.chapter-reader').evaluate(el => el.hidden));
  });
  await check('malformed URL fragment is harmless', async () => {
    const previous = errors.length;
    await page.evaluate(() => { location.hash = '#%E0%A4%A'; });
    await page.waitForTimeout(80);
    assert.equal(errors.length, previous);
  });
  for (const width of [375, 390, 430, 768, 1440]) {
    await check(`layout ${width}px`, async () => {
      await page.setViewportSize({ width, height: 900 });
      await page.locator('[data-open-index]').first().click();
      await page.locator('[data-activity="01"]').click();
      await page.locator('.chapter-curtain').waitFor({state:'hidden'});
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Horizontal overflow');
      const fontSize = await page.locator('#activity-01 .detail-body p').first().evaluate(el => parseFloat(getComputedStyle(el).fontSize));
      assert.ok(fontSize >= 14, `Detail text too small: ${fontSize}px`);
      const coverRatio = await page.locator('#activity-01 .activity-cover img').evaluate(el => el.clientWidth / el.clientHeight);
      assert.ok(Math.abs(coverRatio - 4/3) < .02, 'Cover image aspect ratio');
      await page.screenshot({path: resolve(output, `chapter-${width}.png`), fullPage: false});
      if (width === 390 || width === 1440) await page.locator('#activity-01').screenshot({path:resolve(output,`story-${width}.png`)});
    });
  }
  await check('all 59 images decode offline', async () => {
    const bad = await page.evaluate(async () => {
      const photos = window.ACTIVITIES.flatMap(a => a.photos);
      const checks = await Promise.all(photos.map(async p => {
        const img = new Image(); img.src = p.src;
        try { await img.decode(); return null; } catch { return p.src; }
      }));
      return checks.filter(Boolean);
    });
    assert.deepEqual(bad, []);
  });
  await check('only confirmed annotations render and tall images remain complete', async () => {
    await page.setViewportSize({width:390,height:844});
    await page.locator('[data-open-index]').first().click();
    await page.locator('[data-activity="14"]').click();
    await page.locator('.chapter-curtain').waitFor({state:'hidden'});
    await page.locator('#activity-14 .photo-strip').scrollIntoViewIfNeeded();
    const expectedCaptions = await page.evaluate(() => window.ACTIVITIES.map(a => ({boardId:a.boardId,captions:(a.boardId === '02' ? a.photos : a.photos.slice(0,3)).map(p => window.PHOTO_EDITORIAL.photos[p.src.split('/').pop().replace(/\.[^.]+$/, '')]).filter(p => p?.status === 'confirmed' && p.caption).map(p => p.caption)})));
    for (const activity of expectedCaptions) assert.deepEqual(await page.locator(`#activity-${activity.boardId} .activity-photo figcaption`).allTextContents(), activity.captions);
    assert.equal(await page.locator('#activity-14 .photo-strip img').first().evaluate(el=>getComputedStyle(el).objectFit),'contain');
    await page.screenshot({path:resolve(output,'photos-390.png')});
    await page.locator('#activity-14 [data-photo="0"]').first().click();
    await page.locator('.lightbox-image').evaluate(el=>el.decode());
    assert.equal(await page.locator('.lightbox-message').textContent(),'');
    const bounds=await page.locator('.lightbox-image').boundingBox();
    assert.ok(bounds.height>100 && bounds.height<844);
    await page.screenshot({path:resolve(output,'lightbox-390.png')});
    await page.keyboard.press('Escape');
  });
  await check('homepage and chapter directory layouts', async () => {
    for(const width of [390,1440]) {
      await page.setViewportSize({width,height:900});
      await page.locator('.top-nav a[href="#top"]').click();
      await page.waitForFunction(()=>document.querySelector('.chapter-reader').hidden);
      await page.screenshot({path:resolve(output,`home-${width}.png`)});
      await page.locator('.top-nav a[href="#guide"]').click();
      await page.locator('.chapter-directory img').first().evaluate(el=>el.decode());
      const ratio=await page.locator('.chapter-directory img').first().evaluate(el=>el.clientWidth/el.clientHeight);
      assert.ok(Math.abs(ratio-(width<660?4/3:5/4))<.03,'Directory image aspect ratio');
      await page.screenshot({path:resolve(output,`guide-${width}.png`)});
    }
  });
  await check('deep link and replay preserve working navigation', async () => {
    await page.goto(`${url}#activity-15`);
    await page.reload();
    await page.locator('.intro-enter').click();
    await page.locator('.intro').waitFor({state:'hidden'});
    await page.waitForFunction(() => document.querySelector('#activity-15').open);
    await page.locator('[data-replay]').first().click();
    await page.locator('.intro-enter').click();
    await page.locator('.intro').waitFor({state:'hidden'});
    assert.equal(await page.locator('.page-shell').getAttribute('inert'), null);
  });
  await page.emulateMedia({reducedMotion:'no-preference'});
  await check('normal opening and chapter animations finish', async () => {
    await page.locator('[data-replay]').first().click();
    await page.locator('.intro-enter').click();
    await page.locator('.intro').waitFor({state:'hidden'});
    await page.locator('.directory-card[data-chapter="practice"]').click();
    await page.locator('.chapter-curtain').waitFor({state:'hidden'});
    assert.ok(await page.locator('#practice').isVisible());
  });
  await check('Back during a chapter transition respects the latest URL', async () => {
    await page.locator('.top-nav a[href="#guide"]').click();
    await page.locator('.directory-card[data-chapter="roots"]').click();
    await page.locator('.chapter-curtain').waitFor({state:'hidden'});
    await page.locator('.chapter-nav [data-chapter="chips"]').click();
    await page.locator('.chapter-curtain').waitFor({state:'visible'});
    await page.goBack();
    await page.locator('.chapter-curtain').waitFor({state:'hidden'});
    await page.waitForTimeout(80);
    assert.equal(await page.evaluate(()=>location.hash),'#guide');
    assert.ok(await page.locator('.chapter-reader').evaluate(el=>el.hidden));
  });
  await check('navigation works without Web Animations', async () => {
    const fallback = await browser.newPage({ reducedMotion:'no-preference' });
    try {
      await fallback.addInitScript(() => {
        Element.prototype.animate = undefined;
        Element.prototype.getAnimations = undefined;
        window.CSSAnimation = undefined;
      });
      await fallback.goto(url);
      await fallback.locator('.intro-enter').click({timeout:3000});
      await fallback.locator('.intro').waitFor({state:'hidden',timeout:3000});
      await fallback.locator('.directory-card[data-chapter="chips"]').click({timeout:3000});
      await fallback.locator('.chapter-curtain').waitFor({state:'hidden',timeout:3000});
      assert.ok(await fallback.locator('#chips').isVisible());
    } finally { await fallback.close(); }
  });
  results.push({name:'page errors',status:errors.length?'FAIL':'PASS',errors});
  if(errors.length) failures.push('page errors');
  writeFileSync(resolve(output,'browser-results.json'), JSON.stringify(results,null,2));
  writeFileSync(resolve(output,`browser-results-${process.env.PLAYWRIGHT_CHANNEL || 'msedge'}.json`), JSON.stringify(results,null,2));
  await browser.close();
  console.log(JSON.stringify(results,null,2));
  if(failures.length) process.exitCode=1;
})().catch(error => { console.error(error); process.exitCode=1; });
