import { Controller, Get, Patch, Delete, Param, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { NotificationsService } from './notifications.service.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { AuthUser } from '../../common/interfaces/auth-user.interface.js';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  async findAll(@CurrentUser() user: AuthUser) {
    return this.notificationsService.findAll(user.sub);
  }

  @Get('unread-count')
  async getUnreadCount(@CurrentUser() user: AuthUser) {
    const count = await this.notificationsService.getUnreadCount(user.sub);
    return { count };
  }

  @Patch('read-all')
  async markAllAsRead(@CurrentUser() user: AuthUser) {
    return this.notificationsService.markAllAsRead(user.sub);
  }

  @Patch(':id/read')
  async markAsRead(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.notificationsService.markAsRead(id, user.sub);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.notificationsService.delete(id, user.sub);
  }

  @Get('stream')
  stream(@Req() req: Request & { user: AuthUser }, @Res() res: Response) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const userId = req.user?.sub;

    this.notificationsService.getUnreadCount(userId).then((count) => {
      res.write(`data: ${JSON.stringify({ unread: count })}\n\n`);
    });

    const interval = setInterval(async () => {
      try {
        const count = await this.notificationsService.getUnreadCount(userId);
        res.write(`data: ${JSON.stringify({ unread: count })}\n\n`);
      } catch {
        // Ignorar
      }
    }, 15000);

    req.on('close', () => {
      clearInterval(interval);
      res.end();
    });
  }
}
