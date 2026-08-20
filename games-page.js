 (async () => {
  "use strict";
  const config = window.GANKBYTE_XP_CONFIG || {};
  const cards = {
    byte: { key: "gankbyte-byte-rush-best", view: "arena_leaderboard", label: "Byte Rush" },
    glitch: { key: "gankbyte-glitch-dash-best", view: "glitch_dash_leaderboard", label: "Glitch Dash" }
  };
  const format = (value) => Number(value || 0).toLocaleString();
  Object.entries(cards).forEach(([name, card]) => {
    const target = document.querySelector(`[data-game-stat="${name}"]`);
    if (!target) return;
    const best = Number(window.localStorage.getItem(card.key) || 0);
    const lastPlayed = window.localStorage.getItem(name === "byte" ? "gankbyte-byte-rush-last-played" : "gankbyte-glitch-dash-last-played");
    const lastText = lastPlayed ? ` // Last played ${new Date(lastPlayed).toLocaleDateString(undefined, { day: "2-digit", month: "short" })}` : "";
    target.textContent = best ? `Personal best on this device: ${format(best)}${lastText}` : `Personal best: play your first run${lastText}`;
  });
  if (!config.supabaseUrl || !config.supabasePublishableKey || !window.supabase) return;
  const client = window.supabase.createClient(config.supabaseUrl, config.supabasePublishableKey);
  const sessionResult = await client.auth.getSession();
  const user = sessionResult.data?.session?.user || null;
  Object.entries(cards).forEach(async ([name, card]) => {
    const target = document.querySelector(`[data-game-stat="${name}"]`);
    if (!target) return;
    const result = await client.from(card.view).select("best_score").order("best_score", { ascending: false }).limit(1);
    if (!result.error && result.data?.[0]) target.textContent += ` // Global best: ${format(result.data[0].best_score)}`;
    if (user) {
      const table = name === "byte" ? "arena_scores" : "glitch_dash_scores";
      const own = await client.from(table).select("score,status").eq("user_id", user.id).neq("status", "rejected").order("score", { ascending: false }).limit(1);
      if (!own.error && own.data?.[0]) target.textContent += ` // Your account best: ${format(own.data[0].score)}`;
    }
  });
})();
