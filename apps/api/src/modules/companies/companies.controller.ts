import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Header,
} from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Permissions } from '../../common/decorators/permissions.decorator';
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
  @ApiOperation({ summary: 'Listar empresas con filtros y búsqueda' })
  findMany(@Query() query: CompanyQueryDto) {
    return this.companiesService.findMany(query);
  }

  @Get('export/excel')
  @Permissions('companies.read')
  @ApiOperation({ summary: 'Exportar listado de empresas a Excel' })
  @Header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  @Header('Content-Disposition', 'attachment; filename="empresas.xlsx"')
  exportToExcel(@Query() query: CompanyQueryDto) {
    return this.companiesService.exportToExcel(query);
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
  create(@Body() createCompanyDto: CreateCompanyDto) {
    return this.companiesService.create(createCompanyDto);
  }

  @Patch(':id')
  @Permissions('companies.write')
  @ApiOperation({ summary: 'Actualizar empresa' })
  update(@Param('id') id: string, @Body() updateCompanyDto: UpdateCompanyDto) {
    return this.companiesService.update(id, updateCompanyDto);
  }

  @Delete(':id')
  @Permissions('companies.write')
  @ApiOperation({ summary: 'Eliminar empresa de forma lógica' })
  remove(@Param('id') id: string) {
    return this.companiesService.remove(id);
  }
}
