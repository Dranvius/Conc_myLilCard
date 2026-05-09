import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Permissions } from '../../common/decorators/permissions.decorator';
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

  @Get(':id')
  @Permissions('contacts.read')
  @ApiOperation({ summary: 'Obtener contacto por id' })
  findOne(@Param('id') id: string) {
    return this.contactsService.findOne(id);
  }

  @Post()
  @Permissions('contacts.write')
  @ApiOperation({ summary: 'Crear contacto' })
  create(@Body() createContactDto: CreateContactDto) {
    return this.contactsService.create(createContactDto);
  }

  @Patch(':id')
  @Permissions('contacts.write')
  @ApiOperation({ summary: 'Actualizar contacto' })
  update(@Param('id') id: string, @Body() updateContactDto: UpdateContactDto) {
    return this.contactsService.update(id, updateContactDto);
  }

  @Delete(':id')
  @Permissions('contacts.write')
  @ApiOperation({ summary: 'Eliminar contacto de forma lógica' })
  remove(@Param('id') id: string) {
    return this.contactsService.remove(id);
  }
}
