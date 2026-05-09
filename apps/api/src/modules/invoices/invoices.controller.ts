import {
  Body,
  Controller,
  Get,
  Ip,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import type { AuthUser } from '../../common/interfaces/auth-user.interface';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { InvoiceQueryDto } from './dto/invoice-query.dto';
import { UpdateInvoiceStatusDto } from './dto/update-invoice-status.dto';
import { InvoicesService } from './invoices.service';

@ApiTags('Invoices')
@ApiCookieAuth('access_token')
@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Get()
  @Permissions('invoices.read')
  @ApiOperation({ summary: 'Listar facturas' })
  findMany(@Query() query: InvoiceQueryDto) {
    return this.invoicesService.findMany(query);
  }

  @Get(':id')
  @Permissions('invoices.read')
  @ApiOperation({ summary: 'Obtener factura por id' })
  findOne(@Param('id') id: string) {
    return this.invoicesService.findOne(id);
  }

  @Post()
  @Permissions('invoices.write')
  @ApiOperation({ summary: 'Crear factura' })
  create(@Body() createInvoiceDto: CreateInvoiceDto) {
    return this.invoicesService.create(createInvoiceDto);
  }

  @Patch(':id/status')
  @Permissions('invoices.write')
  @ApiOperation({ summary: 'Actualizar estado de factura' })
  updateStatus(
    @Param('id') id: string,
    @Body() updateInvoiceStatusDto: UpdateInvoiceStatusDto,
    @CurrentUser() currentUser: AuthUser,
    @Ip() ipAddress: string,
  ) {
    return this.invoicesService.updateStatus(
      id,
      updateInvoiceStatusDto,
      currentUser.sub,
      ipAddress,
    );
  }
}
