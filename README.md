# Chainwork

[![CI](https://github.com/Cavanshirpro/Chainwork/actions/workflows/ci.yml/badge.svg)](https://github.com/Cavanshirpro/Chainwork/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/license-AGPL--3.0--only-blue)](LICENSE)

Chainwork is a daily word-chain puzzle for the browser. Connect the start and goal words by filling four intermediate rungs. Each step changes one letter and forms a valid four-letter word. Tile feedback, three hint tiers, and alternate chains give you different ways to solve the puzzle.

Practice puzzles are separate from the daily game. Daily progress and statistics are stored in the browser, and completed attempts can be shared as a spoiler-free grid.

## Development

Install [Bun](https://bun.sh/) and Node.js 24, then run:

```sh
bun install --frozen-lockfile
bun run dev
```

Open `http://localhost:3000`. The game runs in the browser and needs no API key or backend.

```sh
bun run lint
node --import tsx --test src/game/rules.test.ts
bun run build
bun run preview
```

Vite writes the production site to `dist/`. Serve that directory over HTTP at the root of a site.

## Releases

Download the web or source ZIP from [GitHub Releases](https://github.com/Cavanshirpro/Chainwork/releases). To host the web ZIP, extract it and serve the directory that contains `index.html` at the site root. Use `SHA256SUMS.txt` to verify the download.

[RELEASES.md](RELEASES.md) documents the separate CI, artifact build, validation, and publication steps.

## License

Copyright © 2026 Cavanşir Qurbanzadə (@Cavanshirpro). Chainwork is distributed under the [GNU Affero General Public License v3.0 only](LICENSE).
