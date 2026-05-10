import {
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Req,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/interfaces/auth-user.interface';
import { NotificationsService } from './notifications.service';

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

    void this.notificationsService.getUnreadCount(userId).then((count) => {
      res.write(`data: ${JSON.stringify({ unread: count })}\n\n`);
    });

    const interval = setInterval(() => {
      void this.notificationsService
        .getUnreadCount(userId)
        .then((count) => {
          res.write(`data: ${JSON.stringify({ unread: count })}\n\n`);
        })
        .catch(() => {
          // Keep the stream alive even if one poll fails.
        });
    }, 15000);

    req.on('close', () => {
      clearInterval(interval);
      res.end();
    });
  }
}
