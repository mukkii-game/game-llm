import {substantiveHistory} from './emmichy-dialogue-history.js';
const fold=s=>String(s||'').normalize('NFKC').replace(/[ぁ-ゖ]/g,c=>String.fromCharCode(c.charCodeAt(0)+96)).replace(/[\s。、!?！？「」]/g,'');
// Original opinions attached to a known scene. No additional events, dialogue
// or motives are asserted. Unlike profile cards, these can deepen one scene.
const views={
 pudding:[
  {cue:/特別|トクベツ|食ベル前|ゴホウビ/,text:'わかる、食べる前からごほうびみたい。アタシなら、まず眺めて、それから大事にひと口。結局もうひと口、ってなりそうだけど。'},
  {cue:/カワイイ|可愛イ|ウサギ|甘|アマ/,text:'うさぎも見てたいし、プリンも食べたい！ アタシ、あの組み合わせを考えると目とお腹が忙しくなるの。大きい食べ物って、夢があるね。'},
  {text:'アタシ、食べ物の名前だけで喜んじゃうのに、その上にうさぎ！ 普通のおやつの話で終わらないところが好き。'},
  {text:'「ぷるぷる」って日本語、プリンにぴったりで好き。口で言うだけでも、ちょっと揺れてる気分になるの。あなたは、かためと柔らかいの、どっち派？'},
  {text:'アタシはかため派かな。形を見て楽しんでから食べたいの。さっきの特別な感じ、って見方も合わせたら、ひと口が遅くなっちゃうね。'}
 ],
 flyer:[
  {cue:/気持|キモチ|ドウ思|ドウオモ|優シ|ヤサシ|奪|ウバ/,text:'アタシは、ぐいっと奪わない手つきだと、隣で一緒に見たい気持ちが伝わる気がするの。小さい動きなのに、見てるアタシまで安心する。'},
  {cue:/細カ|コマカ|オ願イ|オネガイ|作|ナガノ/,text:'ほんの少し手の出し方が違うだけで、受け取る感じが変わるのね。アタシ、次は顔だけじゃなくて、手の動きも追いたくなっちゃった。'},
  {text:'アタシは、言葉がなくてもその子らしさが見えるところに弱いの。日本語がすぐ出ない時も、そんなふうに優しく伝わったらいいな。'},
  {text:'二人で同じものを見てる、その距離が好きなんだと思う。アタシなら、相手の見てるところをのぞいて、一緒に笑いたくなる。'}
 ],
 'egypt-book':[
  {cue:/辞書|想像|予想|ヨソウ/,text:'辞書の前に、相手の想像を聞くのいいね！ アタシも、自分の予想を先に言ってみたい。答えが違っても、どこからそう思ったか聞くのが楽しそう。'},
  {text:'アタシも誰かと同じ本をのぞきたい！ 一人なら飛ばしちゃう言葉も、二人だと気になりそう。どこを指さすかにも、その人らしさが出るよね。'},
  {text:'知らないものを一緒に見るって、ちょっと冒険みたい。アタシなら日本語の読み方を教わって、次のページでは先に読んでみたくなる。'},
  {text:'本の話でこんなにわくわくしちゃった。一人で読む時と、誰かとページをめくる時で、好きなところも変わりそうね。'},
  {text:'同じところで笑えたら嬉しいし、別のところを見つけても面白そう。アタシ、読み終わるより先に話し始めちゃいそうね。'}
 ],
 'siren-design':[
  {cue:/怖|コワ|カワイイ|可愛/,text:'かわいいのに、全体を見るとちょっと身構えちゃう。その感じが好き！ アタシ、顔から体へ、何回も目を戻しそう。'},
  {text:'犬張子と金魚って、組み合わせを聞いただけでも形を描きたくなる。アタシなら、最初は丸い顔から。でも全身を収めるところで紙が足りなくなりそう。'},
  {text:'アタシは、かわいいだけで気を抜けない感じに惹かれるな。好きなのと、少し怖いのが、一緒に来るの。'}
 ]
};
export function sceneConversationReply(scene,input,state={}){
 const pool=views[scene];if(!pool||state.dialogueControl?.avoidFandom)return null;
 const t=fold(input);
 if(/何話|ナンワ|誰(?!カ)|ダレ(?!カ)|何級|結果|合否|出典|ソース|正確|本当ニ|手作リ|テヅクリ|ヤメ|以外|イガイ(?!イ)/.test(t))return null;
 const heard=substantiveHistory(state).filter(h=>h.role==='enny').map(h=>fold(h.text)).join(' ');
 const fresh=pool.filter(v=>!heard.includes(fold(v.text)));
 const text=(fresh.find(v=>v.cue?.test(t))||fresh.find(v=>!v.cue))?.text;
 return text?(/(?:ソコ|ソノ仕草|ソウイウ細カイ仕草).{0,4}(?:好キ|スキ)[?？]/.test(String(input).replace(/[ぁ-ゖ]/g,c=>String.fromCharCode(c.charCodeAt(0)+96)).replace(/\s/g,''))?'うん、好き！ ':'')+text:null;
}
