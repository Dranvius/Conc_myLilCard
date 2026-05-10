export {};
import { PrismaClient, CustomerType, PricingRuleType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('💰 Sembrando Reglas de Precio (CPQ)...');

  // 1. Regla por Volumen: 10% de descuento si compran 5 o más
  await prisma.pricingRule.upsert({
    where: { id: 'rule-volume-10' },
    update: {},
    create: {
      id: 'rule-volume-10',
      name: 'Descuento por Volumen (5+)',
      type: PricingRuleType.VOLUME,
      minQuantity: 5,
      discountPercent: 10,
      priority: 10,
    },
  });

  // 2. Regla por Tipo de Cliente: 5% para Instituciones
  await prisma.pricingRule.upsert({
    where: { id: 'rule-institution' },
    update: {},
    create: {
      id: 'rule-institution',
      name: 'Convenio Institucional',
      type: PricingRuleType.CUSTOMER_TYPE,
      customerType: CustomerType.INSTITUTION,
      discountPercent: 5,
      priority: 5,
    },
  });

  console.log('✅ Reglas creadas. Ahora, cuando crees una Propuesta, los descuentos se aplicarán SOLOS.');
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());
