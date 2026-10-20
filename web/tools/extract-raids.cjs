const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),file=process.env.MIFOLAB_REFERENCE_042||path.resolve(root,'../.local/reference/client-0.42.js'),source=fs.readFileSync(file,'utf8');
function slice(start,end){const from=source.indexOf(start),to=source.indexOf(end,from);if(from<0||to<0)throw Error('Client changed: '+start);return source.slice(from,to);}
const context=vm.createContext({});
vm.runInContext(slice('var p={','function S(').split(',m={')[0]+';',context,{timeout:1000});
vm.runInContext(slice('var De=[',',Fe={')+';',context,{timeout:1000});
const raw=JSON.parse(vm.runInContext('JSON.stringify({rules:p.boss,battle:p.battle,species:Me,retired:[...Ne]})',context));
const data={version:'0.42',source:'https://mifozov.com/assets/index-C15W6ar6.js',guide:'https://mifozov.com/players#bosses',checkedAt:'2026-10-20',sha256:crypto.createHash('sha256').update(source).digest('hex'),rules:raw.rules,battle:raw.battle,retired:raw.retired,catalog:{version:'0.42',excluded:['izbushka'],species:raw.species.map(({id,name,rarity,elements,base})=>({id,name,rarity,elements,base}))}};
data.bosses=raw.rules.tiers.flatMap((tier,index)=>tier.pool.map(speciesId=>({id:speciesId,stars:index+1,level:tier.level,hp:tier.hp})));
fs.writeFileSync(path.join(root,'raid-data.js'),`// Extracted from the public Mifozov client; see tools/extract-raids.cjs.\n(function(root){const data=${JSON.stringify(data,null,2)};if(typeof module!=='undefined'&&module.exports)module.exports=data;root.MifoRaidData=data;})(typeof globalThis!=='undefined'?globalThis:this);\n`);
const old=require('../catalog.js');const changes=data.catalog.species.filter(row=>{const previous=old.species.find(item=>item.id===row.id);return !previous||JSON.stringify(previous.base)!==JSON.stringify(row.base)||JSON.stringify(previous.elements)!==JSON.stringify(row.elements);});
console.log(JSON.stringify({bosses:data.bosses.length,species:data.catalog.species.length,active:data.catalog.species.filter(row=>!data.retired.includes(row.id)).length,combatChanges:changes.map(row=>row.id),sha256:data.sha256},null,2));
