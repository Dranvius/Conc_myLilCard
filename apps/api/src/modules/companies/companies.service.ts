import {
  ConflictException,
  Injectable,
  Logger,
  StreamableFile,
} from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { Buffer } from 'buffer';
import { CompanyStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  buildPaginationMeta,
  resolvePagination,
} from '../../common/utils/pagination';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { DuplicateDetectionService } from '../duplicates/duplicate-detection.service';
import { throwPotentialDuplicate } from '../duplicates/potential-duplicate';
import { CompanyQueryDto } from './dto/company-query.dto';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';

type GeocodingResponseItem = {
  lat?: string;
  lon?: string;
};

@Injectable()
export class CompaniesService {
  private readonly logger = new Logger(CompaniesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
    private readonly duplicateDetectionService: DuplicateDetectionService,
  ) {}

  private buildWhere(query: CompanyQueryDto): Prisma.CompanyWhereInput {
    return {
      status: query.status || undefined,
      businessUnitId: query.businessUnitId || undefined,
      deletedAt: null,
      OR: query.search
        ? [
            {
              name: {
                contains: query.search,
                mode: 'insensitive',
              },
            },
            {
              legalName: {
                contains: query.search,
                mode: 'insensitive',
              },
            },
            {
              taxId: {
                contains: query.search,
                mode: 'insensitive',
              },
            },
            {
              city: {
                contains: query.search,
                mode: 'insensitive',
              },
            },
            {
              email: {
                contains: query.search,
                mode: 'insensitive',
              },
            },
          ]
        : undefined,
    };
  }

  private async geocodeAddress(
    address?: string,
    city?: string,
    country?: string,
  ): Promise<{ latitude: number; longitude: number } | null> {
    if (!address && !city) {
      return null;
    }

    const tryGeocode = async (queryStr: string) => {
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(queryStr)}`,
          {
            headers: {
              'User-Agent': 'RespiraCRM/1.0',
            },
          },
        );
        if (!response.ok) {
          return null;
        }

        const data = (await response.json()) as GeocodingResponseItem[];
        const firstMatch = data[0];
        if (!firstMatch?.lat || !firstMatch?.lon) {
          return null;
        }

        return {
          latitude: Number.parseFloat(firstMatch.lat),
          longitude: Number.parseFloat(firstMatch.lon),
        };
      } catch (error) {
        this.logger.warn(
          JSON.stringify({
            event: 'company.geocoding.failed',
            query: queryStr,
            message: error instanceof Error ? error.message : 'Unknown error',
          }),
        );
        return null;
      }
    };

    const fullQuery = [address, city, country].filter(Boolean).join(', ');
    let coords = await tryGeocode(fullQuery);

    if (!coords && address && city) {
      const cityQuery = [city, country].filter(Boolean).join(', ');
      coords = await tryGeocode(cityQuery);
    }

    return coords;
  }

  async findMany(query: CompanyQueryDto) {
    const { page, limit, skip } = resolvePagination(query.page, query.limit);
    const where = this.buildWhere(query);

    const [data, total] = await this.prisma.$transaction([
      this.prisma.company.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          businessUnit: true,
          _count: {
            select: {
              contacts: true,
              opportunities: true,
              sales: true,
            },
          },
        },
      }),
      this.prisma.company.count({ where }),
    ]);

    return {
      data,
      meta: buildPaginationMeta(page, limit, total),
    };
  }

  findOne(id: string) {
    return this.prisma.company.findFirstOrThrow({
      where: {
        id,
        deletedAt: null,
      },
      include: {
        businessUnit: true,
        contacts: {
          where: {
            deletedAt: null,
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
        opportunities: {
          include: {
            owner: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
        sales: {
          include: {
            owner: {
              select: {
                id: true,
                name: true,
              },
            },
            opportunity: {
              select: {
                businessUnit: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
        serviceOrders: {
          include: {
            assignedOperator: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
        invoices: {
          orderBy: {
            createdAt: 'desc',
          },
        },
        reviews: {
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });
  }

  async create(
    createCompanyDto: CreateCompanyDto,
    actorUserId?: string,
    ipAddress?: string,
  ) {
    const duplicates =
      await this.duplicateDetectionService.findCompanyDuplicates(
        createCompanyDto,
      );
    if (duplicates.length && !createCompanyDto.allowPotentialDuplicate) {
      throwPotentialDuplicate('la empresa', duplicates);
    }

    const coords =
      createCompanyDto.address || createCompanyDto.city
        ? await this.geocodeAddress(
            createCompanyDto.address,
            createCompanyDto.city,
            createCompanyDto.country,
          )
        : null;

    const company = await this.prisma.company.create({
      data: {
        name: createCompanyDto.name,
        legalName: createCompanyDto.legalName,
        taxId: createCompanyDto.taxId,
        customerType: createCompanyDto.customerType,
        phone: createCompanyDto.phone,
        email: createCompanyDto.email,
        website: createCompanyDto.website,
        address: createCompanyDto.address,
        city: createCompanyDto.city,
        country: createCompanyDto.country,
        businessUnitId: createCompanyDto.businessUnitId,
        status: createCompanyDto.status,
        latitude: coords?.latitude,
        longitude: coords?.longitude,
      },
      include: {
        businessUnit: true,
      },
    });

    await this.auditLogsService.create({
      userId: actorUserId,
      action: duplicates.length
        ? 'COMPANY_CREATED_DUPLICATE_OVERRIDE'
        : 'COMPANY_CREATED',
      entity: 'Company',
      entityId: company.id,
      metadata: {
        businessUnitId: company.businessUnitId,
        status: company.status,
        duplicateIds: duplicates.map((item) => item.id),
      },
      ipAddress,
    });

    return company;
  }

  async update(
    id: string,
    updateCompanyDto: UpdateCompanyDto,
    actorUserId?: string,
    ipAddress?: string,
  ) {
    const coords =
      updateCompanyDto.address || updateCompanyDto.city
        ? await this.geocodeAddress(
            updateCompanyDto.address,
            updateCompanyDto.city,
            updateCompanyDto.country,
          )
        : null;

    const company = await this.prisma.company.update({
      where: { id },
      data: {
        ...updateCompanyDto,
        latitude: coords?.latitude,
        longitude: coords?.longitude,
      },
      include: {
        businessUnit: true,
      },
    });

    await this.auditLogsService.create({
      userId: actorUserId,
      action: 'COMPANY_UPDATED',
      entity: 'Company',
      entityId: company.id,
      metadata: {
        businessUnitId: company.businessUnitId,
        status: company.status,
      },
      ipAddress,
    });

    return company;
  }

  async remove(id: string, actorUserId?: string, ipAddress?: string) {
    await this.prisma.company.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        status: CompanyStatus.ARCHIVED,
      },
    });

    await this.auditLogsService.create({
      userId: actorUserId,
      action: 'COMPANY_ARCHIVED',
      entity: 'Company',
      entityId: id,
      ipAddress,
    });

    return { success: true };
  }

  async exportToExcel(
    query: CompanyQueryDto,
    actorUserId?: string,
    ipAddress?: string,
  ) {
    const where = this.buildWhere(query);
    const companies = await this.prisma.company.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        businessUnit: true,
        _count: {
          select: {
            contacts: true,
            opportunities: true,
            sales: true,
          },
        },
      },
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Empresas');

    worksheet.columns = [
      { header: 'Nombre', key: 'name', width: 30 },
      { header: 'Razon social', key: 'legalName', width: 30 },
      { header: 'NIT/RUT', key: 'taxId', width: 15 },
      { header: 'Tipo', key: 'customerType', width: 15 },
      { header: 'Estado', key: 'status', width: 15 },
      { header: 'Unidad de negocio', key: 'businessUnit', width: 20 },
      { header: 'Ciudad', key: 'city', width: 15 },
      { header: 'Telefono', key: 'phone', width: 20 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Contactos', key: 'contactsCount', width: 10 },
      { header: 'Oportunidades', key: 'opportunitiesCount', width: 15 },
    ];

    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0F6C8D' },
    };

    companies.forEach((company) => {
      worksheet.addRow({
        name: company.name,
        legalName: company.legalName || 'N/A',
        taxId: company.taxId || 'N/A',
        customerType: company.customerType,
        status: company.status,
        businessUnit: company.businessUnit.name,
        city: company.city || 'N/A',
        phone: company.phone || 'N/A',
        email: company.email || 'N/A',
        contactsCount: company._count.contacts,
        opportunitiesCount: company._count.opportunities,
      });
    });

    await this.auditLogsService.create({
      userId: actorUserId,
      action: 'COMPANIES_EXPORTED',
      entity: 'Company',
      entityId: 'bulk-export',
      metadata: {
        total: companies.length,
        filters: query,
      },
      ipAddress,
    });

    this.logger.log(
      JSON.stringify({
        event: 'companies.export.completed',
        total: companies.length,
      }),
    );

    const buffer = await workbook.xlsx.writeBuffer();
    return new StreamableFile(Buffer.from(buffer));
  }
}
