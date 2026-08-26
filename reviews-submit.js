(function () {
  "use strict";

  const loginPanel = document.getElementById("review-login-panel");
  const loginButton = document.getElementById("review-login-button");
  const loginStatus = document.getElementById("review-login-status");
  const form = document.getElementById("review-submit-form");
  const signedIn = document.getElementById("review-signed-in");
  const typeField = document.getElementById("review-type");
  const textField = document.getElementById("review-text");
  const submitButton = document.getElementById("review-submit-button");
  const status = document.getElementById("review-submit-status");

  if (!form) return;

  let client;

  function setStatus(message, error) {
    status.textContent = message || "";
    status.classList.toggle("is-error", Boolean(error));
  }

  function setLoginStatus(message, error) {
    loginStatus.textContent = message || "";
    loginStatus.classList.toggle("is-error", Boolean(error));
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

  function renderAuthUser(user) {
    loginPanel.hidden = Boolean(user);
    form.hidden = !user;
    if (user) {
      const metadata = user.user_metadata || {};
      signedIn.textContent = "Signed in as " + (metadata.full_name || metadata.name || user.email || "GankByte member") + ".";
    }
  }

  async function refreshAuth() {
    if (window.GANKBYTE_AUTH?.client) client = window.GANKBYTE_AUTH.client;
    if (!client) return;
    const result = await client.auth.getSession();
    renderAuthUser(result.data && result.data.session ? result.data.session.user : null);
  }

  loginButton.addEventListener("click", async function () {
    loginButton.disabled = true;
    const result = await client.auth.signInWithOAuth({ provider: "discord", options: { redirectTo: window.location.href } });
    if (result.error) {
      loginButton.disabled = false;
      setLoginStatus(result.error.message, true);
    }
  });

  form.addEventListener("submit", async function (event) {
    event.preventDefault();
    setStatus("");
    submitButton.disabled = true;
    try {
      const sessionResult = await client.auth.getSession();
      const session = sessionResult.data && sessionResult.data.session;
      if (!session) throw new Error("Sign in with Discord before submitting a review.");
      const profileResult = await client.from("profiles").select("display_name").eq("id", session.user.id).maybeSingle();
      const metadata = session.user.user_metadata || {};
      const displayName = (profileResult.data && profileResult.data.display_name) || metadata.full_name || metadata.name || "GankByte member";
      const result = await client.from("community_reviews").insert({
        user_id: session.user.id,
        review_type: typeField.value,
        display_name: String(displayName).slice(0, 80),
        review_text: textField.value.trim(),
        status: "pending"
      });
      if (result.error) throw result.error;
      form.reset();
      setStatus("Submitted for approval. It will appear on Reviews after an admin publishes it.");
    } catch (error) {
      setStatus(error.message || "The review could not be submitted.", true);
    } finally {
      submitButton.disabled = false;
    }
  });

  (async function init() {
    try {
      window.addEventListener("gankbyte:auth-state", function (event) {
        client = event.detail.client || client;
        renderAuthUser(event.detail.user || null);
      });
      if (!window.supabase) await loadScript("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2");
      const config = window.GANKBYTE_XP_CONFIG;
      if (!config) throw new Error("GankByte connection settings are unavailable.");
      client = window.GANKBYTE_AUTH?.client || window.supabase.createClient(config.supabaseUrl, config.supabasePublishableKey);
      await refreshAuth();
      client.auth.onAuthStateChange(function () { refreshAuth(); });
    } catch (error) {
      loginButton.disabled = true;
      setLoginStatus("Review submission is temporarily unavailable.", true);
    }
  }());
}());
