const {chromium}=require('playwright');
const assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8'};
const server=http.createServer((req,res)=>{const name=decodeURIComponent(new URL(req.url,'http://localhost').pathname);const file=path.join(root,name==='/app.js'?'web-src/app.js':'assets'+(name==='/'?'/index.html':name));if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}fs.readFile(file,(err,data)=>{if(err){res.writeHead(404).end();return;}res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'}).end(data);});});
// Removing compact sizing must restore the taller baseline; shrinking controls below 44px,
// hiding the speech/search actions, or spilling at narrow/keyboard sizes must fail here.
(async()=>{await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try{const page=await browser.newPage({viewport:{width:412,height:915},reducedMotion:"reduce"}),errors=[],measurements=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://127.0.0.1:'+server.address().port+'/index.html');
for(const width of [412,360]){await page.setViewportSize({width,height:915});await page.reload();
const compact=await page.locator('.chat-composer').evaluate(e=>e.getBoundingClientRect().height);
await page.evaluate(()=>{const sheet=document.querySelector('link[href="compact.css"]');if(sheet)sheet.disabled=true;document.querySelector('#prompt').style.height='52px';});
const before=await page.locator('.chat-composer').evaluate(e=>e.getBoundingClientRect().height);measurements.push({width,before,after:compact,reduction:Math.round((1-compact/before)*1000)/10});
console.log(JSON.stringify(measurements[measurements.length-1]));assert.ok(compact<=before*.8,`composer at ${width}px should be at least 20% flatter (${before}px -> ${compact}px)`);
}
await page.reload();
for(const big of [false,true])for(const width of [360,412])for(const height of [915,500]){await page.setViewportSize({width,height});await page.waitForFunction(()=>{const r=document.querySelector(".chat-page").getBoundingClientRect();return r.bottom<=innerHeight-document.querySelector("nav").getBoundingClientRect().height+1;});await page.evaluate(big=>document.body.classList.toggle('bigtext',big),big);
assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`no horizontal overflow: ${width}x${height}, big=${big}`);
for(const selector of ['.chat-skill','#chat-search','#example','#attach','#voice-input','#start']){const el=page.locator(selector);assert.ok(await el.isVisible(),selector+' visible');const box=await el.boundingBox();assert.ok(box.width>=44&&box.height>=44,selector+' has 44px touch target');assert.ok(box.x>=0&&box.x+box.width<=width&&box.y>=0&&box.y+box.height<=height,selector+' stays on screen '+JSON.stringify({width,height,big,box}));}
}
await page.evaluate(()=>document.body.classList.remove('bigtext'));await page.setViewportSize({width:412,height:915});await page.locator('#prompt').fill('短需求');const short=await page.locator('#prompt').boundingBox();await page.locator('#prompt').fill(Array(20).fill('较长的多行需求保持滚动与编辑能力').join('\n'));const long=await page.locator('#prompt').boundingBox();assert.ok(long.height>short.height&&long.height<=112,'multiline input grows then scrolls');
await page.locator('#prompt').fill('保留输入的需求');const old=await page.locator('#chat-search').getAttribute('aria-pressed');await page.locator('#chat-search').click();assert.notEqual(await page.locator('#chat-search').getAttribute('aria-pressed'),old);assert.equal(await page.locator('#prompt').inputValue(),'保留输入的需求');await page.locator('#voice-input').click();assert.ok((await page.locator('#toast').textContent()).includes('语音输入'));
for(const screen of ['skills','history','settings']){await page.locator(`nav [data-nav="${screen}"]`).click();const geometry=()=>page.evaluate(()=>[...document.querySelectorAll('.page,button,.workflow,.card,input')].map(e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return [r.x,r.y,r.width,r.height,s.backgroundColor,s.color,s.borderTopLeftRadius]}));const enabled=await geometry();await page.locator('link[href="compact.css"]').evaluate(e=>e.disabled=true);assert.deepEqual(await geometry(),enabled,'other pages unchanged: '+screen);await page.locator('link[href="compact.css"]').evaluate(e=>e.disabled=false);}
assert.deepEqual(errors,[]);console.log('Compact composer: >=20% flatter; 44px controls; voice/search/draft preserved; narrow, big-text and keyboard layouts; growing input; other-page geometry/colors unchanged.');
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
