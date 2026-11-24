const {chromium}=(()=>{try{return require('playwright')}catch{return require('../../browser/node_modules/playwright')}})();
const assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto'),path=require('node:path');
(async()=>{
 const source=fs.readFileSync(path.resolve(__dirname,'../web-src/app.js'),'utf8');
 const snapshots=require('./unchanged-pages.snap.json');
 for(const [key,start,end] of [['skills_settings','function skills(){','function resultHtml('],['history','function historyPage(){','function render(){']]){assert.equal(crypto.createHash('sha256').update(source.slice(source.indexOf(start),source.indexOf(end))).digest('hex'),snapshots[key],`${key} must stay unchanged`);}
 const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 try{const page=await browser.newPage({viewport:{width:412,height:915},reducedMotion:'reduce'});await page.goto('http://127.0.0.1:8775/index.html');
 assert.equal(await page.locator('.chat-page').count(),1,'workbench must be a chat page');
 assert.equal(await page.locator('.hero,.guide,.skill-card').count(),0,'marketing workbench must be removed');
 assert.equal(await page.locator('#chat-timeline[role="log"]').count(),1);
 assert.equal(await page.locator('#prompt').count(),1);assert.equal(await page.locator('#attach').count(),1);assert.equal(await page.locator('#start').textContent(),'发送');
 assert.equal(await page.locator('#new-task').count(),1);
 for(const width of [360,412,768]){await page.setViewportSize({width,height:915});const box=await page.locator('.chat-composer').boundingBox(),nav=await page.locator('nav').boundingBox();assert.ok(box.y>450);assert.ok(Math.abs(box.y+box.height-nav.y)<3);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
 await page.setViewportSize({width:412,height:480});const input=await page.locator('#prompt').boundingBox();assert.ok(input.y+input.height<480,'input stays visible with keyboard-sized viewport');
 console.log('Chat layout passed: pinned input, transcript, mobile widths/keyboard viewport; Skills/Settings/History source unchanged.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
