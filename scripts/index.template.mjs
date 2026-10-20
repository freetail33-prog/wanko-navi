import { head, header, footer, signupCta } from "./partials.mjs";
export default function render(){
return `${head("愛犬にぴったりのフード・用品診断", "犬種・年齢・体重・悩みを入力するだけで、愛犬に合ったドッグフードやケア用品がわかる無料診断。")}
${header("diag")}
<main>
<section class="hero"><h1>30秒でわかる！<br>うちの子にぴったりのフード・用品診断</h1>
<p>犬種・年齢・体重・気になることを選ぶだけ。3匹の犬と暮らす飼い主が、選び方のポイントと一緒におすすめを紹介します。</p></section>

<section class="card"><h2>🐶 わんちゃんのことを教えてください</h2>
<form id="f">
<label for="breed">犬種</label><select id="breed" required></select>
<div class="row2"><div><label for="age">年齢（歳）</label><input id="age" type="number" min="0" max="25" step="0.5" value="3" inputmode="decimal" required></div>
<div><label for="weight">体重（kg）</label><input id="weight" type="number" min="0.5" max="90" step="0.1" placeholder="例：4.5" inputmode="decimal"></div></div>
<label>気になること（いくつでも）</label>
<div class="chips" id="concerns"></div>
<button class="btn" style="margin-top:18px">診断する</button>
</form></section>

<section class="card hidden" id="result"><h2>📋 診断結果 <span class="badge pr">PR</span></h2>
<div class="summary" id="summary"></div>
<div id="recs"></div>
<p class="muted">※ボタンは楽天市場・Amazonの検索結果ページにつながります。ここから購入されると、当サイトに紹介料が入ることがあります（購入する方の価格は変わりません）。</p>
<div class="note" id="affnote"></div>
</section>

<section class="card"><h2>🐾 うちの3匹のリアルレビュー</h2>
<p class="muted">実際にわが家の3匹で試したフードや用品の感想を、順番に載せていく予定です。</p>
<div class="dogs">
${[1,2,3].map(n=>`<div class="dog"><div class="ph">🐕</div><h3>${n}匹目 <span class="badge soon">準備中</span></h3><p class="muted">名前・犬種・使っているフードのレビューを準備しています。</p></div>`).join("")}
</div></section>

<section class="card"><h2>🔥 今日の犬用品セール速報</h2><p>ドッグフード・ペットシーツ・おやつの値下げ情報を毎日自動で更新しています。</p><a class="btn sub" href="deals.html">セール速報を見る</a></section>
${signupCta()}
</main>
${footer()}
<script src="assets/config.js"></script><script src="assets/catalog.js"></script><script src="assets/links.js"></script><script src="assets/diagnosis.js"></script>
<script>
(function(){
  const $ = s => document.querySelector(s);
  $("#breed").innerHTML = '<option value="">選んでください</option>' + Diagnosis.breeds.map(b=>'<option>'+b+'</option>').join("");
  $("#concerns").innerHTML = Object.entries(Diagnosis.CONCERN_LABEL).map(([k,v])=>'<label><input type="checkbox" value="'+k+'"><span>'+v+'</span></label>').join("");
  $("#f").addEventListener("submit", async e => {
    e.preventDefault();
    const profile = { breed: $("#breed").value || "その他", age: parseFloat($("#age").value)||0, weight: parseFloat($("#weight").value)||0,
      concerns: [...document.querySelectorAll("#concerns input:checked")].map(i=>i.value) };
    const res = await Diagnosis.run(profile);
    $("#summary").innerHTML = res.summary;
    $("#recs").innerHTML = res.recs.map(r => { const c = CATALOG[r.id]; if(!c) return "";
      return '<div class="rec"><h3>'+c.title+'</h3><p class="why">'+(r.reason||c.why)+'</p><div class="links">'+
      '<a class="btn sm" rel="sponsored noopener" target="_blank" href="'+AffLinks.rakuten(c.keywords)+'">楽天で見る</a>'+
      '<a class="btn sm sub" rel="sponsored noopener" target="_blank" href="'+AffLinks.amazon(c.keywords)+'">Amazonで見る</a></div></div>'; }).join("");
    $("#affnote").innerHTML = AffLinks.configured ? "" : "🛠 試作版：アフィリエイトIDがまだ設定されていないため、通常の検索ページにつながります。";
    $("#affnote").classList.toggle("hidden", AffLinks.configured);
    $("#result").classList.remove("hidden");
    $("#result").scrollIntoView({behavior:"smooth"});
  });
  // URLパラメータで事前入力（例: ?breed=トイ・プードル&age=8&weight=4&c=tear,joint）
  const q = new URLSearchParams(location.search);
  if (q.get("breed")) { $("#breed").value = q.get("breed"); $("#age").value = q.get("age")||3; $("#weight").value = q.get("weight")||"";
    (q.get("c")||"").split(",").forEach(k => { const i = document.querySelector('#concerns input[value="'+k+'"]'); if (i) i.checked = true; });
    $("#f").requestSubmit(); }
})();
</script></body></html>`;
}
