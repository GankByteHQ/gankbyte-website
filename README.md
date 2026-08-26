# GankByte

Gaming. Memes. Code.

GankByte is a gaming community and developer ecosystem building stupidly fun things.

This repository contains the public GankByte landing page. The site is a lightweight static page deployed with GitHub Pages.

## Links

- Website: https://gankbyte.com
- GitHub: https://github.com/GankByteHQ

## Public routes

- `games.html` - live game library with personal and global bests
- `arena-hub.html` - Arena dashboard and recent player results
- `arena.html` - Byte Rush
- `glitch-dash.html` - Glitch Dash
- `symbol-catch/` - Symbol Catch Arena reflex game
- `codebreaker/` - Codebreaker puzzle campaign
- `profile.html` - personal runs, XP history, challenges, and moderation notes
- `xp.html` - XP submission and public XP leaderboard
- `developers.html` / `contributing.html` - project and contribution routes
- `projects.html` - live games, systems, and public developer projects
- `project-submit.html` - the public project proposal route and review stages
- `resource-bench.html` - browser-only Lua, FiveM, Python, Java, web, Minecraft, RuneLite, and SQL starter generator
- `project-validator.html` - local-first project checks for FiveM, Lua, NUI, Python, JavaScript, Java, SQL, Minecraft, and RuneLite, with source evidence, dependency mapping, confidence/ignore controls, baseline comparison, Markdown/HTML/JSON reports, and safe starter templates
- `changelog.html` - dated release notes for shipped changes

## Gameplay media

The `images/` folder contains genuine captures from the current live builds:

- `byte-rush-gameplay.png` and `byte-rush-result.png`
- `glitch-dash-gameplay.png` and `glitch-dash-result.png`

## Developer workflow

- [`CONTRIBUTING.md`](CONTRIBUTING.md) - pull request and issue guidance
- [`DEVELOPER_WORKFLOW.md`](DEVELOPER_WORKFLOW.md) - proposal stages and showcase requirements
- [`PROJECT_RULES.md`](PROJECT_RULES.md) - ownership, licensing, safety, and scope rules
- [`LICENSE`](LICENSE) - website code and asset rights notice
- `sql/` - ordered Supabase schema, migrations, Byte Snatch integration, and final automatic game score-sync setup

## Local test

Run the site from a local web server so OAuth redirects and module-free browser scripts behave like production:

```powershell
py -m http.server 8000
```

Then open `http://localhost:8000`. A complete manual check should cover all five games, mobile touch controls, Discord sign-in, score submission, XP submission, profile history, and admin review.

## Deployment

The production site is the static content in this directory and is deployed through GitHub Pages at <https://gankbyte.com>. Do not add Supabase service-role keys, database passwords, Discord secrets, wallet keys, or other private credentials to the repository. Browser configuration uses only the publishable Supabase key required by the live client.

