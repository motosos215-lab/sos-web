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

## Bloqueo temporal de seguridad en React Router

Frontend Security ejecuta `npm audit --audit-level=high` y permanece estricto.

Actualmente npm reporta advisories high en `react-router`, introducidos por `react-router-dom`. La excepcion documentada no significa que la vulnerabilidad haya sido corregida ni formalmente aceptada por el equipo.

No se aplico downgrade porque bajar a `react-router-dom@7.11.0`, version propuesta por npm, no resolvia el conjunto completo de advisories observado previamente y ademas requiere analisis de compatibilidad.

No se utilizo `npm audit fix --force`, no se agrego `continue-on-error` y no se redujo el nivel de auditoria.

El equipo debe actualizar cuando exista una version compatible que resuelva todos los advisories relevantes. Dependabot ayudara a detectar nuevas versiones disponibles.

Antes de actualizar deben ejecutarse build y pruebas manuales de navegacion. El riesgo se registra en `docs/security-risk-register.md` como `FE-SEC-001`.

## Procedimiento de actualizacion de React Router

1. Dependabot abre un pull request de actualizacion.
2. Revisar changelog y advisories de `react-router` y `react-router-dom`.
3. Confirmar version resuelta con `npm ls react-router react-router-dom`.
4. Ejecutar `npm ci`.
5. Ejecutar `npm audit --audit-level=high`.
6. Ejecutar `npm run build`.
7. Ejecutar scripts opcionales existentes, por ejemplo `format:check`, `lint`, `type-check` o `test` si estan configurados.
8. Probar manualmente `/login`.
9. Probar manualmente `/registro`.
10. Probar manualmente `/configuracion/perfil`.
11. Probar manualmente `/configuracion/confirmacion`.
12. Probar manualmente `/dashboard/resumen`.
13. Probar manualmente `/dashboard/incidentes`.
14. Probar manualmente `/dashboard/incidentes/INC-000123`.
15. Comprobar navegacion, rutas protegidas, redirecciones, parametros, logout y restauracion de sesion.
16. Integrar solamente cuando audit y CI sean satisfactorios.
17. Cerrar `FE-SEC-001` en `docs/security-risk-register.md`.

## Netlify Futuro

No hay deploy automatico configurado en este repositorio.

Configuracion manual recomendada cuando el equipo decida activar Netlify:

- Build command: `npm run build`
- Publish directory: `dist`
- Node version: `22`
- Variables de entorno: configurar desde Netlify, no desde Git.

Secrets tipicos de Netlify, si se usan GitHub Actions en el futuro:

- `NETLIFY_AUTH_TOKEN`
- `NETLIFY_SITE_ID`

No crear ni commitear esos secrets en archivos del repositorio.
