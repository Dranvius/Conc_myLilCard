import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import type { AuthUser } from '../../common/interfaces/auth-user.interface';
import { ActivitiesService } from './activities.service';
import { CreateActivityDto } from './dto/create-activity.dto';

@ApiTags('Activities')
@ApiCookieAuth('access_token')
@Controller('activities')
export class ActivitiesController {
  constructor(private readonly activitiesService: ActivitiesService) {}

  @Get()
  @Permissions('opportunities.read')
  @ApiOperation({ summary: 'Listar actividades (filtradas)' })
  findMany(
    @Query('companyId') companyId?: string,
    @Query('opportunityId') opportunityId?: string,
    @Query('contactId') contactId?: string,
  ) {
    return this.activitiesService.findMany({ companyId, opportunityId, contactId });
  }

  @Post()
  @Permissions('opportunities.write')
  @ApiOperation({ summary: 'Registrar nueva actividad' })
  create(
    @Body() createActivityDto: CreateActivityDto,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.activitiesService.create(createActivityDto, currentUser.sub);
  }
}
