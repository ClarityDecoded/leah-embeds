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
    // Measure the CONTENT height from <body> only. Never use
    // documentElement.scrollHeight: the root element's scrollHeight is clamped to
    // at least the iframe/viewport height, so it over-reports short blocks and
    // leaves large empty gaps below the content.
    var b=document.body;
    if(!b) return 0;
    var h=Math.max(b.scrollHeight, b.offsetHeight);
    // Defensive: include any in-flow child that overflows the body box.
    var k=b.children;
    for(var i=0;i<k.length;i++){{
      var bot=Math.ceil(k[i].getBoundingClientRect().bottom);
      if(bot>h) h=bot;
    }}
    return h;
  }}
  var last=-1, lastW=-1;
  function post(){{
    var v=H(), w=document.documentElement.clientWidth;
    // Re-post whenever height OR viewport width changes. Some blocks size purely
    // from vw + aspect-ratio; if the iframe's width lands after first paint, the
    // height must be recomputed once the real width arrives.
    if(v!==last || w!==lastW){{
      last=v; lastW=w;
      try{{ parent.postMessage({{cdBlock:true,h:v}}, "*"); }}catch(_){{}}
    }}
  }}
  addEventListener("load", post);
  addEventListener("resize", post);
  if(window.ResizeObserver){{
    try{{
      var ro=new ResizeObserver(post);
      ro.observe(document.body);
      ro.observe(document.documentElement);   // catches width-driven relayout
    }}catch(_){{}}
  }}
  // re-measure once every image has decoded (aspect-ratio/background swaps)
  [].forEach.call(document.images, function(im){{
    if(!im.complete) im.addEventListener("load", post);
  }});
  if(document.fonts && document.fonts.ready){{ document.fonts.ready.then(post); }}
  document.addEventListener("DOMContentLoaded", post);
  // safety net for late images / async layout / delayed width (30s, tapering)
  var n=0, iv=setInterval(function(){{ post(); if(++n>60) clearInterval(iv); }}, 500);
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
