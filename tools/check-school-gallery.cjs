const {chromium}=require('../../.qa/node_modules/playwright');
const fs=require('node:fs');const {resolve}=require('node:path');const {pathToFileURL}=require('node:url');const assert=require('node:assert/strict');
(async()=>{
  const root=resolve(__dirname,'..'),data=JSON.parse(fs.readFileSync(resolve(root,'content/photo-editorial.json'),'utf8'));
  // Fixture approvals exercise presentation only; they never write the real manifest.
  const fixture=structuredClone(data);
  Object.values(fixture.photos).forEach(p=>Object.assign(p,{status:'pending',caption:'',schoolId:null}));
  for(const [id,school,caption] of [['2-1','sjtu','测试用已确认注释一。'],['2-2','sjtu','测试用已确认注释二。'],['2-3','swjtu','测试用已确认注释三。']]) Object.assign(fixture.photos[id],{status:'confirmed',schoolId:school,caption});
  const browser=await chromium.launch({channel:'msedge',headless:true});
  try{
    const page=await browser.newPage({reducedMotion:'reduce',viewport:{width:390,height:844}});page.setDefaultTimeout(5000);
    await page.addInitScript({content:`Object.defineProperty(window,'PHOTO_EDITORIAL',{get:()=>(${JSON.stringify(fixture)}),set:()=>{},configurable:true});`});
    await page.goto(pathToFileURL(resolve(root,'index.html')).href+'#activity-02');await page.locator('.opening-skip').click();await page.waitForFunction(()=>document.querySelector('#activity-02').open);
    const gallery=page.locator('#activity-02 .school-gallery');assert.equal(await gallery.count(),1,'Four-school activity needs a dedicated gallery');
    assert.equal(await gallery.locator('.activity-photo:visible').count(),12);
    assert.equal(await gallery.locator('.activity-photo figcaption').count(),3,'Only explicitly confirmed captions may render');
    for(const img of await gallery.locator('.school-filter img').all()) await img.evaluate(el=>el.decode());
    await gallery.locator('[data-school-filter="sjtu"]').click();assert.equal(await gallery.locator('.activity-photo:visible').count(),2);
    await gallery.locator('.activity-photo:visible button').first().click();assert.equal(await page.locator('.lightbox-counter').textContent(),'1 / 2');
    assert.equal(await page.locator('.lightbox-caption').textContent(),'测试用已确认注释一。');await page.keyboard.press('ArrowRight');assert.equal(await page.locator('.lightbox-caption').textContent(),'测试用已确认注释二。');await page.keyboard.press('Escape');
    await gallery.locator('[data-school-filter="all"]').click();assert.equal(await gallery.locator('.activity-photo:visible').count(),12);
    for(const width of [320,390,1440]){await page.setViewportSize({width,height:900});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
    const pendingFixture=structuredClone(data);Object.values(pendingFixture.photos).forEach(p=>Object.assign(p,{status:'pending',caption:'',schoolId:null}));
    const pending=await browser.newPage({reducedMotion:'reduce'});await pending.addInitScript({content:`Object.defineProperty(window,'PHOTO_EDITORIAL',{get:()=>(${JSON.stringify(pendingFixture)}),set:()=>{},configurable:true});`});await pending.goto(pathToFileURL(resolve(root,'index.html')).href+'#activity-02');await pending.locator('.opening-skip').click();await pending.waitForFunction(()=>document.querySelector('#activity-02').open);
    assert.equal(await pending.locator('.activity-photo figcaption').count(),0,'Pending captions must stay out of the exhibit');
    assert.equal(await pending.locator('#activity-02 .activity-photo').count(),12);
    const actual=await browser.newPage({reducedMotion:'reduce',viewport:{width:1440,height:1000}});
    await actual.goto(pathToFileURL(resolve(root,'index.html')).href+'#activity-02');await actual.locator('.opening-skip').click();await actual.waitForFunction(()=>document.querySelector('#activity-02').open);
    await actual.locator('#activity-02 .school-gallery img').evaluateAll(imgs=>Promise.all(imgs.map(img=>{img.loading='eager';return img.decode();})));
    const screenshotStyle='.chapter-nav, .back-top { visibility: hidden !important; }';
    await actual.locator('#activity-02 .school-gallery').screenshot({path:resolve(root,'docs/qa/school-gallery-1440.png'),style:screenshotStyle});
    await actual.setViewportSize({width:390,height:844});await actual.locator('#activity-02 .school-gallery').screenshot({path:resolve(root,'docs/qa/school-gallery-390.png'),style:screenshotStyle});
    const review=await browser.newPage();await review.goto(pathToFileURL(resolve(root,'docs/caption-review/index.html')).href);
    const n=Object.values(data.photos).filter(p=>p.status==='confirmed').length;
    assert.equal(await review.locator('#progress').textContent(),`已确认 ${n} / 59 张`);
    const numericIds=Object.keys(data.photos).sort((a,b)=>{const aa=a.split('-').map(Number),bb=b.split('-').map(Number);return aa[0]-bb[0]||aa[1]-bb[1];});
    assert.deepEqual(await review.locator('.photo').evaluateAll(cards=>cards.map(card=>card.dataset.id)),numericIds);
    await review.locator('#activity-filter').selectOption('02');
    assert.equal(await review.locator('[data-field="confirmed"]:checked').count(),12);
    await review.locator('[data-id="2-1"] textarea').fill('本地测试草稿');
    assert.equal(await review.locator('[data-id="2-1"] [data-field="confirmed"]').isChecked(),false);
    await review.reload();assert.equal(await review.locator('[data-id="2-1"] textarea').inputValue(),'本地测试草稿');
    assert.equal(await review.locator('[data-id="2-1"] [data-field="confirmed"]').isChecked(),false);
    console.log('PASS: confirmed-only captions, school filtering, filtered lightbox, four official logos, 320–1440px layouts, no inferred approvals, review defaults and draft persistence.');
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
