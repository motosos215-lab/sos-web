# Git Workflow

## Ramas

- `main` es la rama estable.
- Crear una rama corta por cambio, por ejemplo `feature/dashboard-summary` o `chore/frontend-ci`.
- Abrir pull request hacia `main`.
- Esperar que CI termine antes de mergear.

## Commits

- Hacer commits pequenos y revisables.
- No commitear secretos, archivos `.env` reales, credenciales ni tokens.
- No usar force push en ramas compartidas salvo acuerdo explicito del equipo.

## Pull Requests

Antes de pedir revision:

- Ejecutar `npm ci` si cambiaron dependencias.
- Ejecutar `npm run build`.
- Revisar `git status --short`.
- Revisar `git diff --stat`.
- Confirmar que no hay secretos ni archivos locales incluidos.

## Estado Actual Del Repositorio

Durante esta configuracion se observo que solo `README.md` estaba trackeado y el resto de archivos del frontend aparecian como no trackeados. Antes de crear un commit inicial o PR, revisar cuidadosamente que archivos deben entrar al repositorio.
