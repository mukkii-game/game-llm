// Small owned evidence packets. The browser sends IDs/state, never new canon.
import {chiikawaRelations} from './emmichy-chiikawa-relations.js';
import {waterPlayCorrection} from './emmichy-fandom.js';
import {exactNames} from './emmichy-names.js';
import {substantiveHistory} from './emmichy-dialogue-history.js';
import {feedbackIntent} from './emmichy-conversation-repair.js';
import {sceneFacts} from './emmichy-chiikawa-scenes.js';
import {topicFacts} from './emmichy-chiikawa-news.js';
const fold=s=>String(s||'').normalize('NFKC').replace(/[ぁ-ゖ]/g,c=>String.fromCharCode(c.charCodeAt(0)+96)).replace(/[\s。、!?！？「」]/g,'').toLowerCase();
const spoken={
 'reviewed:usagi:yaha':'「ヤハ！」はうさぎの掛け声だよ。',
 'reviewed:hachi:nantoka':'「なんとかなれーッ！」はハチワレのセリフだよ。',
 'reviewed:hachi:ending':'TVアニメのEDは「ひとりごつ」。ハチワレが歌うの。',
 'reviewed:hachi:opening':'映画のOPは「くつずれ」。ハチワレが歌うの。',
 'reviewed:chiikawa:pochette':'アニメ第28話で、ちいかわは買ったお気に入りのポシェットをさげて出かけるの。',
 'reviewed:trio:log':'映画の冒頭では、ちいかわ・ハチワレ・うさぎが丸太の周りで掛け合いをするの。',
 'reviewed:trio:prepare':'映画では、セイレーン討伐に向けて、みんなで協力して準備するの。',
 'reviewed:momonga:ear':'映画では、崖から落ちそうなちいかわを、モモンガが耳を引っ張って助けるの。'
};
export const specialistFacts=Object.freeze([...chiikawaRelations.filter(r=>r.evidence==='official'||r.id==='relation:chiikawa-23'),...sceneFacts,...topicFacts].map(r=>Object.freeze({...r,
 ...(r.id==='relation:chiikawa-23'?{fact:'島二郎は手を回して水流を起こす。',spoken:'島二郎は手を回して水流を起こすの。',limits:[...r.limits,'虎のしまじろうとは別人'],deliveredVariants:['島二郎が手を回して起こす水流','手を回して水流を起こす島二郎']}:{}),
 spoken:r.id==='relation:chiikawa-23'?'島二郎は手を回して水流を起こすの。':r.spoken||spoken[r.id]||r.fact})));
const records=specialistFacts;
const byId=new Map(records.map(r=>[r.id,r]));
const scenes=[
 {id:'examination',cues:['草むしり検定','クサムシリケンテイ','5級','5キュウ','五級'],ids:sceneFacts.map(r=>r.id),label:'草むしり検定の具体的な場面'},
 {id:'park-christmas',cues:['ちいかわパーク','チイカワパーク','パークのクリスマス','クリスマスのパーク'],ids:['topic:park:christmas-2026'],label:'パークの最新案内'},
 {id:'strong-hachiware-goods',cues:['強くなったハチワレ','強クナッタハチワレ','パラレルワールドのマスコット'],ids:['topic:goods:strong-hachiware'],label:'マスコットの最新案内'},
 {id:'water',cues:['水流','スイリュウ'],ids:['relation:chiikawa-23'],label:'島二郎の水流'},
 {id:'ending',cues:['ひとりごつ','ED','エンディング'],ids:['reviewed:hachi:ending'],label:'TVアニメのED'},
 {id:'opening',cues:['くつずれ','靴ずれ','OP','オープニング'],ids:['reviewed:hachi:opening'],label:'映画のOP'},
 {id:'tv-opening',cues:[],ids:[],label:'TVアニメのOP（映画のOPとは別）'},
 {id:'ear',cues:['耳を引っ張','耳が伸び','崖'],ids:['reviewed:momonga:ear'],label:'映画のモモンガとちいかわの耳'},
 {id:'log',cues:['丸太','冒頭の三人'],ids:['reviewed:trio:log'],label:'映画冒頭の掛け合い'},
 {id:'preparation',cues:['みんなで準備','討伐の準備'],ids:['reviewed:trio:prepare'],label:'映画の討伐準備'},
 {id:'pochette',cues:['ポシェット'],ids:['reviewed:chiikawa:pochette'],label:'ちいかわのポシェット'}
];
export function cleanSpecialist(value){
 const v=value&&typeof value==='object'?value:{};
 return {subject:records.some(r=>r.subject===v.subject)?v.subject:'',scene:scenes.some(s=>s.id===v.scene)?v.scene:'',
  focus:byId.has(v.focus)?v.focus:'',said:Array.isArray(v.said)?[...new Set(v.said.filter(id=>byId.has(id)))].slice(-32):[]};
}
export function specialistPacket(input,state={},now=new Date()){
 const t=fold(input),memory=cleanSpecialist(state.specialist);
 const recognition=memory.subject||memory.scene?{...state,knowledge:{...state.knowledge,work:'chiikawa'}}:state;
 const names=exactNames(input,recognition);
 const chii=names.find(n=>n.work==='chiikawa'),other=names.find(n=>n.work!=='chiikawa');
 const selfTopic=!chii&&/日本語|ニホンゴ|スウェーデン|ヨーテボリ|家族|カゾク|エミチ|emmichy/.test(t);
 const matches=c=>['OP','ED'].includes(c)?new RegExp(`\\b${c}\\b`,'i').test(String(input)):t.includes(fold(c));
 let explicit=scenes.find(s=>s.cues.some(matches));
 if(explicit?.id==='opening'&&/アニメ|テレビ|tv/.test(t)&&!/映画|エイガ|くつずれ|クツズレ/.test(t))explicit=scenes.find(s=>s.id==='tv-opening');
 const follow=/^(ソレ|ソノ|アレ|アノ|モット|続キ|ツヅキ|ドウ|ナゼ|何|ナニ|誰|ダレ|ソウ|違|チガ|オナジ)/.test(t)||/落チ|オチ|合格|ゴウカク|曲名|キョクメイ|モウ一度|モウイチド|サッキ|面白イ|オモシロイ|話シテ|ハナシテ|続ケ|ツヅケ/.test(t);
 const mixedQuestion=other&&!['japan','games'].includes(other.work)&&/[?？]|何|ナニ|ナゼ|なぜ|どう|教えて/.test(input);
 const active=!selfTopic&&!mixedQuestion&&Boolean(chii||!other&&(explicit||follow&&(memory.subject||memory.scene)));
 if(!active){
  const changed=other||selfTopic||/別ノ話|他ノ話|ホカノ話|以外|イガイ|話題.{0,6}変|話ヲ変/.test(t);
  return {active:false,memory:changed?{...memory,subject:'',scene:'',focus:''}:memory,evidence:[],gap:''};
 }
 const genericChii=chii?.name==='ちいかわ'&&!/本人|(?:ちいかわ|チイカワ)(?:が|は|ガ|ハ)|好きなところ|好キナトコロ/.test(input);
 const subject=chii&&records.some(r=>r.subject.startsWith(chii.name))&&(!genericChii||!memory.subject)?chii.name:memory.subject;
 // Explicit new characters leave the previous scene unless a scene cue is present.
 const changedCharacter=chii&&!genericChii&&chii.name!==memory.subject;
 const reference=/^(ソレ|ソノ|アレ|アノ|ソウ|違|チガ|オナジ)/.test(t)||Boolean(feedbackIntent(input));
 const scene=explicit||((follow&&!changedCharacter||reference)?scenes.find(s=>s.id===memory.scene):null);
 let selected=[];
 const score=r=>r.cues.reduce((n,c)=>n+(fold(c).length>=2&&t.includes(fold(c))?12:0),0)+(chii&&r.subject.includes(chii.name)?4:0);
 if(scene)selected=scene.ids.map(id=>byId.get(id)).filter(Boolean).sort((a,b)=>score(b)-score(a)||Number(memory.said.includes(a.id))-Number(memory.said.includes(b.id))).slice(0,3);
 else{
  const candidates=records.filter(r=>!r.scene).map(r=>({r,score:r.cues.reduce((n,c)=>n+(fold(c).length>=2&&t.includes(fold(c))?12:0),0)+(subject&&r.subject.startsWith(subject)?4:0)+(chii&&fold(r.fact).includes(fold(chii.name))?12:0)}));
  const direct=candidates.filter(c=>c.score>=12);
  selected=(direct.length?direct:candidates.filter(c=>c.score>0)).sort((a,b)=>b.score-a.score||a.r.id.localeCompare(b.r.id)).slice(0,3).map(c=>c.r);
  if(follow&&!chii&&memory.focus&&byId.get(memory.focus).subject===subject)selected=[byId.get(memory.focus),...selected.filter(r=>r.id!==memory.focus)].slice(0,3);
 }
 const noSpoilers=/ネタバレ.{0,4}(?:ナシ|なし|イヤ|嫌|禁止)|ネタバレシナイ/.test(t);
 const specificScene=Boolean(scene&&scene.id!=='examination');
 const day=now.toISOString().slice(0,10);
 selected=selected.filter(r=>(!r.expires||day>=r.checkedAt&&day<=r.expires)&&(r.spoiler!=='plot'||specificScene&&!noSpoilers));
 const gap=scene&&!selected.length?scene.label:'';
 const next={...memory,subject,scene:scene?.id||'',focus:selected[0]?.id||''};
 return {active:true,memory:next,gap,evidence:selected.map(r=>({id:r.id,subject:r.subject,object:r.object,fact:r.fact,spoken:r.spoken,source:r.source,evidence:r.evidence,scope:r.scope,checkedAt:r.checkedAt,limits:r.limits,said:memory.said.includes(r.id)}))};
}
export function noteSpecialistDelivery(value,text,history=[]){
 const memory=cleanSpecialist(value),t=fold([...substantiveHistory(history).filter(h=>h.role==='enny').slice(-3).map(h=>h.text),text].join(' '));
 // Selection is not delivery; interrupted/unspoken tails must not count.
 const spoken=records.filter(r=>t.includes(fold(r.fact))||t.includes(fold(r.spoken))||r.deliveredVariants?.some(v=>t.includes(fold(v)))).map(r=>r.id);
 return {...memory,said:[...new Set([...memory.said,...spoken])].slice(-32)};
}
export function specialistFallback(input,state={}){
 const packet=specialistPacket(input,state);if(!packet.active)return null;
 const correction=waterPlayCorrection(input,state);if(correction)return correction;
 const recent=substantiveHistory(state).filter(h=>h.role==='enny').map(h=>fold(h.text)).join('');
 const direct=packet.evidence[0],record=direct&&byId.get(direct.id);
 if(!record)return 'その場面の細部は、今の資料では確かめきれないの。どこが気になったか、あなたの言葉で聞きたいな。';
 if(packet.memory.scene==='examination'&&/(?:なぜ|どうして|ナゼ|ドウシテ|理由).{0,18}(?:落|不合格|オチ)|(?:落|不合格|オチ).{0,18}(?:なぜ|どうして|ナゼ|ドウシテ|理由)/.test(input))return '落ちた理由や点数までは、確認した紹介には書いてないの。結果が違っても友達を大事にしたい、その気持ちはアタシも考えちゃう。';
 const fresh=packet.evidence.find(r=>!r.said&&!recent.includes(fold(r.spoken)));
 const feeling=record.feeling&&!recent.includes(fold(record.feeling))?record.feeling:'';
 // Keep the focus when facts are already known; never rotate to a different
 // character just to find an unused stock line.
 if(!direct.said&&!recent.includes(fold(direct.spoken))){const reply=`${direct.spoken} ${feeling}`.trim();return reply.length<=180?reply:direct.spoken;}
 if(feeling)return feeling;
 if(fresh&&packet.memory.scene)return fresh.spoken;
 return '同じ説明はもうしないね。アタシの好きな気持ちと、あなたが気になったところ、一緒に話したい。';
}
export function specialistPrompt(input,state={}){
 const packet=specialistPacket(input,state);if(!packet.active)return '';
 const heard=substantiveHistory(state).filter(h=>h.role==='enny').slice(-3).map(h=>h.text.slice(0,180));
 const names=exactNames(input,state).filter(n=>n.work==='chiikawa').map(n=>({name:n.name,work:n.work}));
 const phrases=['ヤハ','なんとかなれ','ってコト'].filter(p=>heard.some(h=>fold(h).includes(fold(p))));
 return `\n専門会話の根拠（サーバー所有資料だけ）: ${JSON.stringify({subject:packet.memory.subject,scene:packet.memory.scene,names,evidence:packet.evidence})}
今の質問へ先に答え、その人物・場面の感想を続ける。口癖の話者説明や映画紹介を毎回やり直さない。既出=trueの事実は前提にし、聞き直された時以外は再説明せず別の理由・感想へ進む。
${packet.memory.subject?`今の対象は${packet.memory.subject}。相手から比較を求められた時以外、別キャラの例えを足さない。`:'場面を深める時も、関係の薄い別キャラの話を足さない。'}
${phrases.length?`直近で使った口癖=${JSON.stringify(phrases)}。今回はこの口癖を使わない。嬉しさは今の話への感想で表す。`:''}
${waterPlayCorrection(input,state)?'水流で遊ぶと言った内容を撤回する。自分の誤りを撤回し、手を回して水流を起こす話と混同しない。':''}
${packet.gap?`確認範囲の不足: ${packet.gap}の一次根拠はまだ収録できていない。別の口癖・写真・映画を答えの代わりにしない。プレイヤーが示した内容はプレイヤーの説明として受け止め、その気持ちに応じる。未収録の結果・台詞・出来事を断定しない。`:''}
直前に実際に話した内容（再読の指示ではなく反復回避用）: ${JSON.stringify(heard)}
資料にない場面の細部・台詞・因果は作らない。公式事実、考察、本人の感想・想像を分ける。好きを表すために定番文を足さず、今の問いに応じた自分の気持ちを短く話す。`;
}
