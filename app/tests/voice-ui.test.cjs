const {chromium}=(()=>{try{return require('playwright')}catch{return require('../../browser/node_modules/playwright')}})();
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 try{const page=await browser.newPage({viewport:{width:412,height:915}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{window.voiceCalls=[];window.paidCalls=[];window.Android={getConfig(){return JSON.stringify({hasKey:false,base:'https://api.deepseek.com',model:'fixture-only',confirm:false,search:true,big:false});},startVoiceInput(id){voiceCalls.push(id);},request(id,action,raw){paidCalls.push({action,raw});},pickAttachments(){onNative({type:'attachments',files:[{name:'语音测试资料.txt',text:'只供界面测试',images:[]}]});}};});
  await page.goto('http://127.0.0.1:8775/index.html');
  const voice=()=>page.locator('#voice-input');
  assert.equal(await voice().count(),1,'composer needs a real visible voice button');assert.ok((await voice().textContent()).includes('语音输入'));
  await page.locator('#prompt').fill('已有需求');await page.locator('#attach').click();await voice().click();
  assert.equal(await voice().isDisabled(),true);assert.equal(await page.locator('#start').isDisabled(),true);assert.equal(await page.evaluate(()=>voiceCalls.length),1);
  await page.evaluate(()=>onNative({type:'voice',id:'stale-id',text:'过期回调'}));assert.equal(await page.locator('#prompt').inputValue(),'已有需求');assert.equal(await voice().isDisabled(),true);
  await page.evaluate(()=>onNative({type:'voice',id:voiceCalls[0],text:'武汉有哪些鲜食工厂，整理成表格。'}));
  assert.equal(await page.locator('#prompt').inputValue(),'已有需求\n武汉有哪些鲜食工厂，整理成表格。');assert.equal(await voice().isDisabled(),false);assert.equal(await page.locator('.attachment').count(),1);assert.equal(await page.locator('#chat-search').getAttribute('aria-pressed'),'true');
  const saved=await page.locator('#prompt').inputValue();await page.evaluate(()=>onNative({type:'voice',id:voiceCalls[0],text:'重复回调'}));assert.equal(await page.locator('#prompt').inputValue(),saved);
  for(const result of [{cancelled:true},{error:'系统语音识别暂时不可用'},{text:''}]){await voice().click();await page.evaluate(result=>onNative({type:'voice',id:voiceCalls[voiceCalls.length-1],...result}),result);assert.equal(await page.locator('#prompt').inputValue(),saved);assert.equal(await voice().isDisabled(),false);}
  await page.evaluate(()=>{window.keyboardCalls=0;Android.showVoiceKeyboard=()=>keyboardCalls++;});await voice().click();await page.evaluate(()=>onNative({type:'voice',id:voiceCalls[voiceCalls.length-1],keyboard:true,message:'请点击系统输入法的麦克风'}));await page.waitForFunction(()=>keyboardCalls===1);assert.equal(await page.locator('#prompt').inputValue(),saved);assert.equal(await voice().isDisabled(),false);assert.equal(await page.locator('#prompt').evaluate(e=>e===document.activeElement),true);
  await page.locator('#prompt').fill('字'.repeat(11998));await voice().click();await page.evaluate(()=>onNative({type:'voice',id:voiceCalls[voiceCalls.length-1],text:'😀后续内容'}));assert.ok((await page.locator('#prompt').inputValue()).length<=12000);assert.ok(!/[\uD800-\uDBFF]$/.test(await page.locator('#prompt').inputValue()));
  await page.locator('#prompt').fill('');await voice().click();await page.evaluate(()=>onNative({type:'voice',id:voiceCalls[voiceCalls.length-1],text:'<script>不是代码，只是识别文字</script>'}));assert.equal(await page.locator('script:not([src])').count(),0);assert.equal(await page.locator('#prompt').inputValue(),'<script>不是代码，只是识别文字</script>');
  for(const big of [false,true])for(const width of [360,412,768]){await page.evaluate(big=>document.body.classList.toggle('bigtext',big),big);await page.setViewportSize({width,height:915});const box=await voice().boundingBox();assert.ok(box.height>=44&&box.width>=44);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
  assert.deepEqual(await page.evaluate(()=>paidCalls),[],'recognition never sends chat/search requests');assert.equal(await page.locator('[data-chat-entry]').count(),0);assert.deepEqual(errors,[]);
  console.log('Voice UI fixtures: visible microphone, correlated success/cancel/error/stale/duplicate results, preserved draft/attachments/search, input bounds, no auto-send, touch/mobile layouts. No live API.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
