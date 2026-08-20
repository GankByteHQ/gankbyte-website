(() => {
  "use strict";

  const config = window.GANKBYTE_XP_CONFIG || {};
  const headerCta = document.querySelector(".header-cta");
  if (!headerCta || document.querySelector(".site-account")) return;

  // Keep the shared header control dark even before the external account stylesheet finishes loading.
  if (!document.querySelector("style[data-gankbyte-account-style]")) {
    const style = document.createElement("style");
    style.dataset.gankbyteAccountStyle = "true";
    style.textContent = ".site-account-trigger{appearance:none!important;background:#0a0b0f!important;border:1px solid rgba(244,242,234,.14)!important;box-shadow:none!important;color:#f4f2ea!important;cursor:pointer!important;font:700 10px/normal Arial,Helvetica,sans-serif!important;letter-spacing:.1em!important;padding:12px 14px!important;text-transform:uppercase!important}.site-account-trigger:hover{background:#191b20!important;border-color:#c6ff3d!important;color:#c6ff3d!important}";
    document.head.append(style);
  }

  const account = document.createElement("div");
  account.className = "site-account";
  account.innerHTML = `
    <button class="header-cta site-account-trigger" id="site-account-trigger" type="button" aria-expanded="false">
      <span class="site-account-avatar" id="site-account-avatar">GB</span>
      <span id="site-account-trigger-label">Sign in with Discord</span>
      <span class="site-account-chevron" aria-hidden="true">&#9662;</span>
    </button>
    <div class="site-account-menu" id="site-account-menu" hidden>
      <div class="site-account-summary"><span class="site-account-avatar site-account-avatar-large" id="site-account-menu-avatar">GB</span><div><strong id="site-account-name">GankByte account</strong><small id="site-account-subtitle">Discord account</small></div></div>
      <div class="site-account-links">
        <a href="profile.html">Profile</a>
        <a href="xp.html">XP</a>
        <a href="challenges.html">Challenges</a>
        <a href="account.html">Account</a>
        <a href="xp-admin.html" id="site-account-admin" hidden>Admin Dashboard</a>
      </div>
      <button class="site-account-item site-account-signout" id="site-account-signout" type="button">Sign out</button>
    </div>`;
  headerCta.replaceWith(account);

  const trigger = document.querySelector("#site-account-trigger");
  const menu = document.querySelector("#site-account-menu");
  const triggerLabel = document.querySelector("#site-account-trigger-label");
  const triggerAvatar = document.querySelector("#site-account-avatar");
  const menuAvatar = document.querySelector("#site-account-menu-avatar");
  const accountName = document.querySelector("#site-account-name");
  const accountSubtitle = document.querySelector("#site-account-subtitle");
  const adminLink = document.querySelector("#site-account-admin");
  const signout = document.querySelector("#site-account-signout");
  [
    ["font-size", "10px"],
    ["font-weight", "700"],
    ["letter-spacing", ".1em"],
    ["line-height", "normal"],
    ["padding", "12px 14px"],
    ["text-transform", "uppercase"]
  ].forEach(([property, value]) => trigger.style.setProperty(property, value, "important"));
  let client = null;
  let currentUser = null;
  let currentProfile = null;

  function escapeHtml(value) { return String(value || "").replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", "\"": "&quot;" }[character])); }
  function displayName(user, profile) { return profile?.display_name || user?.user_metadata?.global_name || user?.user_metadata?.full_name || user?.user_metadata?.name || "GankByte Player"; }
  function initials(name) { return String(name || "GB").split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "GB"; }
  function closeMenu() { menu.hidden = true; trigger.setAttribute("aria-expanded", "false"); }
  function openMenu() { if (!currentUser) return; menu.hidden = false; trigger.setAttribute("aria-expanded", "true"); }
  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[src="${src}"]`);
      if (existing) { existing.addEventListener("load", resolve, { once: true }); existing.addEventListener("error", reject, { once: true }); if (window.supabase || window.GANKBYTE_XP_CONFIG) resolve(); return; }
      const script = document.createElement("script");
      script.src = src;
      script.onload = resolve;
      script.onerror = reject;
      document.head.append(script);
    });
  }
  function accountField(id, value) { const field = document.querySelector(`#${id}`); if (field) field.textContent = value || "Not provided"; }
  function renderAccountPage() {
    const login = document.querySelector("#account-login");
    const details = document.querySelector("#account-details");
    const form = document.querySelector("#account-display-form");
    const logout = document.querySelector("#account-logout");
    const badge = document.querySelector("#account-badge");
    const title = document.querySelector("#account-title");
    const copy = document.querySelector("#account-copy");
    if (!login || !details || !form || !logout || !badge || !title || !copy) return;
    if (!currentUser) {
      badge.textContent = "Discord login required";
      title.textContent = "Sign in to manage your account";
      copy.textContent = "Your GankByte account uses Discord authentication. GankByte does not store Discord passwords.";
      login.hidden = false; details.hidden = true; form.hidden = true; logout.hidden = true;
      return;
    }
    const name = displayName(currentUser, currentProfile);
    badge.textContent = "Discord connected";
    title.textContent = name;
    copy.textContent = "Manage the GankByte profile details connected to your Discord account.";
    login.hidden = true; details.hidden = false; form.hidden = false; logout.hidden = false;
    const input = document.querySelector("#account-display-name");
    if (input && document.activeElement !== input) input.value = name;
    accountField("account-email", currentUser.email || "Not provided by Discord");
    accountField("account-discord", currentUser.user_metadata?.global_name || currentUser.user_metadata?.full_name || currentUser.user_metadata?.name || "Discord player");
    accountField("account-provider", "Discord");
    accountField("account-created", currentUser.created_at ? new Date(currentUser.created_at).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" }) : "Not available");
  }
  function publishAuthState() {
    window.GANKBYTE_AUTH = { client, user: currentUser, profile: currentProfile };
    window.dispatchEvent(new CustomEvent("gankbyte:auth-state", { detail: { client, user: currentUser, profile: currentProfile } }));
    renderAccountPage();
  }
  async function renderSession(session) {
    currentUser = session?.user || null;
    currentProfile = null;
    if (currentUser && client) {
      const result = await client.from("profiles").select("display_name,avatar_url,is_admin").eq("id", currentUser.id).maybeSingle();
      currentProfile = result.data || {};
    }
    if (!currentUser) {
      triggerLabel.textContent = "Sign in with Discord";
      triggerAvatar.textContent = "GB";
      menuAvatar.textContent = "GB";
      accountName.textContent = "GankByte account";
      accountSubtitle.textContent = "Discord account";
      adminLink.hidden = true;
      closeMenu();
    } else {
      const name = displayName(currentUser, currentProfile);
      const mark = initials(name);
      triggerLabel.textContent = name;
      triggerAvatar.textContent = mark;
      menuAvatar.textContent = mark;
      accountName.textContent = name;
      accountSubtitle.textContent = currentUser.email || "Discord account";
      adminLink.hidden = !currentProfile?.is_admin;
    }
    publishAuthState();
  }
  async function signIn() {
    if (!client) return;
    trigger.disabled = true;
    triggerLabel.textContent = "Opening Discord...";
    const result = await client.auth.signInWithOAuth({ provider: "discord", options: { redirectTo: window.location.origin + window.location.pathname } });
    if (result.error) triggerLabel.textContent = "Sign in with Discord";
    trigger.disabled = false;
  }
  async function init() {
    try {
      if (!window.GANKBYTE_XP_CONFIG) await loadScript("xp-config.js");
      if (!window.supabase) await loadScript("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2");
      const activeConfig = window.GANKBYTE_XP_CONFIG || config;
      if (!activeConfig.supabaseUrl || !activeConfig.supabasePublishableKey || !window.supabase) return;
      client = window.supabase.createClient(activeConfig.supabaseUrl, activeConfig.supabasePublishableKey);
      client.auth.onAuthStateChange((event, session) => window.setTimeout(() => renderSession(session), 0));
      const result = await client.auth.getSession();
      await renderSession(result.data.session);
    } catch {
      triggerLabel.textContent = "Sign in with Discord";
    }
  }

  trigger.addEventListener("click", () => { if (currentUser && menu.hidden) openMenu(); else if (currentUser) closeMenu(); else signIn(); });
  signout.addEventListener("click", async () => { if (!client) return; await client.auth.signOut(); closeMenu(); });
  document.addEventListener("click", (event) => { if (!account.contains(event.target)) closeMenu(); });
  document.addEventListener("keydown", (event) => { if (event.key === "Escape") closeMenu(); });

  const accountLogin = document.querySelector("#account-login");
  const accountLogout = document.querySelector("#account-logout");
  const accountForm = document.querySelector("#account-display-form");
  const accountStatus = document.querySelector("#account-status");
  accountLogin?.addEventListener("click", signIn);
  accountLogout?.addEventListener("click", async () => { if (client) await client.auth.signOut(); });
  accountForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!client || !currentUser) return;
    const input = document.querySelector("#account-display-name");
    const nextName = input.value.trim();
    accountStatus.textContent = "Saving display name...";
    const result = await client.rpc("update_display_name", { p_display_name: nextName });
    if (result.error) { accountStatus.textContent = result.error.message; accountStatus.classList.add("is-error"); return; }
    accountStatus.classList.remove("is-error");
    accountStatus.textContent = "Display name saved.";
    await renderSession({ user: currentUser });
  });
  init();
})();
