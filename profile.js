const profileConfig = window.GANKBYTE_XP_CONFIG || {};
const profileLogin = document.querySelector("#profile-login");
const profileLogout = document.querySelector("#profile-logout");
const profileBadge = document.querySelector("#profile-badge");
const profileTitle = document.querySelector("#profile-title");
const profileCopy = document.querySelector("#profile-copy");
const profileStatus = document.querySelector("#profile-status");
const profileXp = document.querySelector("#profile-xp");
const profileLevel = document.querySelector("#profile-level");
const profileByteBest = document.querySelector("#profile-byte-best");
const profileByteRuns = document.querySelector("#profile-byte-runs");
const profileGlitchBest = document.querySelector("#profile-glitch-best");
const profileGlitchRuns = document.querySelector("#profile-glitch-runs");
const profileHistory = document.querySelector("#profile-history");
let profileClient = null;
let profileUser = null;

function profileEscape(value) { return String(value || "").replace(/[&<>'"]/g, (character) => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;","\"":"&quot;"}[character])); }
function profileLevelFor(xp) { return String(Math.max(1, Math.floor(Number(xp || 0) / 250) + 1)).padStart(2, "0"); }
function profileDate(value) { return value ? new Date(value).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" }) : "—"; }
function renderHistory(arenaRows, glitchRows) {
  const rows = [...(arenaRows || []).map((row) => ({ game: "Byte Rush", score: row.score, result: `Wave ${row.wave}`, seconds: row.run_seconds, created_at: row.created_at })), ...(glitchRows || []).map((row) => ({ game: "Glitch Dash", score: row.score, result: `Streak ${row.streak}`, seconds: row.run_seconds, created_at: row.created_at }))].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 20);
  if (!rows.length) { profileHistory.innerHTML = '<tr><td colspan="5">No submitted runs yet. Play a game to start your history.</td></tr>'; return; }
  profileHistory.innerHTML = rows.map((row) => `<tr><td>${row.game}</td><td>${Number(row.score || 0).toLocaleString()}</td><td>${row.result}</td><td>${Number(row.seconds || 0)}s</td><td>${profileDate(row.created_at)}</td></tr>`).join("");
}
async function loadProfile(session) {
  profileUser = session ? session.user : null;
  if (!profileUser) {
    profileBadge.textContent = "Not signed in";
    profileTitle.textContent = "Sign in to load your profile";
    profileCopy.textContent = "Play locally without an account, or sign in with Discord to save scores and see your history.";
    profileLogin.hidden = false; profileLogout.hidden = true;
    return;
  }
  const name = profileUser.user_metadata?.global_name || profileUser.user_metadata?.full_name || "Discord player";
  profileBadge.textContent = "Signed in";
  profileTitle.textContent = name;
  profileCopy.textContent = "Your scores, XP, and recent Arena activity are connected to this Discord account.";
  profileLogin.hidden = true; profileLogout.hidden = false;
  profileStatus.textContent = "Loading profile data...";
  const [profileResult, xpResult, arenaResult, glitchResult] = await Promise.all([
    profileClient.from("profiles").select("display_name").eq("id", profileUser.id).maybeSingle(),
    profileClient.from("xp_leaderboard").select("xp_total").eq("id", profileUser.id).maybeSingle(),
    profileClient.from("arena_scores").select("score,wave,run_seconds,created_at").eq("user_id", profileUser.id).order("created_at", { ascending: false }).limit(50),
    profileClient.from("glitch_dash_scores").select("score,streak,run_seconds,created_at").eq("user_id", profileUser.id).order("created_at", { ascending: false }).limit(50)
  ]);
  if (profileResult.data?.display_name) profileTitle.textContent = profileResult.data.display_name;
  const xpTotal = Number(xpResult.data?.xp_total || 0);
  profileXp.textContent = `${xpTotal.toLocaleString()} XP`;
  profileLevel.textContent = `Level ${profileLevelFor(xpTotal)}`;
  const arenaRows = arenaResult.data || [];
  const glitchRows = glitchResult.data || [];
  const byteBest = arenaRows.reduce((best, row) => Math.max(best, Number(row.score || 0)), 0);
  const glitchBest = glitchRows.reduce((best, row) => Math.max(best, Number(row.score || 0)), 0);
  profileByteBest.textContent = byteBest ? byteBest.toLocaleString() : "—";
  profileByteRuns.textContent = `${arenaRows.length} submitted run${arenaRows.length === 1 ? "" : "s"}`;
  profileGlitchBest.textContent = glitchBest ? glitchBest.toLocaleString() : "—";
  profileGlitchRuns.textContent = `${glitchRows.length} submitted run${glitchRows.length === 1 ? "" : "s"}`;
  renderHistory(arenaRows, glitchRows);
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
