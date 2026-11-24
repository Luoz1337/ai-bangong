const {test}=require('node:test'),assert=require('node:assert/strict');
const V=require('../assets/voice.js');
test('recognized text fills an empty draft and is trimmed',()=>{assert.deepEqual(V.appendDraft('','  帮我做一份周报。  '),{text:'帮我做一份周报。',added:true,truncated:false});});
test('recognition retains existing draft and appends without duplicating whitespace',()=>{
 assert.equal(V.appendDraft('已有文字','语音补充').text,'已有文字\n语音补充');
 assert.equal(V.appendDraft('已有文字\n','语音补充').text,'已有文字\n语音补充');
 assert.deepEqual(V.appendDraft('已有文字','  '),{text:'已有文字',added:false,truncated:false});
});
test('recognized text respects input limit without breaking surrogate pairs',()=>{
 const r=V.appendDraft('字'.repeat(11997),'😀补充');assert.ok(r.text.length<=12000);assert.equal(r.truncated,true);assert.ok(!/[\uD800-\uDBFF]$/.test(r.text));
 const full='字'.repeat(12000);assert.deepEqual(V.appendDraft(full,'补充'),{text:full,added:false,truncated:true});
 const tight='字'.repeat(11998);assert.deepEqual(V.appendDraft(tight,'😀'),{text:tight,added:false,truncated:true});
});
