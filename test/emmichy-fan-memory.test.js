import test from 'node:test';
import assert from 'node:assert/strict';
import game from '../games/emmichy.js';
import {selectKnowledge} from '../games/emmichy-fandom.js';
test('Chiikawa invitation and handmade chest ornament reach prompting while replies remain verbatim',async()=>{
 for(const input of ['ちいかわの話して？','胸のそれ何？']){
  const messages=await game.buildMessages({input,state:{knowledge:{work:'hunter'}}});
  assert.match(messages[0].content,/大興奮.*2〜3個/);
  const original='その話、もっとしたい！ その細かいところは確かめてから話すね。';
  const reply=game.validate(original,{messages});
  assert.equal(reply,original);assert.match(messages[0].content,/作品全体を.*よく知らない.*切らない/);
  if(input.startsWith('胸')){assert.match(messages[0].content,/自分で作ったちいかわ/);assert.match(messages[0].content,/アタシが作った/);}
  assert.ok(reply.length<=180);
 }
 const messages=await game.buildMessages({input:'ちいかわの作者は誰？',state:{}});
 const answer='ナガノさんが作者だよ。絵の表情が大好き！';assert.equal(game.validate(answer,{messages}),answer);
 const origin=await game.buildMessages({input:'スウェーデン生まれなの？',state:{}});
 assert.match(origin[0].content,/スウェーデンのヨーテボリ近郊で生まれ育ち/);
});

test('persistent topic cues reach the prompt after transcript eviction; corrections stay connected and enthusiastic',async()=>{
 const knowledge=selectKnowledge('島二郎の水流とハチワレ',{knowledge:{work:'chiikawa'}}).memory;
 const state={knowledge,history:Array.from({length:40},()=>({role:'user',text:'へえ'}))};
 const messages=await game.buildMessages({input:'その場面の続き',state});
 assert.match(messages[0].content,/会話中に出た言葉の記憶/);assert.match(messages[0].content,/ハチワレ/);assert.match(messages[0].content,/手を回して水流/);assert.match(messages[0].content,/今はちいかわの話/);
 const correction=await game.buildMessages({input:'スイリュウ ハ チイカワ タチ ハ アソンデ ナイヨ?',state:{knowledge,history:[{role:'enny',text:'ちいかわたちが水流で遊んでる場面が好き。'}]}});
 assert.match(correction[0].content,/水流で遊ぶと言った内容を撤回/);
 const original='そこはまだよく知らないの。わかったふりで答えたくないな。';
 assert.equal(game.validate(original,{messages:correction}),original);
 assert.match(correction[0].content,/手を回して水流を起こす/);assert.match(correction[0].content,/自分の誤りを撤回/);
 const latest=await game.buildMessages({input:'ちいかわの最新の細かい話は？',state:{knowledge}});
 assert.equal(game.validate(original,{messages:latest}),original);
 assert.match(latest[0].content,/未確認の最新話や日時だけは対象を限定して保留/);
 const ordinary=await game.buildMessages({input:'今日は音楽の話をしよう',state});assert.doesNotMatch(ordinary[0].content,/今はちいかわの話/);
 const refused=await game.buildMessages({input:'その話の続き',state:{knowledge,history:[{role:'user',text:'ちいかわ以外の話にしよう'}]}});
 assert.doesNotMatch(refused[0].content,/今はちいかわの話/);
 assert.doesNotMatch(game.validate('そこはまだよく知らないの。',{messages:refused}),/ちいかわ|島二郎|好き/);
});
