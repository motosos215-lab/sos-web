# Frontend Environment

Vite expone al navegador solo variables que empiezan con `VITE_`.

## Variables

```env
VITE_API_BASE_URL=https://motosos-api-tcrg6.ondigitalocean.app
VITE_API_TIMEOUT_MS=15000
VITE_APP_NAME=MotoSOS
VITE_APP_ENV=development
```

## Uso Actual

- `VITE_API_BASE_URL` se usa como `baseURL` de Axios.
- `VITE_API_TIMEOUT_MS` se usa como timeout de Axios.
- `VITE_APP_NAME` y `VITE_APP_ENV` quedan documentadas para configuracion de ambiente y despliegues futuros.

## Archivos Locales

- Usar `.env.development` para desarrollo local.
- Usar variables del proveedor para produccion, por ejemplo Netlify Environment Variables.
- No commitear `.env`, `.env.development`, `.env.production` ni secretos reales.

## CORS

El backend debe permitir origenes completos con protocolo, host y puerto.

Origenes validos para desarrollo local:

- `http://localhost:5173`
- `http://127.0.0.1:5173`

No configurar rutas como origen CORS. `http://localhost:5173/login` es una URL de pagina, no un origen.
