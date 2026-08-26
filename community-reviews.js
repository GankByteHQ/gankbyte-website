(function () {
  "use strict";

  const grid = document.getElementById("community-review-grid");
  const form = document.getElementById("community-review-form");
  const typeField = document.getElementById("community-review-type");
  const textField = document.getElementById("community-review-text");
  const submitButton = document.getElementById("community-review-submit-button");
  const loginButton = document.getElementById("community-review-login");
  const status = document.getElementById("community-review-status");

  if (!grid || !form) return;

  let client;

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function setStatus(message, isError) {
    status.textContent = message || "";
    status.classList.toggle("is-error", Boolean(isError));
  }

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      const script = document.createElement("script");
      script.src = src;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  async function getClient() {
    if (!window.supabase) {
      await loadScript("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2");
    }

    const config = window.GANKBYTE_XP_CONFIG;
    if (!config || !config.supabaseUrl || !config.supabasePublishableKey) {
      throw new Error("GankByte connection settings are unavailable.");
    }

    return window.supabase.createClient(config.supabaseUrl, config.supabasePublishableKey);
  }

  function emptyCard(type) {
    const label = type === "player" ? "PLAYER REVIEW" : "DEVELOPER REVIEW";
    const copy = type === "player"
      ? "No approved player reviews yet."
      : "No approved developer reviews yet.";
    return '<article class="community-review-card"><span class="status-badge">' + label + '</span><p class="community-review-empty">' + copy + '</p></article>';
  }

  function reviewCard(review) {
    const label = review.review_type === "player" ? "PLAYER REVIEW" : "DEVELOPER REVIEW";
    const displayName = escapeHtml(review.display_name || "GankByte member");
    const text = escapeHtml(review.review_text);
    return '<article class="community-review-card"><span class="status-badge">' + label + '</span><blockquote>“' + text + '”</blockquote><cite>' + displayName + '</cite></article>';
  }

  async function loadReviews() {
    const result = await client
      .from("community_reviews")
      .select("review_type,display_name,review_text,created_at")
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(8);

    if (result.error) throw result.error;

    const reviews = result.data || [];
    const player = reviews.find(function (review) { return review.review_type === "player"; });
    const developer = reviews.find(function (review) { return review.review_type === "developer"; });
    grid.innerHTML = (player ? reviewCard(player) : emptyCard("player")) + (developer ? reviewCard(developer) : emptyCard("developer"));
  }

  async function updateAuthState() {
    const result = await client.auth.getSession();
    const session = result.data && result.data.session;
    submitButton.hidden = !session;
    loginButton.hidden = Boolean(session);
    textField.disabled = !session;
    typeField.disabled = !session;
    if (!session) setStatus("Sign in with Discord to submit a review.");
  }

  loginButton.addEventListener("click", async function () {
    setStatus("Opening Discord sign-in...");
    const result = await client.auth.signInWithOAuth({
      provider: "discord",
      options: { redirectTo: window.location.href }
    });
    if (result.error) setStatus(result.error.message, true);
  });

  form.addEventListener("submit", async function (event) {
    event.preventDefault();
    setStatus("");
    submitButton.disabled = true;

    try {
      const sessionResult = await client.auth.getSession();
      const session = sessionResult.data && sessionResult.data.session;
      if (!session) throw new Error("Sign in with Discord before submitting a review.");

      const profileResult = await client
        .from("profiles")
        .select("display_name")
        .eq("id", session.user.id)
        .maybeSingle();
      const metadata = session.user.user_metadata || {};
      const displayName = (profileResult.data && profileResult.data.display_name) || metadata.full_name || metadata.name || "GankByte member";

      const insertResult = await client.from("community_reviews").insert({
        user_id: session.user.id,
        review_type: typeField.value,
        display_name: String(displayName).slice(0, 80),
        review_text: textField.value.trim(),
        status: "pending"
      });
      if (insertResult.error) throw insertResult.error;

      form.reset();
      setStatus("Submitted for approval. It will appear here after an admin publishes it.");
    } catch (error) {
      setStatus(error.message || "The review could not be submitted.", true);
    } finally {
      submitButton.disabled = false;
    }
  });

  (async function init() {
    try {
      client = await getClient();
      await loadReviews();
      await updateAuthState();
      client.auth.onAuthStateChange(function () { updateAuthState(); });
    } catch (error) {
      submitButton.hidden = true;
      loginButton.hidden = true;
      setStatus("Reviews are temporarily unavailable.", true);
    }
  }());
}());
