import {exactNames} from './emmichy-names.js';
import {substantiveHistory} from './emmichy-dialogue-history.js';
const fold=s=>String(s||'').normalize('NFKC').replace(/[ぁ-ゖ]/g,c=>String.fromCharCode(c.charCodeAt(0)+96)).replace(/\s/g,'');
// Conversational moves over an already established subject. These are authored
// personal views, never additional canon or a general semantic classifier.
const topics={
 exam:{focus:['exam:attempt','exam:result','exam:celebrate'],cues:/受カ|ウカ|合格|不合格|落チ|オチ|結果|喜|嬉|ウレシ|悔|クヤシ|友達|気持チ|キモチ|気遣|キヅカ|優シ|ヤサシ|言イ|イイ|祝|オメデトウ/,
  angles:[
   {text:'アタシなら、まず「おめでとう」だけ言うかな。自分の結果の話は、そのあとでもいいし。',seen:/マズ「?オメデトウ|先ニ.{0,8}オ祝/},
   {text:'すぐ明るい顔になれなくても、一緒にいてほしいな。アタシなら、少し待ってくれるだけで助かる。',seen:/待ッテクレル|一緒ニイテホシイ/},
   {text:'嬉しい時も、悔しい時も、どっちかの役だけにならなくていいと思うの。アタシは、言葉にならない時間も大事にしたい。',seen:/言葉ニナラナイ時間/}
  ]},
 cookie:{focus:['exam:cookie'],cues:/クッキー|写真|シャシン|撮|トリ|トッ|食ベ|タベ|残|ノコ|眺メ|ナガメ|包装|ラッピング/,
  angles:[
   {text:'アタシなら、一枚撮ってから食べる！ 写真を見返す楽しみも、おやつの時間も、両方ほしいの。',seen:/(?:一枚|写真).{0,8}撮ッテカラ食ベ|両方ホシイ/},
   {text:'アタシなら、ココアも用意して、ゆっくりおやつにしたい。大事なお祝いなら、急いで食べるのはもったいないな。',seen:/ココアモ用意|急イデ食ベル/},
   {text:'アタシなら、包みも小さい箱に取っておきたい。お菓子がなくなっても、もらった時の嬉しさは残したいな。',seen:/包ミモ|小サイ箱ニ取ッテ/}
  ]},
 photo:{focus:['relation:chiikawa-9'],cues:/写真|シャシン|カメラ|撮|トリ|トッ|残|ノコ|思イ出|オモイデ/,
  angles:[
   {text:'アタシなら、上手に撮れた一枚だけじゃなくて、少しぶれた写真も残したい。一緒に笑った時間まで思い出せそう。',seen:/ブレタ写真/},
   {text:'撮るのに夢中で、目の前を見逃すのは惜しいな。アタシなら一枚撮ったら、カメラを置いて楽しみたい。',seen:/カメラヲ置イテ/}
  ]},
 food:{focus:['relation:chiikawa-10'],cues:/料理|リョウリ|作|ツク|食ベ|タベ|ご飯|ゴハン|一緒|イッショ/,
  angles:[
   {text:'アタシなら、食べる係だけじゃなくて、片付けも一緒にしたい。おいしかった、って伝えるところまで楽しみなの。',seen:/片付ケモ一緒/},
   {text:'一緒に作るなら、アタシはおやつを担当したいな。シナモンロールとココアなら、ずっと相談できちゃう。',seen:/オヤツヲ担当/}
  ]}
};
export function fanConversation(input,state={}){
 const memory=state.specialist||{},topic=Object.keys(topics).find(k=>topics[k].focus.includes(memory.focus));
 if(!topic||state.dialogueControl?.avoidFandom)return null;
 const t=fold(input);
 if(/別ノ話|他ノ話|ホカノ話|以外|イガイ(?!イ)|ヤメ|繰リ返|クリカエ|相談|病気|事故|亡ク|死ニ|ツライ|苦シ/.test(t))return null;
 const names=exactNames(input,{...state,knowledge:{...state.knowledge,work:'chiikawa'}});
 if(names.some(n=>n.work!=='chiikawa'||n.name!=='ちいかわ'&&!memory.subject?.includes(n.name)&&!(memory.scene==='examination'&&n.name==='ハチワレ')))return null;
 // An explicit fact question must retain its answer, not become a feeling.
 if(/何話|ナンワ|何級|ナンキュウ|点数|得点|誰ガ|ダレガ|ドコデ|イツ|ナゼ落|ドウシテ落|ナゼオチ|ドウシテオチ/.test(t)||topic==='cookie'&&/手作リ|テヅクリ|買ッタ|カッタ/.test(t)||/[?？]/.test(t)&&!/(?:ドウ思|ドウオモ|ナラ|ドウスル)/.test(t))return null;
 const own=/(?:エミチ[ィイ]|emmichy|アナタ|君)(?:ナラ|ハドウ)|(?:エミチ[ィイ]|emmichy).{0,5}ドウスル/i.test(t);
 const implicitView=!names.length&&/(?:シタイ|食ベタイ|タベタイ|残シタイ|ノコシタイ|撮リタイ|トリタイ|言イタイ|イイタイ)(?:ナ|ヨ|デス|ケド)?$/.test(t);
 const view=implicitView||/(?:私|僕|俺|ワタシ|ボク|オレ|自分).{0,60}(?:思ウ|オモウ|派|言|イウ|シタイ|シタク|好キ|スキ|食ベ|残|撮)|(?:イイヨネ|イイナ|言イタイ|イイタイ)|派(?:ダ|デス)?$/.test(t);
 if(!own&&!(view&&topics[topic].cues.test(t)))return null;
 const stance=topic==='cookie'?( /食ベ(?:ズ|ナイ)|タベ(?:ズ|ナイ)/.test(t)?'keep':/写真|シャシン|撮|トリ/.test(t)?/スグ食ベ|スグタベ/.test(t)?'eat':'photo':/食ベ|タベ/.test(t)?'eat':''):
  topic==='exam'?/言イヅラ|イイヅラ|言イニク|イイニク/.test(t)?'hesitate':/オメデトウ|祝/.test(t)?'celebrate':'':topic;
 return {topic,kind:own?'ask-personal':'player-view',stance};
}
export function fanConversationReply(input,state={}){
 const character=characterConversation(input,state);if(character)return character;
 const move=fanConversation(input,state);if(!move)return null;
 const heard=substantiveHistory(state).filter(h=>h.role==='enny').map(h=>fold(h.text)).join(' ');
 const angle=topics[move.topic].angles.find(a=>!heard.includes(fold(a.text))&&!a.seen.test(heard));
 const acknowledgment=move.kind==='ask-personal'?'':move.stance==='hesitate'?'言いづらくなるんだね。':move.stance==='celebrate'?'まず、おめでとうって伝えたいんだね。':move.stance==='keep'?'食べずに写真で残したいんだね。':move.stance==='photo'?'写真で残したい派なんだね。':move.stance==='eat'?'食べて楽しみたい派なんだね。':'うん、あなたの見方も聞けて嬉しい。';
 return {subject:`fan-conversation:${move.topic}`,text:(acknowledgment+' '+(angle?.text||'アタシ、いまのあなたの見方を考えてる。')).trim(),move};
}

// Opinions need the player's particular point, not a rotation through a
// character profile. These are original feelings, not additional manga facts.
function characterConversation(input,state){
 const t=fold(input),memory=state.specialist||{},history=substantiveHistory(state);
 if(state.dialogueControl?.avoidFandom||/以外|イガイ(?!イ)|ヤメ|繰リ返|クリカエ|日本語|ニホンゴ|パン屋|塩パン/.test(t))return null;
 const names=exactNames(input,state),named=names.find(n=>n.work==='chiikawa'&&n.name!=='ちいかわ'&&n.name!=='あのこ');
 const subject=named?.name||memory.subject;
 if(subject!=='ハチワレ'||memory.scene==='examination'||memory.focus==='exam:cookie')return null;
 if(/(?:ドコ|ドンナトコロ|ドウイウトコロ|好キナトコロ).*(?:好キ|スキ|教エ|聞カセ)/.test(t)&&/[?？]/.test(t)&&!/二人|フタリ|関係|カンケイ|気遣|キヅカ|気ニカケ/.test(t))return null;
 if(/何話|ナンワ|何級|ナンキュウ|誰ガ|ダレガ|作ッタノ|手作リ|テヅクリ|合否|結果|正確|本当ニ/.test(t))return null;
 const spoken=history.filter(h=>h.role==='enny').map(h=>fold(h.text)).join(' ');
 const pick=(id,lines)=>{const text=lines.find(s=>!spoken.includes(fold(s)));return text?{subject:`hachiware:${id}`,text}:null;};
 if(/喜ブ|ヨロコブ|喜ンデ|ヨロコンデ|ホットスル|安心|アンシン/.test(t)&&/嬉シ|ウレシ|好キ|スキ|弱イ|ヨワイ|ホット|安心/.test(t))return pick('shared-happiness',[
  '誰かが喜ぶと、自分まで嬉しくなるんだね。アタシも、そういう顔を見ると同じ顔になっちゃう。読んでるだけなのに、隣にいるみたいで。',
  'ほっとする、ってその感じに合うね。アタシ、言葉の意味だけじゃなくて、いまの気持ちと一緒に覚えられた気がする。',
  '一緒にいる安心感が好きなんだね。大事件がなくても、そばでご飯を食べる時間を見ていたくなるな。'
 ]);
 if(/工夫|クフウ|ヤッテミル|ガンバレー/.test(t)&&!/料理|リョウリ|食ベ|タベ|味|アジ/.test(t))return pick('trying',[
  '工夫しながらやってみるところなんだね。結果が出る前から、もう応援したくなる！ アタシも日本語を言い直す時、もう一回、って勇気を借りたいな。',
  '上手にできた時だけじゃなく、途中も見ていたいよね。アタシなら、小さい工夫に気づいたところで拍手しちゃいそう。'
 ]);
 if(/二人|フタリ|関係|カンケイ|気遣|キヅカ|気ニカケ|ミンナデ過ゴ/.test(t)&&/好キ|スキ|イイヨネ|自然|シゼン|優シ|ヤサシ/.test(t))return pick('friendship',[
  'わかる、何でも大げさなお礼にしない近さ、いいよね。アタシも、うまく話せない日でも隣にいられる友達っていいな、と思う。',
  '二人を見てると、元気な時だけ友達じゃない、って感じるの。言葉が出ない時も一緒にいてくれるの、アタシにはすごく心強いな。',
  '気にかけるって、日本語の言い方も好き。相手が頭の中にちゃんといる感じ。アタシもそんなふうに話したいな。'
 ]);
 if(/料理|リョウリ|工夫|クフウ|一生懸命|イッショウケンメイ/.test(t)&&/好キ|スキ|弱イ|ヨワイ|頑張|ガンバ/.test(t))return pick('cooking-effort',[
  '一生懸命なところなんだね！ アタシは、上手かどうかだけで見たくなくなるの。作ってくれたら「おいしい」を、ちゃんと日本語で伝えたいな。',
  '工夫してるところに惹かれるんだね。アタシなら、横で味見の係をしたい。あ、食べる口実、半分入っちゃった。',
  '工夫を見つけると、一緒に喜びたくなるよね。アタシも日本語が通じた日は、ハチワレに聞いてもらう想像しちゃう。'
 ]);
 if(/明ルイ|アカルイ|話シ方|ハナシカタ|ナントカナレ/.test(t)&&/好キ|スキ|カワイイ|イイヨネ/.test(t))return pick('voice',[
  '明るい話し方、いいよね！ アタシ、読んでると声まで想像しちゃう。元気を分けてもらった感じで、返事もちょっと大きくなるの。',
  'あの勢い、好き！ 日本語で一歩出るのを迷った時、アタシも声に力を借りたくなる。失敗しても、まず言ってみようって。'
 ]);
 if(/頑張|ガンバ/.test(t)&&/応援|オウエン|好キ|スキ/.test(t))return pick('effort',[
  '応援したくなるの、わかる！ アタシ、読んでる時はつい手を握っちゃう。ハチワレの、どんな頑張りに弱い？',
  '頑張ってるのを見ると、結果だけで話を終わらせたくないな。途中の小さい工夫にも、よくやったって言いたくなるの。'
 ]);
 return null;
}
