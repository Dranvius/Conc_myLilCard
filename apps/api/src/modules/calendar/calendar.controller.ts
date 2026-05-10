import { Controller, Get, Query } from '@nestjs/common';
import { CalendarService } from './calendar.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/interfaces/auth-user.interface';

@Controller('calendar')
export class CalendarController {
  constructor(private readonly calendarService: CalendarService) {}

  @Get('events')
  async getEvents(
    @Query('from') fromStr: string,
    @Query('to') toStr: string,
    @CurrentUser() user: AuthUser,
  ) {
    const from = fromStr ? new Date(fromStr) : new Date(new Date().setMonth(new Date().getMonth() - 1));
    const to = toStr ? new Date(toStr) : new Date(new Date().setMonth(new Date().getMonth() + 2));

    const events = await this.calendarService.getEvents(from, to, user.sub, user.role);
    return { data: events };
  }
}
