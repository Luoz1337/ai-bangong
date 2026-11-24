const {chromium}=(()=>{try{return require('playwright')}catch{return require('../../browser/node_modules/playwright')}})();
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 try{for(const mode of ['repair-ok','search-failure','repair-failure']){
  const page=await browser.newPage({viewport:{width:412,height:915}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(({mode})=>{
   window.testCalls=[];window.testExports=[];
   window.Android={getConfig(){return JSON.stringify({hasKey:true,base:'https://api.deepseek.com',model:'fixture-only',confirm:false,search:true,big:false});},request(id,action,raw){
    const body=JSON.parse(raw);window.testCalls.push({action,body});setTimeout(()=>{
     if(action==='search'){onNative(mode==='search-failure'?{type:'response',id,error:'测试服务不支持检索（夹具）'}:{type:'response',id,data:{results:[{title:'测试来源（夹具）',url:'https://example.test/fixture',summary:'仅用于测试，不是真实企业资料。'}]}});return;}
     let result;
     if(!body.response_format)result='仅输出优化后的指令，不执行查询，不制作表格。';
     else if(body.messages[0].content.includes('上一份回答缺少必须的结构'))result=mode==='repair-failure'?JSON.stringify({title:'已返回说明',summary:'已收到文字但未形成表格',sections:[]}):JSON.stringify({title:'测试查询表',summary:'以下为测试夹具，不是真实资料',sections:[],table:{columns:['名称','来源'],rows:[['测试条目','https://example.test/fixture']]}});
     else result=mode==='search-failure'?JSON.stringify({title:'空白查询表',summary:'没有已核实资料',sections:[],table:{columns:['名称','来源','核实状态'],rows:[]}}):JSON.stringify({title:'已返回说明',summary:'已收到文字但未形成表格',sections:[]});
     onNative({type:'response',id,data:{choices:[{message:{content:result},finish_reason:'stop'}]}});
    },35);
   },exportFile(kind,raw){window.testExports.push({kind,result:JSON.parse(raw)});}};
  },{mode});
  await page.goto('http://127.0.0.1:8775/index.html');await page.locator('nav [data-nav="skills"]').click();await page.locator('[data-use="sheet"]').click();await page.locator('#prompt').fill('查询武汉的大型视频加工厂并做成表格');await page.locator('#start').click();
  if(mode==='repair-failure'){
   await page.locator('#retry').waitFor();assert.equal(await page.locator('[data-chat-entry]').count(),0);await page.getByText('查看已返回的文字（结构未完成）',{exact:true}).click();assert.ok((await page.locator('.error').textContent()).includes('已收到文字但未形成表格'));
  }else{
   await page.waitForFunction(()=>document.querySelectorAll('[data-chat-entry]').length===1);await page.locator('[data-export="xlsx"]').click();const exp=await page.evaluate(()=>testExports);assert.equal(exp[0].kind,'xlsx');assert.ok(exp[0].result.table);
   if(mode==='search-failure'){assert.equal(exp[0].result.table.rows.length,0);assert.ok(exp[0].result.summary.includes('联网检索未完成'));}
  }
  const calls=await page.evaluate(()=>testCalls);assert.deepEqual(calls.map(c=>c.action),mode==='search-failure'?['chat','search','chat']:['chat','search','chat','chat']);
  assert.ok(JSON.stringify(calls[2].body.messages).includes('查询武汉的大型视频加工厂并做成表格'));assert.ok(calls[2].body.messages[0].content.includes('原始需求优先'));assert.ok(calls[2].body.messages[0].content.includes('table 为必填'));
  assert.deepEqual(errors,[]);await page.close();
 }
 console.log('Execution UI regression passed: actual failure shape, cross-workflow search, bounded structure repair, valid XLSX payload, transparent search failure, retained partial answer. Fixtures only, no API calls.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
