# Documento Maestro: RespiraCRM
> **Versión:** 1.0  
> **Estado:** Implementado (Main Branch)  
> **Enfoque:** CRM Modular para el sector de equipos médicos y salud respiratoria.

## 1. Visión General
**RespiraCRM** es una plataforma operativa integral que combina ventas, servicio técnico, automatización de marketing e inteligencia artificial para optimizar el ciclo de vida del cliente en la industria médica respiratoria.

---

## 2. Áreas Funcionales (Módulos Implementados)

### 📈 CRM de Ventas Core
- **Gestión de Empresas y Contactos:** Base de datos centralizada con segmentación por tipo de cliente (Institución, Profesional, Distribuidor, Paciente).
- **Embudo de Ventas (Opportunities):** Pipeline visual con etapas (Nuevo, Contactado, Propuesta, Negociación, Ganado/Perdido).
- **Propuestas y Ventas:** Generación de cotizaciones vinculadas a productos y oportunidades.

### 🤖 Inteligencia Artificial (IA)
- **Motor:** Integración con **Groq (Llama 3.3)**.
- **Análisis de Leads:** Calificación automática y resumen ejecutivo de oportunidades.
- **Predicción de Riesgos:** Identificación de cuellos de botella en la negociación.

### 💰 Motor CPQ (Configure, Price, Quote)
- **Descuentos Automáticos:** Reglas de negocio basadas en:
  - Volumen de compra (Escalas).
  - Categoría del cliente (Precios especiales para distribuidores).
  - Campañas temporales con prioridad configurable.
- **Catálogo de Productos:** Gestión de SKU, stock, marcas y especificaciones técnicas en formato JSON.

### 🏆 Gamificación y Engagement
- **Sistema de Puntos:** Recompensa por acciones (Ganar ventas, completar tareas).
- **Niveles y Medallas:** Evolución con insignias automáticas (`First Win`, `Elite Seller`, `Productive Agent`).
- **Leaderboard:** Ranking en tiempo real interactivo para el equipo comercial.

### 📧 Automatización de Marketing (Nurturing)
- **Secuencias de Email:** Flujos de correos automáticos (Drip Campaigns) programados mediante CronJobs.
- **Templates Dinámicos:** Soporte para variables de personalización (`{{name}}`).
- **Seguimiento:** Monitorización de estados (`ACTIVE`, `PAUSED`, `COMPLETED`).

### 🛠️ Operaciones y Servicio Técnico
- **Órdenes de Servicio (OS):** Gestión de soporte técnico, instalaciones y mantenimientos.
- **Facturación (Invoicing):** Generación de facturas y seguimiento de cobros.

---

## 3. Stack Tecnológico

### Backend (NestJS)
- **Framework:** NestJS 11.
- **Seguridad:** JWT, Roles (RBAC), Argon2.
- **Automatización:** `@nestjs/schedule` para tareas en segundo plano.

### Frontend (Next.js)
- **Framework:** Next.js 14+ (App Router).
- **Styling:** Vanilla CSS + Tailwind CSS (Diseño premium, gradientes, dark mode).
- **Componentes:** Shadcn UI + Lucide Icons.
- **Estado:** React Query para sincronización de servidor.

### Base de Datos
- **Motor:** PostgreSQL.
- **ORM:** Prisma.

---

## 4. Directorios Clave del Proyecto
- `apps/api`: Lógica de negocio y endpoints.
- `apps/web`: Interfaz de usuario y componentes React.
- `prisma/schema.prisma`: Definición del modelo de datos.
- `seed-*.ts`: Scripts de inicialización de datos para cada módulo.

---
