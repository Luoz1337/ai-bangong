const {test}=require('node:test'),assert=require('node:assert/strict');
const C=require('../assets/core.js');
const sheet=C.skills.find(s=>s.id==='sheet');
test('execution retains original task and overrides optimizer-only meta instructions',()=>{
 const msg=C.messages('execute',{originalPrompt:'查询武汉的大型视频加工厂并做成表格',prompt:'仅输出优化后的指令，不执行查询、不制作表格',skill:sheet,attachments:[]});
 assert.ok(msg[0].content.includes('原始需求优先'));
 assert.ok(msg[0].content.includes('不执行查询'));
 assert.ok(msg[1].content.includes('查询武汉的大型视频加工厂并做成表格'));
 assert.ok(msg[0].content.includes('table 为必填'));
 const optimization=C.messages('optimize',{prompt:'查询企业并制表',skill:sheet});assert.ok(optimization[0].content.includes('任务书的读者是执行助手'));
});
test('query plus spreadsheet/PPT/PDF can trigger search while local document work does not',()=>{
 assert.equal(C.needsSearch(sheet,'查询武汉的大型视频加工厂并做成表格'),true);
 assert.equal(C.needsSearch(C.skills.find(s=>s.id==='pdf'),'查找最新消防规定并写成报告'),true);
 assert.equal(C.needsSearch(sheet,'做一个部门费用空白模板'),false);
 assert.equal(C.needsSearch(C.skills[0],'消防演练准备事项'),true);
});
test('missing table repairs once using original task and previous answer, without re-optimizing',async()=>{
 const calls=[];const p=new C.Pipeline(async(stage,body)=>{calls.push([stage,body]);if(stage==='optimize')return '仅输出优化需求，不执行任务';if(stage==='execute')return JSON.stringify({title:'查询结果',summary:'暂未核实来源',sections:[]});return JSON.stringify({title:'查询结果',summary:'暂无已核实记录',sections:[],table:{columns:['名称','来源','核实状态'],rows:[]}});});
 const result=await p.start('查询企业并做表',sheet,[],false);
 assert.deepEqual(calls.map(c=>c[0]),['optimize','execute','repair']);assert.equal(calls[1][1].originalPrompt,'查询企业并做表');assert.equal(calls[2][1].originalPrompt,'查询企业并做表');assert.ok(calls[2][1].previousResponse.includes('暂未核实来源'));assert.equal(result.table.rows.length,0);assert.equal(p.state,'done');
});
test('repair cannot invent success; failure preserves received partial answer and stops',async()=>{
 const calls=[];const p=new C.Pipeline(async(stage)=>{calls.push(stage);return stage==='optimize'?'制作表格':'{"title":"已返回的说明","summary":"信息还未核实","sections":[]}';});
 await assert.rejects(p.start('做表格',sheet,[],false),/表格/);assert.deepEqual(calls,['optimize','execute','repair']);assert.equal(p.state,'error');assert.equal(p.partialResult.summary,'信息还未核实');
});
test('malformed JSON repairs once and receives original response as data',async()=>{
 const calls=[];const p=new C.Pipeline(async(stage,body)=>{calls.push(stage);if(stage==='optimize')return '直接写报告';if(stage==='execute')return '报告内容，没有结构';assert.equal(body.previousResponse,'报告内容，没有结构');return '{"title":"报告","summary":"报告内容，没有结构","sections":[]}';});
 await p.start('写报告',C.skills.find(s=>s.id==='pdf'),[],false);assert.deepEqual(calls,['optimize','execute','repair']);
});
