import { Body, Controller, Post, Get, Param } from '@nestjs/common';
import { EmailSequencesService } from './email-sequences.service';
import { PrismaService } from '../../prisma/prisma.service';

@Controller('email-sequences')
export class EmailSequencesController {
  constructor(
    private readonly service: EmailSequencesService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('templates')
  async createTemplate(@Body() data: any) {
    return this.prisma.emailTemplate.create({ data });
  }

  @Post('sequences')
  async createSequence(@Body() data: any) {
    const { steps, ...sequenceData } = data;
    return this.prisma.emailSequence.create({
      data: {
        ...sequenceData,
        steps: {
          create: steps,
        },
      },
    });
  }

  @Post('enroll')
  async enroll(@Body() data: { contactId: string; sequenceId: string; opportunityId?: string }) {
    return this.service.enrollContact(data);
  }

  @Get('enrolments/:contactId')
  async getEnrolments(@Param('contactId') contactId: string) {
    return this.prisma.emailSequenceEnrolment.findMany({
      where: { contactId },
      include: { sequence: true, steps: true },
    });
  }
}
