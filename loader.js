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

  // Framer's HTML-embed wrapper measures body height with a ResizeObserver and
  // posts {embedHeight} to the page, which sizes the embed iframe. That observer
  // reads 0 before our blocks load and doesn't reliably re-fire on our async
  // height changes — leaving the embed stuck at 0. So we post the height in
  // Framer's own protocol whenever our content changes (same message shape, so
  // it's idempotent alongside Framer's script).
  var lastReported = -1;
  function reportHeight() {
    var h = document.body ? document.body.scrollHeight : 0;
    if (h && h !== lastReported) {
      lastReported = h;
      try { parent.postMessage({ embedHeight: h }, "*"); } catch (_) {}
    }
  }
  // Re-assert the current height even if unchanged. On tall/slow pages Framer may
  // not be ready the instant we first post the final height; without a periodic
  // re-assert the change-guard above would never post it again and the embed
  // stays at 0. Cheap and idempotent.
  function forceReport() {
    lastReported = -1;
    reportHeight();
  }

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

  // --- Space reservation ---------------------------------------------------
  // The blocks load asynchronously (manifest fetch, then one HTML fetch per
  // iframe), so the mount is ~0px tall for a beat after the Framer page has
  // already painted. Framer then lays out its footer directly under the nav and
  // shoves it down when our content finally arrives — the "footer first, then
  // the embed appears" flash the user sees. To avoid it we reserve the embed's
  // height up front: instantly from the height we cached on the last visit, or
  // (first visit) from a per-block estimate once the manifest count is known.
  // Then we settle to the exact height and re-cache it. Cache is keyed by slug +
  // a coarse width bucket so each Framer breakpoint keeps its own estimate.
  var AVG_BLOCK = 950;   // px, first-visit-only fallback per block
  // Bucket by viewport width so each Framer breakpoint keeps its own cached
  // height. Prefer window.innerWidth: it's stable from first paint, whereas
  // documentElement.clientWidth can read a transient value mid-layout — which
  // would make the read key (at mount) and write key (at settle) disagree and
  // miss the cache on every visit.
  function widthBucket() {
    var w = window.innerWidth || document.documentElement.clientWidth || 1000;
    return Math.round(w / 50) * 50;
  }
  function readCache(key) {
    try { return parseInt(localStorage.getItem(key) || "0", 10) || 0; }
    catch (_) { return 0; }
  }
  function writeCache(key, h) {
    try { if (h > 0) localStorage.setItem(key, String(h)); } catch (_) {}
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

    // Reserve height immediately from the last visit's cached height (exact on
    // repeat visits at this width), so the footer doesn't render under the nav
    // and then jump. Refined below once the manifest count is known / blocks load.
    function reserve(px) {
      if (px > 0) { el.style.minHeight = px + "px"; forceReport(); }
    }
    // Compute the cache key once so the read here and every write below use the
    // same key even if the viewport nudges during load.
    var cacheKey = "cdH:" + slug + ":" + widthBucket();
    var cachedH = readCache(cacheKey);
    if (cachedH) reserve(cachedH);

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
        var blocks = m.blocks || [];
        // First visit (nothing cached yet): reserve a rough estimate from the
        // block count so the footer still starts low while blocks stream in.
        if (!cachedH) reserve(blocks.length * AVG_BLOCK);

        var reported = {};   // frame index -> reported at least once
        var finalized = false;
        function maybeFinalize() {
          if (finalized) return;
          for (var i = 0; i < frames.length; i++) {
            if (!reported[i]) return;   // still waiting on a block
          }
          finalized = true;
          // All blocks have their true height now: drop the reservation so the
          // page matches actual content exactly, cache it for next time, report.
          el.style.minHeight = "";
          forceReport();
          writeCache(cacheKey, document.body ? document.body.scrollHeight : 0);
        }

        blocks.forEach(function (b, idx) {
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
              reported[idx] = true;
              reportHeight();
              maybeFinalize();
              // Keep the cache fresh as late-loading images settle taller.
              if (finalized) writeCache(cacheKey, document.body ? document.body.scrollHeight : 0);
            }
          });
        });
        syncWidths();
        reportHeight();
      })
      .catch(function (err) {
        if (window.console) console.error("[leah-embeds] " + slug + ":", err);
      });
  }

  function boot() {
    neutralizeHost();
    var mounts = document.querySelectorAll("[data-cd-embed]");
    for (var i = 0; i < mounts.length; i++) mount(mounts[i]);
    // Keep reporting height to the Framer host for a while as blocks/images
    // settle, then rely on the per-block message + resize handlers.
    window.addEventListener("resize", forceReport);
    window.addEventListener("load", forceReport);
    var t = 0, hi = setInterval(function () {
      forceReport();
      if (++t > 100) clearInterval(hi);   // re-assert for ~30s while images settle
    }, 300);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
