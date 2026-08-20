# GankByte

Gaming. Memes. Code.

GankByte is a gaming community and developer ecosystem building stupidly fun things.

This repository contains the public GankByte landing page. The site is a lightweight static page deployed with GitHub Pages.

## Links

- Website: https://gankbyte.com
- GitHub: https://github.com/GankByteHQ

## Public routes

- `games.html` — live game library with personal and global bests
- `arena-hub.html` — Arena dashboard and recent player results
- `arena.html` — Byte Rush
- `glitch-dash.html` — Glitch Dash
- `signal-forge.html` — seedable micro-game mutation lab where rolls change the playable rules, plus a Lua starter
- Signal Forge source: `https://github.com/GankByteHQ/signal-forge`
- `profile.html` — personal runs, XP history, challenges, and moderation notes
- `xp.html` — XP submission and public XP leaderboard
- `developers.html` / `contributing.html` — project and contribution routes

## Developer workflow

- [`CONTRIBUTING.md`](CONTRIBUTING.md) — pull request and issue guidance
- [`DEVELOPER_WORKFLOW.md`](DEVELOPER_WORKFLOW.md) — proposal stages and showcase requirements

## Local test

Run the site from a local web server so OAuth redirects and module-free browser scripts behave like production:

```powershell
py -m http.server 8000
```

Then open `http://localhost:8000`. A complete manual check should cover both games, mobile touch controls, Discord sign-in, score submission, XP submission, profile history, and admin review.
