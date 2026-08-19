# GitHub Branch Protection

Este archivo documenta la proteccion activa de ramas configurada en GitHub para `main` y `develop`.

## Proteccion Activa Para `main` Y `develop`

- Requerir pull request antes de mergear.
- Requerir al menos una aprobacion.
- Requerir que conversaciones sean resueltas.
- Requerir status checks antes de mergear.
- Requerir que la rama este actualizada antes del merge.
- Bloquear force push.
- Bloquear eliminacion de rama.

## Status Checks Obligatorios

- `Frontend CI`
- `npm audit`
- `Dependency Review`
- `Scan`
- `Analyze`
- `CodeQL`
- `netlify/motosos/deploy-preview`

## Frontend Security

`Frontend Security / npm audit` debe ejecutarse en todos los pull requests hacia `main` y `develop`.

Actualmente `npm audit --audit-level=high` pasa sin vulnerabilidades reportadas y se mantiene como required check.

Los nombres exactos pueden variar en GitHub segun como renderice cada workflow. Confirmarlos desde un pull request real antes de marcar checks como obligatorios.

## Dependabot

`.github/dependabot.yml` configura revisiones semanales para npm y GitHub Actions. Dependabot alerts y security updates estan habilitados en la configuracion del repositorio.

## CODEOWNERS

`.github/CODEOWNERS` asigna propiedad global al equipo u organizacion del repositorio. Ajustar el owner si GitHub reporta que el identificador no tiene permisos sobre el repositorio.
