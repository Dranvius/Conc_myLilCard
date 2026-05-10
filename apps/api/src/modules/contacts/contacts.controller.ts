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
import { ContactQueryDto } from './dto/contact-query.dto';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';
import { ContactsService } from './contacts.service';

@ApiTags('Contacts')
@ApiCookieAuth('access_token')
@Controller('contacts')
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  @Get()
  @Permissions('contacts.read')
  @ApiOperation({ summary: 'Listar contactos' })
  findMany(@Query() query: ContactQueryDto) {
    return this.contactsService.findMany(query);
  }

  @Get('export/excel')
  @Permissions('contacts.read')
  @ApiOperation({ summary: 'Exportar listado de contactos a Excel' })
  @Header(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  )
  @Header('Content-Disposition', 'attachment; filename="contactos.xlsx"')
  exportToExcel(
    @Query() query: ContactQueryDto,
    @CurrentUser() currentUser: AuthUser,
    @Ip() ipAddress: string,
  ) {
    return this.contactsService.exportToExcel(query, currentUser.sub, ipAddress);
  }

  @Get(':id')
  @Permissions('contacts.read')
  @ApiOperation({ summary: 'Obtener contacto por id' })
  findOne(@Param('id') id: string) {
    return this.contactsService.findOne(id);
  }

  @Post()
  @Permissions('contacts.write')
  @ApiOperation({ summary: 'Crear contacto' })
  create(
    @Body() createContactDto: CreateContactDto,
    @CurrentUser() currentUser: AuthUser,
    @Ip() ipAddress: string,
  ) {
    return this.contactsService.create(
      createContactDto,
      currentUser.sub,
      ipAddress,
    );
  }

  @Patch(':id')
  @Permissions('contacts.write')
  @ApiOperation({ summary: 'Actualizar contacto' })
  update(
    @Param('id') id: string,
    @Body() updateContactDto: UpdateContactDto,
    @CurrentUser() currentUser: AuthUser,
    @Ip() ipAddress: string,
  ) {
    return this.contactsService.update(
      id,
      updateContactDto,
      currentUser.sub,
      ipAddress,
    );
  }

  @Delete(':id')
  @Permissions('contacts.write')
  @ApiOperation({ summary: 'Eliminar contacto de forma logica' })
  remove(
    @Param('id') id: string,
    @CurrentUser() currentUser: AuthUser,
    @Ip() ipAddress: string,
  ) {
    return this.contactsService.remove(id, currentUser.sub, ipAddress);
  }
}
