import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import current from '../games/emmichy.js';
import {PROVIDERS} from '../src/providers.js';
const baseline=(await import(pathToFileURL(path.resolve('../baseline/games/emmichy.js')))).default;
const client=await import(pathToFileURL(path.resolve('../game/src/engine.js')));
const {advancePerformance}=await import(pathToFileURL(path.resolve('../game/src/performance.js')));
const {polishReply}=await import(pathToFileURL(path.resolve('../game/src/repertoire.js')));
const {finishSession}=await import(pathToFileURL(path.resolve('../game/src/session.js')));
const scenarios=JSON.parse(await fs.readFile(new URL('./emmichy-scenarios.json',import.meta.url),'utf8'));
const output=[];
const question=s=>/[?？]|教えて(?:くれる|ほしい|ね)|聞かせて/.test(s);
await fs.mkdir('artifacts',{recursive:true});
for(const scenario of scenarios){
 const arms={baseline:{game:baseline,state:client.freshState(),rows:[]},candidate:{game:current,state:client.freshState(),rows:[]}};
 for(let i=0;i<scenario.inputs.length;i++)for(const [arm,a] of Object.entries(arms)){
  const input=scenario.inputs[i],before=advancePerformance(a.state,input,i+1);
  const result=client.respond(input,a.state);const attempts=[];let answer=null,provider='rule-fallback';
  const started=Date.now();
  if(result.kind!=='bye'){
   const messages=await a.game.buildMessages({input,state:before,session:{turns:i+1}});
   for(const name of a.game.providers){
    if(name==='workers-ai'){attempts.push({provider:name,error:'not-tested-no-local-binding'});continue;}
    try{
     const value=await PROVIDERS[name](process.env,messages,a.game);
     answer=a.game.validate(value);
     if(answer){provider=name;attempts.push({provider:name,ok:true});break;}
     attempts.push({provider:name,error:'validation'});
    }catch(e){attempts.push({provider:name,error:/^(?:http-\d+|no-key)$/.test(e.message)?e.message:e.name==='TimeoutError'?'timeout':'request-failed'});}
   }
  }
  let text=polishReply(answer||result.text,input,before).text;
  a.state={...result.state,performance:before.performance,speechStyle:before.speechStyle};
  a.state.history.at(-1).text=text;
  if(result.kind==='bye'){
   const ending=finishSession({...a.state,history:a.state.history.slice(0,-1)},{turns:i+1,startedAt:Date.now()});
   a.state=ending.state;text=ending.text;provider='ending-bank';
  }
  const row={turn:i+1,input,raw:answer,text,provider,attempts,ms:Date.now()-started,question:question(text),rawQuestion:answer?question(answer):null};
  a.rows.push(row);console.log(JSON.stringify({type:scenario.type,arm,...row}));
  const snapshot=[...output,{type:scenario.type,arms:Object.fromEntries(Object.entries(arms).map(([k,v])=>[k,v.rows]))}];
  await fs.writeFile('artifacts/emmichy-ab.json',JSON.stringify(snapshot,null,2));
  await new Promise(r=>setTimeout(r,4000));
 }
 output.push({type:scenario.type,arms:Object.fromEntries(Object.entries(arms).map(([k,v])=>[k,v.rows]))});
}
await fs.writeFile('artifacts/emmichy-ab.json',JSON.stringify(output,null,2));
