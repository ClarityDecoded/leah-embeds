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

  function mount(el) {
    if (el.__cdInit) return;
    el.__cdInit = true;
    var slug = el.getAttribute("data-cd-embed");
    if (!slug) return;
    var dir = EMBEDS + slug + "/";

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
          frame.setAttribute("loading", "lazy");
          frame.style.cssText =
            "display:block;width:100%;border:0;overflow:hidden;height:0;";
          el.appendChild(frame);

          window.addEventListener("message", function (e) {
            if (e.source === frame.contentWindow && e.data && e.data.cdBlock) {
              frame.style.height = e.data.h + "px";
            }
          });
        });
      })
      .catch(function (err) {
        if (window.console) console.error("[leah-embeds] " + slug + ":", err);
      });
  }

  function boot() {
    var mounts = document.querySelectorAll("[data-cd-embed]");
    for (var i = 0; i < mounts.length; i++) mount(mounts[i]);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
