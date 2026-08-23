 (async () => {
  "use strict";
  const config = window.GANKBYTE_XP_CONFIG || {};
  const cards = {
    byte: { bestKey: "gankbyte-byte-rush-best", lastPlayedKey: "gankbyte-byte-rush-last-played", view: "arena_leaderboard", table: "arena_scores", label: "Byte Rush" },
    glitch: { bestKey: "gankbyte-glitch-dash-best", lastPlayedKey: "gankbyte-glitch-dash-last-played", view: "glitch_dash_leaderboard", table: "glitch_dash_scores", label: "Glitch Dash" },
    symbol: { bestKey: "gankbyte-symbol-catch-best", lastPlayedKey: "gankbyte-symbol-catch-last-played", view: "symbol_catch_leaderboard", table: "symbol_catch_scores", label: "Symbol Catch" },
    codebreaker: { bestKey: "gankbyte-codebreaker-best", lastPlayedKey: "gankbyte-codebreaker-last-played", label: "Codebreaker" }
  };
  const format = (value) => Number(value || 0).toLocaleString();
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

