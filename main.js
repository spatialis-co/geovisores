/* ==========================================================================
   Spatialis · Geovisor de Colombia con OpenLayers 10
   Misma cartografia y mismos datos que los visores de MapLibre, ArcGIS y
   Leaflet, para que la comparacion entre librerias sea de igual a igual.
   ========================================================================== */

window.addEventListener("DOMContentLoaded", function () {
  "use strict";

  var VISTAS = {
    colombia: { centro: [-73.6, 4.3], zoom: 5.1 },
    bogota: { centro: [-74.08, 4.65], zoom: 9 },
    caribe: { centro: [-74.6, 10.7], zoom: 7 },
    eje: { centro: [-75.6, 4.9], zoom: 8 },
  };

  /* Teselas de acceso anonimo: Esri para el lienzo oscuro y la imagen
     satelital, OpenStreetMap para el callejero. */
  var ESRI = "https://services.arcgisonline.com/ArcGIS/rest/services/";

  var BASES = {
    oscuro: [
      ESRI + "Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}",
      ESRI + "Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}",
    ],
    claro: [
      ESRI + "Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}",
      ESRI + "Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}",
    ],
    satelite: [
      ESRI + "World_Imagery/MapServer/tile/{z}/{y}/{x}",
      ESRI + "Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
    ],
    calles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
  };

  var proyeccion = "EPSG:3857";
  var incrustado = window.self !== window.top;

  function desde(lonLat) {
    return ol.proj.fromLonLat(lonLat, proyeccion);
  }

  /* ------------------------------------------------------------- estilos */

  function estiloDepto(resaltado) {
    return new ol.style.Style({
      fill: new ol.style.Fill({
        color: resaltado ? "rgba(43,143,214,.42)" : "rgba(0,113,197,.14)",
      }),
      stroke: new ol.style.Stroke({
        color: SP.COLOR.limite,
        width: resaltado ? 2.2 : 1.2,
      }),
    });
  }

  /* El rotulo se asigna un zoom minimo segun el tamano del departamento: los
     pequenos de la zona andina solo aparecen al acercarse. OpenLayers ademas
     aplica declutter, asi que lo que sobreviva no se solapa. */
  function zoomMinimoRotulo(extension) {
    var ancho = Math.max(
      extension[2] - extension[0],
      extension[3] - extension[1]
    );
    /* la extension viene en metros de Web Mercator */
    var grados = ancho / 111320;
    return grados >= 3.5 ? 5 : grados >= 2 ? 6 : grados >= 1.2 ? 7 : 8;
  }

  function estiloTexto(texto, opciones) {
    return new ol.style.Text({
      text: texto,
      font: (opciones.peso || "600") + " " + (opciones.tamano || 10) + "px Geist, system-ui, sans-serif",
      fill: new ol.style.Fill({ color: opciones.color || "#cfe9f7" }),
      stroke: new ol.style.Stroke({ color: "#04070f", width: 3 }),
      offsetY: opciones.offsetY || 0,
      overflow: false,
    });
  }

  function estiloCiudad(feature, zoom) {
    var p = feature.getProperties();
    var r = SP.radioCiudad(p.poblacion);
    var capital = p.capital === 1;
    var minZoomRotulo = p.poblacion >= 1000000 ? 6 : p.poblacion >= 300000 ? 8 : 9;

    return new ol.style.Style({
      image: new ol.style.Circle({
        radius: r,
        fill: new ol.style.Fill({ color: SP.COLOR.ciudad }),
        stroke: new ol.style.Stroke({
          color: capital ? SP.COLOR.capital : SP.COLOR.ciudadBorde,
          width: capital ? 2 : 1,
        }),
      }),
      text: zoom >= minZoomRotulo && p.poblacion >= 150000
        ? estiloTexto(p.nombre, { tamano: 11, peso: "500", color: "#ffffff", offsetY: r + 10 })
        : undefined,
      /* las ciudades grandes ganan el sitio cuando hay competencia */
      zIndex: Math.round((p.poblacion || 0) / 1000),
    });
  }

  /* -------------------------------------------------------------- fuentes */

  var fuenteDeptos = new ol.source.Vector();
  var fuenteCiudades = new ol.source.Vector();

  var capaDeptos = new ol.layer.Vector({
    source: fuenteDeptos,
    style: function (f) { return estiloDepto(false); },
    declutter: false,
  });

  /* Capa aparte solo para los rotulos: asi declutter trabaja unicamente con
     texto y no descarta geometrias. */
  var capaEtiquetas = new ol.layer.Vector({
    source: fuenteDeptos,
    /* grupos de declutter separados: los rotulos de departamento compiten
       entre si, no contra los simbolos de ciudad */
    declutter: "etiquetas",
    style: function (f) {
      var vista = mapa.getView();
      if (vista.getZoom() < f.get("_minZoom")) return null;
      return new ol.style.Style({
        text: estiloTexto((f.get("nombre") || "").toUpperCase(), { tamano: 10 }),
      });
    },
  });

  var capaCiudades = new ol.layer.Vector({
    source: fuenteCiudades,
    declutter: "ciudades",
    style: function (f) { return estiloCiudad(f, mapa.getView().getZoom()); },
  });

  function capaBase(urls) {
    return urls.map(function (url) {
      return new ol.layer.Tile({
        source: new ol.source.XYZ({ url: url, crossOrigin: "anonymous", maxZoom: 18 }),
        zIndex: -1,
      });
    });
  }

  var baseClave = (window.SpatialisTheme && SpatialisTheme.get() === "light") ? "claro" : "oscuro";
  var basesActuales = capaBase(BASES[baseClave]);

  var mapa = new ol.Map({
    target: "map",
    layers: basesActuales.concat([capaDeptos, capaEtiquetas, capaCiudades]),
    view: new ol.View({
      center: desde(VISTAS.colombia.centro),
      zoom: VISTAS.colombia.zoom,
      minZoom: 3,
      maxZoom: 18,
      constrainResolution: false,
    }),
    controls: ol.control.defaults.defaults({
      attribution: false,
      rotate: false,
      zoomOptions: { className: "ol-zoom" },
    }),
    /* Embebido en la web, la rueda sin Ctrl debe hacer scroll de la pagina */
    interactions: ol.interaction.defaults.defaults({
      mouseWheelZoom: !incrustado,
    }),
  });

  window.spMap = mapa;

  if (incrustado) {
    mapa.addInteraction(new ol.interaction.MouseWheelZoom({ condition: ol.events.condition.platformModifierKeyOnly }));
  }

  mapa.addControl(new ol.control.ScaleLine({ units: "metric", bar: false }));

  /* ---------------------------------------------------------------- datos */

  var formato = new ol.format.GeoJSON({
    dataProjection: "EPSG:4326",
    featureProjection: proyeccion,
  });

  Promise.all([
    SP.cargarJSON(SP.DATA.departamentos),
    SP.cargarJSON(SP.DATA.ciudades),
  ]).then(function (res) {
    var fd = formato.readFeatures(res[0]);
    fd.forEach(function (f) {
      f.set("_minZoom", zoomMinimoRotulo(f.getGeometry().getExtent()), true);
    });
    fuenteDeptos.addFeatures(fd);
    fuenteCiudades.addFeatures(formato.readFeatures(res[1]));

    SP.kpi("deptos", res[0].features.length);
    SP.kpi("ciudades", res[1].features.length);
    var hab = res[1].features.reduce(function (a, f) {
      return a + (f.properties.poblacion || 0);
    }, 0);
    SP.kpi("poblacion", (hab / 1e6).toFixed(1).replace(".", ",") + " M");
    SP.listo();
  }).catch(function (e) {
    SP.listo();
    SP.aviso("No se pudieron cargar las capas de Colombia: " + e.message);
  });

  /* El estilo depende del zoom, asi que hay que repintar al terminar de mover */
  mapa.on("moveend", function () {
    capaEtiquetas.changed();
    capaCiudades.changed();
  });

  /* --------------------------------------------------------- interacción */

  var resaltado = null;

  mapa.on("pointermove", function (ev) {
    if (ev.dragging) return;
    var lonLat = ol.proj.toLonLat(ev.coordinate, proyeccion);
    SP.coordenadas(lonLat[0], lonLat[1]);

    var encontrado = mapa.forEachFeatureAtPixel(ev.pixel, function (f, capa) {
      return capa === capaDeptos ? f : null;
    }, { layerFilter: function (c) { return c === capaDeptos; }, hitTolerance: 2 });

    if (resaltado !== encontrado) {
      if (resaltado) resaltado.setStyle(undefined);
      resaltado = encontrado || null;
      if (resaltado) resaltado.setStyle(estiloDepto(true));
    }
    mapa.getTargetElement().style.cursor = encontrado ? "pointer" : "";
  });

  mapa.on("click", function (ev) {
    /* Primero las ciudades: estan por encima y son el objetivo mas pequeno */
    var ciudad = mapa.forEachFeatureAtPixel(ev.pixel, function (f) { return f; }, {
      layerFilter: function (c) { return c === capaCiudades; },
      hitTolerance: 8,
    });

    if (ciudad) {
      var p = ciudad.getProperties();
      var c = ol.proj.toLonLat(ciudad.getGeometry().getCoordinates(), proyeccion);
      SP.ficha.mostrar(p.nombre, p.capital === 1 ? "Capital · " + p.rango : p.rango, [
        ["Departamento", p.departamento || "—"],
        ["Población", SP.entero(p.poblacion)],
        ["Longitud", c[0].toFixed(4) + "°"],
        ["Latitud", c[1].toFixed(4) + "°"],
      ]);
      return;
    }

    var depto = mapa.forEachFeatureAtPixel(ev.pixel, function (f) { return f; }, {
      layerFilter: function (c) { return c === capaDeptos; },
    });

    if (depto) {
      var d = depto.getProperties();
      var ll = ol.proj.toLonLat(ev.coordinate, proyeccion);
      SP.ficha.mostrar(d.nombre, d.tipo || "Departamento", [
        ["Código ISO", d.iso || "—"],
        ["Longitud", ll[0].toFixed(4) + "°"],
        ["Latitud", ll[1].toFixed(4) + "°"],
      ]);
    } else {
      SP.ficha.cerrar();
    }
  });

  /* ----------------------------------------------------------- controles */

  document.getElementById("cap-deptos").addEventListener("change", function () {
    capaDeptos.setVisible(this.checked);
  });

  document.getElementById("cap-etiquetas").addEventListener("change", function () {
    capaEtiquetas.setVisible(this.checked);
  });

  document.getElementById("cap-ciudades").addEventListener("change", function () {
    capaCiudades.setVisible(this.checked);
  });

  document.querySelectorAll("[data-vista]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var v = VISTAS[btn.dataset.vista];
      if (!v) return;
      document.querySelectorAll("[data-vista]").forEach(function (b) {
        b.setAttribute("aria-pressed", String(b === btn));
      });
      mapa.getView().animate({
        center: desde(v.centro),
        zoom: v.zoom,
        duration: 1200,
      });
      SP.ficha.cerrar();
    });
  });

  function seleccionarBase(clave) {
    if (!BASES[clave]) return;
    baseClave = clave;
    document.querySelectorAll("[data-base]").forEach(function (b) {
      b.setAttribute("aria-pressed", String(b.dataset.base === clave));
    });
    basesActuales.forEach(function (c) { mapa.removeLayer(c); });
    basesActuales = capaBase(BASES[clave]);
    basesActuales.forEach(function (c) { mapa.addLayer(c); });
  }

  /* chip activo según la base inicial (que sigue el tema) */
  document.querySelectorAll("[data-base]").forEach(function (b) {
    b.setAttribute("aria-pressed", String(b.dataset.base === baseClave));
  });

  document.querySelectorAll("[data-base]").forEach(function (btn) {
    btn.addEventListener("click", function () { seleccionarBase(btn.dataset.base); });
  });

  /* La base sigue el tema solo si está en una base temática (Claro/Oscuro);
     Satélite y Calles son elección del usuario y se respetan. */
  window.addEventListener("spatialis:theme-change", function (e) {
    if (baseClave === "oscuro" || baseClave === "claro") {
      seleccionarBase(e.detail.theme === "light" ? "claro" : "oscuro");
    }
  });

  setTimeout(SP.listo, 12000);
});
