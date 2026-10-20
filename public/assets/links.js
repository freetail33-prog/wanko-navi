// アフィリエイトリンク生成。IDは assets/config.js（ビルド時に環境変数から生成）で設定します。
(function(){
  const cfg = window.SITE_CONFIG || {};
  function rakuten(keyword){
    const url = "https://search.rakuten.co.jp/search/mall/" + encodeURIComponent(keyword) + "/";
    return wrapRakuten(url);
  }
  function wrapRakuten(url){
    if (!cfg.rakutenAffiliateId) return url;
    const u = encodeURIComponent(url);
    return `https://hb.afl.rakuten.co.jp/hgc/${cfg.rakutenAffiliateId}/?pc=${u}&m=${u}`;
  }
  function amazon(keyword){
    let url = "https://www.amazon.co.jp/s?k=" + encodeURIComponent(keyword);
    if (cfg.amazonTag) url += "&tag=" + encodeURIComponent(cfg.amazonTag);
    return url;
  }
  window.AffLinks = { rakuten, amazon, wrapRakuten, configured: !!(cfg.rakutenAffiliateId || cfg.amazonTag) };
})();
