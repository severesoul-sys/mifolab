const fs=require('node:fs');
const path=require('node:path');
const Core=require('../core.js');
const catalog=require('../catalog.js');
const root=path.resolve(__dirname,'..');
const options={mode:'fair',seed:'mifo-lab',level:40,iv:15,trials:32,probabilityMax:.5,a:{attack:null,defense:null},b:{attack:null,defense:null}};
const iterator=Core.tournament(catalog,options);let result,last=0;
while(true){const next=iterator.next();if(next.done){result=next.value;break;}const done=Math.floor(next.value.done/next.value.total*100);if(done>=last+10){last=done;console.log(done+'%');}}
fs.writeFileSync(path.join(root,'rankings.js'),'globalThis.MifoRankings='+JSON.stringify(result)+';\n');
fs.writeFileSync(path.join(root,'rankings.json'),JSON.stringify(result,null,2));
const sorted=[...result.rows].sort((left,right)=>left.rank-right.rank);
fs.writeFileSync(path.join(root,'rankings.csv'),'\ufeffМесто;Дух;Мощь;Победы;Поединки;Победы %\n'+sorted.map(row=>[row.rank,row.name,row.power,row.wins,row.matches,(row.winRate*100).toFixed(3)].join(';')).join('\n'));
const strongest=[...result.rows].sort((left,right)=>right.power-left.power);
fs.writeFileSync(path.join(root,'RANKING.md'),`# Рейтинг духов Mifozov\n\nИсточник: клиент ${result.sourceVersion}. Дата расчёта: ${result.createdAt}.\n\nУсловия: равный темп сторон, уровень 40, все IV 15, ровный нрав, полная Живица. Каждая руна имеет точность 0% или 100%, по 50% вероятности. Зерно: mifo-lab. По 32 повтора каждой пары в обоих направлениях: ${result.battles} боёв, ${sorted[0].matches} на каждый из ${result.speciesCount} видов.\n\n## По победам\n\n| Место | Дух | Победы | Мощь |\n|---|---|---:|---:|\n`+sorted.map(row=>`| ${row.rank} | ${row.name} | ${(row.winRate*100).toFixed(2)}% | ${row.power} |`).join('\n')+`\n\n## По мощности\n\n| Место | Дух | Мощь |\n|---|---|---:|\n`+strongest.slice(0,20).map((row,index)=>`| ${index+1} | ${row.name} | ${row.power} |`).join('\n')+'\n\nМощь — удвоенная сумма итоговых статов. Рейтинг побед — средний результат против всех остальных видов с одинаковым весом противников. Лабораторный режим не является подтверждённым PvP-режимом игры. Результат зависит от выбранных правил и распределения точности рун; автоматическая тактика использует Ультру при готовности. Служебная «Избушка» исключена.\n');
console.log(JSON.stringify({battles:result.battles,top:sorted.slice(0,10).map(row=>({name:row.name,winRate:row.winRate,power:row.power})),power:[...result.rows].sort((left,right)=>right.power-left.power).slice(0,5).map(row=>({name:row.name,power:row.power}))},null,2));
