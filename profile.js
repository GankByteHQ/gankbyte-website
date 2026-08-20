const profileConfig = window.GANKBYTE_XP_CONFIG || {};
const profileLogin = document.querySelector("#profile-login");
const profileLogout = document.querySelector("#profile-logout");
const profileBadge = document.querySelector("#profile-badge");
const profileTitle = document.querySelector("#profile-title");
const profileCopy = document.querySelector("#profile-copy");
const profileStatus = document.querySelector("#profile-status");
const profileAvatar = document.querySelector("#profile-avatar");
const profileXp = document.querySelector("#profile-xp");
const profileLevel = document.querySelector("#profile-level");
const profileByteBest = document.querySelector("#profile-byte-best");
const profileByteRuns = document.querySelector("#profile-byte-runs");
const profileGlitchBest = document.querySelector("#profile-glitch-best");
const profileGlitchRuns = document.querySelector("#profile-glitch-runs");
const profileHistory = document.querySelector("#profile-history");
const profileRejections = document.querySelector("#profile-rejections");
const profileChallenges = document.querySelector("#profile-challenges");
const profileXpHistory = document.querySelector("#profile-xp-history");
let profileClient = null;
let profileUser = null;

function profileEscape(value) { return String(value || "").replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", "\"": "&quot;" }[character])); }
function profileLevelFor(xp) { return String(Math.max(1, Math.floor(Number(xp || 0) / 250) + 1)).padStart(2, "0"); }
function profileInitials(value) { return String(value || "GB").split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "GB"; }
function profileDate(value) { return value ? new Date(value).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" }) : "—"; }
function profileNoticeKey(type, id) { return `${type}:${id}`; }
function profileLocalDismissals(userId) {
  try { return JSON.parse(window.localStorage.getItem(`gankbyte-dismissed-notices:${userId}`) || "[]"); } catch { return []; }
}
function saveProfileLocalDismissal(userId, type, id) {
  const current = new Set(profileLocalDismissals(userId));
  current.add(profileNoticeKey(type, id));
  try { window.localStorage.setItem(`gankbyte-dismissed-notices:${userId}`, JSON.stringify([...current])); } catch { /* best effort fallback */ }
}

function renderHistory(arenaRows, glitchRows) {
  const rows = [...(arenaRows || []).map((row) => ({ game: "Byte Rush", score: row.score, result: `Wave ${row.wave}`, seconds: row.run_seconds, created_at: row.created_at })), ...(glitchRows || []).map((row) => ({ game: "Glitch Dash", score: row.score, result: `Streak ${row.streak}`, seconds: row.run_seconds, created_at: row.created_at }))].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 20);
  if (!rows.length) { profileHistory.innerHTML = '<tr><td colspan="5">No approved runs yet. Play a game to start your history.</td></tr>'; return; }
  profileHistory.innerHTML = rows.map((row) => `<tr><td>${row.game}</td><td>${Number(row.score || 0).toLocaleString()}</td><td>${row.result}</td><td>${Number(row.seconds || 0)}s</td><td>${profileDate(row.created_at)}</td></tr>`).join("");
}

function renderXpHistory(rows) {
  if (!profileXpHistory) return;
  const approved = (rows || []).filter((row) => row.approved !== false);
  if (!approved.length) {
    profileXpHistory.innerHTML = '<tr><td colspan="4">No approved XP awards yet. Submit a useful contribution to start your history.</td></tr>';
    return;
  }
  profileXpHistory.innerHTML = approved.map((row) => `<tr><td>${profileEscape(row.reason || "GankByte contribution")}</td><td>+${Number(row.amount || 0).toLocaleString()} XP</td><td>${profileEscape(row.source_type || "manual")}</td><td>${profileDate(row.created_at)}</td></tr>`).join("");
}

function renderChallenges(challenges, submissions) {
  if (!profileChallenges) return;
  if (!challenges?.length) {
    profileChallenges.innerHTML = '<article class="content-card"><span class="status-badge">No active targets</span><h3>Check back soon.</h3><p>New challenge formats will appear here when they are active.</p></article>';
    return;
  }
  const latest = new Map();
  (submissions || []).forEach((row) => { if (!latest.has(row.challenge_slug)) latest.set(row.challenge_slug, row); });
  profileChallenges.innerHTML = challenges.map((challenge) => {
    const row = latest.get(challenge.slug);
    const state = row?.status || "not started";
    const badge = state === "approved" ? "Approved" : state === "pending" ? "Pending" : state === "rejected" ? "Needs update" : "Not started";
    const className = state === "rejected" ? "status-badge planned" : "status-badge";
    const detail = state === "approved" ? "Your latest submission was accepted." : state === "pending" ? "Your proof is waiting for review." : state === "rejected" ? (row.reviewer_note || "Review feedback is on your moderation notes.") : `Base award: ${Number(challenge.base_xp || 0).toLocaleString()} XP.`;
    return `<article class="content-card"><span class="${className}">${badge}</span><h3>${profileEscape(challenge.title)}</h3><p>${profileEscape(detail)}</p><a class="text-link" href="challenges.html">Open challenge board <span>&nearr;</span></a></article>`;
  }).join("");
}

function renderRejections(submissionRows, arenaRows, glitchRows, dismissalRows) {
  const records = [
    ...(submissionRows || []).map((row) => ({ key: profileNoticeKey("submission", row.id), group: `submission:${row.challenge_slug}`, type: "submission", id: row.id, label: row.challenge_slug === "community-contribution" ? "Community contribution" : row.challenge_slug, status: row.status, reason: row.reviewer_note, created_at: row.created_at, reviewed_at: row.reviewed_at })),
    ...(arenaRows || []).map((row) => ({ key: profileNoticeKey("arena", row.id), group: "score:Byte Rush", type: "arena", id: row.id, label: "Byte Rush score", status: row.status, reason: row.reviewer_note, created_at: row.created_at, reviewed_at: row.reviewed_at })),
    ...(glitchRows || []).map((row) => ({ key: profileNoticeKey("glitch", row.id), group: "score:Glitch Dash", type: "glitch", id: row.id, label: "Glitch Dash score", status: row.status, reason: row.reviewer_note, created_at: row.created_at, reviewed_at: row.reviewed_at }))
  ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  const latestByGroup = new Map();
  records.forEach((record) => { if (!latestByGroup.has(record.group)) latestByGroup.set(record.group, record); });
  const dismissed = new Set((dismissalRows || []).map((row) => profileNoticeKey(row.notice_type, row.notice_id)));
  const rejected = [...latestByGroup.values()].filter((record) => record.status === "rejected" && !dismissed.has(record.key));
  if (!rejected.length) {
    profileRejections.innerHTML = '<article class="content-card"><span class="status-badge">Clear</span><h3>No active notices.</h3><p>Rejected submissions disappear here when you submit a newer version or clear the notice.</p></article>';
    return;
  }
  profileRejections.innerHTML = rejected.map((record) => `<article class="content-card"><span class="status-badge planned">Needs attention</span><h3>${profileEscape(record.label)}</h3><p><strong>Reason:</strong> ${profileEscape(record.reason || "The review did not include a reason.")}</p><p class="section-copy">Reviewed ${profileDate(record.reviewed_at || record.created_at)}. Submit a newer version or clear this notice when you are ready.</p><button class="button button-ghost profile-dismiss-button" type="button" data-notice-type="${record.type}" data-notice-id="${record.id}">Clear notice</button></article>`).join("");
  profileRejections.querySelectorAll(".profile-dismiss-button").forEach((button) => button.addEventListener("click", dismissProfileNotice));
}

async function dismissProfileNotice(event) {
  const button = event.currentTarget;
  const type = button.dataset.noticeType;
  const id = Number(button.dataset.noticeId);
  button.disabled = true;
  const result = await profileClient.from("moderation_notice_dismissals").insert({ user_id: profileUser.id, notice_type: type, notice_id: id });
  if (result.error) {
    saveProfileLocalDismissal(profileUser.id, type, id);
    profileStatus.textContent = "Notice cleared on this device. Run XP_MIGRATION_002.sql to sync dismissals across devices.";
  }
  await loadProfile({ user: profileUser });
}

async function loadProfile(session) {
  profileUser = session ? session.user : null;
  if (!profileUser) {
    profileBadge.textContent = "Not signed in";
    profileTitle.textContent = "Sign in to load your profile";
    profileCopy.textContent = "Play locally without an account, or sign in with Discord to save scores and see your history.";
    profileLogin.hidden = false; profileLogout.hidden = true;
    if (profileAvatar) profileAvatar.textContent = "GB";
    profileRejections.innerHTML = '<article class="content-card"><span class="status-badge">Private</span><h3>Sign in to view notices.</h3><p>Moderation feedback is visible only to the player who submitted it.</p></article>';
    if (profileChallenges) profileChallenges.innerHTML = '<article class="content-card"><span class="status-badge">Private</span><h3>Sign in to load challenges.</h3><p>Play a challenge, then return here to track the submission.</p></article>';
    if (profileXpHistory) profileXpHistory.innerHTML = '<tr><td colspan="4">Sign in to load your XP history.</td></tr>';
    return;
  }
  const name = profileUser.user_metadata?.global_name || profileUser.user_metadata?.full_name || "Discord player";
  profileBadge.textContent = "Signed in";
  profileTitle.textContent = name;
  if (profileAvatar) profileAvatar.textContent = profileInitials(name);
  profileCopy.textContent = "Your scores, XP, recent Arena activity, and moderation feedback are connected to this Discord account.";
  profileLogin.hidden = true; profileLogout.hidden = false;
  profileStatus.textContent = "Loading profile data...";
  const [profileResult, xpResult, arenaResult, glitchResult, submissionResult, dismissalResult, xpHistoryResult, challengesResult] = await Promise.all([
    profileClient.from("profiles").select("display_name").eq("id", profileUser.id).maybeSingle(),
    profileClient.from("xp_leaderboard").select("xp_total").eq("id", profileUser.id).maybeSingle(),
    profileClient.from("arena_scores").select("id,score,wave,run_seconds,created_at,status,reviewer_note,reviewed_at").eq("user_id", profileUser.id).order("created_at", { ascending: false }).limit(50),
    profileClient.from("glitch_dash_scores").select("id,score,streak,run_seconds,created_at,status,reviewer_note,reviewed_at").eq("user_id", profileUser.id).order("created_at", { ascending: false }).limit(50),
    profileClient.from("challenge_submissions").select("id,challenge_slug,status,reviewer_note,created_at,reviewed_at").eq("user_id", profileUser.id).order("created_at", { ascending: false }).limit(50),
    profileClient.from("moderation_notice_dismissals").select("notice_type,notice_id").eq("user_id", profileUser.id),
    profileClient.from("xp_ledger").select("amount,reason,source_type,approved,created_at").eq("user_id", profileUser.id).order("created_at", { ascending: false }).limit(50),
    profileClient.from("challenges").select("slug,title,base_xp,bonus_xp").eq("active", true).order("created_at", { ascending: true })
  ]);
  if (profileResult.data?.display_name) profileTitle.textContent = profileResult.data.display_name;
  if (profileAvatar) profileAvatar.textContent = profileInitials(profileTitle.textContent);
  const xpTotal = Number(xpResult.data?.xp_total || 0);
  profileXp.textContent = `${xpTotal.toLocaleString()} XP`;
  profileLevel.textContent = `Level ${profileLevelFor(xpTotal)}`;
  const arenaRows = arenaResult.data || [];
  const glitchRows = glitchResult.data || [];
  const approvedArenaRows = arenaRows.filter((row) => row.status !== "rejected");
  const approvedGlitchRows = glitchRows.filter((row) => row.status !== "rejected");
  const byteBest = approvedArenaRows.reduce((best, row) => Math.max(best, Number(row.score || 0)), 0);
  const glitchBest = approvedGlitchRows.reduce((best, row) => Math.max(best, Number(row.score || 0)), 0);
  profileByteBest.textContent = byteBest ? byteBest.toLocaleString() : "—";
  profileByteRuns.textContent = `${approvedArenaRows.length} submitted run${approvedArenaRows.length === 1 ? "" : "s"}`;
  profileGlitchBest.textContent = glitchBest ? glitchBest.toLocaleString() : "—";
  profileGlitchRuns.textContent = `${approvedGlitchRows.length} submitted run${approvedGlitchRows.length === 1 ? "" : "s"}`;
  renderHistory(approvedArenaRows, approvedGlitchRows);
  renderXpHistory(xpHistoryResult.data || []);
  renderChallenges(challengesResult.data || [], submissionResult.data || []);
  const dismissalRows = dismissalResult.error ? profileLocalDismissals(profileUser.id).map((key) => { const [notice_type, notice_id] = String(key).split(":"); return { notice_type, notice_id: Number(notice_id) }; }) : (dismissalResult.data || []);
  renderRejections(submissionResult.data || [], arenaRows, glitchRows, dismissalRows);
  profileStatus.textContent = "Profile updated.";
}

async function initProfile() {
  if (!profileConfig.supabaseUrl || !profileConfig.supabasePublishableKey || !window.supabase) {
    profileBadge.textContent = "Offline mode";
    profileStatus.textContent = "The XP backend is not configured on this page yet.";
    profileLogin.disabled = true;
    return;
  }
  profileClient = window.supabase.createClient(profileConfig.supabaseUrl, profileConfig.supabasePublishableKey);
  profileClient.auth.onAuthStateChange((event, session) => window.setTimeout(() => loadProfile(session), 0));
  const result = await profileClient.auth.getSession();
  await loadProfile(result.data.session);
}

profileLogin.addEventListener("click", async () => { if (!profileClient) return; const result = await profileClient.auth.signInWithOAuth({ provider: "discord", options: { redirectTo: window.location.origin + window.location.pathname } }); if (result.error) profileStatus.textContent = result.error.message; });
profileLogout.addEventListener("click", async () => { if (profileClient) await profileClient.auth.signOut(); });
initProfile().catch(() => { profileStatus.textContent = "Profile data is unavailable right now."; });
