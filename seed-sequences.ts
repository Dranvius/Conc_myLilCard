export {};
import { PrismaClient, OpportunityStage } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Sembrando secuencia de prueba...');

  // 1. Crear Plantilla
  const template = await prisma.emailTemplate.upsert({
    where: { name: 'BIENVENIDA_MOCK' },
    update: {},
    create: {
      name: 'BIENVENIDA_MOCK',
      subject: '¡Hola {{name}}! 👋 Bienvenido a RespiraCRM',
      body: `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto;">
          <h1 style="color: #0070f3;">¡Hola {{name}}!</h1>
          <p>Es un gusto saludarte. Hemos recibido tu interés en nuestros productos médicos.</p>
          <p>Un asesor se pondrá en contacto contigo muy pronto, pero mientras tanto, queríamos darte la bienvenida oficial.</p>
          <hr />
          <p style="font-size: 12px; color: #666;">Enviado automáticamente por RespiraCRM</p>
        </div>
      `,
      category: 'MARKETING',
    },
  });

  // 2. Crear Secuencia
  const sequence = await prisma.emailSequence.upsert({
    where: { name: 'SECUENCIA_BIENVENIDA' },
    update: {},
    create: {
      name: 'SECUENCIA_BIENVENIDA',
      description: 'Secuencia automática para nuevos prospectos',
      steps: {
        create: [
          {
            stepOrder: 1,
            delayHours: 0, // Inmediato
            templateId: template.id,
          },
        ],
      },
    },
  });

  // 3. Enrolar al primer contacto que encuentre
  const contact = await prisma.contact.findFirst({
    where: { email: { not: null } },
  });

  if (contact) {
    console.log(`📧 Enrolando a ${contact.firstName} (${contact.email}) en la secuencia...`);
    await prisma.emailSequenceEnrolment.upsert({
      where: {
        sequenceId_contactId: {
          sequenceId: sequence.id,
          contactId: contact.id,
        },
      },
      update: { status: 'ACTIVE', currentStep: 1 },
      create: {
        sequenceId: sequence.id,
        contactId: contact.id,
        status: 'ACTIVE',
        currentStep: 1,
      },
    });

    // Crear el paso programado para ahora mismo
    const step = await prisma.emailSequenceStep.findFirst({
      where: { sequenceId: sequence.id, stepOrder: 1 },
    });

    if (step) {
      await prisma.emailSequenceEnrolmentStep.create({
        data: {
          enrolmentId: (await prisma.emailSequenceEnrolment.findUnique({
            where: { sequenceId_contactId: { sequenceId: sequence.id, contactId: contact.id } }
          })).id,
          stepId: step.id,
          scheduledAt: new Date(),
        },
      });
    }
    
    console.log('✅ ¡Todo listo! Revisa tu Mailtrap en 1 minuto.');
  } else {
    console.log('❌ No encontré ningún contacto con email para la prueba. Crea uno primero.');
  }
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());
