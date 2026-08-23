(() => {
  "use strict";
  const config = window.GANKBYTE_XP_CONFIG || {};
  const $ = (id) => document.getElementById(id);
  const format = (value) => Number(value || 0).toLocaleString();
  const date = (value) => value ? new Date(value).toLocaleDateString(undefined, { day: "2-digit", month: "short" }) : "-";
  const recent = $("hub-recent-results");
  const status = $("hub-status");
  const escape = (value) => String(value || "").replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[character]));
  if (!config.supabaseUrl || !config.supabasePublishableKey || !window.supabase) {
    $("hub-byte-best").textContent = "Unavailable";
    $("hub-glitch-best").textContent = "Unavailable";
    if ($("hub-symbol-best")) $("hub-symbol-best").textContent = "Unavailable";
    status.textContent = "The Arena snapshot needs the XP backend connection.";
    return;
  }
  const client = window.supabase.createClient(config.supabaseUrl, config.supabasePublishableKey);
  async function load() {
    const sessionResult = await client.auth.getSession();
    const user = sessionResult.data?.session?.user || null;
    const [byte, glitch, symbol, xp] = await Promise.all([
      client.from("arena_leaderboard").select("best_score,display_name").order("best_score", { ascending: false }).limit(1),
      client.from("glitch_dash_leaderboard").select("best_score,display_name").order("best_score", { ascending: false }).limit(1),
      client.from("symbol_catch_leaderboard").select("best_score,display_name").order("best_score", { ascending: false }).limit(1),
      user ? client.from("xp_leaderboard").select("xp_total").eq("id", user.id).maybeSingle() : Promise.resolve({ data: null })
    ]);
    if (byte.error || glitch.error || symbol.error || (user && xp.error)) {
      status.textContent = "Some Arena data is temporarily unavailable. You can still play both Arena games.";
    }
    $("hub-byte-best").textContent = byte.data?.[0] ? format(byte.data[0].best_score) : "No runs yet";
    $("hub-byte-detail").textContent = byte.data?.[0] ? `Top score by ${byte.data[0].display_name || "GankByte Player"}` : "Be the first on the board";
    $("hub-glitch-best").textContent = glitch.data?.[0] ? format(glitch.data[0].best_score) : "No runs yet";
    $("hub-glitch-detail").textContent = glitch.data?.[0] ? `Top score by ${glitch.data[0].display_name || "GankByte Player"}` : "Be the first on the board";
    if ($("hub-symbol-best")) $("hub-symbol-best").textContent = symbol.data?.[0] ? format(symbol.data[0].best_score) : "No runs yet";
    if ($("hub-symbol-detail")) $("hub-symbol-detail").textContent = symbol.data?.[0] ? `Top score by ${symbol.data[0].display_name || "GankByte Player"}` : "Be the first on the board";
    if (!user) {
      $("hub-xp-total").textContent = "Sign in";
      $("hub-xp-detail").textContent = "Connect Discord for your progress.";
      status.textContent = "Global scores are live. Sign in with Discord to load your personal snapshot.";
      return;
    }
    $("hub-xp-total").textContent = `${format(xp.data?.xp_total)} XP`;
    $("hub-xp-detail").textContent = "Approved community progress";
    const [arena, dash, symbolRuns] = await Promise.all([
      client.from("arena_scores").select("score,wave,created_at,status").eq("user_id", user.id).neq("status", "rejected").order("created_at", { ascending: false }).limit(5),
      client.from("glitch_dash_scores").select("score,streak,created_at,status").eq("user_id", user.id).neq("status", "rejected").order("created_at", { ascending: false }).limit(5),
      client.from("symbol_catch_scores").select("score,best_streak,created_at,status").eq("user_id", user.id).neq("status", "rejected").order("created_at", { ascending: false }).limit(5)
    ]);
    const rows = [
      ...(arena.data || []).map((row) => ({ game: "Byte Rush", score: row.score, result: `Wave ${row.wave}`, created_at: row.created_at })),
      ...(dash.data || []).map((row) => ({ game: "Glitch Dash", score: row.score, result: `Streak ${row.streak}`, created_at: row.created_at })),
      ...(symbolRuns.data || []).map((row) => ({ game: "Symbol Catch", score: row.score, result: `Streak ${row.best_streak}`, created_at: row.created_at }))
    ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 8);
    recent.innerHTML = rows.length ? rows.map((row) => `<tr><td>${row.game}</td><td>${format(row.score)}</td><td>${row.result}</td><td>${date(row.created_at)}</td></tr>`).join("") : '<tr><td colspan="4">No runs yet. Play a game to create your first result.</td></tr>';
    if (!byte.error && !glitch.error && (!user || !xp.error)) status.textContent = "Arena snapshot updated.";
  }
  client.auth.onAuthStateChange(() => window.setTimeout(load, 0));
  load().catch(() => { status.textContent = "Arena snapshot is temporarily unavailable."; });
})();

