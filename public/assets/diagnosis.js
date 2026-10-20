// 診断エンジン。
// いまはルールベース（無料・APIキー不要）。将来LLMをつなぐ場合は
// window.DIAG_PROVIDER = async (profile) => ({summary, recs:[{id, reason}]}) を差し替えるだけでOK。
(function(){
  const BREED_SIZE = {
    "トイ・プードル":"small","チワワ":"small","ミニチュア・ダックスフンド":"small","ポメラニアン":"small","マルチーズ":"small",
    "シー・ズー":"small","ヨークシャー・テリア":"small","パピヨン":"small","ミニチュア・シュナウザー":"small","フレンチ・ブルドッグ":"small",
    "パグ":"small","キャバリア":"small","ジャック・ラッセル・テリア":"small","ビション・フリーゼ":"small",
    "柴犬":"medium","コーギー":"medium","ビーグル":"medium","ボーダー・コリー":"medium","シェットランド・シープドッグ":"medium",
    "ゴールデン・レトリーバー":"large","ラブラドール・レトリーバー":"large","秋田犬":"large","バーニーズ・マウンテン・ドッグ":"large","シベリアン・ハスキー":"large",
    "ミックス（小型）":"small","ミックス（中型）":"medium","ミックス（大型）":"large","その他":null
  };
  // 犬種ごとに一般的に言われやすい気になりポイント（参考表示用）
  const BREED_HINT = {
    "トイ・プードル":["tear"],"マルチーズ":["tear"],"シー・ズー":["tear","skin"],"ポメラニアン":["joint"],"チワワ":["joint"],
    "ミニチュア・ダックスフンド":["joint","obesity"],"柴犬":["skin"],"フレンチ・ブルドッグ":["skin"],"パグ":["skin","obesity"],
    "ゴールデン・レトリーバー":["joint","skin"],"ラブラドール・レトリーバー":["joint","obesity"],"ビーグル":["obesity"],"コーギー":["obesity","joint"]
  };
  const CONCERN_LABEL = {tear:"涙やけ",obesity:"肥満・体重管理",skin:"皮膚・被毛",joint:"関節",picky:"偏食・食いつき",multi:"多頭飼い"};

  function sizeOf(breed, weight){
    if (weight > 0) return weight < 10 ? "small" : weight < 25 ? "medium" : "large";
    return BREED_SIZE[breed] || "medium";
  }
  function stageOf(age, size){
    const seniorAge = size === "large" ? 6 : 7;
    if (age < 1) return "puppy";
    if (age >= seniorAge) return "senior";
    return "adult";
  }

  async function ruleProvider(p){
    const size = sizeOf(p.breed, p.weight);
    const stage = stageOf(p.age, size);
    const recs = [];
    const add = (id, reason) => { if (!recs.find(r => r.id === id)) recs.push({id, reason}); };
    const c = new Set(p.concerns);

    // 1) ベースのフード
    if (c.has("obesity") && stage !== "puppy") add("food_diet");
    else add(stage === "puppy" ? "food_puppy" : stage === "senior" ? "food_senior" : "food_adult");
    if (size === "small") add("food_small");
    if (size === "large" && stage !== "puppy") add("food_large");

    // 2) 悩み別
    if (c.has("tear")) { add("care_tear"); add("food_grainfree"); }
    if (c.has("skin")) { add("supp_skin"); add("food_fish"); add("care_shampoo"); }
    if (c.has("joint")) { add("supp_joint"); add("goods_floor"); add(size === "large" ? "goods_bed" : "goods_step"); }
    if (c.has("obesity")) { add("goods_slowfeeder"); add("goods_toy"); add("goods_scale"); }
    if (c.has("picky")) { add("food_topping"); add("food_wet"); add("supp_gut"); }
    if (c.has("multi")) { add("multi_bulk"); add("multi_sheet"); add("multi_gate"); add("multi_feeder"); }

    // 3) 年齢・体格による追加
    if (stage === "senior" && !c.has("joint")) add("supp_joint", "シニア期に入ったので、早めの関節ケアも検討の余地があります。");
    if (stage === "senior") add("goods_bed");
    if (!c.size) add("goods_toy");

    const sizeJa = {small:"小型犬",medium:"中型犬",large:"大型犬"}[size];
    const stageJa = {puppy:"子犬期",adult:"成犬期",senior:"シニア期"}[stage];
    const hint = (BREED_HINT[p.breed]||[]).filter(h => !c.has(h)).map(h => CONCERN_LABEL[h]);
    let summary = `${p.breed || "わんちゃん"}・${p.age}歳${p.weight ? "・" + p.weight + "kg" : ""} → <b>${sizeJa}／${stageJa}</b>として診断しました。`;
    if (c.size) summary += ` 気になること：${[...c].map(x => CONCERN_LABEL[x]).join("、")}。`;
    if (hint.length) summary += `<br>${p.breed}は一般的に「${hint.join("・")}」に気を配る飼い主さんも多い犬種です。`;
    return { summary, recs: recs.slice(0, 9) };
  }

  window.Diagnosis = {
    CONCERN_LABEL,
    breeds: Object.keys(BREED_SIZE),
    run: (profile) => (window.DIAG_PROVIDER || ruleProvider)(profile)
  };
})();
