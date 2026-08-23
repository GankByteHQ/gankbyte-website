(function () {
  "use strict";

  const config = window.GANKBYTE_XP_CONFIG || {};
  const configured = Boolean(config.supabaseUrl && config.supabasePublishableKey);
  const $ = (id) => document.getElementById(id);
  const loginButton = $("xp-login");
  const logoutButton = $("xp-logout");
  const submitPanel = $("xp-submit-panel");
  const status = $("xp-status");
  const badge = $("xp-connection-badge");
  const accountTitle = $("xp-account-title");
  const accountCopy = $("xp-account-copy");
  const total = $("xp-total");
  const level = $("xp-level");
  const adminLink = $("xp-admin-link");
  const leaderboardBody = $("leaderboard-body");
  const challengeSelect = $("xp-challenge-select");
  const badges = $("xp-badges");
  const contributionChallengeSlug = "community-contribution";
  const xpPage = document.body.dataset.xpPage || "overview";
  let client = null;
  let currentUser = null;
  let historyPanel = null;
  let challengePanel = null;
  let submissionHistoryRows = [];
  let submissionHistoryPage = 1;
  const submissionHistoryPageSize = 10;

  function setStatus(message, error) {
    status.textContent = message || "";
    status.classList.toggle("is-error", Boolean(error));
  }

  function setBadge(text, kind) {
    badge.textContent = text;
    badge.className = "status-badge" + (kind ? " " + kind : "");
  }

  function levelForXp(value) {
    const thresholds = [0, 250, 600, 1000, 1500, 2200, 3000, 4000, 5200, 6600];
    let current = 1;
    thresholds.forEach((threshold, index) => { if (value >= threshold) current = index + 1; });
    return String(current).padStart(2, "0");
  }

  function renderBadges(xp) {
    if (!badges) return;
    const earned = [
      ["First signal", xp >= 100],
      ["Playtester", xp >= 500],
      ["Builder", xp >= 1500],
      ["Core contributor", xp >= 3000]
    ];
    badges.innerHTML = earned.map(([label, active]) => `<span class="xp-badge${active ? " is-earned" : ""}">${active ? "Earned" : "Locked"} // ${label}</span>`).join("");
  }

  function renderChallengeOptions(challenges) {
    if (!challengeSelect) return;
    const current = challengeSelect.value || contributionChallengeSlug;
    const rows = challenges?.length ? challenges : [{ slug: contributionChallengeSlug, title: "Community contribution" }];
    challengeSelect.innerHTML = rows.map((challenge) => `<option value="${escapeHtml(challenge.slug)}">${escapeHtml(challenge.title)}</option>`).join("");
    challengeSelect.value = rows.some((challenge) => challenge.slug === current) ? current : rows[0].slug;
  }

  function escapeHtml(value) {
    return String(value || "").replace(/[&<>'"]/g, (character) => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;","\"":"&quot;"}[character]));
  }

  function renderLeaderboard(rows) {
    if (!leaderboardBody) return;
    if (!rows || !rows.length) {
      leaderboardBody.innerHTML = '<tr><td colspan="4">No approved XP yet. Be the first to submit.</td></tr>';
      return;
    }
    leaderboardBody.innerHTML = rows.map((row, index) => '<tr><td>' + (index + 1) + '</td><td>' + escapeHtml(row.display_name || "GankByte Player") + '</td><td>Level ' + levelForXp(row.xp_total || 0) + '</td><td>' + Number(row.xp_total || 0).toLocaleString() + '</td></tr>').join("");
  }

  function ensureHistoryPanel() {
    if (historyPanel) return historyPanel;
    historyPanel = document.createElement("section");
    historyPanel.className = "xp-submission-history content-card";
    historyPanel.innerHTML = '<div class="section-heading"><div><p class="eyebrow">YOUR SUBMISSIONS</p><h3>Proof and status.</h3></div><p class="section-intro">Pending, approved, and rejected contributions stay visible here so you always know what needs attention.</p></div><div class="leaderboard-wrap"><table class="leaderboard"><thead><tr><th>Challenge</th><th>Status</th><th>Reason</th><th>Date</th></tr></thead><tbody id="xp-submission-history-body"><tr><td colspan="4">Loading submissions...</td></tr></tbody></table></div><div class="xp-history-pagination" aria-label="Submission history pages"><span id="xp-history-page-label">Showing 0 submissions</span><div><button class="button button-ghost" id="xp-history-previous" type="button">Previous</button><button class="button button-ghost" id="xp-history-next" type="button">Next</button></div></div>';
    historyPanel.querySelector("#xp-history-previous").addEventListener("click", () => renderSubmissionHistory(submissionHistoryRows, submissionHistoryPage - 1));
    historyPanel.querySelector("#xp-history-next").addEventListener("click", () => renderSubmissionHistory(submissionHistoryRows, submissionHistoryPage + 1));
    submitPanel.parentElement.insertBefore(historyPanel, submitPanel.nextElementSibling);
    return historyPanel;
  }

  function renderSubmissionHistory(rows, page = 1) {
    const panel = ensureHistoryPanel();
    const body = panel.querySelector("#xp-submission-history-body");
    submissionHistoryRows = rows || [];
    const totalPages = Math.max(1, Math.ceil(submissionHistoryRows.length / submissionHistoryPageSize));
    submissionHistoryPage = Math.max(1, Math.min(page, totalPages));
    const start = (submissionHistoryPage - 1) * submissionHistoryPageSize;
    const visibleRows = submissionHistoryRows.slice(start, start + submissionHistoryPageSize);
    const label = panel.querySelector("#xp-history-page-label");
    const previous = panel.querySelector("#xp-history-previous");
    const next = panel.querySelector("#xp-history-next");
    if (label) label.textContent = submissionHistoryRows.length ? `Showing ${start + 1}-${Math.min(start + submissionHistoryPageSize, submissionHistoryRows.length)} of ${submissionHistoryRows.length}` : "Showing 0 submissions";
    if (previous) previous.disabled = submissionHistoryPage <= 1;
    if (next) next.disabled = submissionHistoryPage >= totalPages;
    if (!visibleRows.length) { body.innerHTML = '<tr><td colspan="4">No submissions yet. Your first useful contribution can start the record.</td></tr>'; return; }
    body.innerHTML = visibleRows.map((row) => {
      const statusText = row.status === "approved" ? "Approved" : row.status === "rejected" ? "Rejected" : "Pending";
      const reason = row.reviewer_note || (row.status === "pending" ? "Waiting for review" : row.status === "approved" ? "Added to XP" : "See moderation notes on your profile");
      return `<tr><td>${escapeHtml(row.challenge_slug === contributionChallengeSlug ? "Community contribution" : row.challenge_slug)}</td><td>${statusText}</td><td>${escapeHtml(reason)}</td><td>${new Date(row.created_at).toLocaleDateString(undefined, { day: "2-digit", month: "short" })}</td></tr>`;
    }).join("");
  }

  function ensureChallengePanel() {
    if (challengePanel) return challengePanel;
    challengePanel = document.createElement("section");
    challengePanel.className = "xp-challenge-progress content-card";
    challengePanel.innerHTML = '<div class="section-heading"><div><p class="eyebrow">CHALLENGE PROGRESS</p><h3>Targets and status.</h3></div><p class="section-intro">Your active challenge state is based on your latest submission.</p></div><div class="content-grid" id="xp-challenge-progress-grid"></div>';
    const panel = ensureHistoryPanel();
    panel.parentElement.insertBefore(challengePanel, panel);
    return challengePanel;
  }

  function renderChallengeProgress(challenges, submissions) {
    const panel = ensureChallengePanel();
    const grid = panel.querySelector("#xp-challenge-progress-grid");
    if (!challenges?.length) { grid.innerHTML = '<article class="content-card"><span class="status-badge">No challenge data</span><h3>Play from the Arena.</h3><p>Live game challenges are available from the Arena challenge board.</p><a class="text-link" href="challenges.html">Open challenges <span>&nearr;</span></a></article>'; return; }
    const latest = new Map();
    (submissions || []).forEach((row) => { if (!latest.has(row.challenge_slug)) latest.set(row.challenge_slug, row); });
    grid.innerHTML = challenges.map((challenge) => {
      const row = latest.get(challenge.slug);
      const state = row?.status || "not started";
      const badge = state === "approved" ? "Approved" : state === "pending" ? "Pending" : state === "rejected" ? "Needs update" : "Not started";
      const className = state === "rejected" ? "status-badge planned" : "status-badge";
      const detail = state === "approved" ? "Your latest proof was accepted." : state === "pending" ? "Your proof is waiting for review." : state === "rejected" ? (row.reviewer_note || "See moderation feedback on your profile.") : `Base award: ${Number(challenge.base_xp || 0).toLocaleString()} XP.`;
      return `<article class="content-card"><span class="${className}">${badge}</span><h3>${escapeHtml(challenge.title)}</h3><p>${escapeHtml(detail)}</p></article>`;
    }).join("");
  }

  async function loadLeaderboard() {
    if (!leaderboardBody) return;
    const result = await client.from("xp_leaderboard").select("display_name,xp_total").order("xp_total", { ascending: false }).limit(25);
    if (result.error) {
      leaderboardBody.innerHTML = '<tr><td colspan="4">The leaderboard is not available yet.</td></tr>';
      setStatus("The XP leaderboard is temporarily unavailable.", true);
      return;
    }
    renderLeaderboard(result.data);
  }

  async function loadAccount(user) {
    currentUser = user;
    if (!user) {
      setBadge("Discord login required");
      accountTitle.textContent = "GankByte XP account";
      accountCopy.textContent = "Sign in with Discord to submit contributions and track approved XP.";
      loginButton.hidden = false;
      logoutButton.hidden = true;
      if (submitPanel) submitPanel.hidden = true;
      adminLink.hidden = true;
      if (historyPanel) historyPanel.hidden = true;
      if (challengePanel) challengePanel.hidden = true;
      total.textContent = "0";
      level.textContent = "Level 01";
      renderBadges(0);
      renderChallengeOptions([]);
      return;
    }

    const profileResult = await client.from("profiles").select("display_name,is_admin").eq("id", user.id).maybeSingle();
    if (profileResult.error) { setStatus("Your profile could not be loaded. Try refreshing shortly.", true); return; }
    const profile = profileResult.data || {};
    const displayName = profile.display_name || user.user_metadata?.global_name || user.user_metadata?.full_name || "GankByte Player";
    const [ledgerResult, submissionsResult, challengesResult] = await Promise.all([
      client.from("xp_ledger").select("amount").eq("user_id", user.id),
      client.from("challenge_submissions").select("challenge_slug,status,reviewer_note,created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(500),
      client.from("challenges").select("slug,title,base_xp,bonus_xp").eq("active", true).order("created_at", { ascending: true })
    ]);
    const accountError = [ledgerResult, submissionsResult, challengesResult].find((result) => result?.error);
    if (accountError) setStatus("Some XP account data is temporarily unavailable. Try refreshing shortly.", true);
    const xp = (ledgerResult.data || []).reduce((sum, item) => sum + Number(item.amount || 0), 0);

    setBadge("Discord connected");
    accountTitle.textContent = displayName;
    accountCopy.textContent = "Your approved community XP is shown below.";
    loginButton.hidden = true;
    logoutButton.hidden = false;
    if (submitPanel) submitPanel.hidden = xpPage !== "submit";
    adminLink.hidden = !profile.is_admin;
    if (xpPage === "submit") {
      ensureHistoryPanel().hidden = false;
      ensureChallengePanel().hidden = false;
    }
    total.textContent = xp.toLocaleString();
    level.textContent = "Level " + levelForXp(xp);
    renderBadges(xp);
    renderChallengeOptions(challengesResult.data || []);
    if (xpPage === "submit") {
      renderSubmissionHistory(submissionsResult.data || []);
      renderChallengeProgress(challengesResult.data || [], submissionsResult.data || []);
    }
    if (window.location.hash === "#xp-submit-panel" || sessionStorage.getItem("gankbyte-xp-submit") === "1") {
      sessionStorage.removeItem("gankbyte-xp-submit");
      window.setTimeout(function () { submitPanel.scrollIntoView({ behavior: "smooth", block: "start" }); }, 100);
    }
  }

  async function init() {
    if (!configured || !window.supabase) {
      setBadge("Backend setup needed", "planned");
      accountTitle.textContent = "XP is ready to connect";
      accountCopy.textContent = "Discord login, submissions, and the leaderboard need the Supabase connection to load here.";
      loginButton.disabled = true;
      if (leaderboardBody) leaderboardBody.innerHTML = '<tr><td colspan="4">Backend setup is required before the leaderboard can load.</td></tr>';
      return;
    }

    client = window.supabase.createClient(config.supabaseUrl, config.supabasePublishableKey);
    setBadge("Connecting");
    client.auth.onAuthStateChange(function (event, session) {
      window.setTimeout(function () { loadAccount(session ? session.user : null); }, 0);
    });
    const sessionResult = await client.auth.getSession();
    if (sessionResult.error) setStatus(sessionResult.error.message, true);
    await loadAccount(sessionResult.data.session ? sessionResult.data.session.user : null);
    await loadLeaderboard();
  }

  loginButton.addEventListener("click", async function () {
    if (!client) return;
    setStatus("Opening Discord...");
    if (window.location.hash === "#xp-submit-panel") sessionStorage.setItem("gankbyte-xp-submit", "1");
    const result = await client.auth.signInWithOAuth({ provider: "discord", options: { redirectTo: window.location.origin + window.location.pathname } });
    if (result.error) setStatus(result.error.message, true);
  });

  logoutButton.addEventListener("click", async function () {
    if (!client) return;
    await client.auth.signOut();
    setStatus("Signed out.");
  });

  const submissionForm = $("xp-submission-form");
  submissionForm?.addEventListener("submit", async function (event) {
    event.preventDefault();
    if (!client || !currentUser) return;
    const proof = $("xp-proof").value.trim();
    const note = $("xp-note-input").value.trim();
    const challengeSlug = challengeSelect?.value || contributionChallengeSlug;
    const result = await client.from("challenge_submissions").insert({ user_id: currentUser.id, challenge_slug: challengeSlug, proof_url: proof, note: note || null });
    if (result.error) {
      const setupMessage = result.error.message.includes("challenge_submissions_challenge_slug_fkey") ? "XP setup is missing the Community Contribution challenge. An admin must run XP_MIGRATION_002.sql in Supabase." : result.error.message;
      setStatus(setupMessage, true);
      return;
    }
    event.target.reset();
    setStatus("Submitted. An admin will review it before XP is added.");
    const refreshed = await client.from("challenge_submissions").select("challenge_slug,status,reviewer_note,created_at").eq("user_id", currentUser.id).order("created_at", { ascending: false }).limit(500);
    renderSubmissionHistory(refreshed.data || []);
  });

  init().catch(function () {
    setBadge("Offline", "planned");
    setStatus("XP is temporarily unavailable. You can still play locally and try again later.", true);
    if (leaderboardBody) leaderboardBody.innerHTML = '<tr><td colspan="4">XP services are temporarily unavailable.</td></tr>';
  });
}());
