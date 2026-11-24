const fs=require('node:fs'),path=require('node:path');
let esbuild;try{esbuild=require('esbuild');}catch{esbuild=require('../../browser/node_modules/esbuild');}
const source=path.resolve(__dirname,'../assets'),target=path.resolve(process.argv[2]);
fs.mkdirSync(target,{recursive:true});
for(const name of fs.readdirSync(source)){const input=path.join(source,name);if(!fs.statSync(input).isFile())throw Error('Unexpected asset folder');let data=fs.readFileSync(input);if(name.endsWith('.js'))data=esbuild.transformSync(data.toString('utf8'),{target:'chrome61',charset:'utf8',minify:true,legalComments:'none'}).code;fs.writeFileSync(path.join(target,name),data);}
console.log('Release-only JavaScript minification complete; development assets retained.');
