# RespiraCRM — Inventario Completo de Implementación

> Revisión al 10/05/2026 · Branch: `main` · Último commit: `859f9cc`

---

## Tabla de contenidos

1. [Stack tecnológico](#1-stack-tecnológico)
2. [Arquitectura general](#2-arquitectura-general)
3. [Base de datos](#3-base-de-datos)
4. [Backend — Módulos NestJS](#4-backend--módulos-nestjs)
5. [Frontend — Páginas](#5-frontend--páginas-28-rutas)
6. [Frontend — Componentes](#6-frontend--componentes)
7. [Frontend — Hooks y servicios](#7-frontend--hooks-y-servicios)
8. [Autenticación y seguridad](#8-autenticación-y-seguridad)
9. [Integraciones externas](#9-integraciones-externas)
10. [Features implementadas — Resumen ejecutivo](#10-features-implementadas--resumen-ejecutivo)
11. [Infraestructura y despliegue](#11-infraestructura-y-despliegue)
12. [Conteo de archivos](#12-conteo-de-archivos)

---

## 1. Stack tecnológico

| Capa | Tecnología | Versión |
|---|---|---|
| Frontend framework | Next.js (App Router) | 16.2.6 |
| UI library | React | 19.2.4 |
| Styling | TailwindCSS | 4.x |
| Data fetching | TanStack React Query | 5.90.5 |
| Formularios | React Hook Form + Zod | 7.x / 4.x |
| Backend framework | NestJS | 11.x |
| ORM | Prisma | 6.18.0 |
| Base de datos | PostgreSQL | 16 |
| Auth | JWT (access 15m + refresh 7d) + bcrypt | — |
| AI / LLM | Groq llama-3.3-70b + Google Gemini | — |
| Mapas | Leaflet + React Leaflet | 1.9 / 5.0 |
| Gráficos | Recharts | 3.5.0 |
| PDF | @react-pdf/renderer | 4.5.1 |
| Drag & drop | @dnd-kit | — |
| Calendario | React Big Calendar | 1.19.4 |
| Exportación Excel | ExcelJS | 4.4.0 |
| Email | Nodemailer | 8.0.7 |
| CAPTCHA | hCaptcha + reCAPTCHA (configurable) | — |
| Iconos | Lucide React | 0.542.0 |
| Notificaciones UI | Sonner (toast) | 2.0.7 |
| Contenedores | Docker Compose | — |

---

## 2. Arquitectura general

```
root/
├── apps/
│   ├── api/              → NestJS 11 (puerto 4000)
│   └── web/              → Next.js 16 (puerto 3000)
├── packages/
│   └── shared/           → Tipos TypeScript y domain logic compartidos
├── prisma/               → Schema, migraciones y scripts de seed
├── docker-compose.yml    → Orquestación de servicios
└── RespiraCRM_PlanCompleto.md
```

**Monorepo** con `npm workspaces`. El paquete `@respira/shared` es consumido tanto por el API como por el frontend, garantizando consistencia de tipos sin duplicación.

---

## 3. Base de datos

### Entidades (19 modelos Prisma)

| Entidad | Propósito |
|---|---|
| `User` | Usuarios del sistema con roles y permisos |
| `Role` / `Permission` | RBAC: roles con permisos granulares |
| `BusinessUnit` | Unidades de negocio / territorios de ventas |
| `Company` | Clientes y cuentas (`LEAD → ACTIVE → INACTIVE → ARCHIVED`) |
| `Contact` | Personas de contacto vinculadas a empresas |
| `Product` | Catálogo de productos médicos (nebulizadores, espirometría, etc.) |
| `Opportunity` | Pipeline de ventas con stages configurables |
| `Proposal` | Cotizaciones vinculadas a oportunidades |
| `Sale` | Ventas cerradas |
| `Invoice` | Facturación con seguimiento de estados de pago |
| `ServiceOrder` | Órdenes de servicio post-venta con prioridades |
| `Activity` | Actividades (`CALL`, `EMAIL`, `MEETING`, `NOTE`, `TASK`, `WHATSAPP`) |
| `Review` | Evaluaciones NPS y satisfacción del cliente |
| `AuditLog` | Registro automático de todas las operaciones del sistema |
| `Notification` | Notificaciones en tiempo real por usuario |
| `EmailSequence` | Campañas de email automatizadas |
| `UserStats` | Estadísticas de gamificación por usuario |
| `Badge` / `UserBadge` | Sistema de insignias |
| `PointAction` | Registro histórico de puntos ganados |

### Enums principales

```
CompanyStatus:       LEAD, ACTIVE, INACTIVE, ARCHIVED
OpportunityStage:    NEW, CONTACTED, QUALIFIED, PROPOSAL_SENT, NEGOTIATION, WON, LOST
ProposalStatus:      DRAFT, SENT, ACCEPTED, REJECTED, EXPIRED
SaleStatus:          PENDING, CONFIRMED, CLOSED, CANCELLED
ServiceOrderStatus:  OPEN, ASSIGNED, IN_PROGRESS, COMPLETED, CANCELLED
InvoiceStatus:       DRAFT, ISSUED, PAID, OVERDUE, CANCELLED
ActivityType:        CALL, EMAIL, MEETING, NOTE, TASK, WHATSAPP
LeadSource:          WEB_FORM, WHATSAPP, PHONE, REFERRAL, SOCIAL_MEDIA, CONGRESS, COLD_CALL, OTHER
```

### Migraciones aplicadas (4)

| # | Nombre | Contenido |
|---|---|---|
| 1 | `20260509040400_init_medical_mb` | Schema inicial para dispositivos médicos |
| 2 | `20260509070050_enrich_product_model` | Enriquecimiento del modelo de producto (marca, modelo, segmentos) |
| 3 | `20260509103000_commercial_acceleration_foundation` | Lead scoring, SLA tracking, reglas de asignación |
| 4 | `20260509160000_pipeline_sla_and_assignment_rules` | Pipeline SLA y reglas avanzadas de asignación |

### Seeds disponibles (6 scripts)

| Script | Propósito |
|---|---|
| `prisma/seed.ts` | Seed principal (admin, roles, productos, datos demo) |
| `prisma/seed-mock.ts` | Generación masiva de datos de demostración |
| `seed-gamification.ts` | Puntos e insignias iniciales |
| `seed-sequences.ts` | Secuencias de email predefinidas |
| `seed-cpq.ts` | Configuración CPQ inicial |
| `sync-points.ts` | Sincronización de puntos históricos |

---

## 4. Backend — Módulos NestJS

**Total: 30 módulos**

### Infraestructura global

| Módulo | Descripción |
|---|---|
| `PrismaModule` | Acceso a base de datos como servicio inyectable |
| `ConfigModule` | Variables de entorno tipadas |
| `ScheduleModule` | Soporte para tareas programadas (cron) |
| `ThrottlerModule` | Rate limiting: 60 requests / 60 segundos |

### Guards y middleware globales

| Guard / Interceptor | Propósito |
|---|---|
| `JwtAuthGuard` | Protege todas las rutas excepto login y lead form |
| `RolesGuard` | Verifica rol del usuario en cada endpoint |
| `PermissionsGuard` | Verifica permisos granulares |
| `AllExceptionsFilter` | Manejo unificado de errores con formato consistente |
| `RequestLoggingInterceptor` | Log de request/response para debugging |
| `ThrottlerGuard` | Rate limiting global |

### Módulos de autenticación y administración

| Módulo | Features implementadas |
|---|---|
| `AuthModule` | Login con CAPTCHA, JWT access + refresh, logout, `/me` endpoint |
| `UsersModule` | CRUD completo de usuarios, asignación de roles |
| `RolesModule` | Definición de roles y permisos granulares (25 permisos, 4 roles) |
| `AuditLogsModule` | Registro automático de todas las operaciones con usuario y timestamp |

### Módulos de entidades CRM

| Módulo | Endpoints | Features especiales |
|---|---|---|
| `CompaniesModule` | CRUD + filtros + exportar Excel | Lead scoring, coordenadas GPS, detección de duplicados |
| `ContactsModule` | CRUD + búsqueda | Vinculación a empresa, tipos de cliente |
| `ProductsModule` | CRUD + catálogo | Marca, modelo, segmentos, especificaciones técnicas |
| `OpportunitiesModule` | Pipeline + kanban | SLA tracking, asignación automática, scoring |
| `ProposalsModule` | CRUD + PDF | Generación de PDF, versionado, CPQ integration |
| `SalesModule` | Ventas cerradas | Trazabilidad completa desde oportunidad |
| `InvoicesModule` | Facturación | Estados de pago, alertas automáticas de vencimiento |
| `ServiceOrdersModule` | Órdenes post-venta | Prioridades (LOW/MEDIUM/HIGH/URGENT), asignación técnico |
| `ActivitiesModule` | Timeline | Multi-tipo, vinculable a empresa/contacto/oportunidad/orden |
| `ReviewsModule` | NPS | Evaluaciones de satisfacción con comentarios |
| `CalendarModule` | Eventos | Integración con actividades, oportunidades, órdenes, facturas |

### Módulos avanzados

| Módulo | Descripción detallada |
|---|---|
| **`AIModule`** | Integración con **Groq LLM** (llama-3.3-70b-versatile) vía OpenAI SDK. Genera resúmenes ejecutivos de oportunidades e insights de ventas **en español**. Google Generative AI (Gemini) disponible como alternativa. |
| **`GamificationModule`** | Sistema completo de puntos (nivel = `floor(pts/500)+1`), insignias (`FIRST_WIN`, `ELITE_SELLER`, `PRODUCTIVE_AGENT`), leaderboard top-10, historial de badges por usuario. |
| **`EmailSequencesModule`** | Campañas de email automatizadas con templates, triggers por evento y seguimiento de estado de envío. |
| **`NotificationsModule`** | Notificaciones en tiempo real con deduplicación. Tipos: `INVOICE_OVERDUE`, `PROPOSAL_EXPIRING`, `ACTIVITY_DUE`, `ACTIVITY_OVERDUE`. |
| **`TasksService`** | Tareas background automáticas (cada hora): revisión de facturas vencidas, propuestas por expirar (1 día antes), actividades pendientes/vencidas. |
| **`DuplicatesModule`** | Detección de empresas y contactos duplicados con asistente de fusión. |
| **`CPQModule`** | Configure-Price-Quote engine con reglas de descuento automáticas (por volumen y tipo de cliente). |
| **`MetricsModule`** | Cálculo de KPIs: conversión de embudo, forecast ponderado, ventas por período. |
| **`SearchModule`** | Búsqueda global full-text entre empresas, contactos, oportunidades y productos. |
| **`MailModule`** | Servicio de email transaccional con Nodemailer. |

### API Documentation
- Swagger UI disponible en `/docs` (entorno de desarrollo)
- Todos los endpoints documentados con DTOs y tipos de respuesta

---

## 5. Frontend — Páginas (28 rutas)

### Rutas públicas

| Ruta | Descripción |
|---|---|
| `/login` | Formulario de autenticación con hCaptcha integrado |
| `/lead` | Formulario público de captura de leads (sin autenticación) |

### Aplicación protegida (layout con AppShell: sidebar + topbar)

| Ruta | Descripción |
|---|---|
| `/dashboard` | KPIs principales, gráficos Recharts, actividad reciente del equipo |
| `/companies` | Lista de empresas con filtros avanzados, búsqueda y exportar Excel |
| `/companies/[id]` | Perfil completo de empresa + timeline de actividades + resumen IA |
| `/companies/map` | Mapa interactivo Leaflet con ubicación geográfica de empresas |
| `/contacts` | Gestión de contactos vinculados a empresas |
| `/opportunities` | Pipeline de ventas (lista + Kanban drag-and-drop) |
| `/opportunities/[id]` | Detalle de oportunidad + resumen IA Groq + historial actividades |
| `/proposals` | Listado de cotizaciones con estados |
| `/proposals/[id]` | Editor de propuesta + descarga en PDF |
| `/products` | Catálogo de productos médicos (PARI, nebulizadores, espirometría) |
| `/sales` | Ventas cerradas con trazabilidad completa |
| `/service-orders` | Listado de órdenes de servicio por prioridad |
| `/service-orders/[id]` | Detalle y gestión de orden de servicio |
| `/invoices` | Gestión de facturas y seguimiento de estados de pago |
| `/calendar` | Vista calendario unificada (actividades + oportunidades + facturas + órdenes) |
| `/follow-ups` | Bandeja inteligente de seguimientos pendientes y vencidos |
| `/reports` | Dashboard de analytics avanzado con múltiples gráficos |
| `/reviews` | Evaluaciones NPS y satisfacción del cliente |
| `/settings` | Configuración de cuenta del usuario |
| `/admin` | Panel de administración con métricas rápidas |
| `/admin/users` | CRUD completo de usuarios del sistema |
| `/admin/roles` | Gestión de roles y permisos granulares |
| `/admin/audit-logs` | Registro de auditoría con filtros por usuario y acción |

---

## 6. Frontend — Componentes

### Layout y navegación (`components/layout/`)

| Componente | Descripción |
|---|---|
| `app-shell.tsx` | Contenedor principal con sidebar fijo + topbar sticky |
| `sidebar.tsx` | Menú lateral con todas las rutas y badge de notificaciones |
| `topbar.tsx` | Barra superior con menú de usuario y perfil |
| `GlobalSearch.tsx` | Búsqueda unificada entre todas las entidades |
| `page-header.tsx` | Header de página con título y breadcrumb consistentes |
| `notification-bell.tsx` | Campana de notificaciones con polling automático |
| `nav-icons.tsx` | Botones de acciones rápidas en topbar |

### Componentes de features

| Área | Componentes | Descripción |
|---|---|---|
| **Dashboard** | `dashboard-page.tsx`, `metric-card.tsx` | KPIs y tarjetas de métricas con gráficos |
| **Actividades** | `ActivityTimeline.tsx`, `QuickActionActivity.tsx` | Timeline cronológico, acciones inline |
| **IA** | `AISummary.tsx` | Resúmenes generados por Groq LLM en español |
| **Auth** | `login-form.tsx`, `captcha-field.tsx` | Formulario de login con hCaptcha |
| **Kanban** | `KanbanBoard.tsx`, `KanbanColumn.tsx`, `OpportunityCard.tsx` | Pipeline drag-and-drop con dnd-kit |
| **Mapas** | `MapComponent.tsx`, `MapViewer.tsx` | Visualización geográfica con Leaflet/OpenStreetMap |
| **PDF** | `proposal-pdf.tsx`, `download-pdf-button.tsx` | Render y descarga de propuestas en PDF |
| **Propuestas** | `proposal-dialog.tsx` | Modal de creación y edición de cotizaciones |
| **Forms** | `entity-dialog.tsx`, `potential-duplicate-modal.tsx` | Modal genérico de entidades + asistente de duplicados |
| **Gamificación** | `Leaderboard.tsx` | Ranking del equipo de ventas en tiempo real |

### Design System (`components/ui/`)

`Button` · `Card` · `Badge` · `Input` · `Select` · `Textarea` · `Field` · `Table` · `Modal` · `EmptyState` · `Skeleton`

---

## 7. Frontend — Hooks y servicios

### Custom Hooks (`hooks/`)

| Hook | Propósito |
|---|---|
| `use-api-list.ts` | Wrapper React Query para listas paginadas con filtros |
| `use-debounce.ts` | Debounce para inputs de búsqueda (evita requests excesivos) |
| `use-reference-data.ts` | Carga de datos de referencia (stages, usuarios, productos, roles...) |

### Servicios y utilidades (`lib/`)

| Archivo | Propósito |
|---|---|
| `api-client.ts` | Cliente HTTP con interceptor JWT auto-refresh en 401 |
| `server-auth.ts` | Validación de sesión server-side (Next.js Server Components) |
| `crm.ts` | Helpers de lógica de negocio CRM |
| `duplicates.ts` | Algoritmos de detección de registros duplicados |
| `format.ts` | Formateo de fechas, moneda (ARS/USD), porcentajes |
| `query-string.ts` | Builder tipado de query parameters para API |
| `utils.ts` | `clsx` + `tailwind-merge` para clases CSS condicionales |
| `captcha.ts` | Integración hCaptcha / Google reCAPTCHA |

---

## 8. Autenticación y seguridad

| Mecanismo | Implementación |
|---|---|
| **Estrategia JWT** | HttpOnly cookies (no localStorage). Access token 15 min, Refresh token 7 días |
| **Refresh automático** | El cliente intercepta 401 y llama a `/api/auth/refresh` transparentemente |
| **CAPTCHA** | hCaptcha en login y lead form. Configurable a Google reCAPTCHA vía env vars |
| **Passwords** | bcrypt hashing (salt rounds configurable) |
| **RBAC** | 4 roles predefinidos (ADMIN, MANAGER, SELLER, VIEWER) con 25 permisos granulares |
| **Rate limiting** | 60 requests / 60 segundos por IP (ThrottlerModule) |
| **Headers de seguridad** | Helmet middleware (CSP, HSTS, XSS protection, etc.) |
| **CORS** | Configurado con `credentials: true` y origin lista blanca |

---

## 9. Integraciones externas

| Integración | Uso en el proyecto | Variable de entorno |
|---|---|---|
| **Groq LLM** (llama-3.3-70b) | Resúmenes ejecutivos IA de oportunidades y insights de ventas en español | `GROQ_API_KEY` |
| **Google Generative AI** | Alternativa a Groq con modelos Gemini | `GOOGLE_AI_KEY` |
| **hCaptcha** | Anti-bot en formularios de login y captura de leads | `CAPTCHA_SECRET_KEY` |
| **Nodemailer** | Email transaccional (secuencias, notificaciones, alertas) | SMTP config |
| **Leaflet + OpenStreetMap** | Mapas interactivos de visitas geográficas (sin API key) | — |
| **React PDF Renderer** | Generación de propuestas comerciales en PDF | — |
| **ExcelJS** | Exportación de listados a Excel (.xlsx) | — |
| **Recharts** | Gráficos de ventas, pipeline y analytics | — |

---

## 10. Features implementadas — Resumen ejecutivo

### Pipeline y ventas
- [x] Pipeline de oportunidades con vista lista y Kanban drag-and-drop (dnd-kit)
- [x] Stages configurables por oportunidad (NEW → WON/LOST)
- [x] SLA tracking con alertas automáticas por etapa
- [x] Reglas de asignación automática de oportunidades
- [x] Lead scoring en empresas
- [x] Seguimiento de actividades por oportunidad (timeline)

### Cotizaciones y facturación
- [x] Generación de propuestas con descarga en PDF profesional
- [x] Motor CPQ con descuentos automáticos (volumen y tipo de cliente)
- [x] Facturación con estados de pago (DRAFT → ISSUED → PAID / OVERDUE)
- [x] Alertas automáticas de facturas vencidas (background task)
- [x] Alertas de propuestas por expirar (1 día antes)

### Gestión de clientes
- [x] CRUD completo de empresas y contactos
- [x] Mapa geográfico de visitas con Leaflet/OpenStreetMap
- [x] Geocodificación automática con lógica de fallback
- [x] Detección y fusión de registros duplicados
- [x] Exportación a Excel de empresas, contactos y oportunidades
- [x] Timeline cronológico de actividades por empresa

### Automatización e inteligencia artificial
- [x] Resúmenes ejecutivos con Groq LLM (llama-3.3-70b, respuestas en español)
- [x] Google Gemini como LLM alternativo
- [x] Secuencias de email automatizadas con templates
- [x] Tareas background cada hora (facturas, propuestas, actividades vencidas)
- [x] Notificaciones en tiempo real con deduplicación y polling automático

### Gamificación
- [x] Sistema de puntos con niveles progresivos (nivel = `floor(pts/500) + 1`)
- [x] Insignias: `FIRST_WIN`, `ELITE_SELLER`, `PRODUCTIVE_AGENT`
- [x] Leaderboard top-10 del equipo visible en sidebar
- [x] Historial de puntos y badges por usuario

### Administración y seguridad
- [x] CRUD de usuarios con asignación de roles
- [x] Gestión de roles y 25 permisos granulares
- [x] Audit log completo de todas las operaciones del sistema
- [x] Panel de administración con métricas rápidas
- [x] CAPTCHA en login y formularios públicos

### Reportes y analytics
- [x] Dashboard principal con KPIs de ventas
- [x] Reportes avanzados con múltiples gráficos Recharts
- [x] Métricas de actividad del equipo
- [x] Calendario unificado (actividades + oportunidades + facturas + órdenes)
- [x] Bandeja de seguimientos pendientes/vencidos

### Infraestructura
- [x] Monorepo con npm workspaces y paquete compartido `@respira/shared`
- [x] Docker Compose (PostgreSQL 16 + API + Web) listo para despliegue
- [x] Rate limiting, Helmet, CORS configurado
- [x] Swagger API docs en `/docs`
- [x] Scripts de seed con datos de demostración

---

## 11. Infraestructura y despliegue

### Docker Compose (3 servicios)

```yaml
postgres:   postgres:16-alpine  → puerto 5433:5432, health checks
api:        apps/api/Dockerfile → puerto 4000:4000, depends_on: postgres
web:        apps/web/Dockerfile → puerto 3000:3000, depends_on: api
```

### Variables de entorno clave (`.env.example`)

```
DATABASE_URL              → PostgreSQL connection string
JWT_ACCESS_SECRET         → Secret para access tokens
JWT_REFRESH_SECRET        → Secret para refresh tokens
JWT_ACCESS_EXPIRES_IN     → 15m (por defecto)
JWT_REFRESH_EXPIRES_IN    → 7d (por defecto)
CAPTCHA_PROVIDER          → hcaptcha | google-recaptcha
CAPTCHA_SECRET_KEY        → Server-side secret del proveedor CAPTCHA
NEXT_PUBLIC_CAPTCHA_SITE_KEY → Client-side key
GROQ_API_KEY              → Para features de IA (Groq LLM)
NEXT_PUBLIC_API_URL       → http://localhost:4000
CORS_ORIGIN               → Origen permitido para CORS
INITIAL_ADMIN_EMAIL       → Email del admin inicial (seed)
INITIAL_ADMIN_PASSWORD    → Password del admin inicial (seed)
```

---

## 12. Conteo de archivos

| Categoría | Cantidad |
|---|---|
| Páginas / Rutas Next.js | 28 |
| Componentes frontend | ~45 |
| Módulos NestJS | 30 |
| Hooks personalizados | 3 |
| Servicios y utilidades frontend | 8 |
| Entidades Prisma | 19 |
| Migraciones de base de datos | 4 |
| Scripts de seed | 6 |
| **Total archivos TypeScript/TSX estimados** | **~200+** |

---

*Generado el 10/05/2026 · RespiraCRM v1.0*
