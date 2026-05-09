import { Controller, Get, Query } from '@nestjs/common';
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

  @Get('pipeline-conversion')
  @ApiOperation({ summary: 'Conversión del pipeline' })
  @Permissions('metrics.read')
  getPipelineConversion() {
    return this.metricsService.getPipelineConversion();
  }

  @Get('sales-by-period')
  @ApiOperation({ summary: 'Ventas por periodo' })
  @Permissions('metrics.read')
  getSalesByPeriod(@Query('year') year?: string) {
    const targetYear = year ? parseInt(year, 10) : new Date().getFullYear();
    return this.metricsService.getSalesByPeriod(targetYear);
  }

  @Get('forecast')
  @ApiOperation({ summary: 'Pronóstico de ventas ponderado' })
  @Permissions('metrics.read')
  getForecast() {
    return this.metricsService.getForecast();
  }

  @Get('sellers')
  @ApiOperation({ summary: 'Productividad por vendedor' })
  @Permissions('metrics.read')
  getSellers() {
    return this.metricsService.getSellers();
  }
}
