(() => {
  "use strict";

  const PAGE_SIZE = 10;

  function mount(table) {
    if (table.dataset.paginationReady === "true") return;
    const body = table.tBodies?.[0];
    if (!body) return;
    if (["profile-history", "profile-xp-history", "hub-recent-results"].includes(body.id)) return;

    table.dataset.paginationReady = "true";
    const pager = document.createElement("div");
    pager.className = "leaderboard-pagination";
    pager.hidden = true;
    pager.innerHTML = '<span class="leaderboard-pagination-status"></span><span class="leaderboard-pagination-actions"><button type="button" data-page-prev>Previous</button><button type="button" data-page-next>Next</button></span>';
    table.insertAdjacentElement("afterend", pager);

    let page = 0;
    const status = pager.querySelector(".leaderboard-pagination-status");
    const previous = pager.querySelector("[data-page-prev]");
    const next = pager.querySelector("[data-page-next]");

    function render() {
      const rows = [...body.rows].filter((row) => !row.querySelector("td[colspan]"));
      const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
      page = Math.min(page, pages - 1);
      rows.forEach((row, index) => {
        row.hidden = Math.floor(index / PAGE_SIZE) !== page;
      });
      pager.hidden = rows.length <= PAGE_SIZE;
      if (rows.length) {
        const start = page * PAGE_SIZE + 1;
        const end = Math.min((page + 1) * PAGE_SIZE, rows.length);
        status.textContent = `Showing ${start}-${end} of ${rows.length}`;
      } else {
        status.textContent = "";
      }
      previous.disabled = page === 0;
      next.disabled = page >= pages - 1;
    }

    previous.addEventListener("click", () => { if (page > 0) { page -= 1; render(); } });
    next.addEventListener("click", () => { page += 1; render(); });
    new MutationObserver(render).observe(body, { childList: true });
    render();
  }

  function scan() {
    document.querySelectorAll(".leaderboard-wrap table").forEach(mount);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", scan, { once: true });
  else scan();
  new MutationObserver(scan).observe(document.body, { childList: true, subtree: true });
})();
