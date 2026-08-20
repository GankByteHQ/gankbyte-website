(() => {
  "use strict";

  const modules = {
    core: [
      { label: "Signal Salvager", copy: "Collect a moving objective before it burns out." },
      { label: "One-Button Cult", copy: "One input controls movement, risk, and regret." },
      { label: "Orbit Thief", copy: "Steal momentum from things that should be chasing you." },
      { label: "Lantern Runner", copy: "Your light is also your hitbox." },
      { label: "Courier of Bad News", copy: "Carry a live glitch to somewhere it absolutely should not be." },
      { label: "Room-Sized Boss", copy: "The whole arena is one creature with a temper." },
      { label: "Debt Collector", copy: "Every safe choice borrows trouble from the next room." },
      { label: "Weather Machine", copy: "Change the forecast by moving through the wrong place." },
      { label: "Echo Mechanic", copy: "Your last action becomes the next tool in your kit." },
      { label: "Tiny Architect", copy: "Build the route while the route is trying to disappear." },
      { label: "Signal Chef", copy: "Combine unstable ingredients before the timer notices." },
      { label: "Lost Tutorial", copy: "Learn the controls from objects that refuse to explain themselves." }
    ],
    threat: [
      { label: "The Arena Learns", copy: "Every route you repeat becomes dangerous." },
      { label: "The Floor Remembers", copy: "Your old mistakes remain active on the map." },
      { label: "The Safe Zone Lies", copy: "The obvious escape is bait with good lighting." },
      { label: "Your Shadow Scores", copy: "A second version of you is quietly winning." },
      { label: "Glitches Arrive Early", copy: "The warning appears after the danger." },
      { label: "Walls Have Opinions", copy: "The boundary moves when you get comfortable." },
      { label: "The Map Is Jealous", copy: "It closes the route you are enjoying most." },
      { label: "Nothing Stays Collected", copy: "Every pickup returns with a slightly worse attitude." },
      { label: "The Clock Hunts", copy: "Time speeds up whenever you start playing carefully." },
      { label: "Your Best Route Is Bait", copy: "The strongest strategy becomes the first trap." },
      { label: "The Crowd Votes", copy: "The arena changes when your rhythm becomes obvious." },
      { label: "Gravity Has a Shift", copy: "The floor quietly chooses a new direction." }
    ],
    twist: [
      { label: "Combo Debt", copy: "Every point today makes tomorrow harder." },
      { label: "Trade Score for Control", copy: "Spend your score to make one perfect move." },
      { label: "Mute the UI", copy: "The game stops explaining itself after the first mistake." },
      { label: "Friendly Fire from Tomorrow", copy: "Your future route returns as a live hazard." },
      { label: "The Final Second Is a Boss", copy: "Survival ends with one last impossible choice." },
      { label: "Rules Decay", copy: "Every clean action removes one rule and adds another." },
      { label: "Score Is Ammunition", copy: "Spend points to change the room, then regret being generous." },
      { label: "The Button Lies", copy: "The obvious input works, but never in the way you expect." },
      { label: "Inventory Is a Rumour", copy: "You can carry three things, but only remember two." },
      { label: "Victory Has Teeth", copy: "Winning unlocks the hazard that can finally beat you." },
      { label: "Borrowed Time", copy: "Every extra second must be paid back with movement." },
      { label: "Make It Worse", copy: "Each bonus gives you power and removes a certainty." }
    ]
  };
  const $ = (id) => document.getElementById(id);
  const state = { seed: 0, selected: { core: 0, threat: 0, twist: 0 }, result: null, history: [] };
  const names = ["Bad Signal", "Tiny Catastrophe", "Neon Liability", "Unpaid Boss Fight", "The Last Good Idea", "Glitch With Benefits", "Room For Error", "Protocol: Oops"];
  const verbs = ["salvage", "outrun", "escort", "stack", "trade", "survive", "haunt", "smuggle"];

  function hashState() {
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const seed = Number(hash.get("signal"));
    return {
      seed: Number.isFinite(seed) && seed >= 0 ? seed % 1000000 : Math.floor(Math.random() * 1000000),
      selected: {
        core: Number(hash.get("core")) || 0,
        threat: Number(hash.get("threat")) || 0,
        twist: Number(hash.get("twist")) || 0
      }
    };
  }
  function rng(seed) { let value = seed >>> 0; return () => { value += 0x6D2B79F5; let t = value; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function choose(list, random) { return list[Math.floor(random() * list.length)]; }
  function cleanSeed(value) { return String(value).padStart(6, "0"); }
  function setText(id, value) { const node = $(id); if (node) node.textContent = value; }
  function normalizeSeed(value) { const numeric = Number(value); return Number.isFinite(numeric) && numeric >= 0 ? Math.floor(numeric) % 1000000 : Math.floor(Math.random() * 1000000); }
  function resultKey() { return `${state.seed}:${state.selected.core}:${state.selected.threat}:${state.selected.twist}`; }
  function loadHistory() { try { const saved = JSON.parse(window.localStorage.getItem("gankbyte-signal-forge-history") || "[]"); state.history = Array.isArray(saved) ? saved.slice(0, 8) : []; } catch { state.history = []; } }
  function saveHistory() { try { window.localStorage.setItem("gankbyte-signal-forge-history", JSON.stringify(state.history.slice(0, 8))); } catch {} }
  function remember(result) { const key = resultKey(); if (state.history[0]?.key === key) return; state.history.unshift({ key, seed: state.seed, selected: { ...state.selected }, title: result.title, chaos: result.chaos, promise: result.promise }); state.history = state.history.slice(0, 8); saveHistory(); }
  function setForgeStatus(message, tone) { setText("forge-status", message); const node = $("forge-status"); if (node) node.className = `forge-status${tone ? ` is-${tone}` : ""}`; }
  function renderHistory() { const list = $("forge-history-list"); if (!list) return; list.replaceChildren(); if (!state.history.length) { const empty = document.createElement("p"); empty.className = "forge-history-empty"; empty.textContent = "Your recent mutations will appear here."; list.append(empty); return; } state.history.forEach((item, index) => { const button = document.createElement("button"); button.className = "forge-history-item"; button.type = "button"; button.dataset.historyIndex = index; button.innerHTML = `<strong>${item.title}</strong><span>SEED // ${cleanSeed(item.seed)} · CHAOS ${String(item.chaos).padStart(2, "0")}</span>`; button.addEventListener("click", () => { state.seed = normalizeSeed(item.seed); state.selected = { ...item.selected }; render(); setForgeStatus("Mutation restored from history.", "success"); }); list.append(button); }); }
  function randomSelection(seed) { const random = rng(seed); return { core: Math.floor(random() * modules.core.length), threat: Math.floor(random() * modules.threat.length), twist: Math.floor(random() * modules.twist.length) }; }
  function escapeLua(value) { return String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"'); }
  function makeResult() {
    const random = rng(state.seed);
    const core = modules.core[state.selected.core % modules.core.length];
    const threat = modules.threat[state.selected.threat % modules.threat.length];
    const twist = modules.twist[state.selected.twist % modules.twist.length];
    const title = `${choose(names, random)}: ${core.label}`;
    const verb = choose(verbs, random);
    const chaos = Math.round(36 + random() * 58);
    const promise = Math.round(42 + random() * 54);
    const result = {
      title,
      core,
      threat,
      twist,
      hook: `A ${verb} game where ${core.copy.toLowerCase()} The catch: ${twist.copy.toLowerCase()}`,
      pitch: `Build a short run around ${core.label.toLowerCase()}. Make the player understand the first rule in ten seconds, then let ${threat.label.toLowerCase()} ruin their confidence.` ,
      rule: `${core.label} is the verb. ${threat.label} is the pressure. ${twist.label} changes what winning means.`,
      fail: `The run ends when the player repeats a safe habit three times. The game should make failure feel like information, not a reset.`,
      build: `One arena, one input loop, one readable threat, and one surprising rule. Ship the smallest version before adding content.`,
      chaos,
      promise,
      lua: `local forge = {\n  title = "${escapeLua(title)}",\n  core = "${escapeLua(core.label)}",\n  threat = "${escapeLua(threat.label)}",\n  twist = "${escapeLua(twist.label)}"\n}\n\nfunction forge.tick(player, arena)\n  if arena:signal_is_repeating(player) then\n    arena:teach(player, "${escapeLua(threat.label)}")\n  end\n\n  if player:spent_score_for_control() then\n    arena:slow_for(player, 1.8)\n  end\nend`
    };
    state.result = result;
    return result;
  }
  function render() {
    const result = makeResult();
    state.selected.core %= modules.core.length; state.selected.threat %= modules.threat.length; state.selected.twist %= modules.twist.length;
    setText("forge-seed", `SEED // ${cleanSeed(state.seed)}`);
    setText("forge-count", `${modules.core.length} × ${modules.threat.length} × ${modules.twist.length} // ${modules.core.length * modules.threat.length * modules.twist.length} BUILDS`);
    setText("core-index", `${String(state.selected.core + 1).padStart(2, "0")} / ${String(modules.core.length).padStart(2, "0")}`); setText("threat-index", `${String(state.selected.threat + 1).padStart(2, "0")} / ${String(modules.threat.length).padStart(2, "0")}`); setText("twist-index", `${String(state.selected.twist + 1).padStart(2, "0")} / ${String(modules.twist.length).padStart(2, "0")}`);
    setText("core-label", result.core.label); setText("core-copy", result.core.copy);
    setText("threat-label", result.threat.label); setText("threat-copy", result.threat.copy);
    setText("twist-label", result.twist.label); setText("twist-copy", result.twist.copy);
    setText("forge-title", result.title); setText("forge-hook", result.hook);
    setText("forge-pitch", result.pitch); setText("forge-rule", result.rule); setText("forge-fail", result.fail); setText("forge-build", result.build);
    setText("chaos-value", String(result.chaos).padStart(2, "0")); setText("promise-value", String(result.promise).padStart(2, "0"));
    $("chaos-bar").style.width = `${result.chaos}%`;
    $("forge-code").textContent = result.lua;
    setText("forge-rating", result.chaos > 78 ? "SIGNAL UNSTABLE" : result.promise > 80 ? "SIGNAL PROMISING" : "SIGNAL STABLE");
    const input = $("forge-seed-input"); if (input) input.value = state.seed;
    remember(result); renderHistory(); setForgeStatus("A new mutation is ready.");
  }
  function roll(module) { state.selected[module] = (state.selected[module] + 1 + Math.floor(Math.random() * (modules[module].length - 1))) % modules[module].length; render(); }
  function rollAll() { state.seed = normalizeSeed(); state.selected = randomSelection(state.seed); render(); setForgeStatus("All three modules rolled. New problem acquired.", "success"); }
  function surprise() { state.seed = normalizeSeed(); state.selected = randomSelection(state.seed); render(); setForgeStatus("Surprise mutation loaded.", "success"); }
  function applySeed() { state.seed = normalizeSeed($("forge-seed-input")?.value); state.selected = randomSelection(state.seed); render(); setForgeStatus("Seed loaded. Same signal, same blueprint.", "success"); }
  function blueprint() { const r = state.result; return JSON.stringify({ project: "Signal Forge", seed: state.seed, combinations: modules.core.length * modules.threat.length * modules.twist.length, title: r.title, core: r.core.label, threat: r.threat.label, twist: r.twist.label, pitch: r.pitch, rule: r.rule }, null, 2); }
  async function copy(value, message) { try { await navigator.clipboard.writeText(value); setText("forge-status", message); $("forge-status").className = "forge-status is-success"; } catch { setText("forge-status", "Copy is unavailable here. Select the output manually."); $("forge-status").className = "forge-status is-error"; } }
  function initSignalGame() {
    const canvas = $("signal-game-canvas");
    if (!canvas) return;
    const context = canvas.getContext("2d");
    const width = canvas.width;
    const height = canvas.height;
    const game = { running: false, score: 0, best: 0, time: 45, wave: 1, direction: 1, player: { x: width / 2, y: height - 42, radius: 12 }, bytes: [], hazards: [], byteTimer: 0, hazardTimer: 0, controlUntil: 0, lastFrame: 0, raf: 0 };
    try { game.best = Number(window.localStorage.getItem("gankbyte-signal-forge-best")) || 0; } catch { game.best = 0; }
    function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
    function distance(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
    function setGameText(id, value) { const node = $(id); if (node) node.textContent = value; }
    function updateHud() { setGameText("signal-score", game.score.toLocaleString()); setGameText("signal-time", Math.max(0, Math.ceil(game.time))); setGameText("signal-wave", game.wave); setGameText("signal-best", game.best.toLocaleString()); }
    function setStatus(message, tone) { const node = $("signal-game-status"); if (!node) return; node.textContent = message; node.className = `signal-game-status${tone ? ` is-${tone}` : ""}`; }
    function setOverlay(title, subtitle, hidden) { setGameText("signal-game-message", title); setGameText("signal-game-submessage", subtitle); $("signal-game-overlay").classList.toggle("is-hidden", hidden); }
    function setButtons(active) { $("signal-game-start").textContent = active ? "Restart run →" : "Start run →"; $("signal-game-flip").disabled = !active; $("signal-game-control").disabled = !active; }
    function spawnByte() { game.bytes.push({ x: 34 + Math.random() * (width - 68), y: 64 + Math.random() * (height - 150), pulse: Math.random() * Math.PI * 2 }); }
    function spawnHazard() { const target = clamp(game.player.x + (Math.random() - .5) * (150 + game.wave * 18), 32, width - 32); game.hazards.push({ x: target, y: -18, target, speed: 90 + game.wave * 24, size: 13 + Math.min(8, game.wave) }); }
    function resetGame() { game.score = 0; game.time = 45; game.wave = 1; game.direction = Math.random() > .5 ? 1 : -1; game.player.x = width / 2; game.bytes = []; game.hazards = []; game.byteTimer = .2; game.hazardTimer = .8; game.controlUntil = 0; spawnByte(); spawnByte(); updateHud(); }
    function flip() { if (!game.running) return; game.direction *= -1; setStatus(game.direction > 0 ? "Signal moving right. Do not become predictable." : "Signal moving left. Do not become predictable."); }
    function control() { if (!game.running || game.score < 25 || performance.now() < game.controlUntil) return; game.score -= 25; game.controlUntil = performance.now() + 1800; setStatus("Control bought. The arena is briefly confused.", "warning"); updateHud(); }
    function finish(title, subtitle) { game.running = false; cancelAnimationFrame(game.raf); setButtons(false); if (game.score > game.best) { game.best = game.score; try { window.localStorage.setItem("gankbyte-signal-forge-best", String(game.best)); } catch {} setStatus(`New local best: ${game.best.toLocaleString()}.`, "success"); } else { setStatus(`Run ended at ${game.score.toLocaleString()}. Flip the signal and try again.`); } setOverlay(title, subtitle, false); updateHud(); draw(); }
    function start() { cancelAnimationFrame(game.raf); resetGame(); game.running = true; setButtons(true); setOverlay("RUNNING", "The arena is watching your route.", true); setStatus("Collect bytes. Flip early. Spend score only when it matters."); game.lastFrame = performance.now(); game.raf = requestAnimationFrame(loop); }
    function update(delta) { game.time -= delta; game.wave = 1 + Math.floor((45 - game.time) / 9); const controlled = performance.now() < game.controlUntil; const speed = 118 + game.wave * 15; game.player.x += game.direction * speed * delta; if (game.player.x < 24 || game.player.x > width - 24) { game.direction *= -1; game.player.x = clamp(game.player.x, 24, width - 24); } game.byteTimer -= delta; game.hazardTimer -= delta; if (game.byteTimer <= 0) { spawnByte(); game.byteTimer = Math.max(.55, 1.25 - game.wave * .08); } if (game.hazardTimer <= 0) { spawnHazard(); game.hazardTimer = Math.max(.42, 1.35 - game.wave * .1); }
      game.bytes = game.bytes.filter((item) => { item.pulse += delta * 4; if (distance(game.player, item) < 24) { game.score += 100 + game.wave * 12; setStatus(`Byte secured. ${game.score.toLocaleString()} points.`, "success"); return false; } return true; });
      game.hazards = game.hazards.filter((hazard) => { hazard.x += (hazard.target - hazard.x) * delta * .45; hazard.y += hazard.speed * delta * (controlled ? .34 : 1); if (distance(game.player, hazard) < hazard.size + game.player.radius) { finish("SIGNAL LOST", "The arena learned one route too many."); return false; } return hazard.y < height + 24; });
      updateHud(); if (game.time <= 0) finish("SIGNAL SURVIVED", `You forged ${game.score.toLocaleString()} points from a bad idea.`);
    }
    function draw() { context.clearRect(0, 0, width, height); context.fillStyle = "#07090d"; context.fillRect(0, 0, width, height); context.strokeStyle = "rgba(122,145,105,.16)"; context.lineWidth = 1; for (let x = 20; x < width; x += 40) { context.beginPath(); context.moveTo(x, 0); context.lineTo(x, height); context.stroke(); } for (let y = 20; y < height; y += 40) { context.beginPath(); context.moveTo(0, y); context.lineTo(width, y); context.stroke(); } const controlled = performance.now() < game.controlUntil; context.strokeStyle = controlled ? "rgba(255,155,80,.7)" : "rgba(198,255,61,.34)"; context.strokeRect(18, 18, width - 36, height - 36); game.bytes.forEach((item) => { const glow = 10 + Math.sin(item.pulse) * 4; context.shadowBlur = glow; context.shadowColor = "#c6ff3d"; context.fillStyle = "#c6ff3d"; context.save(); context.translate(item.x, item.y); context.rotate(Math.PI / 4); context.fillRect(-8, -8, 16, 16); context.restore(); context.shadowBlur = 0; }); game.hazards.forEach((hazard) => { context.shadowBlur = 18; context.shadowColor = "#9a7bff"; context.fillStyle = "#9a7bff"; context.beginPath(); context.moveTo(hazard.x, hazard.y - hazard.size); context.lineTo(hazard.x + hazard.size, hazard.y + hazard.size); context.lineTo(hazard.x - hazard.size, hazard.y + hazard.size); context.closePath(); context.fill(); context.shadowBlur = 0; }); context.save(); context.translate(game.player.x, game.player.y); context.rotate(Math.PI / 4); context.shadowBlur = controlled ? 28 : 18; context.shadowColor = controlled ? "#ff9b50" : "#c6ff3d"; context.fillStyle = controlled ? "#ff9b50" : "#e9ffb1"; context.fillRect(-game.player.radius, -game.player.radius, game.player.radius * 2, game.player.radius * 2); context.restore(); context.fillStyle = "#8a8f9a"; context.font = "11px monospace"; context.fillText(controlled ? "CONTROL // ACTIVE" : "SIGNAL // LIVE", 30, height - 25); }
    function loop(timestamp) { if (!game.running) return; const delta = Math.min(.035, Math.max(.001, (timestamp - game.lastFrame) / 1000)); game.lastFrame = timestamp; update(delta); draw(); if (game.running) game.raf = requestAnimationFrame(loop); }
    $("signal-game-start").addEventListener("click", start); $("signal-game-flip").addEventListener("click", flip); $("signal-game-control").addEventListener("pointerdown", (event) => { event.preventDefault(); control(); }); canvas.addEventListener("pointerdown", (event) => { event.preventDefault(); flip(); }); window.addEventListener("keydown", (event) => { if (event.code === "Space") { event.preventDefault(); if (event.repeat) return; if (!game.running) start(); else flip(); } if (event.key === "Control") control(); }); updateHud(); draw();
  }
  $("forge-button").addEventListener("click", rollAll);
  $("surprise-button").addEventListener("click", surprise);
  $("roll-all").addEventListener("click", rollAll);
  $("apply-seed").addEventListener("click", applySeed);
  $("forge-seed-input").addEventListener("keydown", (event) => { if (event.key === "Enter") applySeed(); });
  $("clear-history").addEventListener("click", () => { state.history = []; saveHistory(); renderHistory(); setForgeStatus("Mutation history cleared."); });
  document.querySelectorAll("[data-roll]").forEach((button) => button.addEventListener("click", () => roll(button.dataset.roll)));
  $("copy-lua").addEventListener("click", () => copy(state.result.lua, "Lua starter copied."));
  $("copy-blueprint").addEventListener("click", () => copy(blueprint(), "Blueprint copied."));
  $("share-forge").addEventListener("click", () => { const hash = `#signal=${state.seed}&core=${state.selected.core}&threat=${state.selected.threat}&twist=${state.selected.twist}`; const url = `${window.location.origin}${window.location.pathname}${hash}`; window.history.replaceState({}, "", hash); copy(url, "Seed link copied."); });
  loadHistory(); const initial = hashState(); state.seed = initial.seed; state.selected = initial.selected; render(); initSignalGame();
})();
