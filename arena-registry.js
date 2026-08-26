/* Shared Arena game adapter. Add a new game here before wiring its page or score view. */
window.GANKBYTE_ARENA_GAMES = {
  "byte-rush": { slug: "byte-rush", title: "Byte Rush", displayGame: "Byte Rush", url: "arena.html", scoreView: "arena_leaderboard", weeklyView: "arena_weekly_leaderboard", statLabel: "Wave", resultLabel: (value) => `Wave ${value}` },
  "glitch-dash": { slug: "glitch-dash", title: "Glitch Dash", displayGame: "Glitch Dash", url: "glitch-dash.html", scoreView: "glitch_dash_leaderboard", weeklyView: "glitch_dash_weekly_leaderboard", statLabel: "Streak", resultLabel: (value) => `Streak ${value}` },
  "symbol-catch": { slug: "symbol-catch", title: "Symbol Catch", displayGame: "Symbol Catch", url: "symbol-catch/", scoreView: "symbol_catch_leaderboard", weeklyView: "symbol_catch_weekly_leaderboard", statLabel: "Streak", resultLabel: (value) => `Streak ${value}` },
  "byte-snatch": { slug: "byte-snatch", title: "Byte Snatch", displayGame: "Byte Snatch", url: "byte-snatch.html", scoreView: "byte_snatch_leaderboard", weeklyView: "byte_snatch_weekly_leaderboard", statLabel: "Multiplier", resultLabel: (value) => `x${value} multiplier` },
  "codebreaker": { slug: "codebreaker", title: "Codebreaker", displayGame: "Codebreaker", url: "codebreaker/", scoreView: "codebreaker_leaderboard", statLabel: "Level", resultLabel: (value) => `Level ${value}` }
};

window.GANKBYTE_ARENA_ADAPTER = {
  get(slug) { return window.GANKBYTE_ARENA_GAMES?.[slug] || null; },
  fromDisplayName(name) { return Object.values(window.GANKBYTE_ARENA_GAMES || {}).find((game) => game.displayGame === name) || null; },
  playUrl(slug, eventSlug) {
    const game = this.get(slug) || this.fromDisplayName(slug);
    if (!game) return "games.html";
    return `${game.url}${eventSlug ? `?event=${encodeURIComponent(eventSlug)}` : ""}`;
  }
};

