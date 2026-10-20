import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const files=execFileSync('git',['ls-files','-z'],{cwd:root,encoding:'utf8',windowsHide:true}).split('\0').filter(Boolean);
if(!files.length)throw Error('No tracked files. Add the reviewed source files to Git first.');
const problems=[];
for(const file of files){
 if(/(^|\/)(?:\.local|\.build|dist|node_modules|build)\//.test(file)||/\.(?:p12|pfx|jks|keystore|pem|key|apk|aab|log)$/i.test(file)||/(^|\/)\.env(?:\.|$)/.test(file)||/password.*\.txt$/i.test(file))problems.push(file+': forbidden publication path');
 if(!/\.(?:js|mjs|cjs|java|xml|svg|html|css|json|md|yml|yaml)$/.test(file))continue;
 const value=fs.readFileSync(path.join(root,file),'utf8');
 if(/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(value)||/\bgh[pousr]_[A-Za-z0-9]{30,}\b/.test(value)||/\bgithub_pat_[A-Za-z0-9_]{40,}\b/.test(value))problems.push(file+': credential-like content');
 if(/[A-Z]:[\\/]altermon[\\/]|[A-Z]:[\\/]Users[\\/]ap[\\/]/i.test(value))problems.push(file+': author-specific local path');
}
if(problems.length){console.error(problems.join('\n'));process.exitCode=1;}else console.log('Publication check passed: '+files.length+' tracked source files.');
