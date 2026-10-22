import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createHash,randomBytes} from 'node:crypto';
import {createRequire} from 'node:module';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const android=path.join(root,'android'),web=path.join(root,'web'),require=createRequire(import.meta.url);
const flags=new Set(process.argv.slice(2));
if([...flags].some(flag=>!['--debug','--release','--unsigned'].includes(flag))||flags.size>1)throw Error('Choose --debug (default), --release, or --unsigned');
const mode=flags.has('--release')?'release':flags.has('--unsigned')?'unsigned':'debug',debug=mode==='debug';
const windows=process.platform==='win32',exe=name=>name+(windows?'.exe':'');
const sdkDefault=windows?path.join(process.env.LOCALAPPDATA||path.join(os.homedir(),'AppData/Local'),'Android/Sdk'):process.platform==='darwin'?path.join(os.homedir(),'Library/Android/sdk'):path.join(os.homedir(),'Android/Sdk');
const sdk=process.env.ANDROID_SDK_ROOT||process.env.ANDROID_HOME||sdkDefault;
if(!fs.existsSync(path.join(sdk,'build-tools')))throw Error('Set ANDROID_SDK_ROOT to an Android SDK with platforms and build-tools installed');
const newest=(directory,pattern)=>fs.readdirSync(directory).filter(name=>pattern.test(name)).sort((a,b)=>a.localeCompare(b,undefined,{numeric:true})).at(-1);
const toolsVersion=process.env.MIFOLAB_BUILD_TOOLS||newest(path.join(sdk,'build-tools'),/^\d+\.\d+\.\d+$/);
const platformVersion=process.env.MIFOLAB_PLATFORM||newest(path.join(sdk,'platforms'),/^android-\d+(?:\.\d+)?$/);
if(!toolsVersion||!platformVersion)throw Error('Install Android platform 36+ and Android Build Tools 36.0.0+');
const buildTools=path.join(sdk,'build-tools',toolsVersion);
const studioJava=windows?'C:/Program Files/Android/Android Studio/jbr':process.platform==='darwin'?'/Applications/Android Studio.app/Contents/jbr/Contents/Home':null;
const javaHome=process.env.JAVA_HOME||(studioJava&&fs.existsSync(studioJava)?studioJava:null);
const jdk=name=>javaHome?path.join(javaHome,'bin',exe(name)):exe(name);
const java=jdk('java'),javac=jdk('javac'),jar=jdk('jar'),keytool=jdk('keytool'),aapt2=path.join(buildTools,exe('aapt2'));
const run=(program,args)=>execFileSync(program,args,{cwd:root,windowsHide:true,stdio:'inherit'});
const capture=(program,args)=>execFileSync(program,args,{cwd:root,windowsHide:true,encoding:'utf8',maxBuffer:4*1024*1024});
const mkdir=directory=>fs.mkdirSync(directory,{recursive:true});
const walk=directory=>fs.existsSync(directory)?fs.readdirSync(directory,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?walk(path.join(directory,entry.name)):[path.join(directory,entry.name)]):[];
let key,passwordFile,alias;
if(mode==='release'){
  key=process.env.MIFOLAB_KEYSTORE;passwordFile=process.env.MIFOLAB_STORE_PASSWORD_FILE;alias=process.env.MIFOLAB_KEY_ALIAS||'mifolab';
  if(!key||!passwordFile||!fs.existsSync(key)||!fs.existsSync(passwordFile))throw Error('Release signing requires MIFOLAB_KEYSTORE and MIFOLAB_STORE_PASSWORD_FILE; keep both outside Git');
}
const build=path.join(root,'.build',new Date().toISOString().replace(/[:.]/g,'-'));
for(const name of ['gen','classes','dex','assets/web'])mkdir(path.join(build,name));
const platform=path.join(build,'android.jar');fs.copyFileSync(path.join(sdk,'platforms',platformVersion,'android.jar'),platform);
const assets=['squads.js','squad-ui.js','squads.css','index.html','styles.css','raids.css','icons.css','upgrade.css','icon-raids.png','icon-yard.svg','catalog.js','chronicle-data.js','spirit-search.js','core.js','upgrade-data.js','upgrade-core.js','upgrade-ui.js','rankings.js','species-picker.js','collection-core.js','collection-ui.js','collection-worker.js','raid-data.js','raid-core.js','raid-ui.js','raid-worker.js','rank-worker.js','app.js'];
for(const name of assets)fs.copyFileSync(path.join(web,name),path.join(build,'assets/web',name));
for(const name of ['native-app.js','mobile.css','compact.css'])fs.copyFileSync(path.join(android,'web',name),path.join(build,'assets/web',name));
const indexPath=path.join(build,'assets/web/index.html');
const html=fs.readFileSync(indexPath,'utf8').replace('<html lang="ru">','<html lang="ru" class="android-app">').replace('width=device-width, initial-scale=1','width=device-width, initial-scale=1, viewport-fit=cover').replace('</head>','  <link rel="stylesheet" href="mobile.css">\n  <link rel="stylesheet" href="compact.css">\n  <script defer src="native-app.js"></script>\n</head>');
fs.writeFileSync(indexPath,html);
fs.writeFileSync(path.join(build,'assets/battle-catalog.json'),JSON.stringify(require(path.join(web,'raid-data.js')).catalog));
if(debug){mkdir(path.join(build,'assets/test'));fs.copyFileSync(path.join(web,'tests/fixtures/android-collection.json'),path.join(build,'assets/test/collection.json'));}
let manifest=fs.readFileSync(path.join(android,'app/src/main/AndroidManifest.xml'),'utf8');
const version=manifest.match(/android:versionName="([^"]+)"/)[1],versionCode=Number(manifest.match(/android:versionCode="(\d+)"/)[1]);
manifest=manifest.replace('<application ',`<application android:debuggable="${debug}" `);
if(debug)manifest=manifest.replace('</application>','<activity android:name=".TestActivity" android:exported="false" android:configChanges="orientation|screenSize|keyboardHidden|smallestScreenSize|screenLayout" /></application>').replace('</manifest>','<instrumentation android:name="ru.mifolab.android.CoreTestRunner" android:targetPackage="ru.mifolab.android" android:label="Mifo Lab offline tests" /></manifest>');
fs.writeFileSync(path.join(build,'AndroidManifest.xml'),manifest);
mkdir(path.join(build,'gen/ru/mifolab/android'));
fs.writeFileSync(path.join(build,'gen/ru/mifolab/android/BuildConfig.java'),`package ru.mifolab.android; public final class BuildConfig { public static final boolean DEBUG=${debug}; public static final String VERSION_NAME="${version}"; }`);
run(aapt2,['compile','--dir',path.join(android,'app/src/main/res'),'-o',path.join(build,'resources.zip')]);
run(aapt2,['link','-I',platform,'--manifest',path.join(build,'AndroidManifest.xml'),'--java',path.join(build,'gen'),'--min-sdk-version','26','--target-sdk-version','36','-o',path.join(build,'unsigned.apk'),path.join(build,'resources.zip')]);
const sources=[...walk(path.join(android,'app/src/main/java')),...walk(path.join(build,'gen')),...debug?walk(path.join(android,'app/src/debug/java')):[]].filter(name=>name.endsWith('.java'));
const args=['-encoding','UTF-8','-source','8','-target','8','-classpath',platform,'-d',path.join(build,'classes'),...sources];
fs.writeFileSync(path.join(build,'javac.args'),args.map(arg=>'"'+arg.replaceAll('\\','/')+'"').join('\n'));run(javac,['@'+path.join(build,'javac.args')]);
run(jar,['cf',path.join(build,'classes.jar'),'-C',path.join(build,'classes'),'.']);
run(java,['-cp',path.join(buildTools,'lib/d8.jar'),'com.android.tools.r8.D8','--lib',platform,'--min-api','26','--output',path.join(build,'dex'),path.join(build,'classes.jar')]);
// jar keeps nested asset names portable on Windows and Unix.
run(jar,['uf',path.join(build,'unsigned.apk'),'-C',build,'assets','-C',path.join(build,'dex'),'classes.dex']);
run(path.join(buildTools,exe('zipalign')),['-f','4',path.join(build,'unsigned.apk'),path.join(build,'aligned.apk')]);
const output=path.join(root,'dist');mkdir(output);
const apk=path.join(output,`mifolab-${version}${mode==='release'?'':'-'+mode}.apk`);
if(debug){
  const signing=path.join(root,'.local/development-signing');mkdir(signing);
  key=path.join(signing,'debug.p12');passwordFile=path.join(signing,'password.txt');alias='mifolab-dev';
  if(!fs.existsSync(key)){
    if(!fs.existsSync(passwordFile))fs.writeFileSync(passwordFile,randomBytes(32).toString('base64url'),{mode:0o600});
    run(keytool,['-genkeypair','-keystore',key,'-storetype','PKCS12','-storepass:file',passwordFile,'-keypass:file',passwordFile,'-alias',alias,'-keyalg','RSA','-keysize','3072','-validity','10000','-dname','CN=Mifo Lab Development']);
  }
  if(!fs.existsSync(passwordFile))throw Error('Development signing password is missing; restore it or use another local checkout');
}
const signer=path.join(buildTools,'lib/apksigner.jar');let signerSha256=null;
if(mode==='unsigned')fs.copyFileSync(path.join(build,'aligned.apk'),apk);
else{
  run(java,['-jar',signer,'sign','--ks',key,'--ks-key-alias',alias,'--ks-pass','file:'+passwordFile,'--out',apk,path.join(build,'aligned.apk')]);
  run(java,['-jar',signer,'verify','--verbose',apk]);
  signerSha256=capture(java,['-jar',signer,'verify','--print-certs',apk]).match(/certificate SHA-256 digest: ([a-f0-9]+)/i)?.[1]||null;
}
const badging=capture(aapt2,['dump','badging',apk]);
if(!badging.includes(`package: name='ru.mifolab.android' versionCode='${versionCode}' versionName='${version}'`))throw Error('Wrong package/version');
if(/^application-debuggable/m.test(badging)!==debug)throw Error('Wrong debuggable flag');
const entries=capture(jar,['tf',apk]);
if(!entries.includes('assets/web/index.html')||entries.includes('\\')||/assets\/web\/[^\n]*\.md/i.test(entries))throw Error('Invalid packaged assets');
if(!debug&&(entries.includes('assets/test/')||capture(aapt2,['dump','xmltree',apk,'--file','AndroidManifest.xml']).includes('CoreTestRunner')))throw Error('Test code found in release');
const permissions=badging.split('\n').filter(line=>line.startsWith('uses-permission:'));
if(permissions.length!==1||!permissions[0].includes('android.permission.INTERNET'))throw Error('Unexpected app permissions');
const sha256=createHash('sha256').update(fs.readFileSync(apk)).digest('hex');
const metadata={package:'ru.mifolab.android',version,versionCode,mode,minSdk:26,targetSdk:36,sha256,signerSha256,webAssets:Object.fromEntries(walk(path.join(build,'assets/web')).map(file=>[path.basename(file),createHash('sha256').update(fs.readFileSync(file)).digest('hex')]))};
fs.writeFileSync(apk+'.json',JSON.stringify(metadata,null,2)+'\n');
fs.writeFileSync(apk+'.sha256',sha256+'  '+path.basename(apk)+'\n');
console.log('APK: '+apk);
