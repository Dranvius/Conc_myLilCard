export {};
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Sincronizando puntos de victorias pasadas...');

  const wonOpportunities = await prisma.salesOpportunity.findMany({
    where: { stage: 'WON' },
    select: { id: true, ownerId: true, title: true, estimatedValue: true },
  });

  console.log(`Encontradas ${wonOpportunities.length} victorias.`);

  for (const opp of wonOpportunities) {
    if (!opp.ownerId) continue;

    console.log(`Asignando 100 puntos a usuario ${opp.ownerId} por: ${opp.title}`);

    await prisma.$transaction(async (tx) => {
      // 1. Registrar la acción si no existe para esta oportunidad
      const existing = await tx.pointAction.findFirst({
        where: { userId: opp.ownerId, reason: 'Oportunidad Ganada', metadata: { equals: { opportunityId: opp.id } } as any },
      });

      if (!existing) {
        await tx.pointAction.create({
          data: {
            userId: opp.ownerId,
            points: 100,
            reason: 'Oportunidad Ganada',
            metadata: { opportunityId: opp.id, value: opp.estimatedValue },
          },
        });

        // 2. Actualizar stats
        await tx.userStats.upsert({
          where: { userId: opp.ownerId },
          update: {
            points: { increment: 100 },
          },
          create: {
            userId: opp.ownerId,
            points: 100,
            level: 1,
          },
        });
      }
    });
  }

  console.log('✅ ¡Sincronización completada! Refresca el CRM.');
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());
