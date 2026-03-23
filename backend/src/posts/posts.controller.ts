import { BadRequestException, Body, Controller, Delete, ForbiddenException, Get, Header, Param, Post as HttpPost, Query, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { PostsService } from './posts.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { EmailVerifiedGuard } from '../auth/email-verified.guard';
import { Public } from '../auth/public.decorator';
import { GetUser } from '../auth/get-user.decorator';
import { CreatePostDto } from './dto/create-post.dto';
import { CreatePokerHandDto } from './dto/create-poker-hand.dto';
import { postImageUploadConfig, validateFileSignature } from '../common/file-upload.config';

@Controller('posts')
@UseGuards(JwtAuthGuard)
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @HttpPost()
  @UseGuards(EmailVerifiedGuard)
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  create(
    @GetUser() user: { userId: string },
    @Body() dto: CreatePostDto,
  ) {
    return this.postsService.create(user.userId, dto);
  }

  @HttpPost('upload-image')
  @UseGuards(EmailVerifiedGuard)
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @UseInterceptors(FileInterceptor('image', postImageUploadConfig))
  uploadImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('画像ファイルがアップロードされていません。');
    }
    validateFileSignature(file);
    return { imageUrl: `/uploads/posts/${file.filename}` };
  }

  @HttpPost('poker-hand')
  @UseGuards(EmailVerifiedGuard)
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  createPokerHand(
    @GetUser() user: { userId: string },
    @Body() dto: CreatePokerHandDto,
  ) {
    return this.postsService.createPokerHand(user.userId, dto);
  }

  @Get('timeline')
  getTimeline(
    @GetUser() user: { userId: string },
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
    @Query('premiumOnly') premiumOnly?: string,
  ) {
    const take = Math.min(parseInt(limit || '20', 10) || 20, 50);
    return this.postsService.getTimelineForUser(user.userId, cursor, take, premiumOnly === 'true');
  }

  @Get('sitemap-data')
  @Public()
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @Header('Cache-Control', 'public, max-age=3600, s-maxage=3600')
  getSitemapData() {
    return this.postsService.getSitemapData();
  }

  @Get('hashtag/:tag')
  @Public()
  @Throttle({ default: { ttl: 60000, limit: 30 } })
  getByHashtag(
    @GetUser() user: { userId: string } | undefined,
    @Param('tag') tag: string,
    @Query('take') take?: string,
    @Query('skip') skip?: string,
  ) {
    const t = Math.min(parseInt(take || '20', 10) || 20, 50);
    const s = parseInt(skip || '0', 10) || 0;
    return this.postsService.getByHashtag(tag, user?.userId ?? null, t, s);
  }

  @Get('trending')
  getTrending(
    @GetUser() user: { userId: string },
    @Query('period') period?: string,
    @Query('take') take?: string,
    @Query('skip') skip?: string,
  ) {
    const p = period === '7d' ? '7d' : '24h';
    const t = Math.min(parseInt(take || '20', 10) || 20, 50);
    const s = parseInt(skip || '0', 10) || 0;
    return this.postsService.getTrending(user.userId, p, t, s);
  }

  @Get('user/:userId/likes')
  getLikedByUserId(
    @GetUser() user: { userId: string },
    @Param('userId') userId: string,
    @Query('take') take?: string,
    @Query('skip') skip?: string,
  ) {
    const t = Math.min(parseInt(take || '50', 10) || 50, 100);
    const s = parseInt(skip || '0', 10) || 0;
    return this.postsService.getLikedByUserId(userId, user.userId, t, s);
  }

  @Get('user/:userId')
  @Public()
  getByUserId(
    @GetUser() user: { userId: string } | undefined,
    @Param('userId') userId: string,
    @Query('take') take?: string,
    @Query('skip') skip?: string,
    @Query('premiumOnly') premiumOnly?: string,
  ) {
    const t = Math.min(parseInt(take || '50', 10) || 50, 100);
    const s = parseInt(skip || '0', 10) || 0;
    return this.postsService.getByUserId(userId, user?.userId ?? null, t, s, premiumOnly === 'true');
  }

  @Delete(':id')
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  delete(
    @GetUser() user: { userId: string },
    @Param('id') postId: string,
  ) {
    return this.postsService.delete(user.userId, postId);
  }

  @Get(':id/meta')
  @Public()
  @Throttle({ default: { ttl: 60000, limit: 30 } })
  @Header('Cache-Control', 'public, max-age=300, s-maxage=600')
  getPostMeta(@Param('id') id: string) {
    return this.postsService.getPostMeta(id);
  }

  @Get(':id')
  @Public()
  getById(
    @GetUser() user: { userId: string } | undefined,
    @Param('id') id: string,
  ) {
    return this.postsService.getById(id, user?.userId ?? null);
  }

  @HttpPost(':id/repost')
  @Throttle({ default: { ttl: 60000, limit: 30 } })
  toggleRepost(
    @GetUser() user: { userId: string },
    @Param('id') postId: string,
  ) {
    return this.postsService.toggleRepost(user.userId, postId);
  }

  @HttpPost(':id/bookmark')
  @Throttle({ default: { ttl: 60000, limit: 30 } })
  toggleBookmark(
    @GetUser() user: { userId: string },
    @Param('id') postId: string,
  ) {
    return this.postsService.toggleBookmark(user.userId, postId);
  }

  @HttpPost(':id/pin')
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  pinPost(
    @GetUser() user: { userId: string },
    @Param('id') postId: string,
  ) {
    return this.postsService.pinPost(user.userId, postId);
  }

  @HttpPost('unpin')
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  unpinPost(@GetUser() user: { userId: string }) {
    return this.postsService.unpinPost(user.userId);
  }

  @Get('user/:userId/bookmarks')
  getBookmarks(
    @GetUser() user: { userId: string },
    @Param('userId') userId: string,
    @Query('take') take?: string,
    @Query('skip') skip?: string,
  ) {
    if (userId !== user.userId) throw new ForbiddenException('Unauthorized');
    const t = Math.min(parseInt(take || '50', 10) || 50, 100);
    const s = parseInt(skip || '0', 10) || 0;
    return this.postsService.getBookmarksByUserId(userId, user.userId, t, s);
  }

  @HttpPost(':id/like')
  @Throttle({ default: { ttl: 60000, limit: 30 } })
  toggleLike(
    @GetUser() user: { userId: string },
    @Param('id') postId: string,
  ) {
    return this.postsService.toggleLike(user.userId, postId);
  }
}


