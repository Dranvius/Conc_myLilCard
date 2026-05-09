import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CreateReviewDto } from './dto/create-review.dto';
import { ReviewQueryDto } from './dto/review-query.dto';
import { ReviewsService } from './reviews.service';

@ApiTags('Reviews')
@ApiCookieAuth('access_token')
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get()
  @Permissions('reviews.read')
  @ApiOperation({ summary: 'Listar reseñas' })
  findMany(@Query() query: ReviewQueryDto) {
    return this.reviewsService.findMany(query);
  }

  @Post()
  @Permissions('reviews.write')
  @ApiOperation({ summary: 'Crear reseña' })
  create(@Body() createReviewDto: CreateReviewDto) {
    return this.reviewsService.create(createReviewDto);
  }
}
