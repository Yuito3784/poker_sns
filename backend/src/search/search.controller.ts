import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { SearchService } from './search.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GetUser } from '../auth/get-user.decorator';

@Controller('search')
@UseGuards(JwtAuthGuard)
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get('users')
  @Throttle({ default: { ttl: 60000, limit: 20 } })
  searchUsers(
    @GetUser() user: { userId: string },
    @Query('q') query: string,
  ) {
    if (!query || query.trim().length < 2) {
      return [];
    }
    return this.searchService.searchUsers(query.trim());
  }

  @Get('posts')
  @Throttle({ default: { ttl: 60000, limit: 20 } })
  searchPosts(
    @GetUser() user: { userId: string },
    @Query('q') query: string,
  ) {
    if (!query || query.trim().length < 2) {
      return [];
    }
    return this.searchService.searchPosts(query.trim(), user.userId);
  }
}


