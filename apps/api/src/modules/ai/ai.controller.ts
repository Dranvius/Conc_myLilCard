import { Controller, Post, Body, Param, Get } from '@nestjs/common';
import { AIService } from './ai.service';
import { OpportunitiesService } from '../opportunities/opportunities.service';

@Controller('ai')
export class AIController {
  constructor(
    private readonly aiService: AIService,
    private readonly opportunitiesService: OpportunitiesService,
  ) {}

  @Get('summarize/:opportunityId')
  async summarize(@Param('opportunityId') opportunityId: string) {
    const opportunity = await this.opportunitiesService.findOne(opportunityId);
    return {
      summary: await this.aiService.summarizeOpportunity(opportunity),
    };
  }

  @Post('chat')
  async chat(@Body('prompt') prompt: string) {
    return {
      response: await this.aiService.generateText(prompt),
    };
  }
}
