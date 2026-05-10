import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CPQService {
  constructor(private readonly prisma: PrismaService) {}

  async calculateAutomaticDiscounts(params: {
    items: { productId: string; quantity: number; unitPrice: number }[];
    companyId: string;
  }) {
    const company = await this.prisma.company.findUnique({
      where: { id: params.companyId },
      select: { customerType: true, businessUnitId: true },
    });

    const activeRules = await this.prisma.pricingRule.findMany({
      where: {
        isActive: true,
        OR: [
          { validFrom: null },
          { validFrom: { lte: new Date() } },
        ],
        AND: [
          {
            OR: [
              { validUntil: null },
              { validUntil: { gte: new Date() } },
            ],
          }
        ]
      },
      orderBy: { priority: 'desc' },
    });

    const products = await this.prisma.product.findMany({
      where: { id: { in: params.items.map((i) => i.productId) } },
    });
    const productMap = new Map(products.map((p) => [p.id, p]));

    return params.items.map((item) => {
      const product = productMap.get(item.productId);
      let appliedDiscount = 0;

      // Apply rules in order of priority (highest priority matching rule wins)
      for (const rule of activeRules) {
        let isMatch = true;

        // Check conditions
        if (rule.businessUnitId && rule.businessUnitId !== company?.businessUnitId) isMatch = false;
        if (rule.productId && rule.productId !== item.productId) isMatch = false;
        if (rule.productCategory && rule.productCategory !== product?.category) isMatch = false;
        if (rule.customerType && rule.customerType !== company?.customerType) isMatch = false;
        if (rule.minQuantity && item.quantity < rule.minQuantity) isMatch = false;

        if (isMatch) {
          if (rule.discountPercent) {
            const percentDiscount = (item.unitPrice * item.quantity * Number(rule.discountPercent)) / 100;
            appliedDiscount = Math.max(appliedDiscount, percentDiscount);
          }
          if (rule.discountAmount) {
            appliedDiscount = Math.max(appliedDiscount, Number(rule.discountAmount));
          }
          
          // Break on first matching high-priority rule, or continue if you want additive discounts
          break;
        }
      }

      return {
        ...item,
        automaticDiscount: appliedDiscount,
      };
    });
  }
}
