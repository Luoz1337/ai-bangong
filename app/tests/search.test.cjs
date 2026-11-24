const {test}=require('node:test'),assert=require('node:assert/strict');
const C=require('../assets/core.js');
const sheet=C.skills.find(s=>s.id==='sheet'),pdf=C.skills.find(s=>s.id==='pdf');

test('search fix changes no other core logic or UI/transport code',()=>{
 const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),baseline=require('./search-scope.json');
 const core=fs.readFileSync(path.join(__dirname,'../web-src/core.js'),'utf8').replace(/\r\n/g,'\n');
 const a=core.indexOf(' function needsSearch('),b=core.indexOf(' function outputContract(',a);
 const app=fs.readFileSync(path.join(__dirname,'../web-src/app.js'),'utf8').replace(/\r\n/g,'\n').replace('if(C.needsSearch(payload.skill,query,payload.prompt))','if(C.needsSearch(payload.skill,query))');
 const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
 assert.equal(hash(core.slice(0,a)+core.slice(b)),baseline.coreWithoutSearch);
 assert.equal(hash(app),baseline.appBeforeCallChange);
});

test('actual phone request in conversational Chinese triggers public information search',()=>{
 const original='你能不能帮我整一下武汉这边有哪些那个鲜食工厂，然后帮忙做成一个表格，里面还有他工厂的名称，他主要是做什么产品的，他的位置在哪里，包括他的规模和备注。';
 assert.equal(C.needsSearch(sheet,original),true);
 for(const prompt of ['帮我找几个武汉的鲜食厂家，做成表格','武汉有哪些食品企业？','整理一下武汉鲜食工厂清单','附近哪里有食品加工厂'])assert.equal(C.needsSearch(sheet,prompt),true,prompt);
});

test('enhanced task brief can request retrieval when original wording has no query keyword',()=>{
 assert.equal(C.needsSearch(sheet,'帮我整一份武汉鲜食工厂的表格','整理武汉鲜食工厂清单。先检索公开资料，核验来源后填写名称、产品、位置和规模。'),true);
 assert.equal(C.needsSearch(pdf,'做一份行业报告','先查找公开行业报告，标明来源和信息时效，再生成报告。'),true);
});

test('offline preference and local-only attachment tasks do not become internet lookups',()=>{
 for(const prompt of ['不要联网，只整理我上传的供应商名单','不需要联网，制作空白企业登记表','无需上网，仅根据附件整理工厂清单','不用联网，整理已有资料'])assert.equal(C.needsSearch(sheet,prompt,'检索企业公开信息'),false,prompt);
 assert.equal(C.needsSearch(C.skills[0],'不要联网，只整理附件'),false);
 assert.equal(C.needsSearch(sheet,'把上传的工厂名单整理成表格','核验检索资料后输出'),false);
 assert.equal(C.needsSearch(pdf,'根据这份资料列出有哪些工作问题'),false);
 assert.equal(C.needsSearch(sheet,'仅根据提供的资料整理企业清单','检索企业信息并制作表格'),false);
});

test('explicit web requests override local-material shortcut, while ordinary office work stays offline',()=>{
 assert.equal(C.needsSearch(sheet,'结合附件上网补全供应商地址'),true);
 assert.equal(C.needsSearch(pdf,'使用上传资料并查询最新政策'),true);
 assert.equal(C.needsSearch(pdf,'请从互联网找资料制作报告'),true);
 for(const prompt of ['做一份5行空白费用表','总结今天的工作','有哪些工作需要安排？','做一份办公室节能方案'])assert.equal(C.needsSearch(sheet,prompt),false,prompt);
 assert.equal(C.needsSearch(sheet,'做一份空白费用表','本任务无需联网检索；制作空白模板，未查询外部资料。'),false);
});
