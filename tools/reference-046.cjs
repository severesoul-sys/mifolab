// Load only reviewed pure data/formulas from a locally supplied public client.
const fs=require('node:fs'),vm=require('node:vm'),crypto=require('node:crypto');
const SHA='b4842122568b98bf39a45b155b97a1a2a57a6a44bd4aa7d948f6deab5f205a2d';
const URL='https://mifozov.com/assets/index-CwPus7qr.js';
function load(file=process.env.MIFOLAB_REFERENCE_046){
 if(!file)throw Error('Set MIFOLAB_REFERENCE_046 to the reviewed local Mifozov 0.46 client');
 const source=fs.readFileSync(file,'utf8');
 if(crypto.createHash('sha256').update(source).digest('hex')!==SHA)throw Error('Client hash changed: review extraction before proceeding');
 function balanced(start){let depth=0,quote='',escape=false;for(let i=start;i<source.length;i++){const c=source[i];if(quote){if(escape){escape=false;continue;}if(c==='\\'){escape=true;continue;}if(c===quote)quote='';continue;}if('"\'`'.includes(c)){quote=c;continue;}if('([{'.includes(c))depth++;if(')]}'.includes(c)&&!--depth)return source.slice(start,i+1);}throw Error('Unbalanced client block');}
 function slice(start,end){const from=source.indexOf(start),to=source.indexOf(end,from);if(from<0||to<from)throw Error('Missing client block '+start);return source.slice(from,to);}
 function fn(name){const start=source.indexOf('function '+name+'('),body=source.indexOf('{',start);if(start<0)throw Error('Missing function '+name);return source.slice(start,body)+balanced(body);}
 const rules=vm.runInNewContext('('+balanced(source.indexOf('{',source.indexOf('var p=')))+')',{}, {timeout:1000});
 function context(){
  const ctx=vm.createContext({});
  const classAt=source.indexOf('var On=class'),body=source.indexOf('{',classAt);
  const pure='var p='+JSON.stringify(rules)+';'+slice('var ke=[',',ze={')+';var '+slice('m=[`voda`','var x=')+
   slice('var x=','var D=')+fn('ye')+fn('be')+slice('function Ue(','function qe(')+
   'var un=Object.fromEntries(m.map(type=>[type,{fast:type,ultra:type}]));'+slice('function dn(','var On=class')+
   source.slice(classAt,body)+balanced(body)+';var Yn=e=>({...e,stats:{...e.stats,sila:Math.round(e.stats.sila*(1+p.brew.silaBuff))}});';
  vm.runInContext(pure,ctx,{timeout:1000});return ctx;
 }
 const ctx=context(),data=JSON.parse(vm.runInContext('JSON.stringify({species:Ie.map(({id,name,rarity,elements,base})=>({id,name,rarity,elements,base})),retired:[...Le],chronicle:Re.map((s,i)=>({speciesId:s.id,name:s.name,number:i+1})),runes:Cn})',ctx));
 if(!source.includes('String(Re.indexOf(e)+1).padStart(3,`0`)')||data.species.length!==148||data.chronicle.length!==138)throw Error('Unexpected 0.46 catalogue');
 const notes=[...source.matchAll(/\{version:`0\.(?:45|46)`,date:/g)].map(match=>JSON.parse(JSON.stringify(vm.runInNewContext('('+balanced(match.index)+')',{}, {timeout:1000}))));
 return {source,rules:JSON.parse(JSON.stringify(rules)),...data,notes,context,fn,balanced,slice};
}
module.exports={load,SHA,URL};
