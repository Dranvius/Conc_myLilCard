import { Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { TasksService } from './tasks.service';

@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService, TasksService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
