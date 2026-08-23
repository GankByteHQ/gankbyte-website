const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d");
const message = document.querySelector("#message");
const startButton = document.querySelector("#start");
const status = document.querySelector("#status");
const scoreEl = document.querySelector("#score");
const streakEl = document.querySelector("#streak");
const livesEl = document.querySelector("#lives");
const targetEl = document.querySelector("#target");
const perkEl = document.querySelector("#perk");

const symbols = ["\u25c6", "\u25cf", "\u25b2", "\u271a", "\u2726", "\u2b1f"];
const W = canvas.width;
const H = canvas.height;
const bestKey = "gankbyte-symbol-catch-best";
const perks = [
  { name: "BUCKET+", description: "Bucket widened", apply: (game) => { game.catcher.width = Math.min(132, game.catcher.width + 12); } },
  { name: "MAGNET", description: "Catch range increased", apply: (game) => { game.catchRange += 7; } },
  { name: "OVERDRIVE", description: "Collection score boosted", apply: (game) => { game.scoreMultiplier += .1; } }
];
let running = false;
let lastTime = 0;
let elapsed = 0;
let spawnTimer = 0;
let score = 0;
let streak = 0;
let catches = 0;
let lives = 3;
let target = symbols[0];
let currentPerk = "NONE";
let catchRange = 0;
let scoreMultiplier = 1;
let drops = [];
let particles = [];
let catcher = { x: W / 2, width: 108, speed: 690 };
const keys = { left: false, right: false };

function updateHud() { scoreEl.textContent = score; streakEl.textContent = streak; livesEl.textContent = lives; targetEl.textContent = target; perkEl.textContent = currentPerk; }
function randomTarget() { target = symbols[Math.floor(Math.random() * symbols.length)]; }
function bestScore() { return Number(localStorage.getItem(bestKey) || 0); }
function reset() { elapsed = 0; spawnTimer = .2; score = 0; streak = 0; catches = 0; lives = 3; catchRange = 0; scoreMultiplier = 1; currentPerk = "NONE"; drops = []; particles = []; catcher = { x: W / 2, width: 108, speed: 690 }; randomTarget(); updateHud(); }
function spawn() { drops.push({ x: 36 + Math.random() * (W - 72), y: -30, size: 24 + Math.random() * 8, speed: (105 + elapsed * 2.8 + Math.random() * 50) * 1.15, symbol: symbols[Math.floor(Math.random() * symbols.length)] }); }
function burst(x, y, color) { for (let i = 0; i < 12; i++) particles.push({ x, y, dx: (Math.random() - .5) * 180, dy: (Math.random() - .7) * 180, life: .45, color }); }
function awardPerk() { const perk = perks[Math.floor(Math.random() * perks.length)]; perk.apply({ catcher, get catchRange() { return catchRange; }, set catchRange(value) { catchRange = value; }, get scoreMultiplier() { return scoreMultiplier; }, set scoreMultiplier(value) { scoreMultiplier = value; } }); currentPerk = perk.name; status.textContent = `${perk.name}: ${perk.description}.`; burst(catcher.x, H - 55, "#c6ff3d"); updateHud(); }
function finish(text) { running = false; const best = bestScore(); if (score > best) localStorage.setItem(bestKey, String(score)); message.innerHTML = `<strong>${text}</strong><span>${score} points // ${streak} final streak // ${currentPerk} active</span>`; message.hidden = false; startButton.textContent = "Run it again \u2192"; status.textContent = score > best ? `New best score: ${score}.` : `Best score on this device: ${Math.max(score, best)}.`; }
function catchDrop(drop) { const correct = drop.symbol === target; if (correct) { streak++; catches++; score += Math.round((10 + Math.min(50, streak * 2)) * scoreMultiplier); burst(drop.x, H - 54, "#c6ff3d"); if (catches % 8 === 0) awardPerk(); if (streak % 5 === 0) randomTarget(); } else { streak = 0; score = Math.max(0, score - 5); burst(drop.x, H - 54, "#c6ff3d"); } updateHud(); }
function update(dt) {
  elapsed += dt;
  if (keys.left) catcher.x -= catcher.speed * dt;
  if (keys.right) catcher.x += catcher.speed * dt;
  catcher.x = Math.max(catcher.width / 2 + 10, Math.min(W - catcher.width / 2 - 10, catcher.x));
  spawnTimer -= dt;
  if (spawnTimer <= 0) { spawn(); spawnTimer = Math.max(.25, .72 - elapsed / 100); }
  for (let i = drops.length - 1; i >= 0; i--) { const drop = drops[i]; drop.y += drop.speed * dt; if (drop.y > H - 78 && drop.y < H - 30 && Math.abs(drop.x - catcher.x) < catcher.width / 2 + drop.size / 2 + catchRange) { catchDrop(drop); drops.splice(i, 1); } else if (drop.y > H + 30) { if (drop.symbol === target) { lives--; streak = 0; updateHud(); burst(drop.x, H - 45, "#c6ff3d"); if (lives <= 0) finish("SIGNAL LOST"); } drops.splice(i, 1); } }
  particles = particles.filter((p) => { p.x += p.dx * dt; p.y += p.dy * dt; p.life -= dt; return p.life > 0; });
}
function draw() { ctx.clearRect(0, 0, W, H); ctx.save(); ctx.globalAlpha = .08; ctx.fillStyle = "#c6ff3d"; ctx.fillRect(0, H - 38, W, 1); ctx.restore();
  drops.forEach((d) => { ctx.save(); ctx.translate(d.x, d.y); ctx.shadowBlur = 22; ctx.shadowColor = "#c6ff3d"; ctx.fillStyle = "#c6ff3d"; ctx.font = `800 ${d.size}px Arial`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(d.symbol, 0, 0); ctx.restore(); });
  particles.forEach((p) => { ctx.globalAlpha = Math.max(0, p.life * 2); ctx.fillStyle = p.color; ctx.fillRect(p.x, p.y, 3, 3); }); ctx.globalAlpha = 1;
  const x = catcher.x; const y = H - 48; const w = catcher.width; ctx.save(); ctx.shadowBlur = 18; ctx.shadowColor = "#c6ff3d"; ctx.fillStyle = "#c6ff3d"; ctx.beginPath(); ctx.moveTo(x - w / 2, y); ctx.lineTo(x + w / 2, y); ctx.lineTo(x + w / 2 - 12, y + 19); ctx.lineTo(x - w / 2 + 12, y + 19); ctx.closePath(); ctx.fill(); ctx.restore(); ctx.fillStyle = "#090a0e"; ctx.font = "700 9px Arial"; ctx.textAlign = "center"; ctx.fillText("CATCH", x, y + 13); }
function frame(now) { const dt = Math.min(.05, (now - lastTime) / 1000 || 0); lastTime = now; if (running) update(dt); draw(); requestAnimationFrame(frame); }
function start() { reset(); running = true; message.hidden = true; startButton.textContent = "Restart challenge \u2192"; status.textContent = "Catch the glowing target symbol. Perks unlock every 8 correct catches."; canvas.focus(); }
function setPointer(event) { const rect = canvas.getBoundingClientRect(); catcher.x = ((event.clientX - rect.left) / rect.width) * W; }
document.addEventListener("keydown", (event) => { if (["ArrowLeft", "a", "A"].includes(event.key)) { keys.left = true; event.preventDefault(); } if (["ArrowRight", "d", "D"].includes(event.key)) { keys.right = true; event.preventDefault(); } });
document.addEventListener("keyup", (event) => { if (["ArrowLeft", "a", "A"].includes(event.key)) keys.left = false; if (["ArrowRight", "d", "D"].includes(event.key)) keys.right = false; });
canvas.addEventListener("pointermove", (event) => { if (event.buttons) setPointer(event); }); canvas.addEventListener("pointerdown", setPointer); startButton.addEventListener("click", start);
document.querySelectorAll("[data-move]").forEach((button) => { const side = button.dataset.move; button.addEventListener("pointerdown", () => keys[side] = true); button.addEventListener("pointerup", () => keys[side] = false); button.addEventListener("pointerleave", () => keys[side] = false); });
reset(); status.textContent = bestScore() ? `Best score on this device: ${bestScore()}.` : "No best score yet. Start a challenge."; requestAnimationFrame(frame);
