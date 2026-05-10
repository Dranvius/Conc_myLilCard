import { Injectable, StreamableFile } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { Buffer } from 'buffer';
import { CompanyStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  buildPaginationMeta,
  resolvePagination,
} from '../../common/utils/pagination';
import { CompanyQueryDto } from './dto/company-query.dto';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';

@Injectable()
export class CompaniesService {
  constructor(private readonly prisma: PrismaService) {}

  private async geocodeAddress(address?: string, city?: string, country?: string): Promise<{ latitude: number, longitude: number } | null> {
    if (!address && !city) return null;
    
    const tryGeocode = async (queryStr: string) => {
      try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(queryStr)}`, {
          headers: {
            'User-Agent': 'RespiraCRM/1.0',
          }
        });
        const data = await response.json();
        if (data && data.length > 0) {
          return {
            latitude: parseFloat(data[0].lat),
            longitude: parseFloat(data[0].lon),
          };
        }
      } catch (error) {
        console.error('Error geocoding address:', error);
      }
      return null;
    };

    // Try full address first
    const fullQuery = [address, city, country].filter(Boolean).join(', ');
    let coords = await tryGeocode(fullQuery);

    // Fallback: If address fails (common with LATAM formats like "Carrera X # Y"), try just the city
    if (!coords && address && city) {
      const cityQuery = [city, country].filter(Boolean).join(', ');
      coords = await tryGeocode(cityQuery);
    }

    return coords;
  }

  async findMany(query: CompanyQueryDto) {
    const { page, limit, skip } = resolvePagination(query.page, query.limit);
    const where = {
      status: query.status || undefined,
      businessUnitId: query.businessUnitId || undefined,
      deletedAt: null,
      OR: query.search
        ? [
            {
              name: {
                contains: query.search,
                mode: 'insensitive' as const,
              },
            },
            {
              legalName: {
                contains: query.search,
                mode: 'insensitive' as const,
              },
            },
            {
              taxId: {
                contains: query.search,
                mode: 'insensitive' as const,
              },
            },
            {
              city: {
                contains: query.search,
                mode: 'insensitive' as const,
              },
            },
            {
              email: {
                contains: query.search,
                mode: 'insensitive' as const,
              },
            },
          ]
        : undefined,
    };

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

  async create(createCompanyDto: CreateCompanyDto) {
    let coords = null;
    if (createCompanyDto.address || createCompanyDto.city) {
      coords = await this.geocodeAddress(createCompanyDto.address, createCompanyDto.city, createCompanyDto.country);
    }

    const data = { ...createCompanyDto } as any;
    if (coords) {
      data.latitude = coords.latitude;
      data.longitude = coords.longitude;
    }

    return this.prisma.company.create({
      data,
      include: {
        businessUnit: true,
      },
    });
  }

  async update(id: string, updateCompanyDto: UpdateCompanyDto) {
    let coords = null;
    if (updateCompanyDto.address || updateCompanyDto.city) {
      coords = await this.geocodeAddress(updateCompanyDto.address, updateCompanyDto.city, updateCompanyDto.country);
    }

    const data = { ...updateCompanyDto } as any;
    if (coords) {
      data.latitude = coords.latitude;
      data.longitude = coords.longitude;
    }

    return this.prisma.company.update({
      where: { id },
      data,
      include: {
        businessUnit: true,
      },
    });
  }

  async remove(id: string) {
    await this.prisma.company.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        status: CompanyStatus.ARCHIVED,
      },
    });

    return { success: true };
  }

  async exportToExcel(query: CompanyQueryDto) {
    const where = {
      status: query.status || undefined,
      businessUnitId: query.businessUnitId || undefined,
      deletedAt: null,
      OR: query.search
        ? [
            { name: { contains: query.search, mode: 'insensitive' as const } },
            { legalName: { contains: query.search, mode: 'insensitive' as const } },
            { taxId: { contains: query.search, mode: 'insensitive' as const } },
          ]
        : undefined,
    };

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
      { header: 'Razón Social', key: 'legalName', width: 30 },
      { header: 'NIT/RUT', key: 'taxId', width: 15 },
      { header: 'Tipo', key: 'customerType', width: 15 },
      { header: 'Estado', key: 'status', width: 15 },
      { header: 'Unidad de Negocio', key: 'businessUnit', width: 20 },
      { header: 'Ciudad', key: 'city', width: 15 },
      { header: 'Teléfono', key: 'phone', width: 20 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Contactos', key: 'contactsCount', width: 10 },
      { header: 'Oportunidades', key: 'opportunitiesCount', width: 15 },
    ];

    // Estilo para la cabecera
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0F6C8D' }, // Color primario de RespiraCRM
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

    const buffer = await workbook.xlsx.writeBuffer();
    const nodeBuffer = Buffer.from(buffer as ArrayBuffer);
    return new StreamableFile(nodeBuffer);
  }
}
