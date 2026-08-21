(() => {
  const footer = document.querySelector(".footer-bottom");
  if (!footer) return;

  if (!document.querySelector('link[data-site-shell-style]')) {
  const style = document.createElement("link");
    style.rel = "stylesheet";
    style.href = "site-shell.css?v=5";
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
      : page === "projects.html" || page === "contributing.html" || page === "project-submit.html" ? "developers.html"
      : page === "challenges.html" ? "community.html"
      : page === "xp-admin.html" ? "xp.html"
      : page;
    mainNav.querySelectorAll("a[aria-current]").forEach((link) => link.removeAttribute("aria-current"));
    mainNav.querySelectorAll("a").forEach((link) => {
      if (link.getAttribute("href") === activePage) link.setAttribute("aria-current", "page");
    });
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
    style.href = "site-auth.css?v=5";
    style.dataset.siteAuthStyle = "true";
    document.head.append(style);
  }
  if (!document.querySelector('script[data-site-auth]')) {
    const script = document.createElement("script");
    script.src = "site-auth.js?v=6";
    script.dataset.siteAuth = "true";
    document.body.append(script);
  }
})();
