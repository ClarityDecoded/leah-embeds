/*
 * leah-embeds loader
 * -------------------
 * Paste this once per Framer page, inside a Framer Embed / HTML component:
 *
 *   <div data-cd-embed="deep-story"></div>
 *   <script src="https://claritydecoded.github.io/leah-embeds/loader.js"></script>
 *
 * Change the data-cd-embed value per page:
 *   deep-story | luminaries | soul-stories | soul-story-council
 *
 * It fetches that page's manifest.json and renders each block in its own
 * auto-resizing iframe. All content lives in this repo — edit + redeploy here,
 * and Framer updates on next load. You never touch Framer again.
 */
(function () {
  // Derive the repo root from this script's own URL, so the host/repo name can
  // change without editing anything pasted into Framer.
  var me = document.currentScript || (function () {
    var s = document.getElementsByTagName("script");
    return s[s.length - 1];
  })();
  var ROOT = me.src.replace(/loader\.js(?:\?.*)?$/, "");   // .../leah-embeds/
  var EMBEDS = ROOT + "embeds/";

  // Framer wraps HTML embeds in a body styled
  //   body{ display:flex; justify-content:center; align-items:center }
  // which collapses our top-down, full-width block flow (the mount shrinks to its
  // content and reports width 0). Force normal block flow so the mount fills the
  // embed. Safe: this only touches the embed's own sandboxed document.
  function neutralizeHost() {
    try {
      var b = document.body;
      if (b) {
        b.style.display = "block";
        b.style.margin = "0";
        b.style.width = "100%";
      }
    } catch (_) {}
  }

  // The true width to give each block iframe is the embed's viewport width. The
  // mount can read 0 (flex-collapsed) before neutralizeHost lands, so prefer the
  // document/viewport width and fall back to the mount. An explicit pixel width
  // also guarantees vw-sized blocks (e.g. min(1020px,94vw)+aspect-ratio) never
  // collapse the way a width:100% iframe can during first layout.
  function widthOf(el) {
    var vw = document.documentElement.clientWidth || window.innerWidth || 0;
    var ew = el ? (el.clientWidth || Math.round(el.getBoundingClientRect().width)) : 0;
    return Math.round(Math.max(vw, ew) || 0);
  }

  function mount(el) {
    if (el.__cdInit) return;
    el.__cdInit = true;
    var slug = el.getAttribute("data-cd-embed");
    if (!slug) return;
    var dir = EMBEDS + slug + "/";
    var frames = [];

    // Make the mount a full-width block regardless of Framer's flex wrapper.
    el.style.display = "block";
    el.style.width = "100%";
    el.style.margin = "0";

    function syncWidths() {
      var w = widthOf(el);
      if (!w) return;
      for (var i = 0; i < frames.length; i++) frames[i].style.width = w + "px";
    }
    // Re-sync on container/viewport changes (Framer breakpoints, orientation).
    if (window.ResizeObserver) {
      try { new ResizeObserver(syncWidths).observe(el); } catch (_) {}
    }
    window.addEventListener("resize", syncWidths);

    // Cache-bust the manifest so edits show up immediately (GitHub Pages caches
    // ~10 min otherwise). Block files are versioned via the manifest's `v`.
    fetch(dir + "manifest.json?t=" + Date.now(), { cache: "no-store" })
      .then(function (r) {
        if (!r.ok) throw new Error("manifest " + r.status);
        return r.json();
      })
      .then(function (m) {
        (m.blocks || []).forEach(function (b) {
          var frame = document.createElement("iframe");
          frame.src = dir + b.file + "?v=" + encodeURIComponent(m.v || "");
          frame.title = (m.title || slug) + " — " + (b.name || b.file);
          frame.setAttribute("scrolling", "no");
          frame.style.cssText =
            "display:block;border:0;overflow:hidden;height:0;max-width:100%;";
          frame.style.width = widthOf(el) + "px";
          el.appendChild(frame);
          frames.push(frame);

          window.addEventListener("message", function (e) {
            if (e.source === frame.contentWindow && e.data && e.data.cdBlock) {
              frame.style.height = e.data.h + "px";
            }
          });
        });
        syncWidths();
      })
      .catch(function (err) {
        if (window.console) console.error("[leah-embeds] " + slug + ":", err);
      });
  }

  function boot() {
    neutralizeHost();
    var mounts = document.querySelectorAll("[data-cd-embed]");
    for (var i = 0; i < mounts.length; i++) mount(mounts[i]);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
