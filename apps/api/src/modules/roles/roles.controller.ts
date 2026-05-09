import { Controller, Get, Param } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { RolesService } from './roles.service';

@ApiTags('Roles')
@ApiCookieAuth('access_token')
@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @Permissions('roles.manage')
  @ApiOperation({ summary: 'Listar roles con permisos' })
  findMany() {
    return this.rolesService.findMany();
  }

  @Get(':id')
  @Permissions('roles.manage')
  @ApiOperation({ summary: 'Obtener un rol por id' })
  findOne(@Param('id') id: string) {
    return this.rolesService.findOne(id);
  }
}
