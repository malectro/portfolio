# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Kyle Warren's personal portfolio at `kylejwarren.com`. A static, hand-crafted site with zero build tools or dependencies — HTML, CSS, and vanilla JS served directly by Nginx.

## Architecture

- **No build system, no package.json, no bundler.** Files in `public/` are served as-is.
- **Single page:** `public/index.html` is the entire site (sections: hero, projects, toys, work history, footer).
- **Styling:** `public/style.css` — plain CSS with custom properties for colors/spacing. Light/dark theme via `prefers-color-scheme`. Cache-busted with query string (`style.css?2`).
- **WebGL ripple effect:** `public/scripts/ripple.js` — ES module loaded with `<script async type="module">`. Uses WebGL2 with GLSL shaders embedded as template literals. Handles pointer events, dark mode, reduced-motion, and DPR scaling (capped at 1.5x).

## Deployment

- Server user: `qarren`, web root: `/var/sites/portfolio/public`
- Nginx config: `portfolio.conf` (SSL via Let's Encrypt/certbot)
- Deployment is manual file copy to the server
- See `setup.md` for server setup details

## Branches

- `master` — production/deployment branch
- `ripples` — development branch for the WebGL ripple effect
