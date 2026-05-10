import { Body, Controller, Ip, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../../common/decorators/public.decorator';
import { PublicLeadDto } from './dto/public-lead.dto';
import { LeadCaptureService } from './lead-capture.service';

@ApiTags('Public Leads')
@Controller('public/leads')
export class PublicLeadsController {
  constructor(private readonly leadCaptureService: LeadCaptureService) {}

  @Public()
  @Post()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Capturar lead externo desde formulario publico' })
  captureLead(@Body() publicLeadDto: PublicLeadDto, @Ip() ipAddress: string) {
    return this.leadCaptureService.captureLead(publicLeadDto, ipAddress);
  }
}
