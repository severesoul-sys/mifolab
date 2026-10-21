const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const S=require('../spirit-search.js'),data=require('../chronicle-data.js'),O=require('../collection-core.js'),catalog=require('../catalog.js');
const sourcePath=process.env.MIFOLAB_REFERENCE_042||path.resolve(__dirname,'../../.local/reference/client-0.42.js');

test('chronicle numbers follow the current game list, including exclusions',{skip:!fs.existsSync(sourcePath)},()=>{
  const source=fs.readFileSync(sourcePath,'utf8'),from=source.indexOf('var De=['),to=source.indexOf(',Fe={',from),context=vm.createContext({});
  assert.ok(source.includes('String(Pe.indexOf(e)+1).padStart(3,`0`)'));
  vm.runInContext(source.slice(from,to)+';',context,{timeout:1000});
  const expected=JSON.parse(vm.runInContext('JSON.stringify(Pe.map((sp,index)=>({speciesId:sp.id,name:sp.name,number:index+1})))',context));
  assert.deepEqual(data.entries.slice(0,expected.length),expected);assert.equal(expected.length,90);assert.equal(data.entries.length,138);assert.equal(S.label('rarog'),'№006');assert.equal(S.label('indrik'),'№007');assert.equal(S.label('gorynych'),'№031');assert.equal(S.label('kot_chernobog'),'№090');
  assert.equal(S.number('mora'),null);assert.equal(S.label('izbushka'),'');
});
test('search accepts exact chronicle numbers, leading zeros and number signs',()=>{
  for(const query of ['6','006','0006','№6','№ 006','#006',' 006 ','００６'])assert.ok(S.matches(query,'rarog','Рарог'),query);
  assert.ok(!S.matches('6','indrik','Индрик'));assert.ok(!S.matches('60','rarog','Рарог'));assert.ok(!S.matches('0','rarog','Рарог'));assert.ok(!S.matches('999','rarog','Рарог'));
  assert.ok(S.matches('№006 рар','rarog','Рарог'));assert.ok(!S.matches('№007 рар','rarog','Рарог'));
});
test('names and nicknames stay searchable without searching internal identifiers',()=>{
  assert.ok(S.matches(' раР ','rarog','Рарог'));assert.ok(S.matches('ерш','ersh','Ёрш Ершович'));
  assert.ok(S.matches('тест 2','rarog','Тест 2 («Рарог»)'));assert.ok(S.matches('','rarog','Рарог'));
  assert.ok(!S.matches('rarog','rarog','Рарог'));assert.ok(!S.matches('test-spirit-2','rarog','Тест 2 («Рарог»)'));
  assert.ok(S.matches('Мора','mora','Мора'));assert.ok(!S.matches('0','mora','Мора'));
});
test('same species returns all caught copies and user errors never echo their identifiers',()=>{
  const input=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/android-collection.json'),'utf8'));
  input.unavailable=['unknown [private-identifier:999]: вид отсутствует в каталоге'];
  const parsed=O.parse(input,catalog),matches=parsed.spirits.filter(row=>S.matches('006',row.speciesId,row.name,row.speciesName));
  assert.equal(matches.length,2);assert.notEqual(matches[0].id,matches[1].id);assert.notEqual(matches[0].level,matches[1].level);
  assert.ok(!parsed.unavailable.join(' ').includes('private-identifier'));
  for(const change of [data=>data.spirits[1].id=data.spirits[0].id,data=>data.spirits[0].nature={up:'bad',down:'bad'},data=>data.spirits[0].hpMax++]){
    const bad=structuredClone(input);change(bad);assert.throws(()=>O.parse(bad,catalog),error=>!error.message.includes('test-spirit')&&!/\bID\b/.test(error.message));
  }
});
