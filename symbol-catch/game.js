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
const modeButtons = document.querySelectorAll("[data-mode]");
const targetAlert = document.querySelector("#target-alert");
const targetAlertSymbol = document.querySelector("#target-alert-symbol");

const symbols = ["\u25c6", "\u25cf", "\u25b2", "\u271a", "\u2726", "\u2b1f"];
const symbolColors = ["#c6ff3d", "#55e8ff", "#ff855c", "#9a7bff", "#ffd166", "#ff6bb5"];
const W = canvas.width;
const H = canvas.height;
const bestKey = "gankbyte-symbol-catch-best";
const bestStreakKey = "gankbyte-symbol-catch-best-streak";
const perks = [
  { name: "MAGNET", description: "Catch range increased", apply: (game) => { game.catchRange += 7; } },
  { name: "OVERDRIVE", description: "Collection score boosted", apply: (game) => { game.scoreMultiplier += .1; } },
  { name: "SHIELD", description: "Absorbs one missed target", apply: (game) => { game.shield = true; } }
];
let running = false;
let lastTime = 0;
let elapsed = 0;
let spawnTimer = 0;
let score = 0;
let streak = 0;
let bestStreak = 0;
let catches = 0;
let lives = 3;
let target = symbols[0];
let currentPerk = "NONE";
let gameMode = "classic";
let catchRange = 0;
let scoreMultiplier = 1;
let shield = false;
let targetAlertTimer;
let drops = [];
let particles = [];
let catcher = { x: W / 2, width: 108, speed: 690 };
const keys = { left: false, right: false };

function updateHud() { scoreEl.textContent = score; streakEl.textContent = streak; livesEl.textContent = lives; targetEl.textContent = target; targetEl.style.color = symbolColors[symbols.indexOf(target)]; perkEl.textContent = currentPerk; }
function randomTarget() { const previous = target; do { target = symbols[Math.floor(Math.random() * symbols.length)]; } while (symbols.length > 1 && target === previous); }
function bestScore() { return Number(localStorage.getItem(bestKey) || 0); }
function reset() { elapsed = 0; spawnTimer = .2; score = 0; streak = 0; bestStreak = 0; catches = 0; lives = 5; catchRange = 0; scoreMultiplier = 1; shield = false; currentPerk = "NONE"; drops = []; particles = []; catcher = { x: W / 2, width: 108, speed: 690 }; randomTarget(); updateHud(); }
function spawnDrop(offset = 0) { const symbol = symbols[Math.floor(Math.random() * symbols.length)]; drops.push({ x: 36 + Math.random() * (W - 72), y: -30 - offset, size: 24 + Math.random() * 8, speed: (105 + elapsed * 2.8 + Math.random() * 50) * 1.15, symbol, color: symbolColors[symbols.indexOf(symbol)] }); }
function spawn() { spawnDrop(); if (Math.random() < .35) spawnDrop(44 + Math.random() * 70); if (elapsed > 22 && Math.random() < .1) spawnDrop(90 + Math.random() * 70); }
function burst(x, y, color) { for (let i = 0; i < 12; i++) particles.push({ x, y, dx: (Math.random() - .5) * 180, dy: (Math.random() - .7) * 180, life: .45, color }); }
function announceTarget() { if (!targetAlert || !targetAlertSymbol) return; targetAlertSymbol.textContent = target; targetAlertSymbol.style.color = symbolColors[symbols.indexOf(target)]; targetAlert.hidden = false; clearTimeout(targetAlertTimer); targetAlertTimer = setTimeout(() => { targetAlert.hidden = true; }, 1000); }
function awardPerk() { const perk = perks[Math.floor(Math.random() * perks.length)]; perk.apply({ catcher, get catchRange() { return catchRange; }, set catchRange(value) { catchRange = value; }, get scoreMultiplier() { return scoreMultiplier; }, set scoreMultiplier(value) { scoreMultiplier = value; }, get shield() { return shield; }, set shield(value) { shield = value; } }); currentPerk = perk.name; status.textContent = `${perk.name}: ${perk.description}.`; burst(catcher.x, H - 55, "#c6ff3d"); updateHud(); }
function finish(text) { running = false; const best = bestScore(); const savedBestStreak = Number(localStorage.getItem(bestStreakKey) || 0); if (score > best) localStorage.setItem(bestKey, String(score)); if (bestStreak > savedBestStreak) localStorage.setItem(bestStreakKey, String(bestStreak)); message.innerHTML = `<strong>${text}</strong><span>${score} points // ${bestStreak} best streak // ${currentPerk} active</span>`; message.hidden = false; startButton.textContent = "Run it again \u2192"; status.textContent = score > best ? `New best score: ${score}.` : `Best score on this device: ${Math.max(score, best)} // Best streak: ${Math.max(bestStreak, savedBestStreak)}.`; }
function catchDrop(drop) { const correct = drop.symbol === target; if (correct) { streak++; bestStreak = Math.max(bestStreak, streak); catches++; score += Math.round((10 + Math.min(50, streak * 2)) * scoreMultiplier); burst(drop.x, H - 54, "#c6ff3d"); if (gameMode === "switch" || catches % 5 === 0) { randomTarget(); announceTarget(); } if (catches % 8 === 0) awardPerk(); } else { lives--; streak = 0; score = Math.max(0, score - 5); burst(drop.x, H - 54, "#ff855c"); status.textContent = "Wrong symbol: one life lost."; if (lives <= 0) finish("SIGNAL LOST"); } updateHud(); }
function update(dt) {
  elapsed += dt;
  if (keys.left) catcher.x -= catcher.speed * dt;
  if (keys.right) catcher.x += catcher.speed * dt;
  catcher.x = Math.max(catcher.width / 2 + 10, Math.min(W - catcher.width / 2 - 10, catcher.x));
  spawnTimer -= dt;
  if (spawnTimer <= 0) { spawn(); spawnTimer = Math.max(.24, .67 - elapsed / 130); }
  for (let i = drops.length - 1; i >= 0; i--) { const drop = drops[i]; drop.y += drop.speed * dt; if (drop.y > H - 78 && drop.y < H - 30 && Math.abs(drop.x - catcher.x) < catcher.width / 2 + drop.size / 2 + catchRange) { catchDrop(drop); drops.splice(i, 1); } else if (drop.y > H + 30) { if (drop.symbol === target) { if (shield) { shield = false; currentPerk = "NONE"; status.textContent = "SHIELD absorbed the missed target."; burst(drop.x, H - 45, "#55e8ff"); updateHud(); } else { lives--; streak = 0; updateHud(); burst(drop.x, H - 45, "#c6ff3d"); if (lives <= 0) finish("SIGNAL LOST"); } } drops.splice(i, 1); } }
  particles = particles.filter((p) => { p.x += p.dx * dt; p.y += p.dy * dt; p.life -= dt; return p.life > 0; });
}
function draw() { ctx.clearRect(0, 0, W, H); ctx.save(); ctx.globalAlpha = .08; ctx.fillStyle = "#c6ff3d"; ctx.fillRect(0, H - 38, W, 1); ctx.restore();
  drops.forEach((d) => { ctx.save(); ctx.translate(d.x, d.y); ctx.shadowBlur = d.symbol === target ? 26 : 15; ctx.shadowColor = d.color; ctx.fillStyle = d.color; ctx.font = `800 ${d.size}px Arial`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(d.symbol, 0, 0); ctx.restore(); });
  particles.forEach((p) => { ctx.globalAlpha = Math.max(0, p.life * 2); ctx.fillStyle = p.color; ctx.fillRect(p.x, p.y, 3, 3); }); ctx.globalAlpha = 1;
  const x = catcher.x; const y = H - 48; const w = catcher.width; ctx.save(); ctx.shadowBlur = 18; ctx.shadowColor = "#c6ff3d"; ctx.fillStyle = "#c6ff3d"; ctx.beginPath(); ctx.moveTo(x - w / 2, y); ctx.lineTo(x + w / 2, y); ctx.lineTo(x + w / 2 - 12, y + 19); ctx.lineTo(x - w / 2 + 12, y + 19); ctx.closePath(); ctx.fill(); ctx.restore(); ctx.fillStyle = "#090a0e"; ctx.font = "700 9px Arial"; ctx.textAlign = "center"; ctx.fillText("CATCH", x, y + 13); }
function frame(now) { const dt = Math.min(.05, (now - lastTime) / 1000 || 0); lastTime = now; if (running) update(dt); draw(); requestAnimationFrame(frame); }
function start() { reset(); running = true; message.hidden = true; startButton.textContent = "Restart challenge \u2192"; status.textContent = "Catch the glowing target symbol. Perks unlock every 8 correct catches."; announceTarget(); canvas.focus(); }
function setPointer(event) { const rect = canvas.getBoundingClientRect(); catcher.x = ((event.clientX - rect.left) / rect.width) * W; }
document.addEventListener("keydown", (event) => { if (["ArrowLeft", "a", "A"].includes(event.key)) { keys.left = true; event.preventDefault(); } if (["ArrowRight", "d", "D"].includes(event.key)) { keys.right = true; event.preventDefault(); } });
document.addEventListener("keyup", (event) => { if (["ArrowLeft", "a", "A"].includes(event.key)) keys.left = false; if (["ArrowRight", "d", "D"].includes(event.key)) keys.right = false; });
canvas.addEventListener("pointermove", (event) => { if (event.buttons) setPointer(event); }); canvas.addEventListener("pointerdown", setPointer); startButton.addEventListener("click", start);
document.querySelectorAll("[data-move]").forEach((button) => { const side = button.dataset.move; button.addEventListener("pointerdown", () => keys[side] = true); button.addEventListener("pointerup", () => keys[side] = false); button.addEventListener("pointerleave", () => keys[side] = false); });
modeButtons.forEach((button) => button.addEventListener("click", () => { gameMode = button.dataset.mode; modeButtons.forEach((item) => item.classList.toggle("active", item === button)); status.textContent = gameMode === "classic" ? "Classic mode selected: target changes every 5 catches." : "Quick Switch selected: target changes after every catch."; }));
reset(); status.textContent = bestScore() ? `Best score on this device: ${bestScore()}.` : "No best score yet. Start a challenge."; requestAnimationFrame(frame);
