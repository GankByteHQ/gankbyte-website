# GankByte developer workflow

This is the public route for proposing and improving small GankByte projects.

## 1. Choose the right route

- Use a **bug report** for a reproducible problem in a live project.
- Use a **feature request** for a focused improvement to an existing project.
- Use a **project proposal** for a new game, tool, Lua experiment, legal resource, or community project.
- Use Discord for discussion, but keep the final technical brief in GitHub so it can be reviewed and tracked.
- Email `contact@gankbyte.com` for private, moderation, privacy, or ownership matters.

## 2. What a project proposal must contain

Every proposal must explain:

1. The project name and the people it helps.
2. The smallest playable or testable first version.
3. The intended technology and any dependencies.
4. What the proposer owns and which third-party licences apply.
5. A build, example, screenshot, or reproducible description when one exists.
6. The help needed from GankByte.

Do not submit proprietary game files, copied characters, official logos, private credentials, personal information, malware, or material you do not have permission to share.

## 3. Review stages

Project proposals are reviewed in this order:

- **Received** - awaiting triage.
- **Needs information** - scope, ownership, licence, or first-version plan needs clarification.
- **Accepted for exploration** - the idea fits the project and can be discussed or prototyped.
- **Building** - a public repository, branch, or playable proof exists.
- **Showcase candidate** - the project is testable, documented, and ready for a public project page.
- **Closed** - the proposal is paused, declined, or completed without a current showcase.

Acceptance is not a promise of funding, employment, partnership, or publication. GankByte may request changes or close a proposal when it is out of scope, legally unclear, unsafe, or not testable.

## 4. Definition of ready

A project is ready to be showcased only when it has:

- a clear README;
- a working first version or useful example;
- setup and usage instructions;
- a licence or an explicit explanation of why one is not yet chosen;
- an issue route for bugs and improvements;
- no unlicensed third-party assets;
- a maintainer who can respond to basic questions.

## 5. Contribution expectations

Keep pull requests small and explain the player or developer problem they solve. Preserve the existing licence and credit third-party work. Do not add token promotion, financial claims, copied game assets, secrets, or unrelated rewrites to a project contribution.

## 6. From proposal to public project

When a proposal is accepted for exploration, the maintainer should create or nominate a focused repository, add a README, licence, contribution guide, security contact, and issue forms, then link a working proof from the GankByte project board. The project page must label whether the build is live, experimental, or still being prepared.

Resource Bench is the reference implementation of this workflow: it is a standalone MIT-licensed public repository, has local-only privacy boundaries, issue forms, a responsive interface, and a live demo at <https://gankbyte.com/resource-bench.html>.

## Adding a game to Arena

Future GankByte games should register an adapter in `arena-registry.js` with a stable slug, display name, play URL, leaderboard views, and result-stat label. The shared Arena event and verified-run system uses that adapter so profiles, event links, and leaderboard surfaces do not need a game-specific rewrite for every new project.
