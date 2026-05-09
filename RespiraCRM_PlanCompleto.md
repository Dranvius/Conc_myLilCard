# RespiraCRM — Plan Completo de Completitud
### Proyecto de Carrera · Medical M&B · Stack: Next.js 16 + NestJS 11 + PostgreSQL + Prisma

> **Alcance:** CRM de ventas para proyecto académico. No reemplaza sistemas contables, ERP ni facturación electrónica DIAN. El objetivo es demostrar un CRM funcional, bien arquitectado y alineado con el negocio real de dispositivos médicos respiratorios.

---

## Estado de partida

| Capa | Estado | Nota |
|---|:---:|---|
| Arquitectura monorepo | ✅ | `apps/api`, `apps/web`, `packages/shared`, Prisma centralizado |
| Auth (JWT + cookies httpOnly + CAPTCHA) | ✅ | Listo para producción |
| RBAC (25 permisos, 4 roles) | ✅ | Bien granulado |
| Backend CRUD (16 módulos NestJS) | ✅ | Funcional |
| Schema Prisma (13 modelos) | ✅ | Sólido, falta `Activity` |
| Dashboard con métricas reales | ✅ | Recharts integrado |
| Frontend (12 rutas, design system Tailwind) | ✅ | CRUD funcional |
| Docker Compose + seed demo | ✅ | Listo |
| Pipeline Kanban | ❌ | Solo vista tabla |
| Actividades / seguimiento por entidad | ❌ | No existe modelo |
| Búsqueda global | ❌ | Falta |
| Notificaciones (UI) | ❌ | Modelo en DB, sin UI |
| Exportación PDF / Excel | ❌ | No implementado |
| Catálogo real Medical M&B | ❌ | Solo 3 productos genéricos |
| Reportes avanzados | ❌ | Solo KPIs básicos |
| Perfil de usuario / ajustes | ❌ | Ruta existe, vacía |

---

## Fases del Plan

```
Fase 1 — Core CRM         (≈ 10 días)   🔴 Crítico
Fase 2 — Datos y Exports  (≈  5 días)   🟡 Importante
Fase 3 — Reporting        (≈  6 días)   🟡 Importante
Fase 4 — Polish y UX      (≈  5 días)   🟢 Deseable
────────────────────────────────────────
Total estimado            ≈ 26 días hábiles
```

---

## Fase 1 — Core CRM `🔴 Crítico`

> Sin estas piezas, el sistema es un CRUD avanzado, no un CRM. Es la fase que transforma la experiencia del usuario comercial.

---

### 1.1 Pipeline Kanban drag-and-drop

**Por qué es lo primero:** es la funcionalidad que cualquier evaluador reconoce como "esto es un CRM real". Transforma la gestión de oportunidades de una tabla estática a un tablero visual operativo.

**Dependencias del backend:** el endpoint `PATCH /opportunities/:id/stage` ya existe. No requiere cambios en el schema.

**Implementación frontend:**

Instalar la librería de drag-and-drop:
```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities --workspace=@respira/web
```

Crear el componente tablero en `apps/web/src/components/kanban/`:

```
kanban/
  KanbanBoard.tsx       ← contenedor con DndContext
  KanbanColumn.tsx      ← columna droppable por etapa
  OpportunityCard.tsx   ← tarjeta draggable
  useKanbanDrag.ts      ← lógica de drag + llamada al endpoint
```

Estructura de datos que necesita el tablero:
```typescript
// packages/shared/src/types/kanban.ts
export type KanbanColumn = {
  stage: OpportunityStage;
  label: string;
  color: string;
  opportunities: OpportunityCard[];
};

export type OpportunityCard = {
  id: string;
  title: string;
  company: string;
  estimatedValue: number;
  probability: number;
  daysInStage: number;     // calculado: (now - updatedAt) en días
  ownerName: string;
};
```

Columnas y colores sugeridos:
```
NUEVA          →  gris      #6B7280
CONTACTADA     →  azul      #3B82F6
CALIFICADA     →  índigo    #6366F1
PROPUESTA ENV. →  violeta   #8B5CF6
NEGOCIACIÓN    →  ámbar     #F59E0B
GANADA         →  verde     #22C55E
PERDIDA        →  rojo      #EF4444
```

Lógica del drag (hook `useKanbanDrag`):
```typescript
// Al soltar una tarjeta en otra columna:
// 1. Optimistic update: actualizar estado local inmediatamente
// 2. Llamar PATCH /opportunities/:id/stage con la nueva etapa
// 3. En caso de error: revertir el estado y mostrar toast de error
```

Agregar campo `lostReason` al schema (necesario cuando se arrastra a PERDIDA):
```prisma
// prisma/schema.prisma — modificar SalesOpportunity
model SalesOpportunity {
  // ...campos existentes...
  lostReason      LostReason?
  lostReasonNotes String?
}

enum LostReason {
  PRICE
  COMPETITION
  NO_BUDGET
  NO_RESPONSE
  TIMING
  OTHER
}
```

Migración:
```bash
npm run prisma:migrate -- --name add_lost_reason_to_opportunity
```

Filtros del tablero (barra superior):
- Unidad de negocio (select)
- Vendedor/propietario (select, visible solo para ADMIN/MANAGER)
- Rango de fechas (date picker)

Modificar la ruta `/opportunities/page.tsx` para tener dos vistas: tabla (ya existe) y tablero (nuevo). Toggle con iconos `LayoutList` / `Columns` de lucide-react.

**Estimación:** 3 días hábiles.

---

### 1.2 Modelo Activity + Timeline por entidad

**Por qué es crítico:** sin actividades, el CRM no tiene memoria. No hay forma de saber cuándo se llamó a un cliente, qué se habló, qué compromisos se adquirieron.

**Cambio en el schema:**
```prisma
// prisma/schema.prisma — agregar al final

model Activity {
  id            String       @id @default(cuid())
  type          ActivityType
  subject       String
  description   String?
  companyId     String?
  contactId     String?
  opportunityId String?
  userId        String
  dueDate       DateTime?
  completedAt   DateTime?
  createdAt     DateTime     @default(now())
  updatedAt     DateTime     @updatedAt

  company     Company?          @relation(fields: [companyId], references: [id])
  contact     Contact?          @relation(fields: [contactId], references: [id])
  opportunity SalesOpportunity? @relation(fields: [opportunityId], references: [id])
  user        User              @relation(fields: [userId], references: [id])

  @@index([companyId])
  @@index([contactId])
  @@index([opportunityId])
  @@index([userId])
  @@index([dueDate])
  @@index([createdAt])
}

enum ActivityType {
  CALL       // Llamada
  EMAIL      // Email
  MEETING    // Reunión
  NOTE       // Nota interna
  TASK       // Tarea pendiente
  WHATSAPP   // Mensaje WhatsApp
}
```

También agregar la relación inversa en los modelos afectados:
```prisma
model Company {
  // ...campos existentes...
  activities Activity[]
}
model Contact {
  // ...campos existentes...
  activities Activity[]
}
model SalesOpportunity {
  // ...campos existentes...
  activities Activity[]
}
model User {
  // ...campos existentes...
  activities Activity[]
}
```

Migración:
```bash
npm run prisma:migrate -- --name add_activity_model
```

**Nuevo módulo backend** `apps/api/src/modules/activities/`:
```
activities/
  activities.module.ts
  activities.controller.ts
  activities.service.ts
  dto/
    create-activity.dto.ts
    activity-query.dto.ts
    update-activity.dto.ts
```

Endpoints principales:
```
POST   /activities                     ← crear actividad
GET    /activities?companyId=&contactId=&opportunityId=&type=  ← listar con filtros
GET    /activities/my-tasks            ← tareas pendientes del usuario actual
PATCH  /activities/:id                 ← editar
PATCH  /activities/:id/complete        ← marcar tarea como completada
DELETE /activities/:id                 ← eliminar
```

Agregar en el módulo `ActivitiesModule`:
```typescript
// Registrar en AppModule
@Module({
  imports: [
    // ...módulos existentes...
    ActivitiesModule,
  ],
})
```

**Frontend — componente `ActivityTimeline`:**

Ubicar en `apps/web/src/components/activities/`:
```
activities/
  ActivityTimeline.tsx    ← lista vertical cronológica
  ActivityForm.tsx        ← modal/drawer para crear actividad
  ActivityItem.tsx        ← fila individual con icono por tipo
  MyTasksWidget.tsx       ← widget para el dashboard
```

El `ActivityTimeline` se incrusta en las páginas de detalle existentes:
- `companies/[id]/page.tsx` → sección "Actividad reciente"
- `contacts/page.tsx` → al abrir detalle de contacto
- `opportunities/[id]/page.tsx` → ya tiene detalle, agregar tab "Actividades"

Icono por tipo de actividad (lucide-react):
```typescript
const activityIcons = {
  CALL:      <Phone />,
  EMAIL:     <Mail />,
  MEETING:   <Calendar />,
  NOTE:      <FileText />,
  TASK:      <CheckSquare />,
  WHATSAPP:  <MessageCircle />,
};
```

Agregar `MyTasksWidget` al dashboard existente: lista de tareas del usuario actual con `dueDate` y botón de completar inline.

**Estimación:** 3 días hábiles.

---

### 1.3 Búsqueda global

**Por qué:** sin búsqueda, navegar un CRM con datos reales es frustrante. Es la funcionalidad más usada en el día a día.

**Backend — nuevo endpoint:**
```
GET /search?q=texto&limit=5
```

Respuesta sugerida:
```typescript
type SearchResults = {
  companies:    { id, name, taxId }[];
  contacts:     { id, firstName, lastName, email, companyName }[];
  opportunities:{ id, title, stage, companyName }[];
  products:     { id, name, sku, category }[];
};
```

Implementación en `MetricsModule` o nuevo `SearchModule`:
```typescript
async globalSearch(q: string, limit = 5) {
  const [companies, contacts, opportunities, products] = await Promise.all([
    this.prisma.company.findMany({
      where: {
        deletedAt: null,
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { taxId: { contains: q, mode: 'insensitive' } },
        ],
      },
      take: limit,
      select: { id: true, name: true, taxId: true },
    }),
    this.prisma.contact.findMany({
      where: {
        deletedAt: null,
        OR: [
          { firstName: { contains: q, mode: 'insensitive' } },
          { lastName:  { contains: q, mode: 'insensitive' } },
          { email:     { contains: q, mode: 'insensitive' } },
        ],
      },
      take: limit,
      select: {
        id: true, firstName: true, lastName: true, email: true,
        company: { select: { name: true } },
      },
    }),
    // ... opportunities y products similar
  ]);

  return { companies, contacts, opportunities, products };
}
```

**Frontend — barra de búsqueda en el topbar:**

Componente `GlobalSearch` en `apps/web/src/components/layout/GlobalSearch.tsx`:
- Input con debounce de 300ms (usar `useDebounce` de un hook local)
- Dropdown con resultados agrupados por sección
- Navegación con teclado (↑↓ para mover, Enter para ir al resultado)
- Cerrar con Escape
- Shortcut `Ctrl+K` / `⌘+K` para enfocar

Integrar en `apps/web/src/app/(app)/layout.tsx` dentro del topbar existente.

**Estimación:** 2 días hábiles.

---

### 1.4 UI de Notificaciones

**Por qué:** el modelo `Notification` ya existe en el schema con todas las relaciones. Solo falta la interfaz.

**Backend — verificar/completar endpoints en `NotificationsController`:**
```
GET    /notifications          ← listado del usuario actual (paginado)
GET    /notifications/unread-count  ← contador para la campana
PATCH  /notifications/:id/read      ← marcar como leída
PATCH  /notifications/read-all      ← marcar todas como leídas
DELETE /notifications/:id           ← eliminar
```

Crear notificaciones automáticas en los servicios existentes (ejemplos):
```typescript
// En ProposalsService.update() cuando status → ACCEPTED:
await this.notificationsService.create({
  userId: proposal.opportunity.ownerId,
  title: 'Propuesta aceptada',
  message: `La propuesta ${proposal.code} fue aceptada por ${proposal.opportunity.company.name}`,
});

// En InvoicesService cuando dueDate ha pasado y status = ISSUED:
// Cron job diario que revisa facturas vencidas y notifica
```

**Frontend — componente `NotificationBell`:**

Ubicar en `apps/web/src/components/layout/NotificationBell.tsx`:
```
- Icono Bell con badge rojo si unread > 0
- Click abre un Popover o Panel lateral
- Lista de notificaciones con: título, mensaje, tiempo relativo (date-fns formatDistanceToNow)
- Botón "Marcar todas como leídas"
- Polling cada 30 segundos con React Query (useQuery con refetchInterval)
  o SSE si se quiere tiempo real sin WebSocket
```

Para tiempo real sin complejidad de WebSocket, usar SSE:
```typescript
// apps/api/src/modules/notifications/notifications.controller.ts
@Get('stream')
@UseGuards(JwtAuthGuard)
stream(@Req() req, @Res() res: Response) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const interval = setInterval(async () => {
    const count = await this.notificationsService.getUnreadCount(req.user.id);
    res.write(`data: ${JSON.stringify({ unread: count })}\n\n`);
  }, 15000);

  req.on('close', () => clearInterval(interval));
}
```

Integrar `NotificationBell` en el topbar junto a `GlobalSearch`.

**Estimación:** 2 días hábiles.

---

## Fase 2 — Datos Reales y Exportaciones `🟡 Importante`

---

### 2.1 Enriquecer el modelo `Product`

**Cambio en el schema:**
```prisma
model Product {
  // campos existentes se mantienen igual...
  brand           String?    // "PARI", "Sibelmed", "Trudell", "Vitalograph"
  model           String?    // "PRONEB Max", "eFlow Rapid", "VORTEX"
  imageUrl        String?
  specifications  Json?
  targetSegment   ProductSegment @default(BOTH)
  requiresPrescription Boolean @default(false)
}

enum ProductSegment {
  AMBULATORY    // Paciente ambulatorio
  HOSPITAL      // Paciente hospitalizado
  BOTH          // Ambos
}
```

Migración:
```bash
npm run prisma:migrate -- --name enrich_product_model
```

Actualizar los DTOs y el frontend del módulo de productos para exponer y editar los nuevos campos.

**Estimación:** 1 día hábil.

---

### 2.2 Seed con catálogo real de Medical M&B

Reemplazar o complementar los 3 productos genéricos del seed actual con el catálogo real extraído de medicalmb.com.co:

```typescript
// prisma/seed.ts — sección de productos (reemplazar la existente)

const products = [
  // ── SISTEMAS PARI ──────────────────────────────────────────────
  {
    name: 'Sistema PARI PRONEB Max (Compresor + Nebulizador LC Sprint)',
    sku: 'PARI-PRONEB-MAX-001',
    category: 'Sistemas PARI',
    brand: 'PARI GmbH',
    model: 'PRONEB Max',
    unitPrice: 1_690_000,
    stock: 15,
    targetSegment: 'BOTH',
    requiresPrescription: false,
    specifications: {
      presion_psi: '>34',
      flujo_lpm: '5-6',
      nebulizador_incluido: 'LC Sprint',
    },
  },
  {
    name: 'Sistema PARI Trek S portátil (Compresor + Nebulizador LC Sprint)',
    sku: 'PARI-TREK-S-001',
    category: 'Sistemas PARI',
    brand: 'PARI GmbH',
    model: 'Trek S',
    unitPrice: 975_000,
    stock: 20,
    targetSegment: 'AMBULATORY',
    requiresPrescription: false,
    specifications: { tipo: 'Portátil a batería', nebulizador_incluido: 'LC Sprint' },
  },
  {
    name: 'Nebulizador de malla eFlow Rapid con controlador eBase',
    sku: 'PARI-EFLOW-RAPID-001',
    category: 'Sistemas PARI',
    brand: 'PARI GmbH',
    model: 'eFlow Rapid',
    unitPrice: 1_450_000,
    stock: 8,
    targetSegment: 'BOTH',
    requiresPrescription: false,
  },
  // ── INHALOCÁMARAS ──────────────────────────────────────────────
  {
    name: 'Inhalocámara PARI VORTEX con Mascarilla Amarilla Pediátrica (>1 año)',
    sku: 'PARI-VORTEX-YEL-PED-001',
    category: 'Inhalocámaras paciente ambulatorio',
    brand: 'PARI GmbH',
    model: 'VORTEX',
    unitPrice: 225_000,
    stock: 50,
    targetSegment: 'AMBULATORY',
    requiresPrescription: false,
    specifications: { material: 'Aluminio', edad: '>1 año', mascarilla: 'Amarilla pediátrica' },
  },
  {
    name: 'Inhalocámara PARI VORTEX con Mascarilla Felix the Frog Pediátrica',
    sku: 'PARI-VORTEX-FELIX-001',
    category: 'Inhalocámaras paciente ambulatorio',
    brand: 'PARI GmbH',
    model: 'VORTEX',
    unitPrice: 225_000,
    stock: 35,
    targetSegment: 'AMBULATORY',
    requiresPrescription: false,
  },
  {
    name: 'Inhalocámara PARI VORTEX con Mascarilla Azul Adulto + Manija',
    sku: 'PARI-VORTEX-BLUE-ADU-001',
    category: 'Inhalocámaras paciente ambulatorio',
    brand: 'PARI GmbH',
    model: 'VORTEX',
    unitPrice: 200_000,
    stock: 40,
    targetSegment: 'AMBULATORY',
    requiresPrescription: false,
    specifications: { material: 'Aluminio', edad: 'Adultos y niños mayores' },
  },
  // ── AEROCÁMARAS HOSPITALARIAS ───────────────────────────────────
  {
    name: 'Aerocámara hospitalaria PARI VORTEX (sin mascarilla)',
    sku: 'PARI-VORTEX-HOSP-001',
    category: 'Aerocámaras paciente hospitalizado',
    brand: 'PARI GmbH',
    model: 'VORTEX',
    unitPrice: 185_000,
    stock: 25,
    targetSegment: 'HOSPITAL',
    requiresPrescription: false,
  },
  // ── ESPIRÓMETROS ───────────────────────────────────────────────
  {
    name: 'Espirómetro DATOSPIR Touch (portátil)',
    sku: 'SIBELMED-TOUCH-001',
    category: 'Espirómetros y Consumibles',
    brand: 'Sibelmed',
    model: 'DATOSPIR Touch',
    unitPrice: 0,
    stock: 5,
    targetSegment: 'BOTH',
    requiresPrescription: true,
    specifications: { tipo: 'Portátil', conectividad: 'USB', norma: 'ATS/ERS' },
  },
  {
    name: 'Boquillas de Cartón Standard Vitalograph (caja x 100)',
    sku: 'VITALOGRAPH-BOQ-100-001',
    category: 'Espirómetros y Consumibles',
    brand: 'Vitalograph',
    model: 'Standard Mouthpiece',
    unitPrice: 85_000,
    stock: 120,
    targetSegment: 'BOTH',
    requiresPrescription: false,
  },
  // ── HIGIENE NASAL / BRONQUIAL ───────────────────────────────────
  {
    name: 'Sistema de lavado nasal PARI SINUSTAR',
    sku: 'PARI-SINUSTAR-001',
    category: 'Dispositivos para higiene nasal y bronquial',
    brand: 'PARI GmbH',
    model: 'SINUSTAR',
    unitPrice: 320_000,
    stock: 18,
    targetSegment: 'AMBULATORY',
    requiresPrescription: false,
  },
  // ── MEDIDORES DE FLUJO PICO ─────────────────────────────────────
  {
    name: 'Medidor de Flujo Pico (PFM) Vitalograph asma-1',
    sku: 'VITALOGRAPH-PFM-001',
    category: 'Medidores de flujo pico (PFM)',
    brand: 'Vitalograph',
    model: 'asma-1',
    unitPrice: 55_000,
    stock: 60,
    targetSegment: 'AMBULATORY',
    requiresPrescription: false,
  },
  // ── PROTECTORES ANTIALÉRGICOS ───────────────────────────────────
  {
    name: 'Protector antialérgico para almohada SinAllergy',
    sku: 'SINALLERGY-PILLOW-001',
    category: 'Protectores antialérgicos para almohada y colchón',
    brand: 'SinAllergy',
    model: 'Almohada',
    unitPrice: 120_000,
    stock: 30,
    targetSegment: 'AMBULATORY',
    requiresPrescription: false,
  },
];
```

**Estimación:** 1 día hábil.

---

### 2.3 Exportar listados a Excel

**Librería recomendada (backend):** `exceljs`

```bash
npm install exceljs --workspace=@respira/api
```

Agregar endpoint a los módulos que más lo necesitan:
```
GET /companies/export       → companies.xlsx
GET /contacts/export        → contacts.xlsx
GET /opportunities/export   → opportunities.xlsx
GET /sales/export           → sales.xlsx
```

Ejemplo de implementación en `CompaniesController`:
```typescript
@Get('export')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions('companies.read')
async exportExcel(@Res() res: Response, @Query() query: CompanyQueryDto) {
  const buffer = await this.companiesService.exportToExcel(query);
  res.setHeader('Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=empresas.xlsx');
  res.send(buffer);
}
```

En cada listado del frontend, agregar botón "Exportar Excel" que llame al endpoint y descargue el archivo usando `<a href>` con blob URL.

**Estimación:** 1 día hábil.

---

### 2.4 Exportar propuestas a PDF

**Librería recomendada:** `@react-pdf/renderer` en el frontend, o Puppeteer/html-pdf en el backend.

Recomendación para proyecto de carrera: **`@react-pdf/renderer`** en el frontend es más simple, no requiere un navegador headless, y permite diseño con JSX.

```bash
npm install @react-pdf/renderer --workspace=@respira/web
```

Crear `apps/web/src/components/proposals/ProposalPDF.tsx`:
```tsx
import { Document, Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: 'Helvetica' },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  title: { fontSize: 18, fontWeight: 'bold', color: '#1E3A5F' },
  table: { marginTop: 16 },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#E5E7EB', paddingVertical: 6 },
  tableHeader: { backgroundColor: '#F3F4F6', fontWeight: 'bold' },
  total: { marginTop: 16, textAlign: 'right', fontSize: 12, fontWeight: 'bold' },
});

export function ProposalPDF({ proposal }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>PROPUESTA COMERCIAL</Text>
          <Text>{proposal.code}</Text>
        </View>

        {/* Datos de la empresa */}
        <View style={{ marginBottom: 16 }}>
          <Text>Para: {proposal.opportunity.company.name}</Text>
          <Text>Válida hasta: {formatDate(proposal.validUntil)}</Text>
        </View>

        {/* Tabla de ítems */}
        <View style={styles.table}>
          <View style={[styles.tableRow, styles.tableHeader]}>
            <Text style={{ flex: 3 }}>Producto</Text>
            <Text style={{ flex: 1, textAlign: 'center' }}>Cant.</Text>
            <Text style={{ flex: 2, textAlign: 'right' }}>Precio unit.</Text>
            <Text style={{ flex: 2, textAlign: 'right' }}>Total</Text>
          </View>
          {proposal.items.map(item => (
            <View key={item.id} style={styles.tableRow}>
              <Text style={{ flex: 3 }}>{item.product.name}</Text>
              <Text style={{ flex: 1, textAlign: 'center' }}>{item.quantity}</Text>
              <Text style={{ flex: 2, textAlign: 'right' }}>{formatCOP(item.unitPrice)}</Text>
              <Text style={{ flex: 2, textAlign: 'right' }}>{formatCOP(item.total)}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.total}>TOTAL: {formatCOP(proposal.totalAmount)}</Text>

        {/* Notas y términos */}
        {proposal.notes && (
          <View style={{ marginTop: 24 }}>
            <Text style={{ fontWeight: 'bold' }}>Notas:</Text>
            <Text>{proposal.notes}</Text>
          </View>
        )}
      </Page>
    </Document>
  );
}
```

Botón en `proposals/[id]/page.tsx`:
```tsx
import { PDFDownloadLink } from '@react-pdf/renderer';

<PDFDownloadLink
  document={<ProposalPDF proposal={proposal} />}
  fileName={`propuesta-${proposal.code}.pdf`}
>
  {({ loading }) => (
    <button disabled={loading}>
      {loading ? 'Generando...' : 'Descargar PDF'}
    </button>
  )}
</PDFDownloadLink>
```

**Estimación:** 2 días hábiles.

---

## Fase 3 — Reporting Avanzado `🟡 Importante`

---

### 3.1 Dashboard de reportes ampliado

**Nueva ruta:** `/reports` (agregar al sidebar con ícono `BarChart3`)

Crear `apps/web/src/app/(app)/reports/page.tsx` con estas secciones:

**Sección A — Conversión del pipeline:**

Nuevo endpoint: `GET /metrics/pipeline-conversion`
```typescript
// Para cada par de etapas consecutivas, calcular la tasa de conversión
// (oportunidades que pasaron a la siguiente etapa / total que entraron)
// Resultado: funnel chart con Recharts FunnelChart
```

**Sección B — Ventas por período:**

Nuevo endpoint: `GET /metrics/sales-by-period?period=monthly&year=2026`
```typescript
// Agrupar Sale.closedAt por mes, retornar array de { month, totalAmount, count }
// Resultado: LineChart o BarChart mensual con comparativa año anterior (si hay datos)
```

**Sección C — Pronóstico weighted pipeline:**
```typescript
// GET /metrics/forecast
// Para cada oportunidad abierta: estimatedValue × (probability / 100)
// Agrupar por mes de expectedCloseDate
// Resultado: BarChart con valor esperado ponderado por mes
```

**Sección D — Productividad por vendedor:**
```typescript
// GET /metrics/sellers
// Para cada User con rol SALES: contar oportunidades, propuestas, ventas,
// sumar totalAmount de ventas cerradas, calcular tasa de cierre
// Resultado: tabla/ranking con sparklines
```

Todos los endpoints nuevos van en `MetricsModule` (ya existe, solo agregar métodos).

**Estimación:** 3 días hábiles.

---

### 3.2 Vista de Calendario

**Librería recomendada:** `react-big-calendar`

```bash
npm install react-big-calendar date-fns --workspace=@respira/web
# date-fns ya está instalado ✅
```

Nueva ruta `/calendar` con eventos de:
- `SalesOpportunity.expectedCloseDate` → etiqueta en verde/rojo según probabilidad
- `Activity` donde `type = MEETING` o `type = TASK` con `dueDate`
- `ServiceOrder.scheduledAt`
- `Invoice.dueDate` (facturas próximas a vencer → color ámbar)

Nuevo endpoint: `GET /calendar/events?from=&to=`
```typescript
// Retorna todos los eventos del usuario (o todos si es ADMIN/MANAGER)
// en el rango de fechas, unificados en un formato común:
type CalendarEvent = {
  id: string;
  title: string;
  start: Date;
  end: Date;
  type: 'OPPORTUNITY' | 'ACTIVITY' | 'SERVICE_ORDER' | 'INVOICE';
  entityId: string;
  color: string;
};
```

**Estimación:** 2 días hábiles.

---

### 3.3 Pronóstico de ventas en el dashboard principal

Agregar al dashboard existente (`/dashboard`) una tarjeta nueva:

```
┌─────────────────────────────────────┐
│  Pronóstico este mes                │
│  Pipeline ponderado: $4.200.000     │
│  ████████████░░░░░  68% de meta    │
│  Meta mensual: $6.200.000           │
└─────────────────────────────────────┘
```

Nuevo endpoint: `GET /metrics/monthly-forecast`

Agregar campo `monthlyTarget` al modelo `BusinessUnit` para definir la meta:
```prisma
model BusinessUnit {
  // ...campos existentes...
  monthlyTarget Decimal? @db.Decimal(12, 2)
}
```

**Estimación:** 1 día hábil.

---

## Fase 4 — Polish y UX `🟢 Deseable`

---

### 4.1 Perfil de usuario y ajustes completos

Completar la ruta `/settings` con:

**Tab "Mi perfil":**
- Cambio de nombre
- Cambio de email (con verificación)
- Cambio de contraseña (requiere contraseña actual)
- Avatar (upload de imagen → guardar en `/public` del servidor o bucket externo)

**Tab "Preferencias":**
- Zona horaria (select, afecta formateo de fechas en el frontend)
- Moneda de visualización (COP es el default, pero habilitar USD para oportunidades con importaciones directas)
- Densidad de tablas (Compacta / Normal / Cómoda)

Backend — endpoints en `UsersModule`:
```
PATCH /users/me            ← actualizar perfil propio
PATCH /users/me/password   ← cambiar contraseña
POST  /users/me/avatar     ← subir foto (multipart/form-data)
```

**Estimación:** 2 días hábiles.

---

### 4.2 Dark mode

El design system con Tailwind 4 ya usa variables CSS. Agregar variantes para modo oscuro:

En `globals.css` agregar las variables de tema oscuro:
```css
@media (prefers-color-scheme: dark) {
  :root {
    --background: #0F172A;
    --foreground: #F1F5F9;
    --card: #1E293B;
    --border: #334155;
    --muted: #475569;
  }
}

[data-theme="dark"] {
  /* mismas variables para toggle manual */
}
```

Agregar toggle en el topbar con `Sun` / `Moon` de lucide-react. Persistir preferencia en `localStorage`.

**Estimación:** 1 día hábil.

---

### 4.3 Mejoras de UX en formularios y tablas

Estas mejoras son transversales y elevan la percepción de calidad:

**En todos los formularios modales:**
- Confirmar antes de cerrar si hay cambios sin guardar (custom hook `useUnsavedChanges`)
- Toast de éxito/error ya funciona con `sonner` — verificar que todos los formularios lo usen

**En todas las tablas:**
- Columnas ordenables (click en encabezado alterna asc/desc, se envía como `?orderBy=name&orderDir=asc` al backend)
- Selección múltiple con checkbox para acciones en lote (eliminar, cambiar estado)
- Persistir filtros activos en la URL (`?status=ACTIVE&page=2`) para que el botón Atrás funcione

**En el sidebar:**
- Colapsable en desktop (modo icono-only)
- Indicadores de conteo: número de tareas pendientes sobre el ícono de Actividades, facturas vencidas sobre Facturas

**Estimación:** 2 días hábiles.

---

## Resumen de esfuerzo total

| Fase | Tareas | Días hábiles |
|---|---|:---:|
| **Fase 1 — Core CRM** | Kanban, Actividades, Búsqueda, Notificaciones | 10 |
| **Fase 2 — Datos y Exports** | Product enriquecido, Seed real, Excel, PDF | 5 |
| **Fase 3 — Reporting** | Dashboard ampliado, Calendario, Pronóstico | 6 |
| **Fase 4 — Polish** | Ajustes, Dark mode, UX transversal | 5 |
| **Total** | | **≈ 26 días hábiles** |

---

## Cambios al schema Prisma — resumen consolidado

Todas las migraciones a ejecutar en orden:

```bash
# 1. Agregar lostReason a oportunidades (Fase 1.1)
npm run prisma:migrate -- --name add_lost_reason_to_opportunity

# 2. Nuevo modelo Activity (Fase 1.2)
npm run prisma:migrate -- --name add_activity_model

# 3. Enriquecer Product (Fase 2.1)
npm run prisma:migrate -- --name enrich_product_model

# 4. monthlyTarget en BusinessUnit (Fase 3.3)
npm run prisma:migrate -- --name add_monthly_target_to_business_unit
```

Nunca editar la migración inicial. Cada cambio es una migración nueva aditiva.

---

## Stack de dependencias nuevas

| Librería | Paquete | Para qué |
|---|---|---|
| DnD Kit | `@dnd-kit/core`, `@dnd-kit/sortable` | Kanban drag-and-drop |
| React PDF | `@react-pdf/renderer` | Export PDF de propuestas |
| ExcelJS | `exceljs` | Export Excel (backend) |
| React Big Calendar | `react-big-calendar` | Vista de calendario |

Todas las demás dependencias (Recharts, date-fns, lucide-react, sonner, React Query, Zod) ya están instaladas y se reutilizan.

---

## Orden de implementación recomendado

Si se trabaja en solitario, el orden óptimo para avanzar con menos bloqueos es:

```
Semana 1:  1.1 Kanban  →  1.2 Actividades (schema primero)
Semana 2:  1.3 Búsqueda global  →  1.4 Notificaciones UI
Semana 3:  2.1 Product  →  2.2 Seed real  →  2.3 Excel  →  2.4 PDF
Semana 4:  3.1 Reportes  →  3.2 Calendario  →  3.3 Pronóstico
Semana 5:  4.1 Settings  →  4.2 Dark mode  →  4.3 UX polish
```

Cada semana cierra con una funcionalidad demostrable al evaluador o cliente.

---

## Criterios de completitud para evaluación académica

Para que el proyecto sea considerado un CRM funcional completo en contexto académico, debe cumplir:

- [ ] El flujo completo Lead → Oportunidad → Propuesta → Venta → Factura es navegable sin errores
- [ ] El Pipeline Kanban permite arrastrar oportunidades entre etapas
- [ ] Cada empresa/contacto/oportunidad tiene un timeline de actividades
- [ ] El dashboard muestra métricas reales con datos del seed de Medical M&B
- [ ] Las propuestas se pueden exportar a PDF con diseño profesional
- [ ] Los listados se pueden exportar a Excel
- [ ] La búsqueda global encuentra resultados entre todos los módulos
- [ ] Las notificaciones se reciben y pueden marcarse como leídas
- [ ] El catálogo de productos refleja el negocio real (nebulizadores PARI, espirómetros, etc.)
- [ ] El sistema corre con un solo `docker compose up` desde cero

---

*Documento generado para RespiraCRM · Proyecto de Carrera · Mayo 2026*
