#!/usr/bin/env python3
"""
Generator for the Leah embeds host.

Reads the four *-framer-blocks.html source files, splits each into its
individual, self-contained blocks, and emits one isolated standalone HTML
document per block plus a per-page manifest.json. A shared loader.js (checked
in separately) reads a manifest and renders each block in its own
auto-resizing iframe.

Run from anywhere:  python3 build.py
Re-runnable / idempotent: it wipes and regenerates embeds/ every time.
"""
import re, json, shutil, datetime
from pathlib import Path

# --- paths -------------------------------------------------------------------
HERE = Path(__file__).resolve().parent          # .../leah-embeds
PROJECT = HERE.parent                            # .../Leah
EMBEDS = HERE / "embeds"

# slug -> (source file, human page title)
PAGES = {
    "deep-story":         (PROJECT / "Deep Story/deep-story-framer-blocks.html",            "Deep Story"),
    "luminaries":         (PROJECT / "Luminaries/luminary-framer-blocks.html",              "Luminary Circles"),
    "soul-stories":       (PROJECT / "Soul Stories/Soul Stories  Final/soul-stories-framer-blocks.html", "Soul Stories"),
    "soul-story-council": (PROJECT / "Soul Story Council/soul-story-council-framer-blocks.html", "Soul Story Council"),
}

START = re.compile(r'<!--\s*=+\s*BLOCK\s+(\d+)\s*[—–-]\s*(.*?)\s*=+\s*-->', re.S)
END   = re.compile(r'<!--\s*=+\s*end block\s+(\d+)\s*=+\s*-->')

# --- per-block standalone wrapper --------------------------------------------
# Each block runs in its own iframe, exactly mirroring the isolation it had as
# its own Framer embed. <base target="_top"> makes links navigate the parent
# (Framer) window instead of inside the iframe. The reporter posts the block's
# height to the loader so the iframe can be sized to fit with no scrollbars.
WRAPPER = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<base target="_top">
<title>{title}</title>
<style>html,body{{margin:0;padding:0;background:transparent;}}</style>
</head>
<body>
<!-- ===== BLOCK {n} — {name} ===== (page: {slug}) -->
{content}
<!-- ===== leah-embeds height reporter ===== -->
<script>
(function(){{
  function H(){{
    var d=document, b=d.body, e=d.documentElement;
    return Math.max(
      b?b.scrollHeight:0, e.scrollHeight,
      b?b.offsetHeight:0, e.offsetHeight,
      b?Math.ceil(b.getBoundingClientRect().bottom):0
    );
  }}
  var last=-1;
  function post(){{
    var v=H();
    if(v!==last){{ last=v; try{{ parent.postMessage({{cdBlock:true,h:v}}, "*"); }}catch(_){{}} }}
  }}
  addEventListener("load", post);
  addEventListener("resize", post);
  if(window.ResizeObserver){{ try{{ new ResizeObserver(post).observe(document.body); }}catch(_){{}} }}
  if(document.fonts && document.fonts.ready){{ document.fonts.ready.then(post); }}
  document.addEventListener("DOMContentLoaded", post);
  // safety net for late images / async layout
  var n=0, iv=setInterval(function(){{ post(); if(++n>40) clearInterval(iv); }}, 250);
}})();
</script>
</body>
</html>
"""

def split_blocks(text):
    starts = list(START.finditer(text))
    ends   = list(END.finditer(text))
    assert [m.group(1) for m in starts] == [m.group(1) for m in ends], "unbalanced block markers"
    blocks = []
    for s, e in zip(starts, ends):
        n = int(s.group(1))
        name = s.group(2).strip()
        content = text[s.end():e.start()].strip("\n")
        blocks.append((n, name, content))
    return blocks

def main():
    if EMBEDS.exists():
        shutil.rmtree(EMBEDS)
    EMBEDS.mkdir(parents=True)
    version = datetime.datetime.now(datetime.timezone.utc).strftime("%Y%m%d%H%M%S")

    site = {}
    for slug, (src, title) in PAGES.items():
        text = src.read_text(encoding="utf-8")
        blocks = split_blocks(text)
        outdir = EMBEDS / slug
        outdir.mkdir(parents=True)
        manifest_blocks = []
        for n, name, content in blocks:
            fname = f"{n:02d}.html"
            doc = WRAPPER.format(title=f"{title} — {name}", n=n, name=name, slug=slug, content=content)
            (outdir / fname).write_text(doc, encoding="utf-8")
            manifest_blocks.append({"file": fname, "name": name})
        manifest = {"slug": slug, "title": title, "v": version, "blocks": manifest_blocks}
        (outdir / "manifest.json").write_text(json.dumps(manifest, indent=2, ensure_ascii=False), encoding="utf-8")
        site[slug] = {"title": title, "count": len(blocks)}
        print(f"  {slug:20s} {len(blocks):2d} blocks -> embeds/{slug}/")

    (HERE / "site.json").write_text(json.dumps({"v": version, "pages": site}, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"build v={version} — {sum(p['count'] for p in site.values())} blocks total")

if __name__ == "__main__":
    main()
