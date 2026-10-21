const fs=require('node:fs'),path=require('node:path'),{spawn}=require('node:child_process');
const root=path.resolve(__dirname,'..'),port=Number(process.env.MIFO_SIM_PORT||8765),url=`http://127.0.0.1:${port}`;
async function health(){try{const response=await fetch(url+'/health',{signal:AbortSignal.timeout(2000)});const data=await response.json();if(data.app!=='mifozov-battle-lab')throw Error('Port is used by another application');return true;}catch(error){if(error.cause?.code==='ECONNREFUSED')return false;throw error;}}
(async()=>{
 if(!Number.isInteger(port)||port<1024||port>65535)throw Error('Invalid local port');
 if(!await health()){
  const logs=path.join(root,'.local/web');fs.mkdirSync(logs,{recursive:true});
  const child=spawn(process.execPath,[path.join(root,'web/server.mjs')],{cwd:root,env:{...process.env,MIFO_SIM_PORT:String(port)},windowsHide:true,detached:true,stdio:['ignore',fs.openSync(path.join(logs,'output.log'),'a'),fs.openSync(path.join(logs,'errors.log'),'a')]});child.on('error',error=>console.error(error.message));child.unref();
  let ready=false;for(let attempt=0;attempt<40;attempt++){await new Promise(resolve=>setTimeout(resolve,150));if(await health()){ready=true;break;}}if(!ready)throw Error('Local server did not start');
 }
 console.log(url);
 if(!process.argv.includes('--no-open')){const [program,args]=process.platform==='win32'?['cmd.exe',['/c','start','',url]]:process.platform==='darwin'?['open',[url]]:['xdg-open',[url]];const child=spawn(program,args,{windowsHide:true,detached:true,stdio:'ignore'});child.on('error',error=>console.error(error.message));child.unref();}
})().catch(error=>{console.error(error.message);process.exitCode=1;});
