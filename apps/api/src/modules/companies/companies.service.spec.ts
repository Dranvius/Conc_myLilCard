import { CompanyStatus } from '@prisma/client';
import { CompaniesService } from './companies.service';

describe('CompaniesService', () => {
  it('creates a company', async () => {
    const prisma = {
      company: {
        create: jest.fn().mockResolvedValue({
          id: 'company-1',
          name: 'Clínica del Norte',
          taxId: '900123456-1',
          status: CompanyStatus.ACTIVE,
        }),
      },
    };

    const service = new CompaniesService(prisma as never);

    const result = await service.create({
      name: 'Clínica del Norte',
      taxId: '900123456-1',
      businessUnitId: 'bu-1',
      status: CompanyStatus.ACTIVE,
    });

    expect(prisma.company.create).toHaveBeenCalled();
    expect(result.name).toBe('Clínica del Norte');
  });
});
