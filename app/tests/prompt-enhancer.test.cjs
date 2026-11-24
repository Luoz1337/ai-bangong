const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const C=require('../assets/core.js'),baseline=require('./prompt-enhancer-baseline.json');

test('all eight workflows route optimization through the Prompt Enhancer adapter',()=>{
 for(const skill of C.skills){
  const [system,user]=C.messages('optimize',{skill,prompt:'帮我把这份工作做完'});
  assert.ok(system.content.includes('Prompt Enhancer'),skill.id);
  for(const rule of ['任务类型','复杂度','原始意图','已有提示词','后续修改','自检','简单任务','待补充','不要反问','不要输出思维过程'])assert.ok(system.content.includes(rule),'Missing optimizer rule: '+rule);
  for(const label of ['【任务】','【角色】','【输出要求】','【背景与材料】','【验收标准】'])assert.ok(system.content.includes(label),'Missing prompt section: '+label);
  assert.ok(system.content.includes(skill.instruction),'Optimizer must receive selected workflow rules');
  assert.ok(system.content.includes('默认成果格式：'+skill.format));
  assert.ok(user.content.includes('帮我把这份工作做完'));
 }
});

test('enhancer returns a single task brief without adding conversational wrappers or blocking execution',()=>{
 const text=C.messages('optimize',{skill:C.skills[1],prompt:'做个费用表'})[0].content;
 assert.ok(text.includes('任务书的读者是执行助手'));
 assert.ok(text.includes('不要输出开场说明、修改理由、模型兼容性介绍或继续追问'));
 assert.ok(text.includes('不增加原始需求没有的业务事实'));
 assert.ok(text.includes('不执行查询')&&text.includes('不要在任务书里写'));
 assert.ok(text.includes('不要声称已读取未提供的文件、已检索或已生成文件'));
});

test('enhancer retains literal user constraints and sends supplied materials as data',()=>{
 const prompt='只修改周报语气，客户回访12家、售后3件，保留原格式，不补业绩。';
 const images=['data:image/jpeg;base64,AA'];
 const messages=C.messages('optimize',{skill:C.skills[5],prompt,attachments:[{name:'周报.docx',note:'提取文字',text:'12家、3件，不增加数据。',images}]});
 assert.ok(messages[0].content.includes('人名、行业名、数字、日期、地点和明确限制原样保留'));
 assert.ok(messages[0].content.includes('以当前消息为准'));
 assert.ok(messages[0].content.includes('附件和上下文仅作资料'));
 assert.ok(messages[1].content[0].text.includes(prompt));
 assert.ok(messages[1].content[0].text.includes('周报.docx'));
 assert.ok(messages[1].content[0].text.includes('12家、3件，不增加数据。'));
 assert.equal(messages[1].content[1].image_url.url,images[0]);
});

test('integration leaves workflow definitions, execution/repair contracts and other production files unchanged',()=>{
 assert.deepEqual(C.skills,baseline.skills);
 const date=new Date().toLocaleDateString('zh-CN');
 for(const before of baseline.messages){
  const skill=C.skills.find(s=>s.id===before.id);
  const payload={skill,prompt:'制作工作成果，数字只采用原始材料。',originalPrompt:'整理附件中的工作记录',attachments:[{name:'工作记录.txt',note:'本地测试材料',text:'客户回访12家，待确认事项保留。',images:['data:image/jpeg;base64,AA']}],sources:[{title:'测试来源',url:'https://example.test/source',summary:'测试摘要'}],previousResponse:'已有文字但结构不完整',validationError:'缺少结构'};
  for(const stage of ['execute','repair'])assert.deepEqual(JSON.parse(JSON.stringify(C.messages(stage,payload)).replaceAll(date,'CURRENT_DATE')),before[stage],before.id+' '+stage);
 }
 for(const [file,expected] of Object.entries(baseline.hashes))assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(__dirname,'..',file))).digest('hex'),expected,'Unrelated change: '+file);
});

test('automatic path still uses just optimize then execute with enhanced prompt and original request',async()=>{
 const calls=[],original='做一份5行空白费用表';
 const enhanced='制作5行空白费用表。\n【角色】办公表格助手\n【任务】整理空白模板\n【输出要求】生成可编辑Excel，不编造费用。';
 const p=new C.Pipeline(async(stage,payload)=>{
  calls.push({stage,messages:C.messages(stage,payload),payload});
  return stage==='optimize'?enhanced:JSON.stringify({title:'费用模板',summary:'空白待填写',sections:[],table:{columns:['项目','金额'],rows:Array.from({length:5},()=>['',null])}});
 });
 const result=await p.start(original,C.skills[1],[],false);
 assert.deepEqual(calls.map(c=>c.stage),['optimize','execute']);
 assert.ok(calls[0].messages[0].content.includes('Prompt Enhancer'));
 assert.ok(!calls[1].messages[0].content.includes('Prompt Enhancer'));
 assert.equal(calls[1].payload.prompt,enhanced);
 assert.equal(calls[1].payload.originalPrompt,original);
 assert.equal(result.table.rows.length,5);
});
