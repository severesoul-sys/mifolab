(function(root,factory){const api=factory(typeof module!=='undefined'&&module.exports?require('./chronicle-data.js'):root.MifoChronicle);if(typeof module!=='undefined'&&module.exports)module.exports=api;root.MifoSearch=api;})(typeof globalThis!=='undefined'?globalThis:this,function(data){
  'use strict';
  const rows=new Map(data.entries.map(row=>[row.speciesId,row]));
  const normalize=value=>String(value??'').normalize('NFKC').toLocaleLowerCase('ru').replace(/ё/g,'е').trim().replace(/\s+/g,' ');
  const number=speciesId=>rows.get(speciesId)?.number??null;
  const label=speciesId=>{const value=number(speciesId);return value==null?'':'№'+String(value).padStart(3,'0');};
  function matches(query,speciesId,...names){
    // Replace the number sign before NFKC turns it into the letters "No".
    const needle=normalize(String(query??'').replace(/№/g,'#'));if(!needle)return true;
    const numeric=/^#?\s*(\d+)$/.exec(needle);
    if(numeric){const value=Number(numeric[1]);return Number.isSafeInteger(value)&&value>0&&number(speciesId)===value;}
    const prefixed=/^#\s*(\d+)\s+(.+)$/.exec(needle);
    if(prefixed)return number(speciesId)===Number(prefixed[1])&&matches(prefixed[2],speciesId,...names);
    const name=normalize(names.filter(value=>typeof value==='string').join(' '));
    return needle.split(' ').every(word=>name.includes(word));
  }
  function issue(reason){
    const value=normalize(reason);
    if(value.includes('вид отсутствует')||value.includes('вид этого духа'))return 'Вид этого духа пока отсутствует в каталоге.';
    if(value.includes('повтор'))return 'Повторяющаяся запись в подворье. Обновите список духов.';
    return 'Не удалось получить все характеристики духа. Обновите подворье.';
  }
  return {normalize,number,label,matches,issue};
});
