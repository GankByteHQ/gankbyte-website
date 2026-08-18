(function () {
  "use strict";
  const config = window.GANKBYTE_XP_CONFIG || {};
  const ready = Boolean(config.supabaseUrl && config.supabasePublishableKey && window.supabase);
  const $ = (id) => document.getElementById(id);
  const badge = $("admin-badge");
  const title = $("admin-title");
  const copy = $("admin-copy");
  const status = $("admin-status");
  const login = $("admin-login");
  const logout = $("admin-logout");
  const submissions = $("admin-submissions");
  const list = $("submission-list");
  let client = null;
  let currentUser = null;

  function message(text, error) { status.textContent = text || ""; status.classList.toggle("is-error", Boolean(error)); }
  function escapeHtml(value) { return String(value || "").replace(/[&<>'"]/g, (character) => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;","\"":"&quot;"}[character])); }
  function setBadge(text, planned) { badge.textContent = text; badge.className = "status-badge" + (planned ? " planned" : ""); }

  async function loadSubmissions() {
    const result = await client.from("challenge_submissions").select("id,user_id,challenge_slug,proof_url,note,created_at").eq("status", "pending").order("created_at", { ascending: false });
    if (result.error) { message(result.error.message, true); return; }
    if (!result.data.length) { list.innerHTML = '<div class="xp-empty">No pending submissions.</div>'; return; }
    const ids = [...new Set(result.data.map((item) => item.user_id))];
    const profiles = await client.from("profiles").select("id,display_name").in("id", ids);
    const names = Object.fromEntries((profiles.data || []).map((item) => [item.id, item.display_name]));
    list.innerHTML = result.data.map((item) => '<article class="admin-submission" data-id="' + item.id + '"><div><span class="status-badge">Pending</span><h3>' + escapeHtml(names[item.user_id] || "GankByte Player") + '</h3><p>' + escapeHtml(item.note || "No note provided.") + '</p><a href="' + escapeHtml(item.proof_url) + '" target="_blank" rel="noreferrer">Open proof &nearr;</a></div><div class="admin-actions"><label>Award<select class="award-amount"><option value="100">+100 XP</option><option value="500">+500 XP</option></select></label><button class="button button-primary approve-button" type="button">Approve</button><button class="button button-ghost reject-button" type="button">Reject</button></div></article>').join("");
    document.querySelectorAll(".approve-button").forEach((button) => button.addEventListener("click", approve));
    document.querySelectorAll(".reject-button").forEach((button) => button.addEventListener("click", reject));
  }

  async function approve(event) {
    const card = event.target.closest(".admin-submission");
    const amount = Number(card.querySelector(".award-amount").value);
    const result = await client.rpc("approve_submission", { p_submission_id: Number(card.dataset.id), p_xp: amount, p_reviewer_note: null });
    if (result.error) { message(result.error.message, true); return; }
    message("Submission approved and XP recorded.");
    await loadSubmissions();
  }

  async function reject(event) {
    const card = event.target.closest(".admin-submission");
    const result = await client.from("challenge_submissions").update({ status: "rejected", reviewer_id: currentUser.id, reviewed_at: new Date().toISOString() }).eq("id", Number(card.dataset.id)).eq("status", "pending");
    if (result.error) { message(result.error.message, true); return; }
    message("Submission rejected.");
    await loadSubmissions();
  }

  async function loadSession(session) {
    currentUser = session ? session.user : null;
    if (!currentUser) {
      setBadge(ready ? "Discord login required" : "Backend setup needed", true);
      title.textContent = "XP admin";
      copy.textContent = ready ? "Sign in with Discord to continue." : "Add the Supabase project values before enabling admin access.";
      login.hidden = false; logout.hidden = true; submissions.hidden = true;
      return;
    }
    const profile = await client.from("profiles").select("display_name,is_admin").eq("id", currentUser.id).maybeSingle();
    if (!profile.data || !profile.data.is_admin) {
      setBadge("Access denied", true); title.textContent = "Not an admin"; copy.textContent = "This Discord account is not marked as a GankByte admin."; login.hidden = true; logout.hidden = false; submissions.hidden = true; return;
    }
    setBadge("Admin connected"); title.textContent = profile.data.display_name || "GankByte Admin"; copy.textContent = "Review pending submissions below."; login.hidden = true; logout.hidden = false; submissions.hidden = false; await loadSubmissions();
  }

  if (!ready) {
    loadSession(null);
    login.disabled = true;
  } else {
    client = window.supabase.createClient(config.supabaseUrl, config.supabasePublishableKey);
    client.auth.onAuthStateChange((event, session) => window.setTimeout(() => loadSession(session), 0));
    client.auth.getSession().then((result) => loadSession(result.data.session));
  }

  login.addEventListener("click", async () => { if (!client) return; const result = await client.auth.signInWithOAuth({ provider: "discord", options: { redirectTo: window.location.origin + window.location.pathname } }); if (result.error) message(result.error.message, true); });
  logout.addEventListener("click", async () => { if (client) await client.auth.signOut(); });
}());
