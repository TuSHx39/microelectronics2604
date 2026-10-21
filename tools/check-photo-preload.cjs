const {chromium}=require('../../.qa/node_modules/playwright');
const {createServer}=require('node:http');
const {readFile}=require('node:fs/promises');
const {resolve,sep,extname}=require('node:path');
const assert=require('node:assert/strict');

(async()=>{
  const root=resolve(__dirname,'..'),counts=new Map();
  let active=0,peak=0,failOne=false;
  const server=createServer(async(req,res)=>{
    const path=new URL(req.url,'http://localhost').pathname;
    const file=resolve(root,'.'+decodeURIComponent(path));
    if(!file.startsWith(root+sep)){res.writeHead(403).end();return;}
    counts.set(path,(counts.get(path)||0)+1);
    const original=path.startsWith('/assets/photos/');
    if(original){active++;peak=Math.max(peak,active);res.on('close',()=>active--);}
    try{
      if(original)await new Promise(r=>setTimeout(r,35));
      if(failOne&&path==='/assets/photos/2-4.jpg'){res.writeHead(404).end();return;}
      const body=await readFile(file);
      const type={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css','.webp':'image/webp','.jpg':'image/jpeg','.png':'image/png','.woff2':'font/woff2'}[extname(file)]||'application/octet-stream';
      res.writeHead(200,{'Content-Type':type,'Cache-Control':'public, max-age=86400'}).end(body);
    }catch{res.writeHead(404).end();}
  });
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const url=`http://127.0.0.1:${server.address().port}/index.html`;
  const browser=await chromium.launch({channel:'msedge',headless:true});
  try{
    const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto(url);
    const urls=await page.evaluate(()=>window.ACTIVITIES.flatMap(a=>a.photos.map(p=>new URL(p.src,location.href).pathname)));
    await page.waitForFunction(()=>performance.getEntriesByType('resource').filter(r=>new URL(r.name).pathname.startsWith('/assets/photos/')).length===59,{},{timeout:15000});
    assert.ok(await page.locator('.intro').isVisible(),'Preload must start before entering or opening a gallery');
    for(const src of urls){assert.equal(counts.get(src),1,`Preload original ${src}`);assert.equal(counts.get(src.replace('/photos/','/previews/').replace(/\.[^.]+$/,'.webp')),1,'Preload reusable exhibit preview');}
    assert.ok(peak<=3,`Background original concurrency must stay bounded: ${peak}`);
    const before=new Map(counts);
    await page.locator('.opening-skip').click();await page.locator('.intro').waitFor({state:'hidden'});
    await page.evaluate(()=>{Math.random=()=>0;});await page.locator('[data-random-photo]').first().click();
    for(let i=0;i<59;i++){await page.locator('.lightbox-image').evaluate(img=>img.decode());if(i<58)await page.keyboard.press('ArrowRight');}
    await page.keyboard.press('Escape');
    await page.locator('[data-open-index]').first().click();await page.locator('[data-activity="02"]').click();
    await page.locator('#activity-02 .school-photo-grid img').evaluateAll(imgs=>Promise.all(imgs.map(img=>{img.loading='eager';return img.decode();})));
    await page.locator('#activity-02 [data-photo="0"]').first().click();await page.locator('.lightbox-image').evaluate(img=>img.decode());
    for(const src of urls){assert.equal(counts.get(src),before.get(src),'Random/ordinary galleries must reuse original cache');const preview=src.replace('/photos/','/previews/').replace(/\.[^.]+$/,'.webp');assert.equal(counts.get(preview),before.get(preview),'Exhibit must reuse preview cache');}
    assert.deepEqual(errors,[]);
    await page.close();counts.clear();failOne=true;
    const failure=await browser.newPage({reducedMotion:'reduce'});const failures=[];failure.on('pageerror',e=>failures.push(e.message));
    await failure.goto(url);
    await failure.waitForFunction(()=>performance.getEntriesByType('resource').filter(r=>new URL(r.name).pathname.startsWith('/assets/photos/')).length===59,{},{timeout:15000});
    await failure.locator('.opening-skip').click();await failure.locator('.intro').waitFor({state:'hidden'});
    assert.deepEqual(failures,[],'One failed photo must not stall the queue or entering the exhibit');
    console.log('PASS: all 59 originals and 59 exhibit previews preload before interaction, bounded background concurrency, cached random/ordinary galleries and exhibit, failure isolation, responsive entrance.');
  }finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
