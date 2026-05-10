import { Module } from '@nestjs/common';
import { EmailSequencesService } from './email-sequences.service';
import { EmailSequencesController } from './email-sequences.controller';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [MailModule],
  controllers: [EmailSequencesController],
  providers: [EmailSequencesService],
  exports: [EmailSequencesService],
})
export class EmailSequencesModule {}
