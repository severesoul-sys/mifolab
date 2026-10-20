import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url));
const port=Number(process.env.MIFO_SIM_PORT||8765);
const mime={'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.csv':'text/csv; charset=utf-8'};
const server=http.createServer((request,response)=>{
  if(request.method!=='GET'&&request.method!=='HEAD'){response.writeHead(405);response.end();return;}
  let name;try{name=decodeURIComponent(new URL(request.url,'http://localhost').pathname);}catch{response.writeHead(400);response.end();return;}
  if(name==='/health'){response.writeHead(200,{'Content-Type':'application/json'});response.end(JSON.stringify({app:'mifozov-battle-lab'}));return;}
  const target=path.resolve(root,'.'+(name==='/'?'/index.html':name));
  if(!target.startsWith(root+path.sep)||name.includes('..')||!['.html','.js','.css','.json','.svg','.png','.csv'].includes(path.extname(target))){response.writeHead(404);response.end();return;}
  fs.stat(target,(error,stat)=>{
    if(error||!stat.isFile()){response.writeHead(404);response.end('Not found');return;}
    response.writeHead(200,{'Content-Type':mime[path.extname(target)],'Content-Length':stat.size,'Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});
    if(request.method==='HEAD')response.end();else fs.createReadStream(target).pipe(response);
  });
});
server.on('error',error=>{console.error(error.message);process.exitCode=1;});
server.listen(port,'127.0.0.1',()=>console.log(`Mifozov Battle Lab: http://127.0.0.1:${port}`));
