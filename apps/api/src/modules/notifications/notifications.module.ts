import { Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller.js';
import { NotificationsService } from './notifications.service.js';
import { TasksService } from './tasks.service.js';

@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService, TasksService],
  exports: [NotificationsService],
})
export class NotificationsModule { }
