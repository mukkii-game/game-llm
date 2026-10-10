import test from 'node:test';
import assert from 'node:assert/strict';
import game from '../games/emmichy.js';
import {selectKnowledge} from '../games/emmichy-fandom.js';

test('persistent topic cues reach the prompt after transcript eviction; corrections stay connected and enthusiastic',async()=>{
 const knowledge=selectKnowledge('島二郎の水流とハチワレ',{knowledge:{work:'chiikawa'}}).memory;
 const state={knowledge,history:Array.from({length:40},()=>({role:'user',text:'へえ'}))};
 const messages=await game.buildMessages({input:'その場面の続き',state});
 assert.match(messages[0].content,/会話中に出た言葉の記憶/);assert.match(messages[0].content,/ハチワレ/);assert.match(messages[0].content,/手を回して水流/);assert.match(messages[0].content,/今はちいかわの話/);
 const correction=await game.buildMessages({input:'スイリュウ ハ チイカワ タチ ハ アソンデ ナイヨ?',state:{knowledge,history:[{role:'enny',text:'ちいかわたちが水流で遊んでる場面が好き。'}]}});
 assert.match(correction[0].content,/水流で遊ぶと言った内容を撤回/);
 const recovered=game.validate('そこはまだよく知らないの。わかったふりで答えたくないな。',{messages:correction});
 assert.match(recovered,/遊んでるって言っちゃったね/);assert.match(recovered,/大好き/);assert.doesNotMatch(recovered,/よく知らない/);
 const latest=await game.buildMessages({input:'ちいかわの最新の細かい話は？',state:{knowledge}});
 assert.match(game.validate('そこはまだよく知らないの。わかったふりで答えたくないな。',{messages:latest}),/確かめ|好き/);
 const ordinary=await game.buildMessages({input:'今日は音楽の話をしよう',state});assert.doesNotMatch(ordinary[0].content,/今はちいかわの話/);
 const refused=await game.buildMessages({input:'その話の続き',state:{knowledge,history:[{role:'user',text:'ちいかわ以外の話にしよう'}]}});
 assert.doesNotMatch(refused[0].content,/今はちいかわの話/);
 assert.doesNotMatch(game.validate('そこはまだよく知らないの。',{messages:refused}),/ちいかわ|島二郎|好き/);
});
