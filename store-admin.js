(() => {
  "use strict";
  const status = document.querySelector("#admin-status");
  const authStatus = document.querySelector("#admin-auth-status") || document.createElement("span");
  const login = document.querySelector("#admin-login") || (() => { const button = document.createElement("button"); button.id = "admin-login"; button.className = "button button-primary"; button.type = "button"; button.innerHTML = "Sign in with Discord <span>&nearr;</span>"; document.querySelector(".page-hero")?.append(button); return button; })();
  const list = document.querySelector("#admin-products");
  let client;
  const esc = (v) => String(v || "").replace(/[&<>'"]/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;","\"":"&quot;"}[c]));
  async function init() {
    if (!window.GANKBYTE_XP_CONFIG) { const s = document.createElement("script"); s.src = "xp-config.js"; s.onload = init; document.head.append(s); return; }
    if (!window.supabase) { const s = document.createElement("script"); s.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"; s.onload = init; document.head.append(s); return; }
    const c = window.GANKBYTE_XP_CONFIG; if (!c.supabaseUrl || !c.supabasePublishableKey) { status.textContent = "Supabase configuration is unavailable."; return; }
    client = window.supabase.createClient(c.supabaseUrl, c.supabasePublishableKey); const session = await client.auth.getSession();
    if (!session.data.session) { status.textContent = "Sign in with Discord to continue."; login.hidden = false; return; }
    login.hidden = true;
    const profile = await client.from("profiles").select("is_admin").eq("id", session.data.session.user.id).maybeSingle(); if (!profile.data?.is_admin) { status.textContent = "Admin access required."; document.querySelector("main").innerHTML = '<section class="section shell"><article class="content-card"><h3>Admin access required.</h3><p>Your account is signed in but is not marked as an administrator.</p></article></section>'; return; }
    await refresh();
  }
  async function refresh() { const result = await client.from("store_products").select("id,title,slug,price_credits,published").order("created_at", { ascending: false }); if (result.error) { status.textContent = result.error.message; return; } list.innerHTML = result.data.map((p) => `<article class="content-card"><span class="status-badge">${p.published ? "Published" : "Draft"}</span><h3>${esc(p.title)}</h3><p>${esc(p.slug)} &middot; ${p.price_credits.toLocaleString()} credits</p><button class="button button-ghost" data-toggle="${p.id}" data-published="${p.published}" type="button">${p.published ? "Unpublish" : "Publish"}</button></article>`).join(""); }
  document.querySelector("#product-form").addEventListener("submit", async (e) => { e.preventDefault(); const data = { title: document.querySelector("#product-title").value.trim(), slug: document.querySelector("#product-slug").value.trim(), price_credits: Number(document.querySelector("#product-price").value), description: document.querySelector("#product-description").value.trim(), download_path: document.querySelector("#product-download").value.trim() || null, published: document.querySelector("#product-published").checked }; const result = await client.from("store_products").insert(data); status.textContent = result.error ? result.error.message : "Product saved."; if (!result.error) { e.target.reset(); await refresh(); } });
  document.querySelector("#credit-form").addEventListener("submit", async (e) => { e.preventDefault(); const result = await client.rpc("admin_adjust_credits", { p_user_id: document.querySelector("#credit-user").value.trim(), p_amount: Number(document.querySelector("#credit-amount").value), p_description: document.querySelector("#credit-reason").value.trim() }); status.textContent = result.error ? result.error.message : `Balance updated to ${Number(result.data).toLocaleString()} credits.`; if (!result.error) e.target.reset(); });
  list.addEventListener("click", async (e) => { const button = e.target.closest("[data-toggle]"); if (!button) return; const result = await client.from("store_products").update({ published: button.dataset.published !== "true" }).eq("id", button.dataset.toggle); status.textContent = result.error ? result.error.message : "Product updated."; await refresh(); });
  login.addEventListener("click", async () => { if (!client) { authStatus.textContent = "Authentication is still loading. Try again in a moment."; return; } login.disabled = true; authStatus.textContent = "Opening Discord..."; const result = await client.auth.signInWithOAuth({ provider: "discord", options: { redirectTo: window.location.href } }); if (result.error) { authStatus.textContent = result.error.message; login.disabled = false; } });
  init();
})();
