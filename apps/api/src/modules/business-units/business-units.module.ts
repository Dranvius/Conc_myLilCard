import { Module } from '@nestjs/common';
import { BusinessUnitsController } from './business-units.controller';
import { PublicBusinessUnitsController } from './public-business-units.controller';
import { BusinessUnitsService } from './business-units.service';

@Module({
  controllers: [BusinessUnitsController, PublicBusinessUnitsController],
  providers: [BusinessUnitsService],
  exports: [BusinessUnitsService],
})
export class BusinessUnitsModule {}
