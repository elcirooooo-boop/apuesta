# Oddscope

Plataforma local y responsive de partidos, cuotas y porcentajes implícitos de Triunfobet. Triunfobet es la única fuente de datos deportivos.

## Ejecutar

Requiere Node.js y Chrome o Edge instalado.

    npm install
    npm run dev

Abrir http://127.0.0.1:4173/. Se inicia directamente con baloncesto; el menú ofrece el catálogo de deportes que devuelve Triunfobet. Las competiciones del deporte y día elegidos se muestran alfabéticamente, sin paginación oculta en la interfaz.

## Datos y porcentajes

Se muestran únicamente los mercados identificados como Crear Apuesta por Triunfobet (isBB=true, o pertenencia explícita al grupo cuando falta esa bandera). Se excluyen variantes normales con isBB=false y selecciones expresamente incompatibles (isDBB=false). Si no hay mercados de Crear Apuesta, no se sustituyen por otros. Se deduplican referencias de móvil y escritorio.

Cada cuota decimal activa y válida produce un porcentaje implícito: 100 ÷ cuota. Incluye el margen de la casa, sin normalizar resultados solapados ni líneas diferentes. No es una estimación estadística independiente. En líneas con devolución o liquidación parcial, no equivale a la probabilidad de acertar. Las cuotas suspendidas, ausentes o inválidas no reciben porcentaje. Los porcentajes son de selecciones individuales; no se multiplican para una combinada.

El filtro «Probabilidad mayor que» admite decimales, excluye resultados sin porcentaje y conserva su valor entre fichas y sesiones. Se combina con búsqueda y categoría. Los favoritos y el comparador conservan únicamente identificadores propios de Triunfobet.

## Conexión por navegador

Playwright controla Chrome visible (Edge como alternativa) con un perfil aislado en .local/triunfobet-browser, excluido de Git. La ventana debe permanecer abierta para las consultas. No se inicia sesión, no se copian cookies ni tokens, no se realizan apuestas ni se automatizan desafíos. TRIUNFOBET_CHROME_PATH y TRIUNFOBET_BROWSER_PROFILE permiten elegir ejecutable y perfil aislado.

El servidor escucha las peticiones públicas del widget de Altenar y ejecuta consultas GET desde esa pestaña. Los endpoints locales son /api/triunfobet/status, /api/triunfobet/matches y /api/triunfobet/probabilities. Los datos se obtienen exclusivamente del proveedor y no se sustituyen por ejemplos ante errores.

La agenda recorre los próximos encuentros del deporte elegido y añade los directos disponibles. No ofrece archivo de terminados. Las fechas y horas usan America/Caracas. La agenda se refresca cada 60 segundos con la página visible; las cuotas se consultan al aproximarse el encuentro a la pantalla o abrir su ficha, con caché de 30 segundos y un máximo de dos consultas de fichas simultáneas en el cliente.

## Verificación

    npm test
    npm run check

Las pruebas verifican identidad, campos admitidos, exclusión de credenciales, marcadores ausentes, filtrado de Crear Apuesta, deduplicación, cuotas suspendidas y cálculo implícito sin normalización incorrecta.

Los cambios se mantienen en local. La interfaz del proveedor puede cambiar; el acceso técnico no concede derechos de redistribución.
