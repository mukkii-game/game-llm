import test from 'node:test';
import assert from 'node:assert/strict';
import game from '../games/emmichy.js';
import {avoidsFandom} from '../games/emmichy-topic-policy.js';
import worker from '../src/index.js';
test('nonfan request removes optional fandom material and rejects observed redirect',()=>{
 const input='漫画は詳しくないけど、音楽の話は好きだよ';
 const messages=game.buildMessages({input,state:{knowledge:{work:'chiikawa'},history:[]}});
 assert.doesNotMatch(messages[0].content,/今回の話題資料|書き下ろし返答候補/);
 assert.match(messages[0].content,/漫画の名前・口癖・話題を持ち込まない/);
 assert.equal(game.validate('ちいかわの音楽、どんな感じが好き？',{messages}),null);
 assert.ok(game.validate('アタシ、好きな曲だと歩く速さが変わる。',{messages}));
});
test('topic preference lasts through history and explicit fandom request releases it',()=>{
 const history=[{role:'user',text:'漫画は詳しくない。別の話にしよう'}];
 assert.equal(avoidsFandom('ギターも好き',history),true);
 assert.equal(avoidsFandom('ジョジョの曲の話ならしたい',history),false);
 const messages=game.buildMessages({input:'ギターも好き',state:{history}});
 assert.equal(game.validate('ハチワレがギターを弾いたらかわいいね。',{messages}),null);
});
test('ordinary fandom play and validator without context remain compatible',()=>{
 const messages=game.buildMessages({input:'ちいかわの話がしたい',state:{}});
 assert.ok(game.validate('アタシ、ハチワレの歌が好きなの。',{messages}));
 assert.ok(game.validate('アタシ、ハチワレの歌が好きなの。'));
});
test('allowed-origin worker request rejects a nonfan redirect and returns the next valid reply',async()=>{
 const original=globalThis.fetch;let calls=0;
 try{
  globalThis.fetch=async u=>{
   calls++;
   return String(u).includes('googleapis')?Response.json({candidates:[{content:{parts:[{text:'ちいかわの音楽、どんな感じが好き？'}]}}]}):Response.json({choices:[{message:{content:'アタシ、好きな曲だと歩く速さが変わる。'}}]});
  };
  const req=new Request('https://worker.example/api/chat/emmichy',{method:'POST',headers:{Origin:'https://mukkii-game.github.io','Content-Type':'application/json'},body:JSON.stringify({input:'漫画は詳しくないけど、音楽の話は好きだよ',state:{}})});
  const response=await worker.fetch(req,{GEMINI_API_KEY:'test',GROQ_API_KEY:'test'});
  assert.equal(response.status,200);assert.equal(response.headers.get('access-control-allow-origin'),'https://mukkii-game.github.io');
  const data=await response.json();assert.equal(data.provider,'groq');assert.doesNotMatch(data.text,/ちいかわ/);assert.equal(calls,2);
 }finally{globalThis.fetch=original;}
});
