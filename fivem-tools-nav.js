(() => {
  const grid = document.querySelector("main .content-grid");
  if (!grid || grid.querySelector('[data-fivem-tool="log-analyzer"]')) return;
  grid.insertAdjacentHTML("beforeend", '<article class="content-card" data-fivem-tool="log-analyzer"><span class="status-badge">Live tool</span><h3>Server Log Analyzer</h3><p>Paste a FiveM console log or text-based crash report and find script failures, missing resources, database errors, and repeated warnings locally.</p><ul><li>Crash and fatal-exception detection</li><li>Resource and file hints</li><li>Repeated-message grouping</li><li>Copyable summary and JSON report</li></ul><a class="button button-primary" href="fivem-server-log-analyzer.html">Open log analyzer <span>&nearr;</span></a></article>');
})();
