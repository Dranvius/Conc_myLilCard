import { Injectable, NotFoundException } from '@nestjs/common';
import { NotificationType, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service.js';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string, limit = 20) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async getUnreadCount(userId: string) {
    return this.prisma.notification.count({
      where: { userId, isRead: false },
    });
  }

  async markAsRead(id: string, userId: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id },
    });

    if (!notification || notification.userId !== userId) {
      throw new NotFoundException('Notificación no encontrada');
    }

    return this.prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });
  }

  async markAllAsRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }

  async delete(id: string, userId: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id },
    });

    if (!notification || notification.userId !== userId) {
      throw new NotFoundException('Notificación no encontrada');
    }

    return this.prisma.notification.delete({
      where: { id },
    });
  }

  async create(data: {
    userId: string;
    title: string;
    message: string;
    type?: NotificationType;
    referenceType?: string;
    referenceId?: string;
    dedupeKey?: string;
  }) {
    if (data.dedupeKey) {
      const existing = await this.prisma.notification.findUnique({
        where: { dedupeKey: data.dedupeKey },
      });

      if (existing) {
        return existing;
      }
    }

    try {
      return await this.prisma.notification.create({
        data: {
          userId: data.userId,
          title: data.title,
          message: data.message,
          type: data.type ?? NotificationType.GENERAL,
          referenceType: data.referenceType,
          referenceId: data.referenceId,
          dedupeKey: data.dedupeKey,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002' &&
        data.dedupeKey
      ) {
        return this.prisma.notification.findUniqueOrThrow({
          where: { dedupeKey: data.dedupeKey },
        });
      }

      throw error;
    }
  }
}
