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
  const refresh = $("admin-refresh");
  const logout = $("admin-logout");
  const submissions = $("admin-submissions");
  const list = $("submission-list");
  const arenaScores = $("arena-admin-scores");
  const arenaScoreList = $("arena-score-list");
  const glitchScores = $("glitch-admin-scores");
  const glitchScoreList = $("glitch-score-list");
  const arenaEvents = $("arena-admin-events");
  const arenaEventList = $("arena-event-list");
  const arenaEventForm = $("arena-event-form");
  const eventFormStatus = $("event-form-status");
  const rejectDialog = $("reject-dialog");
  const rejectForm = $("reject-form");
  const rejectReason = $("reject-reason");
  const rejectError = $("reject-error");
  const rejectTitle = $("reject-dialog-title");
  const rejectCopy = $("reject-dialog-copy");
  const rejectConfirm = $("reject-confirm");
  let client = null;
  let currentUser = null;
  let pendingRejection = null;

  function message(text, error) { status.textContent = text || ""; status.classList.toggle("is-error", Boolean(error)); }
  function escapeHtml(value) { return String(value || "").replace(/[&<>'"]/g, (character) => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;","\"":"&quot;"}[character])); }
  function safeProofUrl(value) { try { const url = new URL(String(value || ""), window.location.href); return ["http:", "https:"].includes(url.protocol) ? url.href : ""; } catch { return ""; } }
  function dateTimeLocal(value) { if (!value) return ""; const date = new Date(value); if (Number.isNaN(date.getTime())) return ""; const pad = (part) => String(part).padStart(2, "0"); return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`; }
  function isoOrNull(value) { if (!value) return null; const date = new Date(value); return Number.isNaN(date.getTime()) ? null : date.toISOString(); }
  function setBadge(text, planned) { badge.textContent = text; badge.className = "status-badge" + (planned ? " planned" : ""); }

  function openRejectDialog(kind, event) {
    const card = event.target.closest(".admin-submission");
    pendingRejection = { kind, id: Number(card.dataset.id) };
    const labels = { submission: "Community contribution", arena: "Byte Rush score", glitch: "Glitch Dash score" };
    rejectTitle.textContent = "Reject " + labels[kind].toLowerCase() + ".";
    rejectCopy.textContent = "The player will see this reason on their profile. A later resubmission will clear this notice.";
    rejectReason.value = "";
    rejectError.textContent = "";
    rejectDialog.hidden = false;
    window.setTimeout(() => rejectReason.focus(), 0);
  }

  function closeRejectDialog() {
    pendingRejection = null;
    rejectDialog.hidden = true;
    rejectReason.value = "";
    rejectError.textContent = "";
  }

  async function loadSubmissions() {
    const result = await client.from("challenge_submissions").select("id,user_id,challenge_slug,proof_url,note,created_at").eq("status", "pending").order("created_at", { ascending: false });
    if (result.error) { message(result.error.message, true); return; }
    if (!result.data.length) { list.innerHTML = '<div class="xp-empty">No pending submissions.</div>'; return; }
    const ids = [...new Set(result.data.map((item) => item.user_id))];
    const profiles = await client.from("profiles").select("id,display_name").in("id", ids);
    const names = Object.fromEntries((profiles.data || []).map((item) => [item.id, item.display_name]));
    list.innerHTML = result.data.map((item) => { const challenge = item.challenge_slug === "community-contribution" ? "Community Contribution" : item.challenge_slug; const proofUrl = safeProofUrl(item.proof_url); const proof = proofUrl ? '<a href="' + escapeHtml(proofUrl) + '" target="_blank" rel="noreferrer">Open proof &nearr;</a>' : '<span class="section-copy">No valid proof link supplied.</span>'; return '<article class="admin-submission" data-id="' + item.id + '"><div><span class="status-badge">Pending</span><h3>' + escapeHtml(names[item.user_id] || "GankByte Player") + '</h3><p><strong>' + escapeHtml(challenge) + '</strong> // ' + escapeHtml(item.note || "No note provided.") + '</p>' + proof + '</div><div class="admin-actions"><label>Award<select class="award-amount"><option value="100">+100 XP</option><option value="500">+500 XP</option></select></label><button class="button button-primary approve-button" type="button">Approve</button><button class="button button-ghost reject-button" type="button">Reject</button></div></article>'; }).join("");
    document.querySelectorAll(".approve-button").forEach((button) => button.addEventListener("click", approve));
    document.querySelectorAll(".reject-button").forEach((button) => button.addEventListener("click", (event) => openRejectDialog("submission", event)));
  }

  async function approve(event) {
    const card = event.target.closest(".admin-submission");
    const amount = Number(card.querySelector(".award-amount").value);
    const result = await client.rpc("approve_submission", { p_submission_id: Number(card.dataset.id), p_xp: amount, p_reviewer_note: null });
    if (result.error) { message(result.error.message, true); return; }
    message("Submission approved and XP recorded.");
    await loadSubmissions();
  }

  async function loadArenaScores() {
    const result = await client.from("arena_scores").select("id,user_id,score,wave,run_seconds,created_at").eq("status", "pending").order("score", { ascending: false });
    if (result.error) { message(result.error.message, true); return; }
    if (!result.data.length) { arenaScoreList.innerHTML = '<div class="xp-empty">Byte Rush scores are auto-published. No pending moderation.</div>'; return; }
    const ids = [...new Set(result.data.map((item) => item.user_id))];
    const profiles = await client.from("profiles").select("id,display_name").in("id", ids);
    const names = Object.fromEntries((profiles.data || []).map((item) => [item.id, item.display_name]));
    arenaScoreList.innerHTML = result.data.map((item) => '<article class="admin-submission arena-score-submission" data-id="' + item.id + '"><div><span class="status-badge">Pending</span><h3>' + escapeHtml(names[item.user_id] || "GankByte Player") + '</h3><p>' + Number(item.score).toLocaleString() + ' points // wave ' + Number(item.wave) + ' // ' + Number(item.run_seconds) + ' seconds</p></div><div class="admin-actions"><button class="button button-primary approve-score-button" type="button">Approve score</button><button class="button button-ghost reject-score-button" type="button">Reject</button></div></article>').join("");
    document.querySelectorAll(".approve-score-button").forEach((button) => button.addEventListener("click", approveArenaScore));
    document.querySelectorAll(".reject-score-button").forEach((button) => button.addEventListener("click", (event) => openRejectDialog("arena", event)));
  }

  async function approveArenaScore(event) {
    const card = event.target.closest(".arena-score-submission");
    const result = await client.rpc("approve_arena_score", { p_score_id: Number(card.dataset.id) });
    if (result.error) { message(result.error.message, true); return; }
    message("Byte Rush score approved and added to the leaderboard.");
    await loadArenaScores();
  }

  async function loadGlitchScores() {
    const result = await client.from("glitch_dash_scores").select("id,user_id,score,streak,run_seconds,created_at").eq("status", "pending").order("score", { ascending: false });
    if (result.error) { message(result.error.message, true); return; }
    if (!result.data.length) { glitchScoreList.innerHTML = '<div class="xp-empty">Glitch Dash scores are auto-published. No pending moderation.</div>'; return; }
    const ids = [...new Set(result.data.map((item) => item.user_id))];
    const profiles = await client.from("profiles").select("id,display_name").in("id", ids);
    const names = Object.fromEntries((profiles.data || []).map((item) => [item.id, item.display_name]));
    glitchScoreList.innerHTML = result.data.map((item) => '<article class="admin-submission glitch-score-submission" data-id="' + item.id + '"><div><span class="status-badge">Pending</span><h3>' + escapeHtml(names[item.user_id] || "GankByte Player") + '</h3><p>' + Number(item.score).toLocaleString() + ' points // streak ' + Number(item.streak) + ' // ' + Number(item.run_seconds) + ' seconds</p></div><div class="admin-actions"><button class="button button-primary approve-glitch-score-button" type="button">Approve score</button><button class="button button-ghost reject-glitch-score-button" type="button">Reject</button></div></article>').join("");
    document.querySelectorAll(".approve-glitch-score-button").forEach((button) => button.addEventListener("click", approveGlitchScore));
    document.querySelectorAll(".reject-glitch-score-button").forEach((button) => button.addEventListener("click", (event) => openRejectDialog("glitch", event)));
  }

  async function loadArenaEvents() {
    if (!arenaEventList) return;
    const result = await client.from("arena_events").select("slug,title,game,description,kind,status,starts_at,ends_at").order("created_at", { ascending: false });
    if (result.error) { arenaEventList.innerHTML = `<div class="xp-empty">${escapeHtml(result.error.message)}</div>`; return; }
    if (!result.data?.length) { arenaEventList.innerHTML = '<div class="xp-empty">No events created yet.</div>'; return; }
    arenaEventList.innerHTML = result.data.map((event) => `<article class="admin-submission"><div><span class="status-badge${event.status === "upcoming" ? " planned" : ""}">${escapeHtml(event.status)} // ${escapeHtml(event.kind || "challenge")}</span><h3>${escapeHtml(event.title)}</h3><p>${escapeHtml(event.game)} // <code>${escapeHtml(event.slug)}</code></p><p class="section-copy">${escapeHtml(event.description)}</p></div><button class="button button-ghost event-edit-button" type="button" data-event='${escapeHtml(JSON.stringify(event))}'>Edit</button></article>`).join("");
    arenaEventList.querySelectorAll(".event-edit-button").forEach((button) => button.addEventListener("click", () => {
      const event = JSON.parse(button.dataset.event);
      ["slug", "title", "game", "kind", "status", "rules_url", "starts_at", "ends_at", "description"].forEach((field) => { const input = $(`event-${field.replace("_", "-")}`); if (input) input.value = field === "starts_at" || field === "ends_at" ? dateTimeLocal(event[field]) : event[field] || ""; });
      eventFormStatus.textContent = "Editing this event. Saving will update it.";
      arenaEventForm?.scrollIntoView({ behavior: "smooth", block: "start" });
    }));
  }

  async function saveArenaEvent(event) {
    event.preventDefault();
    if (!arenaEventForm) return;
    const form = new FormData(arenaEventForm);
    eventFormStatus.textContent = "Saving event...";
    const result = await client.rpc("upsert_arena_event", {
      p_slug: String(form.get("slug") || "").trim(),
      p_title: String(form.get("title") || "").trim(),
      p_game: form.get("game"),
      p_description: String(form.get("description") || "").trim(),
      p_kind: form.get("kind"),
      p_status: form.get("status"),
      p_rules_url: String(form.get("rules_url") || "").trim() || null,
      p_starts_at: isoOrNull(form.get("starts_at")),
      p_ends_at: isoOrNull(form.get("ends_at"))
    });
    if (result.error) { eventFormStatus.textContent = result.error.message; eventFormStatus.classList.add("is-error"); return; }
    eventFormStatus.classList.remove("is-error");
    eventFormStatus.textContent = "Event saved.";
    await loadArenaEvents();
  }

  async function approveGlitchScore(event) {
    const card = event.target.closest(".glitch-score-submission");
    const result = await client.from("glitch_dash_scores").update({ status: "approved", reviewer_id: currentUser.id, reviewed_at: new Date().toISOString() }).eq("id", Number(card.dataset.id)).eq("status", "pending");
    if (result.error) { message(result.error.message, true); return; }
    message("Glitch Dash score approved and added to the leaderboard.");
    await loadGlitchScores();
  }

  async function submitRejection(event) {
    event.preventDefault();
    const reason = rejectReason.value.trim();
    if (!pendingRejection || reason.length < 5) { rejectError.textContent = "Please provide at least five characters explaining the rejection."; return; }
    rejectConfirm.disabled = true;
    const fields = { status: "rejected", reviewer_id: currentUser.id, reviewed_at: new Date().toISOString(), reviewer_note: reason };
    const table = pendingRejection.kind === "submission" ? "challenge_submissions" : pendingRejection.kind === "arena" ? "arena_scores" : "glitch_dash_scores";
    const result = await client.from(table).update(fields).eq("id", pendingRejection.id).eq("status", "pending");
    rejectConfirm.disabled = false;
    if (result.error) { rejectError.textContent = result.error.message; return; }
    closeRejectDialog();
    message("Rejected with reason. The player can see it on their profile.");
    await refreshQueues();
  }

  async function refreshQueues() {
    refresh.disabled = true;
    try { await Promise.all([loadSubmissions(), loadArenaScores(), loadGlitchScores(), loadArenaEvents()]); }
    catch (error) { message(error?.message || "Could not refresh the review queues.", true); }
    finally { refresh.disabled = false; }
  }

  async function loadSession(session) {
    currentUser = session ? session.user : null;
    if (!currentUser) {
      setBadge(ready ? "Discord login required" : "Backend setup needed", true);
      title.textContent = "XP admin";
      copy.textContent = ready ? "Sign in with Discord to continue." : "Add the Supabase project values before enabling admin access.";
      login.hidden = false; refresh.hidden = true; logout.hidden = true; submissions.hidden = true; arenaScores.hidden = true; glitchScores.hidden = true; if (arenaEvents) arenaEvents.hidden = true;
      return;
    }
    const profile = await client.from("profiles").select("display_name,is_admin").eq("id", currentUser.id).maybeSingle();
    if (profile.error) { setBadge("Admin check unavailable", true); title.textContent = "Admin check failed"; copy.textContent = profile.error.message; login.hidden = true; refresh.hidden = true; logout.hidden = false; submissions.hidden = true; arenaScores.hidden = true; glitchScores.hidden = true; if (arenaEvents) arenaEvents.hidden = true; return; }
    if (!profile.data || !profile.data.is_admin) {
      setBadge("Access denied", true); title.textContent = "Not an admin"; copy.textContent = "This Discord account is not marked as a GankByte admin."; login.hidden = true; refresh.hidden = true; logout.hidden = false; submissions.hidden = true; arenaScores.hidden = true; glitchScores.hidden = true; if (arenaEvents) arenaEvents.hidden = true; return;
    }
    setBadge("Admin connected"); title.textContent = profile.data.display_name || "GankByte Admin"; copy.textContent = "Review pending contributions, game scores, and Arena events below."; login.hidden = true; refresh.hidden = false; logout.hidden = false; submissions.hidden = false; arenaScores.hidden = false; glitchScores.hidden = false; if (arenaEvents) arenaEvents.hidden = false; await refreshQueues(); await loadArenaEvents();
  }

  if (!ready) {
    loadSession(null);
    login.disabled = true;
  } else {
    client = window.supabase.createClient(config.supabaseUrl, config.supabasePublishableKey);
    client.auth.onAuthStateChange((event, session) => window.setTimeout(() => loadSession(session), 0));
    client.auth.getSession().then((result) => loadSession(result.data.session)).catch(() => message("Admin services are temporarily unavailable.", true));
  }

  login.addEventListener("click", async () => { if (!client) return; const result = await client.auth.signInWithOAuth({ provider: "discord", options: { redirectTo: window.location.origin + window.location.pathname } }); if (result.error) message(result.error.message, true); });
  logout.addEventListener("click", async () => { if (client) await client.auth.signOut(); });
  refresh.addEventListener("click", refreshQueues);
  arenaEventForm?.addEventListener("submit", saveArenaEvent);
  $("event-form-clear")?.addEventListener("click", () => { arenaEventForm?.reset(); if (eventFormStatus) eventFormStatus.textContent = ""; });
  rejectForm.addEventListener("submit", submitRejection);
  rejectDialog.querySelectorAll("[data-reject-cancel]").forEach((element) => element.addEventListener("click", closeRejectDialog));
  window.addEventListener("keydown", (event) => { if (event.key === "Escape" && !rejectDialog.hidden) closeRejectDialog(); });
}());
