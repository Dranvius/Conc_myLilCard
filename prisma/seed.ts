import bcrypt from 'bcrypt';
import {
  PrismaClient,
  CompanyStatus,
  InvoiceStatus,
  OpportunityStage,
  ProposalStatus,
  SaleStatus,
  ServiceOrderPriority,
  ServiceOrderStatus,
} from '@prisma/client';

const prisma = new PrismaClient();

const permissionCatalog = [
  ['users.read', 'Ver usuarios'],
  ['users.write', 'Crear y editar usuarios'],
  ['roles.manage', 'Gestionar roles y permisos'],
  ['business-units.read', 'Ver unidades de negocio'],
  ['companies.read', 'Ver empresas'],
  ['companies.write', 'Crear y editar empresas'],
  ['contacts.read', 'Ver contactos'],
  ['contacts.write', 'Crear y editar contactos'],
  ['products.read', 'Ver productos'],
  ['products.write', 'Crear y editar productos'],
  ['opportunities.read', 'Ver oportunidades'],
  ['opportunities.write', 'Crear y editar oportunidades'],
  ['proposals.read', 'Ver propuestas'],
  ['proposals.write', 'Crear y editar propuestas'],
  ['sales.read', 'Ver ventas'],
  ['sales.write', 'Registrar ventas'],
  ['service-orders.read', 'Ver ordenes de servicio'],
  ['service-orders.write', 'Crear y asignar ordenes de servicio'],
  ['invoices.read', 'Ver facturas'],
  ['invoices.write', 'Crear y actualizar facturas'],
  ['reviews.read', 'Ver reseñas'],
  ['reviews.write', 'Crear reseñas'],
  ['metrics.read', 'Ver métricas'],
  ['admin.read', 'Acceder al panel administrativo'],
  ['audit-logs.read', 'Ver auditoría'],
] as const;

async function main() {
  const adminEmail =
    process.env.INITIAL_ADMIN_EMAIL ?? 'admin@respiracrm.local';
  const adminPassword = process.env.INITIAL_ADMIN_PASSWORD ?? 'Admin12345!';
  const passwordHash = await bcrypt.hash(adminPassword, 12);

  const permissions = await Promise.all(
    permissionCatalog.map(([key, description]) =>
      prisma.permission.upsert({
        where: { key },
        update: { description },
        create: { key, description },
      }),
    ),
  );

  const permissionMap = new Map(
    permissions.map((permission) => [permission.key, permission.id]),
  );

  const roles = [
    {
      name: 'ADMIN',
      description: 'Acceso completo al sistema',
      permissions: permissionCatalog.map(([key]) => key),
    },
    {
      name: 'MANAGER',
      description: 'Supervisión comercial y operativa',
      permissions: [
        'users.read',
        'business-units.read',
        'companies.read',
        'companies.write',
        'contacts.read',
        'contacts.write',
        'products.read',
        'products.write',
        'opportunities.read',
        'opportunities.write',
        'proposals.read',
        'proposals.write',
        'sales.read',
        'sales.write',
        'service-orders.read',
        'service-orders.write',
        'invoices.read',
        'invoices.write',
        'reviews.read',
        'reviews.write',
        'metrics.read',
        'audit-logs.read',
      ],
    },
    {
      name: 'SALES',
      description: 'Equipo comercial',
      permissions: [
        'business-units.read',
        'companies.read',
        'companies.write',
        'contacts.read',
        'contacts.write',
        'products.read',
        'opportunities.read',
        'opportunities.write',
        'proposals.read',
        'proposals.write',
        'sales.read',
        'sales.write',
        'metrics.read',
        'reviews.read',
      ],
    },
    {
      name: 'OPERATOR',
      description: 'Operadores de servicio técnico',
      permissions: [
        'service-orders.read',
        'service-orders.write',
        'reviews.read',
        'reviews.write',
        'companies.read',
        'contacts.read',
        'products.read',
      ],
    },
  ] as const;

  const roleRecords = new Map<string, string>();
  for (const role of roles) {
    const roleRecord = await prisma.role.upsert({
      where: { name: role.name },
      update: { description: role.description },
      create: {
        name: role.name,
        description: role.description,
      },
    });

    roleRecords.set(role.name, roleRecord.id);

    await prisma.rolePermission.deleteMany({
      where: { roleId: roleRecord.id },
    });
    await prisma.rolePermission.createMany({
      data: role.permissions.map((key) => ({
        roleId: roleRecord.id,
        permissionId: permissionMap.get(key)!,
      })),
      skipDuplicates: true,
    });
  }

  const businessUnits = await Promise.all(
    [
      ['Insumos', 'Consumibles, accesorios y repuestos respiratorios'],
      [
        'Medical',
        'Equipos médicos respiratorios y dispositivos especializados',
      ],
      ['MYB', 'Linea comercial complementaria para mantenimiento y bienestar'],
    ].map(([name, description]) =>
      prisma.businessUnit.upsert({
        where: { name },
        update: { description, isActive: true },
        create: { name, description },
      }),
    ),
  );

  const businessUnitMap = new Map(
    businessUnits.map((item) => [item.name, item.id]),
  );

  const adminUser = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      name: 'Administrador RespiraCRM',
      passwordHash,
      roleId: roleRecords.get('ADMIN')!,
      isActive: true,
    },
    create: {
      name: 'Administrador RespiraCRM',
      email: adminEmail,
      passwordHash,
      roleId: roleRecords.get('ADMIN')!,
      isActive: true,
    },
  });

  const salesUser = await prisma.user.upsert({
    where: { email: 'ventas@respiracrm.local' },
    update: {
      name: 'Laura Quiroga',
      passwordHash,
      roleId: roleRecords.get('SALES')!,
      businessUnitId: businessUnitMap.get('Medical'),
    },
    create: {
      name: 'Laura Quiroga',
      email: 'ventas@respiracrm.local',
      passwordHash,
      roleId: roleRecords.get('SALES')!,
      businessUnitId: businessUnitMap.get('Medical'),
    },
  });

  const operatorUser = await prisma.user.upsert({
    where: { email: 'operaciones@respiracrm.local' },
    update: {
      name: 'Julián Benítez',
      passwordHash,
      roleId: roleRecords.get('OPERATOR')!,
      businessUnitId: businessUnitMap.get('MYB'),
    },
    create: {
      name: 'Julián Benítez',
      email: 'operaciones@respiracrm.local',
      passwordHash,
      roleId: roleRecords.get('OPERATOR')!,
      businessUnitId: businessUnitMap.get('MYB'),
    },
  });

  const productSeeds = [
    {
      businessUnitId: businessUnitMap.get('Insumos')!,
      name: 'Circuito Adulto CPAP',
      sku: 'INS-CPAP-001',
      category: 'Insumos',
      description: 'Circuito reusable para ventilación no invasiva',
      unitPrice: 120000,
      stock: 48,
    },
    {
      businessUnitId: businessUnitMap.get('Medical')!,
      name: 'Concentrador Oxígeno 10L',
      sku: 'MED-O2-010',
      category: 'Equipos',
      description: 'Concentrador estacionario para terapia respiratoria',
      unitPrice: 4200000,
      stock: 8,
    },
    {
      businessUnitId: businessUnitMap.get('MYB')!,
      name: 'Kit Mantenimiento Ventilador',
      sku: 'MYB-MNT-100',
      category: 'Servicios',
      description: 'Kit preventivo de filtros y piezas de desgaste',
      unitPrice: 380000,
      stock: 25,
    },
  ];

  for (const product of productSeeds) {
    await prisma.product.upsert({
      where: { sku: product.sku },
      update: product,
      create: product,
    });
  }

  const northClinic = await prisma.company.upsert({
    where: { taxId: '900123456-1' },
    update: {
      name: 'Clínica del Norte',
      legalName: 'Clínica del Norte SAS',
      phone: '+57 601 5550101',
      email: 'compras@clinicadelnorte.co',
      website: 'https://clinicadelnorte.example',
      address: 'Calle 100 #18-20',
      city: 'Bogotá',
      country: 'Colombia',
      businessUnitId: businessUnitMap.get('Medical')!,
      status: CompanyStatus.ACTIVE,
      deletedAt: null,
    },
    create: {
      name: 'Clínica del Norte',
      legalName: 'Clínica del Norte SAS',
      taxId: '900123456-1',
      phone: '+57 601 5550101',
      email: 'compras@clinicadelnorte.co',
      website: 'https://clinicadelnorte.example',
      address: 'Calle 100 #18-20',
      city: 'Bogotá',
      country: 'Colombia',
      businessUnitId: businessUnitMap.get('Medical')!,
      status: CompanyStatus.ACTIVE,
    },
  });

  const homeCare = await prisma.company.upsert({
    where: { taxId: '901555777-0' },
    update: {
      name: 'HomeCare Respiratorio',
      legalName: 'HomeCare Respiratorio LTDA',
      phone: '+57 604 5550202',
      email: 'ventas@homecare.example',
      website: 'https://homecare.example',
      address: 'Carrera 43A #9-10',
      city: 'Medellín',
      country: 'Colombia',
      businessUnitId: businessUnitMap.get('Insumos')!,
      status: CompanyStatus.LEAD,
      deletedAt: null,
    },
    create: {
      name: 'HomeCare Respiratorio',
      legalName: 'HomeCare Respiratorio LTDA',
      taxId: '901555777-0',
      phone: '+57 604 5550202',
      email: 'ventas@homecare.example',
      website: 'https://homecare.example',
      address: 'Carrera 43A #9-10',
      city: 'Medellín',
      country: 'Colombia',
      businessUnitId: businessUnitMap.get('Insumos')!,
      status: CompanyStatus.LEAD,
    },
  });

  const contactAna = await prisma.contact.upsert({
    where: {
      id: 'contact-clinica-norte-ana',
    },
    update: {
      companyId: northClinic.id,
      firstName: 'Ana',
      lastName: 'Rojas',
      position: 'Coordinadora Biomédica',
      email: 'ana.rojas@clinicadelnorte.co',
      phone: '+57 3100000001',
      notes: 'Encargada de evaluación de proveedores',
      deletedAt: null,
    },
    create: {
      id: 'contact-clinica-norte-ana',
      companyId: northClinic.id,
      firstName: 'Ana',
      lastName: 'Rojas',
      position: 'Coordinadora Biomédica',
      email: 'ana.rojas@clinicadelnorte.co',
      phone: '+57 3100000001',
      notes: 'Encargada de evaluación de proveedores',
    },
  });

  const contactMateo = await prisma.contact.upsert({
    where: {
      id: 'contact-homecare-mateo',
    },
    update: {
      companyId: homeCare.id,
      firstName: 'Mateo',
      lastName: 'Parra',
      position: 'Director Comercial',
      email: 'mateo.parra@homecare.example',
      phone: '+57 3100000002',
      notes: 'Cliente potencial con renovacion trimestral',
      deletedAt: null,
    },
    create: {
      id: 'contact-homecare-mateo',
      companyId: homeCare.id,
      firstName: 'Mateo',
      lastName: 'Parra',
      position: 'Director Comercial',
      email: 'mateo.parra@homecare.example',
      phone: '+57 3100000002',
      notes: 'Cliente potencial con renovacion trimestral',
    },
  });

  const opportunityMedical = await prisma.salesOpportunity.upsert({
    where: { id: 'opp-medical-001' },
    update: {
      companyId: northClinic.id,
      contactId: contactAna.id,
      ownerId: salesUser.id,
      businessUnitId: businessUnitMap.get('Medical')!,
      title: 'Renovación de equipos de oxigenoterapia',
      stage: OpportunityStage.NEGOTIATION,
      estimatedValue: 12600000,
      probability: 70,
      expectedCloseDate: new Date('2026-06-15'),
      notes: 'Incluye soporte postventa y capacitación clínica',
    },
    create: {
      id: 'opp-medical-001',
      companyId: northClinic.id,
      contactId: contactAna.id,
      ownerId: salesUser.id,
      businessUnitId: businessUnitMap.get('Medical')!,
      title: 'Renovación de equipos de oxigenoterapia',
      stage: OpportunityStage.NEGOTIATION,
      estimatedValue: 12600000,
      probability: 70,
      expectedCloseDate: new Date('2026-06-15'),
      notes: 'Incluye soporte postventa y capacitación clínica',
    },
  });

  const opportunitySupplies = await prisma.salesOpportunity.upsert({
    where: { id: 'opp-insumos-001' },
    update: {
      companyId: homeCare.id,
      contactId: contactMateo.id,
      ownerId: salesUser.id,
      businessUnitId: businessUnitMap.get('Insumos')!,
      title: 'Contrato trimestral de insumos CPAP',
      stage: OpportunityStage.PROPOSAL_SENT,
      estimatedValue: 2800000,
      probability: 55,
      expectedCloseDate: new Date('2026-05-28'),
      notes: 'Oferta con volumen escalonado',
    },
    create: {
      id: 'opp-insumos-001',
      companyId: homeCare.id,
      contactId: contactMateo.id,
      ownerId: salesUser.id,
      businessUnitId: businessUnitMap.get('Insumos')!,
      title: 'Contrato trimestral de insumos CPAP',
      stage: OpportunityStage.PROPOSAL_SENT,
      estimatedValue: 2800000,
      probability: 55,
      expectedCloseDate: new Date('2026-05-28'),
      notes: 'Oferta con volumen escalonado',
    },
  });

  const oxygenProduct = await prisma.product.findUniqueOrThrow({
    where: { sku: 'MED-O2-010' },
  });
  const suppliesProduct = await prisma.product.findUniqueOrThrow({
    where: { sku: 'INS-CPAP-001' },
  });

  const proposalMedical = await prisma.proposal.upsert({
    where: { code: 'PROP-2026-001' },
    update: {
      opportunityId: opportunityMedical.id,
      title: 'Propuesta equipos oxigenoterapia Clínica del Norte',
      status: ProposalStatus.SENT,
      totalAmount: 12600000,
      validUntil: new Date('2026-06-30'),
      notes: 'Oferta con capacitación técnica incluida',
    },
    create: {
      code: 'PROP-2026-001',
      opportunityId: opportunityMedical.id,
      title: 'Propuesta equipos oxigenoterapia Clínica del Norte',
      status: ProposalStatus.SENT,
      totalAmount: 12600000,
      validUntil: new Date('2026-06-30'),
      notes: 'Oferta con capacitación técnica incluida',
    },
  });

  await prisma.proposalItem.deleteMany({
    where: { proposalId: proposalMedical.id },
  });
  await prisma.proposalItem.create({
    data: {
      proposalId: proposalMedical.id,
      productId: oxygenProduct.id,
      quantity: 3,
      unitPrice: 4200000,
      discount: 0,
      total: 12600000,
    },
  });

  const proposalSupplies = await prisma.proposal.upsert({
    where: { code: 'PROP-2026-002' },
    update: {
      opportunityId: opportunitySupplies.id,
      title: 'Propuesta trimestral HomeCare Respiratorio',
      status: ProposalStatus.ACCEPTED,
      totalAmount: 2640000,
      validUntil: new Date('2026-05-30'),
      notes: 'Descuento por volumen del 6%',
    },
    create: {
      code: 'PROP-2026-002',
      opportunityId: opportunitySupplies.id,
      title: 'Propuesta trimestral HomeCare Respiratorio',
      status: ProposalStatus.ACCEPTED,
      totalAmount: 2640000,
      validUntil: new Date('2026-05-30'),
      notes: 'Descuento por volumen del 6%',
    },
  });

  await prisma.proposalItem.deleteMany({
    where: { proposalId: proposalSupplies.id },
  });
  await prisma.proposalItem.create({
    data: {
      proposalId: proposalSupplies.id,
      productId: suppliesProduct.id,
      quantity: 24,
      unitPrice: 120000,
      discount: 240000,
      total: 2640000,
    },
  });

  const closedSale = await prisma.sale.upsert({
    where: { id: 'sale-closed-001' },
    update: {
      opportunityId: opportunitySupplies.id,
      proposalId: proposalSupplies.id,
      companyId: homeCare.id,
      ownerId: salesUser.id,
      status: SaleStatus.CLOSED,
      totalAmount: 2640000,
      closedAt: new Date('2026-05-02T10:30:00Z'),
    },
    create: {
      id: 'sale-closed-001',
      opportunityId: opportunitySupplies.id,
      proposalId: proposalSupplies.id,
      companyId: homeCare.id,
      ownerId: salesUser.id,
      status: SaleStatus.CLOSED,
      totalAmount: 2640000,
      closedAt: new Date('2026-05-02T10:30:00Z'),
    },
  });

  await prisma.serviceOrder.upsert({
    where: { code: 'OS-2026-001' },
    update: {
      companyId: homeCare.id,
      contactId: contactMateo.id,
      saleId: closedSale.id,
      assignedOperatorId: operatorUser.id,
      type: 'Instalación',
      priority: ServiceOrderPriority.HIGH,
      status: ServiceOrderStatus.ASSIGNED,
      description: 'Instalación inicial y entrenamiento sobre consumibles CPAP',
      scheduledAt: new Date('2026-05-10T14:00:00Z'),
      completedAt: null,
    },
    create: {
      code: 'OS-2026-001',
      companyId: homeCare.id,
      contactId: contactMateo.id,
      saleId: closedSale.id,
      assignedOperatorId: operatorUser.id,
      type: 'Instalación',
      priority: ServiceOrderPriority.HIGH,
      status: ServiceOrderStatus.ASSIGNED,
      description: 'Instalación inicial y entrenamiento sobre consumibles CPAP',
      scheduledAt: new Date('2026-05-10T14:00:00Z'),
    },
  });

  const serviceOrderOpen = await prisma.serviceOrder.upsert({
    where: { code: 'OS-2026-002' },
    update: {
      companyId: northClinic.id,
      contactId: contactAna.id,
      assignedOperatorId: operatorUser.id,
      type: 'Mantenimiento preventivo',
      priority: ServiceOrderPriority.MEDIUM,
      status: ServiceOrderStatus.IN_PROGRESS,
      description: 'Revisión preventiva de concentradores y filtros',
      scheduledAt: new Date('2026-05-11T09:00:00Z'),
      completedAt: null,
    },
    create: {
      code: 'OS-2026-002',
      companyId: northClinic.id,
      contactId: contactAna.id,
      assignedOperatorId: operatorUser.id,
      type: 'Mantenimiento preventivo',
      priority: ServiceOrderPriority.MEDIUM,
      status: ServiceOrderStatus.IN_PROGRESS,
      description: 'Revisión preventiva de concentradores y filtros',
      scheduledAt: new Date('2026-05-11T09:00:00Z'),
    },
  });

  await prisma.invoice.upsert({
    where: { invoiceNumber: 'FV-2026-001' },
    update: {
      saleId: closedSale.id,
      companyId: homeCare.id,
      status: InvoiceStatus.ISSUED,
      subtotal: 2218487.39,
      tax: 421512.61,
      total: 2640000,
      issuedAt: new Date('2026-05-03'),
      dueDate: new Date('2026-05-20'),
      paidAt: null,
    },
    create: {
      invoiceNumber: 'FV-2026-001',
      saleId: closedSale.id,
      companyId: homeCare.id,
      status: InvoiceStatus.ISSUED,
      subtotal: 2218487.39,
      tax: 421512.61,
      total: 2640000,
      issuedAt: new Date('2026-05-03'),
      dueDate: new Date('2026-05-20'),
    },
  });

  await prisma.review.upsert({
    where: { id: 'review-001' },
    update: {
      companyId: homeCare.id,
      serviceOrderId: serviceOrderOpen.id,
      rating: 5,
      comment: 'Respuesta oportuna del equipo técnico.',
    },
    create: {
      id: 'review-001',
      companyId: homeCare.id,
      serviceOrderId: serviceOrderOpen.id,
      rating: 5,
      comment: 'Respuesta oportuna del equipo técnico.',
    },
  });

  await prisma.notification.upsert({
    where: { id: 'notification-seed-001' },
    update: {
      userId: adminUser.id,
      title: 'Seed ejecutado',
      message: 'El entorno inicial de RespiraCRM quedó disponible.',
    },
    create: {
      id: 'notification-seed-001',
      userId: adminUser.id,
      title: 'Seed ejecutado',
      message: 'El entorno inicial de RespiraCRM quedó disponible.',
    },
  });

  await prisma.notification.upsert({
    where: { id: 'notification-seed-002' },
    update: {
      userId: salesUser.id,
      title: 'Propuesta aceptada',
      message: 'HomeCare Respiratorio aceptó la propuesta PROP-2026-002.',
    },
    create: {
      id: 'notification-seed-002',
      userId: salesUser.id,
      title: 'Propuesta aceptada',
      message: 'HomeCare Respiratorio aceptó la propuesta PROP-2026-002.',
    },
  });

  await prisma.auditLog.upsert({
    where: { id: 'audit-seed-001' },
    update: {
      userId: adminUser.id,
      action: 'SEED_BOOTSTRAP',
      entity: 'System',
      entityId: 'initial-seed',
      metadata: {
        roles: roles.length,
        businessUnits: businessUnits.length,
      },
    },
    create: {
      id: 'audit-seed-001',
      userId: adminUser.id,
      action: 'SEED_BOOTSTRAP',
      entity: 'System',
      entityId: 'initial-seed',
      metadata: {
        roles: roles.length,
        businessUnits: businessUnits.length,
      },
    },
  });

  await prisma.auditLog.upsert({
    where: { id: 'audit-seed-002' },
    update: {
      userId: salesUser.id,
      action: 'SALE_CREATED',
      entity: 'Sale',
      entityId: closedSale.id,
      metadata: {
        totalAmount: 2640000,
        company: homeCare.name,
      },
    },
    create: {
      id: 'audit-seed-002',
      userId: salesUser.id,
      action: 'SALE_CREATED',
      entity: 'Sale',
      entityId: closedSale.id,
      metadata: {
        totalAmount: 2640000,
        company: homeCare.name,
      },
    },
  });

  console.log('RespiraCRM seed completed successfully.');
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
