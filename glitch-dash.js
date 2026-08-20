const dashCanvas = document.querySelector("#glitch-canvas");
const dashCtx = dashCanvas.getContext("2d");
const dashStart = document.querySelector("#dash-start");
const dashSubmit = document.querySelector("#dash-submit");
const dashResultActions = document.querySelector("#dash-result-actions");
const dashResultRank = document.querySelector("#dash-result-rank");
const dashMessage = document.querySelector("#dash-message");
const dashStatus = document.querySelector("#dash-status");
const dashScoreValue = document.querySelector("#dash-score");
const dashStreakValue = document.querySelector("#dash-streak");
const dashRunTimeValue = document.querySelector("#dash-run-time");
const dashLivesValue = document.querySelector("#dash-lives");
const dashSpeedValue = document.querySelector("#dash-speed");
const dashPowerValue = document.querySelector("#dash-power");
const dashAuthStatus = document.querySelector("#dash-auth-status");
const dashLogin = document.querySelector("#dash-login");
const dashLogout = document.querySelector("#dash-logout");
const dashLeaderboardBody = document.querySelector("#dash-leaderboard-body");
const dashScopeButtons = document.querySelectorAll("[data-dash-scope]");
const dashConfig = window.GANKBYTE_XP_CONFIG || {};
const dashBestKey = "gankbyte-glitch-dash-best";
const dashCoarsePointer = window.matchMedia?.("(pointer: coarse)").matches || false;
const DASH_WIDTH = dashCanvas.width;
const DASH_HEIGHT = dashCanvas.height;
const DASH_LANES = [DASH_HEIGHT * .27, DASH_HEIGHT * .5, DASH_HEIGHT * .73];
const dashKeys = new Set();
let dashRunning = false;
let dashLastFrame = 0;
let dashElapsed = 0;
let dashScore = 0;
let dashStreak = 0;
let dashRunTime = 0;
let dashLives = 3;
let dashLane = 1;
let dashVisualLane = 1;
let dashInvulnerableUntil = 0;
let dashCooldown = 0;
let dashNextGateAt = 0;
let dashClearedGates = 0;
let dashSpeedLevel = 1;
let dashShieldCharges = 0;
let dashOverdriveUntil = 0;
let dashGates = [];
let dashSparks = [];
let dashClient = null;
let dashUser = null;
let dashLastRun = null;
let dashLeaderboardScope = "all";
let dashGestureStart = null;

const DASH_POWERUPS = {
  shield: { label: "SHIELD", color: "#7de7ff", short: "S" },
  overdrive: { label: "OVERDRIVE", color: "#ffb45c", short: "2X" },
  phase: { label: "PHASE", color: "#c6ff3d", short: "P" }
};

function dashRandom(min, max) { return Math.random() * (max - min) + min; }
function dashLaneY(lane) {
  const clamped = Math.max(0, Math.min(2, lane));
  const lower = Math.floor(clamped);
  const upper = Math.ceil(clamped);
  return DASH_LANES[lower] + (DASH_LANES[upper] - DASH_LANES[lower]) * (clamped - lower);
}
function dashBestScore() { return Number(localStorage.getItem(dashBestKey) || 0); }
function dashMoveLane(amount) { dashLane = Math.max(0, Math.min(2, dashLane + amount)); }
function dashPowerupInfo(type) { return DASH_POWERUPS[type] || null; }
function dashRandomPowerup() {
  const types = Object.keys(DASH_POWERUPS);
  return types[Math.floor(Math.random() * types.length)];
}
function dashScoreMultiplier() { return dashOverdriveUntil > dashElapsed ? 2 : 1; }
function dashCurrentSpeed() { return (dashCoarsePointer ? 245 : 300) + (dashSpeedLevel - 1) * (dashCoarsePointer ? 28 : 38) + dashElapsed * (dashCoarsePointer ? 1.9 : 2.6); }
function dashPowerText() {
  const active = [];
  if (dashShieldCharges) active.push(`SHIELD ${dashShieldCharges}`);
  if (dashOverdriveUntil > dashElapsed) active.push(`2X ${Math.ceil(dashOverdriveUntil - dashElapsed)}S`);
  if (dashInvulnerableUntil > dashElapsed && dashCooldown <= 0) active.push("PHASE");
  return active.join(" + ") || "NONE";
}

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

async function loadDashLeaderboard(scope = "all") {
  if (!dashClient) {
    dashLeaderboardBody.innerHTML = '<tr><td colspan="4">Global scores need the XP backend connection.</td></tr>';
    return;
  }
  const view = scope === "week" ? "glitch_dash_weekly_leaderboard" : "glitch_dash_leaderboard";
  const result = await dashClient.from(view).select("display_name,best_score,best_streak").order("best_score", { ascending: false }).limit(25);
  if (result.error) {
    dashLeaderboardBody.innerHTML = '<tr><td colspan="4">Global scores are not available yet.</td></tr>';
    return;
  }
  renderDashLeaderboard(result.data);
}

async function loadDashRank() {
  if (!dashResultRank) return;
  if (!dashUser) { dashResultRank.textContent = "Sign in to submit and rank this run."; return; }
  if (!dashClient) { dashResultRank.textContent = "Leaderboard position unavailable."; return; }
  const view = dashLeaderboardScope === "week" ? "glitch_dash_weekly_leaderboard" : "glitch_dash_leaderboard";
  const result = await dashClient.from(view).select("id,best_score").order("best_score", { ascending: false }).limit(500);
  if (result.error) { dashResultRank.textContent = "Leaderboard position unavailable."; return; }
  const position = (result.data || []).findIndex((row) => row.id === dashUser.id);
  dashResultRank.textContent = position >= 0 ? `Current position: #${position + 1}` : "Your run is not on the board yet.";
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
  await loadDashLeaderboard(dashLeaderboardScope);
  await loadDashRank();
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
  if (dashLastRun?.submitted) await loadDashRank();
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
  await loadDashLeaderboard(dashLeaderboardScope);
}

function dashReset() {
  dashSubmit.hidden = true;
  if (dashResultActions) dashResultActions.hidden = true;
  dashRunning = false;
  dashElapsed = 0;
  dashScore = 0;
  dashStreak = 0;
  dashRunTime = 0;
  dashLives = 3;
  dashLane = 1;
  dashVisualLane = 1;
  dashInvulnerableUntil = 0;
  dashCooldown = 0;
  dashNextGateAt = .5;
  dashClearedGates = 0;
  dashSpeedLevel = 1;
  dashShieldCharges = 0;
  dashOverdriveUntil = 0;
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
  dashGates.push({ x: DASH_WIDTH + 90, width: 48, gapLane, checked: false, hit: false, powerup: Math.random() < .24 ? dashRandomPowerup() : null });
}

function dashUpdateHud() {
  dashScoreValue.textContent = dashScore.toLocaleString();
  dashStreakValue.textContent = dashStreak;
  dashRunTimeValue.textContent = `${Math.floor(dashRunTime)}s`;
  dashLivesValue.textContent = dashLives;
  dashSpeedValue.textContent = dashSpeedLevel;
  dashPowerValue.textContent = dashPowerText();
}

function dashBurst(x, y, color, amount = 12) {
  for (let index = 0; index < amount; index += 1) dashSparks.push({ x, y, vx: dashRandom(-100, 100), vy: dashRandom(-100, 100), color, life: .45, maxLife: .45 });
}

function dashCollectPowerup(type) {
  const info = dashPowerupInfo(type);
  if (!info) return;
  if (type === "shield") {
    dashShieldCharges = Math.min(2, dashShieldCharges + 1);
    dashStatus.textContent = `Shield online: ${dashShieldCharges} hit${dashShieldCharges === 1 ? "" : "s"} buffered.`;
  } else if (type === "overdrive") {
    dashOverdriveUntil = Math.max(dashOverdriveUntil, dashElapsed) + 6;
    dashStatus.textContent = "Overdrive online: double score for six seconds.";
  } else if (type === "phase") {
    dashCooldown = 0;
    dashInvulnerableUntil = Math.max(dashInvulnerableUntil, dashElapsed) + 1.2;
    dashStatus.textContent = "Phase online: Dash recharged and invulnerability active.";
  }
  dashBurst(165, dashLaneY(dashLane), info.color, 20);
}

function dashClearGate(gate) {
  dashClearedGates += 1;
  const nextLevel = 1 + Math.floor(dashClearedGates / 5);
  if (nextLevel > dashSpeedLevel) {
    dashSpeedLevel = nextLevel;
    dashStatus.textContent = `Speed level ${dashSpeedLevel}: the signal is accelerating.`;
    dashBurst(165, dashLaneY(dashLane), "#9a7bff", 24);
  }
  const baseScore = 100 + dashStreak * 15;
  dashScore += Math.round(baseScore * dashScoreMultiplier());
  dashStreak += 1;
  dashBurst(165, dashLaneY(dashLane), "#c6ff3d", 14);
  if (gate.powerup) dashCollectPowerup(gate.powerup);
}

function dashUpdate(dt) {
  dashElapsed += dt;
  dashRunTime = dashElapsed;
  dashCooldown = Math.max(0, dashCooldown - dt);
  dashVisualLane += (dashLane - dashVisualLane) * Math.min(1, dt * 14);
  if (dashElapsed >= dashNextGateAt) {
    dashSpawnGate();
    dashNextGateAt = dashElapsed + Math.max(.48, .98 - dashElapsed * .005 - (dashSpeedLevel - 1) * .035);
  }
  const speed = dashCurrentSpeed();
  dashGates.forEach((gate) => { gate.x -= speed * dt; });
  dashGates.forEach((gate) => {
    const touching = gate.x < 184 && gate.x + gate.width > 142;
    if (touching && !gate.checked && !gate.hit && dashElapsed > .25) {
      gate.checked = true;
      if (dashLane === gate.gapLane || dashInvulnerableUntil > dashElapsed) {
        dashClearGate(gate);
      } else {
        if (dashShieldCharges > 0) {
          dashShieldCharges -= 1;
          dashStreak = 0;
          dashScore += 25;
          dashStatus.textContent = "Shield absorbed the hit. Find the next safe lane.";
          dashBurst(165, dashLaneY(dashLane), "#7de7ff", 24);
        } else {
          gate.hit = true;
          dashLives -= 1;
          dashStreak = 0;
          dashStatus.textContent = dashLives ? "Hit detected. Rebuild your streak." : "Signal lost. No lives remaining.";
          dashBurst(165, dashLaneY(dashLane), "#ff855c", 20);
          if (dashLives <= 0) dashFinish();
        }
      }
    }
  });
  dashGates = dashGates.filter((gate) => gate.x > -100);
  dashSparks.forEach((spark) => { spark.x += (spark.vx || 0) * dt; spark.y += (spark.vy || 0) * dt; spark.life -= dt; });
  dashSparks = dashSparks.filter((spark) => spark.life > 0);
  dashUpdateHud();
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
    if (gate.powerup) {
      const info = dashPowerupInfo(gate.powerup);
      const powerX = gate.x + gate.width / 2;
      const powerY = dashLaneY(gate.gapLane);
      dashCtx.save();
      dashCtx.shadowColor = info.color;
      dashCtx.shadowBlur = 18;
      dashCtx.fillStyle = info.color;
      dashCtx.beginPath();
      dashCtx.arc(powerX, powerY, 13, 0, Math.PI * 2);
      dashCtx.fill();
      dashCtx.shadowBlur = 0;
      dashCtx.fillStyle = "#0a0b0f";
      dashCtx.font = "bold 9px Arial";
      dashCtx.textAlign = "center";
      dashCtx.textBaseline = "middle";
      dashCtx.fillText(info.short, powerX, powerY + 1);
      dashCtx.restore();
    }
  });
  dashSparks.forEach((spark) => { dashCtx.globalAlpha = Math.max(0, spark.life / spark.maxLife); dashCtx.fillStyle = spark.color || "#c6ff3d"; dashCtx.fillRect(spark.x, spark.y, 4, 4); });
  dashCtx.globalAlpha = 1;
  const playerY = dashLaneY(dashVisualLane);
  if (dashInvulnerableUntil > dashElapsed) { dashCtx.strokeStyle = "#7de7ff"; dashCtx.lineWidth = 4; dashCtx.beginPath(); dashCtx.arc(165, playerY, 31, 0, Math.PI * 2); dashCtx.stroke(); }
  if (dashShieldCharges) { dashCtx.strokeStyle = "rgba(125,231,255,.8)"; dashCtx.lineWidth = 2; dashCtx.beginPath(); dashCtx.arc(165, playerY, 25, 0, Math.PI * 2); dashCtx.stroke(); }
  dashCtx.save();
  dashCtx.translate(165, playerY);
  dashCtx.rotate(Math.PI / 4);
  dashCtx.fillStyle = "#c6ff3d";
  dashCtx.fillRect(-17, -17, 34, 34);
  dashCtx.restore();
  dashCtx.fillStyle = "rgba(198,255,61,.7)";
  dashCtx.font = "10px Arial";
  dashCtx.textAlign = "left";
  dashCtx.fillText(`SPEED ${Math.round(dashCurrentSpeed())}`, 18, 18);
  dashCtx.textAlign = "right";
  dashCtx.fillText(dashCooldown > 0 ? `DASH ${dashCooldown.toFixed(1)}S` : "DASH READY", DASH_WIDTH - 18, DASH_HEIGHT - 18);
}

function dashFinish() {
  if (!dashRunning) return;
  dashRunning = false;
  const best = dashBestScore();
  const newBest = dashScore > best;
  if (newBest) localStorage.setItem(dashBestKey, String(dashScore));
  dashLastRun = { score: dashScore, streak: dashStreak, speedLevel: dashSpeedLevel, runSeconds: Math.round(dashElapsed), submitted: false };
  localStorage.setItem("gankbyte-glitch-dash-last-played", new Date().toISOString());
  dashMessage.hidden = false;
  dashMessage.innerHTML = `<strong>${dashLives ? "RUN COMPLETE" : "SIGNAL LOST"}</strong><span>${dashScore.toLocaleString()} points // streak ${dashStreak} // speed level ${dashSpeedLevel}</span>`;
  dashStart.innerHTML = "Run it again  <span>&rarr;</span>";
  dashSubmit.hidden = false;
  if (dashResultActions) dashResultActions.hidden = false;
  if (dashResultRank) dashResultRank.textContent = dashUser ? "Submitting run..." : "Sign in to submit and rank this run.";
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
dashMessage.addEventListener("click", dashStartRun);
dashCanvas.addEventListener("click", () => { if (!dashRunning) dashStartRun(); });
dashCanvas.addEventListener("pointerdown", (event) => { event.preventDefault(); dashCanvas.focus(); dashGestureStart = { x: event.clientX, y: event.clientY, pointerType: event.pointerType }; dashCanvas.setPointerCapture?.(event.pointerId); });
dashCanvas.addEventListener("pointerup", (event) => {
  event.preventDefault();
  if (dashGestureStart?.pointerType === "touch" && dashRunning) {
    const dx = event.clientX - dashGestureStart.x;
    const dy = event.clientY - dashGestureStart.y;
    if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 24) dashMoveLane(dy < 0 ? -1 : 1);
    else if (Math.abs(dx) > 32) dashQueue();
  }
  dashGestureStart = null;
});
dashCanvas.addEventListener("pointercancel", () => { dashGestureStart = null; });
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
dashScopeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    dashScopeButtons.forEach((item) => { item.classList.toggle("is-active", item === button); item.setAttribute("aria-selected", item === button ? "true" : "false"); });
    dashLeaderboardScope = button.dataset.dashScope;
    loadDashLeaderboard(dashLeaderboardScope);
  });
});
