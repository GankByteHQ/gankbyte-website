const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d");
const board = document.querySelector("#board");
const message = document.querySelector("#message");
const startButton = document.querySelector("#start");
const status = document.querySelector("#status");
const scoreEl = document.querySelector("#score");
const streakEl = document.querySelector("#streak");
const timeEl = document.querySelector("#time");
const livesEl = document.querySelector("#lives");
const targetEl = document.querySelector("#target");

const symbols = ["◆", "●", "▲", "✚", "✦", "⬟"];
const W = canvas.width;
const H = canvas.height;
const bestKey = "gankbyte-symbol-catch-best";
let running = false;
let lastTime = 0;
let elapsed = 0;
let spawnTimer = 0;
let score = 0;
let streak = 0;
let lives = 3;
let target = symbols[0];
let drops = [];
let particles = [];
let catcher = { x: W / 2, width: 150, speed: 600 };
const keys = { left: false, right: false };

function updateHud() { scoreEl.textContent = score; streakEl.textContent = streak; timeEl.textContent = Math.ceil(Math.max(0, 45 - elapsed)); livesEl.textContent = lives; targetEl.textContent = target; }
function randomTarget() { target = symbols[Math.floor(Math.random() * symbols.length)]; }
function bestScore() { return Number(localStorage.getItem(bestKey) || 0); }
function reset() { elapsed = 0; spawnTimer = .2; score = 0; streak = 0; lives = 3; drops = []; particles = []; catcher.x = W / 2; randomTarget(); updateHud(); }
function spawn() { drops.push({ x: 36 + Math.random() * (W - 72), y: -30, size: 24 + Math.random() * 8, speed: 105 + elapsed * 2.8 + Math.random() * 50, symbol: symbols[Math.floor(Math.random() * symbols.length)], hue: Math.random() > .5 ? "#9a7bff" : "#ff855c" }); }
function burst(x, y, color) { for (let i = 0; i < 12; i++) particles.push({ x, y, dx: (Math.random() - .5) * 180, dy: (Math.random() - .7) * 180, life: .45, color }); }
function finish(text) { running = false; const best = bestScore(); if (score > best) localStorage.setItem(bestKey, String(score)); message.innerHTML = `<strong>${text}</strong><span>${score} points // ${streak} final streak</span>`; message.hidden = false; startButton.textContent = "Run it again →"; status.textContent = score > best ? `New best score: ${score}.` : `Best score on this device: ${Math.max(score, best)}.`; }
function catchDrop(drop) { const correct = drop.symbol === target; if (correct) { streak++; score += 10 + Math.min(50, streak * 2); burst(drop.x, H - 54, "#c6ff3d"); if (streak % 5 === 0) randomTarget(); } else { streak = 0; score = Math.max(0, score - 5); burst(drop.x, H - 54, "#ff855c"); } updateHud(); }
function update(dt) {
  elapsed += dt;
  if (keys.left) catcher.x -= catcher.speed * dt;
  if (keys.right) catcher.x += catcher.speed * dt;
  catcher.x = Math.max(catcher.width / 2 + 10, Math.min(W - catcher.width / 2 - 10, catcher.x));
  spawnTimer -= dt;
  if (spawnTimer <= 0) { spawn(); spawnTimer = Math.max(.25, .72 - elapsed / 100); }
  for (let i = drops.length - 1; i >= 0; i--) { const drop = drops[i]; drop.y += drop.speed * dt; if (drop.y > H - 78 && drop.y < H - 30 && Math.abs(drop.x - catcher.x) < catcher.width / 2 + drop.size / 2) { catchDrop(drop); drops.splice(i, 1); } else if (drop.y > H + 30) { if (drop.symbol === target) { lives--; streak = 0; updateHud(); burst(drop.x, H - 45, "#ff855c"); if (lives <= 0) finish("SIGNAL LOST"); } drops.splice(i, 1); } }
  particles = particles.filter((p) => { p.x += p.dx * dt; p.y += p.dy * dt; p.life -= dt; return p.life > 0; });
  if (elapsed >= 45 && running) finish("RUN COMPLETE");
}
function draw() { ctx.clearRect(0, 0, W, H); ctx.save(); ctx.globalAlpha = .08; ctx.fillStyle = "#c6ff3d"; ctx.fillRect(0, H - 38, W, 1); ctx.restore();
  drops.forEach((d) => { ctx.save(); ctx.translate(d.x, d.y); ctx.shadowBlur = 22; ctx.shadowColor = d.symbol === target ? "#c6ff3d" : d.hue; ctx.fillStyle = d.symbol === target ? "#c6ff3d" : d.hue; ctx.font = `800 ${d.size}px Arial`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(d.symbol, 0, 0); ctx.restore(); });
  particles.forEach((p) => { ctx.globalAlpha = Math.max(0, p.life * 2); ctx.fillStyle = p.color; ctx.fillRect(p.x, p.y, 3, 3); }); ctx.globalAlpha = 1;
  ctx.fillStyle = "#c6ff3d"; ctx.shadowBlur = 16; ctx.shadowColor = "#c6ff3d"; ctx.fillRect(catcher.x - catcher.width / 2, H - 47, catcher.width, 6); ctx.shadowBlur = 0; ctx.fillStyle = "#f4f2ea"; ctx.font = "700 10px Arial"; ctx.textAlign = "center"; ctx.fillText("COLLECTOR", catcher.x, H - 25); }
function frame(now) { const dt = Math.min(.05, (now - lastTime) / 1000 || 0); lastTime = now; if (running) update(dt); draw(); requestAnimationFrame(frame); }
function start() { reset(); running = true; message.hidden = true; startButton.textContent = "Restart challenge →"; status.textContent = "Catch the glowing target symbol."; canvas.focus(); }
function setPointer(event) { const rect = canvas.getBoundingClientRect(); catcher.x = ((event.clientX - rect.left) / rect.width) * W; }
document.addEventListener("keydown", (event) => { if (["ArrowLeft", "a", "A"].includes(event.key)) { keys.left = true; event.preventDefault(); } if (["ArrowRight", "d", "D"].includes(event.key)) { keys.right = true; event.preventDefault(); } });
document.addEventListener("keyup", (event) => { if (["ArrowLeft", "a", "A"].includes(event.key)) keys.left = false; if (["ArrowRight", "d", "D"].includes(event.key)) keys.right = false; });
canvas.addEventListener("pointermove", (event) => { if (event.buttons) setPointer(event); }); canvas.addEventListener("pointerdown", setPointer); startButton.addEventListener("click", start);
document.querySelectorAll("[data-move]").forEach((button) => { const side = button.dataset.move; button.addEventListener("pointerdown", () => keys[side] = true); button.addEventListener("pointerup", () => keys[side] = false); button.addEventListener("pointerleave", () => keys[side] = false); });
reset(); status.textContent = bestScore() ? `Best score on this device: ${bestScore()}.` : "No best score yet. Start a challenge."; requestAnimationFrame(frame);
