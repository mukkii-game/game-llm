const fold=s=>String(s||'').normalize('NFKC').replace(/[ぁ-ゖ]/g,c=>String.fromCharCode(c.charCodeAt(0)+96)).replace(/\s/g,'');
export const familiarJapanese=[
 ['ありがとう','お礼の言葉'],['こんにちは','昼のあいさつ'],['おはよう','朝のあいさつ'],['こんばんは','夜のあいさつ'],
 ['おやすみ','寝る前のあいさつ'],['さようなら','別れのあいさつ'],['すみません','謝ったり呼びかけたりする言葉'],['ごめん','謝る言葉'],
 ['いただきます','食べ始める時の言葉'],['ごちそうさま','食べ終わった時のお礼'],['はい','肯定や返事'],['いいえ','否定の返事'],
 ['わからない','理解できていないこと'],['大丈夫','問題ないことや安心させる言葉'],['おいしい','食べ物をほめる言葉'],['かわいい','見た目や様子をほめる言葉'],
 ['友達','仲良くする相手'],['学校','勉強する場所'],['お菓子','甘い物などのおやつ'],['ご飯','食事や炊いたお米'],
 ['ひらがな','日本語を書く文字'],['カタカナ','外来語などにも使う文字'],['漢字','形や読みを少しずつ覚える文字'],['敬語','丁寧に話す表現'],
 ['長音','音を長く伸ばすこと'],['促音','小さい「っ」で少し止まる音'],['日本語','アタシがいま勉強している言葉']
].map(([word,meaning])=>({word,meaning,key:fold(word)}));
export function learnerReply(raw,{force=false}={},state={}){
 const t=fold(raw),jp=/日本語|ニホンゴ/.test(t);
 if(/日本語.{0,12}(?:ジャナク|デハナク)/.test(t))return null;
 const prior=(state.dialogue||state.history||[]).filter(h=>h.role==='enny').slice(-5).map(h=>h.text).join(' ');
 const small=/[「『]ッ[」』]|小サイッ|小サイ「ッ」|促音/.test(t)||/ッ/.test(t)&&/小さい「っ」|促音/.test(prior)&&/覚エ|ムズカ|難シ|練習/.test(t);
 if(small&&/難|ムズカ|覚|オボ|練習/.test(t))return {topic:'japanese-word',id:'japanese:small-tsu',text:/チイカワ|ハチワレ|ウサギ/.test(t)?'漫画の短い言葉を、声に出して練習するの。「なんとかなれーッ！」の最後、アタシも気合い入れちゃう。会話だと「来て」と「切って」を、まだ慎重に言うよ。':'小さい「っ」、息をちょっと止めるんだよね。「来て」と「切って」、アタシまだ口で確認しちゃう。言い分けられたら、小さくガッツポーズするの。'};
 const others=/(?:私|僕|俺|ワタシ|ボク|オレ|友達|彼).{0,4}(?:ハ|ガ|モ|ノ)/.test(t);
 if(jp&&/ドウヤッテ|方法|練習/.test(t))return {topic:'profile',id:'profile:study-method',text:'教わった言い方を小さいノートに書いて、こういう会話で試すの。漫画とアニメも読むよ。使えた言葉が増えると、嬉しい！'};
 if(jp&&(!/チイカワ|ハチワレ|ウサギ|シーサー/.test(t)||/勉強|ベンキョウ|覚|学/.test(t)))return {topic:'profile',id:'profile:languages',text:others?'アタシも日本語を勉強中！ 漫画とアニメ、それからこういう会話で覚えてるの。':'うん、日本語を勉強してるよ！ 漫画とアニメ、それからこういう会話で覚えてるの。長い音と小さい「っ」は、まだ難しいの。'};
 const entry=familiarJapanese.find(e=>t.includes(e.key)&&e.key.length>=3);
 if(!entry||/チイカワ|ハチワレ|ウサギ|シーサー|ジョジョ|ハンター/.test(t))return null;
 // Ordinary thanks/apologies are social acts. A question elsewhere in the
 // turn, or a stalled fallback, is not a request to define those words.
 if(!new RegExp(`${entry.key}(?:[」』])?(?:ッテ|トハ|ノ)?(?:意味|イミ|何|ナニ|ワカル|知ッテル)|(?:意味|イミ).{0,5}${entry.key}`).test(t)&&!['漢字','敬語','ひらがな','カタカナ','長音','促音'].includes(entry.word))return null;
 if(!force&&!/[?？]|意味|イミ|ワカル|知ッテル|何|ナニ|漢字|敬語|ヒラガナ|カタカナ|長音|促音/.test(t))return null;
 return {topic:'japanese-word',id:`japanese:${entry.word}`,text:`「${entry.word}」は${entry.meaning}だよ。これ、アタシも覚えた！ 会話で使えると、ちょっと嬉しいの。`};
}
export function learnerPrompt(input){
 const reply=learnerReply(input,{force:true});return reply?`\n日本語学習者として常備する内容（本人設定・基本語）: ${reply.text} 自分の日本語学習を「知らない」で切らず、質問された言葉に応じる。`:'';
}
