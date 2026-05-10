import { Controller, Get, Param } from '@nestjs/common';
import { GamificationService } from './gamification.service';

@Controller('gamification')
export class GamificationController {
  constructor(private readonly gamificationService: GamificationService) {}

  @Get('leaderboard')
  async getLeaderboard() {
    return this.gamificationService.getLeaderboard();
  }

  @Get('profile/:userId')
  async getProfile(@Param('userId') userId: string) {
    return this.gamificationService.getUserProfile(userId);
  }
}
