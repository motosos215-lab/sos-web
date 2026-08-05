# GitHub Rulesets

Este archivo documenta una configuracion recomendada. No activa reglas automaticamente.

## Proteccion Recomendada Para `main`

- Requerir pull request antes de mergear.
- Requerir al menos una aprobacion.
- Requerir que conversaciones sean resueltas.
- Requerir status checks antes de mergear.
- Bloquear force push.
- Bloquear eliminacion de rama.
- Requerir que ramas esten actualizadas antes del merge si el flujo del equipo lo permite.

## Status Checks Recomendados Para `main`

- `Frontend CI / Build`
- `CodeQL / Analyze`
- `Semgrep / Scan`
- `Dependency Review / Dependency Review` para pull requests.

## Status Checks Recomendados Para `develop`

- `Frontend CI / Build`
- `CodeQL / Analyze`
- `Semgrep / Scan`

## Frontend Security Durante El Bloqueo

`Frontend Security / npm audit` debe ejecutarse en todos los pull requests hacia `main` y `develop`.

Actualmente reportara fallo por el advisory conocido de `react-router`. No convertir `Frontend Security` en required check mientras su fallo conocido haga imposible integrar cualquier pull request.

No debe agregarse como required check hasta que exista una version segura y compatible, el advisory sea corregido o el equipo apruebe formalmente una excepcion temporal documentada.

Cuando el bloqueo se resuelva:

- Agregar `Frontend Security / npm audit` como required check en `protect-main`.
- Agregar `Frontend Security / npm audit` como required check en `protect-develop`.
- Cerrar `FE-SEC-001` en `docs/security-risk-register.md`.
- Actualizar `docs/ci-cd.md`.

Los nombres exactos pueden variar en GitHub segun como renderice cada workflow. Confirmarlos desde un pull request real antes de marcar checks como obligatorios.

## CODEOWNERS

`.github/CODEOWNERS` asigna propiedad global al equipo u organizacion del repositorio. Ajustar el owner si GitHub reporta que el identificador no tiene permisos sobre el repositorio.
