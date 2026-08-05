MotoSOS Web
===========

Frontend web de MotoSOS construido con React, TypeScript y Vite.

## Requisitos

- Node.js 22 para CI y entornos compartidos.
- npm con `package-lock.json` como lockfile del proyecto.

## Desarrollo Local

Instalar dependencias:

```bash
npm ci
```

Crear un archivo `.env.development` local a partir de `.env.example` y ajustar valores si hace falta.

Ejecutar Vite:

```bash
npm run dev
```

URLs locales habituales:

- Aplicacion: `http://localhost:5173`
- Login: `http://localhost:5173/login`
- Alternativa local: `http://127.0.0.1:5173`

## Variables De Entorno

Solo las variables con prefijo `VITE_` son expuestas al frontend por Vite.

Variables esperadas:

- `VITE_API_BASE_URL`: URL base de la API. Valor actual recomendado: `https://motosos-api-tcrg6.ondigitalocean.app`.
- `VITE_API_TIMEOUT_MS`: timeout HTTP en milisegundos. Valor por defecto recomendado: `15000`.
- `VITE_APP_NAME`: nombre visible de la aplicacion.
- `VITE_APP_ENV`: ambiente logico de la aplicacion, por ejemplo `development`, `staging` o `production`.

No subir archivos `.env`, `.env.development`, `.env.production` ni secretos reales al repositorio.

## CORS

El backend debe permitir origenes, no rutas completas.

Origenes locales correctos:

- `http://localhost:5173`
- `http://127.0.0.1:5173`

Ejemplo incorrecto para CORS:

- `http://localhost:5173/login`

`/login` es una ruta del frontend, no un origen CORS.

## Comandos

```bash
npm run dev
npm run build
npm run preview
```

El build ejecuta `tsc -b && vite build`.

## Flujo Git

- Crear ramas desde `main` para cada cambio.
- Abrir pull request hacia `main`.
- Revisar CI antes de mergear.
- No commitear secretos ni archivos `.env` reales.
- No hacer force push sobre ramas compartidas salvo acuerdo explicito del equipo.

Ver detalles en `docs/git-workflow.md`.

## CI Y Seguridad

La configuracion esperada en GitHub Actions cubre:

- Build del frontend con Node.js 22.
- CodeQL para JavaScript/TypeScript.
- Semgrep para patrones de seguridad y secretos.
- Dependency Review en pull requests.
- Auditoria npm con bloqueo en vulnerabilidades high/critical.

Ver detalles en `docs/ci-cd.md`.

## Netlify

Este repositorio queda preparado documentalmente para un despliegue futuro en Netlify, pero no incluye deployment automatico ni secretos de Netlify.

Configuracion esperada cuando se active manualmente:

- Build command: `npm run build`
- Publish directory: `dist`
- Node version: `22`
- Variables de entorno configuradas desde el panel de Netlify, no desde Git.
