const dashCanvas = document.querySelector("#glitch-canvas");
const dashCtx = dashCanvas.getContext("2d");
const dashStart = document.querySelector("#dash-start");
const dashMessage = document.querySelector("#dash-message");
const dashStatus = document.querySelector("#dash-status");
const dashScoreValue = document.querySelector("#dash-score");
const dashStreakValue = document.querySelector("#dash-streak");
const dashTimeValue = document.querySelector("#dash-time");
const dashLivesValue = document.querySelector("#dash-lives");
const dashAuthStatus = document.querySelector("#dash-auth-status");
const dashLogin = document.querySelector("#dash-login");
const dashLogout = document.querySelector("#dash-logout");
const dashLeaderboardBody = document.querySelector("#dash-leaderboard-body");
const dashConfig = window.GANKBYTE_XP_CONFIG || {};
const dashBestKey = "gankbyte-glitch-dash-best";
const DASH_WIDTH = dashCanvas.width;
const DASH_HEIGHT = dashCanvas.height;
const DASH_LANES = [DASH_HEIGHT * .27, DASH_HEIGHT * .5, DASH_HEIGHT * .73];
const dashKeys = new Set();
let dashRunning = false;
let dashLastFrame = 0;
let dashElapsed = 0;
let dashScore = 0;
let dashStreak = 0;
let dashTimeLeft = 45;
let dashLives = 3;
let dashLane = 1;
let dashVisualLane = 1;
let dashInvulnerableUntil = 0;
let dashCooldown = 0;
let dashNextGateAt = 0;
let dashGates = [];
let dashSparks = [];
let dashClient = null;
let dashUser = null;
let dashLastRun = null;

function dashRandom(min, max) { return Math.random() * (max - min) + min; }
function dashLaneY(lane) { return DASH_LANES[Math.max(0, Math.min(2, lane))]; }
function dashBestScore() { return Number(localStorage.getItem(dashBestKey) || 0); }
function dashMoveLane(amount) { dashLane = Math.max(0, Math.min(2, dashLane + amount)); }

function escapeDashHtml(value) {
  return String(value || "").replace(/[&<>'"]/g, (character) => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;","\"":"&quot;"}[character]));
}

function renderDashLeaderboard(rows) {
  if (!rows || !rows.length) {
    dashLeaderboardBody.innerHTML = '<tr><td colspan="4">No scores yet. Be the first to submit.</td></tr>';
    return;
  }
  dashLeaderboardBody.innerHTML = rows.map((row, index) => '<tr><td>' + (index + 1) + '</td><td>' + escapeDashHtml(row.display_name || "GankByte Player") + '</td><td>' + Number(row.best_score || 0).toLocaleString() + '</td><td>' + Number(row.best_streak || 0) + '</td></tr>').join("");
}

async function loadDashLeaderboard() {
  if (!dashClient) {
    dashLeaderboardBody.innerHTML = '<tr><td colspan="4">Global scores need the XP backend connection.</td></tr>';
    return;
  }
  const result = await dashClient.from("glitch_dash_leaderboard").select("display_name,best_score,best_streak").order("best_score", { ascending: false }).limit(25);
  if (result.error) {
    dashLeaderboardBody.innerHTML = '<tr><td colspan="4">Global scores are not available yet.</td></tr>';
    return;
  }
  renderDashLeaderboard(result.data);
}

async function submitDashRun() {
  if (!dashClient || !dashUser || !dashLastRun || dashLastRun.submitted) return;
  const result = await dashClient.from("glitch_dash_scores").insert({ user_id: dashUser.id, score: dashLastRun.score, streak: dashLastRun.streak, run_seconds: dashLastRun.runSeconds });
  if (result.error) {
    dashAuthStatus.textContent = "Score could not be submitted. Try again while signed in.";
    return;
  }
  dashLastRun.submitted = true;
  dashAuthStatus.textContent = "Score posted to the global leaderboard.";
  await loadDashLeaderboard();
}

async function loadDashSession(session) {
  dashUser = session ? session.user : null;
  if (!dashUser) {
    dashAuthStatus.textContent = "Sign in with Discord to submit scores.";
    dashLogin.hidden = false;
    dashLogout.hidden = true;
    return;
  }
  const name = dashUser.user_metadata?.global_name || dashUser.user_metadata?.full_name || "Discord player";
  dashAuthStatus.textContent = `Signed in as ${name}. Scores post automatically.`;
  dashLogin.hidden = true;
  dashLogout.hidden = false;
  await submitDashRun();
}

async function initDashOnline() {
  const configured = Boolean(dashConfig.supabaseUrl && dashConfig.supabasePublishableKey && window.supabase);
  if (!configured) {
    dashAuthStatus.textContent = "Global scores need the XP backend connection.";
    dashLogin.disabled = true;
    await loadDashLeaderboard();
    return;
  }
  dashClient = window.supabase.createClient(dashConfig.supabaseUrl, dashConfig.supabasePublishableKey);
  dashClient.auth.onAuthStateChange((event, session) => window.setTimeout(() => loadDashSession(session), 0));
  const result = await dashClient.auth.getSession();
  await loadDashSession(result.data.session);
  await loadDashLeaderboard();
}

function dashReset() {
  dashRunning = false;
  dashElapsed = 0;
  dashScore = 0;
  dashStreak = 0;
  dashTimeLeft = 45;
  dashLives = 3;
  dashLane = 1;
  dashVisualLane = 1;
  dashInvulnerableUntil = 0;
  dashCooldown = 0;
  dashNextGateAt = .5;
  dashGates = [];
  dashSparks = [];
  dashUpdateHud();
}

function dashQueue() {
  if (dashRunning && dashCooldown <= 0) {
    dashInvulnerableUntil = dashElapsed + .36;
    dashCooldown = 1.05;
    for (let index = 0; index < 10; index += 1) dashSparks.push({ x: 150 - index * 9, y: dashLaneY(dashLane) + dashRandom(-12, 12), life: .32, maxLife: .32 });
  }
}

function dashSpawnGate() {
  const gapLane = Math.floor(dashRandom(0, 3));
  dashGates.push({ x: DASH_WIDTH + 90, width: 48, gapLane, checked: false, hit: false, bonus: Math.random() < .3 });
}

function dashUpdateHud() {
  dashScoreValue.textContent = dashScore.toLocaleString();
  dashStreakValue.textContent = dashStreak;
  dashTimeValue.textContent = Math.ceil(dashTimeLeft);
  dashLivesValue.textContent = dashLives;
}

function dashBurst(x, y, color, amount = 12) {
  for (let index = 0; index < amount; index += 1) dashSparks.push({ x, y, vx: dashRandom(-100, 100), vy: dashRandom(-100, 100), color, life: .45, maxLife: .45 });
}

function dashUpdate(dt) {
  dashElapsed += dt;
  dashTimeLeft = Math.max(0, 45 - dashElapsed);
  dashCooldown = Math.max(0, dashCooldown - dt);
  dashVisualLane += (dashLane - dashVisualLane) * Math.min(1, dt * 14);
  if (dashElapsed >= dashNextGateAt) {
    dashSpawnGate();
    dashNextGateAt = dashElapsed + Math.max(.58, .98 - dashElapsed * .006);
  }
  const speed = 310 + dashElapsed * 2.5;
  dashGates.forEach((gate) => { gate.x -= speed * dt; });
  dashGates.forEach((gate) => {
    const touching = gate.x < 184 && gate.x + gate.width > 142;
    if (touching && !gate.checked && !gate.hit && dashElapsed > .25) {
      gate.checked = true;
      if (dashLane === gate.gapLane || dashInvulnerableUntil > dashElapsed) {
        dashScore += 100 + dashStreak * 15;
        dashStreak += 1;
        dashBurst(165, dashLaneY(dashLane), "#c6ff3d", 14);
        if (gate.bonus) dashScore += 50;
      } else {
        gate.hit = true;
        dashLives -= 1;
        dashStreak = 0;
        dashBurst(165, dashLaneY(dashLane), "#ff855c", 20);
        if (dashLives <= 0) dashFinish();
      }
    }
  });
  dashGates = dashGates.filter((gate) => gate.x > -100);
  dashSparks.forEach((spark) => { spark.x += (spark.vx || 0) * dt; spark.y += (spark.vy || 0) * dt; spark.life -= dt; });
  dashSparks = dashSparks.filter((spark) => spark.life > 0);
  dashUpdateHud();
  if (dashTimeLeft <= 0) dashFinish();
}

function dashDraw() {
  dashCtx.clearRect(0, 0, DASH_WIDTH, DASH_HEIGHT);
  dashCtx.strokeStyle = "rgba(244,242,234,.11)";
  dashCtx.lineWidth = 1;
  DASH_LANES.forEach((y) => { dashCtx.beginPath(); dashCtx.moveTo(0, y + 34); dashCtx.lineTo(DASH_WIDTH, y + 34); dashCtx.stroke(); });
  dashGates.forEach((gate) => {
    dashCtx.fillStyle = "rgba(154,123,255,.88)";
    for (let lane = 0; lane < 3; lane += 1) {
      if (lane !== gate.gapLane) dashCtx.fillRect(gate.x, dashLaneY(lane) - 25, gate.width, 50);
    }
    dashCtx.fillStyle = "rgba(198,255,61,.15)";
    dashCtx.fillRect(gate.x, dashLaneY(gate.gapLane) - 25, gate.width, 50);
    if (gate.bonus) { dashCtx.fillStyle = "#7de7ff"; dashCtx.beginPath(); dashCtx.arc(gate.x + gate.width / 2, dashLaneY(gate.gapLane), 8, 0, Math.PI * 2); dashCtx.fill(); }
  });
  dashSparks.forEach((spark) => { dashCtx.globalAlpha = Math.max(0, spark.life / spark.maxLife); dashCtx.fillStyle = spark.color || "#c6ff3d"; dashCtx.fillRect(spark.x, spark.y, 4, 4); });
  dashCtx.globalAlpha = 1;
  const playerY = dashLaneY(dashVisualLane);
  if (dashInvulnerableUntil > dashElapsed) { dashCtx.strokeStyle = "#7de7ff"; dashCtx.lineWidth = 4; dashCtx.beginPath(); dashCtx.arc(165, playerY, 31, 0, Math.PI * 2); dashCtx.stroke(); }
  dashCtx.save();
  dashCtx.translate(165, playerY);
  dashCtx.rotate(Math.PI / 4);
  dashCtx.fillStyle = "#c6ff3d";
  dashCtx.fillRect(-17, -17, 34, 34);
  dashCtx.restore();
  dashCtx.fillStyle = "rgba(198,255,61,.7)";
  dashCtx.font = "10px Arial";
  dashCtx.textAlign = "left";
  dashCtx.fillText(dashCooldown > 0 ? `DASH ${dashCooldown.toFixed(1)}S` : "DASH READY", 18, DASH_HEIGHT - 18);
}

function dashFinish() {
  if (!dashRunning) return;
  dashRunning = false;
  const best = dashBestScore();
  const newBest = dashScore > best;
  if (newBest) localStorage.setItem(dashBestKey, String(dashScore));
  dashLastRun = { score: dashScore, streak: dashStreak, runSeconds: Math.round(dashElapsed), submitted: false };
  dashMessage.hidden = false;
  dashMessage.innerHTML = `<strong>${dashLives ? "RUN COMPLETE" : "SIGNAL LOST"}</strong><span>${dashScore.toLocaleString()} points // streak ${dashStreak}</span>`;
  dashStart.innerHTML = "Run it again  <span>&rarr;</span>";
  dashStatus.textContent = newBest ? `New best score: ${dashScore.toLocaleString()}.` : `Best score on this device: ${Math.max(best, dashScore).toLocaleString()}.`;
  submitDashRun();
}

function dashStartRun() {
  dashReset();
  dashRunning = true;
  dashMessage.hidden = true;
  dashStart.innerHTML = "Restart run  <span>&rarr;</span>";
  dashStatus.textContent = "Read the gap. Make the move.";
  dashCanvas.focus();
}

function dashFrame(timestamp) {
  const dt = Math.min((timestamp - dashLastFrame) / 1000 || 0, .05);
  dashLastFrame = timestamp;
  if (dashRunning) dashUpdate(dt);
  dashDraw();
  requestAnimationFrame(dashFrame);
}

window.addEventListener("keydown", (event) => {
  if (["ArrowUp", "ArrowDown", "w", "s", "W", "S", " "].includes(event.key)) event.preventDefault();
  if (event.key === "ArrowUp" || event.key === "w" || event.key === "W") dashMoveLane(-1);
  if (event.key === "ArrowDown" || event.key === "s" || event.key === "S") dashMoveLane(1);
  if (event.key === " ") dashQueue();
});
document.querySelectorAll("[data-dash-dir]").forEach((button) => {
  button.addEventListener("pointerdown", (event) => { event.preventDefault(); if (button.dataset.dashDir === "up") dashMoveLane(-1); else if (button.dataset.dashDir === "down") dashMoveLane(1); else dashQueue(); });
});
dashStart.addEventListener("click", dashStartRun);
dashCanvas.addEventListener("pointerdown", () => dashCanvas.focus());
dashLogin.addEventListener("click", async () => {
  if (!dashClient) return;
  const result = await dashClient.auth.signInWithOAuth({ provider: "discord", options: { redirectTo: window.location.origin + window.location.pathname } });
  if (result.error) dashAuthStatus.textContent = result.error.message;
});
dashLogout.addEventListener("click", async () => {
  if (dashClient) await dashClient.auth.signOut();
});
dashReset();
dashStatus.textContent = dashBestScore() ? `Best score on this device: ${dashBestScore().toLocaleString()}.` : "No best score yet. Start a run.";
initDashOnline().catch(() => {
  dashAuthStatus.textContent = "Online scores are unavailable, but local play is still ready.";
  dashLogin.disabled = true;
});
requestAnimationFrame(dashFrame);
