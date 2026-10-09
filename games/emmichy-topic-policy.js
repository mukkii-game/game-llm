const fandom=/ちいかわ|チイカワ|chiikawa|ハチワレ|ジョジョ|バキ|刃牙|ハンター|HUNTER/i;
const decline=/(?:漫画|マンガ|アニメ|ちいかわ|チイカワ).{0,16}(?:詳しくない|知らない|興味ない|興味がない|嫌い|苦手|以外|イガイ|いがい|やめ|ヤメ|じゃなく|ジャナク)|(?:別|他|ほか)の話/;
export function avoidsFandom(input,history=[]){
 const users=history.filter(h=>h.role==='user').slice(-8).map(h=>String(h.text??h.content??'').normalize('NFKC'));
 users.push(String(input).normalize('NFKC'));
 for(const line of users.reverse()){
  if(decline.test(line))return true;
  if(fandom.test(line))return false;
 }
 return false;
}
export function redirectsFandom(text,messages=[]){
 const users=messages.filter(m=>m.role==='user').map(m=>({role:'user',text:m.content}));
 const current=users.pop()?.text||'';
 return avoidsFandom(current,users)&&fandom.test(text);
}
