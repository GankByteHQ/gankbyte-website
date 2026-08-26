(() => {
  const footer = document.querySelector(".footer-bottom");
  if (!footer) return;

  const existingSiteShell = document.querySelector('link[data-site-shell-style]');
  if (existingSiteShell) existingSiteShell.href = "/site-shell.css?v=8";
  if (!existingSiteShell) {
    const style = document.createElement("link");
    style.rel = "stylesheet";
    style.href = "/site-shell.css?v=8";
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
    const activePage = page === "arena.html" || page === "glitch-dash.html" || page === "arena-hub.html" ? "arena-hub.html"
      : page === "projects.html" || page === "contributing.html" || page === "project-submit.html" || page === "tools.html" || page === "fivem.html" || page === "fivem-tools.html" || page === "fivem-script-generator.html" ? "developers.html"
      : page === "challenges.html" ? "community.html"
      : page === "xp-admin.html" || page === "xp-submit.html" || page === "xp-leaderboard.html" ? "xp.html"
      : page;
    mainNav.querySelectorAll("a[aria-current]").forEach((link) => link.removeAttribute("aria-current"));
    mainNav.querySelectorAll("a").forEach((link) => {
      if (link.getAttribute("href") === activePage) link.setAttribute("aria-current", "page");
    });
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
        link.href = href;
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
      [[baseHref, "Developer Hub"], ["tools.html", "Tools"], ["fivem.html", "FiveM"], ["projects.html", "Public Projects"], ["contributing.html", "Contribute"], ["https://github.com/GankByteHQ", "GitHub"]].forEach(([href, label]) => {
        const link = document.createElement("a");
        link.href = href;
        link.textContent = label;
        if (href.startsWith("http")) { link.target = "_blank"; link.rel = "noreferrer"; }
        panel.append(link);
      });
      dropdown.append(summary, panel);
      developerLink.replaceWith(dropdown);
    }
    [["profile.html", "Profile"], ["account.html", "Account"], ["challenges.html", "Challenges"]].forEach(([href, label]) => {
      if (mainNav.querySelector(`a[href="${href}"]`)) return;
      const link = document.createElement("a");
      link.className = "mobile-nav-extra";
      link.href = href;
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

  const homeHero = document.querySelector("main > .hero");
  const homeLiveSection = document.querySelector(".live-games-section");
  if (homeHero && homeLiveSection) {
    if (!document.querySelector("[data-home-paths]")) {
      homeHero.insertAdjacentHTML("afterend", '<section class="home-paths shell" data-home-paths><div class="home-paths-heading"><p class="eyebrow">START HERE</p><h2>Play something.<br><em>Make something.</em></h2><p>Choose the part of GankByte that fits you today. You can switch lanes whenever you like.</p></div><div class="home-path-grid"><a class="home-path-card home-path-play" href="games.html"><span class="home-path-label">01 // PLAY</span><h3>Play</h3><p>Jump into short, replayable games and chase a better run.</p><span class="text-link">Open the games <span>&nearr;</span></span></a><a class="home-path-card home-path-build" href="developers.html"><span class="home-path-label">02 // BUILD</span><h3>Build</h3><p>Explore tools, public projects, and practical developer resources.</p><span class="text-link">Explore developer work <span>&nearr;</span></span></a><div class="home-path-card home-path-join"><span class="home-path-label">03 // JOIN</span><h3>Join</h3><p>Meet the community, share ideas, and help shape what gets built next.</p><div class="home-path-actions"><a class="button button-primary" href="https://discord.gg/CpWjZkjtjJ" target="_blank" rel="noreferrer">Join Discord <span>&nearr;</span></a><a class="text-link" href="https://discord.gg/CpWjZkjtjJ" target="_blank" rel="noreferrer">Test and give feedback <span>&nearr;</span></a></div></div></div></section>');
    }
    if (!document.querySelector("[data-home-paths-v2]")) {
      document.querySelector("[data-home-paths]")?.remove();
      homeHero.insertAdjacentHTML("afterend", '<section class="home-paths shell" data-home-paths-v2><div class="home-paths-heading"><p class="eyebrow">FIND YOUR LANE</p><h2>Play.<br><em>Build. Test.</em></h2><p>There is a useful place to start whether you want to play, create, or help improve what is already here.</p></div><div class="home-path-grid"><a class="home-path-card home-path-play" href="games.html"><span class="home-path-label">01 // PLAYER</span><h3>Player</h3><p>Play the live games, chase better runs, and save your progress through the Arena.</p><span class="text-link">Start playing <span>&nearr;</span></span></a><a class="home-path-card home-path-build" href="developers.html"><span class="home-path-label">02 // BUILDER</span><h3>Builder</h3><p>Use the tools, inspect public projects, and bring a small useful idea to GankByte.</p><span class="text-link">Start building <span>&nearr;</span></span></a><a class="home-path-card home-path-join" href="https://discord.gg/CpWjZkjtjJ" target="_blank" rel="noreferrer"><span class="home-path-label">03 // TESTER</span><h3>Tester</h3><p>Try new builds, report clear bugs, and help turn rough ideas into better releases.</p><span class="text-link">Test and give feedback <span>&nearr;</span></span></a></div></section><section class="home-proof shell" data-home-proof><div class="home-proof-join"><p class="eyebrow">REAL PEOPLE // REAL SIGNAL</p><h2>See why people<br><em>take part.</em></h2><p>Genuine player and developer reviews will appear here as the community shares its experience.</p><a class="button button-primary" href="https://discord.gg/CpWjZkjtjJ" target="_blank" rel="noreferrer">Join Discord <span>&nearr;</span></a></div><div class="home-review-grid"><article class="home-review-card"><span class="status-badge">PLAYER REVIEW</span><p class="home-review-empty">The first player review will appear here after a real community member shares one.</p></article><article class="home-review-card"><span class="status-badge">DEVELOPER REVIEW</span><p class="home-review-empty">The first developer review will appear here after a real contributor shares one.</p></article></div></section>');
    }
    if (!document.querySelector("[data-home-featured]")) {
      homeLiveSection.insertAdjacentHTML("beforebegin", '<section class="home-featured shell" data-home-featured><div class="home-featured-copy"><p class="eyebrow">FEATURED GAME // LIVE NOW</p><h2>Start with<br><em>Byte Rush.</em></h2><p>Best for quick runs, score chasing, and learning the GankByte Arena. Collect GankBytes, build your combo, grab power-ups, and survive the glitches for 60 seconds.</p><div class="hero-actions"><a class="button button-primary" href="arena.html?v=19">Play Byte Rush <span>&nearr;</span></a><a class="text-link" href="arena.html?v=19#leaderboard">View the leaderboard <span>&nearr;</span></a></div></div><div class="home-featured-art"><img src="byte-rush-thumb.svg" alt="Byte Rush neon arena with GankByte pickups and purple glitches"><span class="home-featured-note">BEST FOR<br><strong>FAST REPEATABLE RUNS</strong></span></div></section>');
    }
    const homeProof = document.querySelector("[data-home-proof]");
    if (homeProof && !homeProof.querySelector("[data-home-review-form]")) {
      homeProof.insertAdjacentHTML("beforeend", '<div class="home-review-submit" data-home-review-form><div><p class="eyebrow">SHARE YOUR EXPERIENCE</p><h3>Leave a review.</h3><p>Reviews are held for admin approval. Approved player and developer reviews appear publicly on this homepage.</p></div><form id="home-review-form"><label for="home-review-type">Review type</label><select id="home-review-type" name="review_type"><option value="player">Player review</option><option value="developer">Developer review</option></select><label for="home-review-text">Your review</label><textarea id="home-review-text" name="review_text" rows="4" minlength="20" maxlength="500" required placeholder="What did you play, build, or contribute? What should people know?"></textarea><div class="home-review-form-actions"><button class="button button-primary" id="home-review-submit" type="submit">Submit for approval <span>&nearr;</span></button><button class="button button-ghost" id="home-review-login" type="button" hidden>Sign in with Discord</button></div><p class="xp-status" id="home-review-status" aria-live="polite"></p></form></div>');
      initHomeReviews(homeProof);
    }
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = src;
      script.onload = resolve;
      script.onerror = reject;
      document.head.append(script);
    });
  }

  async function initHomeReviews(proof) {
    const escapeHomeText = (value) => String(value || "").replace(/[&<>'"]/g, (character) => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;","\"":"&quot;"}[character]));
    const form = proof.querySelector("#home-review-form");
    const text = proof.querySelector("#home-review-text");
    const submit = proof.querySelector("#home-review-submit");
    const login = proof.querySelector("#home-review-login");
    const status = proof.querySelector("#home-review-status");
    const grid = proof.querySelector(".home-review-grid");
    const setStatus = (value, error = false) => { status.textContent = value; status.classList.toggle("is-error", error); };
    try {
      if (!window.supabase) await loadScript("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2");
      if (!window.GANKBYTE_XP_CONFIG) await loadScript("/xp-config.js?v=1");
    } catch {
      setStatus("Reviews are temporarily unavailable.", true);
      return;
    }
    const config = window.GANKBYTE_XP_CONFIG || {};
    if (!config.supabaseUrl || !config.supabasePublishableKey || !window.supabase) {
      submit.disabled = true;
      setStatus("The review service is not configured yet.", true);
      return;
    }
    const client = window.supabase.createClient(config.supabaseUrl, config.supabasePublishableKey);
    const renderReviews = (rows) => {
      const fallback = (label) => '<article class="home-review-card"><span class="status-badge">' + label.toUpperCase() + ' REVIEW</span><p class="home-review-empty">The first ' + label.toLowerCase() + ' review will appear here after a real community member shares one.</p></article>';
      const byType = (type, label) => rows.filter((row) => row.review_type === type).slice(0, 2).map((row) => '<article class="home-review-card"><span class="status-badge">' + label.toUpperCase() + ' REVIEW</span><blockquote>“' + escapeHomeText(row.review_text) + '”</blockquote><cite>' + escapeHomeText(row.display_name) + '</cite></article>').join("") || fallback(label);
      grid.innerHTML = byType("player", "Player") + byType("developer", "Developer");
    };
    const loadReviews = async () => {
      const result = await client.from("community_reviews").select("review_type,display_name,review_text,created_at").eq("status", "approved").order("created_at", { ascending: false }).limit(8);
      if (result.error) { setStatus("Approved reviews could not be loaded.", true); return; }
      renderReviews(result.data || []);
    };
    const updateSession = async (session) => {
      const signedIn = Boolean(session?.user);
      submit.hidden = !signedIn;
      login.hidden = signedIn;
      if (!signedIn) setStatus("Sign in with Discord to submit a review. All reviews require admin approval.");
      else setStatus("Your review will remain private until an admin approves it.");
    };
    client.auth.onAuthStateChange((event, session) => window.setTimeout(() => updateSession(session), 0));
    const sessionResult = await client.auth.getSession();
    await updateSession(sessionResult.data.session);
    login.addEventListener("click", async () => {
      const result = await client.auth.signInWithOAuth({ provider: "discord", options: { redirectTo: window.location.href } });
      if (result.error) setStatus(result.error.message, true);
    });
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const session = (await client.auth.getSession()).data.session;
      if (!session?.user) { setStatus("Sign in with Discord before submitting a review.", true); return; }
      const profile = await client.from("profiles").select("display_name").eq("id", session.user.id).maybeSingle();
      const reviewText = text.value.trim();
      submit.disabled = true;
      const result = await client.from("community_reviews").insert({ user_id: session.user.id, review_type: form.review_type.value, display_name: profile.data?.display_name || "GankByte Player", review_text: reviewText, status: "pending" });
      submit.disabled = false;
      if (result.error) { setStatus(result.error.message, true); return; }
      form.reset();
      setStatus("Submitted for approval. It will appear here only after an admin publishes it.");
    });
    await loadReviews();
  }
})();
