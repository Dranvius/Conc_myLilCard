import { Injectable } from '@nestjs/common';
import { OpportunityStage, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export type PotentialDuplicate = {
  entityType: 'company' | 'contact' | 'opportunity';
  id: string;
  title: string;
  subtitle: string;
  href: string;
  matchScore: number;
  reasons: string[];
};

type CompanyDuplicateInput = {
  name?: string;
  legalName?: string;
  taxId?: string;
  phone?: string;
  email?: string;
  city?: string;
  businessUnitId?: string;
};

type ContactDuplicateInput = {
  companyId?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
};

type OpportunityDuplicateInput = {
  companyId?: string;
  contactId?: string;
  title?: string;
  source?: string | null;
};

type PublicLeadDuplicateInput = CompanyDuplicateInput &
  ContactDuplicateInput &
  OpportunityDuplicateInput;

@Injectable()
export class DuplicateDetectionService {
  constructor(private readonly prisma: PrismaService) {}

  private normalizeText(value?: string | null) {
    return (value ?? '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private normalizePhone(value?: string | null) {
    return (value ?? '').replace(/\D/g, '');
  }

  private normalizeTaxId(value?: string | null) {
    return (value ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  private getEmailDomain(value?: string | null) {
    const email = (value ?? '').toLowerCase().trim();
    if (!email.includes('@')) {
      return '';
    }

    return email.split('@')[1] ?? '';
  }

  private getPhoneTail(value?: string | null) {
    const normalized = this.normalizePhone(value);
    return normalized.length >= 7 ? normalized.slice(-7) : normalized;
  }

  private computeSimilarity(left?: string | null, right?: string | null) {
    const normalizedLeft = this.normalizeText(left);
    const normalizedRight = this.normalizeText(right);
    if (!normalizedLeft || !normalizedRight) {
      return 0;
    }
    if (normalizedLeft === normalizedRight) {
      return 1;
    }

    const leftTokens = new Set(normalizedLeft.split(' '));
    const rightTokens = new Set(normalizedRight.split(' '));
    const intersection = [...leftTokens].filter((token) =>
      rightTokens.has(token),
    ).length;
    const union = new Set([...leftTokens, ...rightTokens]).size;

    if (!union) {
      return 0;
    }

    return intersection / union;
  }

  private dedupeResults(items: PotentialDuplicate[]) {
    const result = new Map<string, PotentialDuplicate>();

    for (const item of items) {
      const key = `${item.entityType}:${item.id}`;
      const existing = result.get(key);
      if (!existing || existing.matchScore < item.matchScore) {
        result.set(key, item);
      }
    }

    return Array.from(result.values()).sort(
      (left, right) => right.matchScore - left.matchScore,
    );
  }

  async findCompanyDuplicates(
    input: CompanyDuplicateInput,
  ): Promise<PotentialDuplicate[]> {
    const taxId = this.normalizeTaxId(input.taxId);
    const phoneTail = this.getPhoneTail(input.phone);
    const emailDomain = this.getEmailDomain(input.email);
    const primaryName = input.name ?? input.legalName ?? '';

    const candidates = await this.prisma.company.findMany({
      where: {
        deletedAt: null,
        OR: [
          taxId
            ? {
                taxId: {
                  equals: input.taxId,
                },
              }
            : undefined,
          input.name
            ? {
                name: {
                  contains: input.name.slice(0, 12),
                  mode: 'insensitive',
                },
              }
            : undefined,
          input.legalName
            ? {
                legalName: {
                  contains: input.legalName.slice(0, 12),
                  mode: 'insensitive',
                },
              }
            : undefined,
          phoneTail
            ? {
                phone: {
                  contains: phoneTail,
                  mode: 'insensitive',
                },
              }
            : undefined,
        ].filter(Boolean) as Prisma.CompanyWhereInput[],
        businessUnitId: input.businessUnitId || undefined,
      },
      take: 12,
      select: {
        id: true,
        name: true,
        legalName: true,
        taxId: true,
        phone: true,
        email: true,
        city: true,
        status: true,
      },
    });

    const results: PotentialDuplicate[] = [];

    for (const candidate of candidates) {
      const reasons: string[] = [];
      let matchScore = 0;

      if (taxId && this.normalizeTaxId(candidate.taxId) === taxId) {
        reasons.push('Coincidencia exacta por NIT/documento');
        matchScore += 100;
      }

      if (phoneTail && this.getPhoneTail(candidate.phone) === phoneTail) {
        reasons.push('Coincidencia por telefono');
        matchScore += 55;
      }

      const nameSimilarity = Math.max(
        this.computeSimilarity(primaryName, candidate.name),
        this.computeSimilarity(primaryName, candidate.legalName),
      );
      if (nameSimilarity >= 0.75) {
        reasons.push('Nombre de empresa muy similar');
        matchScore += Math.round(nameSimilarity * 45);
      }

      if (
        emailDomain &&
        this.getEmailDomain(candidate.email) &&
        this.getEmailDomain(candidate.email) === emailDomain
      ) {
        reasons.push('Dominio de correo compartido');
        matchScore += 20;
      }

      if (!reasons.length) {
        continue;
      }

      results.push({
        entityType: 'company',
        id: candidate.id,
        title: candidate.name,
        subtitle:
          candidate.taxId ??
          [candidate.city, candidate.email].filter(Boolean).join(' • ') ??
          'Empresa existente',
        href: `/companies/${candidate.id}`,
        matchScore,
        reasons,
      });
    }

    return this.dedupeResults(results);
  }

  async findContactDuplicates(
    input: ContactDuplicateInput,
  ): Promise<PotentialDuplicate[]> {
    const normalizedEmail = (input.email ?? '').toLowerCase().trim();
    const phoneTail = this.getPhoneTail(input.phone);
    const fullName = [input.firstName, input.lastName].filter(Boolean).join(' ');

    const candidates = await this.prisma.contact.findMany({
      where: {
        deletedAt: null,
        OR: [
          normalizedEmail
            ? {
                email: {
                  equals: normalizedEmail,
                },
              }
            : undefined,
          phoneTail
            ? {
                phone: {
                  contains: phoneTail,
                  mode: 'insensitive',
                },
              }
            : undefined,
          input.firstName
            ? {
                firstName: {
                  contains: input.firstName.slice(0, 10),
                  mode: 'insensitive',
                },
              }
            : undefined,
          input.lastName
            ? {
                lastName: {
                  contains: input.lastName.slice(0, 10),
                  mode: 'insensitive',
                },
              }
            : undefined,
        ].filter(Boolean) as Prisma.ContactWhereInput[],
        companyId: input.companyId || undefined,
      },
      take: 12,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        company: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    const results: PotentialDuplicate[] = [];

    for (const candidate of candidates) {
      const reasons: string[] = [];
      let matchScore = 0;

      if (
        normalizedEmail &&
        candidate.email?.toLowerCase().trim() === normalizedEmail
      ) {
        reasons.push('Coincidencia exacta por correo');
        matchScore += 100;
      }

      if (phoneTail && this.getPhoneTail(candidate.phone) === phoneTail) {
        reasons.push('Coincidencia por telefono');
        matchScore += 55;
      }

      const nameSimilarity = this.computeSimilarity(
        fullName,
        `${candidate.firstName} ${candidate.lastName}`,
      );
      if (nameSimilarity >= 0.8) {
        reasons.push('Nombre del contacto muy similar');
        matchScore += Math.round(nameSimilarity * 45);
      }

      if (!reasons.length) {
        continue;
      }

      results.push({
        entityType: 'contact',
        id: candidate.id,
        title: `${candidate.firstName} ${candidate.lastName}`,
        subtitle: (candidate as any).company?.name ?? candidate.email ?? 'Contacto',
        href: '/contacts',
        matchScore,
        reasons,
      });
    }

    return this.dedupeResults(results);
  }

  async findOpportunityDuplicates(
    input: OpportunityDuplicateInput,
  ): Promise<PotentialDuplicate[]> {
    const candidates = await this.prisma.salesOpportunity.findMany({
      where: {
        stage: {
          notIn: [OpportunityStage.WON, OpportunityStage.LOST],
        },
        OR: [
          input.companyId ? { companyId: input.companyId } : undefined,
          input.contactId ? { contactId: input.contactId } : undefined,
          input.title
            ? {
                title: {
                  contains: input.title.slice(0, 18),
                  mode: 'insensitive',
                },
              }
            : undefined,
        ].filter(Boolean) as Prisma.SalesOpportunityWhereInput[],
      },
      take: 12,
      select: {
        id: true,
        title: true,
        stage: true,
        source: true,
        company: {
          select: {
            id: true,
            name: true,
          },
        },
        contact: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    const results: PotentialDuplicate[] = [];

    for (const candidate of candidates) {
      const reasons: string[] = [];
      let matchScore = 0;

      if (input.companyId && (candidate as any).company.id === input.companyId) {
        reasons.push('Pertenece a la misma empresa');
        matchScore += 25;
      }

      if (input.contactId && (candidate as any).contact?.id === input.contactId) {
        reasons.push('Usa el mismo contacto');
        matchScore += 25;
      }

      const titleSimilarity = this.computeSimilarity(input.title, candidate.title);
      if (titleSimilarity >= 0.75) {
        reasons.push('Titulo de oportunidad muy similar');
        matchScore += Math.round(titleSimilarity * 55);
      }

      if (input.source && candidate.source === input.source) {
        reasons.push('Comparte el mismo origen de lead');
        matchScore += 10;
      }

      if (!reasons.length) {
        continue;
      }

      results.push({
        entityType: 'opportunity',
        id: candidate.id,
        title: candidate.title,
        subtitle: `${(candidate as any).company.name} • ${candidate.stage}`,
        href: `/opportunities/${candidate.id}`,
        matchScore,
        reasons,
      });
    }

    return this.dedupeResults(results);
  }

  async findPublicLeadDuplicates(input: PublicLeadDuplicateInput) {
    const [companies, contacts, opportunities] = await Promise.all([
      this.findCompanyDuplicates(input),
      this.findContactDuplicates(input),
      this.findOpportunityDuplicates(input),
    ]);

    return this.dedupeResults([...companies, ...contacts, ...opportunities]);
  }
}
