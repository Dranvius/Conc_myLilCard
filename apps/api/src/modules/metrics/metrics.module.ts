import { Module } from '@nestjs/common';
import { OpportunitiesModule } from '../opportunities/opportunities.module';
import { MetricsController } from './metrics.controller';
import { MetricsService } from './metrics.service';

@Module({
  imports: [OpportunitiesModule],
  controllers: [MetricsController],
  providers: [MetricsService],
  exports: [MetricsService],
})
export class MetricsModule {}
