# leah-embeds

Content host for the Framer embeds on Leah Lamb's site. Instead of pasting HTML
into Framer, each page has **one tiny loader** in Framer that pulls its content
from here. Edit content in this repo, run the build, push — Framer updates on
next load. **You never touch Framer again.**

Live at: **https://claritydecoded.github.io/leah-embeds/**
(the `/` control panel lists every page and block).

## How it works

```
Framer Embed (per page)  →  loader.js  →  fetches embeds/<slug>/manifest.json
                                        →  renders each block in its own
                                           auto-resizing <iframe>
```

Each block lives in its own iframe, exactly as isolated as it was in its own
Framer embed — so the blocks' global CSS never collides.

## The 4 pages

| Page | slug |
|------|------|
| Deep Story | `deep-story` |
| Luminary Circles | `luminaries` |
| Soul Stories | `soul-stories` |
| Soul Story Council | `soul-story-council` |

## The loader snippet (paste ONCE per page into a Framer Embed / HTML component)

```html
<div data-cd-embed="deep-story"></div>
<script src="https://claritydecoded.github.io/leah-embeds/loader.js"></script>
```

Change `deep-story` to the right slug per page. That's the only thing that ever
goes into Framer.

## Editing content — the whole workflow

This repo is **self-contained**: the source of truth is the four files in
`source/`, and everything else is generated from them. You only need this one
repo — nothing external.

### One-time setup

```bash
git clone https://github.com/ClarityDecoded/leah-embeds.git
cd leah-embeds
```

You need **git** and **Python 3** (`python3 --version`). Nothing else — no npm,
no build tools. To push changes you must be a collaborator on the repo (ask the
owner to add your GitHub username under Settings → Collaborators).

### To make a change

1. **Edit** the relevant file in `source/`:
   - `source/deep-story.html`
   - `source/luminaries.html`
   - `source/soul-stories.html`
   - `source/soul-story-council.html`

   Each page is split into **blocks**, delimited by:
   ```html
   <!-- ===== BLOCK 3 — the practice ===== -->
      ... this block's HTML/CSS ...
   <!-- ===== end block 3 ===== -->
   ```
   Edit the HTML between those markers to change wording, swap an image
   (`framerusercontent.com/...` URLs), tweak styles, or reorder/add/remove a
   whole block. Each block is fully self-contained (its own fonts + CSS).

2. **Rebuild** (regenerates everything under `embeds/`):
   ```bash
   python3 build.py
   ```

3. **Push** — GitHub Pages redeploys automatically (~1 min):
   ```bash
   git add -A && git commit -m "edit: <what changed>" && git push
   ```

The build stamps a new version `v` into every `manifest.json`, which busts the
CDN cache so the change shows up on the next Framer page load. **You never touch
Framer.** (Doing this with Claude Code? Just describe the change and let it run
these steps.)

### Global tweaks

Two things apply across all pages and live in the build, not in each block:
- **`loader.js`** — how the embed loads/sizes blocks and reports height to Framer.
- **`build.py`** (the `WRAPPER` `<style>`) — e.g. the 900px cap on full-width
  feature images. Change it there, rebuild, push.

## Layout

```
source/<slug>.html            ← EDIT THESE — source of truth, split into blocks
build.py                      regenerates embeds/ from source/ (run after editing)
loader.js                     shared loader referenced by Framer (global behavior)
index.html                    control panel (lists pages + blocks)
site.json                     build manifest (generated)
embeds/<slug>/manifest.json   ordered block list + version (generated)
embeds/<slug>/NN.html         one isolated, standalone block (generated)
```

Everything under `embeds/` is generated — **edit `source/`, not `embeds/`.**
