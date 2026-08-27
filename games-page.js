 (async () => {
  "use strict";
  const config = window.GANKBYTE_XP_CONFIG || {};
  const cards = {
    byte: { bestKey: "gankbyte-byte-rush-best", lastPlayedKey: "gankbyte-byte-rush-last-played", view: "arena_leaderboard", table: "arena_scores", label: "Byte Rush" },
    glitch: { bestKey: "gankbyte-glitch-dash-best", lastPlayedKey: "gankbyte-glitch-dash-last-played", view: "glitch_dash_leaderboard", table: "glitch_dash_scores", label: "Glitch Dash" },
    symbol: { bestKey: "gankbyte-symbol-catch-best", lastPlayedKey: "gankbyte-symbol-catch-last-played", view: "symbol_catch_leaderboard", table: "symbol_catch_scores", label: "Symbol Catch" },
    codebreaker: { bestKey: "gankbyte-codebreaker-best", lastPlayedKey: "gankbyte-codebreaker-last-played", view: "codebreaker_leaderboard", table: "codebreaker_scores", label: "Codebreaker" },
    snatch: { bestKey: "gankbyte-byte-snatch-best", lastPlayedKey: "gankbyte-byte-snatch-last-played", view: "byte_snatch_leaderboard", table: "byte_snatch_scores", label: "Byte Snatch" },
    swarm: { bestKey: "gankbyte-signal-swarm-best", lastPlayedKey: "gankbyte-signal-swarm-last-played", view: "signal_swarm_leaderboard", table: "signal_swarm_scores", label: "Signal Swarm" },
    packet: { bestKey: "gankbyte-packet-siege-best", lastPlayedKey: "gankbyte-packet-siege-last-played", view: "packet_siege_leaderboard", table: "packet_siege_scores", label: "Packet Siege" },
    stack: { bestKey: "gankbyte-byte-stack-best", lastPlayedKey: "gankbyte-byte-stack-last-played", view: "byte_stack_leaderboard", table: "byte_stack_scores", label: "Byte Stack" }
  };
  const gameGrid = document.querySelector(".live-games-grid");
  if (gameGrid && !gameGrid.querySelector('[data-game-card="signal-swarm"]')) {
    gameGrid.insertAdjacentHTML("beforeend", '<article class="live-game-card" data-game-card="signal-swarm"><img class="game-thumb" src="signal-swarm-thumb.svg" alt="Signal Swarm glowing Signals crossing a dangerous network" /><div class="live-game-card-body"><span class="status-badge">Playable now</span><h3>Signal Swarm</h3><p>Guide autonomous Signals through drops, gaps, corruption, and moving hazards, then get them safely to the exit.</p><ul><li>Endless level-based rescue run</li><li>Rescue percentage goals that increase by level</li><li>Three Signal types and six limited abilities</li><li>Personal best, XP, profile history, and leaderboard</li></ul><p class="game-card-stat" data-game-stat="swarm">Personal best: loading</p><div class="hero-actions"><a class="button button-primary" href="signal-swarm.html">Play Signal Swarm <span>&nearr;</span></a><a class="text-link" href="signal-swarm.html#leaderboard">View leaderboard <span>&nearr;</span></a></div></div></article>');
  }
  const format = (value) => Number(value || 0).toLocaleString();
  if (gameGrid && !gameGrid.querySelector('[data-game-card="byte-snatch"]')) {
    gameGrid.insertAdjacentHTML("beforeend", '<article class="live-game-card" data-game-card="byte-snatch"><img class="game-thumb" src="byte-snatch-thumb.svg" alt="Byte Snatch risk and reward arena" /><div class="live-game-card-body"><span class="status-badge">Playable now</span><h3>Byte Snatch</h3><p>Collect Bytes, build your multiplier, bank the score, and survive the glitches before they gank you.</p><ul><li>60-second risk-and-reward run</li><li>Banked score survives hits</li><li>Multipliers, power-ups, and touch controls</li><li>Global leaderboard, XP, and profile history</li></ul><p class="game-card-stat" data-game-stat="snatch">Personal best: loading</p><div class="hero-actions"><a class="button button-primary" href="byte-snatch.html">Play Byte Snatch <span>&nearr;</span></a><a class="text-link" href="byte-snatch.html#leaderboard">View leaderboard <span>&nearr;</span></a></div></div></article>');
  }
  if (gameGrid && !gameGrid.querySelector('[data-game-card="packet-siege"]')) {
    gameGrid.insertAdjacentHTML("beforeend", '<article class="live-game-card" data-game-card="packet-siege"><img class="game-thumb" src="packet-siege-thumb.svg" alt="Packet Siege neon packets descending toward a network core" /><div class="live-game-card-body"><span class="status-badge">Playable now</span><h3>Packet Siege</h3><p>Defend the network core, destroy corrupted packets, build combos, and survive one more wave.</p><ul><li>Wave-based arcade shooter</li><li>Basic, fast, tank, shooter, splitter, and boss packets</li><li>Power-ups, risk scoring, and escalating formations</li><li>Global leaderboard, XP, and profile history</li></ul><p class="game-card-stat" data-game-stat="packet">Personal best: loading</p><div class="hero-actions"><a class="button button-primary" href="packet-siege.html">Play Packet Siege <span>&nearr;</span></a><a class="text-link" href="packet-siege.html#leaderboard">View leaderboard <span>&nearr;</span></a></div></div></article>');
  }
  if (gameGrid && !gameGrid.querySelector('[data-game-card="byte-stack"]')) {
    gameGrid.insertAdjacentHTML("beforeend", '<article class="live-game-card" data-game-card="byte-stack"><img class="game-thumb" src="byte-stack-thumb.svg" alt="Byte Stack colourful falling blocks on a digital grid" /><div class="live-game-card-body"><span class="status-badge">Playable now</span><h3>Byte Stack</h3><p>Place, rotate, and drop falling blocks, clear lines, trigger glitches, and chase the biggest combo.</p><ul><li>Classic falling-block rules</li><li>Increasing speed and risk scoring</li><li>Glitch blocks, chain reactions, and Byte power</li><li>Personal best, XP, and leaderboard</li></ul><p class="game-card-stat" data-game-stat="stack">Personal best: loading</p><div class="hero-actions"><a class="button button-primary" href="byte-stack.html">Play Byte Stack <span>&nearr;</span></a><a class="text-link" href="byte-stack.html#leaderboard">View leaderboard <span>&nearr;</span></a></div></div></article>');
  }
  document.querySelectorAll("h2, .section-intro").forEach((node) => { node.textContent = node.textContent.replace(/Three games\.?/g, "Eight games.").replace(/Five games\.?/g, "Eight games.").replace("Byte Rush, Glitch Dash, and Symbol Catch", "Byte Rush, Glitch Dash, Symbol Catch, Codebreaker, Byte Snatch, Signal Swarm, Packet Siege, and Byte Stack").replace("Byte Rush, Glitch Dash, Symbol Catch, Codebreaker, and Byte Snatch", "Byte Rush, Glitch Dash, Symbol Catch, Codebreaker, Byte Snatch, Signal Swarm, Packet Siege, and Byte Stack"); });
  Object.entries(cards).forEach(([name, card]) => {
    const target = document.querySelector(`[data-game-stat="${name}"]`);
    if (!target) return;
    const best = name === "codebreaker"
      ? (() => { try { return JSON.parse(window.localStorage.getItem(card.bestKey) || "null"); } catch { return null; } })()
      : Number(window.localStorage.getItem(card.bestKey) || 0);
    const lastPlayed = window.localStorage.getItem(card.lastPlayedKey);
    const lastText = lastPlayed ? ` // Last played ${new Date(lastPlayed).toLocaleDateString(undefined, { day: "2-digit", month: "short" })}` : "";
    if (name === "codebreaker") {
      target.textContent = best ? `Personal best on this device: Level ${String(best.level || 0).padStart(2, "0")} // Score ${format(best.score)}${lastText}` : `Personal best: clear the first system${lastText}`;
    } else {
      target.textContent = best ? `Personal best on this device: ${format(best)}${lastText}` : `Personal best: play your first run${lastText}`;
    }
  });
  if (!config.supabaseUrl || !config.supabasePublishableKey || !window.supabase) return;
  const client = window.supabase.createClient(config.supabaseUrl, config.supabasePublishableKey);
  const sessionResult = await client.auth.getSession();
  const user = sessionResult.data?.session?.user || null;
  Object.entries(cards).forEach(async ([name, card]) => {
    if (!card.view) return;
    const target = document.querySelector(`[data-game-stat="${name}"]`);
    if (!target) return;
    try {
      const result = await client.from(card.view).select("best_score").order("best_score", { ascending: false }).limit(1);
      if (result.error) throw result.error;
      if (result.data?.[0]) target.textContent += ` // Global best: ${format(result.data[0].best_score)}`;
      else target.textContent += " // Global board: no runs yet";
      if (user) {
        const own = await client.from(card.table).select("score,status").eq("user_id", user.id).neq("status", "rejected").order("score", { ascending: false }).limit(1);
        if (own.error) throw own.error;
        if (own.data?.[0]) target.textContent += ` // Your account best: ${format(own.data[0].score)}`;
      }
    } catch {
      target.textContent += " // Global scores temporarily unavailable";
    }
  });
})();

