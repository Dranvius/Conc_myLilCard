import {
  Body,
  Controller,
  Delete,
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
import { CompaniesService } from './companies.service';
import { CompanyQueryDto } from './dto/company-query.dto';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';

@ApiTags('Companies')
@ApiCookieAuth('access_token')
@Controller('companies')
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Get()
  @Permissions('companies.read')
  @ApiOperation({ summary: 'Listar empresas con filtros y busqueda' })
  findMany(@Query() query: CompanyQueryDto) {
    return this.companiesService.findMany(query);
  }

  @Get('export/excel')
  @Permissions('companies.read')
  @ApiOperation({ summary: 'Exportar listado de empresas a Excel' })
  @Header(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  )
  @Header('Content-Disposition', 'attachment; filename="empresas.xlsx"')
  exportToExcel(
    @Query() query: CompanyQueryDto,
    @CurrentUser() currentUser: AuthUser,
    @Ip() ipAddress: string,
  ) {
    return this.companiesService.exportToExcel(
      query,
      currentUser.sub,
      ipAddress,
    );
  }

  @Get(':id')
  @Permissions('companies.read')
  @ApiOperation({ summary: 'Obtener empresa por id' })
  findOne(@Param('id') id: string) {
    return this.companiesService.findOne(id);
  }

  @Post()
  @Permissions('companies.write')
  @ApiOperation({ summary: 'Crear empresa' })
  create(
    @Body() createCompanyDto: CreateCompanyDto,
    @CurrentUser() currentUser: AuthUser,
    @Ip() ipAddress: string,
  ) {
    return this.companiesService.create(
      createCompanyDto,
      currentUser.sub,
      ipAddress,
    );
  }

  @Patch(':id')
  @Permissions('companies.write')
  @ApiOperation({ summary: 'Actualizar empresa' })
  update(
    @Param('id') id: string,
    @Body() updateCompanyDto: UpdateCompanyDto,
    @CurrentUser() currentUser: AuthUser,
    @Ip() ipAddress: string,
  ) {
    return this.companiesService.update(
      id,
      updateCompanyDto,
      currentUser.sub,
      ipAddress,
    );
  }

  @Delete(':id')
  @Permissions('companies.write')
  @ApiOperation({ summary: 'Eliminar empresa de forma logica' })
  remove(
    @Param('id') id: string,
    @CurrentUser() currentUser: AuthUser,
    @Ip() ipAddress: string,
  ) {
    return this.companiesService.remove(id, currentUser.sub, ipAddress);
  }
}
