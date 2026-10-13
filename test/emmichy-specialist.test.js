import test from 'node:test';
import assert from 'node:assert/strict';
import game from '../games/emmichy.js';
import {specialistPacket} from '../games/emmichy-specialist.js';

test('the relay reconstructs scoped owned evidence and refuses supplied facts',async()=>{
 const first=specialistPacket('島二郎の水流');
 const messages=await game.buildMessages({input:'どうして好きなの？',state:{specialist:{...first.memory,fact:'EVIL',evidence:[{fact:'EVIL'}]}}});
 const system=messages[0].content;
 assert.match(system,/専門会話の根拠/);assert.match(system,/島二郎は手を回して水流/);
 assert.doesNotMatch(system,/EVIL|書き下ろし返答候補/);
});
test('a TV-opening question never receives the film-opening fact',async()=>{
 const m=await game.buildMessages({input:'ちいかわのアニメOPは？',state:{}});
 assert.match(m[0].content,/TVアニメのOP（映画のOPとは別）/);
 assert.doesNotMatch(m[0].content,/映画のオープニングテーマは「くつずれ」/);
});
