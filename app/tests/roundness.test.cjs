const {chromium}=(()=>{try{return require('playwright')}catch{return require('../../browser/node_modules/playwright')}})();
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 try{const page=await browser.newPage({viewport:{width:412,height:915}});await page.goto('http://127.0.0.1:8775/index.html');
  const checks={'#start':999,'#chat-search':999,'#voice-input':999,'.compose-box':28,'.chat-avatar':16};
  for(const [selector,min] of Object.entries(checks))assert.ok(await page.locator(selector).first().evaluate((e,min)=>parseFloat(getComputedStyle(e).borderTopLeftRadius)>=min,min),selector);
  await page.locator('nav [data-nav="skills"]').click();assert.ok(await page.locator('.workflow').first().evaluate(e=>parseFloat(getComputedStyle(e).borderTopLeftRadius)>=24));
  await page.locator('nav [data-nav="settings"]').click();assert.ok(await page.locator('.card').first().evaluate(e=>parseFloat(getComputedStyle(e).borderTopLeftRadius)>=24));assert.ok(await page.locator('#api-base').evaluate(e=>parseFloat(getComputedStyle(e).borderTopLeftRadius)>=18));
  const theme=await page.evaluate(()=>{const s=getComputedStyle(document.documentElement);return [s.getPropertyValue('--bg').trim(),s.getPropertyValue('--accent').trim()]});assert.deepEqual(theme,['#0d1423','#8acbff']);
  // Removing the roundness layer must not alter element geometry or colors on any page.
  for(const screen of ['home','skills','history','settings']){await page.locator('nav [data-nav="'+screen+'"]').click();await page.waitForTimeout(350);
   const inspect=()=>page.evaluate(()=>[...document.querySelectorAll('button,input,.card,.workflow,.history,.chat-composer,.compose-box,.chat-avatar')].map(e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return [e.id,e.tagName,r.x,r.y,r.width,r.height,s.backgroundColor,s.color]}));
   const rounded=await inspect();await page.locator('link[href="roundness.css"]').evaluate(e=>e.disabled=true);assert.deepEqual(await inspect(),rounded,'roundness must be radius-only: '+screen);await page.locator('link[href="roundness.css"]').evaluate(e=>e.disabled=false);
  }
  const css=fs.readFileSync(path.join(__dirname,'../assets/roundness.css'),'utf8').replace(/\/\*[\s\S]*?\*\//g,'');assert.ok([...css.matchAll(/\{([^}]+)\}/g)].every(m=>m[1].trim().split(';').filter(Boolean).every(rule=>rule.trim().startsWith('border-radius:'))));
  console.log('Roundness: pill buttons, rounded cards/inputs/bubbles; stylesheet changes only border radii, not geometry, colors or other behavior.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
