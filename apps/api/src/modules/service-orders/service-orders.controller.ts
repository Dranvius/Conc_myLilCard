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
import { AssignServiceOrderDto } from './dto/assign-service-order.dto';
import { CreateServiceOrderDto } from './dto/create-service-order.dto';
import { ServiceOrderQueryDto } from './dto/service-order-query.dto';
import { UpdateServiceOrderStatusDto } from './dto/update-service-order-status.dto';
import { UpdateServiceOrderDto } from './dto/update-service-order.dto';
import { ServiceOrdersService } from './service-orders.service';

@ApiTags('Service Orders')
@ApiCookieAuth('access_token')
@Controller('service-orders')
export class ServiceOrdersController {
  constructor(private readonly serviceOrdersService: ServiceOrdersService) {}

  @Get()
  @Permissions('service-orders.read')
  @ApiOperation({ summary: 'Listar órdenes de servicio' })
  findMany(@Query() query: ServiceOrderQueryDto) {
    return this.serviceOrdersService.findMany(query);
  }

  @Get(':id')
  @Permissions('service-orders.read')
  @ApiOperation({ summary: 'Obtener orden de servicio por id' })
  findOne(@Param('id') id: string) {
    return this.serviceOrdersService.findOne(id);
  }

  @Post()
  @Permissions('service-orders.write')
  @ApiOperation({ summary: 'Crear orden de servicio' })
  create(
    @Body() createServiceOrderDto: CreateServiceOrderDto,
    @CurrentUser() currentUser: AuthUser,
    @Ip() ipAddress: string,
  ) {
    return this.serviceOrdersService.create(
      createServiceOrderDto,
      currentUser.sub,
      ipAddress,
    );
  }

  @Patch(':id')
  @Permissions('service-orders.write')
  @ApiOperation({ summary: 'Actualizar orden de servicio' })
  update(
    @Param('id') id: string,
    @Body() updateServiceOrderDto: UpdateServiceOrderDto,
  ) {
    return this.serviceOrdersService.update(id, updateServiceOrderDto);
  }

  @Patch(':id/status')
  @Permissions('service-orders.write')
  @ApiOperation({ summary: 'Actualizar estado de orden de servicio' })
  updateStatus(
    @Param('id') id: string,
    @Body() updateServiceOrderStatusDto: UpdateServiceOrderStatusDto,
  ) {
    return this.serviceOrdersService.updateStatus(
      id,
      updateServiceOrderStatusDto,
    );
  }

  @Patch(':id/assign')
  @Permissions('service-orders.write')
  @ApiOperation({ summary: 'Asignar operador a orden de servicio' })
  assign(
    @Param('id') id: string,
    @Body() assignServiceOrderDto: AssignServiceOrderDto,
  ) {
    return this.serviceOrdersService.assign(id, assignServiceOrderDto);
  }
}
