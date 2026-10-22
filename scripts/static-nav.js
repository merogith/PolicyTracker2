// Injected into every page of the static snapshot by scripts/export-static.mjs.
// Views are addressed by query strings (?tab=domains), which a static host ignores, so links,
// GET forms and reloads are sent to the file saved for that exact view instead.
(function () {
  var BASE = (document.currentScript && document.currentScript.src.match(/^https?:\/\/[^/]+(.*)\/_static\/nav\.js/) || [])[1] || "";
  var map = null;
  var initial = new URL(location.href);
  var nativeFetch = window.fetch.bind(window);
  var ready = nativeFetch(BASE + "/_static/map.json").then(function (r) { return r.json(); }).then(function (m) { map = m; return m; }, function () { map = {}; return map; });

  // The client router asks the server for flight data on navigation and prefetch; there is no
  // server, so fail fast and let the click handlers below do a full page load.
  window.fetch = function (input, init) {
    var url = typeof input === "string" ? input : input && (input.href || input.url) || "";
    var headers = (init && init.headers) || (input && input.headers);
    var rsc = /[?&]_rsc=/.test(url) || (headers && (typeof headers.get === "function" ? headers.get("RSC") : headers.RSC || headers.rsc));
    if (rsc) return Promise.reject(new TypeError("Static snapshot: no server"));
    return nativeFetch(input, init);
  };

  function canonical(url) {
    var path = url.pathname;
    if (path !== BASE && path.indexOf(BASE + "/") !== 0) path = BASE + path;
    if (path.length > BASE.length + 1) path = path.replace(/\/$/, "");
    var params = [];
    url.searchParams.forEach(function (v, k) { if (k !== "_rsc") params.push([k, v]); });
    params.sort(function (a, b) { return a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0; });
    var search = new URLSearchParams(params).toString();
    return { path: path, params: params, key: path + (search ? "?" + search : "") };
  }

  function isStatic(path) { return /\.html$|\/$|\/_files\//.test(path); }

  /** The saved file for a URL, or the closest saved view when this exact one was not captured. */
  function resolve(href) {
    var url = new URL(href, location.href);
    if (url.origin !== location.origin) return { href: url.href, exact: true };
    if (isStatic(url.pathname) && !url.search) return { href: url.href, exact: true };
    var c = canonical(url);
    var m = map || {};
    if (m[c.key]) return { href: m[c.key] + url.hash, exact: true };
    // Saved views use each country's main report and the default stages without saying so.
    var stages = c.params.filter(function (p) { return p[0] === "stages"; }).map(function (p) { return p[1]; }).join(",");
    var kept = c.params.filter(function (p) { return p[0] !== "report" && !(p[0] === "stages" && stages === "1,2,3,4"); });
    var plain = c.path + (kept.length ? "?" + new URLSearchParams(kept).toString() : "");
    if (m[plain]) return { href: m[plain] + url.hash, exact: !c.params.some(function (p) { return p[0] === "report"; }) };
    for (var n = kept.length - 1; n >= 0; n--) {
      var search = new URLSearchParams(kept.slice(0, n)).toString();
      var key = c.path + (search ? "?" + search : "");
      if (m[key]) return { href: m[key] + url.hash, exact: false };
    }
    return { href: c.path + "/" + url.hash, exact: !c.params.length };
  }
  window.__staticResolve = function (href) { return resolve(href).href; };

  function go(href, newTab) {
    ready.then(function () {
      var r = resolve(href);
      if (!r.exact) try { sessionStorage.setItem("static-nav-miss", "1"); } catch (e) {}
      if (newTab) window.open(r.href, "_blank", "noopener");
      else location.href = r.href;
    });
  }

  window.addEventListener("click", function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target && e.target.closest && e.target.closest("a[href]");
    if (!a || a.hasAttribute("download")) return;
    var raw = a.getAttribute("href");
    if (!raw || raw.charAt(0) === "#") return;
    var url = new URL(raw, location.href);
    if (url.origin !== location.origin) return;
    if (url.pathname === location.pathname && url.search === location.search && url.hash) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    go(url.href, a.target === "_blank");
  }, true);

  window.addEventListener("submit", function (e) {
    var form = e.target;
    if (!form || (form.getAttribute("method") || "get").toLowerCase() !== "get") return;
    e.preventDefault();
    e.stopImmediatePropagation();
    var url = new URL(form.getAttribute("action") || location.pathname, location.href);
    url.search = new URLSearchParams(new FormData(form)).toString();
    go(url.href, false);
  }, true);

  // A reload or shared link of an original URL (?tab=...) lands on the default file: open the saved view.
  // Decided on the URL as loaded: the app itself later rewrites the address bar with replaceState.
  if (initial.search || !isStatic(initial.pathname)) {
    ready.then(function () {
      var r = resolve(initial.href);
      var target = new URL(r.href, location.href);
      if (target.pathname !== initial.pathname) location.replace(r.href);
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    var missed = false;
    try { missed = sessionStorage.getItem("static-nav-miss") === "1"; sessionStorage.removeItem("static-nav-miss"); } catch (e) {}
    if (!missed) return;
    var note = document.createElement("div");
    note.setAttribute("role", "status");
    note.textContent = "That exact view is not part of this static snapshot, so the closest saved view is shown.";
    note.style.cssText = "position:fixed;left:50%;bottom:16px;transform:translateX(-50%);z-index:1000;max-width:calc(100vw - 32px);padding:10px 14px;border-radius:10px;background:#1f2937;color:#fff;font:13px/1.4 system-ui,sans-serif;box-shadow:0 6px 20px rgba(0,0,0,.25)";
    document.body.appendChild(note);
    setTimeout(function () { note.remove(); }, 6000);
  });
})();
