(function(root,factory){const api=factory(typeof module!=='undefined'&&module.exports?require('./core.js'):root.MifoCore);if(typeof module!=='undefined'&&module.exports)module.exports=api;root.MifoSquads=api;})(typeof globalThis!=='undefined'?globalThis:this,function(C){
  'use strict';
  const key='mifo-lab.squads.v1',limit=30,clone=x=>JSON.parse(JSON.stringify(x));
  function slots(input,catalog){
    if(!Array.isArray(input)||input.length<1||input.length>6||!input.some(Boolean))throw Error('Выберите хотя бы одного духа');
    const ids=new Set();
    const result=input.map(item=>{if(item==null)return null;C.fighter(item,catalog);if(item.instanceId){if(ids.has(item.instanceId))throw Error('Пойманный дух повторяется в отряде');ids.add(item.instanceId);}return clone(item);});
    return [...result,...Array(6-result.length).fill(null)];
  }
  function name(value){if(typeof value!=='string'||!value.trim()||value.trim().length>60)throw Error('Введите название от 1 до 60 символов');return value.trim();}
  function parse(text,catalog){
    if(text==null)return [];
    if(typeof text!=='string'||text.length>2000000)throw Error('Не удалось прочитать сохранённые отряды');
    const value=JSON.parse(text);
    if(value.version!==1||!Array.isArray(value.entries)||value.entries.length>limit)throw Error('Не удалось прочитать сохранённые отряды');
    const seen=new Set();return value.entries.map(row=>{if(typeof row.id!=='string'||row.id.length>100||!row.id||seen.has(row.id))throw Error('Повторяющаяся запись отряда');seen.add(row.id);return {id:row.id,name:name(row.name),slots:slots(row.slots,catalog)};});
  }
  function put(entries,title,team,catalog,id){
    const row={id:id||Date.now().toString(36)+'-'+Math.random().toString(36).slice(2),name:name(title),slots:slots(team,catalog)},next=clone(entries),index=next.findIndex(x=>x.id===row.id);
    if(index<0){if(next.length>=limit)throw Error('Можно сохранить до 30 отрядов');next.push(row);}else next[index]=row;
    return next;
  }
  function write(storage,entries){storage.setItem(key,JSON.stringify({version:1,entries}));}
  return {key,limit,slots,parse,put,write};
});
