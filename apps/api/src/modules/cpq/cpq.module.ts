import { Global, Module } from '@nestjs/common';
import { CPQService } from './cpq.service';

@Global()
@Module({
  providers: [CPQService],
  exports: [CPQService],
})
export class CPQModule {}
