import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import game from '../games/emmichy.js';
import {PROVIDERS} from '../src/providers.js';
const {freshState}=await import(pathToFileURL(path.resolve('../game/src/engine.js')));
const {advancePerformance}=await import(pathToFileURL(path.resolve('../game/src/performance.js')));
const cases=[
 {name:'short-yes',input:'うん',turn:3,history:[{role:'user',text:'オムライス食べた'},{role:'enny',text:'オムライス、いいね。卵はふわふわだった？'}]},
 {name:'safe-forgotten-item',input:'傘を忘れたけど、駅で借りられた。笑',turn:4,history:[{role:'user',text:'今日は雨だった'},{role:'enny',text:'雨の日だったのね。'}]},
 {name:'taught-school-culture',input:'上履きって、学校の中だけで履く靴だよ',turn:5,history:[{role:'enny',text:'上履きって、どこで履く靴？'}]}
];
const output=[];await fs.mkdir('artifacts',{recursive:true});
let stoppedFor429=false;
for(const c of cases){
 const state={...freshState(),turn:c.turn-1,history:c.history};
 const before=advancePerformance(state,c.input,c.turn);
 const messages=await game.buildMessages({input:c.input,state:before,session:{turns:c.turn}});
 const attempts=[];let raw=null,provider=null;
 for(const name of game.providers){
  if(name==='workers-ai'){attempts.push({provider:name,error:'not-tested-no-local-binding'});continue;}
  try{
   raw=game.validate(await PROVIDERS[name](process.env,messages,game));
   if(raw){provider=name;attempts.push({provider:name,ok:true});break;}
   attempts.push({provider:name,error:'validation'});
  }catch(e){
   const error=/^(?:http-\d+|no-key)$/.test(e.message)?e.message:e.name==='TimeoutError'?'timeout':'request-failed';
   attempts.push({provider:name,error});
   if(error==='http-429'){stoppedFor429=true;break;}
  }
 }
 output.push({name:c.name,input:c.input,history:c.history,raw,provider,attempts,promptCharacters:messages.reduce((n,m)=>n+m.content.length,0)});
 console.log(JSON.stringify(output.at(-1)));
 await fs.writeFile('artifacts/emmichy-loop5-smoke.json',JSON.stringify({stoppedFor429,rows:output},null,2));
 if(stoppedFor429)break;
 await new Promise(r=>setTimeout(r,55000));
}
