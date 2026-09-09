(() => {
  "use strict";
  const items = document.querySelector("#library-items");
  const status = document.querySelector("#library-status");
  function esc(value) { return String(value || "").replace(/[&<>'"]/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;","\"":"&quot;"}[c])); }
  async function init() {
    if (!window.GANKBYTE_XP_CONFIG) { const script = document.createElement("script"); script.src = "xp-config.js"; script.onload = init; document.head.append(script); return; }
    if (!window.supabase) { const script = document.createElement("script"); script.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"; script.onload = init; document.head.append(script); return; }
    const config = window.GANKBYTE_XP_CONFIG;
    if (!config.supabaseUrl || !config.supabasePublishableKey) { status.textContent = "Library configuration is not available on this preview."; return; }
    const client = window.supabase.createClient(config.supabaseUrl, config.supabasePublishableKey);
    const session = await client.auth.getSession();
    if (!session.data.session) return;
    const result = await client.from("store_downloads").select("granted_at,store_products(title,description,download_path)").order("granted_at", { ascending: false });
    if (result.error) { status.textContent = "Your library is temporarily unavailable."; return; }
    if (!result.data?.length) { items.innerHTML = '<article class="content-card store-empty"><span class="status-badge">Library empty</span><h3>Nothing downloaded yet.</h3><p>Browse the store to find your first GankByte release.</p></article>'; return; }
    items.innerHTML = result.data.map((entry) => { const product = entry.store_products; const link = product?.download_path ? `<a class="button button-primary" href="${esc(product.download_path)}" download>Download <span>&darr;</span></a>` : '<span class="status-badge">Download preparing</span>'; return `<article class="content-card store-card"><span class="status-badge">Owned</span><h3>${esc(product?.title)}</h3><p>${esc(product?.description)}</p><div class="hero-actions">${link}</div></article>`; }).join("");
  }
  init();
})();
