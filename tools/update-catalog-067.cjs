// Extract only reviewed static catalogue data; raid formulas keep their own version.
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const SHA='8826ff489112a0da9d33584177fd6b4306f313606c579e6a41aa74a14a4fd21c';
const URL='https://mifozov.com/assets/index-CRYMzDSH.js';
function load(file){
  if(!file)throw Error('Pass the reviewed local Mifozov 0.67 client path');
  const source=fs.readFileSync(file,'utf8');
  if(crypto.createHash('sha256').update(source).digest('hex')!==SHA)throw Error('Client hash changed: review extraction before proceeding');
  const from=source.indexOf('var Je=['),to=source.indexOf(',B=e=>tt.find',from);
  if(from<0||to<from||!source.includes('String(rt.indexOf(e)+1).padStart(3,`0`)'))throw Error('Catalogue or chronicle order needs review');
  const context=vm.createContext({});
  vm.runInContext(source.slice(from,to)+';',context,{timeout:1000});
  const data=JSON.parse(vm.runInContext('JSON.stringify({species:tt.map(({id,name,rarity,elements,base})=>({id,name,rarity,elements,base})),retired:[...nt],entries:rt.map((row,index)=>({speciesId:row.id,name:row.name,number:index+1}))})',context,{timeout:1000}));
  if(data.species.length!==150||data.entries.length!==141||data.retired.length!==9)throw Error('Unexpected catalogue size');
  for(const [id,number] of [['medunitsa',80],['myandash',139],['mizgir',140],['mara',141]]){
    if(data.entries.find(row=>row.speciesId===id)?.number!==number)throw Error('Unexpected chronicle number for '+id);
  }
  return data;
}
function update(file){
  const data=load(file),root=path.resolve(__dirname,'../web');
  const metadata={version:'0.67',source:URL,sha256:SHA};
  const catalog={...metadata,species:data.species,excluded:['izbushka'],retired:data.retired};
  const chronicle={...metadata,entries:data.entries};
  const raidPath=path.join(root,'raid-data.js'),raidSource=fs.readFileSync(raidPath,'utf8');
  const raids={...require(raidPath),retired:data.retired,catalog};
  const wrapper=(global,value)=>`(function(root){const data=${JSON.stringify(value,null,2)};if(typeof module!=='undefined'&&module.exports)module.exports=data;root.${global}=data;})(typeof globalThis!=='undefined'?globalThis:this);\n`;
  const header='// Catalogue generated from the reviewed public client by tools/update-catalog-067.cjs.\n';
  fs.writeFileSync(path.join(root,'catalog.js'),header+wrapper('MifoCatalog',catalog));
  fs.writeFileSync(path.join(root,'chronicle-data.js'),header+wrapper('MifoChronicle',chronicle));
  const raidHeader=raidSource.slice(0,raidSource.indexOf('(function(root)'));
  fs.writeFileSync(raidPath,raidHeader+wrapper('MifoRaidData',raids));
  console.log('Updated 150 catalogue records / 141 chronicle entries; preserved raid rules.');
}
if(require.main===module)update(process.argv[2]);
module.exports={load,update,SHA,URL};
