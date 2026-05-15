# Deploy En Railway

Este repo queda listo para desplegarse como 3 servicios:

- `Postgres`
- `api`
- `web`

Usa exactamente esos nombres para `api` y `web`, porque las variables de ejemplo referencian esos nombres.

## Archivos listos

- Config del servicio API: `apps/api/railway.json`
- Config del servicio Web: `apps/web/railway.json`
- Variables ejemplo API: `deploy/railway/api.env.example`
- Variables ejemplo Web: `deploy/railway/web.env.example`

## Paso A Paso

### 1. Subir el repo

Sube este repo a GitHub con los cambios de despliegue.

### 2. Crear el proyecto

En Railway:

1. Crea un proyecto nuevo.
2. Conecta el repositorio.
3. Agrega una base de datos PostgreSQL desde Railway.

### 3. Crear el servicio `api`

1. Agrega un nuevo servicio desde GitHub Repo.
2. Nómbralo `api`.
3. En `Source`, selecciona este mismo repo.
4. Deja el `Root Directory` en `/`.
5. En `Settings -> Config as Code`, apunta al archivo:

```text
/apps/api/railway.json
```

6. En `Variables`, pega el contenido de:

```text
deploy/railway/api.env.example
```

7. Reemplaza los secretos placeholder por valores reales.

### 4. Crear el servicio `web`

1. Agrega otro servicio desde el mismo repo.
2. Nómbralo `web`.
3. Deja el `Root Directory` en `/`.
4. En `Settings -> Config as Code`, apunta al archivo:

```text
/apps/web/railway.json
```

5. Genera un dominio público para `web`.
6. En `Variables`, pega el contenido de:

```text
deploy/railway/web.env.example
```

## Variables importantes

### API

- `DATABASE_URL` debe venir de PostgreSQL.
- `CORS_ORIGIN` debe apuntar al dominio público del `web`.
- `FRONTEND_URL` debe apuntar al dominio público del `web`.
- `GOOGLE_CALLBACK_URL` debe ser:

```text
https://<dominio-web>/api/auth/google/callback
```

- `CAPTCHA_SECRET_KEY` es obligatorio en producción si vas a usar login.

### Web

- `INTERNAL_API_URL` debe apuntar al dominio privado del servicio `api`.
- `NEXT_PUBLIC_CAPTCHA_SITE_KEY` es obligatorio en producción si vas a usar login.

## Importante Sobre Este Repo

- No uses `Root Directory=apps/api` ni `Root Directory=apps/web`.
  Los Dockerfiles copian archivos desde la raíz del monorepo.
- No importes `.env.example` completo en Railway.
  Ese archivo tiene valores locales de `localhost`.
- No necesitas exponer `api` públicamente para que el `web` funcione.
  El frontend usa la red privada de Railway para hablar con el backend.
- El login en producción necesita CAPTCHA real.
  El bypass `dev-token` no funciona con `NODE_ENV=production`.

## Primer Deploy

Después del primer deploy exitoso:

1. Abre una shell del servicio `api`.
2. Ejecuta:

```bash
pnpm run prisma:seed
```

Eso crea el usuario admin inicial y los datos base.

## Verificación

- Salud API: `/api/health`
- Salud Web: `/health`
- Swagger API: `/docs`
- Login Web: `/login`

## OAuth De Google

Si usas Google OAuth, en Google Cloud debes registrar como callback exactamente:

```text
https://<dominio-web>/api/auth/google/callback
```
