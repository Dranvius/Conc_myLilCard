import {
  Body,
  Controller,
  Get,
  Header,
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
import { CreateSaleDto } from './dto/create-sale.dto';
import { SaleQueryDto } from './dto/sale-query.dto';
import { UpdateSaleStatusDto } from './dto/update-sale-status.dto';
import { SalesService } from './sales.service';

@ApiTags('Sales')
@ApiCookieAuth('access_token')
@Controller('sales')
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Get()
  @Permissions('sales.read')
  @ApiOperation({ summary: 'Listar ventas' })
  findMany(@Query() query: SaleQueryDto) {
    return this.salesService.findMany(query);
  }

  @Get('export/excel')
  @Permissions('sales.read')
  @ApiOperation({ summary: 'Exportar listado de ventas a Excel' })
  @Header(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  )
  @Header('Content-Disposition', 'attachment; filename="ventas.xlsx"')
  exportToExcel(@Query() query: SaleQueryDto) {
    return this.salesService.exportToExcel(query);
  }

  @Get(':id')
  @Permissions('sales.read')
  @ApiOperation({ summary: 'Obtener venta por id' })
  findOne(@Param('id') id: string) {
    return this.salesService.findOne(id);
  }

  @Post()
  @Permissions('sales.write')
  @ApiOperation({ summary: 'Registrar venta' })
  create(
    @Body() createSaleDto: CreateSaleDto,
    @CurrentUser() currentUser: AuthUser,
    @Ip() ipAddress: string,
  ) {
    return this.salesService.create(createSaleDto, currentUser.sub, ipAddress);
  }

  @Patch(':id/status')
  @Permissions('sales.write')
  @ApiOperation({ summary: 'Actualizar estado de venta' })
  updateStatus(
    @Param('id') id: string,
    @Body() updateSaleStatusDto: UpdateSaleStatusDto,
  ) {
    return this.salesService.updateStatus(id, updateSaleStatusDto);
  }
}
