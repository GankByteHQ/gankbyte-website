(() => {
  "use strict";
  const productsEl = document.querySelector("#store-products");
  const statusEl = document.querySelector("#store-status");
  const balanceEl = document.querySelector("#store-balance");
  const balanceValue = document.querySelector("#balance-value");
  const buyCredits = document.querySelector("#buy-credits");
  let client = null;
  let user = null;

  const escapeHtml = (value) => String(value || "").replace(/[&<>'"]/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;","\"":"&quot;"}[c]));
  const formatCredits = (value) => Number(value || 0).toLocaleString();
  function renderProducts(products) {
    if (!products?.length) { productsEl.innerHTML = '<article class="content-card store-empty"><span class="status-badge">Catalogue loading</span><h3>No products published yet.</h3><p>The store is connected and ready for the first digital release.</p></article>'; return; }
    productsEl.innerHTML = products.map((product) => `<article class="content-card store-card"><span class="status-badge">Digital content</span><h3>${escapeHtml(product.title)}</h3><p>${escapeHtml(product.description)}</p><div class="hero-actions"><strong class="store-price">${formatCredits(product.price_credits)} credits</strong><button class="button button-primary" data-buy="${product.id}" type="button">Get it <span>&rarr;</span></button></div></article>`).join("");
  }
  async function refreshBalance() { if (!client || !user) return; const result = await client.rpc("get_credit_balance"); if (!result.error) { balanceValue.textContent = formatCredits(result.data); balanceEl.hidden = false; } }
  async function init() {
    if (!window.GANKBYTE_XP_CONFIG) { const configScript = document.createElement("script"); configScript.src = "xp-config.js"; configScript.onload = init; document.head.append(configScript); return; }
    const config = window.GANKBYTE_XP_CONFIG || {};
    if (!window.supabase) { const script = document.createElement("script"); script.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"; script.onload = init; document.head.append(script); return; }
    if (!config.supabaseUrl || !config.supabasePublishableKey) { statusEl.textContent = "Store configuration is not available on this preview."; return; }
    client = window.supabase.createClient(config.supabaseUrl, config.supabasePublishableKey);
    const session = await client.auth.getSession(); user = session.data.session?.user || null; await refreshBalance();
    const result = await client.from("store_products").select("id,title,description,price_credits").eq("published", true).order("created_at", { ascending: false });
    if (result.error) { statusEl.textContent = "The store is temporarily unavailable."; return; } renderProducts(result.data);
  }
  productsEl.addEventListener("click", async (event) => { const button = event.target.closest("[data-buy]"); if (!button) return; if (!user) { statusEl.textContent = "Sign in with Discord first, then try again."; return; } button.disabled = true; button.textContent = "Processing..."; const result = await client.rpc("spend_credits", { p_product_id: button.dataset.buy }); if (result.error) { statusEl.textContent = result.error.message; button.disabled = false; button.innerHTML = "Get it <span>&rarr;</span>"; return; } statusEl.textContent = "Purchase complete. Your download is now in your library."; await refreshBalance(); });
  buyCredits.addEventListener("click", () => { statusEl.textContent = "Credit checkout is not live yet. No real funds are accepted."; });
  window.addEventListener("gankbyte:auth-state", (event) => { user = event.detail.user; refreshBalance(); });
  init();
})();
