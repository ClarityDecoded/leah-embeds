# STATUS — leah-embeds

> Living status file. **Claude: keep this current.** After any change that ships,
> update "Current state" / "Known issues / watch list" as needed and add a dated
> entry to the top of the Change log. Keep it short and factual.

_Last updated: 2026-07-29_

## What this is
Content host for the Framer embeds on schoolforsacredstorytelling.com. Framer
pages hold a one-line loader; content lives here and deploys via GitHub Pages.
See `README.md` (full workflow) and `CLAUDE.md` (rules).

## Current state — LIVE & healthy
- 5 pages, desktop + mobile:
  `/deep-story` (10 blocks), `/luminaries` (17), `/soul-stories` (17),
  `/soul-story-council` (11), `/events` (1). 56 blocks total.
- `events` is a new single-module page (upcoming gatherings list). Its featured
  artwork is hosted in-repo at `assets/your-story-of-change.png` (served from
  GitHub Pages), not framerusercontent. Framer needs the loader snippet
  `<div data-cd-embed="events"></div>` added to its Events page.
- Deployed build version `v`: **20260727042143** (run
  `curl -s https://claritydecoded.github.io/leah-embeds/site.json` for current).
- Repo is clean and in sync with `origin/main`; nothing pending.
- Embeds auto-size and grow to fit in Framer; no collapse, no gaps.
- All links verified working (200). Integration Journey link wired to
  `https://webweaving-llc.thrivecart.com/soul-stories-integration/`.
- Full-width feature images capped at **900px** on wide screens; Soul Story
  Council banner centered.
- Repo is self-contained (`source/` is source of truth), fully documented
  (`CLAUDE.md`, `README.md`, this file), and shared with collaborator
  `lambchopstory` (write access).

## Known issues / watch list
- None open.
- Watch: on a fresh load, top hero/banner images can flash blank for a beat while
  the framerusercontent.com CDN image loads — cosmetic, self-resolves.

## Open ideas / possible next steps (not started)
- Optionally tune the 900px image cap (tighter ~760px, or exclude the Soul Stories
  / Council full-bleed heroes) — pending owner preference.
- Optional custom domain (e.g. embeds.claritydecoded.com) instead of github.io.

## Deploy facts
- Push to `main` → GitHub Pages rebuilds automatically (~1 min).
- After editing `source/`, always run `python3 build.py` before committing.
- Global behavior: `loader.js` (embed load/size/height) and `build.py` WRAPPER
  `<style>` (per-block head styles + image cap).

## Change log (newest first)
- **2026-07-29** — New `events` page/slug: single "Upcoming Gatherings" module
  listing Deep Story, Soul Story Council, Luminary Circle, Your Story of Change
  (featured, artwork `assets/your-story-of-change.png`, "coming soon"), and
  Monthly Membership ("coming soon"). Registered slug in `build.py`; added
  `assets/`. Also on 07-29: Luminary CTAs → discovery-session booking link;
  Luminary tuition $1,777→$1,333; Earth Altars credit added to Luminary + Council
  footers; reduced Luminary tree-of-life (500→300px) and ginkgo mandala (−40%);
  Council banner → "We gather on the full moon" (price removed); Council schedule
  reworked to Full Moon dates + "next gathers on the full moon"; Ariel Spilsbury
  quote reworded on Soul Stories + Luminaries.
- **2026-07-27** — Docs refresh for smooth handoff: added "Good to know / gotchas"
  to `CLAUDE.md` (version-only diffs are noise & safe to discard; GitHub Desktop +
  terminal path; live-version check) and synced this file.
- **2026-07-27** — Centered the Soul Story Council banner image: added
  `.banner-figure` to the centering selector in `build.py` WRAPPER so the
  900px-capped hero centers instead of hugging the left edge.
- **2026-07-26** — Added `CLAUDE.md` + this `STATUS.md`; invited `lambchopstory`
  (write); made repo self-contained by bundling `source/` and rewiring `build.py`.
- **2026-07-26** — Capped full-width feature images at 900px (`!important` in
  `build.py` WRAPPER) so hero/banner images don't balloon on wide desktops.
- **2026-07-26** — Wired the Integration Journey placeholder to the ThriveCart URL.
- **2026-07-26** — Fixed live-embed rendering: neutralize Framer flex wrapper,
  explicit iframe width, body-based height measurement, and post `{embedHeight}`
  to Framer (re-asserted ~30s) so embeds grow to fit. Full QA pass across 4 pages.
- **2026-07-26** — Initial build: split 4 source pages into 55 isolated per-block
  iframes + `loader.js`; repo created and GitHub Pages enabled.
