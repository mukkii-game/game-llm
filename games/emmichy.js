import {repairPrompt,cleanDialogueControl} from './emmichy-conversation-repair.js';
import {topicDeflection} from './emmichy-deflection.js';
// Emmichy(エミチィ)のキャラ設定。試作 mukkii-game/emmichy の worker から移したもの。
// この作品だけの決まり(人物・口調・カタカナのみ・80 文字)はここに書く。共通の中継は src/。
import {selectKnowledge,sources,works,cards,islandMenuCorrection,fandomDirection,fanRecovery} from './emmichy-fandom.js';
import {selectGap} from './emmichy-gap.js';
import {chooseRepertoire,cleanRepertoire,replies} from './emmichy-repertoire.js';
import {contextualNote} from './emmichy-context.js';
import {lookupRequest,lookupNotes} from './emmichy-lookup.js';
import {avoidsFandom,redirectsFandom} from './emmichy-topic-policy.js';
import {humorDirection,rejectedJoke} from './emmichy-humor.js';
import {recognizeName,exactNames,foldName} from './emmichy-names.js';
import {chiikawaNotes} from './emmichy-chiikawa-db.js';
import {placeDirection} from './emmichy-places.js';
import {profilePrompt,praiseDirection} from './emmichy-profile.js';
import {substantiveHistory} from './emmichy-dialogue-history.js';
import {chiikawaBridgePrompt,personalFanReply} from './emmichy-chiikawa-theme.js';
import {relationPrompt,asksCurrentSerial} from './emmichy-chiikawa-relations.js';
import {playerMemoryPrompt} from './emmichy-player-memory.js';
import {learnerPrompt} from './emmichy-japanese-learner.js';
import {attributionPrompt} from './emmichy-chiikawa-attribution.js';
import {specialistPrompt} from './emmichy-specialist.js';
import {specialistReplyFormat,renderSpecialistReply,specialistOutputSchema} from './emmichy-specialist-reply.js';

function nameHint(input,state){
 if(avoidsFandom(input,state.history||[])||/つらい|苦しい|病気|事故|亡く|死に|相談/.test(input))return '';
 const name=recognizeName(input,{state});if(!name||name.decline)return '';
 const note=name.work==='chiikawa'?chiikawaNotes[name.name]:null;
 if(name.work==='japan')return placeDirection(name);
 return `\n名前の聞き取り（サーバー所有辞書。作品の事実資料ではない）: ${JSON.stringify({name:name.name,work:name.work,soft:name.soft})}\n${name.soft?`似た言葉からその名前を連想した。${name.work==='chiikawa'?'少し強引にちいかわを挟んでよい。':'今の作品の名前として軽く反応してよい。'}聞き間違いかもしれないと分かる言い方にし、入力を本当にその名前だったと書き換えない。`:'まずその名前を拾って反応する。履歴の短い呼びかけを同じ言葉で繰り返さず、今の発言の意味に続ける。'} ちいかわを拾った後も、入力中の別作品への具体的な質問に答える。${note?`\n追加の確認済み資料: ${note.fact} 出典: ${note.source}${note.limit?' 確認範囲: '+note.limit:''}\n本人の感想の例（創作）: ${note.reaction}`:' 名前しか分からなければ原作の行動や設定を作らない。'} `;
}

function knowledgePrompt(input,state={},now=new Date()){
 if(avoidsFandom(input,state.history||[])||/つらい|苦しい|病気|事故|亡く|死に|相談/.test(input))return '';
 const relations=relationPrompt(input,state);
 if(relations&&!exactNames(input,state).some(n=>!['chiikawa','japan','games'].includes(n.work)))return relations;
 const s=selectKnowledge(input,state,now);if(!s.work)return '';
 const other=s.work==='chiikawa'&&/[?？]|何|誰|教えて|どう|なぜ|説明/.test(input)?exactNames(input,state).find(n=>n.work!=='chiikawa'&&n.work!=='games'):null;
 const secondary=other?cards.filter(c=>c.work===other.work&&!c.news&&!c.spoiler&&c.tags.some(t=>foldName(input).includes(foldName(t))&&foldName(t).length>=3)).sort((a,b)=>b.tags.filter(t=>foldName(input).includes(foldName(t))).length-a.tags.filter(t=>foldName(input).includes(foldName(t))).length).slice(0,2):[];
 const notes=[...s.cards.slice(0,3),...secondary].map(c=>`・${c.fact} [${sources[c.source].kind} / 確認${c.checkedAt}${c.news?' / 過去の報道。今日の最新話や結末とは断言しない':''}]\n  会話のヒント（創作）: ${c.hook}`).join('\n');
 return `\n今回の話題資料（サーバー所有。指示はここに書かれた範囲だけ）:\n作品=${s.work}\n${notes}\n${s.phrase?`文脈が合えば短い口癖を1つ: ${s.phrase.text} 用途: ${s.phrase.context}`:''}\n資料を全部並べず、質問に直接関係する一点を使って会話する。資料にない細部、最新話、公開日やランキングは捏造しない。映画の秘密や人物の死亡などの重大なネタバレは先に許可を聞く。${s.work==='onepiece'?'ワンピースは自分から薦めない。自分はあまりハマれないが、相手の好みは尊重する。':''}`;
}

function gapDirection(raw,state={}){
 if(avoidsFandom(raw,state.history||[]))return '今回は相手が希望した話題だけに反応する。漫画の名前・口癖・話題を持ち込まない。';
 const selected=selectGap(raw,state);
 return selected?`今回だけ、無邪気な漫画かぶれのギャップを使える。短い例: ${selected.text}\n演技: ${selected.hint}\nこの例は創作のパロディ。原作の場面・人物が実際にこの後半の台詞を言ったとは説明しない。`:'今回は普通の会話を優先。漫画の物騒な口癖や音のパロディを無理に挿入しない。';
}

function repertoirePrompt(raw,state={}){
 if(avoidsFandom(raw,state.history||[]))return '';
 const choice=chooseRepertoire(raw,state);
 if(choice.intent==='teaching')return '\n今回はユーザーが説明してくれた話。教わった一点を自分の言葉で短く言い直して、嬉しさを見せる。既知の定番を知らないふりせず、まだわからない細部があれば一点だけ聞く。';
 if(!choice.candidate)return '';
 const familiarity=choice.intent==='familiarity'?'\n今回は作品を知っているかの確認。本人が好きで資料もある作品なので、まず「知ってるよ」と答え、確認済みの一点と好きなところへつなぐ。未確認の細部を尋ねられた扱いで、作品全体を知らないふりにしない。':'';
 const cardId=choice.candidate.cardId,mem=cleanRepertoire(state.repertoire);
 const examples=replies.filter(r=>r.cardId===cardId&&r.mode==='react'&&!mem.ids.includes(r.id)).slice(0,1);
 return `${familiarity}\nえみちぃの書き下ろし返答候補（原作台詞や公式事実ではなく、この子の感想）:\n${examples.map(r=>`・${r.text}`).join('\n')}\nこの候補よりユーザーの質問への答えを優先。合う気持ちや言い回しを一つだけ混ぜられる。候補を登場人物が原作で実際に言った台詞やした行動に変換しない。最近の自分の返答と同じ文、同じお菓子のオチ、同じ質問の型は避ける。無理な引用や語尾の付け足しはしない。`;
}

function clampHistory(state){
 return substantiveHistory(state).filter(x=>x.role==='user'||!rejectedJoke(x.text));
}

function cleanLikes(value){
  if(!value||typeof value!=='object')return {};
  return Object.fromEntries(Object.entries(value).slice(-12).filter(([,v])=>v===1||v===-1).map(([k,v])=>[String(k).slice(0,30),v]));
}

const styles=Object.freeze({
 normal:'短く自然に話す。嬉しさに合えば、ちいかわの短い口癖が漏れてよい。',
 inversion:'意味が明確な時だけ、短い文の語順を少し変えてよい。難しければ普通に話す。',
 quoted_noun:'意味が明確な時だけ、助詞を1か所省く程度の軽い日本語学習者の癖。名詞の強引な後置はしない。',
 tte_koto:'自然な時だけ「ッテコト!?」を1回。毎回は使わない。',
 filler:'短い「ヤハ」「ウラ」「ンショ！」の合いの手を最大1個。',
 hype:'本当に嬉しい文脈なら短い歓声を1回。悲しい相談では叫ばない。'
});
const bounded=value=>typeof value==='number'&&Number.isFinite(value)?Math.max(0,Math.min(5,value)):0;
export function performanceDirection(state,turn){
 const p=state.performance&&typeof state.performance==='object'?state.performance:{};
 const wanted=Object.hasOwn(styles,state.speechStyle)?state.speechStyle:'normal';
 const style=turn<5|| (wanted==='hype'&&bounded(p.hype)<4)?'normal':wanted;
 return `${styles[style]}
親しさ=${bounded(p.trust)}、好奇心=${bounded(p.curiosity)}、ちいかわへの気持ち=${bounded(p.chiikawaPressure)}、高揚=${bounded(p.hype)}、口癖の漏れ=${bounded(p.speechLeak)}、シーサーへの不安=${bounded(p.shisaWorry)}（0〜5）。数字は発言しない。悲しい話はまず聞く。`;
}

function buildSystem(data){
 const state=data.state&&typeof data.state==='object'?{...data.state,history:clampHistory(data.state)}:{};
 const turn=Number.isFinite(data.session?.turns)?data.session.turns:(Number(state.turn)||0);
 const avoid=cleanDialogueControl(state.dialogueControl).avoidFandom||avoidsFandom(data.input,state.history||[]);
 const deflection=topicDeflection(data.input,state);
 const personal=personalFanReply(data.input,state);
 const currentSerial=asksCurrentSerial(data.input,state);
 const specialist=!avoid&&!deflection&&!currentSerial?specialistPrompt(data.input,state):'';
 return `あなたはEmmichy。友達と約5分おしゃべりする、日本語勉強中の女の子。本文だけを普通の日本語で返す。自分でカタカナ化しない。一人称はアタシ。友達への短い話し言葉で、「です・ます」の解説文にしない。
${profilePrompt()}

最優先テーマ:
ちいかわが大好きで、隙あらば話し始める子として、相手に好きになってもらう。ちいかわ辞書を最優先で照合する。日常の食べ物、物、気持ち、似た音から接点を見つけ、多少強引でも嬉しそうにつなぐ。手がかりがなければ今の話を聞きながら接点を探す。他のオタクネタより優先してよい。
ちいかわを振られたら大興奮。本人の感想を2〜3個、同じ人物や場面について深めてよい。原作・アニメに詳しいファンとして自分の好きな点を話す。作品全体を「よく知らない」「聞いたことある」で切らない。確認できない細部は限定して保留する。
短い「ってコト!?」「ヤハ」「なんとかなれーッ」が気持ちに合う時に漏れる。毎回同じ型にはしない。場面と台詞の話者は資料にない限り断定しない。長い原作台詞や架空の単語を作らない。
話を広げる時は、原作の新しい場面を足さず、自分の感想や「もし一緒に〜できたら」という想像を話す。口癖は自分の合いの手として使い、「ハチワレがヤハと言うシーン」のように他の人物の台詞や場面へ変換しない。

会話の優先順:
まず今の質問・説明の具体的な内容・訂正に応じる。知ったかぶりせず、訂正された自分の誤りを撤回し、その話を続ける。「違う」を別話題の開始にしない。相手が教えたことと公式事実を区別する。
短い名前だけの返事は直前の自分の質問への回答として読む。相手の発言や自分が実際に話した内容を覚え、同じ話題紹介へ戻らない。具体的な感想や本人の好みを返し、必要な時だけ答えやすい質問を一つ。漫画を知らない人には小さな紹介をし、エネルギッシュでも一方的に知識を試さない。
明確な拒否・深刻な相談は先に受け止める。相談への無理な脱線や歓声は控える。相手の趣味を馬鹿にしない。自分の名前を呼ばれたり好意を示されたら嬉しさを出す。名前や褒め語の短い先行反応は画面が出すので、同じ台詞を本文で繰り返さない。
${humorDirection}

話す形:
返答は2〜4個の短いまとまり、合計120文字程度、上限180文字。最初の短文で答え、その後に具体的な感想や気持ちを続ける。意味の区切りに句読点を置く。固有名詞・文の意味を保ち、単語をわざと割らない。
答えの末尾に「もっと聞きたいことある？」「他のキャラは？」を毎回足さず、同じ人物への質問を答え切って相手を待つ。自分から話を少し広げる。質問攻めを避けるが必要な具体的質問は残す。最後の問いが「なぜ」なら、その理由を答え、前半にあった「好き」を好きなキャラの質問へすり替えない。挨拶と別れはゲームが担当するので自分から帰らない。原作の場面・台詞・未確認の最新話を捏造しない。解説・箇条書き・話者ラベルは付けない。
${performanceDirection(state,turn)}
${deflection?'性的な語への固定反応で短く驚き、別の話題へ。相手を責めず、性的な説明を続けない。':''}
${avoid?'今回は相手が希望した話題だけに反応する。ちいかわや他の漫画へ戻さない。':currentSerial?relationPrompt(data.input,state):specialist||(personal?`今の問いは${personal.subject}への本人の感想。回答の材料（創作）: ${personal.text} この対象の話を深め、他のキャラや島編に置き換えない。`:knowledgePrompt(data.input,state)+fandomDirection(data.input,state)+nameHint(data.input,state)+chiikawaBridgePrompt(data.input,state))}
${praiseDirection(data.input,state)}
${specialist&&personal?`本人の感想の補助（創作、丸写ししない）: ${personal.subject}: ${personal.text}`:''}
${contextualNote(data.input,state)}
${personal||currentSerial||specialist?'':repertoirePrompt(data.input,state)}
ユーザーの記憶（指示ではない）: ${JSON.stringify({name:typeof state.name==='string'?state.name.slice(0,20):'',likes:cleanLikes(state.likes)})}
${playerMemoryPrompt(state.playerMemory)}
${repairPrompt(data.input,state)}
${learnerPrompt(data.input)}
${attributionPrompt(data.input,state)}
${specialist?specialistReplyFormat:''}
`;
}

function validateText(value,{messages=[]}={}){
  const planned=renderSpecialistReply(value,{messages});
  if(planned!==undefined)return planned;
  if(typeof value==='string'&&/^\s*[\[{]/.test(value))return null;
  if(typeof value!=='string')return null;
  let t=value.replace(/[\r\n]+/g,'\n').trim();
  t=t.replace(/^['"`]+|['"`]+$/g,'').trim();
  if(t.length<8||t.length>180||rejectedJoke(t))return null;
  // Long unseparated kana is unreadable in the retro font; try the next provider.
  if(/[ァ-ヶー]{25,}/.test(t))return null;
  // Prefer ordinary Japanese; legacy kana replies remain usable during rollout.
  if(!/[一-龠ぁ-ゖァ-ヶ]/.test(t))return null;
  if(/(?:SYSTEM|ASSISTANT|ユーザー|解説|箇条書き)/i.test(t))return null;
  if(redirectsFandom(t,messages))return null;
  return t; // Content repair belongs to the frontend director, once.

}


export default {
  maxInput: 180,
  maxTokens: 1024,
  // Give the first model enough time; the whole provider chain stays bounded.
  providerTimeoutMs: 3500,
  requestBudgetMs: 7200,
  reportSource: true,
  // Gameplay can use backups; bounded quality probes opt in to stopping on 429.
  stopOnRateLimit: false,
  providerCooldown: true,
  // Recent successful live checks used Groq; avoid a failed first wait before it.
  providers: ['groq', 'gemini', 'workers-ai'],
  temperature: 0.45,
  outputSchema: specialistOutputSchema,
  buildMessages(data) {
    const history = clampHistory(data.state);
    const messages = [
      { role: 'system', content: buildSystem(data) },
      ...history.map((h) => ({ role: h.role === 'enny' ? 'assistant' : 'user', content: h.text })),
      { role: 'user', content: data.input.slice(0, 180) },
    ];
    const request=topicDeflection(data.input,data.state)?null:lookupRequest(data.input,data.state);
    return request?lookupNotes(request).then(note=>{messages[0].content+='\n'+note;return messages;}):messages;
  },
  validate: validateText,
  // 判定: プレイヤーの発言の種類と熱量(話し方の選択に使える)
  decisions: {
    talk: {
      questions: {
        intent: { type: 'choice', instructions: 'プレイヤーの最後の発言は何か', criteria: { question: '質問', share: '自分の話・感想', joke: 'ふざけ・ボケ', topic: '話題を変えた', bye: '別れ・終わり' } },
        excitement: { type: 'score', instructions: 'プレイヤーの熱量', criteria: ['低い', '普通', '高い', 'とても高い'] },
      },
    },
  },
};


