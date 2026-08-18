(function () {
  "use strict";

  const config = window.GANKBYTE_XP_CONFIG || {};
  const configured = Boolean(config.supabaseUrl && config.supabasePublishableKey);
  const $ = (id) => document.getElementById(id);
  const loginButton = $("xp-login");
  const logoutButton = $("xp-logout");
  const submitPanel = $("xp-submit-panel");
  const status = $("xp-status");
  const badge = $("xp-connection-badge");
  const accountTitle = $("xp-account-title");
  const accountCopy = $("xp-account-copy");
  const total = $("xp-total");
  const level = $("xp-level");
  const adminLink = $("xp-admin-link");
  const leaderboardBody = $("leaderboard-body");
  let client = null;
  let currentUser = null;

  function setStatus(message, error) {
    status.textContent = message || "";
    status.classList.toggle("is-error", Boolean(error));
  }

  function setBadge(text, kind) {
    badge.textContent = text;
    badge.className = "status-badge" + (kind ? " " + kind : "");
  }

  function levelForXp(value) {
    const thresholds = [0, 250, 600, 1000, 1500, 2200, 3000, 4000, 5200, 6600];
    let current = 1;
    thresholds.forEach((threshold, index) => { if (value >= threshold) current = index + 1; });
    return String(current).padStart(2, "0");
  }

  function escapeHtml(value) {
    return String(value || "").replace(/[&<>'"]/g, (character) => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;","\"":"&quot;"}[character]));
  }

  function renderLeaderboard(rows) {
    if (!rows || !rows.length) {
      leaderboardBody.innerHTML = '<tr><td colspan="4">No approved XP yet. Be the first to submit.</td></tr>';
      return;
    }
    leaderboardBody.innerHTML = rows.map((row, index) => '<tr><td>' + (index + 1) + '</td><td>' + escapeHtml(row.display_name || "GankByte Player") + '</td><td>Level ' + levelForXp(row.xp_total || 0) + '</td><td>' + Number(row.xp_total || 0).toLocaleString() + '</td></tr>').join("");
  }

  async function loadLeaderboard() {
    const result = await client.from("xp_leaderboard").select("display_name,xp_total").order("xp_total", { ascending: false }).limit(25);
    if (result.error) {
      leaderboardBody.innerHTML = '<tr><td colspan="4">The leaderboard is not available yet.</td></tr>';
      return;
    }
    renderLeaderboard(result.data);
  }

  async function loadAccount(user) {
    currentUser = user;
    if (!user) {
      setBadge("Discord login required", "planned");
      accountTitle.textContent = "GankByte XP account";
      accountCopy.textContent = "Sign in with Discord to submit challenges and track approved XP.";
      loginButton.hidden = false;
      logoutButton.hidden = true;
      submitPanel.hidden = true;
      adminLink.hidden = true;
      total.textContent = "0";
      level.textContent = "Level 01";
      return;
    }

    const profileResult = await client.from("profiles").select("display_name,is_admin").eq("id", user.id).maybeSingle();
    const profile = profileResult.data || {};
    const displayName = profile.display_name || user.user_metadata?.global_name || user.user_metadata?.full_name || "GankByte Player";
    const ledgerResult = await client.from("xp_ledger").select("amount").eq("user_id", user.id);
    const xp = (ledgerResult.data || []).reduce((sum, item) => sum + Number(item.amount || 0), 0);

    setBadge("Discord connected");
    accountTitle.textContent = displayName;
    accountCopy.textContent = "Your approved community XP is shown below.";
    loginButton.hidden = true;
    logoutButton.hidden = false;
    submitPanel.hidden = false;
    adminLink.hidden = !profile.is_admin;
    total.textContent = xp.toLocaleString();
    level.textContent = "Level " + levelForXp(xp);
  }

  async function init() {
    if (!configured || !window.supabase) {
      setBadge("Backend setup needed", "planned");
      accountTitle.textContent = "XP is ready to connect";
      accountCopy.textContent = "The launch system is built. Add the Supabase project values to activate Discord login, submissions, and the leaderboard.";
      loginButton.disabled = true;
      leaderboardBody.innerHTML = '<tr><td colspan="4">Backend setup is required before the leaderboard can load.</td></tr>';
      return;
    }

    client = window.supabase.createClient(config.supabaseUrl, config.supabasePublishableKey);
    setBadge("Connecting");
    client.auth.onAuthStateChange(function (event, session) {
      window.setTimeout(function () { loadAccount(session ? session.user : null); }, 0);
    });
    const sessionResult = await client.auth.getSession();
    if (sessionResult.error) setStatus(sessionResult.error.message, true);
    await loadAccount(sessionResult.data.session ? sessionResult.data.session.user : null);
    await loadLeaderboard();
  }

  loginButton.addEventListener("click", async function () {
    if (!client) return;
    setStatus("Opening Discord...");
    const result = await client.auth.signInWithOAuth({ provider: "discord", options: { redirectTo: window.location.origin + window.location.pathname } });
    if (result.error) setStatus(result.error.message, true);
  });

  logoutButton.addEventListener("click", async function () {
    if (!client) return;
    await client.auth.signOut();
    setStatus("Signed out.");
  });

  $("xp-submission-form").addEventListener("submit", async function (event) {
    event.preventDefault();
    if (!client || !currentUser) return;
    const proof = $("xp-proof").value.trim();
    const note = $("xp-note-input").value.trim();
    const result = await client.from("challenge_submissions").insert({ user_id: currentUser.id, challenge_slug: "weekend-challenge-001", proof_url: proof, note: note || null });
    if (result.error) {
      setStatus(result.error.message, true);
      return;
    }
    event.target.reset();
    setStatus("Submitted. An admin will review it before XP is added.");
  });

  init();
}());
