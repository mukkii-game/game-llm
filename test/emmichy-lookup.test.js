import {test} from 'node:test';
import assert from 'node:assert/strict';
import {lookupRequest,lookupNotes} from '../games/emmichy-lookup.js';
import game from '../games/emmichy.js';
test('short replies retain the previous work and Samon is a verified rival, not a summon',()=>{
 const state={history:[{role:'enny',text:'巨人の星でどの試合が好き？'}]};
 const system=game.buildMessages({input:'サモン',state})[0].content;
 assert.match(system,/左門豊作/);assert.match(system,/召喚へ取り違えない/);
 assert.equal(lookupRequest('サモン',state),null);
 assert.deepEqual(lookupRequest('ホニャラ',state),{name:'ホニャラ',title:'巨人の星'});
 assert.equal(lookupRequest('私の住所はここ',state),null);
 assert.equal(lookupRequest('ホニャラ',{}),null);
});
test('search is bounded, removes markup and fails with a clarification instead of invented facts',async()=>{
 const result=await lookupNotes({title:'巨人の星',name:'ホニャラ'},{fetcher:async url=>{assert.equal(url.hostname,'ja.wikipedia.org');return {ok:true,json:async()=>({query:{search:[{title:'巨人の星',snippet:'<b>ホニャラ</b>という人物'}]}})};}});
 assert.match(result,/ホニャラ/);assert.doesNotMatch(result,/<b>/);
 const fail=await lookupNotes({title:'ジョジョ',name:'テスト名'},{fetcher:async()=>{throw Error('offline');}});
 assert.match(fail,/確認する/);
});
