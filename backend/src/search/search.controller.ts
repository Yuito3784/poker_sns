import { Controller, Get, Header, Query, UseGuards } from '@nestjs/common';
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
  @Header('Cache-Control', 'no-store, no-cache, must-revalidate')
  searchUsers(
    @GetUser() user: { userId: string },
    @Query('q') query: string,
  ) {
    if (!query || query.trim().length < 2) {
      return [];
    }
    const userId = user?.userId;
    if (!userId || typeof userId !== 'string') {
      return [];
    }
    return this.searchService.searchUsers(query.trim(), userId);
  }

  @Get('following-status')
  @Throttle({ default: { ttl: 60000, limit: 30 } })
  @Header('Cache-Control', 'no-store')
  getFollowingStatus(
    @GetUser() user: { userId: string },
    @Query('ids') ids: string,
  ) {
    const idList = typeof ids === 'string' ? ids.split(',').map((id) => id.trim()).filter(Boolean).slice(0, 50) : [];
    const userId = user?.userId;
    if (!userId) return {};
    return this.searchService.getFollowingStatusBatch(userId, idList);
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


