import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { BusinessUnitsService } from './business-units.service';

@ApiTags('Public Business Units')
@Controller('public/business-units')
export class PublicBusinessUnitsController {
  constructor(private readonly businessUnitsService: BusinessUnitsService) {}

  @Public()
  @Get()
  @ApiOperation({
    summary: 'Listar unidades de negocio activas para captura publica',
  })
  findMany() {
    return this.businessUnitsService.findMany();
  }
}
