import test from 'node:test';
import assert from 'node:assert/strict';
import {groq,gemini,workersAi} from '../src/providers.js';
test('HTTP providers honor a per-game abort deadline',async()=>{
 const original=globalThis.fetch;
 try{
  globalThis.fetch=async(_url,{signal})=>{
   await new Promise((resolve,reject)=>{signal.addEventListener('abort',()=>reject(signal.reason),{once:true});setTimeout(resolve,100);});
   throw new Error('deadline not observed');
  };
  for(const provider of [groq,gemini])await assert.rejects(provider({GROQ_API_KEY:'test',GEMINI_API_KEY:'test'},[],{timeoutMs:10}),{name:'TimeoutError'});
 }finally{globalThis.fetch=original;}
});
test('Workers AI no longer waits indefinitely for a stuck binding',async()=>{
 await assert.rejects(workersAi({AI:{run:()=>new Promise(()=>{})}},[],{timeoutMs:10}),/timeout/);
 assert.equal(await workersAi({AI:{run:async()=>({response:'ちゃんと返ったよ。'})}},[],{timeoutMs:50}),'ちゃんと返ったよ。');
});
