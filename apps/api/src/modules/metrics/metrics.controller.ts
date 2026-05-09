import { Controller, Get } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { MetricsService } from './metrics.service';

@ApiTags('Metrics')
@ApiCookieAuth('access_token')
@Controller('metrics')
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get('dashboard')
  @Permissions('metrics.read')
  @ApiOperation({ summary: 'Obtener métricas del dashboard' })
  getDashboard() {
    return this.metricsService.getDashboard();
  }
}
