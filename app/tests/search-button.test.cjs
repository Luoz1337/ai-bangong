const {chromium}=(()=>{try{return require('playwright')}catch{return require('../../browser/node_modules/playwright')}})();
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 try{const page=await browser.newPage({viewport:{width:412,height:915}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{
   window.preferenceCalls=[];window.paidCalls=[];window.failPreference=false;
   window.Android={getConfig(){return JSON.stringify({hasKey:true,base:'https://api.deepseek.com',model:'fixture-only',confirm:false,search:localStorage.getItem('fixture-search')!=='false',big:false});},setSearchEnabled(enabled){preferenceCalls.push(enabled);if(failPreference)return false;localStorage.setItem('fixture-search',String(enabled));return true;},request(id,action,raw){paidCalls.push({action,raw});const body=JSON.parse(raw);setTimeout(()=>onNative({type:'response',id,data:action==='search'?{results:[{title:'测试来源',url:'https://example.test/source',summary:'仅用于测试的来源资料'}]}:{choices:[{message:{content:body.response_format?JSON.stringify({title:'测试表格',summary:'测试响应',sections:[],table:{columns:['名称'],rows:[]}}):'查询武汉鲜食工厂，核验来源并制作表格。'},finish_reason:'stop'}]}}),35);}};
  });
  await page.goto('http://127.0.0.1:8775/index.html');
  const button=()=>page.locator('#chat-search');
  assert.equal(await button().count(),1,'visible chat search toggle must exist');
  assert.equal(await button().getAttribute('aria-pressed'),'true');assert.ok((await button().textContent()).includes('联网搜索：开'));
  await page.locator('#prompt').fill('保留我正在输入的需求');await button().click();
  assert.equal(await button().getAttribute('aria-pressed'),'false');assert.ok((await button().textContent()).includes('联网搜索：关'));
  assert.equal(await page.locator('#prompt').inputValue(),'保留我正在输入的需求');
  await page.locator('nav [data-nav="settings"]').click();assert.equal(await page.locator('#search-toggle').isChecked(),false);
  await page.locator('nav [data-nav="home"]').click();assert.equal(await button().getAttribute('aria-pressed'),'false');
  await page.reload();assert.equal(await button().getAttribute('aria-pressed'),'false');
  await button().click();assert.equal(await button().getAttribute('aria-pressed'),'true');
  await page.locator('nav [data-nav="settings"]').click();assert.equal(await page.locator('#search-toggle').isChecked(),true);
  await page.locator('nav [data-nav="home"]').click();await page.evaluate(()=>window.failPreference=true);await button().click();assert.equal(await button().getAttribute('aria-pressed'),'true','failed persistence must not pretend setting changed');
  assert.deepEqual(await page.evaluate(()=>paidCalls),[],'toggling preferences must not send any AI/search requests');
  for(const big of [false,true]){await page.evaluate(big=>{document.body.classList.toggle('bigtext',big);},big);for(const width of [360,412,768]){await page.setViewportSize({width,height:915});const r=await button().boundingBox();assert.ok(r.width>=44&&r.height>=44,'large touch target');assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no horizontal overflow');}}
  await page.evaluate(()=>window.failPreference=false);await page.locator('#prompt').fill('武汉有哪些鲜食工厂，帮我做成表格');await page.locator('#start').click();await page.waitForFunction(()=>document.querySelectorAll('[data-chat-entry]').length===1);
  assert.deepEqual(await page.evaluate(()=>paidCalls.map(c=>c.action)),['chat','search','chat'],'on button state permits actual search dispatch');
  await button().click();await page.locator('#prompt').fill('武汉有哪些鲜食工厂，帮我做成表格');await page.locator('#start').click();await page.waitForFunction(()=>document.querySelectorAll('[data-chat-entry]').length===2);
  assert.deepEqual(await page.evaluate(()=>paidCalls.map(c=>c.action)),['chat','search','chat','chat','chat'],'off button state suppresses search dispatch');
  assert.deepEqual(errors,[]);console.log('Visible chat search button: state labels, accessibility, native persistence, restart/settings sync, preserved draft, error handling, touch size and responsive layout; no API requests.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
