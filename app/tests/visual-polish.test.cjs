const {chromium}=(()=>{try{return require('playwright')}catch{return require('../../browser/node_modules/playwright')}})();
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),baseline=path.join(__dirname,'layout-before-polish.snap.json');
function normalize(name,s){s=s.replace(/\r\n/g,'\n');if(name.endsWith('.css')||name.startsWith('res/'))s=s.replace(/#[0-9a-fA-F]{3,8}\b/g,'#COLOR');if(name==='web-src/core.js')s=s.replace(/color:'#[0-9a-fA-F]+'/g,"color:'COLOR'");if(name.endsWith('MainActivity.java'))s=s.replace(/Color\.rgb\(\d+,\d+,\d+\)/g,'Color.rgb(COLOR)');return s;}
async function geometry(page,selectors){return page.evaluate(selectors=>selectors.flatMap(selector=>[...document.querySelectorAll(selector)].map((el,i)=>{const r=el.getBoundingClientRect();return {selector,i,x:+r.x.toFixed(1),y:+r.y.toFixed(1),w:+r.width.toFixed(1),h:+r.height.toFixed(1),text:el.tagName==='INPUT'?'':el.textContent};})),selectors);}
(async()=>{
 const record=process.argv.includes('--record');
 const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 try{const page=await browser.newPage({viewport:{width:412,height:915}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:8775/index.html');await page.waitForTimeout(350);
 const screens={};
 for(const [name,selectors] of Object.entries({home:['.chat-header','.chat-timeline','.chat-composer','#prompt','#attach','#start','nav'],skills:['.topbar','h1','.workflow','nav'],history:['.topbar','h1','.empty','nav'],settings:['.topbar','h1','#config-form','.field input','nav']})){
  await page.locator('nav [data-nav="'+name+'"]').click();await page.waitForTimeout(350);screens[name]=await geometry(page,selectors);
 }
 if(record){fs.writeFileSync(baseline,JSON.stringify(screens,null,2));console.log('Recorded unchanged-layout baseline for all four pages.');return;}
 const files=require('./visual-only.snap.json');for(const [name,expected] of Object.entries(files)){const actual=crypto.createHash('sha256').update(normalize(name,fs.readFileSync(path.join(root,name),'utf8'))).digest('hex');assert.equal(actual,expected,'Unexpected nonvisual change: '+name);}
 assert.deepEqual(screens,JSON.parse(fs.readFileSync(baseline,'utf8')),'layout/text must not move or change');
 await page.locator('nav [data-nav="home"]').click();await page.waitForTimeout(350);
 const theme=await page.evaluate(()=>{const r=getComputedStyle(document.documentElement);return {bg:r.getPropertyValue('--bg').trim(),accent:r.getPropertyValue('--accent').trim()};});
 assert.equal(theme.bg.toLowerCase(),'#0d1423');assert.equal(theme.accent.toLowerCase(),'#8acbff');
 const animated=await page.evaluate(async()=>{document.querySelector('nav [data-nav="skills"]').click();await Promise.resolve();return document.querySelector('main').getAnimations().map(a=>({duration:a.effect.getTiming().duration,easing:a.effect.getTiming().easing}));});assert.ok(animated.length,'page switch must animate');assert.ok(animated.every(a=>a.duration>=180&&a.duration<=320));
 await page.waitForTimeout(350);await page.evaluate(()=>window.onNative({type:'importCancelled'}));await page.waitForTimeout(20);assert.equal(await page.locator('main').evaluate(e=>e.getAnimations().length),0,'same-page rerender must not restart page animation');
 await page.evaluate(()=>{const e={id:987654321,skill:'pdf',date:'本地动效测试',prompt:'本地测试，不调用API',optimized:'这是用于检查展开动画的执行需求。\n'.repeat(15),result:{title:'动效测试',summary:'只使用本地夹具',sections:[]},sources:[]};localStorage.setItem('work-history',JSON.stringify([e]));localStorage.setItem('work-chat-v1',JSON.stringify([e.id]));});
 await page.reload();await page.waitForTimeout(350);const details=page.locator('.chat-ai details').first();const closed=await details.evaluate(e=>e.offsetHeight);await details.locator('summary').click();await page.waitForTimeout(45);assert.ok(await details.evaluate(e=>e.getAnimations().length)>0,'details must expand smoothly');const mid=await details.evaluate(e=>e.getBoundingClientRect().height);await page.waitForTimeout(350);const opened=await details.evaluate(e=>e.offsetHeight);assert.ok(mid>closed&&mid<opened);await details.locator('summary').click();await page.waitForTimeout(350);assert.equal(await details.evaluate(e=>e.offsetHeight),closed);
 await page.emulateMedia({reducedMotion:'reduce'});await details.locator('summary').click();assert.equal(await details.evaluate(e=>e.getAnimations().length),0);const reduced=await page.evaluate(async()=>{document.querySelector('nav [data-nav="settings"]').click();await Promise.resolve();return document.querySelector('main').getAnimations().length;});assert.equal(reduced,0);
 assert.deepEqual(errors,[]);console.log('Visual polish passed: identical four-page geometry/text/business sources, cool palette, bounded smooth page/detail transitions, no rerender flashing, reduced-motion support. No API calls.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
