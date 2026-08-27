(() => {
  const footer = document.querySelector(".footer-bottom");
  if (!footer) return;

  const existingSiteShell = document.querySelector('link[data-site-shell-style]');
  if (existingSiteShell) existingSiteShell.href = "/site-shell.css?v=10";
  if (!existingSiteShell) {
    const style = document.createElement("link");
    style.rel = "stylesheet";
    style.href = "/site-shell.css?v=10";
    style.dataset.siteShellStyle = "true";
    document.head.append(style);
  }

  const main = document.querySelector("main");
  if (main && !main.id) main.id = "main-content";
  if (main && !document.querySelector(".skip-link")) {
    const skip = document.createElement("a");
    skip.className = "skip-link";
    skip.href = "#main-content";
    skip.textContent = "Skip to content";
    document.body.prepend(skip);
  }

  const header = document.querySelector(".site-header");
  const mainNav = header?.querySelector(".site-nav");
  if (header && mainNav && !header.querySelector(".mobile-nav-toggle")) {
    const page = window.location.pathname.split("/").pop() || "index.html";
    const nestedGamePage = /\/(?:codebreaker|symbol-catch)\//.test(window.location.pathname);
    const navPath = (href) => href.startsWith("http") || href.startsWith("/") || href.startsWith("../") ? href : `${nestedGamePage ? "../" : ""}${href}`;
    const activePage = page === "arena.html" || page === "glitch-dash.html" || page === "arena-hub.html" ? "arena-hub.html"
      : page === "projects.html" || page === "contributing.html" || page === "project-submit.html" || page === "tools.html" || page === "docs.html" || page === "code-library.html" || page === "compatibility.html" || page === "fivem.html" || page === "fivem-tools.html" || page === "fivem-script-generator.html" ? "developers.html"
      : page === "challenges.html" ? "community.html"
      : page === "reviews-submit.html" ? "reviews.html"
      : page === "xp-admin.html" || page === "xp-submit.html" || page === "xp-leaderboard.html" ? "xp.html"
      : page;
    mainNav.querySelectorAll("a[aria-current]").forEach((link) => link.removeAttribute("aria-current"));
    mainNav.querySelectorAll("a").forEach((link) => {
      if (link.getAttribute("href") === activePage) link.setAttribute("aria-current", "page");
    });
    const reviewsLink = mainNav.querySelector('a[href$="reviews.html"]');
    if (!reviewsLink) {
      const link = document.createElement("a");
      link.href = navPath("reviews.html");
      link.textContent = "Reviews";
      if (activePage === "reviews.html") link.setAttribute("aria-current", "page");
      const xpTarget = mainNav.querySelector('a[href$="xp.html"], .site-nav-dropdown');
      mainNav.insertBefore(link, xpTarget || null);
    }
    const reviewNavLink = mainNav.querySelector('a[href$="reviews.html"]');
    if (reviewNavLink && !reviewNavLink.parentElement.classList.contains("site-nav-dropdown")) {
      const baseHref = reviewNavLink.getAttribute("href");
      const dropdown = document.createElement("details");
      dropdown.className = "site-nav-dropdown";
      const summary = document.createElement("summary");
      summary.textContent = "Reviews";
      if (reviewNavLink.getAttribute("aria-current")) summary.setAttribute("aria-current", "page");
      const panel = document.createElement("div");
      panel.className = "site-nav-dropdown-panel";
      [[baseHref, "View Reviews"], [baseHref.replace("reviews.html", "reviews-submit.html"), "Submit a Review"]].forEach(([href, label]) => {
        const link = document.createElement("a");
        link.href = navPath(href);
        link.textContent = label;
        panel.append(link);
      });
      dropdown.append(summary, panel);
      reviewNavLink.replaceWith(dropdown);
    }
    const xpLink = mainNav.querySelector('a[href$="xp.html"]');
    if (xpLink && !xpLink.parentElement.classList.contains("site-nav-dropdown")) {
      const baseHref = xpLink.getAttribute("href");
      const dropdown = document.createElement("details");
      dropdown.className = "site-nav-dropdown";
      const summary = document.createElement("summary");
      summary.textContent = "XP";
      if (xpLink.getAttribute("aria-current")) summary.setAttribute("aria-current", "page");
      const panel = document.createElement("div");
      panel.className = "site-nav-dropdown-panel";
      [[baseHref, "Overview"], [baseHref.replace("xp.html", "xp-submit.html"), "Submit Contribution"], [baseHref.replace("xp.html", "xp-leaderboard.html"), "Leaderboard"]].forEach(([href, label]) => {
        const link = document.createElement("a");
        link.href = navPath(href);
        link.textContent = label;
        panel.append(link);
      });
      dropdown.append(summary, panel);
      xpLink.replaceWith(dropdown);
    }
    const developerLink = mainNav.querySelector('a[href$="developers.html"]');
    if (developerLink && !developerLink.parentElement.classList.contains("site-nav-dropdown")) {
      const baseHref = developerLink.getAttribute("href");
      const dropdown = document.createElement("details");
      dropdown.className = "site-nav-dropdown";
      const summary = document.createElement("summary");
      summary.textContent = "Developers";
      if (developerLink.getAttribute("aria-current")) summary.setAttribute("aria-current", "page");
      const panel = document.createElement("div");
      panel.className = "site-nav-dropdown-panel";
      [[baseHref, "Developer Hub"], ["docs.html", "Docs"], ["code-library.html", "Code Library"], ["compatibility.html", "Compatibility"], ["tools.html", "Tools"], ["fivem.html", "FiveM"], ["projects.html", "Public Projects"], ["contributing.html", "Contribute"], ["project-submit.html", "Submit a Project"], ["https://github.com/GankByteHQ", "GitHub"]].forEach(([href, label]) => {
        const link = document.createElement("a");
        link.href = href.startsWith("http") ? href : navPath(href);
        link.textContent = label;
        if (href.startsWith("http")) { link.target = "_blank"; link.rel = "noreferrer"; }
        panel.append(link);
      });
      dropdown.append(summary, panel);
      developerLink.replaceWith(dropdown);
    }
    const existingReviewsDropdown = [...mainNav.querySelectorAll(".site-nav-dropdown")].find((item) => item.querySelector("summary")?.textContent.trim() === "Reviews");
    existingReviewsDropdown?.remove();
    function makeNavDropdown(selector, label, items, activePages) {
      const link = mainNav.querySelector(selector);
      if (!link || link.parentElement.classList.contains("site-nav-dropdown")) return;
      const dropdown = document.createElement("details");
      dropdown.className = "site-nav-dropdown";
      const summary = document.createElement("summary");
      summary.textContent = label;
      if (link.getAttribute("aria-current") || activePages.includes(activePage)) summary.setAttribute("aria-current", "page");
      const panel = document.createElement("div");
      panel.className = "site-nav-dropdown-panel";
      items.forEach(([href, itemLabel]) => {
        const item = document.createElement("a");
        item.href = href.startsWith("http") ? href : navPath(href);
        item.textContent = itemLabel;
        if (href.startsWith("http")) { item.target = "_blank"; item.rel = "noreferrer"; }
        panel.append(item);
      });
      dropdown.append(summary, panel);
      link.replaceWith(dropdown);
    }
    makeNavDropdown('a[href$="games.html"]', "Games", [
      ["games.html", "Games Hub"],
      ["arena.html?v=19", "Byte Rush"],
      ["glitch-dash.html?v=8", "Glitch Dash"],
      ["symbol-catch/", "Symbol Catch"],
      ["codebreaker/", "Codebreaker"],
      ["byte-snatch.html", "Byte Snatch"]
    ], ["games.html"]);
    makeNavDropdown('a[href$="arena-hub.html"]', "Arena", [
      ["arena-hub.html", "Arena Hub"],
      ["arena.html?v=19#leaderboard", "Leaderboards"],
      ["profile.html", "Player Profile"],
      ["challenges.html", "Challenges"]
    ], ["arena-hub.html"]);
    makeNavDropdown('a[href$="community.html"]', "Community", [
      ["community.html", "Community Hub"],
      ["https://discord.gg/CpWjZkjtjJ", "Join Discord"],
      ["reviews.html", "Reviews"],
      ["reviews-submit.html", "Submit a Review"],
      ["contact.html", "Give Feedback"],
      ["rules.html", "Rules"]
    ], ["community.html", "reviews.html", "reviews-submit.html", "contact.html", "rules.html"]);
    [["profile.html", "Profile"], ["account.html", "Account"], ["challenges.html", "Challenges"]].forEach(([href, label]) => {
      if (mainNav.querySelector(`a[href="${href}"]`)) return;
      const link = document.createElement("a");
      link.className = "mobile-nav-extra";
      link.href = navPath(href);
      link.textContent = label;
      mainNav.append(link);
    });
    const mobileAuth = document.createElement("button");
    mobileAuth.className = "mobile-nav-auth mobile-nav-extra";
    mobileAuth.id = "mobile-nav-auth";
    mobileAuth.type = "button";
    mobileAuth.textContent = "Sign in with Discord";
    mainNav.append(mobileAuth);
    const toggle = document.createElement("button");
    toggle.className = "mobile-nav-toggle";
    toggle.type = "button";
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-controls", "site-mobile-nav");
    toggle.innerHTML = '<span class="mobile-nav-icon" aria-hidden="true"><i></i><i></i><i></i></span><span>Menu</span>';
    mainNav.id = "site-mobile-nav";
    header.insertBefore(toggle, header.querySelector(".site-account, .header-cta"));
    const close = (returnFocus = false) => { mainNav.classList.remove("is-open"); toggle.setAttribute("aria-expanded", "false"); if (returnFocus) toggle.focus(); };
    toggle.addEventListener("click", () => {
      const open = mainNav.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", String(open));
      if (open) mainNav.querySelector("a")?.focus();
    });
    mainNav.addEventListener("click", (event) => { if (event.target.closest("a")) close(); });
    document.addEventListener("click", (event) => { if (!header.contains(event.target)) close(); });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && mainNav.classList.contains("is-open")) { event.preventDefault(); close(true); return; }
      if (event.key !== "Tab" || !mainNav.classList.contains("is-open")) return;
      const focusable = [...mainNav.querySelectorAll("a,button")].filter((item) => !item.hidden && item.offsetParent !== null);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    });
  }

  const siteFooter = footer.closest(".site-footer");
  const footerTop = siteFooter?.querySelector(".footer-top");
  const footerBrand = footerTop?.querySelector(":scope > .brand");
  if (footerBrand) {
    footerBrand.setAttribute("aria-label", "GankByte home");
    footerBrand.innerHTML = '<span class="brand-mark">GB</span><span>GANKBYTE</span>';
  }
  if (footerTop && !footerTop.querySelector(":scope > p:not(.footer-motto)")) {
    const tagline = document.createElement("p");
    tagline.textContent = "Gaming. Memes. Code.";
    footerTop.insertBefore(tagline, footerTop.querySelector(":scope > .footer-motto"));
  }

  const socialLinks = [
    ["https://x.com/GankByte", "X"],
    ["https://discord.gg/CpWjZkjtjJ", "Discord"],
    ["https://www.youtube.com/@GankByte", "YouTube"],
    ["https://www.tiktok.com/@GankByte", "TikTok"],
    ["https://www.instagram.com/GankByte", "Instagram"],
    ["https://www.reddit.com/user/GankByteHQ", "Reddit"],
    ["https://github.com/GankByteHQ", "GitHub"]
  ];
  let social = footer.querySelector(":scope > .social-links:not(.footer-utility-links)");
  if (!social) {
    social = document.createElement("div");
    social.className = "social-links";
    footer.prepend(social);
  }
  social.replaceChildren(...socialLinks.map(([href, label]) => {
    const link = document.createElement("a");
    link.href = href;
    link.target = "_blank";
    link.rel = "noreferrer";
    link.textContent = label;
    return link;
  }));

  if (footer.querySelector("[data-footer-utility]")) return;

  for (const child of [...footer.children]) {
    if (child.matches("span") && child.querySelector('a[href="rules.html"], a[href="privacy.html"], a[href="terms.html"]')) {
      child.remove();
    }
  }

  const links = [
    ["profile.html", "Profile"],
    ["account.html", "Account"],
    ["challenges.html", "Challenges"],
    ["contributing.html", "Contribute"],
    ["project-submit.html", "Submit a project"],
    ["brand.html", "Brand"],
    ["changelog.html", "Changelog"],
    ["token.html", "Token status"],
    ["contact.html", "Contact"],
    ["rules.html", "Rules"],
    ["privacy.html", "Privacy"],
    ["terms.html", "Terms"]
  ];
  const nav = document.createElement("nav");
  nav.className = "social-links footer-utility-links";
  nav.dataset.footerUtility = "true";
  nav.setAttribute("aria-label", "Site information");
  for (const [href, label] of links) {
    const link = document.createElement("a");
    link.href = href;
    link.textContent = label;
    nav.append(link);
  }
  footer.append(nav);

  if (!document.querySelector('link[data-site-auth-style]')) {
    const style = document.createElement("link");
    style.rel = "stylesheet";
    style.href = "/site-auth.css?v=5";
    style.dataset.siteAuthStyle = "true";
    document.head.append(style);
  }
  if (!document.querySelector('script[data-site-auth]')) {
    const script = document.createElement("script");
    script.src = "/site-auth.js?v=6";
    script.dataset.siteAuth = "true";
    document.body.append(script);
  }

  const homeGames = document.querySelector(".live-games-section .live-games-grid");
  if (homeGames && /^(?:index\.html)?$/.test(window.location.pathname.split("/").pop())) {
    const codebreakerCard = [...homeGames.querySelectorAll(".live-game-card")].find((card) => card.querySelector("h3")?.textContent.trim() === "Codebreaker");
    codebreakerCard?.querySelector("ul")?.remove();
    codebreakerCard?.querySelector('[data-game-stat="codebreaker"]')?.remove();
  }
  if (homeGames && !homeGames.querySelector('[data-home-game="byte-snatch"]')) {
    homeGames.insertAdjacentHTML("beforeend", '<article class="live-game-card" data-home-game="byte-snatch"><img class="game-thumb" src="byte-snatch-thumb.svg" alt="Byte Snatch risk and reward arena" /><div class="live-game-card-body"><span class="status-badge">Live // Risk runs</span><h3>Byte Snatch</h3><p>Collect Bytes, build your multiplier, bank the score, and survive the glitches before they gank you.</p><div class="hero-actions"><a class="button button-primary" href="byte-snatch.html">Play Byte Snatch <span>&nearr;</span></a><a class="text-link" href="byte-snatch.html#leaderboard">Leaderboard <span>&nearr;</span></a></div></div></article>');
    const heading = document.querySelector(".live-games-section .section-heading h2");
    if (heading) heading.innerHTML = "Five games.<br><em>Start here.</em>";
  }

  const toolsGrid = document.querySelector("main .content-grid");
  if (window.location.pathname.endsWith("/tools.html") && toolsGrid && !toolsGrid.querySelector('[data-tool-card="nui"]')) {
    toolsGrid.insertAdjacentHTML("beforeend", '<article class="content-card" data-tool-card="nui"><span class="status-badge">Live tool</span><h3>NUI Developer Toolkit</h3><p>Trace a FiveM NUI resource locally and find broken paths, missing assets, callback mismatches, and silent message-action failures.</p><ul><li>fxmanifest.lua and ui_page checks</li><li>HTML, CSS, JavaScript, Lua, and asset mapping</li><li>Browser callback and SendNUIMessage checks</li><li>Safe static NUI preview</li><li>No source upload</li></ul><a class="button button-primary" href="nui-developer-toolkit.html">Open NUI toolkit <span>&nearr;</span></a></article>');
  }
  if (window.location.pathname.endsWith("/fivem.html") && toolsGrid && !toolsGrid.querySelector('[data-tool-card="nui"]')) {
    toolsGrid.insertAdjacentHTML("beforeend", '<article class="content-card" data-tool-card="nui"><span class="status-badge">Live tool</span><h3>NUI Developer Toolkit</h3><p>Trace a FiveM NUI resource locally and find broken paths, missing assets, callback mismatches, and silent message-action failures.</p><ul><li>fxmanifest.lua and ui_page checks</li><li>HTML, CSS, JavaScript, Lua, and asset mapping</li><li>Browser callback and SendNUIMessage checks</li><li>Safe static NUI preview</li><li>No source upload</li></ul><a class="button button-primary" href="nui-developer-toolkit.html">Open NUI toolkit <span>&nearr;</span></a></article>');
  }
  const luaCard = '<article class="content-card" data-tool-card="lua"><span class="status-badge">Live tool</span><h3>Lua Resource Inspector</h3><p>Inspect a FiveM or Lua resource locally for missing files, broken requires, duplicate events, unsafe loops, NUI mismatches, and exposed secrets.</p><ul><li>Folder, ZIP, or paste input</li><li>Manifest and dependency checks</li><li>Event, export, and callback mapping</li><li>Actionable fixes with file locations</li><li>No source upload</li></ul><a class="button button-primary" href="lua-resource-inspector.html">Open Lua inspector <span>&nearr;</span></a></article>';
  if (window.location.pathname.endsWith("/tools.html") && toolsGrid && !toolsGrid.querySelector('[data-tool-card="lua"]')) {
    toolsGrid.insertAdjacentHTML("beforeend", luaCard);
  }
  if (window.location.pathname.endsWith("/fivem.html") && toolsGrid && !toolsGrid.querySelector('[data-tool-card="lua"]')) {
    toolsGrid.insertAdjacentHTML("beforeend", luaCard);
  }
  if (window.location.pathname.endsWith("/tools.html") && toolsGrid && !toolsGrid.querySelector('[data-tool-card="api"]')) {
    toolsGrid.insertAdjacentHTML("beforeend", '<article class="content-card" data-tool-card="api"><span class="status-badge">Live tool</span><h3>API Request Builder</h3><p>Compose HTTP requests, inspect responses, and copy starter snippets for JavaScript, Python, Lua, and Java.</p><ul><li>Headers, query parameters, JSON bodies</li><li>Status, timing, size, and response headers</li><li>cURL and code snippets</li><li>Direct browser requests with CORS explained</li><li>No request history or secrets are stored</li></ul><a class="button button-primary" href="api-request-builder.html">Open API builder <span>&nearr;</span></a></article>');
  }
  if (window.location.pathname.endsWith("/tools.html") && toolsGrid && !toolsGrid.querySelector('[data-tool-card="sql"]')) {
    toolsGrid.insertAdjacentHTML("beforeend", '<article class="content-card" data-tool-card="sql"><span class="status-badge">Live tool</span><h3>SQL Builder</h3><p>Build and format common PostgreSQL, MySQL, and SQLite queries locally before you run them.</p><ul><li>SELECT, INSERT, UPDATE, DELETE, and CREATE TABLE</li><li>JOIN, filters, ordering, and limits</li><li>Safety warnings for broad updates and deletes</li><li>Copy or download generated SQL</li></ul><a class="button button-primary" href="sql-builder.html">Open SQL builder <span>&nearr;</span></a></article>');
  }
  if (window.location.pathname.endsWith("/tools.html") && toolsGrid && !toolsGrid.querySelector('[data-tool-card="health"]')) {
    toolsGrid.insertAdjacentHTML("beforeend", '<article class="content-card" data-tool-card="health"><span class="status-badge">Live tool</span><h3>Project Health Scanner</h3><p>Check whether a project is ready to share by reviewing documentation, licensing, tests, secrets, and platform markers locally.</p><ul><li>Folder or file selection in the browser</li><li>Release-readiness score with evidence</li><li>Copyable and downloadable report</li><li>No source upload</li></ul><a class="button button-primary" href="project-health.html">Open health scanner <span>&nearr;</span></a></article>');
  }
  if (window.location.pathname.endsWith("/tools.html") && toolsGrid && !toolsGrid.querySelector('[data-tool-card="readme"]')) {
    toolsGrid.insertAdjacentHTML("beforeend", '<article class="content-card" data-tool-card="readme"><span class="status-badge">Live tool</span><h3>README Generator</h3><p>Create practical documentation for installation, dependencies, configuration, commands, troubleshooting, licensing, and contribution.</p><ul><li>FiveM, Lua, Python, JavaScript, TypeScript, Java, Minecraft, RuneLite, and SQL</li><li>Copy or download Markdown</li><li>Useful sections with honest placeholders</li><li>Runs locally</li></ul><a class="button button-primary" href="readme-generator.html">Open README generator <span>&nearr;</span></a></article>');
  }

  if (window.location.pathname.endsWith("/tools.html") && toolsGrid && !toolsGrid.querySelector('[data-tool-card="packager"]')) {
    toolsGrid.insertAdjacentHTML("beforeend", '<article class="content-card" data-tool-card="packager"><span class="status-badge">Live tool</span><h3>Project Release Packager</h3><p>Review a project locally, exclude common generated folders and secrets, and download a cleaner release ZIP.</p><ul><li>Folder or multi-file selection</li><li>Secret-looking filenames and content flagged</li><li>Release checklist added to the bundle</li><li>No source upload</li></ul><a class="button button-primary" href="release-packager.html">Open release packager <span>&nearr;</span></a></article>');
  }
})();
