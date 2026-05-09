import { PrismaClient, CompanyStatus, OpportunityStage, SaleStatus, ActivityType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando generación de datos de prueba (Mock Data)...');

  // Obtener referencias existentes
  const users = await prisma.user.findMany({ where: { role: { name: 'SALES' } } });
  if (users.length === 0) {
    console.error('No se encontraron usuarios de ventas. Ejecuta "npm run db:seed" primero.');
    return;
  }
  const salesUser = users[0];

  const admin = await prisma.user.findFirst({ where: { role: { name: 'ADMIN' } } });
  const adminUser = admin || salesUser;

  const bUnits = await prisma.businessUnit.findMany();
  const getRandomBU = () => bUnits[Math.floor(Math.random() * bUnits.length)].id;

  const products = await prisma.product.findMany();
  if (products.length === 0) {
    console.error('No se encontraron productos.');
    return;
  }
  const getRandomProduct = () => products[Math.floor(Math.random() * products.length)];

  // Crear un segundo vendedor para comparar productividad
  const salesUser2 = await prisma.user.upsert({
    where: { email: 'ventas2@respiracrm.local' },
    update: {},
    create: {
      name: 'Carlos Mendoza',
      email: 'ventas2@respiracrm.local',
      passwordHash: salesUser.passwordHash,
      roleId: salesUser.roleId,
      businessUnitId: getRandomBU(),
      isActive: true,
    }
  });

  const sellers = [salesUser, salesUser2];
  const getRandomSeller = () => sellers[Math.floor(Math.random() * sellers.length)];

  // Nombres de empresas falsas
  const companyNames = [
    'Hospital Universitario', 'Clínica San Juan', 'Centro Médico Las Américas',
    'SaludCoop', 'Sanitas S.A.', 'Fundación Cardioinfantil', 'Cruz Roja Colombiana',
    'Clínica Marly', 'Hospital Militar Central', 'Clínica del Country'
  ];

  console.log('Creando empresas y contactos...');
  const companies = [];
  for (let i = 0; i < companyNames.length; i++) {
    const c = await prisma.company.upsert({
      where: { taxId: `800${i}00${i}00-1` },
      update: {},
      create: {
        name: companyNames[i],
        legalName: `${companyNames[i]} SAS`,
        taxId: `800${i}00${i}00-1`,
        phone: `+57 601 55500${i}0`,
        email: `contacto${i}@${companyNames[i].toLowerCase().replace(/\s/g, '')}.com`,
        address: `Calle ${10 + i} # ${20 + i} - 10`,
        city: 'Bogotá',
        country: 'Colombia',
        businessUnitId: getRandomBU(),
        status: CompanyStatus.ACTIVE,
      }
    });
    companies.push(c);

    // Crear contacto para la empresa
    await prisma.contact.upsert({
      where: { id: `mock-contact-${i}` },
      update: {},
      create: {
        id: `mock-contact-${i}`,
        companyId: c.id,
        firstName: `Comprador ${i}`,
        lastName: `Apellido ${i}`,
        position: 'Jefe de Compras',
        email: `compras${i}@${companyNames[i].toLowerCase().replace(/\s/g, '')}.com`,
        phone: `+57 300 00000${i}0`,
      }
    });
  }

  const contacts = await prisma.contact.findMany();

  console.log('Creando 30 oportunidades comerciales...');
  const stages = Object.values(OpportunityStage);
  
  for (let i = 0; i < 30; i++) {
    const company = companies[Math.floor(Math.random() * companies.length)];
    const contact = contacts.find(c => c.companyId === company.id) || contacts[0];
    const seller = getRandomSeller();
    const stage = stages[Math.floor(Math.random() * stages.length)];
    const expectedCloseDate = new Date();
    // Fechas entre el mes anterior y 3 meses en el futuro
    expectedCloseDate.setMonth(expectedCloseDate.getMonth() + Math.floor(Math.random() * 5) - 1);
    expectedCloseDate.setDate(Math.floor(Math.random() * 28) + 1);

    const estValue = Math.floor(Math.random() * 20000000) + 1000000;
    
    const opp = await prisma.salesOpportunity.upsert({
      where: { id: `mock-opp-${i}` },
      update: {},
      create: {
        id: `mock-opp-${i}`,
        title: `Venta a ${company.name} #${i}`,
        companyId: company.id,
        contactId: contact.id,
        ownerId: seller.id,
        businessUnitId: getRandomBU(),
        stage: stage,
        estimatedValue: estValue,
        probability: Math.floor(Math.random() * 100),
        expectedCloseDate: expectedCloseDate,
        createdAt: new Date(Date.now() - Math.random() * 10000000000), // Fecha aleatoria en los últimos ~115 días
      }
    });

    // Actividades para cada oportunidad
    const numActivities = Math.floor(Math.random() * 4) + 1; // 1 a 4 actividades
    for (let a = 0; a < numActivities; a++) {
      await prisma.activity.create({
        data: {
          type: [ActivityType.CALL, ActivityType.EMAIL, ActivityType.MEETING, ActivityType.WHATSAPP][Math.floor(Math.random() * 4)],
          subject: `Seguimiento #${a + 1}`,
          description: 'Revisión de la oportunidad con el cliente.',
          companyId: company.id,
          contactId: contact.id,
          opportunityId: opp.id,
          userId: seller.id,
          completedAt: new Date(opp.createdAt.getTime() + Math.random() * 1000000000),
        }
      });
    }

    // Si está ganada, crear Venta Cerrada
    if (stage === OpportunityStage.WON) {
      const closedDate = new Date(expectedCloseDate.getTime() - Math.random() * 1000000000); // Cerrada un poco antes
      await prisma.sale.upsert({
        where: { id: `mock-sale-${i}` },
        update: {},
        create: {
          id: `mock-sale-${i}`,
          opportunityId: opp.id,
          companyId: company.id,
          ownerId: seller.id,
          status: SaleStatus.CLOSED,
          totalAmount: estValue,
          closedAt: closedDate,
        }
      });
    }
  }

  console.log('Seed Mock Data completado.');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
