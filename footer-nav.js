(() => {
  const footer = document.querySelector(".footer-bottom");
  if (!footer) return;

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
    ["brand.html", "Brand"],
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
    style.href = "site-auth.css?v=3";
    style.dataset.siteAuthStyle = "true";
    document.head.append(style);
  }
  if (!document.querySelector('script[data-site-auth]')) {
    const script = document.createElement("script");
    script.src = "site-auth.js?v=3";
    script.dataset.siteAuth = "true";
    document.body.append(script);
  }
})();
