const {chromium}=require('../../.qa/node_modules/playwright');
const assert=require('node:assert/strict');
const {resolve}=require('node:path');
const {pathToFileURL}=require('node:url');

(async()=>{
  const browser=await chromium.launch({channel:'msedge',headless:true});
  try {
    const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto(pathToFileURL(resolve(__dirname,'../index.html')).href);
    await page.locator('.opening-skip').click();await page.locator('.intro').waitFor({state:'hidden'});
    const photos=await page.evaluate(()=>window.ACTIVITIES.flatMap(a=>a.photos.map(p=>({src:p.src,boardId:a.boardId,caption:window.PHOTO_EDITORIAL.photos[p.src.split('/').pop().replace(/\.[^.]+$/,'')].caption}))));
    async function openAt(value){
      await page.evaluate(value=>{Math.random=()=>value;},value);
      await page.locator('[data-random-photo]').first().click();
    }
    async function checkPhoto(index){
      assert.equal(await page.locator('.lightbox-counter').textContent(),`${index+1} / ${photos.length}`);
      assert.equal(await page.locator('.lightbox-image').getAttribute('src'),photos[index].src);
      assert.equal(await page.locator('.lightbox-caption').textContent(),photos[index].caption);
      assert.equal(await page.locator('.lightbox-activity-link').getAttribute('href'),`#activity-${photos[index].boardId}`);
    }
    await openAt(0);await checkPhoto(0);
    for(let i=1;i<photos.length;i++){await page.keyboard.press('ArrowRight');await checkPhoto(i);}
    await page.keyboard.press('ArrowRight');await checkPhoto(0);
    await page.keyboard.press('ArrowLeft');await checkPhoto(photos.length-1);
    const destination=photos.at(-1).boardId;
    await page.locator('.lightbox-activity-link').click();
    await page.locator('.lightbox').waitFor({state:'hidden'});
    await page.waitForFunction(id=>document.querySelector(`#activity-${id}`).open,destination);
    assert.equal(await page.evaluate(()=>location.hash),`#activity-${destination}`);
    assert.ok(await page.locator(`#activity-${destination}`).isVisible());
    assert.ok(await page.locator(`#activity-${destination} summary`).evaluate(el=>el===document.activeElement));
    await openAt(.5);await checkPhoto(Math.floor(photos.length*.5));await page.keyboard.press('Escape');
    await openAt(.999999);await checkPhoto(photos.length-1);await page.locator('.lightbox-next').click();await checkPhoto(0);
    const stage=page.locator('.lightbox-stage');
    async function swipe(dx,dy){
      await stage.dispatchEvent('touchstart',{touches:[{identifier:1,clientX:220,clientY:250}]});
      await stage.dispatchEvent('touchend',{touches:[],changedTouches:[{identifier:1,clientX:220+dx,clientY:250+dy}]});
    }
    await swipe(-150,4);await checkPhoto(1);await swipe(150,4);await checkPhoto(0);
    await swipe(-15,2);await checkPhoto(0);await swipe(-20,180);await checkPhoto(0);
    await stage.dispatchEvent('touchstart',{touches:[{identifier:1,clientX:220,clientY:250},{identifier:2,clientX:240,clientY:250}]});
    await stage.dispatchEvent('touchend',{touches:[],changedTouches:[{identifier:1,clientX:40,clientY:250}]});await checkPhoto(0);
    await stage.dispatchEvent('touchstart',{touches:[{identifier:1,clientX:220,clientY:250}]});await stage.dispatchEvent('touchcancel');
    await stage.dispatchEvent('touchend',{touches:[],changedTouches:[{identifier:1,clientX:40,clientY:250}]});await checkPhoto(0);
    const touch=await page.context().newCDPSession(page);
    async function nativeSwipe(from,to){
      await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:from,y:250}]});
      await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:(from+to)/2,y:250}]});
      await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:to,y:250}]});
      await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    }
    await nativeSwipe(270,80);await checkPhoto(1);await nativeSwipe(80,270);await checkPhoto(0);
    assert.ok(!/esc/i.test(await page.locator('.lightbox-bottom').innerText()));
    for(const width of [320,390,1440]){await page.setViewportSize({width,height:900});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));const bounds=await page.locator('.lightbox-activity-link').boundingBox();assert.ok(bounds.height>=44&&bounds.x>=0&&bounds.x+bounds.width<=width);}
    await page.setViewportSize({width:390,height:844});await page.locator('.lightbox-image').evaluate(img=>img.decode());
    await page.screenshot({path:resolve(__dirname,'../docs/qa/random-gallery-390.png')});
    await page.keyboard.press('Escape');await page.locator('.top-nav a[href="#top"]').click();await page.waitForFunction(()=>document.querySelector('.chapter-reader').hidden);
    await page.locator('.hero-photo-primary button').click();assert.equal(await page.locator('.lightbox-counter').textContent(),'1 / 3');
    assert.deepEqual(errors,[]);
    console.log('PASS: uniform photo selection, all 59 photos/captions/activity links, wraparound, activity navigation, mobile swipes and gesture guards, no Esc hint, ordinary gallery scope, responsive touch target.');
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
