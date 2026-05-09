import bcrypt from 'bcrypt';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  buildPaginationMeta,
  resolvePagination,
} from '../../common/utils/pagination';
import { publicUserSelect } from '../../common/selects/user.select';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserQueryDto } from './dto/user-query.dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async findMany(query: UserQueryDto) {
    const { page, limit, skip } = resolvePagination(query.page, query.limit);

    const where = {
      roleId: query.roleId || undefined,
      businessUnitId: query.businessUnitId || undefined,
      isActive:
        typeof query.isActive === 'boolean' ? query.isActive : undefined,
      OR: query.search
        ? [
            {
              name: {
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
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
        select: publicUserSelect,
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data,
      meta: buildPaginationMeta(page, limit, total),
    };
  }

  findOne(id: string) {
    return this.prisma.user.findUniqueOrThrow({
      where: { id },
      select: publicUserSelect,
    });
  }

  async create(
    createUserDto: CreateUserDto,
    actorUserId?: string,
    ipAddress?: string,
  ) {
    const passwordHash = await bcrypt.hash(createUserDto.password, 12);
    const user = await this.prisma.user.create({
      data: {
        name: createUserDto.name,
        email: createUserDto.email.toLowerCase(),
        passwordHash,
        roleId: createUserDto.roleId,
        businessUnitId: createUserDto.businessUnitId ?? null,
        isActive: createUserDto.isActive ?? true,
      },
      select: publicUserSelect,
    });

    await this.auditLogsService.create({
      userId: actorUserId,
      action: 'USER_CREATED',
      entity: 'User',
      entityId: user.id,
      metadata: {
        email: user.email,
        roleId: user.roleId,
      },
      ipAddress,
    });

    return user;
  }

  async update(
    id: string,
    updateUserDto: UpdateUserDto,
    actorUserId?: string,
    ipAddress?: string,
  ) {
    const existingUser = await this.prisma.user.findUniqueOrThrow({
      where: { id },
      select: {
        id: true,
        roleId: true,
      },
    });

    const updateData: {
      name?: string;
      email?: string;
      passwordHash?: string;
      roleId?: string;
      businessUnitId?: string | null;
      isActive?: boolean;
    } = {};

    if (updateUserDto.name !== undefined) updateData.name = updateUserDto.name;
    if (updateUserDto.email !== undefined)
      updateData.email = updateUserDto.email.toLowerCase();
    if (updateUserDto.password)
      updateData.passwordHash = await bcrypt.hash(updateUserDto.password, 12);
    if (updateUserDto.roleId !== undefined)
      updateData.roleId = updateUserDto.roleId;
    if (updateUserDto.businessUnitId !== undefined)
      updateData.businessUnitId = updateUserDto.businessUnitId || null;
    if (typeof updateUserDto.isActive === 'boolean')
      updateData.isActive = updateUserDto.isActive;

    const user = await this.prisma.user.update({
      where: { id },
      data: updateData,
      select: publicUserSelect,
    });

    if (updateUserDto.roleId && updateUserDto.roleId !== existingUser.roleId) {
      await this.auditLogsService.create({
        userId: actorUserId,
        action: 'ROLE_CHANGED',
        entity: 'User',
        entityId: id,
        metadata: {
          previousRoleId: existingUser.roleId,
          nextRoleId: updateUserDto.roleId,
        },
        ipAddress,
      });
    }

    return user;
  }

  updateStatus(id: string, updateUserStatusDto: UpdateUserStatusDto) {
    return this.prisma.user.update({
      where: { id },
      data: {
        isActive: updateUserStatusDto.isActive,
      },
      select: publicUserSelect,
    });
  }
}
