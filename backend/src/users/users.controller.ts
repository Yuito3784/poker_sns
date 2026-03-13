import { BadRequestException, Body, Controller, Delete, Get, Header, Param, Patch, Post, Query, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Public } from '../auth/public.decorator';
import { GetUser } from '../auth/get-user.decorator';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { avatarUploadConfig, validateFileSignature } from '../common/file-upload.config';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /** 検索結果用: 指定ユーザーID一覧に対するフォロー状態を一括取得。:username より前に定義すること */
  @Get('batch-following-status')
  @Throttle({ default: { ttl: 60000, limit: 30 } })
  getFollowingStatus(
    @GetUser() user: { userId: string },
    @Query('ids') ids: string,
  ) {
    const idList = typeof ids === 'string' ? ids.split(',').filter(Boolean).slice(0, 50) : [];
    return this.usersService.getFollowingStatusBatch(user.userId, idList);
  }

  @Get(':username/meta')
  @Public()
  @Throttle({ default: { ttl: 60000, limit: 30 } })
  @Header('Cache-Control', 'public, max-age=300, s-maxage=600')
  getUserMeta(@Param('username') username: string) {
    return this.usersService.getUserMeta(username);
  }

  @Get(':username')
  @Public()
  getProfile(@Param('username') username: string) {
    return this.usersService.getProfile(username);
  }

  @Post(':username/follow')
  @Throttle({ default: { ttl: 60000, limit: 20 } })
  toggleFollow(
    @GetUser() user: { userId: string },
    @Param('username') username: string,
  ) {
    return this.usersService.getProfile(username).then((profile) =>
      this.usersService.toggleFollow(user.userId, profile.id),
    );
  }

  @Get(':username/followers')
  getFollowers(
    @Param('username') username: string,
    @Query('take') take?: string,
    @Query('skip') skip?: string,
  ) {
    const t = Math.min(parseInt(take || '50', 10) || 50, 100);
    const s = parseInt(skip || '0', 10) || 0;
    return this.usersService.getFollowers(username, t, s);
  }

  @Get(':username/following-list')
  getFollowing(
    @Param('username') username: string,
    @Query('take') take?: string,
    @Query('skip') skip?: string,
  ) {
    const t = Math.min(parseInt(take || '50', 10) || 50, 100);
    const s = parseInt(skip || '0', 10) || 0;
    return this.usersService.getFollowing(username, t, s);
  }

  @Get(':username/following')
  checkFollowing(
    @GetUser() user: { userId: string },
    @Param('username') username: string,
  ) {
    return this.usersService.getProfile(username).then((profile) =>
      this.usersService.isFollowing(user.userId, profile.id),
    );
  }

  @Patch('me')
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  updateProfile(
    @GetUser() user: { userId: string },
    @Body() dto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(user.userId, dto);
  }

  @Delete('me')
  @Throttle({ default: { ttl: 60000, limit: 3 } })
  deleteAccount(@GetUser() user: { userId: string }) {
    return this.usersService.deleteAccount(user.userId);
  }

  @Patch('me/avatar')
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @UseInterceptors(FileInterceptor('avatar', avatarUploadConfig))
  updateAvatar(
    @GetUser() user: { userId: string },
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    if (!file) {
      throw new BadRequestException(
        '画像ファイルがアップロードされていません。multipart/form-dataでavatarフィールドに画像を送信してください。',
      );
    }
    validateFileSignature(file);
    const avatarUrl = `/uploads/avatars/${file.filename}`;
    return this.usersService.updateAvatar(user.userId, avatarUrl);
  }

  @Post(':username/block')
  @Throttle({ default: { ttl: 60000, limit: 20 } })
  toggleBlock(
    @GetUser() user: { userId: string },
    @Param('username') username: string,
  ) {
    return this.usersService.getProfile(username).then((profile) =>
      this.usersService.toggleBlock(user.userId, profile.id),
    );
  }

  @Post(':username/mute')
  @Throttle({ default: { ttl: 60000, limit: 20 } })
  toggleMute(
    @GetUser() user: { userId: string },
    @Param('username') username: string,
  ) {
    return this.usersService.getProfile(username).then((profile) =>
      this.usersService.toggleMute(user.userId, profile.id),
    );
  }

  @Get(':username/block-mute-status')
  getBlockMuteStatus(
    @GetUser() user: { userId: string },
    @Param('username') username: string,
  ) {
    return this.usersService.getProfile(username).then((profile) =>
      this.usersService.getBlockMuteStatus(user.userId, profile.id),
    );
  }
}

