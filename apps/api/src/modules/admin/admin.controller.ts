import { Controller, Get, Query } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { AuditLogQueryDto } from '../audit-logs/dto/audit-log-query.dto';
import { AdminService } from './admin.service';

@ApiTags('Admin')
@ApiCookieAuth('access_token')
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('summary')
  @Permissions('admin.read')
  @ApiOperation({ summary: 'Resumen general del sistema' })
  getSummary() {
    return this.adminService.getSummary();
  }

  @Get('audit-logs')
  @Permissions('admin.read', 'audit-logs.read')
  @ApiOperation({ summary: 'Ver auditoría desde el módulo admin' })
  getAuditLogs(@Query() query: AuditLogQueryDto) {
    return this.adminService.getAuditLogs(query);
  }

  @Get('users-status')
  @Permissions('admin.read')
  @ApiOperation({ summary: 'Estado de usuarios del sistema' })
  getUsersStatus() {
    return this.adminService.getUsersStatus();
  }

  @Get('system-health')
  @Permissions('admin.read')
  @ApiOperation({ summary: 'Estado general de la plataforma' })
  getSystemHealth() {
    return this.adminService.getSystemHealth();
  }
}
