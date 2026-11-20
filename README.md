# geovisores

Geovisores web de demostración de [Spatialis S.A.S.](https://spatialis.com.co)

Los cuatro visores muestran **el mismo mapa de Colombia** —33 departamentos y 72 ciudades— con la misma simbología, construido sobre cuatro librerías distintas. La idea es que un cliente pueda comparar capacidades, rendimiento y costo de licenciamiento sobre un caso idéntico antes de decidir la arquitectura de su plataforma.

Portada con los cuatro accesos: <https://spatialis-co.github.io/geovisores/>

## Demos

| Librería | Versión | Qué demuestra | Demo | Archivo |
|---|---|---|---|---|
| MapLibre GL JS | 5.6 | **Terreno 3D** activo por defecto, relieve sombreado, exageración ajustable y consulta de altura | [Ver demo](https://spatialis-co.github.io/geovisores/maplibre.html) | `maplibre.html` |
| ArcGIS Maps SDK for JavaScript | 5.2 | Integración con el ecosistema Esri: mapas base, `GeoJSONLayer`, renderizadores y etiquetado nativo | [Ver demo](https://spatialis-co.github.io/geovisores/arcgis.html) | `arcgis.html` |
| Leaflet | 1.9.4 | Visor mínimo (45 KB) para equipos modestos y conexiones lentas | [Ver demo](https://spatialis-co.github.io/geovisores/leaflet.html) | `leaflet.html` |
| OpenLayers | 10.3.1 | Motor OGC: reproyección, WMS/WMTS y *declutter* de etiquetas | [Ver demo](https://spatialis-co.github.io/geovisores/openlayers.html) | `openlayers.html` + `main.js` |

El visor de MapLibre es el que se incrusta por defecto en la web de Spatialis.

## Capas

Las dos capas viven en `data/` y se sirven estáticas, sin backend:

| Archivo | Entidades | Tamaño | Atributos |
|---|---|---|---|
| `colombia-departamentos.geojson` | 33 (32 departamentos + Bogotá D.C.) | 90 KB | `nombre`, `iso` (ISO 3166-2:CO), `tipo`, `centroide` |
| `colombia-ciudades.geojson` | 72 | 14 KB | `nombre`, `departamento`, `poblacion`, `capital`, `rango` |

Fuente: [Natural Earth](https://www.naturalearthdata.com), de dominio público y por tanto apto para uso comercial. `tools/build_colombia.py` reconstruye ambos archivos: descarga el original, filtra Colombia, simplifica con Douglas-Peucker y redondea a 4 decimales (~11 m).

```bash
python3 tools/build_colombia.py data
```

El script corrige de paso varias erratas de Natural Earth en los datos de Colombia: Bogotá viene codificada como `CO-CUN`, Tolima aparece como «del Tolima» en `name_es`, hay un polígono sin asignar (`CO-X01~`) y el departamento de San Andrés desaparece si se filtran las islas por área.

## Simbología

La cartografía se define una sola vez en `assets/spatialis-ui.js` y las cuatro librerías la reproducen:

- **Ciudades**: símbolo proporcional por población en cuatro clases (≥ 1 000 000 / 300 000 / 100 000 / resto). El tamaño codifica la magnitud y el color se mantiene constante, que es lo correcto para una variable cuantitativa. Las capitales llevan borde blanco.
- **Departamentos**: relleno translúcido y límite cian, con resaltado al pasar el cursor.
- **Etiquetas**: escalonadas por tamaño del departamento, para que a escala nacional solo se rotulen los grandes.

## Mapas base

Ninguno requiere clave de API ni genera facturación:

- **MapLibre**: estilos vectoriales de [OpenFreeMap](https://openfreemap.org) (oscuro, claro y calles).
- **MapLibre (terreno)**: [Terrain Tiles](https://registry.opendata.aws/terrain-tiles/) de AWS, codificación *terrarium*.
- **ArcGIS**: mapas base de Esri (`dark-gray-vector`, `topo-vector`, `satellite`).
- **Leaflet y OpenLayers**: teselas de Esri (World Dark Gray Canvas y World Imagery) y de OpenStreetMap.

> CARTO dejó de servir sus mapas base de forma anónima, así que el fondo oscuro de Leaflet y OpenLayers usa el servicio público de Esri.

## Interfaz

`assets/spatialis-ui.css` y `assets/spatialis-ui.js` definen el sistema de interfaz compartido, alineado a los tokens de color y tipografía de spatialis.com.co. Incluye barra superior, panel de capas, ficha de atributos, barra de estado, cargador y los ajustes necesarios para que los controles nativos de las cuatro librerías se vean iguales.

En pantallas de hasta 860 px el panel pasa a hoja inferior con asa de arrastre y los objetivos táctiles crecen a 44 px.

Cuando la página se carga dentro de un `iframe`, los visores activan el gesto cooperativo: la rueda del ratón desplaza la página y solo hace zoom con `Ctrl`.

## Cómo está hecho

Son páginas HTML estáticas. Las librerías se cargan desde CDN (unpkg, jsDelivr y js.arcgis.com), así que no hay que instalar ni compilar nada.

Para verlos en local:

```bash
python3 -m http.server 8777
```

y abrir <http://localhost:8777>.

## Licencia

Código de demostración, todos los derechos reservados. Consulta el archivo `LICENSE`. Las librerías de terceros conservan sus propias licencias y los datos de Natural Earth son de dominio público.

## Contacto

Spatialis S.A.S. · <https://spatialis.com.co> · desarrollo@spatialis.com.co
