const {chromium}=(()=>{try{return require('playwright')}catch{return require('../../browser/node_modules/playwright')}})();
const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
(async()=>{
 fs.mkdirSync('outputs',{recursive:true});fs.mkdirSync('work',{recursive:true});
 const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 try{
 const page=await browser.newPage({viewport:{width:412,height:915},deviceScaleFactor:2});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:8775/index.html');
 await page.waitForTimeout(350);
 await page.screenshot({path:path.resolve('outputs/界面预览.png')});
 assert.equal(await page.locator('.chat-page').count(),1);assert.equal(await page.locator('.hero,.skill-card').count(),0);
 await page.locator('#start').click();await page.getByText('请先写一句您想完成的工作。',{exact:true}).waitFor();
 await page.locator('#prompt').fill('帮我整理周报');await page.locator('#start').click();assert.equal(await page.locator('#api-key').count(),1);
 await page.locator('[data-nav="skills"]').click();assert.equal(await page.locator('[data-use]').count(),8);
 await page.locator('[data-use="sheet"]').click();assert.equal(await page.locator('.compose-header strong').textContent(),'表格制作');
 await page.locator('#example').click();assert.ok((await page.locator('#prompt').inputValue()).includes('费用'));
 await page.locator('[data-nav="settings"]').first().click();await page.locator('#api-key').fill('test-only-not-real');await page.locator('#confirm').check();await page.locator('#config-form button[type="submit"]').click();
 const calls=[],exports=[];
 await page.exposeFunction('recordCall',(action,body)=>{calls.push([action,body]);});
 await page.exposeFunction('recordExport',(kind,body)=>{exports.push([kind,body]);});
 await page.evaluate(()=>{let generated=0;window.Android={
 request(id,action,raw){const b=JSON.parse(raw);window.recordCall(action,b);setTimeout(()=>{const optimizing=!b.response_format;if(!optimizing)generated++;const text=optimizing?'请制作费用统计表，保留空白待填写，不编造数据。':JSON.stringify({title:'费用统计第'+generated+'版',summary:'可编辑模板',sections:[{heading:'说明',body:'请填写实际费用。'}],table:{columns:['项目','金额'],rows:[['打印纸',42.5+generated],['<script>alert(1)</script>',0]]}});onNative({type:'response',id,data:{choices:[{message:{content:text},finish_reason:'stop'}]}});},60);},
 exportFile(kind,body){window.recordExport(kind,JSON.parse(body));},pickAttachments(){onNative({type:'attachments',files:[{name:'测试资料.txt',text:'打印纸42.5元',note:'已读取文本',images:[]}]});}
 };});
 await page.locator('[data-nav="home"]').click();await page.locator('#prompt').fill('项目代号青松-812，请制作费用表，金额始终使用元为单位。');await page.locator('#attach').click();assert.equal(await page.locator('.attachment').count(),1);
 await page.locator('#start').click();await page.locator('#optimized').waitFor();assert.equal(calls.length,1);assert.ok(calls[0][1].messages[0].content.includes('Prompt Enhancer'),'actual optimization request must use enhancer');assert.ok(calls[0][1].messages[0].content.includes('默认成果格式：xlsx'),'selected workflow reaches enhancer');assert.equal(await page.locator('.chat-user').count(),1);assert.equal(await page.locator('#prompt').inputValue(),'');
 await page.locator('#optimized').fill('我修改了优化后的需求，生成两列费用表。');await page.locator('#execute').click();await page.waitForFunction(()=>document.querySelectorAll('[data-chat-entry]').length===1);
 assert.equal(calls.length,2);assert.ok(!calls[1][1].messages[0].content.includes('Prompt Enhancer'),'execution must retain the original execution contract');assert.ok(JSON.stringify(calls[0][1]).includes('打印纸42.5元'));assert.ok(JSON.stringify(calls[1][1]).includes('我修改了优化后的需求'));assert.equal(await page.locator('.result script').count(),0);
 await page.locator('[data-export="xlsx"]').click();await page.waitForTimeout(80);assert.equal(exports[0][1].table.rows[0][1],43.5);
 await page.locator('#prompt').fill('在上一版上增加一列备注');await page.locator('#start').click();await page.locator('#optimized').waitFor();assert.equal(calls.length,3);assert.ok(JSON.stringify(calls[2][1]).includes('上一版工作成果'));assert.ok(JSON.stringify(calls[2][1]).includes('测试资料.txt'));assert.ok(JSON.stringify(calls[2][1]).includes('青松-812'),'prior user constraints must be carried even if absent from model result');assert.ok(JSON.stringify(calls[2][1]).includes('我修改了优化后的需求'),'prior manually approved prompt must be carried');
 await page.locator('#execute').click();await page.waitForFunction(()=>document.querySelectorAll('[data-chat-entry]').length===2);assert.equal(await page.locator('.chat-user').count(),2);
 await page.locator('[data-export="xlsx"]').first().click();await page.waitForTimeout(80);assert.equal(exports[1][1].title,'费用统计第1版','old reply exports its own document');
 await page.screenshot({path:path.resolve('work/result-preview.png')});
 await page.locator('[data-nav="history"]').click();assert.equal(await page.locator('[data-history]').count(),2);await page.locator('[data-history]').first().click();await page.locator('#refine-text').fill('再简短一些');await page.locator('#refine').click();await page.locator('#optimized').waitFor();await page.locator('#execute').click();await page.waitForFunction(()=>document.querySelectorAll('[data-chat-entry]').length===3);assert.equal(calls.length,6);
 for(const width of [360,412,768]){await page.setViewportSize({width,height:915});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
 await page.reload();assert.equal(await page.locator('[data-chat-entry]').count(),3);assert.equal(await page.locator('.compose-header strong').textContent(),'表格制作');
 await page.locator('#new-task').click();assert.equal(await page.locator('.chat-user').count(),0);assert.equal(await page.locator('.chat-welcome').count(),1);
 await page.locator('[data-nav="history"]').click();assert.equal(await page.locator('[data-history]').count(),3);await page.locator('[data-history]').first().click();assert.equal(await page.locator('#refine-text').count(),1);
 assert.deepEqual(errors,[]);
 console.log('Chat UI passed: 8 skills, two-stage edit/execute, attachment reuse, 3-turn context, per-message export, history/refinement, restart/new-chat persistence, responsive layout. Test fixtures only; no live API calls.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
