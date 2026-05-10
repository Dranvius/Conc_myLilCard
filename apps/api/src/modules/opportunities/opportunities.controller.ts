import {
  Body,
  Controller,
  Get,
  Header,
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
import { CreateOpportunityDto } from './dto/create-opportunity.dto';
import { FollowUpInboxQueryDto } from './dto/follow-up-inbox-query.dto';
import { OpportunityQueryDto } from './dto/opportunity-query.dto';
import { UpdateOpportunityStageDto } from './dto/update-opportunity-stage.dto';
import { UpdateOpportunityDto } from './dto/update-opportunity.dto';
import { OpportunitiesService } from './opportunities.service';

@ApiTags('Opportunities')
@ApiCookieAuth('access_token')
@Controller('opportunities')
export class OpportunitiesController {
  constructor(private readonly opportunitiesService: OpportunitiesService) {}

  @Get()
  @Permissions('opportunities.read')
  @ApiOperation({ summary: 'Listar oportunidades' })
  findMany(@Query() query: OpportunityQueryDto) {
    return this.opportunitiesService.findMany(query);
  }

  @Get('follow-up-inbox')
  @Permissions('opportunities.read')
  @ApiOperation({ summary: 'Bandeja de seguimiento comercial' })
  findFollowUpInbox(
    @Query() query: FollowUpInboxQueryDto,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.opportunitiesService.findFollowUpInbox(query, currentUser);
  }

  @Get('export/excel')
  @Permissions('opportunities.read')
  @ApiOperation({ summary: 'Exportar listado de oportunidades a Excel' })
  @Header(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  )
  @Header('Content-Disposition', 'attachment; filename="oportunidades.xlsx"')
  exportToExcel(
    @Query() query: OpportunityQueryDto,
    @CurrentUser() currentUser: AuthUser,
    @Ip() ipAddress: string,
  ) {
    return this.opportunitiesService.exportToExcel(
      query,
      currentUser.sub,
      ipAddress,
    );
  }

  @Get(':id')
  @Permissions('opportunities.read')
  @ApiOperation({ summary: 'Obtener oportunidad por id' })
  findOne(@Param('id') id: string) {
    return this.opportunitiesService.findOne(id);
  }

  @Post()
  @Permissions('opportunities.write')
  @ApiOperation({ summary: 'Crear oportunidad' })
  create(
    @Body() createOpportunityDto: CreateOpportunityDto,
    @CurrentUser() currentUser: AuthUser,
    @Ip() ipAddress: string,
  ) {
    return this.opportunitiesService.create(
      createOpportunityDto,
      currentUser.sub,
      ipAddress,
    );
  }

  @Patch(':id')
  @Permissions('opportunities.write')
  @ApiOperation({ summary: 'Actualizar oportunidad' })
  update(
    @Param('id') id: string,
    @Body() updateOpportunityDto: UpdateOpportunityDto,
    @CurrentUser() currentUser: AuthUser,
    @Ip() ipAddress: string,
  ) {
    return this.opportunitiesService.update(
      id,
      updateOpportunityDto,
      currentUser.sub,
      ipAddress,
    );
  }

  @Patch(':id/stage')
  @Permissions('opportunities.write')
  @ApiOperation({ summary: 'Cambiar etapa de oportunidad' })
  updateStage(
    @Param('id') id: string,
    @Body() updateOpportunityStageDto: UpdateOpportunityStageDto,
    @CurrentUser() currentUser: AuthUser,
    @Ip() ipAddress: string,
  ) {
    return this.opportunitiesService.updateStage(
      id,
      updateOpportunityStageDto,
      currentUser.sub,
      ipAddress,
    );
  }
}
