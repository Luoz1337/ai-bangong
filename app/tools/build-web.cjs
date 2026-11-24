const fs=require('node:fs'),path=require('node:path');
let esbuild;try{esbuild=require('esbuild');}catch{esbuild=require('../../browser/node_modules/esbuild');}
const root=path.resolve(__dirname,'..');
for(const name of ['core.js','voice.js','app.js']){const from=path.join(root,'web-src',name),to=path.join(root,'assets',name);const result=esbuild.transformSync(fs.readFileSync(from,'utf8'),{target:'chrome61',charset:'utf8',minify:false,legalComments:'inline'});fs.writeFileSync(to+'.tmp',result.code);fs.renameSync(to+'.tmp',to);}
console.log('Bundled scripts compiled for Chrome/WebView 61+');
