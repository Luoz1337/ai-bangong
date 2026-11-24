const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{pathToFileURL}=require('node:url');
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:412,height:915},reducedMotion:'reduce'}),errors=[],requests=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()));
  const html=fs.readFileSync(path.resolve('work/protected-page.html'),'utf8');
  await page.addInitScript(({html})=>{
   window.Android={getProtectedPage:()=>html,getConfig:()=>JSON.stringify({hasKey:true,base:'https://api.deepseek.com',model:'deepseek-flash',confirm:false,search:false,big:false}),
    setSearchEnabled:()=>true,startVoiceInput:id=>setTimeout(()=>onNative({type:'voice',id,text:'语音测试文字'}),10),
    request(id,action,raw){const b=JSON.parse(raw);setTimeout(()=>onNative({type:'response',id,data:{choices:[{message:{content:b.response_format?JSON.stringify({title:'加密发布测试',summary:'本地夹具，无真实API',sections:[],table:{columns:['项目','金额'],rows:[['测试',12]]}}):'制作两列表格，使用已有数据。'},finish_reason:'stop'}]}}),10);},
    exportFile:()=>{},pickAttachments:()=>onNative({type:'attachments',files:[{name:'资料.txt',text:'项目测试，金额12',note:'本地夹具',images:[]}]})};
  },{html});
  const url=pathToFileURL(path.resolve('work/bootstrap-test.html')).href;
  await page.goto(url);await page.locator('#prompt').waitFor();
  assert.equal(await page.locator('script[nonce]').count(),4);
  assert.equal(await page.locator('link[rel=stylesheet],script[src]').count(),0);
  await page.locator('nav [data-nav=skills]').click();assert.equal(await page.locator('[data-use]').count(),8);
  await page.locator('[data-use=sheet]').click();await page.locator('#voice-input').click();await page.waitForFunction(()=>document.querySelector('#prompt').value.includes('语音测试文字'));
  await page.locator('#attach').click();await page.locator('.attachment').waitFor();await page.locator('#start').click();await page.locator('[data-chat-entry]').first().waitFor();
  assert.ok(await page.evaluate(()=>localStorage.getItem('work-history').includes('加密发布测试')));
  await page.reload();await page.locator('[data-chat-entry]').first().waitFor();assert.ok((await page.locator('.chat-timeline').textContent()).includes('加密发布测试'));
  for(const screen of ['skills','history','settings','home']){await page.locator(`nav [data-nav=${screen}]`).click();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
  // CSP must permit only nonced bundled scripts, not a new inline script.
  await page.evaluate(()=>{const s=document.createElement('script');s.textContent='window.untrustedRan=true';document.body.appendChild(s);});
  assert.equal(await page.evaluate(()=>window.untrustedRan),undefined);
  assert.deepEqual(errors,[]);assert.ok(requests.every(u=>u===url),'no external resource/network fetches');
  await page.screenshot({path:path.resolve('outputs/界面预览.png')});
  console.log('PASS: actual APK bootstrap + nonce CSP starts all four bundled scripts; 8 workflows, voice text, attachments, optimize/execute, history reload, all 4 pages; untrusted inline script blocked; zero network/API calls.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
