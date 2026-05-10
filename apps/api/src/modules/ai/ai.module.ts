import { Global, Module } from '@nestjs/common';
import { AIService } from './ai.service';
import { AIController } from './ai.controller';
import { OpportunitiesModule } from '../opportunities/opportunities.module';

@Global()
@Module({
  imports: [OpportunitiesModule],
  controllers: [AIController],
  providers: [AIService],
  exports: [AIService],
})
export class AIModule {}
