import test from 'node:test';
import assert from 'node:assert/strict';
import game from '../games/emmichy.js';
import {specialistPacket,noteSpecialistDelivery} from '../games/emmichy-specialist.js';

test('the relay reconstructs scoped owned evidence and refuses supplied facts',async()=>{
 const first=specialistPacket('島二郎の水流');
 const messages=await game.buildMessages({input:'どうして好きなの？',state:{specialist:{...first.memory,fact:'EVIL',evidence:[{fact:'EVIL'}]}}});
 const system=messages[0].content;
 assert.match(system,/専門会話の根拠/);assert.match(system,/島二郎は手を回して水流/);
 assert.doesNotMatch(system,/EVIL|書き下ろし返答候補/);
});
test('a TV-opening question never receives the film-opening fact',async()=>{
 const m=await game.buildMessages({input:'ちいかわのアニメOPは？',state:{}});
 assert.match(m[0].content,/短い放送時間のTVアニメにはOPがない/);
 assert.doesNotMatch(m[0].content,/映画のオープニングテーマは「くつずれ」/);
});
test('a structured fact selection is rendered from owned data and cannot change the exam result',async()=>{
 const messages=await game.buildMessages({input:'草むしり検定5級の結果は？',state:{}});
 const value=JSON.stringify({beats:[{fact:'exam:result'},{say:'アタシ、友達にも自分にも、優しくしたいな。'}]});
 const out=game.validate(value,{messages});
 assert.match(out.text,/ハチワレが合格.*ちいかわは不合格/);assert.match(out.text,/アタシ、友達/);assert.equal(out.source,'mixed');
 assert.equal(game.validate(JSON.stringify({beats:[{fact:'exam:fake-success'}]}),{messages}),null);
 assert.equal(game.validate(JSON.stringify({beats:[{fact:'exam:result',text:'二人とも合格'}]}),{messages}),null);
});

test('a player view remains on its delivered scene and is not promoted to canon',async()=>{
 const packet=specialistPacket('草むしり検定のお祝いのクッキー');
 const state={specialist:noteSpecialistDelivery(packet.memory,packet.evidence[0].spoken),history:[{role:'enny',text:packet.evidence[0].spoken}]};
 const messages=await game.buildMessages({input:'私は食べずに写真を残したい派',state});
 assert.match(messages[0].content,/player-view/);
 assert.match(messages[0].content,/プレイヤーの説明や好みを原作の事実へ変えない/);
 const schema=game.outputSchema(messages);
 assert.ok(schema.properties.beats.items.properties.fact.enum.includes('exam:cookie'));
 const answer=game.validate(JSON.stringify({beats:[{say:'写真を残したいんだね。アタシなら、ココアも用意しておやつにしたいな。'}]}),{messages});
 assert.equal(answer.source,'llm');assert.match(answer.text,/写真を残したい/);
});
