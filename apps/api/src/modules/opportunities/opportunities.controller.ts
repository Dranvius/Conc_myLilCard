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
import { CreateOpportunityDto } from './dto/create-opportunity.dto';
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

  @Get(':id')
  @Permissions('opportunities.read')
  @ApiOperation({ summary: 'Obtener oportunidad por id' })
  findOne(@Param('id') id: string) {
    return this.opportunitiesService.findOne(id);
  }

  @Post()
  @Permissions('opportunities.write')
  @ApiOperation({ summary: 'Crear oportunidad' })
  create(@Body() createOpportunityDto: CreateOpportunityDto) {
    return this.opportunitiesService.create(createOpportunityDto);
  }

  @Patch(':id')
  @Permissions('opportunities.write')
  @ApiOperation({ summary: 'Actualizar oportunidad' })
  update(
    @Param('id') id: string,
    @Body() updateOpportunityDto: UpdateOpportunityDto,
  ) {
    return this.opportunitiesService.update(id, updateOpportunityDto);
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
