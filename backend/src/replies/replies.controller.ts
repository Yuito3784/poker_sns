import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { RepliesService } from './replies.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Public } from '../auth/public.decorator';
import { GetUser } from '../auth/get-user.decorator';
import { CreateReplyDto } from './dto/create-reply.dto';

@Controller('posts/:postId/replies')
@UseGuards(JwtAuthGuard)
export class RepliesController {
  constructor(private readonly repliesService: RepliesService) {}

  @Post()
  @Throttle({ default: { ttl: 60000, limit: 15 } })
  create(
    @GetUser() user: { userId: string },
    @Param('postId') postId: string,
    @Body() dto: CreateReplyDto,
  ) {
    return this.repliesService.create(user.userId, postId, dto);
  }

  @Get()
  @Public()
  getReplies(
    @Param('postId') postId: string,
    @Query('take') take?: string,
    @Query('skip') skip?: string,
  ) {
    const t = Math.min(parseInt(take || '100', 10) || 100, 200);
    const s = parseInt(skip || '0', 10) || 0;
    return this.repliesService.getByPostId(postId, t, s);
  }
}


