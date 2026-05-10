import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DuplicatesModule } from '../duplicates/duplicates.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { EmailSequencesModule } from '../email-sequences/email-sequences.module';
import { GamificationModule } from '../gamification/gamification.module';
import { AssignmentService } from './assignment.service';
import { LeadCaptureService } from './lead-capture.service';
import { LeadScoringService } from './lead-scoring.service';
import { OpportunitiesController } from './opportunities.controller';
import { OpportunitiesService } from './opportunities.service';
import { PublicLeadsController } from './public-leads.controller';

@Module({
  imports: [AuthModule, NotificationsModule, DuplicatesModule, EmailSequencesModule, GamificationModule],
  controllers: [OpportunitiesController, PublicLeadsController],
  providers: [
    OpportunitiesService,
    AssignmentService,
    LeadScoringService,
    LeadCaptureService,
  ],
  exports: [OpportunitiesService, AssignmentService, LeadScoringService],
})
export class OpportunitiesModule {}
