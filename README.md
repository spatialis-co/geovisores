# geovisores

Demos de geovisores web. Muestran el mismo mapa de Bogotá construido con cuatro librerías de mapas distintas, para comparar cómo se implementa cada una.

Hacen parte del portafolio de demos de [Spatialis S.A.S.](https://spatialis.com.co)

## Demos

| Librería | Versión | Demo | Archivo |
|---|---|---|---|
| ArcGIS Maps SDK for JavaScript | 4.31 | [Ver demo](https://spatialis-co.github.io/geovisores/arcgis.html) | arcgis.html |
| Leaflet | 1.9.4 | [Ver demo](https://spatialis-co.github.io/geovisores/leaflet.html) | leaflet.html |
| MapLibre GL JS | 5.0.1 | [Ver demo](https://spatialis-co.github.io/geovisores/maplibre.html) | maplibre.html |
| OpenLayers | 10.3.1 | [Ver demo](https://spatialis-co.github.io/geovisores/openlayers.html) | openlayers.html y main.js |

Página de inicio con los cuatro enlaces: https://spatialis-co.github.io/geovisores/

## Cómo está hecho

Son páginas HTML estáticas. Las librerías se cargan desde CDN (unpkg, jsDelivr y js.arcgis.com), así que no hay que instalar ni compilar nada.

Para verlos en local, sirve la carpeta con cualquier servidor estático (por ejemplo, python -m http.server) y abre la página en el navegador.

## Mapas base y atribución

- Leaflet y OpenLayers usan teselas de OpenStreetMap (c) colaboradores de OpenStreetMap.
- MapLibre usa el estilo vectorial de OpenFreeMap, que no requiere clave de acceso.
- ArcGIS usa el mapa base de Esri.

## Licencia

Código de demostración, todos los derechos reservados. Consulta el archivo LICENSE. Las librerías de terceros conservan sus propias licencias.

## Contacto

Spatialis S.A.S. - https://spatialis.com.co - desarrollo@spatialis.com.co
