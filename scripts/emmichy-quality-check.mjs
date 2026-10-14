// Explicit manual CI quality probe: synthetic game inputs, max three provider
// calls TOTAL, stop immediately on 429. No deployment or credential output.
import fs from 'node:fs/promises';
import game from '../games/emmichy.js';
import {runChain} from '../src/index.js';
import {PROVIDERS} from '../src/providers.js';
import {selectKnowledge} from '../games/emmichy-fandom.js';
import {specialistPacket,noteSpecialistDelivery} from '../games/emmichy-specialist.js';
const env={GROQ_API_KEY:process.env.GROQ_API_KEY,GEMINI_API_KEY:process.env.GEMINI_API_KEY,
 GROQ_MODEL:'openai/gpt-oss-120b',GEMINI_MODEL:'gemini-flash-latest'};
let calls=0,rateLimited=false;
for(const name of Object.keys(PROVIDERS)){
 const original=PROVIDERS[name];
 PROVIDERS[name]=async(...args)=>{
  if(rateLimited||calls>=3)throw Error('probe-budget');
  // No remote Workers binding is available or created by this check.
  if(name==='workers-ai')throw Error('no-binding');
  calls++;
  try{return await original(...args);}catch(error){if(error.message==='http-429')rateLimited=true;throw error;}
 };
}
const state={history:[],knowledge:{work:'chiikawa'},turn:0};
const evidence={mode:'real provider generation with candidate server prompt; synthetic inputs; no browser or human evaluation',commit:process.env.GITHUB_SHA||'local',at:new Date().toISOString(),limit:3,turns:[]};
for(const input of ['草むしり検定の最初の結果は？','ハチワレの気持ち、えみちいはどう思う？','そのお祝いのクッキーって、手作りなの？']){
 if(rateLimited||calls>=3)break;
 if(/ちいかわ以外/.test(input))state.dialogueControl={concise:true,avoidFandom:true};
 const logs=[],start=Date.now();
 const messages=await game.buildMessages({input,state,session:{turns:state.turn+1}});
 const result=await runChain(env,game,messages,entry=>logs.push(entry),{startedAt:start});
 evidence.turns.push({input,systemCharacters:messages[0].content.length,history:messages.slice(1,-1),wallMs:Date.now()-start,result,attempts:logs});
 if(result?.error==='rate-limited'||!result?.text)break;
 state.history.push({role:'user',text:input},{role:'enny',text:result.text});
  state.knowledge=selectKnowledge(input,state).memory;state.turn++;
  state.specialist=noteSpecialistDelivery(specialistPacket(input,state).memory,result.text);
}
evidence.calls=calls;evidence.rateLimited=rateLimited;
await fs.mkdir('artifacts',{recursive:true});
await fs.writeFile('artifacts/emmichy-quality-check.json',JSON.stringify(evidence,null,2)+'\n');
console.log(JSON.stringify({calls,rateLimited,replies:evidence.turns.filter(t=>t.result?.text).length}));
