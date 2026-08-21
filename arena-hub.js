(() => {
  "use strict";
  const config = window.GANKBYTE_XP_CONFIG || {};
  const $ = (id) => document.getElementById(id);
  const format = (value) => Number(value || 0).toLocaleString();
  const date = (value) => value ? new Date(value).toLocaleDateString(undefined, { day: "2-digit", month: "short" }) : "-";
  const recent = $("hub-recent-results");
  const status = $("hub-status");
  const events = $("hub-events");
  const escape = (value) => String(value || "").replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[character]));
  if (!config.supabaseUrl || !config.supabasePublishableKey || !window.supabase) {
    $("hub-byte-best").textContent = "Unavailable";
    $("hub-glitch-best").textContent = "Unavailable";
    status.textContent = "The Arena snapshot needs the XP backend connection.";
    return;
  }
  const client = window.supabase.createClient(config.supabaseUrl, config.supabasePublishableKey);
  async function load() {
    const sessionResult = await client.auth.getSession();
    const user = sessionResult.data?.session?.user || null;
    const [byte, glitch, xp, liveEvents, eventScores] = await Promise.all([
      client.from("arena_leaderboard").select("best_score,display_name").order("best_score", { ascending: false }).limit(1),
      client.from("glitch_dash_leaderboard").select("best_score,display_name").order("best_score", { ascending: false }).limit(1),
      user ? client.from("xp_leaderboard").select("xp_total").eq("id", user.id).maybeSingle() : Promise.resolve({ data: null }),
      client.from("arena_live_events").select("slug,title,game,description,rules_url,status,kind,starts_at,ends_at").order("starts_at", { ascending: true, nullsFirst: false }),
      client.from("arena_event_scores").select("event_slug,user_id,score,stat").order("score", { ascending: false }).limit(100)
    ]);
    if (byte.error || glitch.error || (user && xp.error) || liveEvents.error) {
      status.textContent = "Some Arena data is temporarily unavailable. You can still play both games.";
    }
    $("hub-byte-best").textContent = byte.data?.[0] ? format(byte.data[0].best_score) : "No runs yet";
    $("hub-byte-detail").textContent = byte.data?.[0] ? `Top score by ${byte.data[0].display_name || "GankByte Player"}` : "Be the first on the board";
    $("hub-glitch-best").textContent = glitch.data?.[0] ? format(glitch.data[0].best_score) : "No runs yet";
    $("hub-glitch-detail").textContent = glitch.data?.[0] ? `Top score by ${glitch.data[0].display_name || "GankByte Player"}` : "Be the first on the board";
    let eventNames = {};
    if (!eventScores.error && eventScores.data?.length) {
      const ids = [...new Set(eventScores.data.map((row) => row.user_id))];
      const profiles = await client.from("profiles").select("id,display_name").in("id", ids);
      eventNames = Object.fromEntries((profiles.data || []).map((profile) => [profile.id, profile.display_name]));
    }
    if (events && !liveEvents.error && liveEvents.data?.length) {
      events.innerHTML = liveEvents.data.map((event) => {
        const gameUrl = window.GANKBYTE_ARENA_ADAPTER?.playUrl(event.game) || (event.game === "Glitch Dash" ? "glitch-dash.html" : "arena.html");
        const kind = event.kind === "tournament" ? "Tournament" : "Live event";
        const playHref = gameUrl.includes("?") ? `${gameUrl}&event=${encodeURIComponent(event.slug)}` : `${gameUrl}?event=${encodeURIComponent(event.slug)}`;
        const standings = (eventScores.data || []).filter((row) => row.event_slug === event.slug).slice(0, 3);
        const board = standings.length ? `<ol class="event-standings">${standings.map((row) => `<li><span>${escape(eventNames[row.user_id] || "GankByte Player")}</span><strong>${format(row.score)}</strong></li>`).join("")}</ol>` : '<p class="section-copy">No scores posted yet. Be the first.</p>';
        const action = event.status === "live" ? `<a class="button button-primary" href="${playHref}">Play this event <span>&nearr;</span></a>` : '<span class="page-status">Opening soon. Solo runs remain available.</span>';
        return `<article class="content-card"><span class="status-badge${event.status === "upcoming" ? " planned" : ""}">${escape(kind)} // ${escape(event.status)}</span><h3>${escape(event.title)}</h3><p>${escape(event.description)}</p>${board}${action}${event.rules_url ? `<a class="text-link" href="${escape(event.rules_url)}" target="_blank" rel="noreferrer">View rules <span>&nearr;</span></a>` : ""}</article>`;
      }).join("");
    }
    if (!user) {
      $("hub-xp-total").textContent = "Sign in";
      $("hub-xp-detail").textContent = "Connect Discord for your progress.";
      status.textContent = "Global scores are live. Sign in with Discord to load your personal snapshot.";
      return;
    }
    $("hub-xp-total").textContent = `${format(xp.data?.xp_total)} XP`;
    $("hub-xp-detail").textContent = "Approved community progress";
    const [arena, dash] = await Promise.all([
      client.from("arena_scores").select("score,wave,created_at,status").eq("user_id", user.id).neq("status", "rejected").order("created_at", { ascending: false }).limit(5),
      client.from("glitch_dash_scores").select("score,streak,created_at,status").eq("user_id", user.id).neq("status", "rejected").order("created_at", { ascending: false }).limit(5)
    ]);
    const rows = [
      ...(arena.data || []).map((row) => ({ game: "Byte Rush", score: row.score, result: `Wave ${row.wave}`, created_at: row.created_at })),
      ...(dash.data || []).map((row) => ({ game: "Glitch Dash", score: row.score, result: `Streak ${row.streak}`, created_at: row.created_at }))
    ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 8);
    recent.innerHTML = rows.length ? rows.map((row) => `<tr><td>${row.game}</td><td>${format(row.score)}</td><td>${row.result}</td><td>${date(row.created_at)}</td></tr>`).join("") : '<tr><td colspan="4">No runs yet. Play a game to create your first result.</td></tr>';
    if (!byte.error && !glitch.error && (!user || !xp.error)) status.textContent = "Arena snapshot updated.";
  }
  client.auth.onAuthStateChange(() => window.setTimeout(load, 0));
  load().catch(() => { status.textContent = "Arena snapshot is temporarily unavailable."; });
})();
