/* ==========================================================================
   Spatialis · Utilidades compartidas por los cuatro geovisores de demostracion
   Sin dependencias. Define la simbologia una sola vez para que las cuatro
   librerias dibujen exactamente la misma cartografia.
   ========================================================================== */

(function (global) {
  "use strict";

  var DATA = {
    departamentos: "data/colombia-departamentos.geojson",
    ciudades: "data/colombia-ciudades.geojson",
  };

  /* Encuadre nacional compartido: Colombia continental + San Andres. */
  var COLOMBIA = {
    centro: [-73.5, 4.2],
    bbox: [[-79.2, -4.4], [-66.8, 12.7]],
    bogota: [-74.0721, 4.7110],
  };

  /* -------------------------------------------------------- simbologia */

  /* Simbolos proporcionales: el tamano codifica la magnitud y el color se
     mantiene constante, que es lo correcto para una variable cuantitativa. */
  var CLASES = [
    { min: 1000000, radio: 11, etiqueta: "≥ 1 000 000 hab." },
    { min: 300000, radio: 8, etiqueta: "300 000 – 1 000 000" },
    { min: 100000, radio: 6, etiqueta: "100 000 – 300 000" },
    { min: 0, radio: 4, etiqueta: "< 100 000" },
  ];

  var COLOR = {
    ciudad: "#00c7fd",
    ciudadBorde: "#eaf9ff",
    capital: "#ffffff",
    limite: "#00c7fd",
    relleno: "#0071c5",
    resaltado: "#7dd3fc",
  };

  function radioCiudad(poblacion) {
    for (var i = 0; i < CLASES.length; i++) {
      if (poblacion >= CLASES[i].min) return CLASES[i].radio;
    }
    return CLASES[CLASES.length - 1].radio;
  }

  /* ----------------------------------------------------------- formato */

  var nfEntero = new Intl.NumberFormat("es-CO");

  function entero(n) {
    return nfEntero.format(Math.round(Number(n) || 0));
  }

  function coord(lng, lat) {
    if (lng == null || lat == null || isNaN(lng) || isNaN(lat)) return "—";
    var ns = lat >= 0 ? "N" : "S";
    var eo = lng >= 0 ? "E" : "O";
    return Math.abs(lat).toFixed(4) + "° " + ns + "  " +
           Math.abs(lng).toFixed(4) + "° " + eo;
  }

  /* -------------------------------------------------------------- datos */

  function cargarJSON(url) {
    /* Sin forzar cache: GitHub Pages envia ETag y revalida barato, y asi una
       capa actualizada llega al cliente sin tener que vaciar el navegador. */
    return fetch(url).then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status + " en " + url);
      return r.json();
    });
  }

  /* ---------------------------------------------------------------- DOM */

  function $(sel) { return document.querySelector(sel); }

  var loaderOculto = false;

  function listo() {
    if (loaderOculto) return;
    loaderOculto = true;
    var el = $(".sp-loader");
    if (el) el.setAttribute("data-done", "true");
  }

  function textoCargando(txt) {
    var el = $(".sp-loader__text");
    if (el) el.textContent = txt;
  }

  var toastTimer = null;

  function aviso(mensaje, ms) {
    var el = $(".sp-toast");
    if (!el) return;
    el.querySelector(".sp-toast__msg").textContent = mensaje;
    el.setAttribute("data-open", "true");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      el.setAttribute("data-open", "false");
    }, ms || 6000);
  }

  /* Panel: tarjeta flotante en escritorio, hoja inferior en movil. */
  function iniciarPanel() {
    var panel = $(".sp-panel");
    var fab = $(".sp-fab");
    if (!panel) return;

    function abrir(v) {
      panel.setAttribute("data-open", v ? "true" : "false");
      if (fab) fab.setAttribute("aria-expanded", v ? "true" : "false");
    }

    if (fab) fab.addEventListener("click", function () {
      abrir(panel.getAttribute("data-open") !== "true");
    });

    var cerrar = panel.querySelector(".sp-panel__close");
    if (cerrar) cerrar.addEventListener("click", function () { abrir(false); });

    /* gesto de arrastre hacia abajo sobre el asa */
    var asa = panel.querySelector(".sp-panel__handle");
    if (asa) {
      var y0 = null;
      asa.addEventListener("touchstart", function (e) {
        y0 = e.touches[0].clientY;
      }, { passive: true });
      asa.addEventListener("touchmove", function (e) {
        if (y0 !== null && e.touches[0].clientY - y0 > 42) { abrir(false); y0 = null; }
      }, { passive: true });
    }

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") { abrir(false); ficha.cerrar(); }
    });
  }

  /* Ficha de atributos reutilizable. */
  var ficha = {
    mostrar: function (titulo, tipo, pares) {
      var el = $(".sp-info");
      if (!el) return;
      el.querySelector(".sp-info__title").textContent = titulo;
      el.querySelector(".sp-info__kind").textContent = tipo || "";
      var dl = el.querySelector(".sp-attrs");
      dl.innerHTML = "";
      pares.forEach(function (p) {
        var dt = document.createElement("dt");
        dt.textContent = p[0];
        var dd = document.createElement("dd");
        dd.textContent = p[1];
        dl.appendChild(dt);
        dl.appendChild(dd);
      });
      el.setAttribute("data-open", "true");
    },
    cerrar: function () {
      var el = $(".sp-info");
      if (el) el.setAttribute("data-open", "false");
    },
  };

  function iniciarFicha() {
    var btn = document.querySelector(".sp-info__close");
    if (btn) btn.addEventListener("click", ficha.cerrar);
  }

  function kpi(clave, valor) {
    var el = document.querySelector('[data-kpi="' + clave + '"]');
    if (el) el.textContent = valor;
  }

  function coordenadas(lng, lat) {
    var el = $(".sp-coords");
    if (el) el.textContent = coord(lng, lat);
  }

  /* Leyenda de simbolos proporcionales, generada desde las mismas clases. */
  function pintarLeyenda(sel) {
    var cont = document.querySelector(sel || ".sp-legend--ciudades");
    if (!cont) return;
    cont.innerHTML = "";
    CLASES.forEach(function (c) {
      var d = c.radio * 1.5;
      var item = document.createElement("div");
      item.className = "sp-legend__item";
      var dot = document.createElement("span");
      dot.className = "sp-legend__dot";
      dot.style.width = d + "px";
      dot.style.height = d + "px";
      dot.style.background = COLOR.ciudad;
      var box = document.createElement("span");
      box.style.cssText = "display:inline-grid;place-items:center;width:24px;flex:none";
      box.appendChild(dot);
      var txt = document.createElement("span");
      txt.textContent = c.etiqueta;
      item.appendChild(box);
      item.appendChild(txt);
      cont.appendChild(item);
    });
  }

  function iniciar() {
    iniciarPanel();
    iniciarFicha();
    pintarLeyenda();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciar);
  } else {
    iniciar();
  }

  global.SP = {
    DATA: DATA,
    COLOMBIA: COLOMBIA,
    CLASES: CLASES,
    COLOR: COLOR,
    radioCiudad: radioCiudad,
    entero: entero,
    coord: coord,
    cargarJSON: cargarJSON,
    listo: listo,
    textoCargando: textoCargando,
    aviso: aviso,
    ficha: ficha,
    kpi: kpi,
    coordenadas: coordenadas,
  };
})(window);
