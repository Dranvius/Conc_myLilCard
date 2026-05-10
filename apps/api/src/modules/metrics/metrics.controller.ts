import { Controller, Get, Query } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { ActivityFeedQueryDto } from './dto/activity-feed-query.dto';
import { AdvancedForecastQueryDto } from './dto/advanced-forecast-query.dto';
import { CommercialSlaQueryDto } from './dto/commercial-sla-query.dto';
import { ForecastAccuracyQueryDto } from './dto/forecast-accuracy-query.dto';
import { LeadSourcePerformanceQueryDto } from './dto/lead-source-performance-query.dto';
import { MetricsService } from './metrics.service';

@ApiTags('Metrics')
@ApiCookieAuth('access_token')
@Controller('metrics')
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get('dashboard')
  @Permissions('metrics.read')
  @ApiOperation({ summary: 'Obtener metricas del dashboard' })
  getDashboard() {
    return this.metricsService.getDashboard();
  }

  @Get('pipeline-conversion')
  @ApiOperation({ summary: 'Conversion del pipeline' })
  @Permissions('metrics.read')
  getPipelineConversion() {
    return this.metricsService.getPipelineConversion();
  }

  @Get('sales-by-period')
  @ApiOperation({ summary: 'Ventas por periodo' })
  @Permissions('metrics.read')
  getSalesByPeriod(@Query('year') year?: string) {
    const targetYear = year ? Number.parseInt(year, 10) : new Date().getFullYear();
    return this.metricsService.getSalesByPeriod(targetYear);
  }

  @Get('forecast')
  @ApiOperation({ summary: 'Pronostico de ventas ponderado' })
  @Permissions('metrics.read')
  getForecast() {
    return this.metricsService.getForecast();
  }

  @Get('forecast-accuracy')
  @ApiOperation({ summary: 'Precision del forecast por vendedor' })
  @Permissions('metrics.read')
  getForecastAccuracy(@Query() query: ForecastAccuracyQueryDto) {
    return this.metricsService.getForecastAccuracy(query);
  }

  @Get('forecast-advanced')
  @ApiOperation({ summary: 'Forecast avanzado por vendedor, etapa y fuente' })
  @Permissions('metrics.read')
  getAdvancedForecast(@Query() query: AdvancedForecastQueryDto) {
    return this.metricsService.getAdvancedForecast(query);
  }

  @Get('commercial-sla')
  @ApiOperation({ summary: 'SLA comercial y seguimiento operativo' })
  @Permissions('metrics.read')
  getCommercialSla(@Query() query: CommercialSlaQueryDto) {
    return this.metricsService.getCommercialSla(query);
  }

  @Get('lead-source-performance')
  @ApiOperation({ summary: 'Conversion y rendimiento por origen del lead' })
  @Permissions('metrics.read')
  getLeadSourcePerformance(@Query() query: LeadSourcePerformanceQueryDto) {
    return this.metricsService.getLeadSourcePerformance(query);
  }

  @Get('activity-feed')
  @ApiOperation({ summary: 'Feed comercial consolidado' })
  @Permissions('metrics.read')
  getActivityFeed(@Query() query: ActivityFeedQueryDto) {
    return this.metricsService.getActivityFeed(query);
  }

  @Get('sellers')
  @ApiOperation({ summary: 'Productividad por vendedor' })
  @Permissions('metrics.read')
  getSellers() {
    return this.metricsService.getSellers();
  }
}
