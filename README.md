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

## Editing content

Source of truth is the four `*-framer-blocks.html` files in the parent project
folder. To change wording, swap an image, add / remove / reorder a block:

1. Edit the relevant source `*-framer-blocks.html` file (blocks are delimited by
   `<!-- ===== BLOCK n — name ===== -->` … `<!-- ===== end block n ===== -->`).
2. Regenerate:
   ```bash
   python3 build.py
   ```
3. Commit + push:
   ```bash
   git add -A && git commit -m "edit: ..." && git push
   ```

The build stamps a new version `v` into every `manifest.json`, which busts the
CDN cache so the change appears on the next Framer load.

## Layout

```
loader.js                     shared loader (referenced by Framer)
build.py                      regenerates embeds/ from the source files
index.html                    control panel (lists pages + blocks)
site.json                     build manifest (generated)
embeds/<slug>/manifest.json   ordered block list + version (generated)
embeds/<slug>/NN.html         one isolated, standalone block (generated)
```

Everything under `embeds/` is generated — edit the source files, not these.
