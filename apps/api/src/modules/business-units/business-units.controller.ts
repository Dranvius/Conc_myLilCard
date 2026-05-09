import { Controller, Get } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { BusinessUnitsService } from './business-units.service';

@ApiTags('Business Units')
@ApiCookieAuth('access_token')
@Controller('business-units')
export class BusinessUnitsController {
  constructor(private readonly businessUnitsService: BusinessUnitsService) {}

  @Get()
  @Permissions('business-units.read')
  @ApiOperation({ summary: 'Listar unidades de negocio activas' })
  findMany() {
    return this.businessUnitsService.findMany();
  }
}
