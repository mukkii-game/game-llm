// The last concrete question/report can move a turn away from a name in its
// preamble. This is a bounded cue, not a general language understanding model.
export const foldTurn=s=>String(s||'').normalize('NFKC').replace(/[ぁ-ゖ]/g,c=>String.fromCharCode(c.charCodeAt(0)+96)).replace(/\s/g,'');
export function currentTurnClause(raw){
 const clauses=String(raw||'').normalize('NFKC').split(/[。!?！？]/).map(s=>s.trim()).filter(Boolean);
 const relevant=clauses.filter(s=>!/って呼んで|呼んでくれ|呼んでた/.test(s));
 return relevant.at(-1)||String(raw||'');
}
export function currentTurnFocus(raw){
 const last=foldTurn(currentTurnClause(raw));
 if(/[「『]ッ[」』]|小サイ[「『]?ッ|促音/.test(last)&&/難|ムズカ|覚|オボ|練習/.test(last))return 'learner';
 if(/パン屋|塩パン|焼キタテ/.test(last))return 'bakery';
 if(/(?:今日|キョウ).{0,12}(?:仕事|シゴト)|(?:仕事|シゴト).{0,8}(?:疲|ツカレ)/.test(last)&&!/エミチ|アナタ|君/.test(last))return 'tired';
 return '';
}
