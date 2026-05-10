import {
  Body,
  Controller,
  Get,
  Ip,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import type { AuthUser } from '../../common/interfaces/auth-user.interface';
import { ActivitiesService } from './activities.service';
import { ActivityFollowUpQueryDto } from './dto/activity-follow-up-query.dto';
import { CompleteActivityDto } from './dto/complete-activity.dto';
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
    @Query('status') status?: string,
  ) {
    return this.activitiesService.findMany({
      companyId,
      opportunityId,
      contactId,
      status,
    });
  }

  @Get('follow-ups')
  @Permissions('opportunities.read')
  @ApiOperation({ summary: 'Listar seguimientos comerciales abiertos' })
  findFollowUps(
    @Query() query: ActivityFollowUpQueryDto,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.activitiesService.findFollowUps(query, currentUser);
  }

  @Post()
  @Permissions('opportunities.write')
  @ApiOperation({ summary: 'Registrar nueva actividad' })
  create(
    @Body() createActivityDto: CreateActivityDto,
    @CurrentUser() currentUser: AuthUser,
    @Ip() ipAddress: string,
  ) {
    return this.activitiesService.create(
      createActivityDto,
      currentUser.sub,
      ipAddress,
    );
  }

  @Patch(':id/complete')
  @Permissions('opportunities.write')
  @ApiOperation({ summary: 'Marcar una actividad como completada' })
  complete(
    @Param('id') id: string,
    @Body() completeActivityDto: CompleteActivityDto,
    @CurrentUser() currentUser: AuthUser,
    @Ip() ipAddress: string,
  ) {
    return this.activitiesService.complete(
      id,
      currentUser.sub,
      completeActivityDto,
      ipAddress,
    );
  }
}
