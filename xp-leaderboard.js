(function () {
  "use strict";
  const body = document.querySelector("#leaderboard-body");
  const config = window.GANKBYTE_XP_CONFIG || {};
  const escapeHtml = (value) => String(value || "").replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", "\"": "&quot;" }[character]));
  const levelForXp = (value) => {
    const thresholds = [0, 250, 600, 1000, 1500, 2200, 3000, 4000, 5200, 6600];
    let level = 1;
    thresholds.forEach((threshold, index) => { if (value >= threshold) level = index + 1; });
    return String(level).padStart(2, "0");
  };
  async function load() {
    if (!config.supabaseUrl || !config.supabasePublishableKey || !window.supabase) {
      body.innerHTML = '<tr><td colspan="4">Connect the XP backend to load the leaderboard.</td></tr>';
      return;
    }
    const client = window.supabase.createClient(config.supabaseUrl, config.supabasePublishableKey);
    const result = await client.from("xp_leaderboard").select("display_name,xp_total").order("xp_total", { ascending: false }).limit(25);
    if (result.error) {
      body.innerHTML = '<tr><td colspan="4">The XP leaderboard is temporarily unavailable.</td></tr>';
      return;
    }
    body.innerHTML = result.data?.length ? result.data.map((row, index) => `<tr><td>${index + 1}</td><td>${escapeHtml(row.display_name || "GankByte Player")}</td><td>Level ${levelForXp(Number(row.xp_total || 0))}</td><td>${Number(row.xp_total || 0).toLocaleString()}</td></tr>`).join("") : '<tr><td colspan="4">No approved XP yet. Be the first to submit.</td></tr>';
  }
  load().catch(() => { body.innerHTML = '<tr><td colspan="4">The XP leaderboard is temporarily unavailable.</td></tr>'; });
}());
