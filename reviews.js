(function () {
  "use strict";

  const grid = document.getElementById("reviews-grid");
  if (!grid) return;

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function card(review) {
    return '<article class="review-quote"><blockquote>“' + escapeHtml(review.review_text) + '”</blockquote><cite>' + escapeHtml(review.display_name || "GankByte member") + '</cite></article>';
  }

  function group(type, reviews) {
    const label = type === "player" ? "PLAYER REVIEWS" : "DEVELOPER REVIEWS";
    const items = reviews.filter(function (review) { return review.review_type === type; });
    const content = items.length ? items.map(card).join("") : '<p class="review-empty">No approved ' + type + ' reviews yet.</p>';
    return '<article class="review-display-card"><span class="status-badge">' + label + '</span><div class="review-quotes">' + content + '</div></article>';
  }

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      const script = document.createElement("script");
      script.src = src;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  async function init() {
    if (!window.supabase) await loadScript("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2");
    const config = window.GANKBYTE_XP_CONFIG;
    if (!config) throw new Error("Missing GankByte configuration.");
    const client = window.supabase.createClient(config.supabaseUrl, config.supabasePublishableKey);
    const result = await client.from("community_reviews").select("review_type,display_name,review_text,created_at").eq("status", "approved").order("created_at", { ascending: false }).limit(50);
    if (result.error) throw result.error;
    const reviews = result.data || [];
    grid.innerHTML = group("player", reviews) + group("developer", reviews);
  }

  init().catch(function () {
    grid.innerHTML = '<article class="review-display-card"><span class="status-badge">PLAYER REVIEWS</span><p class="review-empty">Reviews are temporarily unavailable.</p></article><article class="review-display-card"><span class="status-badge">DEVELOPER REVIEWS</span><p class="review-empty">Reviews are temporarily unavailable.</p></article>';
  });
}());
