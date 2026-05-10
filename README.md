# RespiraCRM

CRM de ventas y operación para una empresa de dispositivos médicos respiratorios, construido como monorepo full-stack con una base funcional real: frontend, backend, PostgreSQL, Prisma, autenticación JWT con cookies httpOnly, roles, métricas y estructura preparada para crecer.

## Stack

- Frontend: Next.js 16 + TypeScript + Tailwind CSS
- Backend: NestJS 11 + TypeScript
- Base de datos: PostgreSQL
- ORM: Prisma
- Auth: JWT access token + refresh token en cookies httpOnly
- Validación: Zod en frontend, class-validator en backend
- CAPTCHA: hCaptcha / Google reCAPTCHA vía variables de entorno
- API docs: Swagger en `/docs`
- Testing: Jest con pruebas unitarias base en servicios críticos
- Contenedores: Docker Compose

## Estructura

```text
/apps
  /web
  /api

/packages
  /shared

/prisma
  schema.prisma
  seed.ts
  /migrations

/docker-compose.yml
/README.md
/.env.example
```

## Módulos implementados

### Backend

- `AuthModule`
- `UsersModule`
- `RolesModule`
- `BusinessUnitsModule`
- `CompaniesModule`
- `ContactsModule`
- `ProductsModule`
- `OpportunitiesModule`
- `ProposalsModule`
- `SalesModule`
- `ServiceOrdersModule`
- `InvoicesModule`
- `ReviewsModule`
- `MetricsModule`
- `AdminModule`
- `AuditLogsModule`

### Frontend

- `/login`
- `/dashboard`
- `/companies`
- `/companies/[id]`
- `/contacts`
- `/products`
- `/opportunities`
- `/opportunities/[id]`
- `/proposals`
- `/proposals/[id]`
- `/sales`
- `/service-orders`
- `/service-orders/[id]`
- `/invoices`
- `/reviews`
- `/admin`
- `/admin/users`
- `/admin/roles`
- `/admin/audit-logs`
- `/settings`

## Variables de entorno

Copia `.env.example` a `.env` y ajusta los valores según tu entorno:

```bash
cp .env.example .env
```

Variables principales:

- `DATABASE_URL`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `CAPTCHA_PROVIDER`
- `CAPTCHA_SECRET_KEY`
- `NEXT_PUBLIC_CAPTCHA_SITE_KEY`
- `NEXT_PUBLIC_CAPTCHA_PROVIDER`
- `NEXT_PUBLIC_API_URL`
- `CORS_ORIGIN`
- `INITIAL_ADMIN_EMAIL`
- `INITIAL_ADMIN_PASSWORD`

## Instalación local

```bash
npm install
npm run prisma:generate
```

## Levantar PostgreSQL con Docker Compose

```bash
docker compose up -d postgres
```

## Ejecutar migraciones

La migración inicial ya está incluida en `prisma/migrations`.
La base comercial incremental para scoring, round robin, captura pública y notificaciones comerciales quedó versionada en:

- `prisma/migrations/20260509103000_commercial_acceleration_foundation`

Para desarrollo:

```bash
npm run prisma:migrate
```

Para despliegue o contenedores:

```bash
npm run prisma:deploy
```

## Ejecutar seed

```bash
npm run prisma:seed
```

También puedes hacerlo dentro del contenedor API:

```bash
docker compose exec api npm run prisma:seed
```

## Ejecutar backend en desarrollo

```bash
npm run dev:api
```

Backend:

- API base: `http://localhost:4000/api`
- Swagger: `http://localhost:4000/docs`

## Ejecutar frontend en desarrollo

```bash
npm run dev:web
```

Frontend:

- App: `http://localhost:3000`

## Levantar todo con Docker Compose

```bash
docker compose up --build
```

Servicios:

- Web: `http://localhost:3000`
- API: `http://localhost:4000`
- PostgreSQL: `localhost:5432`

El contenedor del backend ejecuta:

- `prisma generate`
- `prisma migrate deploy`
- arranque de Nest en producción

## Credenciales iniciales

El seed crea, por defecto:

- Usuario admin: `admin@respiracrm.local`
- Password: `Admin12345!`

También crea usuarios de ejemplo para ventas y operación, unidades de negocio, empresas, contactos, productos, oportunidades, propuestas, ventas, órdenes e invoices.

## CAPTCHA en desarrollo

Si no configuras `CAPTCHA_SECRET_KEY` y `NEXT_PUBLIC_CAPTCHA_SITE_KEY`, el login entra en modo de desarrollo.

En ese caso usa:

- `captchaToken = dev-token`

Esto permite probar el flujo sin secretos reales y mantiene la integración lista para hCaptcha o reCAPTCHA en ambientes reales.

## Comandos útiles

```bash
npm run build
npm run lint
npm run test
npm run prisma:generate
npm run prisma:migrate
npm run prisma:deploy
npm run prisma:seed
```

## Cobertura funcional actual

- Login con CAPTCHA, cookies httpOnly y endpoint `/auth/me`
- Roles, permisos y guards por acceso
- CRUD principal de usuarios, empresas, contactos, productos, oportunidades, propuestas, ventas, órdenes, facturas y reseñas
- Soft delete para empresas y contactos
- Dashboard con métricas reales desde la base de datos
- Panel admin con resumen, auditoría, usuarios y salud del sistema
- Seed inicial con unidades de negocio `Insumos`, `Medical` y `MYB`
- Auditoría en acciones críticas del backend

## Pruebas incluidas

Servicios cubiertos:

- `AuthService`
- `UsersService`
- `CompaniesService`
- `MetricsService`
- `ServiceOrdersService`

## Escalabilidad prevista

La estructura quedó preparada para incorporar:

- reportes avanzados
- correo transaccional
- integración con WhatsApp
- exportación PDF de propuestas
- facturación electrónica
- inventario avanzado
- estrategias multiempresa

## Notas técnicas recientes

- Se habilitó captura pública de leads en `/lead` y en la API `POST /api/public/leads`, con CAPTCHA y asignación automática.
- El pipeline ahora contempla origen del lead, scoring explicable `P0-P4`, alertas de estancamiento y seguimiento basado en `dueDate` / `completedAt`.
- Se extendieron exportaciones Excel para contactos, oportunidades y ventas, además del patrón ya existente para empresas.
- Las secuencias de email, firma electrónica, IA comercial, gamificación y CTI siguen pendientes porque requieren proveedor externo o definiciones de negocio adicionales.
- Si vas a levantar estos cambios en otra base, ejecuta primero `npm run prisma:generate` y luego `npm run prisma:migrate` o `npm run prisma:deploy` según el entorno.

## Estado de la entrega

La base del CRM está funcional como MVP modular, con arquitectura preparada para ampliar reglas de negocio, mejorar flujos operativos y endurecer automatizaciones de despliegue.
