# CI/CD

## CI

Los workflows en `.github/workflows/` usan Node.js 22 y npm.

### Frontend CI

Archivo: `.github/workflows/frontend-ci.yml`.

Ejecuta:

- `npm ci`
- `npm run format:check` si el script existe.
- `npm run lint` si el script existe.
- `npm run type-check` si el script existe.
- `npm test` si el script existe.
- `npm run build` siempre.

Los scripts opcionales se omiten con un mensaje claro para no bloquear mientras no existan.

### CodeQL

Archivo: `.github/workflows/codeql.yml`.

Analiza JavaScript/TypeScript con GitHub CodeQL.

### Semgrep

Archivo: `.github/workflows/semgrep.yml`.

Ejecuta reglas `p/default`, `p/security-audit` y `p/secrets`.

Si se conecta Semgrep App, configurar `SEMGREP_APP_TOKEN` como secret de GitHub. No guardar ese token en el repositorio.

### Dependency Review

Archivo: `.github/workflows/dependency-review.yml`.

Se ejecuta en pull requests y falla en vulnerabilidades de severidad `high` o superior.

### Frontend Security

Archivo: `.github/workflows/frontend-security.yml`.

Ejecuta `npm audit --audit-level=high`.

## Dependencias frontend

Frontend Security ejecuta `npm audit --audit-level=high` y permanece estricto.

El riesgo historico `FE-SEC-001` por `react-router` / `react-router-dom` esta cerrado. La validacion actual no reporta vulnerabilidades high o critical con `npm audit --audit-level=high`.

No se debe usar `npm audit fix --force` sin revisar breaking changes. Las actualizaciones deben entrar por PR, con Dependency Review y ejecucion completa de CI.

## Procedimiento de actualizacion de dependencias

1. Dependabot abre un pull request de actualizacion.
2. Revisar changelog y advisories del paquete actualizado.
3. Confirmar version resuelta con `npm ls <paquete>` cuando aplique.
4. Ejecutar `npm ci`.
5. Ejecutar `npm audit --audit-level=high`.
6. Ejecutar `npm run format:check`.
7. Ejecutar `npm run lint`.
8. Ejecutar `npm run type-check`.
9. Ejecutar `npm test`.
10. Ejecutar `npm run build`.
11. Probar manualmente `/login`.
12. Probar manualmente `/register`.
13. Probar manualmente `/forgot-password`.
14. Probar manualmente `/emergency-contacts/{contactId}/edit` sin tokens en URL.
15. Probar manualmente `/configuracion/perfil`.
16. Probar manualmente `/configuracion/confirmacion`.
17. Probar manualmente `/dashboard/resumen`.
18. Probar manualmente `/dashboard/incidentes`.
19. Probar manualmente `/dashboard/incidentes/INC-000123`.
20. Comprobar navegacion, rutas protegidas, redirecciones, parametros, logout y restauracion de sesion.
21. Integrar solamente cuando audit y CI sean satisfactorios.

## Netlify

El proyecto tiene deploy preview activo en Netlify para Pull Requests.

Configuracion esperada:

- Build command: `npm run build`
- Publish directory: `dist`
- Node version: `22`
- Variables de entorno: configurar desde Netlify, no desde Git.

Rutas web requeridas por clientes moviles:

- Registro: `/register`
- Recuperacion de password: `/forgot-password`
- Edicion de contacto de emergencia: `/emergency-contacts/{contactId}/edit`

Estas rutas son del frontend web. No deben reemplazarse por URLs del API y no deben recibir `accessToken` ni `refreshToken` por query string.

Secrets tipicos de Netlify, si se usan GitHub Actions en el futuro:

- `NETLIFY_AUTH_TOKEN`
- `NETLIFY_SITE_ID`

No crear ni commitear esos secrets en archivos del repositorio.

## Validacion posterior a la estabilizacion

Los workflows del frontend validan Pull Requests hacia `develop` y `main`.

Status checks actuales a considerar como obligatorios:

- `Frontend CI`
- `npm audit`
- `Dependency Review`
- `Scan`
- `Analyze`
- `CodeQL`
- `netlify/motosos/deploy-preview`
