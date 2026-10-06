import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import game from '../games/emmichy.js';
import {PROVIDERS} from '../src/providers.js';
const {freshState,respond}=await import(pathToFileURL(path.resolve('../game/src/engine.js')));
const {retainAside}=await import(pathToFileURL(path.resolve('../game/src/filler.js')));
const {advancePerformance}=await import(pathToFileURL(path.resolve('../game/src/performance.js')));
const {polishReply}=await import(pathToFileURL(path.resolve('../game/src/repertoire.js')));
const {finishSession}=await import(pathToFileURL(path.resolve('../game/src/session.js')));
const prefix=JSON.parse(await fs.readFile('../game/docs/playtest-20261006-loop2-ab.json','utf8'))[0].arms.candidate;
let state=freshState();
for(const row of prefix.slice(0,6)){state=respond(row.input,state).state;state.history.at(-1).text=row.text;}
let long=state;
for(let i=7;i<=17;i++){long=respond(`次の話${i}`,long).state;long.history=retainAside(long.history,'ウンウン…。',{pendingReply:true});}
const cases=[
 {name:'spontaneous-travel',state,input:'週末は箱根に行く',turn:7},
 {name:'recall-after-truncation',state:long,input:'さっき何を忘れたっけ？',turn:18},
 {name:'correct-false-scene',state:{...freshState(),turn:6,history:[{role:'user',text:'ちいかわの話'},{role:'enny',text:'ちいかわが水を回してジャンプする場面だね。'}]},input:'違う。水流は島二郎だよ。勝手に新しい場面作らないで',turn:7},
 {name:'quiet-no-third-question',state:{...freshState(),turn:5,history:[{role:'enny',text:'プリンはどこで買った？'},{role:'user',text:'お店'},{role:'enny',text:'どんな味だった？'}]},input:'うん',turn:6}
];
const output=[];await fs.mkdir('artifacts',{recursive:true});
for(const c of cases){
 const before=advancePerformance(c.state,c.input,c.turn),messages=await game.buildMessages({input:c.input,state:before,session:{turns:c.turn}});
 const attempts=[];let raw=null,provider=null;
 for(const name of game.providers){
  if(name==='workers-ai'){attempts.push({provider:name,error:'not-tested-no-local-binding'});continue;}
  try{raw=game.validate(await PROVIDERS[name](process.env,messages,game));if(raw){provider=name;break;}attempts.push({provider:name,error:'validation'});}
  catch(e){attempts.push({provider:name,error:/^(?:http-\d+|no-key)$/.test(e.message)?e.message:e.name==='TimeoutError'?'timeout':'request-failed'});}
 }
 const text=raw?polishReply(raw,c.input,before).text:null;
 output.push({name:c.name,input:c.input,turn:c.turn,history:before.history,memory:before.conversation,raw,text,provider,attempts,ending:c.name==='recall-after-truncation'?finishSession(before,{turns:18,startedAt:0}).text:null});
 console.log(JSON.stringify(output.at(-1)));
 await fs.writeFile('artifacts/emmichy-memory-smoke.json',JSON.stringify(output,null,2));
 await new Promise(r=>setTimeout(r,55000));
}
