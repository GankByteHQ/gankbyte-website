const projects = [
  { eyebrow: "PLAY", title: "GankByte Arena", copy: "Short matches, challenges, leaderboards, and community events built around games people actually want to play.", accent: "lime" },
  { eyebrow: "BUILD", title: "GankByte Labs", copy: "A home for weird prototypes, Lua experiments, tools, and community-made projects that deserve a real test run.", accent: "purple" },
  { eyebrow: "SHARE", title: "GankByte Events", copy: "Gaming nights, dev challenges, meme contests, and tournaments with bragging rights on the line.", accent: "orange" },
];

const channels = ["gaming-chat", "memes", "lua", "projects", "events"];

export default function Home() {
  return (
    <main>
      <nav className="nav shell" aria-label="Main navigation">
        <a className="brand" href="#top" aria-label="GankByte home"><span className="brand-mark">GB</span><span>GANKBYTE</span></a>
        <div className="nav-links"><a href="#projects">Projects</a><a href="#community">Community</a><a href="#build">Build with us</a></div>
        <a className="nav-cta" href="https://github.com/GankByteHQ" target="_blank" rel="noreferrer">GitHub <span aria-hidden="true">↗</span></a>
      </nav>

      <section className="hero shell" id="top">
        <div className="hero-copy">
          <p className="kicker"><span className="status-dot" /> GAMING COMMUNITY // DEV ECOSYSTEM</p>
          <h1>Build things.<br /><span>Break things.</span><br />Play them anyway.</h1>
          <p className="hero-lede">GankByte is a gaming community for players, creators, and developers building stupidly fun things together.</p>
          <div className="hero-actions"><a className="button button-primary" href="#community">Join the community <span aria-hidden="true">→</span></a><a className="button button-ghost" href="#projects">Explore projects</a></div>
          <div className="hero-meta"><span>PC GAMING</span><span>MEMES</span><span>LUA / DEV</span><span>COMMUNITY BUILT</span></div>
        </div>
        <div className="hero-art" aria-label="GankByte identity graphic">
          <div className="scanline" /><div className="hero-orbit orbit-one" /><div className="hero-orbit orbit-two" />
          <div className="hero-card"><div className="hero-card-top"><span>GKBX // ONLINE</span><span>01</span></div><img src="/gb-logo.png" alt="GankByte GB logo" /><div className="hero-card-bottom"><span>GANKBYTE</span><span>READY TO PLAY_</span></div></div>
          <div className="float-tag tag-top">XP // 001</div><div className="float-tag tag-bottom">NO SLEEP DETECTED</div>
        </div>
      </section>

      <div className="ticker" aria-label="GankByte themes"><div className="ticker-track"><span>GAMING</span><b>✦</b><span>MEMES</span><b>✦</b><span>CODE</span><b>✦</b><span>COMMUNITY</span><b>✦</b><span>GAMING</span><b>✦</b><span>MEMES</span><b>✦</b><span>CODE</span><b>✦</b><span>COMMUNITY</span></div></div>

      <section className="section shell" id="projects">
        <div className="section-heading"><div><p className="kicker">01 // WHAT WE&apos;RE BUILDING</p><h2>Not a token<br /><em>looking for a game.</em></h2></div><p className="section-intro">The game, the community, and the creative chaos come first. Everything else earns its place by being useful.</p></div>
        <div className="project-grid">{projects.map((project, index) => <article className={`project-card ${project.accent}`} key={project.title}><div className="project-number">0{index + 1}</div><p className="card-eyebrow">{project.eyebrow}</p><h3>{project.title}</h3><p>{project.copy}</p><a href="#build" className="card-link">View the plan <span aria-hidden="true">↗</span></a></article>)}</div>
      </section>

      <section className="section community-section" id="community"><div className="shell community-grid"><div><p className="kicker">02 // FIND YOUR PEOPLE</p><h2>Come for the games.<br /><em>Stay for the chaos.</em></h2><p className="section-intro">A small, genuine community for gaming chat, clips, memes, code, projects, and the occasional spectacular failure.</p><a className="button button-primary" href="#build">Get involved <span aria-hidden="true">→</span></a></div><div className="terminal-card" aria-label="GankByte community channels"><div className="terminal-bar"><span /><span /><span /><b>gankbyte-community</b></div><div className="terminal-body"><p className="terminal-muted">$ connect gankbyte --mode=community</p><p><span className="terminal-green">connected</span> // welcome, gamer</p>{channels.map((channel) => <p key={channel}><span className="terminal-purple">#</span> {channel}<span className="terminal-muted"> // open</span></p>)}<p className="terminal-cursor">$ _</p></div></div></div></section>

      <section className="section build-section shell" id="build"><div className="build-panel"><div><p className="kicker">03 // BUILD WITH US</p><h2>Have a weird idea?<br /><em>Good.</em></h2></div><div className="build-right"><p>We&apos;re gamers and developers building things we actually want to play. Bring a project, a meme, a bug report, or just an unhealthy number of hours in your favourite game.</p><a className="button button-dark" href="https://github.com/GankByteHQ" target="_blank" rel="noreferrer">Open GitHub <span aria-hidden="true">↗</span></a></div></div></section>

      <footer className="footer shell"><a className="brand" href="#top"><span className="brand-mark">GB</span><span>GANKBYTE</span></a><p>Gaming. Memes. Code.</p><p className="footer-right">BUILD. PLAY. GANK. <span>© 2026</span></p></footer>
    </main>
  );
}
