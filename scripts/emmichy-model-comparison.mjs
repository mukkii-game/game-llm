// Manual, unpublished smoke comparison using existing keys. No new provider,
// retry or paid-tier setup. Eight generation attempts maximum; stop on 429.
import fs from 'node:fs/promises';
import game from '../games/emmichy.js';

const candidates=[
 {provider:'groq',model:'qwen/qwen3.8-27b'},
 {provider:'groq',model:'openai/gpt-oss-120b'},
 {provider:'gemini',model:'gemini-3.8-flash'},
 {provider:'gemini',model:'gemini-2.5-flash-lite'}
];
const cases=[
 {id:'catchphrase-correction',input:'ヤハはうさぎの口癖だよ。ちいかわの曲じゃないよね？',state:{turn:3,knowledge:{work:'chiikawa'},history:[{role:'user',text:'うさぎが好きなんだ'},{role:'enny',text:'ウサギ ノ イキオイ、アタシ モ スキ！'}]}},
 {id:'owned-memory-and-identity',input:'前に作った砂糖シールド、覚えてる？日本語の勉強にも使えるかな？',state:{turn:3,history:[],playerMemory:{version:1,creations:['砂糖シールド'],likes:['ハチワレ'],nickname:'テスト'}}}
];
const evidence={mode:'real API smoke comparison, synthetic inputs, no browser or human evaluation',commit:process.env.GITHUB_SHA||'local',at:new Date().toISOString(),generationLimit:8,calls:0,rateLimited:false,catalogs:{},turns:[],skipped:[]};
const keys={groq:process.env.GROQ_API_KEY,gemini:process.env.GEMINI_API_KEY};
async function request(provider,model,messages){
 const start=Date.now(),signal=AbortSignal.timeout(game.providerTimeoutMs);
 const groq=provider==='groq';
 const response=await fetch(groq?'https://api.groq.com/openai/v1/chat/completions':`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,{
  method:'POST',signal,headers:{'content-type':'application/json',...(groq?{authorization:`Bearer ${keys.groq}`}:{'x-goog-api-key':keys.gemini})},
  body:JSON.stringify(groq?{model,messages,temperature:game.temperature,max_tokens:game.maxTokens,...(model.includes('gpt-oss')?{reasoning_effort:'low'}:{})}:{systemInstruction:{parts:[{text:messages.filter(m=>m.role==='system').map(m=>m.content).join('\n')}]},contents:messages.filter(m=>m.role!=='system').map(m=>({role:m.role==='assistant'?'model':'user',parts:[{text:m.content}]})),generationConfig:{temperature:game.temperature,maxOutputTokens:game.maxTokens}})
 });
 if(response.status===429)evidence.rateLimited=true;
 // Never serialize error bodies/headers that could contain credentials.
 if(!response.ok)return {status:response.status,wallMs:Date.now()-start,error:`http-${response.status}`};
 const out=await response.json();
 const text=groq?out.choices?.[0]?.message?.content||'':(out.candidates?.[0]?.content?.parts||[]).filter(p=>!p.thought).map(p=>p.text||'').join('');
 return {status:response.status,wallMs:Date.now()-start,actualModel:out.model||out.modelVersion||model,rawText:text,finishReason:out.choices?.[0]?.finish_reason||out.candidates?.[0]?.finishReason,usage:out.usage||out.usageMetadata,serverValidated:game.validate(text,{messages})};
}
for(const provider of ['groq','gemini']){
 if(!keys[provider]){evidence.catalogs[provider]={error:'no-key'};continue;}
 try{
  const response=await fetch(provider==='groq'?'https://api.groq.com/openai/v1/models':'https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000',{headers:provider==='groq'?{authorization:`Bearer ${keys.groq}`}:{'x-goog-api-key':keys.gemini},signal:AbortSignal.timeout(5000)});
  if(response.status===429)evidence.rateLimited=true;
  if(!response.ok){evidence.catalogs[provider]={error:`http-${response.status}`};break;}
  const out=await response.json();
  evidence.catalogs[provider]={available:(out.data||out.models||[]).filter(m=>provider==='groq'||m.supportedGenerationMethods?.includes('generateContent')).map(m=>(m.id||m.name).replace(/^models\//,''))};
 }catch{evidence.catalogs[provider]={error:'catalog-request-failed'};}
 if(evidence.rateLimited)break;
}
// Prebuild exactly the same game prompt/history for every measured model.
const prompts=await Promise.all(cases.map(c=>game.buildMessages({input:c.input,state:c.state,session:{turns:4}})));
for(const candidate of candidates){
 if(evidence.rateLimited)break;
 if(!evidence.catalogs[candidate.provider]?.available?.includes(candidate.model)){evidence.skipped.push({...candidate,reason:'not-listed-for-existing-key'});continue;}
 for(let i=0;i<cases.length;i++){
  if(evidence.rateLimited||evidence.calls>=8)break;
  evidence.calls++;
  const row={...candidate,case:cases[i].id,input:cases[i].input,messages:prompts[i]};
  try{Object.assign(row,await request(candidate.provider,candidate.model,prompts[i]));}
  catch(error){row.error=error.name==='TimeoutError'||error.name==='AbortError'?'timeout':'request-failed';row.timeoutMs=game.providerTimeoutMs;}
  evidence.turns.push(row);
 }
}
await fs.mkdir('artifacts',{recursive:true});
await fs.writeFile('artifacts/emmichy-model-comparison.json',JSON.stringify(evidence,null,2)+'\n');
console.log(JSON.stringify({calls:evidence.calls,rateLimited:evidence.rateLimited,results:evidence.turns.map(r=>({model:r.model,case:r.case,status:r.status,wallMs:r.wallMs,error:r.error})),skipped:evidence.skipped}));
