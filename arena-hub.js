(() => {
  "use strict";
  const config = window.GANKBYTE_XP_CONFIG || {};
  const $ = (id) => document.getElementById(id);
  const format = (value) => Number(value || 0).toLocaleString();
  const date = (value) => value ? new Date(value).toLocaleDateString(undefined, { day: "2-digit", month: "short" }) : "-";
  const recent = $("hub-recent-results");
  const status = $("hub-status");
  const escape = (value) => String(value || "").replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[character]));
  const gameGrid = document.querySelector(".arena-game-grid");
  if (gameGrid && !gameGrid.querySelector('[data-arena-game="signal-swarm"]')) {
    gameGrid.insertAdjacentHTML("beforeend", '<article class="content-card arena-game-card" data-arena-game="signal-swarm"><img class="game-thumb" src="signal-swarm-thumb.svg" alt="Signal Swarm glowing creatures moving through a corrupted network" /><span class="status-badge">Playable now</span><h3>Signal Swarm</h3><p>Guide an automatic swarm through corruption, hazards, and risky speed pushes.</p><p class="game-card-meta"><strong>Best for</strong> strategy, rescue decisions, and score chasing.</p><div class="game-card-actions"><a class="button button-primary" href="signal-swarm.html">Play Signal Swarm <span>&nearr;</span></a><a class="text-link" href="signal-swarm.html#leaderboard">Leaderboard <span>&nearr;</span></a></div></article>');
    const heading = document.querySelector("#game-select .section-intro");
    if (heading) heading.textContent = heading.textContent.replace("Five games", "Six games");
  }
  if (gameGrid && !gameGrid.querySelector('[data-arena-game="packet-siege"]')) {
    gameGrid.insertAdjacentHTML("beforeend", '<article class="content-card arena-game-card" data-arena-game="packet-siege"><img class="game-thumb" src="packet-siege-thumb.svg" alt="Packet Siege corrupted packets descending toward a neon network core" /><span class="status-badge">Playable now</span><h3>Packet Siege</h3><p>Defend the network core, build your combo, and survive escalating packet waves.</p><p class="game-card-meta"><strong>Best for</strong> arcade shooting, risk scoring, and wave chasing.</p><div class="game-card-actions"><a class="button button-primary" href="packet-siege.html">Play Packet Siege <span>&nearr;</span></a><a class="text-link" href="packet-siege.html#leaderboard">Leaderboard <span>&nearr;</span></a></div></article>');
    const heading = document.querySelector("#game-select .section-intro");
    if (heading) heading.textContent = heading.textContent.replace("Six games", "Seven games").replace("Five games", "Seven games");
  }
  if (gameGrid && !gameGrid.querySelector('[data-arena-game="byte-stack"]')) {
    gameGrid.insertAdjacentHTML("beforeend", '<article class="content-card arena-game-card" data-arena-game="byte-stack"><img class="game-thumb" src="byte-stack-thumb.svg" alt="Byte Stack falling blocks on a digital grid" /><span class="status-badge">Playable now</span><h3>Byte Stack</h3><p>Place, rotate, and drop falling blocks, clear lines, trigger glitches, and chase the biggest combo.</p><p class="game-card-meta"><strong>Best for</strong> pattern building and score chasing.</p><div class="game-card-actions"><a class="button button-primary" href="byte-stack.html">Play Byte Stack <span>&nearr;</span></a><a class="text-link" href="byte-stack.html#leaderboard">Leaderboard <span>&nearr;</span></a></div></article>');
  }
  if (gameGrid && !gameGrid.querySelector('[data-arena-game="null-ninja"]')) {
    gameGrid.insertAdjacentHTML("beforeend", '<article class="content-card arena-game-card" data-arena-game="null-ninja"><img class="game-thumb" src="null-ninja-thumb.svg" alt="Null Ninja digital stickman facing a corrupted network" /><span class="status-badge">Playable now</span><h3>Null Ninja</h3><p>Run through the corrupted network, strike drones, chain perfect attacks, and push into Gank Mode.</p><p class="game-card-meta"><strong>Best for</strong> movement, combat flow, and combo chasing.</p><div class="game-card-actions"><a class="button button-primary" href="null-ninja.html">Play Null Ninja <span>&nearr;</span></a><a class="text-link" href="null-ninja.html#leaderboard">Leaderboard <span>&nearr;</span></a></div></article>');
  }
  if (gameGrid && !gameGrid.querySelector('[data-arena-game="stick-fighter"]')) {
    gameGrid.insertAdjacentHTML("beforeend", '<article class="content-card arena-game-card" data-arena-game="stick-fighter"><img class="game-thumb" src="stick-fighter-thumb.svg" alt="GankByte stick fighter ready to duel in a neon arena" /><span class="status-badge">Playable now</span><h3>Stick Fighter</h3><p>Read the rival, chain punches and kicks, block at the right moment, and win the neon ring.</p><p class="game-card-meta"><strong>Best for</strong> timing, fighting-game fundamentals, and combo chasing.</p><div class="game-card-actions"><a class="button button-primary" href="stick-fighter.html">Play Stick Fighter <span>&nearr;</span></a><a class="text-link" href="stick-fighter.html#leaderboard">Leaderboard <span>&nearr;</span></a></div></article>');
  }
  const snapshot = document.querySelector(".arena-hub-snapshot");
  if (snapshot && !snapshot.querySelector("#hub-swarm-best")) {
    snapshot.insertAdjacentHTML("beforeend", '<div class="content-card"><span class="status-badge">Signal Swarm</span><h3 id="hub-swarm-best">Loading best</h3><p id="hub-swarm-detail">Global best score</p></div>');
  }
  if (snapshot && !snapshot.querySelector("#hub-packet-best")) {
    snapshot.insertAdjacentHTML("beforeend", '<div class="content-card"><span class="status-badge">Packet Siege</span><h3 id="hub-packet-best">Loading best</h3><p id="hub-packet-detail">Global best score</p></div>');
  }
  if (snapshot && !snapshot.querySelector("#hub-stack-best")) {
    snapshot.insertAdjacentHTML("beforeend", '<div class="content-card"><span class="status-badge">Byte Stack</span><h3 id="hub-stack-best">Loading best</h3><p id="hub-stack-detail">Global best score</p></div>');
  }
  if (snapshot && !snapshot.querySelector("#hub-ninja-best")) {
    snapshot.insertAdjacentHTML("beforeend", '<div class="content-card"><span class="status-badge">Null Ninja</span><h3 id="hub-ninja-best">Loading best</h3><p id="hub-ninja-detail">Global best score</p></div>');
  }
  if (snapshot && !snapshot.querySelector("#hub-fighter-best")) {
    snapshot.insertAdjacentHTML("beforeend", '<div class="content-card"><span class="status-badge">Stick Fighter</span><h3 id="hub-fighter-best">Loading best</h3><p id="hub-fighter-detail">Global best score</p></div>');
  }
  if (!config.supabaseUrl || !config.supabasePublishableKey || !window.supabase) {
    $("hub-byte-best").textContent = "Unavailable";
    $("hub-glitch-best").textContent = "Unavailable";
    if ($("hub-symbol-best")) $("hub-symbol-best").textContent = "Unavailable";
    if ($("hub-snatch-best")) $("hub-snatch-best").textContent = "Unavailable";
    if ($("hub-codebreaker-best")) $("hub-codebreaker-best").textContent = "Unavailable";
    if ($("hub-swarm-best")) $("hub-swarm-best").textContent = "Unavailable";
    if ($("hub-packet-best")) $("hub-packet-best").textContent = "Unavailable";
    if ($("hub-stack-best")) $("hub-stack-best").textContent = "Unavailable";
    if ($("hub-ninja-best")) $("hub-ninja-best").textContent = "Unavailable";
    if ($("hub-fighter-best")) $("hub-fighter-best").textContent = "Unavailable";
    status.textContent = "The Arena snapshot needs the XP backend connection.";
    return;
  }
  const client = window.supabase.createClient(config.supabaseUrl, config.supabasePublishableKey);
  async function load() {
    const sessionResult = await client.auth.getSession();
    const user = sessionResult.data?.session?.user || null;
    const [byte, glitch, symbol, snatch, codebreaker, swarm, packet, stack, ninja, fighter, xp] = await Promise.all([
      client.from("arena_leaderboard").select("best_score,display_name").order("best_score", { ascending: false }).limit(1),
      client.from("glitch_dash_leaderboard").select("best_score,display_name").order("best_score", { ascending: false }).limit(1),
      client.from("symbol_catch_leaderboard").select("best_score,display_name").order("best_score", { ascending: false }).limit(1),
      client.from("byte_snatch_leaderboard").select("best_score,display_name").order("best_score", { ascending: false }).limit(1),
      client.from("codebreaker_leaderboard").select("best_score,display_name").order("best_score", { ascending: false }).limit(1),
      client.from("signal_swarm_leaderboard").select("best_score,best_saved,display_name").order("best_score", { ascending: false }).limit(1),
      client.from("packet_siege_leaderboard").select("best_score,best_wave,display_name").order("best_score", { ascending: false }).limit(1),
      client.from("byte_stack_leaderboard").select("best_score,best_level,best_lines,display_name").order("best_score", { ascending: false }).limit(1),
      client.from("null_ninja_leaderboard").select("best_score,best_distance,best_kills,display_name").order("best_score", { ascending: false }).limit(1),
      client.from("stick_fighter_leaderboard").select("best_score,best_wins,best_hits,level_reached,display_name").order("best_score", { ascending: false }).limit(1),
      user ? client.from("xp_leaderboard").select("xp_total").eq("id", user.id).maybeSingle() : Promise.resolve({ data: null })
    ]);
    if (byte.error || glitch.error || symbol.error || snatch.error || codebreaker.error || swarm.error || packet.error || stack.error || ninja.error || fighter.error || (user && xp.error)) {
      status.textContent = "Some Arena data is temporarily unavailable. You can still play any of the ten games.";
    }
    $("hub-byte-best").textContent = byte.data?.[0] ? format(byte.data[0].best_score) : "No runs yet";
    $("hub-byte-detail").textContent = byte.data?.[0] ? `Top score by ${byte.data[0].display_name || "GankByte Player"}` : "Be the first on the board";
    $("hub-glitch-best").textContent = glitch.data?.[0] ? format(glitch.data[0].best_score) : "No runs yet";
    $("hub-glitch-detail").textContent = glitch.data?.[0] ? `Top score by ${glitch.data[0].display_name || "GankByte Player"}` : "Be the first on the board";
    if ($("hub-symbol-best")) $("hub-symbol-best").textContent = symbol.data?.[0] ? format(symbol.data[0].best_score) : "No runs yet";
    if ($("hub-symbol-detail")) $("hub-symbol-detail").textContent = symbol.data?.[0] ? `Top score by ${symbol.data[0].display_name || "GankByte Player"}` : "Be the first on the board";
    if ($("hub-snatch-best")) $("hub-snatch-best").textContent = snatch.data?.[0] ? format(snatch.data[0].best_score) : "No runs yet";
    if ($("hub-snatch-detail")) $("hub-snatch-detail").textContent = snatch.data?.[0] ? `Top score by ${snatch.data[0].display_name || "GankByte Player"}` : "Be the first on the board";
    if ($("hub-codebreaker-best")) $("hub-codebreaker-best").textContent = codebreaker.data?.[0] ? format(codebreaker.data[0].best_score) : "No runs yet";
    if ($("hub-codebreaker-detail")) $("hub-codebreaker-detail").textContent = codebreaker.data?.[0] ? `Top score by ${codebreaker.data[0].display_name || "GankByte Player"}` : "Be the first on the board";
    if ($("hub-swarm-best")) $("hub-swarm-best").textContent = swarm.data?.[0] ? format(swarm.data[0].best_score) : "No runs yet";
    if ($("hub-swarm-detail")) $("hub-swarm-detail").textContent = swarm.data?.[0] ? `${swarm.data[0].best_saved} Signals saved by ${swarm.data[0].display_name || "GankByte Player"}` : "Be the first on the board";
    if ($("hub-packet-best")) $("hub-packet-best").textContent = packet.data?.[0] ? format(packet.data[0].best_score) : "No runs yet";
    if ($("hub-packet-detail")) $("hub-packet-detail").textContent = packet.data?.[0] ? `Wave ${packet.data[0].best_wave} by ${packet.data[0].display_name || "GankByte Player"}` : "Be the first on the board";
    if ($("hub-stack-best")) $("hub-stack-best").textContent = stack.data?.[0] ? format(stack.data[0].best_score) : "No runs yet";
    if ($("hub-stack-detail")) $("hub-stack-detail").textContent = stack.data?.[0] ? `${stack.data[0].best_lines || 0} lines by ${stack.data[0].display_name || "GankByte Player"}` : "Be the first on the board";
    if ($("hub-ninja-best")) $("hub-ninja-best").textContent = ninja.data?.[0] ? format(ninja.data[0].best_score) : "No runs yet";
    if ($("hub-ninja-detail")) $("hub-ninja-detail").textContent = ninja.data?.[0] ? `${ninja.data[0].best_kills || 0} kills by ${ninja.data[0].display_name || "GankByte Player"}` : "Be the first on the board";
    if ($("hub-fighter-best")) $("hub-fighter-best").textContent = fighter.data?.[0] ? format(fighter.data[0].best_score) : "No matches yet";
    if ($("hub-fighter-detail")) $("hub-fighter-detail").textContent = fighter.data?.[0] ? `Level ${fighter.data[0].level_reached || 1} // ${fighter.data[0].best_wins || 0} levels by ${fighter.data[0].display_name || "GankByte Player"}` : "Be the first on the board";
    if (!user) {
      $("hub-xp-total").textContent = "Sign in";
      $("hub-xp-detail").textContent = "Connect Discord for your progress.";
      status.textContent = "Global scores are live. Sign in with Discord to load your personal snapshot.";
      return;
    }
    $("hub-xp-total").textContent = `${format(xp.data?.xp_total)} XP`;
    $("hub-xp-detail").textContent = "Approved community progress";
    const [arena, dash, symbolRuns, snatchRuns, codebreakerRuns, swarmRuns, packetRuns, stackRuns, ninjaRuns, fighterRuns] = await Promise.all([
      client.from("arena_scores").select("score,wave,created_at,status").eq("user_id", user.id).neq("status", "rejected").order("created_at", { ascending: false }).limit(5),
      client.from("glitch_dash_scores").select("score,streak,created_at,status").eq("user_id", user.id).neq("status", "rejected").order("created_at", { ascending: false }).limit(5),
      client.from("symbol_catch_scores").select("score,best_streak,created_at,status").eq("user_id", user.id).neq("status", "rejected").order("created_at", { ascending: false }).limit(5)
      ,client.from("byte_snatch_scores").select("score,best_multiplier,created_at,status").eq("user_id", user.id).neq("status", "rejected").order("created_at", { ascending: false }).limit(5),
      client.from("codebreaker_scores").select("score,level,created_at,status").eq("user_id", user.id).neq("status", "rejected").order("created_at", { ascending: false }).limit(5)
      ,client.from("signal_swarm_scores").select("score,signals_saved,best_combo,created_at,status").eq("user_id", user.id).neq("status", "rejected").order("created_at", { ascending: false }).limit(5)
      ,client.from("packet_siege_scores").select("score,wave,packets_destroyed,best_combo,created_at,status").eq("user_id", user.id).neq("status", "rejected").order("created_at", { ascending: false }).limit(5)
      ,client.from("byte_stack_scores").select("score,level,lines,best_combo,created_at,status").eq("user_id", user.id).neq("status", "rejected").order("created_at", { ascending: false }).limit(5)
      ,client.from("null_ninja_scores").select("score,distance,kills,best_combo,created_at,status").eq("user_id", user.id).neq("status", "rejected").order("created_at", { ascending: false }).limit(5)
      ,client.from("stick_fighter_scores").select("score,levels_cleared,hits_landed,created_at,status").eq("user_id", user.id).neq("status", "rejected").order("created_at", { ascending: false }).limit(5)
    ]);
    const rows = [
      ...(arena.data || []).map((row) => ({ game: "Byte Rush", score: row.score, result: `Wave ${row.wave}`, created_at: row.created_at })),
      ...(dash.data || []).map((row) => ({ game: "Glitch Dash", score: row.score, result: `Streak ${row.streak}`, created_at: row.created_at })),
      ...(symbolRuns.data || []).map((row) => ({ game: "Symbol Catch", score: row.score, result: `Streak ${row.best_streak}`, created_at: row.created_at }))
      ,...(snatchRuns.data || []).map((row) => ({ game: "Byte Snatch", score: row.score, result: `x${row.best_multiplier} multiplier`, created_at: row.created_at }))
      ,...(codebreakerRuns.data || []).map((row) => ({ game: "Codebreaker", score: row.score, result: `Level ${String(row.level || 0).padStart(2, "0")}`, created_at: row.created_at }))
      ,...(swarmRuns.data || []).map((row) => ({ game: "Signal Swarm", score: row.score, result: `${row.signals_saved} saved // x${row.best_combo}`, created_at: row.created_at }))
      ,...(packetRuns.data || []).map((row) => ({ game: "Packet Siege", score: row.score, result: `Wave ${row.wave} // ${row.packets_destroyed} packets`, created_at: row.created_at }))
      ,...(stackRuns.data || []).map((row) => ({ game: "Byte Stack", score: row.score, result: `Level ${row.level} // ${row.lines} lines`, created_at: row.created_at }))
      ,...(ninjaRuns.data || []).map((row) => ({ game: "Null Ninja", score: row.score, result: `${row.distance}m // ${row.kills} kills`, created_at: row.created_at }))
      ,...(fighterRuns.data || []).map((row) => ({ game: "Stick Fighter", score: row.score, result: `${row.levels_cleared || 0} levels // ${row.hits_landed} hits`, created_at: row.created_at }))
    ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 8);
    recent.innerHTML = rows.length ? rows.map((row) => `<tr><td>${row.game}</td><td>${format(row.score)}</td><td>${row.result}</td><td>${date(row.created_at)}</td></tr>`).join("") : '<tr><td colspan="4">No runs yet. Play a game to create your first result.</td></tr>';
    if (!byte.error && !glitch.error && (!user || !xp.error)) status.textContent = "Arena snapshot updated.";
  }
  client.auth.onAuthStateChange(() => window.setTimeout(load, 0));
  load().catch(() => { status.textContent = "Arena snapshot is temporarily unavailable."; });
})();

