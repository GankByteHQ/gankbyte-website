const canvas = document.querySelector("#arena-canvas");
const ctx = canvas.getContext("2d");
const board = document.querySelector("#arena-board");
const startButton = document.querySelector("#start-button");
const arenaSubmit = document.querySelector("#arena-submit");
const arenaResultActions = document.querySelector("#arena-result-actions");
const arenaResultRank = document.querySelector("#arena-result-rank");
const message = document.querySelector("#arena-message");
const status = document.querySelector("#game-status");
const scoreValue = document.querySelector("#score");
const comboValue = document.querySelector("#combo");
const timeValue = document.querySelector("#time");
const waveValue = document.querySelector("#wave");
const livesValue = document.querySelector("#lives");
const boostsValue = document.querySelector("#boosts");
const xpValue = document.querySelector("#xp");
const powerValue = document.querySelector("#power-status");
const arenaAuthStatus = document.querySelector("#arena-auth-status");
const arenaLogin = document.querySelector("#arena-login");
const arenaLogout = document.querySelector("#arena-logout");
const arenaLeaderboardBody = document.querySelector("#arena-leaderboard-body");
const arenaScopeButtons = document.querySelectorAll("[data-arena-scope]");
const arenaEventSelect = document.querySelector("#arena-event-select");
const arenaModeSelect = document.querySelector("#arena-mode-select");
const arenaResultCard = document.querySelector("#arena-result-card");
const arenaResultCardScore = document.querySelector("#arena-result-card-score");
const arenaResultCardDetail = document.querySelector("#arena-result-card-detail");
const arenaResultCardNote = document.querySelector("#arena-result-card-note");
const arenaShareResult = document.querySelector("#arena-share-result");
const xpConfig = window.GANKBYTE_XP_CONFIG || {};
const arenaBestKey = "gankbyte-byte-rush-best";
const arenaCoarsePointer = window.matchMedia?.("(pointer: coarse)").matches || false;

const WIDTH = canvas.width;
const HEIGHT = canvas.height;
const keys = new Set();
const touch = new Set();
let pointerTarget = null;
let running = false;
let lastFrame = 0;
let elapsed = 0;
let score = 0;
let combo = 0;
let xp = 0;
let timeLeft = 60;
let runDuration = 60;
let wave = 1;
let lives = 3;
let boosts = 3;
let shield = false;
let overdriveUntil = 0;
let bonus = null;
let nextBonusAt = 0;
let dashQueued = false;
let player;
let pickups = [];
let hazards = [];
let particles = [];
let arenaClient = null;
let arenaUser = null;
let lastRun = null;
let serverRunId = null;
let runAttempt = 0;
let arenaLeaderboardScope = "all";
let arenaMode = arenaModeSelect?.value === "walls" ? "walls" : "wrap";
let arenaGestureStart = null;

function random(min, max) { return Math.random() * (max - min) + min; }
function distance(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
function wrap(value, size) { return (value + size) % size; }

function hitWall() {
  if (arenaMode !== "walls" || player.invulnerable > 0) return;
  if (shield) {
    shield = false;
    status.textContent = "Shield absorbed the wall impact.";
  } else {
    lives -= 1;
    combo = 0;
    score = Math.max(0, score - 25);
    status.textContent = lives ? "Wall impact. Watch the boundary." : "Signal lost.";
  }
  player.invulnerable = 1.1;
  burst(player.x, player.y, "#ff855c", 24);
  updateHud();
  if (!lives) finishGame();
}

function movePlayerBy(dx, dy) {
  const nextX = player.x + dx;
  const nextY = player.y + dy;
  if (arenaMode === "walls") {
    const hit = nextX < player.radius || nextX > WIDTH - player.radius || nextY < player.radius || nextY > HEIGHT - player.radius;
    player.x = clamp(nextX, player.radius, WIDTH - player.radius);
    player.y = clamp(nextY, player.radius, HEIGHT - player.radius);
    if (hit) hitWall();
    return;
  }
  player.x = wrap(nextX, WIDTH);
  player.y = wrap(nextY, HEIGHT);
}

function localBestScore() { return Number(localStorage.getItem(arenaBestKey) || 0); }

function escapeArenaHtml(value) {
  return String(value || "").replace(/[&<>'"]/g, (character) => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;","\"":"&quot;"}[character]));
}

function renderArenaLeaderboard(rows) {
  if (!rows || !rows.length) {
    arenaLeaderboardBody.innerHTML = '<tr><td colspan="4">No approved runs yet. Be the first to submit.</td></tr>';
    return;
  }
  arenaLeaderboardBody.innerHTML = rows.map((row, index) => '<tr><td>' + (index + 1) + '</td><td>' + escapeArenaHtml(row.display_name || "GankByte Player") + '</td><td>' + Number(row.best_score || 0).toLocaleString() + '</td><td>Wave ' + Number(row.best_wave || 1) + '</td></tr>').join("");
}

async function loadArenaLeaderboard(scope = "all") {
  if (!arenaClient) {
    arenaLeaderboardBody.innerHTML = '<tr><td colspan="4">Connect the XP backend to load global scores.</td></tr>';
    return;
  }
  const view = scope === "week" ? "arena_weekly_leaderboard" : "arena_leaderboard";
  const result = await arenaClient.from(view).select("display_name,best_score,best_wave").order("best_score", { ascending: false }).limit(25);
  if (result.error) {
    arenaLeaderboardBody.innerHTML = '<tr><td colspan="4">Global scores are not available yet.</td></tr>';
    return;
  }
  renderArenaLeaderboard(result.data);
}

async function loadArenaRank() {
  if (!arenaResultRank) return;
  if (!arenaUser) { arenaResultRank.textContent = "Sign in to submit and rank this run."; return; }
  if (!arenaClient) { arenaResultRank.textContent = "Leaderboard position unavailable."; return; }
  const view = arenaLeaderboardScope === "week" ? "arena_weekly_leaderboard" : "arena_leaderboard";
  const result = await arenaClient.from(view).select("id,best_score").order("best_score", { ascending: false }).limit(500);
  if (result.error) { arenaResultRank.textContent = "Leaderboard position unavailable."; return; }
  const position = (result.data || []).findIndex((row) => row.id === arenaUser.id);
  arenaResultRank.textContent = position >= 0 ? `Current position: #${position + 1}` : "Your run is not on the board yet.";
}

async function loadArenaEvents() {
  if (!arenaClient || !arenaEventSelect) return;
  const result = await arenaClient.from("arena_live_events").select("slug,title,kind,status").eq("game", "Byte Rush").eq("status", "live").order("starts_at", { ascending: true, nullsFirst: false });
  if (result.error || !result.data?.length) return;
  const selected = new URLSearchParams(window.location.search).get("event") || "";
  arenaEventSelect.innerHTML = '<option value="">Personal run</option>' + result.data.map((event) => `<option value="${escapeArenaHtml(event.slug)}">${escapeArenaHtml(event.title)}${event.kind === "tournament" ? " // Tournament" : ""}</option>`).join("");
  if (result.data.some((event) => event.slug === selected)) arenaEventSelect.value = selected;
}

async function beginVerifiedRun() {
  const attempt = ++runAttempt;
  serverRunId = null;
  if (!arenaClient || !arenaUser) return;
  const result = await arenaClient.rpc("start_arena_run", { p_game_slug: "byte-rush", p_event_slug: arenaEventSelect?.value || null });
  if (attempt === runAttempt && !result.error && result.data?.[0]?.run_id) serverRunId = result.data[0].run_id;
}

function verificationFunctionMissing(error) {
  return error && (error.code === "PGRST202" || /start_arena_run|submit_verified_arena_run|function .*does not exist/i.test(error.message || ""));
}

async function submitLastRun() {
  if (!arenaClient || !arenaUser || !lastRun || lastRun.submitted) return;
  if (serverRunId) {
    const verified = await arenaClient.rpc("submit_verified_arena_run", { p_run_id: serverRunId, p_score: lastRun.score, p_stat: lastRun.wave, p_client_seconds: lastRun.runSeconds });
    if (!verified.error) {
      lastRun.submitted = true;
      arenaAuthStatus.textContent = "Verified score posted to the global leaderboard.";
      await loadArenaLeaderboard(arenaLeaderboardScope);
      await loadArenaRank();
      return;
    }
    if (!verificationFunctionMissing(verified.error)) {
      arenaAuthStatus.textContent = verified.error.message || "Score could not be verified.";
      return;
    }
  }
  const result = await arenaClient.from("arena_scores").insert({ user_id: arenaUser.id, score: lastRun.score, wave: lastRun.wave, run_seconds: lastRun.runSeconds });
  if (result.error) {
    arenaAuthStatus.textContent = "Score could not be submitted. Try again while signed in.";
    return;
  }
  lastRun.submitted = true;
  arenaAuthStatus.textContent = "Score posted to the global leaderboard.";
  await loadArenaLeaderboard(arenaLeaderboardScope);
  await loadArenaRank();
}

async function loadArenaSession(session) {
  arenaUser = session ? session.user : null;
  if (!arenaUser) {
    arenaAuthStatus.textContent = "Sign in with Discord to submit scores.";
    arenaLogin.hidden = false;
    arenaLogout.hidden = true;
    return;
  }
  const name = arenaUser.user_metadata?.global_name || arenaUser.user_metadata?.full_name || "Discord player";
  arenaAuthStatus.textContent = `Signed in as ${name}. Scores post automatically.`;
  arenaLogin.hidden = true;
  arenaLogout.hidden = false;
  await submitLastRun();
  if (lastRun?.submitted) await loadArenaRank();
}

async function initArenaOnline() {
  const configured = Boolean(xpConfig.supabaseUrl && xpConfig.supabasePublishableKey && window.supabase);
  if (!configured) {
    arenaAuthStatus.textContent = "Global scores need the XP backend connection.";
    arenaLogin.disabled = true;
    await loadArenaLeaderboard();
    return;
  }
  arenaClient = window.supabase.createClient(xpConfig.supabaseUrl, xpConfig.supabasePublishableKey);
  arenaClient.auth.onAuthStateChange((event, session) => window.setTimeout(() => loadArenaSession(session), 0));
  const result = await arenaClient.auth.getSession();
  await loadArenaSession(result.data.session);
  await loadArenaEvents();
  await loadArenaLeaderboard(arenaLeaderboardScope);
}

function updateHud() {
  scoreValue.textContent = score;
  comboValue.textContent = combo;
  timeValue.textContent = Math.ceil(timeLeft);
  waveValue.textContent = wave;
  livesValue.textContent = lives;
  boostsValue.textContent = boosts;
  xpValue.textContent = xp;
  if (shield) powerValue.textContent = "SHIELD";
  else if (overdriveUntil > elapsed) powerValue.textContent = `2X ${Math.ceil(overdriveUntil - elapsed)}S`;
  else powerValue.textContent = "NONE";
}

function openPosition() {
  return { x: random(50, WIDTH - 50), y: random(55, HEIGHT - 50) };
}

function spawnPickup() {
  const position = openPosition();
  pickups.push({ ...position, pulse: random(0, Math.PI * 2) });
}

function spawnHazard() {
  const edge = Math.floor(random(0, 4));
  const position = edge === 0 ? { x: random(0, WIDTH), y: -25 } : edge === 1 ? { x: WIDTH + 25, y: random(0, HEIGHT) } : edge === 2 ? { x: random(0, WIDTH), y: HEIGHT + 25 } : { x: -25, y: random(0, HEIGHT) };
  const roll = Math.random();
  const type = wave >= 3 && roll < .18 ? "sprinter" : wave >= 2 && roll < .48 ? "flanker" : "chaser";
  const baseSpeed = random(42, 65) + wave * 9;
  hazards.push({ ...position, radius: random(13, 19), speed: baseSpeed, baseSpeed, type, side: Math.random() < .5 ? -1 : 1, phase: random(0, 10) });
}

function spawnBonus() {
  const position = openPosition();
  const types = ["shield", "overdrive", "time", "boost"];
  bonus = { ...position, anchorX: position.x, anchorY: position.y, pulse: random(0, Math.PI * 2), drift: random(1, 1.5), type: types[Math.floor(random(0, types.length))], expiresAt: elapsed + 11 };
}

function burst(x, y, color, amount = 12) {
  for (let i = 0; i < amount; i += 1) {
    const angle = random(0, Math.PI * 2);
    const speed = random(35, 150);
    particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: random(.35, .75), maxLife: .75, color, size: random(2, 5) });
  }
}

function resetGame() {
  runAttempt += 1;
  if (arenaModeSelect) arenaModeSelect.disabled = false;
  arenaSubmit.hidden = true;
  if (arenaResultActions) arenaResultActions.hidden = true;
  if (arenaResultCard) arenaResultCard.hidden = true;
  serverRunId = null;
  elapsed = 0;
  score = 0;
  combo = 0;
  xp = 0;
  timeLeft = 60;
  runDuration = 60;
  wave = 1;
  lives = 3;
  boosts = 3;
  shield = false;
  overdriveUntil = 0;
  bonus = null;
  nextBonusAt = random(8, 13);
  dashQueued = false;
  pointerTarget = null;
  touch.clear();
  arenaGestureStart = null;
  player = { x: WIDTH / 2, y: HEIGHT / 2, radius: 15, invulnerable: 0, angle: -Math.PI / 2, speed: arenaCoarsePointer ? 225 : 260 };
  pickups = [];
  hazards = [];
  particles = [];
  for (let i = 0; i < 7; i += 1) spawnPickup();
  for (let i = 0; i < 3; i += 1) spawnHazard();
  updateHud();
}

function moveVector() {
  let x = 0;
  let y = 0;
  if (keys.has("ArrowLeft") || keys.has("a") || touch.has("left")) x -= 1;
  if (keys.has("ArrowRight") || keys.has("d") || touch.has("right")) x += 1;
  if (keys.has("ArrowUp") || keys.has("w") || touch.has("up")) y -= 1;
  if (keys.has("ArrowDown") || keys.has("s") || touch.has("down")) y += 1;
  const length = Math.hypot(x, y) || 1;
  return { x: x / length, y: y / length, moving: x !== 0 || y !== 0 };
}

function dash() {
  if (!running || boosts <= 0) {
    if (running) status.textContent = "No boosts left. Survive without it.";
    return;
  }
  const direction = moveVector();
  const x = direction.moving ? direction.x : Math.cos(player.angle);
  const y = direction.moving ? direction.y : Math.sin(player.angle);
  movePlayerBy(x * 105, y * 105);
  player.invulnerable = .55;
  boosts -= 1;
  burst(player.x, player.y, "#c6ff3d", 18);
  status.textContent = "Dash engaged.";
}

function update(dt) {
  elapsed += dt;
  timeLeft = Math.max(0, runDuration - elapsed);
  wave = Math.min(4, 1 + Math.floor(elapsed / 15));
  player.invulnerable = Math.max(0, player.invulnerable - dt);
  if (dashQueued) { dash(); dashQueued = false; }

  if (!bonus && elapsed >= nextBonusAt) spawnBonus();
  if (bonus) {
    bonus.pulse += dt * 4;
    bonus.anchorX += Math.cos(bonus.pulse * .29) * dt * 5;
    bonus.anchorY += Math.sin(bonus.pulse * .23) * dt * 5;
    bonus.x = clamp(bonus.anchorX + Math.cos(bonus.pulse * bonus.drift) * 26, 28, WIDTH - 28);
    bonus.y = clamp(bonus.anchorY + Math.sin(bonus.pulse * bonus.drift) * 26, 28, HEIGHT - 28);
    if (distance(player, bonus) < player.radius + 20) collectBonus();
    else if (elapsed >= bonus.expiresAt) {
      bonus = null;
      nextBonusAt = elapsed + random(8, 14);
    }
  }

  const direction = moveVector();
  if (direction.moving) {
    movePlayerBy(direction.x * player.speed * dt, direction.y * player.speed * dt);
    player.angle = Math.atan2(direction.y, direction.x);
    pointerTarget = null;
  } else if (pointerTarget) {
    const dx = pointerTarget.x - player.x;
    const dy = pointerTarget.y - player.y;
    const distanceToTarget = Math.hypot(dx, dy);
    if (distanceToTarget < 8) {
      pointerTarget = null;
    } else {
      movePlayerBy((dx / distanceToTarget) * player.speed * dt, (dy / distanceToTarget) * player.speed * dt);
      player.angle = Math.atan2(dy, dx);
    }
  }

  const targetHazards = 2 + wave * 2;
  if (hazards.length < targetHazards && Math.random() < dt * 1.4) spawnHazard();
  hazards.forEach((hazard) => {
    const directAngle = Math.atan2(player.y - hazard.y, player.x - hazard.x);
    const steeringAngle = hazard.type === "flanker" ? directAngle + hazard.side * (.55 + Math.sin(elapsed * 1.4 + hazard.phase) * .18) : directAngle;
    const separation = hazards.reduce((result, other) => {
      if (other === hazard) return result;
      const gap = distance(hazard, other);
      if (gap > 0 && gap < 82) {
        result.x += (hazard.x - other.x) / gap * (1 - gap / 82);
        result.y += (hazard.y - other.y) / gap * (1 - gap / 82);
      }
      return result;
    }, { x: 0, y: 0 });
    const steerX = Math.cos(steeringAngle) + separation.x * 1.9;
    const steerY = Math.sin(steeringAngle) + separation.y * 1.9;
    const steerLength = Math.hypot(steerX, steerY) || 1;
    const burstSpeed = hazard.type === "sprinter" ? hazard.baseSpeed * (1 + Math.max(0, Math.sin(elapsed * 2.4 + hazard.phase)) * .7) : hazard.baseSpeed;
    hazard.speed = burstSpeed;
    hazard.x += steerX / steerLength * hazard.speed * dt;
    hazard.y += steerY / steerLength * hazard.speed * dt;
    hazard.phase += dt * 5;
    if (distance(player, hazard) < player.radius + hazard.radius) {
      if (player.invulnerable <= 0) {
        if (shield) {
          shield = false;
          player.invulnerable = 1.1;
          burst(player.x, player.y, "#55e8ff", 28);
          status.textContent = "Shield absorbed the hit.";
        } else {
          lives -= 1;
          combo = 0;
          score = Math.max(0, score - 25);
          player.invulnerable = 1.2;
          burst(player.x, player.y, "#ff855c", 24);
          status.textContent = lives ? "Glitch impact. Keep moving." : "Signal lost.";
          if (!lives) finishGame();
        }
        hazard.x += Math.cos(directAngle) * -75;
        hazard.y += Math.sin(directAngle) * -75;
        updateHud();
      }
    }
  });

  let collected = 0;
  pickups = pickups.filter((pickup) => {
    pickup.pulse += dt * 4;
    if (distance(player, pickup) < player.radius + 13) {
      combo += 1;
      const value = (50 + Math.min(combo * 10, 100)) * (overdriveUntil > elapsed ? 2 : 1);
      score += value;
      xp += 10;
      burst(pickup.x, pickup.y, "#c6ff3d", 16);
      if (combo % 5 === 0 && hazards.length < 10) {
        spawnHazard();
        status.textContent = `Combo x${combo}: another glitch entered.`;
      } else {
        status.textContent = combo > 4 ? `Combo x${combo}.` : "Signal secured.";
      }
      collected += 1;
      updateHud();
      return false;
    }
    return true;
  });
  for (let i = 0; i < collected; i += 1) spawnPickup();

  particles = particles.filter((particle) => {
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.vx *= .96;
    particle.vy *= .96;
    particle.life -= dt;
    return particle.life > 0;
  });
  updateHud();
  if (timeLeft <= 0) finishGame();
}

function collectBonus() {
  const collected = bonus;
  bonus = null;
  nextBonusAt = elapsed + random(10, 16);
  score += 100;
  xp += 25;
  if (collected.type === "shield") {
    shield = true;
    status.textContent = "Shield ready: blocks one hit.";
    burst(collected.x, collected.y, "#55e8ff", 28);
  } else if (collected.type === "overdrive") {
    overdriveUntil = Math.max(overdriveUntil, elapsed) + 6;
    status.textContent = "Overdrive active: collection score doubled.";
    burst(collected.x, collected.y, "#ff855c", 28);
  } else if (collected.type === "time") {
    runDuration += 8;
    status.textContent = "Time shard collected: +8 seconds.";
    burst(collected.x, collected.y, "#9a7bff", 28);
  } else {
    const before = boosts;
    boosts = Math.min(5, boosts + 1);
    status.textContent = boosts > before ? `Boost charge collected: ${boosts}/5.` : "Boost reserve already full.";
    burst(collected.x, collected.y, "#f7d35b", 28);
  }
  updateHud();
}

function drawGrid() {
  ctx.fillStyle = "#0d1015";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.strokeStyle = "rgba(244,242,234,.055)";
  ctx.lineWidth = 1;
  for (let x = 0; x <= WIDTH; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, HEIGHT); ctx.stroke(); }
  for (let y = 0; y <= HEIGHT; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(WIDTH, y); ctx.stroke(); }
  const glow = ctx.createRadialGradient(WIDTH / 2, HEIGHT / 2, 0, WIDTH / 2, HEIGHT / 2, 390);
  glow.addColorStop(0, "rgba(154,123,255,.12)");
  glow.addColorStop(1, "rgba(154,123,255,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  if (arenaMode === "walls") {
    ctx.strokeStyle = "rgba(198,255,61,.45)";
    ctx.lineWidth = 3;
    ctx.strokeRect(player?.radius || 15, player?.radius || 15, WIDTH - (player?.radius || 15) * 2, HEIGHT - (player?.radius || 15) * 2);
  }
}

function drawPickup(pickup) {
  const pulse = 1 + Math.sin(pickup.pulse) * .12;
  ctx.save();
  ctx.translate(pickup.x, pickup.y);
  ctx.rotate(Math.PI / 4);
  ctx.shadowBlur = 24;
  ctx.shadowColor = "#c6ff3d";
  ctx.fillStyle = "#c6ff3d";
  ctx.fillRect(-10 * pulse, -10 * pulse, 20 * pulse, 20 * pulse);
  ctx.restore();
  ctx.fillStyle = "#0a0b0f";
  ctx.font = "bold 9px Arial";
  ctx.textAlign = "center";
  ctx.fillText("GB", pickup.x, pickup.y + 3);
}

function drawHazard(hazard) {
  const styles = { chaser: { color: "#9a7bff", fill: "rgba(154,123,255,.18)" }, flanker: { color: "#b28cff", fill: "rgba(178,140,255,.18)" }, sprinter: { color: "#7f5be8", fill: "rgba(127,91,232,.2)" } };
  const style = styles[hazard.type];
  ctx.save();
  ctx.translate(hazard.x, hazard.y);
  ctx.rotate(hazard.phase);
  ctx.shadowBlur = 22;
  ctx.shadowColor = style.color;
  ctx.strokeStyle = style.color;
  ctx.fillStyle = style.fill;
  ctx.lineWidth = 3;
  ctx.beginPath();
  if (hazard.type === "flanker") {
    ctx.moveTo(0, -hazard.radius - 3);
    ctx.lineTo(hazard.radius + 3, hazard.radius);
    ctx.lineTo(-hazard.radius - 3, hazard.radius);
  } else if (hazard.type === "sprinter") {
    ctx.moveTo(0, -hazard.radius - 3);
    ctx.lineTo(hazard.radius, -hazard.radius * .35);
    ctx.lineTo(hazard.radius * .75, hazard.radius);
    ctx.lineTo(-hazard.radius * .75, hazard.radius);
    ctx.lineTo(-hazard.radius, -hazard.radius * .35);
  } else {
    ctx.moveTo(0, -hazard.radius);
    ctx.lineTo(hazard.radius, 0);
    ctx.lineTo(0, hazard.radius);
    ctx.lineTo(-hazard.radius, 0);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawBonus() {
  if (!bonus) return;
  const styles = { shield: { color: "#55e8ff", label: "S" }, overdrive: { color: "#ff855c", label: "2X" }, time: { color: "#ff4f68", label: "+8" }, boost: { color: "#ffb347", label: "+B" } };
  const style = styles[bonus.type];
  ctx.save();
  ctx.translate(bonus.x, bonus.y);
  ctx.rotate(-bonus.pulse * .35);
  ctx.shadowBlur = 28;
  ctx.shadowColor = style.color;
  ctx.strokeStyle = style.color;
  ctx.fillStyle = `${style.color}33`;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, -22);
  ctx.lineTo(19, -9);
  ctx.lineTo(19, 9);
  ctx.lineTo(0, 22);
  ctx.lineTo(-19, 9);
  ctx.lineTo(-19, -9);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  ctx.fillStyle = style.color;
  ctx.font = "bold 10px Arial";
  ctx.textAlign = "center";
  ctx.fillText(style.label, bonus.x, bonus.y + 3);
}

function drawPlayer() {
  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.rotate(player.angle + Math.PI / 2);
  ctx.globalAlpha = player.invulnerable > 0 && Math.floor(player.invulnerable * 12) % 2 === 0 ? .42 : 1;
  ctx.shadowBlur = 28;
  ctx.shadowColor = "#c6ff3d";
  ctx.fillStyle = "#c6ff3d";
  ctx.beginPath();
  ctx.moveTo(0, -22);
  ctx.lineTo(16, 17);
  ctx.lineTo(0, 11);
  ctx.lineTo(-16, 17);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#0a0b0f";
  ctx.beginPath();
  ctx.arc(0, 4, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawParticles() {
  particles.forEach((particle) => {
    ctx.globalAlpha = Math.max(0, particle.life / particle.maxLife);
    ctx.fillStyle = particle.color;
    ctx.fillRect(particle.x, particle.y, particle.size, particle.size);
  });
  ctx.globalAlpha = 1;
}

function draw() {
  drawGrid();
  pickups.forEach(drawPickup);
  drawBonus();
  hazards.forEach(drawHazard);
  drawParticles();
  if (player) drawPlayer();
  ctx.fillStyle = "rgba(198,255,61,.7)";
  ctx.font = "10px Arial";
  ctx.textAlign = "left";
  ctx.fillText(`BOOSTS ${boosts}/5`, 18, HEIGHT - 18);
}

function finishGame() {
  if (!running) return;
  running = false;
  const best = localBestScore();
  const newBest = score > best;
  if (newBest) localStorage.setItem(arenaBestKey, String(score));
  lastRun = { score, wave, runSeconds: Math.round(elapsed), submitted: false };
  localStorage.setItem("gankbyte-byte-rush-last-played", new Date().toISOString());
  message.hidden = false;
  message.innerHTML = `<strong>${lives ? "RUN COMPLETE" : "SIGNAL LOST"}</strong><span>${score} points // ${xp} XP // wave ${wave}</span>`;
  startButton.innerHTML = "Run it again  <span>&rarr;</span>";
  arenaSubmit.hidden = false;
  if (arenaResultActions) arenaResultActions.hidden = false;
  if (arenaResultCard) arenaResultCard.hidden = false;
  if (arenaResultCardScore) arenaResultCardScore.textContent = score.toLocaleString();
  if (arenaResultCardDetail) arenaResultCardDetail.textContent = `Wave ${wave} // ${Math.round(elapsed)} seconds`;
  if (arenaResultCardNote) arenaResultCardNote.textContent = newBest ? "New personal best. Share the run." : "Keep moving. Beat your best next run.";
  if (arenaResultRank) arenaResultRank.textContent = arenaUser ? "Submitting run..." : "Sign in to submit and rank this run.";
  if (arenaModeSelect) arenaModeSelect.disabled = false;
  status.textContent = newBest ? `New best score: ${score}.` : `Best score on this device: ${Math.max(best, score)}.`;
  submitLastRun();
}

function startGame() {
  resetGame();
  running = true;
  if (arenaModeSelect) arenaModeSelect.disabled = true;
  message.hidden = true;
  startButton.innerHTML = "Restart run  <span>&rarr;</span>";
  status.textContent = "Collect bytes. Dodge glitches.";
  canvas.focus();
  beginVerifiedRun();
}

function frame(timestamp) {
  const dt = Math.min((timestamp - lastFrame) / 1000 || 0, .05);
  lastFrame = timestamp;
  if (running) update(dt);
  draw();
  requestAnimationFrame(frame);
}

window.addEventListener("keydown", (event) => {
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(event.key)) event.preventDefault();
  if (event.key === " ") { dashQueued = true; return; }
  keys.add(event.key);
});
window.addEventListener("keyup", (event) => keys.delete(event.key));
function setPointerTarget(event) {
  if (!running) return;
  const rect = canvas.getBoundingClientRect();
  pointerTarget = { x: (event.clientX - rect.left) * WIDTH / rect.width, y: (event.clientY - rect.top) * HEIGHT / rect.height };
}
canvas.addEventListener("pointerdown", (event) => { event.preventDefault(); setPointerTarget(event); arenaGestureStart = { x: event.clientX, y: event.clientY, pointerType: event.pointerType }; canvas.setPointerCapture?.(event.pointerId); });
canvas.addEventListener("pointermove", (event) => { if (event.buttons) { event.preventDefault(); setPointerTarget(event); } });
canvas.addEventListener("pointerup", (event) => {
  event.preventDefault();
  if (arenaGestureStart?.pointerType === "touch" && running && player) {
    const dx = event.clientX - arenaGestureStart.x;
    const dy = event.clientY - arenaGestureStart.y;
    if (Math.hypot(dx, dy) > 28) {
      const length = Math.hypot(dx, dy) || 1;
      const targetX = player.x + (dx / length) * 260;
      const targetY = player.y + (dy / length) * 260;
      pointerTarget = arenaMode === "walls"
        ? { x: clamp(targetX, player.radius, WIDTH - player.radius), y: clamp(targetY, player.radius, HEIGHT - player.radius) }
        : { x: wrap(targetX, WIDTH), y: wrap(targetY, HEIGHT) };
    }
  }
  arenaGestureStart = null;
});
canvas.addEventListener("pointercancel", () => { arenaGestureStart = null; pointerTarget = null; });
startButton.addEventListener("click", startGame);
arenaModeSelect?.addEventListener("change", () => {
  arenaMode = arenaModeSelect.value === "walls" ? "walls" : "wrap";
  status.textContent = arenaMode === "walls"
    ? "Solid Walls selected. Boundaries cost one life."
    : "Wrap Around selected. The arena loops at every edge.";
});
arenaLogin.addEventListener("click", async () => {
  if (!arenaClient) return;
  const result = await arenaClient.auth.signInWithOAuth({ provider: "discord", options: { redirectTo: window.location.origin + window.location.pathname } });
  if (result.error) arenaAuthStatus.textContent = result.error.message;
});
arenaLogout.addEventListener("click", async () => {
  if (arenaClient) await arenaClient.auth.signOut();
});
document.querySelectorAll("[data-dir]").forEach((button) => {
  const direction = button.dataset.dir;
  const press = (event) => { event.preventDefault(); if (direction === "dash") dashQueued = true; else touch.add(direction); };
  const release = (event) => { event.preventDefault(); touch.delete(direction); };
  button.addEventListener("pointerdown", press);
  button.addEventListener("pointerup", release);
  button.addEventListener("pointerleave", release);
  button.addEventListener("pointercancel", release);
});

resetGame();
status.textContent = localBestScore() ? `Best score on this device: ${localBestScore()}.` : "No best score yet. Start a run.";
initArenaOnline().catch(() => {
  arenaAuthStatus.textContent = "Online scores are unavailable, but local play is still ready.";
  arenaLogin.disabled = true;
});
  arenaScopeButtons.forEach((button) => {
  button.addEventListener("click", () => {
  arenaScopeButtons.forEach((item) => { item.classList.toggle("is-active", item === button); item.setAttribute("aria-selected", item === button ? "true" : "false"); });
    arenaLeaderboardScope = button.dataset.arenaScope;
    loadArenaLeaderboard(arenaLeaderboardScope);
  });
});
arenaShareResult?.addEventListener("click", async () => {
  if (!lastRun) return;
  const text = `I scored ${lastRun.score.toLocaleString()} in Byte Rush at GankByte.`;
  const url = `${window.location.origin}${window.location.pathname}`;
  try {
    if (navigator.share) await navigator.share({ title: "Byte Rush result", text, url });
    else { await navigator.clipboard.writeText(`${text} ${url}`); status.textContent = "Result copied to clipboard."; }
  } catch (error) { if (error?.name !== "AbortError") status.textContent = "Could not share this result."; }
});
requestAnimationFrame(frame);
