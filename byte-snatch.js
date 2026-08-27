/* Byte Snatch: a separate risk/reward game. The Arena page shell is shared;
   the game loop, scoring, hazards, bank terminal and powerups are not. */
const canvas = document.querySelector("#snatch-canvas");
const ctx = canvas.getContext("2d");
const $ = (id) => document.getElementById(id);
const startButton = $("start-button");
const bankButton = $("bank-button");
const message = $("arena-message");
const status = $("game-status");
const scoreValue = $("score");
const riskValue = $("risk");
const timeValue = $("time");
const comboValue = $("combo");
const livesValue = $("lives");
const xpValue = $("xp");
const powerValue = $("power-status");
const authStatus = $("arena-auth-status");
const loginButton = $("arena-login");
const logoutButton = $("arena-logout");
const submitButton = $("arena-submit");
const resultActions = $("arena-result-actions");
const resultRank = $("arena-result-rank");
const resultCard = $("arena-result-card");
const resultScore = $("arena-result-card-score");
const resultDetail = $("arena-result-card-detail");
const resultNote = $("arena-result-card-note");
const leaderboardBody = $("arena-leaderboard-body");
const shareButton = $("arena-share-result");
const config = window.GANKBYTE_XP_CONFIG || {};
const bestKey = "gankbyte-byte-snatch-best";
const lastPlayedKey = "gankbyte-byte-snatch-last-played";
const WIDTH = canvas.width;
const HEIGHT = canvas.height;
const BANK = { x: WIDTH / 2, y: HEIGHT / 2, radius: 40 };
const keys = new Set();
const touch = new Set();
const coarse = window.matchMedia?.("(pointer: coarse)").matches || false;
let player, bytes, gankers, powerups, particles, pointerTarget;
let running = false, lastFrame = 0, elapsed = 0, timeLeft = 60;
let banked = 0, risk = 0, multiplier = 1, lives = 3, xp = 0, maxMultiplier = 1, bankStreak = 0;
let gankModeUntil = 0, shieldUntil = 0, freezeUntil = 0, ghostUntil = 0;
let lastRun = null, client = null, user = null;

const random = (min, max) => Math.random() * (max - min) + min;
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const wrap = (v, size) => (v + size) % size;
const escapeHtml = (v) => String(v || "").replace(/[&<>'"]/g, (c) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "'":"&#39;", '"':"&quot;" }[c]));

function updateHud() {
  scoreValue.textContent = Math.round(banked).toLocaleString();
  riskValue.textContent = Math.round(risk).toLocaleString();
  timeValue.textContent = Math.ceil(timeLeft);
  comboValue.textContent = `x${multiplier}`;
  livesValue.textContent = lives;
  xpValue.textContent = xp;
  powerValue.textContent = gankModeUntil > elapsed ? "GANK MODE" : shieldUntil > elapsed ? "SHIELD" : freezeUntil > elapsed ? "FREEZE" : ghostUntil > elapsed ? "GHOST" : "NONE";
  const close = atBank();
  bankButton.disabled = !running || !risk || !close;
  bankButton.textContent = close ? "Bank score  //  SPACE" : "Return to bank terminal";
}
function atBank() { return Boolean(player && distance(player, BANK) < BANK.radius + player.radius + 12); }
function localBest() { return Number(localStorage.getItem(bestKey) || 0); }
function burst(x, y, color, amount = 18) { for (let i = 0; i < amount; i += 1) { const a = random(0, Math.PI * 2), s = random(30, 160); particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: random(.3, .8), color, size: random(2, 5) }); } }
function spawnByte() { const value = Math.random() < .08 ? 2500 : Math.random() < .22 ? 500 : 100; bytes.push({ x: random(30, WIDTH - 30), y: random(30, HEIGHT - 30), value, pulse: random(0, 7), angle: random(0, 7) }); }
function spawnGanker() { const edge = Math.floor(random(0, 4)); const p = edge === 0 ? { x: random(0, WIDTH), y: -28 } : edge === 1 ? { x: WIDTH + 28, y: random(0, HEIGHT) } : edge === 2 ? { x: random(0, WIDTH), y: HEIGHT + 28 } : { x: -28, y: random(0, HEIGHT) }; gankers.push({ ...p, radius: random(14, 21), speed: random(35, 58) + elapsed * .7, phase: random(0, 8), kind: Math.random() < .3 ? "hunter" : "drifter" }); }
function spawnPowerup() { const types = ["magnet", "shield", "freeze", "double", "ghost", "time", "emp"]; powerups.push({ x: random(40, WIDTH - 40), y: random(40, HEIGHT - 40), type: types[Math.floor(random(0, types.length))], pulse: 0, expires: elapsed + 12 }); }
function reset() {
  running = false; elapsed = 0; timeLeft = 60; banked = 0; risk = 0; multiplier = 1; maxMultiplier = 1; bankStreak = 0; lives = 3; xp = 0; gankModeUntil = 0; shieldUntil = 0; freezeUntil = 0; ghostUntil = 0; pointerTarget = null;
  player = { x: WIDTH / 2, y: HEIGHT - 80, radius: 16, speed: coarse ? 225 : 270, angle: -Math.PI / 2, invulnerable: 0 };
  bytes = []; gankers = []; powerups = []; particles = [];
  for (let i = 0; i < 12; i += 1) spawnByte();
  for (let i = 0; i < 3; i += 1) spawnGanker();
  resultActions.hidden = true; submitButton.hidden = true; resultCard.hidden = true; updateHud();
}
function vector() { let x = 0, y = 0; if (keys.has("ArrowLeft") || keys.has("a") || touch.has("left")) x -= 1; if (keys.has("ArrowRight") || keys.has("d") || touch.has("right")) x += 1; if (keys.has("ArrowUp") || keys.has("w") || touch.has("up")) y -= 1; if (keys.has("ArrowDown") || keys.has("s") || touch.has("down")) y += 1; const n = Math.hypot(x, y) || 1; return { x: x / n, y: y / n, moving: x !== 0 || y !== 0 }; }
function move(dx, dy) { player.x = clamp(player.x + dx, player.radius, WIDTH - player.radius); player.y = clamp(player.y + dy, player.radius, HEIGHT - player.radius); }
function bankScore() {
  if (!running || !risk || distance(player, BANK) > BANK.radius + player.radius + 12) { if (running && risk) status.textContent = "Return to the bank terminal before banking."; return; }
  const payout = Math.round(risk * (gankModeUntil > elapsed ? 2 : 1)); const safeBonus = risk >= 1000 ? Math.round(risk * .1) : 0; banked += payout + safeBonus; risk = 0; bankStreak += 1; multiplier = Math.min(10, multiplier + 1); maxMultiplier = Math.max(maxMultiplier, multiplier); xp += 20 + Math.min(30, bankStreak * 2); localStorage.setItem("gankbyte-achievement-byte-snatch", "earned"); status.textContent = `${gankModeUntil > elapsed ? "GANK MODE payout secured" : "Score banked"}. +${safeBonus.toLocaleString()} safe bonus // bank streak ${bankStreak}.`; burst(BANK.x, BANK.y, "#c6ff3d", 30); updateHud();
}
function hitPlayer() {
  if (player.invulnerable > 0 || ghostUntil > elapsed) return;
  if (shieldUntil > elapsed) { shieldUntil = 0; player.invulnerable = 1; status.textContent = "Shield absorbed the gank."; burst(player.x, player.y, "#55e8ff", 28); return; }
  lives -= 1; risk = 0; multiplier = 1; player.invulnerable = 1.2; status.textContent = lives ? "GANKED. Unbanked Bytes were lost." : "No lives left."; burst(player.x, player.y, "#ff4f68", 30); if (!lives) finish();
}
function collectByte(item) {
  const value = item.value * multiplier * (gankModeUntil > elapsed ? 2 : 1); risk += value; xp += Math.max(2, Math.round(item.value / 100)); multiplier = Math.min(10, multiplier + (item.value >= 500 ? 2 : 1)); maxMultiplier = Math.max(maxMultiplier, multiplier); if (item.value >= 2500) { status.textContent = "ULTRA BYTE. The gankers are converging."; spawnGanker(); } else if (multiplier >= 10 && !gankModeUntil) { gankModeUntil = elapsed + 5; status.textContent = "GANK MODE. Double payout, more danger."; for (let i = 0; i < 3; i += 1) spawnGanker(); } else status.textContent = `${item.value.toLocaleString()} Byte grabbed. Get back to the terminal.`; burst(item.x, item.y, item.value >= 2500 ? "#f7d35b" : "#c6ff3d", 20);
}
function collectPowerup(item) { powerups = powerups.filter((p) => p !== item); if (item.type === "magnet") { bytes.forEach((b) => { b.x = player.x + random(-35, 35); b.y = player.y + random(-35, 35); }); status.textContent = "Magnet pulled nearby Bytes in."; } if (item.type === "shield") { shieldUntil = elapsed + 9; status.textContent = "Shield active for nine seconds."; } if (item.type === "freeze") { freezeUntil = elapsed + 5; status.textContent = "Gankers frozen for five seconds."; } if (item.type === "double") { gankModeUntil = Math.max(gankModeUntil, elapsed) + 6; status.textContent = "Score boost active."; } if (item.type === "ghost") { ghostUntil = elapsed + 6; status.textContent = "Ghost mode: pass through danger."; } if (item.type === "time") { timeLeft = Math.min(75, timeLeft + 5); status.textContent = "Time bonus: five seconds added."; } if (item.type === "emp") { const removeCount = Math.min(3, gankers.length); gankers.splice(0, removeCount); status.textContent = removeCount ? `EMP cleared ${removeCount} Ganker${removeCount === 1 ? "" : "s"}.` : "EMP discharged. No Gankers were in range."; burst(item.x, item.y, "#55e8ff", 42); } burst(item.x, item.y, "#55e8ff", 28); }
function update(dt) {
  elapsed += dt; timeLeft = Math.max(0, 60 - elapsed + (timeLeft > 60 ? timeLeft - 60 : 0)); player.invulnerable = Math.max(0, player.invulnerable - dt);
  const v = vector(); if (v.moving) { move(v.x * player.speed * dt, v.y * player.speed * dt); player.angle = Math.atan2(v.y, v.x); } else if (pointerTarget) { const dx = pointerTarget.x - player.x, dy = pointerTarget.y - player.y, n = Math.hypot(dx, dy); if (n < 8) pointerTarget = null; else { move(dx / n * player.speed * dt, dy / n * player.speed * dt); player.angle = Math.atan2(dy, dx); } }
  const targetGankers = 3 + Math.floor(elapsed / 7) + (risk >= 3000 ? 1 : 0) + (gankModeUntil > elapsed ? 2 : 0);
  if (gankers.length < targetGankers && Math.random() < dt * 1.25) spawnGanker(); if (powerups.length < 1 && Math.random() < dt * .07) spawnPowerup();
  const frozen = freezeUntil > elapsed;
  gankers.forEach((ganker) => { if (frozen) return; const direct = Math.atan2(player.y - ganker.y, player.x - ganker.x); const separation = gankers.reduce((push, other) => { if (other === ganker) return push; const gap = distance(ganker, other); if (gap > 0 && gap < 105) { push.x += (ganker.x - other.x) / gap * (1 - gap / 105); push.y += (ganker.y - other.y) / gap * (1 - gap / 105); } return push; }, { x: 0, y: 0 }); const steeringX = Math.cos(direct) + separation.x * 2; const steeringY = Math.sin(direct) + separation.y * 2; const length = Math.hypot(steeringX, steeringY) || 1; const angle = ganker.kind === "drifter" ? Math.atan2(steeringY, steeringX) + Math.sin(elapsed * 1.7 + ganker.phase) * .35 : Math.atan2(steeringY, steeringX); ganker.x += Math.cos(angle) * ganker.speed * dt; ganker.y += Math.sin(angle) * ganker.speed * dt; ganker.phase += dt; if (distance(player, ganker) < player.radius + ganker.radius) hitPlayer(); });
  bytes = bytes.filter((item) => { item.pulse += dt * 4; item.angle += dt; if (distance(player, item) < player.radius + 15) { collectByte(item); return false; } return true; }); while (bytes.length < 12) spawnByte();
  powerups = powerups.filter((item) => { item.pulse += dt * 5; if (distance(player, item) < player.radius + 18) { collectPowerup(item); return false; } return elapsed < item.expires; });
  particles = particles.filter((p) => { p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= .96; p.vy *= .96; p.life -= dt; return p.life > 0; }); updateHud(); if (timeLeft <= 0) finish();
}
function finish() { if (!running) return; running = false; banked += Math.round(risk); risk = 0; const total = Math.round(banked); const best = localBest(); const newBest = total > best; if (newBest) localStorage.setItem(bestKey, String(total)); localStorage.setItem(lastPlayedKey, new Date().toISOString()); lastRun = { score: total, multiplier: maxMultiplier, runSeconds: Math.round(elapsed), submitted: false }; message.hidden = false; message.innerHTML = `<strong>RUN COMPLETE</strong><span>${total.toLocaleString()} banked // x${maxMultiplier} max multiplier</span>`; startButton.innerHTML = "Run it again  <span>&rarr;</span>"; submitButton.hidden = false; resultActions.hidden = false; resultCard.hidden = false; resultScore.textContent = total.toLocaleString(); resultDetail.textContent = `x${maxMultiplier} multiplier // ${Math.round(elapsed)} seconds`; resultNote.textContent = newBest ? "New personal best. Share the run." : "Keep moving. Beat your best next run."; resultRank.textContent = user ? "Submitting run..." : "Sign in to submit and rank this run."; status.textContent = newBest ? `New best score: ${total}.` : `Best score on this device: ${Math.max(best, total)}.`; submitScore(); }
function start() { reset(); running = true; message.hidden = true; startButton.innerHTML = "Restart run  <span>&rarr;</span>"; status.textContent = "Collect. Bank. Survive."; canvas.focus(); }
function draw() {
  ctx.fillStyle = "#0b0e13"; ctx.fillRect(0, 0, WIDTH, HEIGHT); ctx.strokeStyle = "rgba(244,242,234,.06)"; for (let x = 0; x <= WIDTH; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, HEIGHT); ctx.stroke(); } for (let y = 0; y <= HEIGHT; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(WIDTH, y); ctx.stroke(); }
  ctx.save(); ctx.translate(BANK.x, BANK.y); ctx.rotate(elapsed * .5); ctx.strokeStyle = atBank() ? "#ffffff" : "#c6ff3d"; ctx.shadowBlur = atBank() ? 42 : 30; ctx.shadowColor = "#c6ff3d"; ctx.lineWidth = atBank() ? 5 : 3; ctx.beginPath(); ctx.arc(0, 0, BANK.radius, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.arc(0, 0, BANK.radius - 12, 0, Math.PI * 2); ctx.stroke(); ctx.restore(); ctx.fillStyle = "#c6ff3d"; ctx.font = "bold 11px Arial"; ctx.textAlign = "center"; ctx.fillText(atBank() && risk ? "SPACE / BANK" : "BANK TERMINAL", BANK.x, BANK.y + 4);
  bytes.forEach((item) => { const p = 1 + Math.sin(item.pulse) * .12, color = item.value >= 2500 ? "#f7d35b" : item.value >= 500 ? "#ffb347" : "#c6ff3d"; ctx.save(); ctx.translate(item.x, item.y); ctx.scale(p, p); ctx.shadowBlur = 22; ctx.shadowColor = color; ctx.fillStyle = color; ctx.beginPath(); ctx.arc(0, 0, item.value >= 2500 ? 14 : 10, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "#0a0b0f"; ctx.font = "bold 8px Arial"; ctx.fillText(item.value >= 2500 ? "U" : item.value >= 500 ? "M" : "B", 0, 3); ctx.restore(); });
  gankers.forEach((g) => { ctx.save(); ctx.translate(g.x, g.y); ctx.rotate(g.phase); ctx.shadowBlur = 24; ctx.shadowColor = g.kind === "hunter" ? "#ff4f68" : "#9a7bff"; ctx.strokeStyle = g.kind === "hunter" ? "#ff4f68" : "#9a7bff"; ctx.fillStyle = "rgba(154,123,255,.16)"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, -g.radius); ctx.lineTo(g.radius, 0); ctx.lineTo(0, g.radius); ctx.lineTo(-g.radius, 0); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore(); });
  powerups.forEach((p) => { const labels = { magnet: "M", shield: "S", freeze: "F", double: "2X", ghost: "G", time: "+5", emp: "EMP" }; ctx.fillStyle = p.type === "emp" ? "#ff4f68" : "#55e8ff"; ctx.shadowBlur = 20; ctx.shadowColor = ctx.fillStyle; ctx.beginPath(); ctx.rect(p.x - 13, p.y - 13, 26, 26); ctx.fill(); ctx.shadowBlur = 0; ctx.fillStyle = "#0a0b0f"; ctx.font = "bold 8px Arial"; ctx.fillText(labels[p.type], p.x, p.y + 3); });
  particles.forEach((p) => { ctx.globalAlpha = Math.max(0, p.life / .8); ctx.fillStyle = p.color; ctx.fillRect(p.x, p.y, p.size, p.size); }); ctx.globalAlpha = 1;
  if (player) { ctx.save(); ctx.translate(player.x, player.y); ctx.rotate(player.angle + Math.PI / 2); ctx.globalAlpha = player.invulnerable > 0 && Math.floor(player.invulnerable * 12) % 2 === 0 ? .4 : 1; ctx.shadowBlur = 28; ctx.shadowColor = "#c6ff3d"; ctx.fillStyle = "#c6ff3d"; ctx.beginPath(); ctx.moveTo(0, -23); ctx.lineTo(18, 17); ctx.lineTo(0, 10); ctx.lineTo(-18, 17); ctx.closePath(); ctx.fill(); ctx.restore(); } ctx.globalAlpha = 1; ctx.fillStyle = "rgba(198,255,61,.75)"; ctx.font = "10px Arial"; ctx.textAlign = "left"; ctx.fillText(`BANKED ${Math.round(banked).toLocaleString()} // RISK ${Math.round(risk).toLocaleString()}`, 18, HEIGHT - 18);
}
function frame(ts) { const dt = Math.min((ts - lastFrame) / 1000 || 0, .05); lastFrame = ts; if (running) update(dt); draw(); requestAnimationFrame(frame); }
async function loadLeaderboard() { if (!client) { leaderboardBody.innerHTML = '<tr><td colspan="4">Global scores need the XP backend connection.</td></tr>'; return; } const result = await client.from("byte_snatch_leaderboard").select("display_name,best_score,best_multiplier").order("best_score", { ascending: false }).limit(500); if (result.error) { leaderboardBody.innerHTML = '<tr><td colspan="4">Run the Byte Snatch migration to enable scores.</td></tr>'; return; } leaderboardBody.innerHTML = result.data?.length ? result.data.map((row, i) => `<tr><td>${i + 1}</td><td>${escapeHtml(row.display_name || "GankByte Player")}</td><td>${Number(row.best_score || 0).toLocaleString()}</td><td>x${Number(row.best_multiplier || 1)}</td></tr>`).join("") : '<tr><td colspan="4">No scores yet. Be the first to bank a run.</td></tr>'; }
async function submitScore() { if (!client || !user || !lastRun || lastRun.submitted) return; const result = await client.from("byte_snatch_scores").insert({ user_id: user.id, score: lastRun.score, best_multiplier: lastRun.multiplier, run_seconds: lastRun.runSeconds, xp_earned: Math.min(250, Math.max(0, Math.round(lastRun.score / 100))), status: "approved" }); if (result.error) { authStatus.textContent = "Score could not be submitted. Run the migration or try again signed in."; return; } lastRun.submitted = true; authStatus.textContent = "Score posted and XP recorded."; await loadLeaderboard(); }
async function loadSession(session) { user = session?.user || null; if (!user) { authStatus.textContent = "Sign in with Discord to submit scores."; loginButton.hidden = false; logoutButton.hidden = true; return; } const name = user.user_metadata?.global_name || user.user_metadata?.full_name || "Discord player"; authStatus.textContent = `Signed in as ${name}. Scores post automatically.`; loginButton.hidden = true; logoutButton.hidden = false; await submitScore(); }
async function initOnline() { if (!config.supabaseUrl || !config.supabasePublishableKey || !window.supabase) { loginButton.disabled = true; return; } client = window.supabase.createClient(config.supabaseUrl, config.supabasePublishableKey); client.auth.onAuthStateChange((event, session) => window.setTimeout(() => loadSession(session), 0)); const result = await client.auth.getSession(); await loadSession(result.data.session); await loadLeaderboard(); }
function setPointer(event) { if (!running) return; const rect = canvas.getBoundingClientRect(); pointerTarget = { x: (event.clientX - rect.left) * WIDTH / rect.width, y: (event.clientY - rect.top) * HEIGHT / rect.height }; }
window.addEventListener("keydown", (event) => { if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(event.key)) event.preventDefault(); if (!event.repeat && (event.code === "Space" || event.key.toLowerCase() === "b")) { bankScore(); return; } keys.add(event.key); }); window.addEventListener("keyup", (event) => keys.delete(event.key));
canvas.addEventListener("pointerdown", (event) => { event.preventDefault(); setPointer(event); canvas.setPointerCapture?.(event.pointerId); }); canvas.addEventListener("pointermove", (event) => { if (event.buttons) { event.preventDefault(); setPointer(event); } });
startButton.addEventListener("click", start); bankButton.addEventListener("click", bankScore); loginButton.addEventListener("click", async () => { if (client) await client.auth.signInWithOAuth({ provider: "discord", options: { redirectTo: window.location.origin + window.location.pathname } }); }); logoutButton.addEventListener("click", async () => { if (client) await client.auth.signOut(); });
shareButton?.addEventListener("click", async () => { if (!lastRun) return; const text = `I banked ${lastRun.score.toLocaleString()} in Byte Snatch at GankByte.`; try { if (navigator.share) await navigator.share({ title: "Byte Snatch result", text, url: window.location.href }); else { await navigator.clipboard.writeText(`${text} ${window.location.href}`); status.textContent = "Result copied to clipboard."; } } catch (error) { if (error?.name !== "AbortError") status.textContent = "Could not share this result."; } });
document.querySelectorAll("[data-dir]").forEach((button) => { const dir = button.dataset.dir; const press = (event) => { event.preventDefault(); if (dir === "bank") bankScore(); else touch.add(dir); }; const release = (event) => { event.preventDefault(); touch.delete(dir); }; button.addEventListener("pointerdown", press); button.addEventListener("pointerup", release); button.addEventListener("pointerleave", release); button.addEventListener("pointercancel", release); });
reset(); status.textContent = localBest() ? `Best score on this device: ${localBest()}.` : "No best score yet. Start a run."; initOnline().catch(() => { authStatus.textContent = "Online scores are unavailable, but local play is still ready."; }); requestAnimationFrame(frame);
