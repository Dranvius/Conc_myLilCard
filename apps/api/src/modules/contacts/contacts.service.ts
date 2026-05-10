import { Injectable, Logger, StreamableFile } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { Buffer } from 'buffer';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  buildPaginationMeta,
  resolvePagination,
} from '../../common/utils/pagination';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { DuplicateDetectionService } from '../duplicates/duplicate-detection.service';
import { throwPotentialDuplicate } from '../duplicates/potential-duplicate';
import { ContactQueryDto } from './dto/contact-query.dto';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';

@Injectable()
export class ContactsService {
  private readonly logger = new Logger(ContactsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
    private readonly duplicateDetectionService: DuplicateDetectionService,
  ) {}

  private buildWhere(query: ContactQueryDto): Prisma.ContactWhereInput {
    return {
      companyId: query.companyId || undefined,
      source: query.source || undefined,
      deletedAt: null,
      OR: query.search
        ? [
            {
              firstName: {
                contains: query.search,
                mode: 'insensitive',
              },
            },
            {
              lastName: {
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
            {
              position: {
                contains: query.search,
                mode: 'insensitive',
              },
            },
          ]
        : undefined,
    };
  }

  async findMany(query: ContactQueryDto) {
    const { page, limit, skip } = resolvePagination(query.page, query.limit);
    const where = this.buildWhere(query);

    const [data, total] = await this.prisma.$transaction([
      this.prisma.contact.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          company: {
            select: {
              id: true,
              name: true,
              taxId: true,
            },
          },
        },
      }),
      this.prisma.contact.count({ where }),
    ]);

    return {
      data,
      meta: buildPaginationMeta(page, limit, total),
    };
  }

  async exportToExcel(
    query: ContactQueryDto,
    actorUserId?: string,
    ipAddress?: string,
  ) {
    const where = this.buildWhere(query);
    const contacts = await this.prisma.contact.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        company: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Contactos');

    worksheet.columns = [
      { header: 'Nombres', key: 'firstName', width: 20 },
      { header: 'Apellidos', key: 'lastName', width: 20 },
      { header: 'Empresa', key: 'company', width: 28 },
      { header: 'Cargo', key: 'position', width: 24 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Telefono', key: 'phone', width: 18 },
      { header: 'Origen', key: 'source', width: 18 },
      { header: 'Creado', key: 'createdAt', width: 22 },
    ];

    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0F6C8D' },
    };

    contacts.forEach((contact) => {
      worksheet.addRow({
        firstName: contact.firstName,
        lastName: contact.lastName,
        company: contact.company?.name ?? 'N/A',
        position: contact.position ?? 'N/A',
        email: contact.email ?? 'N/A',
        phone: contact.phone ?? 'N/A',
        source: contact.source ?? 'N/A',
        createdAt: contact.createdAt.toISOString(),
      });
    });

    await this.auditLogsService.create({
      userId: actorUserId,
      action: 'CONTACTS_EXPORTED',
      entity: 'Contact',
      entityId: 'bulk-export',
      metadata: {
        total: contacts.length,
        filters: query,
      },
      ipAddress,
    });

    this.logger.log(
      JSON.stringify({
        event: 'contacts.export.completed',
        total: contacts.length,
      }),
    );

    const buffer = await workbook.xlsx.writeBuffer();
    return new StreamableFile(Buffer.from(buffer));
  }

  findOne(id: string) {
    return this.prisma.contact.findFirstOrThrow({
      where: {
        id,
        deletedAt: null,
      },
      include: {
        company: true,
      },
    });
  }

  async create(
    createContactDto: CreateContactDto,
    actorUserId?: string,
    ipAddress?: string,
  ) {
    const duplicates =
      await this.duplicateDetectionService.findContactDuplicates(
        createContactDto,
      );
    if (duplicates.length && !createContactDto.allowPotentialDuplicate) {
      throwPotentialDuplicate('el contacto', duplicates);
    }

    const contact = await this.prisma.contact.create({
      data: {
        companyId: createContactDto.companyId,
        firstName: createContactDto.firstName,
        lastName: createContactDto.lastName,
        position: createContactDto.position,
        email: createContactDto.email?.toLowerCase(),
        phone: createContactDto.phone,
        notes: createContactDto.notes,
        source: createContactDto.source,
      },
      include: {
        company: true,
      },
    });

    await this.auditLogsService.create({
      userId: actorUserId,
      action: duplicates.length
        ? 'CONTACT_CREATED_DUPLICATE_OVERRIDE'
        : 'CONTACT_CREATED',
      entity: 'Contact',
      entityId: contact.id,
      metadata: {
        companyId: contact.companyId,
        source: contact.source,
        duplicateIds: duplicates.map((item) => item.id),
      },
      ipAddress,
    });

    return contact;
  }

  async update(
    id: string,
    updateContactDto: UpdateContactDto,
    actorUserId?: string,
    ipAddress?: string,
  ) {
    const contact = await this.prisma.contact.update({
      where: { id },
      data: {
        ...updateContactDto,
        email:
          updateContactDto.email !== undefined
            ? updateContactDto.email?.toLowerCase()
            : undefined,
      },
      include: {
        company: true,
      },
    });

    await this.auditLogsService.create({
      userId: actorUserId,
      action: 'CONTACT_UPDATED',
      entity: 'Contact',
      entityId: contact.id,
      metadata: {
        companyId: contact.companyId,
        source: contact.source,
      },
      ipAddress,
    });

    return contact;
  }

  async remove(id: string, actorUserId?: string, ipAddress?: string) {
    await this.prisma.contact.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    });

    await this.auditLogsService.create({
      userId: actorUserId,
      action: 'CONTACT_ARCHIVED',
      entity: 'Contact',
      entityId: id,
      ipAddress,
    });

    return { success: true };
  }
}
