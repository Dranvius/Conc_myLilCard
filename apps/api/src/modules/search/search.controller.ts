import { Controller, Get, Query } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SearchService } from './search.service';

@ApiTags('Search')
@ApiCookieAuth('access_token')
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @ApiOperation({ summary: 'Búsqueda global' })
  search(@Query('q') q: string) {
    return this.searchService.globalSearch(q, 5);
  }
}
