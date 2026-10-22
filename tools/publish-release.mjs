import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const repo='severesoul-sys/mifolab',args=process.argv.slice(2),check=args.includes('--check');
const notesIndex=args.indexOf('--notes'),notes=notesIndex<0?null:path.resolve(args[notesIndex+1]||'');
for(let i=0;i<args.length;i++){
    if(args[i]==='--check')continue;
    if(args[i]==='--notes'&&args[i+1]&&!args[i+1].startsWith('--')){i++;continue;}
    throw Error('Usage: node tools/publish-release.mjs --notes release-notes.md [--check]');
}
const manifest=fs.readFileSync(path.join(root,'android/app/src/main/AndroidManifest.xml'),'utf8');
const version=manifest.match(/android:versionName="([^"]+)"/)[1],tag='v'+version;
const apk=path.join(root,'dist/mifolab.apk'),checksum=apk+'.sha256',metadata=JSON.parse(fs.readFileSync(apk+'.json','utf8'));
const sha256=createHash('sha256').update(fs.readFileSync(apk)).digest('hex');
if(metadata.mode!=='release'||metadata.package!=='ru.mifolab.android'||metadata.version!==version||metadata.versionCode!==Number(manifest.match(/android:versionCode="(\d+)"/)[1])||!metadata.signerSha256||metadata.sha256!==sha256)throw Error('Build a signed release matching the current Android manifest first');
if(fs.readFileSync(checksum,'utf8').trim()!==sha256+'  mifolab.apk')throw Error('The checksum file must refer to mifolab.apk');
if(notes&&!fs.existsSync(notes))throw Error('Release notes file not found');
console.log('Verified '+tag+': mifolab.apk · SHA-256 '+sha256);
if(check){console.log('Local check only; no network or publication.');process.exit(0);}
const windows=process.platform==='win32',installed='C:/Program Files/GitHub CLI/gh.exe';
const gh=windows&&fs.existsSync(installed)?installed:'gh';
function run(args){return execFileSync(gh,args,{cwd:root,windowsHide:true,encoding:'utf8',stdio:['inherit','pipe','pipe'],timeout:180000}).trim();}
function view(){return JSON.parse(run(['release','view',tag,'--repo',repo,'--json','url,tagName,isDraft,assets']));}
let release;
try{release=view();}catch(error){
    const message=String(error.stderr||'');
    if(!/release not found|HTTP 404/i.test(message))throw error;
    if(!notes)throw Error('Pass --notes for a new release');
    // The caller publishes the reviewed source tag first. Keep the release a
    // draft until both stable-named assets have been uploaded and verified.
    run(['release','create',tag,'--repo',repo,'--verify-tag','--draft','--title','Mifo Lab '+version,'--notes-file',notes]);release=view();
}
for(const file of [apk,checksum]){
    const name=path.basename(file),hash=createHash('sha256').update(fs.readFileSync(file)).digest('hex');
    const existing=release.assets.find(asset=>asset.name===name);
    if(existing){if(existing.digest!=='sha256:'+hash||existing.size!==fs.statSync(file).size)throw Error(name+' already exists with different content; publish a new version');}
    else run(['release','upload',tag,file,'--repo',repo]);
}
release=view();
for(const file of [apk,checksum]){
    const asset=release.assets.find(row=>row.name===path.basename(file)),hash=createHash('sha256').update(fs.readFileSync(file)).digest('hex');
    if(!asset||asset.digest!=='sha256:'+hash||asset.size!==fs.statSync(file).size)throw Error('Uploaded asset verification failed');
}
if(release.isDraft)run(['release','edit',tag,'--draft=false','--latest','--repo',repo]);
console.log('Release: '+view().url);
console.log('Permanent download: https://github.com/'+repo+'/releases/latest/download/mifolab.apk');
