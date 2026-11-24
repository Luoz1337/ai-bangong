const {chromium}=(()=>{try{return require('playwright')}catch{return require('../../browser/node_modules/playwright')}})();
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 try{for(const mode of ['colloquial','enhanced','local-only','offline','disabled']){
  const page=await browser.newPage({viewport:{width:412,height:915}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(({mode})=>{
   window.calls=[];
   window.Android={getConfig(){return JSON.stringify({hasKey:true,base:'https://api.deepseek.com',model:'fixture-only',confirm:false,search:mode!=='disabled',big:false});},request(id,action,raw){
    const body=JSON.parse(raw);calls.push({action,body});setTimeout(()=>{
     const data=action==='search'?{results:[{title:'鲜食工厂官网（测试夹具）',url:'https://example.test/factory',summary:'测试工厂位于武汉，生产鲜食便当；规模待确认。',content:'测试来源正文。'}]}:{choices:[{message:{content:!body.response_format?'整理武汉地区鲜食工厂。先检索公开资料并核验来源，再制作表格。':JSON.stringify({title:'工厂表（测试夹具）',summary:'仅为自动化测试响应',sections:[],table:{columns:['名称','主要产品','位置','规模','来源'],rows:[['测试工厂','便当','武汉','待确认','https://example.test/factory']]}})},finish_reason:'stop'}]};
     onNative({type:'response',id,data});
    },20);
   }};
  },{mode});
  await page.goto('http://127.0.0.1:8775/index.html');await page.locator('nav [data-nav="skills"]').click();await page.locator('[data-use="sheet"]').click();
  const prompt=mode==='local-only'?'只根据上传的鲜食工厂资料整理表格':mode==='offline'?'不要联网，整理武汉鲜食工厂表格':mode==='enhanced'?'帮我整一份武汉鲜食工厂的表格':'你能不能帮我整一下武汉这边有哪些那个鲜食工厂，然后帮忙做成一个表格，里面还有他工厂的名称，他主要是做什么产品的，他的位置在哪里，包括他的规模和备注。';
  await page.locator('#prompt').fill(prompt);await page.locator('#start').click();await page.waitForFunction(()=>document.querySelectorAll('[data-chat-entry]').length===1);
  const calls=await page.evaluate(()=>window.calls),online=['colloquial','enhanced'].includes(mode);
  assert.deepEqual(calls.map(c=>c.action),online?['chat','search','chat']:['chat','chat'],mode);
  const execution=calls[calls.length-1].body;
  if(online){assert.ok(JSON.stringify(execution.messages).includes('测试工厂位于武汉'));assert.ok(JSON.stringify(execution.messages).includes('https://example.test/factory'));assert.ok(!JSON.stringify(execution.messages).includes('本次没有可引用的联网来源'));assert.ok(await page.locator('a[href="https://example.test/factory"]').count());}
  assert.ok(execution.messages[0].content.includes('原始需求优先'));assert.deepEqual(errors,[]);await page.close();
 }
 console.log('Search routing UI: conversational/optimized lookups dispatch retrieval and inject/display sources; explicit offline/local inputs and disabled search dispatch no search. Fixtures only.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
