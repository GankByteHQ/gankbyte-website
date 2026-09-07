(() => {
  "use strict";
  const status = document.querySelector("#launcher-status");
  const loginPanel = document.querySelector("#launcher-login");
  const scriptsGrid = document.querySelector("#launcher-scripts");
  function showEmpty(message) { scriptsGrid.innerHTML = `<div class="script-empty"><strong>No scripts published yet.</strong>${message}</div>`; }
  function renderScripts(scripts) {
    if (!scripts.length) { showEmpty("When a script is approved, it will appear here."); return; }
    scriptsGrid.innerHTML = scripts.map((script) => `
      <article class="script-card"><span class="status-badge">${script.version || "Ready"}</span><h3>${script.name}</h3><p>${script.description || "No description provided."}</p><span class="script-meta">${script.game || "GankByte client"} // ${script.status || "Published"}</span>
      ${script.download_url ? `<a class="button button-primary" href="${script.download_url}" target="_blank" rel="noreferrer">Download <span>&nearr;</span></a>` : ""}</article>
    `).join("");
  }
  async function loadScripts(client) {
    const result = await client.from("launcher_scripts").select("name,description,version,game,status,download_url").eq("is_published", true).order("created_at", { ascending:false });
    if (result.error) { showEmpty("The launcher database is not connected yet."); status.textContent = "Launcher setup in progress."; return; }
    renderScripts(result.data || []); status.textContent = `${(result.data || []).length} published script(s)`;
  }
  async function update(state) {
    if (!state?.client || !state.user) { loginPanel.hidden = false; scriptsGrid.innerHTML = ""; status.textContent = "Sign in with Discord to continue."; return; }
    loginPanel.hidden = true; status.textContent = "Loading available scripts..."; await loadScripts(state.client);
  }
  window.addEventListener("gankbyte:auth-state", (event) => update(event.detail));
  if (window.GANKBYTE_AUTH) update(window.GANKBYTE_AUTH);
})();
