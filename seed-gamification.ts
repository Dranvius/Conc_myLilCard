export {};
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🏆 Sembrando Medallas (Badges)...');

  const badges = [
    {
      name: 'FIRST_WIN',
      description: '¡Tu primera victoria! Has cerrado tu primera oportunidad con éxito.',
      icon: 'Trophy',
      requirement: 'Ganar 1 oportunidad',
    },
    {
      name: 'ELITE_SELLER',
      description: 'Vendedor de Élite. Has alcanzado los 1000 puntos de reputación.',
      icon: 'Crown',
      requirement: 'Llegar a 1000 puntos',
    },
    {
      name: 'PRODUCTIVE_AGENT',
      description: 'Agente Incansable. Has completado más de 50 actividades de seguimiento.',
      icon: 'Zap',
      requirement: '50 actividades completadas',
    },
  ];

  for (const b of badges) {
    await prisma.badge.upsert({
      where: { name: b.name },
      update: b,
      create: b,
    });
  }

  console.log('✅ Medallas listas. ¡Que empiece el juego!');
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());
