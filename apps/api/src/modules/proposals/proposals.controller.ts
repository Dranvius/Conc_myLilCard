import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CreateProposalDto } from './dto/create-proposal.dto';
import { ProposalQueryDto } from './dto/proposal-query.dto';
import { UpdateProposalStatusDto } from './dto/update-proposal-status.dto';
import { UpdateProposalDto } from './dto/update-proposal.dto';
import { ProposalsService } from './proposals.service';

@ApiTags('Proposals')
@ApiCookieAuth('access_token')
@Controller('proposals')
export class ProposalsController {
  constructor(private readonly proposalsService: ProposalsService) {}

  @Get()
  @Permissions('proposals.read')
  @ApiOperation({ summary: 'Listar propuestas' })
  findMany(@Query() query: ProposalQueryDto) {
    return this.proposalsService.findMany(query);
  }

  @Get(':id')
  @Permissions('proposals.read')
  @ApiOperation({ summary: 'Obtener propuesta por id' })
  findOne(@Param('id') id: string) {
    return this.proposalsService.findOne(id);
  }

  @Post()
  @Permissions('proposals.write')
  @ApiOperation({ summary: 'Crear propuesta' })
  create(@Body() createProposalDto: CreateProposalDto) {
    return this.proposalsService.create(createProposalDto);
  }

  @Patch(':id')
  @Permissions('proposals.write')
  @ApiOperation({ summary: 'Actualizar propuesta' })
  update(
    @Param('id') id: string,
    @Body() updateProposalDto: UpdateProposalDto,
  ) {
    return this.proposalsService.update(id, updateProposalDto);
  }

  @Patch(':id/status')
  @Permissions('proposals.write')
  @ApiOperation({ summary: 'Cambiar estado de propuesta' })
  updateStatus(
    @Param('id') id: string,
    @Body() updateProposalStatusDto: UpdateProposalStatusDto,
  ) {
    return this.proposalsService.updateStatus(id, updateProposalStatusDto);
  }
}
