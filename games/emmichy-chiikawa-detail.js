// Small primary-source additions reviewed on 2026-10-17. Descriptions are
// paraphrases, not transcripts. Creator comments retain their film scope.
const interview='https://chiikawa.toho-movie.jp/interview/nagano.html';
const anime='https://www.anime-chiikawa.jp/localdata/youtube.json';
export const detailFacts=Object.freeze([
 {id:'reviewed:tv:no-opening',subject:'TVアニメ',object:'OPなし',scene:'tv-opening',cues:['テレビのOP','TVアニメのOP','アニメのオープニング'],fact:'ナガノは映画公開前の公式インタビューで、短い放送時間のTVアニメにはOPがないと説明している。',spoken:'TVアニメにはOPがない、ってナガノが公式インタビューで説明してるの。「くつずれ」は映画のOPだよ。',feeling:'映画では、もしOPがあったら、という発想から作ったんだって。入口の音楽まで考えるの、楽しいね。',source:interview,scope:'creator-interview:tv-music',limits:['インタビュー時点のTV版の説明','将来の全放送形態を保証しない','映画のOPやTVのEDと混同しない']},
 {id:'detail:siren:design',subject:'セイレーン',object:'犬張子と金魚を思わせる造形',scene:'siren-design',cues:['セイレーンのデザイン','セイレーンのモデル','犬張子','犬張り子','下半身'],fact:'ナガノはセイレーンの頭のモデルを犬張子、下半身を赤い金魚のような形と説明している。',spoken:'セイレーンの頭のモデルは犬張子で、下半身は赤い金魚みたいな感じ。ナガノの公式インタビューの話だよ。',feeling:'アタシ、かわいい顔と大きな体の組み合わせに目が止まっちゃう。描くなら、まず輪郭をじっと見たいな。',source:interview,scope:'film-creator:design',limits:['作中の種族や生態を犬・金魚と断定しない','襲う理由や結末の説明ではない']},
 {id:'detail:islanders:voices',subject:'ヒトハとフタバ',object:'演技の違い',scene:'islander-voices',cues:['ヒトハ','フタバ','性格','違い','声の演技'],fact:'映画の演技についてナガノはヒトハに少し抜けた雰囲気、フタバにしっかりした雰囲気を依頼したと語る。',spoken:'映画の演技では、ヒトハは少し抜けた感じ、フタバはしっかりした感じに、とナガノがお願いしたんだって。',feeling:'似た姿でも、動きや声の感じで違いを見たくなるね。言葉が少ないところ、アタシも表情まで追っちゃう。',source:interview,scope:'film-creator:acting',limits:['原作全場面の性格診断に広げない','台詞や正体を追加しない']},
 {id:'detail:film:flyer',subject:'ちいかわとハチワレ',object:'チラシを見る仕草への演出指定',scene:'flyer',cues:['チラシ','仕草','しぐさ','表情の演出'],fact:'映画で二人がチラシを見る際、横から手を出すちいかわが奪い取る仕草にならないようナガノが依頼した。',spoken:'映画で二人がチラシを見る時、ちいかわが横から奪うような動きにならないように、ってナガノがお願いしたの。',feeling:'手の出し方ひとつで、その子らしさが変わるのね。アタシ、そういう小さい動きまで好きになっちゃう。',source:interview,scope:'film-creator:direction',limits:['チラシの文面やその後を足さない','漫画でも同じ演出としない']},
 {id:'detail:anime:pudding',subject:'ちいかわとうさぎ',object:'プリンの上のうさぎ',scene:'pudding',cues:['かためのプリン','固めのプリン','プリンの上','第1話','一話'],fact:'アニメ第1話の公式あらすじでは、ちいかわがプリンの上に乗るうさぎを見つける。',spoken:'アニメ第1話で、ちいかわはプリンの上に乗るうさぎを見つけるの。',feeling:'プリンを食べたいのに、その上のうさぎも見てたい！ アタシ、目とお腹で相談になっちゃう。',source:anime,scope:'anime:1-summary',limits:['プリンの作り手や材料を推測しない','歌や台詞を足さない']},
 {id:'detail:anime:book',subject:'ちいかわとハチワレ',object:'エジプトの本',scene:'egypt-book',cues:['エジプト','スフィンクス','エジプトの本'],fact:'アニメ第2話の公式あらすじは、ちいかわとハチワレがエジプトの本を読むと紹介している。',spoken:'アニメ第2話で、ちいかわとハチワレがエジプトの本を読むの。',feeling:'友達と同じ本をのぞく時間、いいな。アタシも、わからない言葉を見つけたら隣の人と考えたくなる。',source:anime,scope:'anime:2-summary',limits:['本の文章や二人の感想を創作しない','その後の展開をあらすじの疑問形から断定しない']},
 {id:'detail:anime:pie',subject:'うさぎ',object:'パイシチューへ落ちる',scene:'pie-stew',cues:['パイシチュー','シチュー','パイの中'],fact:'アニメ第3話の公式あらすじは、うさぎがパイシチューの中に落ちたか、という出来事を紹介している。',spoken:'第3話には、うさぎがパイシチューの中に落ちちゃった！？っていう公式あらすじがあるの。',feeling:'パイシチューって聞くとお腹がすくのに、うさぎはどうなるの、って目が忙しくなる。食べ物の大きさにもわくわくしちゃう。',source:anime,scope:'anime:3-summary',limits:['公式あらすじの疑問形を維持','落ちた原因・救出方法・後の行動を足さない']},
 {id:'detail:rakko:ranking',subject:'ラッコ',object:'討伐ランキング1位',cues:['討伐ランキング','ランキング','一位','1位','強さ'],fact:'映画公式の人物紹介はラッコを討伐ランキング1位で、強さを目指し続ける憧れの存在と紹介する。',spoken:'ラッコは討伐ランキング1位。強くなることを心に決めてる、ちいかわたちの憧れなの。',feeling:'強いのに、まだ強くなろうとするのが好き！ その横で甘い物の好みは仲間だ、って喜んじゃう。',source:'https://chiikawa.toho-movie.jp/atm/characters.html',scope:'film-character:rakko',limits:['ランキングの集計期間や全順位を作らない','戦闘力の数値にしない']}
].map(r=>Object.freeze({...r,evidence:'official',checkedAt:'2026-10-17',spoiler:'none'})));
export const detailScenes=Object.freeze([
 {id:'siren-design',cues:['セイレーンのデザイン','セイレーンのモデル','犬張子','犬張り子'],ids:['detail:siren:design'],label:'セイレーンのデザイン'},
 {id:'islander-voices',cues:['ヒトハとフタバ','ヒトハトフタバ'],ids:['detail:islanders:voices'],label:'ヒトハとフタバの演技'},
 {id:'flyer',cues:['チラシ'],ids:['detail:film:flyer'],participants:['ちいかわ','ハチワレ'],label:'映画のチラシを見る仕草'},
 {id:'pudding',cues:['かためのプリン','固めのプリン','プリンの上','第1話のプリン','第1話ノプリン','プリンの場面','プリンノ場面'],ids:['detail:anime:pudding'],participants:['ちいかわ','うさぎ'],label:'第1話のプリン'},
 {id:'egypt-book',cues:['エジプト','スフィンクス'],ids:['detail:anime:book'],participants:['ちいかわ','ハチワレ'],label:'第2話の本'},
 {id:'pie-stew',cues:['パイシチュー'],ids:['detail:anime:pie'],participants:['うさぎ'],label:'第3話のパイシチュー'}
]);
