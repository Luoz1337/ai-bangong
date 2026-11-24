const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(process.argv[2]||path.join(__dirname,'../assets'));
http.createServer((req,res)=>{const p=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!p.startsWith(root+path.sep)){res.writeHead(403).end();return;}fs.readFile(p,(e,b)=>res.writeHead(e?404:200,{'Content-Type':p.endsWith('.css')?'text/css':p.endsWith('.js')?'text/javascript':'text/html; charset=utf-8'}).end(e?'':b));}).listen(8775,'127.0.0.1',()=>console.log('Test assets: '+root));
