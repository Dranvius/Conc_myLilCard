# RespiraCRM — Cómo se construyó con Vibe Coding

> Documentación del proceso de desarrollo asistido por IA · Proyecto académico · Mayo 2026

---

## Tabla de contenidos

1. [¿Qué es el Vibe Coding?](#1-qué-es-el-vibe-coding)
2. [Herramientas utilizadas](#2-herramientas-utilizadas)
3. [Fase 0: Concepción y diseño del prompt inicial](#3-fase-0-concepción-y-diseño-del-prompt-inicial)
4. [Fase 1: Bootstrap del proyecto (8 de mayo)](#4-fase-1-bootstrap-del-proyecto-8-de-mayo)
5. [Fase 2: Features CRM avanzadas (9 de mayo)](#5-fase-2-features-crm-avanzadas-9-de-mayo)
6. [Fase 3: Automatización e Inteligencia Artificial (10 de mayo)](#6-fase-3-automatización-e-inteligencia-artificial-10-de-mayo)
7. [Metodología de prompts](#7-metodología-de-prompts)
8. [Decisiones de arquitectura guiadas por IA](#8-decisiones-de-arquitectura-guiadas-por-ia)
9. [Lecciones aprendidas](#9-lecciones-aprendidas)
10. [Resultados del proyecto](#10-resultados-del-proyecto)

---

## 1. ¿Qué es el Vibe Coding?

El **vibe coding** es una metodología de desarrollo de software donde el programador actúa principalmente como **director y revisor**, delegando la generación de código a modelos de inteligencia artificial. En lugar de escribir línea por línea, el desarrollador:

1. **Define la visión** del sistema en lenguaje natural
2. **Describe los requerimientos** con suficiente detalle técnico
3. **Revisa y valida** el código generado por la IA
4. **Itera** con prompts de corrección o expansión
5. **Integra** las piezas generadas en el sistema

El término fue acuñado por Andrej Karpathy (ex-director de IA en Tesla y OpenAI) en 2025, y describe el estado en el que un desarrollador "entra en flow" con la IA, confiando en su output sin verificar cada línea, dejando que la IA resuelva incluso los errores que aparecen.

### El Vibe Coding en RespiraCRM

En este proyecto llevamos el vibe coding a un nivel de producción real: construimos un **CRM full-stack completo** para ventas de dispositivos médicos en **4 días de trabajo**, algo que de forma tradicional requeriría entre 3 y 6 meses de desarrollo.

```
Tiempo real de desarrollo:   ~4 días (6–10 de mayo de 2026)
Estimación desarrollo manual: ~4–6 meses
Reducción de tiempo:          ~97%
```

---

## 2. Herramientas utilizadas

El proyecto fue desarrollado por **dos integrantes**, cada uno usando su herramienta de IA preferida:

| Integrante | Herramienta de IA | Rol principal |
|---|---|---|
| Integrante 1 | **Antigravity** | [_completar: qué módulos/fases trabajó_] |
| Integrante 2 | **Codex** | [_completar: qué módulos/fases trabajó_] |

### ¿Por qué múltiples herramientas?

Una de las ventajas del vibe coding es que el código generado por diferentes modelos de IA puede **combinarse y mergearse** a través de Git, tal como lo haría un equipo humano. Esto permitió trabajar en paralelo sobre distintas features, integrando el resultado con `git merge`.

### Entorno de desarrollo compartido

- **Control de versiones:** Git + GitHub
- **Gestión de ramas:** `main` + ramas de feature (ej: `feature/mejoras-core-y-reportes`)
- **Editor:** [_completar: VS Code / Cursor / otro_]
- **Runtime:** Node.js con Docker Compose para base de datos local

---

## 3. Fase 0: Concepción y diseño del prompt inicial

### El artefacto de planificación

Antes de escribir una sola línea de código, generamos con IA el documento `RespiraCRM_PlanCompleto.md` — un plan técnico y de negocio completo que describe:

- La arquitectura tecnológica del sistema
- Todos los módulos y sus relaciones
- El modelo de dominio (entidades, enums, relaciones)
- Un plan de desarrollo en 4 fases con estimaciones en días

Este documento sirvió como **contexto persistente** para todos los prompts posteriores. Cada vez que le pedíamos a la IA que construyera una nueva feature, incluíamos referencia a este plan para mantener coherencia arquitectónica.

### La estrategia del prompt inicial completo

En lugar de pedirle a la IA que construyera feature por feature desde cero, diseñamos un **mega-prompt** que describía el sistema completo. Esta estrategia tiene ventajas clave:

**Ventajas del prompt completo vs. incremental:**
- La IA puede tomar **mejores decisiones de arquitectura** cuando conoce el alcance total
- Se evitan **refactorizaciones costosas** por cambios de diseño a mitad del desarrollo
- El código generado tiene **consistencia de nombres y patrones** desde el inicio
- Se reducen las iteraciones de "ahora agrégame X que faltaba"

### Estructura del prompt inicial

El prompt inicial seguía esta estructura:

```
[CONTEXTO DEL NEGOCIO]
Estamos construyendo un CRM para la empresa Medical M&B, dedicada a la 
venta de dispositivos médicos respiratorios en Argentina. El equipo 
comercial necesita gestionar...

[STACK TECNOLÓGICO]
- Backend: NestJS 11 con TypeScript en modo estricto
- Frontend: Next.js 16 con App Router y React 19
- Base de datos: PostgreSQL con Prisma ORM
- Autenticación: JWT con cookies httpOnly (access 15min + refresh 7días)
- Monorepo: npm workspaces con paquete @respira/shared

[MÓDULOS REQUERIDOS]
El sistema debe incluir los siguientes módulos...
[lista de 16+ módulos con descripción]

[MODELO DE DATOS]
Las entidades principales son...
[descripción de 13+ modelos con sus campos y relaciones]

[ROLES Y PERMISOS]
El sistema tiene 4 roles: ADMIN, MANAGER, SELLER, VIEWER
Con los siguientes permisos granulares...
[25 permisos descriptos]

[REQUERIMIENTOS TÉCNICOS]
- Rate limiting: 60 req/min
- CAPTCHA en login (hCaptcha)
- Docker Compose para desarrollo local
- Swagger en /docs
- Seed con datos de demostración
```

> **[SECCIÓN PARA COMPLETAR]**
> _Incluir aquí el prompt real que usaron — o la captura de pantalla de la conversación_

---

## 4. Fase 1: Bootstrap del proyecto (8 de mayo)

**Commit:** `c93065d — feat: add RespiraCRM CRM platform`

### Qué generó la IA en esta fase

En respuesta al prompt inicial, la IA generó la **plataforma completa base** del CRM:

#### Backend (NestJS)
- Estructura de monorepo con `npm workspaces`
- `main.ts` con Helmet, CORS, cookie-parser, Swagger, ValidationPipe
- `app.module.ts` con todos los módulos registrados y guards globales
- **16 módulos NestJS** con `controller.ts`, `service.ts`, `module.ts` y DTOs
- Schema Prisma con **13 modelos** y todos los enums
- `docker-compose.yml` con PostgreSQL 16, API y Web
- Scripts de seed con datos demo

#### Frontend (Next.js)
- App Router con layout protegido (`/(app)/layout.tsx`)
- `app-shell.tsx` con sidebar y topbar
- **12 rutas** con páginas funcionales
- Sistema de autenticación con cookies httpOnly
- Design system básico (Button, Card, Badge, Input, Table, Modal, etc.)
- `api-client.ts` con interceptor de refresh automático

#### Paquete compartido
- `@respira/shared` con todos los tipos TypeScript compartidos
- Constantes de dominio y rutas de navegación

### Prompt utilizado en esta fase

> **[SECCIÓN PARA COMPLETAR]**
> _Incluir el prompt real o captura de pantalla de la conversación con la IA_

### Resultado medible

```
Archivos generados:    ~120 archivos TypeScript/TSX
Líneas de código:      ~8,000 líneas
Tiempo de generación:  [completar: minutos/horas]
Tiempo equivalente manual: ~6-8 semanas
```

---

## 5. Fase 2: Features CRM avanzadas (9 de mayo)

El 9 de mayo se realizaron **4 sesiones de vibe coding** que agregaron las features más complejas del sistema.

### 5.1 Búsqueda global, reportes y Kanban

**Commit:** `66de275 — feat: implementacion de busqueda global, reportes avanzados y optimizacion de kanban`

**Features agregadas:**
- Módulo de búsqueda full-text (`/api/search`) que unifica resultados de empresas, contactos, oportunidades y productos
- Componente `GlobalSearch.tsx` en el topbar con debounce y navegación por resultados
- Dashboard de reportes avanzado con múltiples gráficos Recharts:
  - Conversión de embudo por etapas
  - Ventas por período (últimos 12 meses)
  - Pipeline ponderado vs. forecast
  - Actividad del equipo
- Optimización del Kanban con dnd-kit: columnas por stage, cards arrastrables, actualización optimista

**Prompt para el Kanban:**

> **[SECCIÓN PARA COMPLETAR]**
> _Incluir el prompt real usado para implementar el kanban_

---

### 5.2 Notificaciones en tiempo real y Calendario unificado

**Commit:** `7c662e8 — feat: implementar sistema de notificaciones en tiempo real y vista de calendario unificada`

**Features agregadas:**
- `NotificationsModule` completo con backend (service + controller) y frontend (`notification-bell.tsx`)
- `TasksService` con tareas background automáticas usando `setInterval`:
  - Facturas vencidas → notificación `INVOICE_OVERDUE`
  - Propuestas por expirar (1 día) → `PROPOSAL_EXPIRING`
  - Actividades pendientes/vencidas → `ACTIVITY_DUE` / `ACTIVITY_OVERDUE`
- Deduplicación de notificaciones para evitar spam
- Ruta `/calendar` con vista mensual/semanal/diaria usando React Big Calendar
- Modal de detalles desde eventos del calendario con navegación directa a la entidad

**Decisión técnica — Polling vs. WebSockets:**

La IA recomendó usar **polling HTTP** (cada 30 segundos) en lugar de WebSockets para las notificaciones, argumentando que:
- Menor complejidad de infraestructura (no requiere socket.io)
- Suficiente para el caso de uso (notificaciones no son ultra-tiempo-real)
- Compatible con el despliegue en Docker Compose sin configuración adicional

---

### 5.3 Rastreo geográfico de visitas

**Commit:** `6c5c06b — feat: implement geographic visit tracking and fix quick action modal layout`

**Features agregadas:**
- Campos `latitude` y `longitude` en el modelo `Company` (migración Prisma)
- Geocodificación automática en `CompaniesService` con lógica de fallback (si la dirección falla, usa coordenadas de la ciudad)
- Ruta `/companies/map` con mapa interactivo Leaflet + OpenStreetMap
- Marcadores clicables con popup de información de la empresa
- Fix de un bug visual: el componente `Modal` fue migrado a React Portals para evitar clipping con el sidebar

**Por qué Leaflet y no Google Maps:**

La IA sugirió Leaflet con OpenStreetMap como alternativa sin API key ni costos, apropiada para un sistema interno corporativo. Se evitó la dependencia de facturación por API calls de Google Maps.

**Prompt utilizado:**

> **[SECCIÓN PARA COMPLETAR]**
> _Incluir el prompt real para el mapa geográfico_

---

## 6. Fase 3: Automatización e Inteligencia Artificial (10 de mayo)

**Commit:** `859f9cc — feat(crm): implement intelligent automation, AI insights, and gamification engine`

Esta fue la fase más compleja, donde la IA generó cuatro sistemas distintos en una sola sesión:

### 6.1 Integración con Groq LLM

Se integró **Groq** (que ofrece inferencia ultra-rápida del modelo `llama-3.3-70b-versatile`) vía el SDK de OpenAI apuntando al endpoint de Groq:

```typescript
// apps/api/src/modules/ai/ai.service.ts
const client = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: 'https://api.groq.com/openai/v1'
});
```

El `AIService` expone dos métodos principales:
- `summarizeOpportunity(data)` → resumen ejecutivo de una oportunidad en español
- `generateText(prompt)` → generación de texto libre para otros casos de uso

**Por qué Groq y no OpenAI directamente:**
La IA recomendó Groq por su velocidad de inferencia (tokens/seg) superior, latencia más baja, y costo reducido — ideal para resúmenes en tiempo real que el usuario espera mientras navega la app.

### 6.2 Motor CPQ (Configure-Price-Quote)

Se implementó un engine de reglas de pricing con descuentos automáticos:
- Descuentos por volumen (escalas configurables)
- Descuentos por tipo de cliente (`INSTITUTION`, `DISTRIBUTOR`)
- Reglas combinables con prioridades
- UI para crear/editar reglas desde el panel de admin

### 6.3 Sistema de Gamificación

```
Puntos → Niveles → Insignias → Leaderboard
```

- **Puntos:** se otorgan por acciones (crear actividad, cerrar oportunidad, emitir factura)
- **Niveles:** `nivel = floor(puntos / 500) + 1`
- **Insignias:** `FIRST_WIN` (primera venta), `ELITE_SELLER` (meta mensual), `PRODUCTIVE_AGENT` (actividades)
- **Leaderboard:** componente sidebar con top-10 del equipo, visible en toda la app

### 6.4 Secuencias de Email Automatizadas

Sistema de nurturing automático para nuevas oportunidades:
- Templates de email por etapa del pipeline
- Triggers configurables (al crear oportunidad, al enviar propuesta, etc.)
- Estado de envío trackeado por registro

**Prompt para esta fase:**

> **[SECCIÓN PARA COMPLETAR]**
> _Incluir el prompt real para la fase de IA + gamificación_

---

## 7. Metodología de prompts

### Patrones que funcionaron

A lo largo del proyecto identificamos patrones de prompts que producían código de mayor calidad:

#### Patrón 1: Contexto + Restricciones + Ejemplos

```
[CONTEXTO]
Estamos trabajando en el módulo de Oportunidades de RespiraCRM.
Ya existe: OpportunityController, OpportunityService, PrismaModule.
El stack es NestJS 11 con TypeScript estricto.

[LO QUE NECESITO]
Implementar drag-and-drop en el Kanban del frontend para mover 
oportunidades entre stages. Al soltar una card, debe hacer PUT 
a /api/opportunities/:id para actualizar el stage.

[RESTRICCIONES]
- Usar @dnd-kit/core (ya está instalado)
- Actualización optimista: mover la card visualmente antes de la respuesta del server
- Si falla el request, revertir el movimiento
- No usar otras librerías externas

[REFERENCIA]
Seguir el mismo patrón que entity-dialog.tsx para el manejo de estado
```

#### Patrón 2: Descripción del problema + Comportamiento esperado

```
El componente Modal se corta visualmente cuando está dentro del sidebar
porque el contenedor padre tiene overflow:hidden.

COMPORTAMIENTO ESPERADO:
- El modal debe renderizarse por encima de todo el layout
- Sin importar en qué componente anidado se invoque

SOLUCIÓN PROPUESTA:
Migrar el Modal a usar React.createPortal apuntando a document.body
Mostrarme el código actualizado de modal.tsx
```

#### Patrón 3: Módulo completo con especificación

```
Crear el módulo de Gamificación completo para NestJS.

SCHEMA (ya existe en Prisma):
- UserStats: userId, points, level, opportunitiesWon, activitiesCreated
- Badge: id, name, description, iconUrl
- UserBadge: userId, badgeId, awardedAt
- PointAction: userId, action, points, description, createdAt

SERVICIO (gamification.service.ts):
- awardPoints(userId, action, points): registra puntos y recalcula nivel
- checkAndAwardBadges(userId): evalúa si el usuario ganó nuevas insignias
- getLeaderboard(): top 10 por puntos
- getUserProfile(userId): stats + badges del usuario

INSIGNIAS A IMPLEMENTAR:
- FIRST_WIN: primera oportunidad ganada
- ELITE_SELLER: 10+ oportunidades ganadas en el mes
- PRODUCTIVE_AGENT: 50+ actividades en el mes

Incluir: controller, service, module, y los DTOs necesarios.
```

### Patrones que NO funcionaron

#### Anti-patrón 1: Prompts vagos

```
❌ "Arréglame el bug del kanban"
✅ "El kanban no actualiza el stage en la BD al soltar la card. 
    El log del backend no muestra ningún request PUT. 
    El problema parece estar en el onDragEnd handler de KanbanBoard.tsx. 
    Revisar por qué no se llama a apiRequest."
```

#### Anti-patrón 2: Pedir demasiado en un solo prompt sin prioridad

```
❌ "Agrégame mapas, notificaciones, gamificación y exportar a PDF"
✅ Hacer un prompt por feature, completarla y testearla antes de seguir
```

#### Anti-patrón 3: No dar contexto del error

```
❌ "No funciona, fixea"
✅ Pegar el error completo con stack trace + el archivo donde ocurre
```

---

## 8. Decisiones de arquitectura guiadas por IA

Una de las características más valiosas del vibe coding es que la IA puede **justificar sus decisiones** cuando se le pregunta. Estas fueron las decisiones arquitectónicas más importantes:

### Monorepo con npm workspaces

**Pregunta al modelo:** "¿Usamos un repositorio por proyecto (api, web) o un monorepo?"

**Respuesta de la IA:** Monorepo con `npm workspaces`, creando el paquete `@respira/shared` para compartir tipos TypeScript. Esto garantiza que si cambia la interface `Company` en el backend, el frontend tiene error de compilación inmediatamente — sin sincronización manual de tipos.

### React Query en lugar de Zustand o Redux

**Pregunta al modelo:** "¿Qué usamos para estado global?"

**Respuesta de la IA:** TanStack React Query (v5) para estado servidor, y estado local de React (`useState`/`useReducer`) para UI. No se necesita Zustand ni Redux porque el 90% del estado de una app CRM es **estado servidor** (listas, detalles, filtros), no estado cliente.

### dnd-kit en lugar de react-beautiful-dnd

**Pregunta al modelo:** "¿Qué librería de drag-and-drop?"

**Respuesta de la IA:** `@dnd-kit` porque `react-beautiful-dnd` está deprecated y sin mantenimiento activo. dnd-kit es más moderno, accesible y compatible con React 19.

### Leaflet en lugar de Google Maps

**Pregunta al modelo:** "¿Cómo implementamos el mapa de visitas?"

**Respuesta de la IA:** Leaflet con OpenStreetMap — sin API key, sin costos, sin límites de requests. Google Maps tiene sentido para apps consumer con millones de usuarios, no para un CRM interno.

### PostgreSQL con Prisma en lugar de MongoDB

**Pregunta al modelo:** "¿SQL o NoSQL?"

**Respuesta de la IA:** PostgreSQL + Prisma para un CRM. Los datos del CRM tienen **relaciones fuertemente definidas** (empresa → contactos → oportunidades → propuestas → facturas) que se mapean naturalmente a SQL. MongoDB sería más apropiado para datos sin esquema, como logs o catálogos variables.

---

## 9. Lecciones aprendidas

### Lo que funcionó excepcionalmente bien

**1. Prompts de módulo completo**
Pedir un módulo NestJS completo (controller + service + module + DTOs) en un solo prompt producía código coherente y sin referencias rotas entre archivos.

**2. Incluir el contexto del schema Prisma**
Cuando el prompt incluía el schema relevante de Prisma, la IA generaba servicios que usaban correctamente las relaciones (`include`, `select`, `where`) sin necesitar correcciones.

**3. Pedir justificaciones**
"¿Por qué elegiste X en lugar de Y?" revelaba trade-offs reales y nos ayudaba a entender el código generado, lo cual es valioso para el aprendizaje académico.

**4. Branches de feature para trabajo paralelo**
Trabajar en branches separadas (`feature/mejoras-core-y-reportes`) permitió que los dos integrantes avanzaran sin conflictos, mergeando al final.

### Los desafíos del vibe coding

**1. Merges con conflictos**
Cuando los dos integrantes modificaban el mismo archivo (ej: `app.module.ts` para registrar nuevos módulos), aparecían conflictos de merge. La IA ayudó a resolverlos, pero requirió atención.

**2. El bug de build post-merge**
Después del merge `6977902`, el build de Next.js falló (`7f04d12 — fix: restore web build after feature merge`). La causa fue un import circular generado por la IA en dos features que se desarrollaron por separado. La IA resolvió el bug rápidamente cuando se le pasó el error de compilación completo.

**3. Inconsistencias de tipos entre features**
Al desarrollar features en paralelo con diferentes herramientas de IA, a veces los tipos de respuesta de la API no coincidían exactamente con lo que esperaba el frontend. Se resolvió mejorando el paquete `@respira/shared` como fuente de verdad.

**4. Hallucinations en imports**
Ocasionalmente la IA generaba imports de funciones que no existían en las librerías. Pattern de solución: pegar el error exacto de TypeScript y pedir corrección.

### Conclusión metodológica

El vibe coding no elimina la necesidad de conocimiento técnico — al contrario, **lo potencia**. Saber evaluar si la arquitectura propuesta es correcta, entender por qué falla un merge, leer un stack trace y formular el prompt correcto requiere comprensión real del stack tecnológico.

Lo que cambia es la **velocidad de implementación** y la posibilidad de construir sistemas más complejos de lo que sería posible en el tiempo disponible.

---

## 10. Resultados del proyecto

### Métricas de desarrollo

| Métrica | Valor |
|---|---|
| Días de desarrollo | 4 (6–10 de mayo de 2026) |
| Total de commits | 10 |
| Archivos TypeScript/TSX generados | ~200+ |
| Líneas de código estimadas | ~15,000–20,000 |
| Módulos NestJS implementados | 30 |
| Rutas frontend | 28 |
| Entidades de base de datos | 19 |
| Migraciones Prisma | 4 |
| Integraciones externas | 7 (Groq, Gemini, hCaptcha, Leaflet, PDF, Excel, Nodemailer) |

### Features entregadas por fase

| Fase | Fecha | Features principales |
|---|---|---|
| Bootstrap | 8 mayo | Monorepo, 16 módulos, RBAC, JWT, Docker, seed |
| Features CRM | 9 mayo | Kanban, Búsqueda global, Reportes, Notificaciones, Calendario, Mapas |
| IA + Automatización | 10 mayo | Groq LLM, Gamificación, CPQ, Email sequences |

### Comparativa con desarrollo tradicional

| Aspecto | Desarrollo tradicional | Vibe Coding |
|---|---|---|
| Tiempo estimado para el mismo sistema | 4–6 meses | 4 días |
| Reducción de tiempo | — | ~97% |
| Líneas de código escritas manualmente | ~20,000 | ~200 (prompts + fixes) |
| Decisiones de arquitectura | Equipo junior requiere mucha investigación | La IA propone y justifica en segundos |
| Boilerplate (controllers, DTOs, etc.) | ~70% del tiempo | Generado automáticamente |
| Iteraciones de debugging | Alto (sin contexto del sistema completo) | La IA tiene contexto acumulativo |

### Reflexión final

RespiraCRM demuestra que el vibe coding permite a un equipo pequeño construir **software de calidad empresarial** en fracciones del tiempo tradicional. No se trata de "hacer trampa" en el desarrollo — se trata de **redefinir qué parte del trabajo hace el humano y qué parte hace la máquina**.

El humano aporta:
- **Visión del negocio** (qué problema resolver)
- **Criterio técnico** (evaluar si la solución es correcta)
- **Contexto de dominio** (qué necesita el vendedor de dispositivos médicos)
- **Decisiones de trade-off** (priorización de features)

La IA aporta:
- **Generación de código** (boilerplate, patterns, implementaciones)
- **Conocimiento de librerías** (APIs, mejores prácticas)
- **Resolución de bugs** (análisis de stack traces)
- **Consistencia** (código coherente entre módulos)

---

> **Nota para el lector:** Las secciones marcadas con `[SECCIÓN PARA COMPLETAR]` requieren que el equipo inserte los prompts reales utilizados durante el desarrollo. Esto es fundamental para la reproducibilidad y el valor académico del documento.

---

*RespiraCRM v1.0 · Proyecto Académico · Mayo 2026*
