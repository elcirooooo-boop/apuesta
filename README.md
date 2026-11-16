# Oddscope

Explorador deportivo minimalista en español. HTML, CSS y JavaScript sin dependencias de compilación.

Ejecuta `npm run dev` y abre http://127.0.0.1:4173. Valida JavaScript con `npm run check`.

Incluye 12 deportes y 26 encuentros sintéticos, filtros, favoritos locales, comparador de hasta tres encuentros, búsqueda y categorías de mercados y exportación CSV. La agenda y todos los parámetros son de demostración: no son partidos actuales ni pronósticos calibrados. La metodología está explicada dentro del producto. Para producción con datos actuales hace falta un proveedor deportivo con licencia y backend para sus credenciales; nunca incluir claves en este cliente estático.

`dist/` contiene los archivos publicables. `.openai/hosting.json` conserva la identidad de Sites y el directorio estático.
