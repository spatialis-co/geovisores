/* ==========================================================================
   Spatialis · Puente de tema Claro/Oscuro para demos embebidos

   - Resuelve el tema inicial (?theme=  ->  localStorage  ->  por defecto) y lo
     aplica a <html> antes de pintar el body (anti-FOUC). Por eso este archivo
     debe cargarse SÍNCRONO en el <head>, antes de las hojas de estilo.
   - Escucha al padre (postMessage) para cambiar de tema en vivo, validando el
     origen, y avisa al padre cuando el iframe está listo.
   - Expone window.SpatialisTheme y dispara el evento `spatialis:theme-change`
     para que cada visor adapte su mapa base sin recargar ni perder estado.
   ========================================================================== */
(function () {
  "use strict";

  var ALLOWED_ORIGINS = [
    /^https:\/\/(www\.|dev\.)?spatialis\.com\.co$/i,
    /^https:\/\/spatialis-co\.github\.io$/i,
    /^http:\/\/(localhost|127\.0\.0\.1):3000$/i,
    /^https:\/\/[a-z0-9-]+\.trycloudflare\.com$/i,
  ];

  function isAllowedOrigin(origin) {
    return ALLOWED_ORIGINS.some(function (re) { return re.test(origin); });
  }

  function resolveInitialTheme(defaultTheme) {
    try {
      var param = new URLSearchParams(window.location.search).get("theme");
      if (param === "light" || param === "dark") return param;
      var saved = localStorage.getItem("spatialis-theme");
      if (saved === "light" || saved === "dark") return saved;
    } catch (e) {}
    return defaultTheme || "dark";
  }

  function applySpatialisTheme(theme) {
    if (theme !== "light" && theme !== "dark") return;
    var root = document.documentElement;
    root.dataset.theme = theme;
    root.classList.toggle("dark", theme === "dark");
    root.classList.toggle("light", theme === "light");
    var meta = document.querySelector('meta[name="color-scheme"]');
    if (meta) meta.setAttribute("content", theme);
    try { localStorage.setItem("spatialis-theme", theme); } catch (e) {}
    window.dispatchEvent(new CustomEvent("spatialis:theme-change", { detail: { theme: theme } }));
  }

  /* 1. Tema inicial de inmediato (el default lo marca data-theme en el <html>
        del propio demo, o "dark" si no hay). */
  var initial = resolveInitialTheme(document.documentElement.dataset.theme || "dark");
  applySpatialisTheme(initial);

  /* 2. Cambios en vivo desde el padre */
  window.addEventListener("message", function (e) {
    if (!isAllowedOrigin(e.origin)) return;
    if (e.data && e.data.type === "spatialis:theme") {
      applySpatialisTheme(e.data.theme);
    }
  });

  /* 3. Handshake: avisar al padre que el iframe ya puede recibir el tema */
  if (window.self !== window.top) {
    try { window.parent.postMessage({ type: "spatialis:ready" }, "*"); } catch (e) {}
  }

  window.SpatialisTheme = {
    get: function () { return document.documentElement.dataset.theme || "dark"; },
    set: applySpatialisTheme,
  };
})();
