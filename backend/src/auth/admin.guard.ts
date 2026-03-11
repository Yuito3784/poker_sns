import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

/**
 * シンプルな管理者権限制御。
 *
 * - 環境変数 ADMIN_USER_IDS にカンマ区切りで userId を指定（例: "uuid1,uuid2"）
 * - リクエストの req.user.userId がそのいずれかに一致する場合のみ許可
 * - それ以外は 403 Forbidden
 */
@Injectable()
export class AdminGuard implements CanActivate {
  private readonly adminIds: Set<string>;

  constructor() {
    const raw = process.env.ADMIN_USER_IDS || '';
    this.adminIds = new Set(
      raw
        .split(',')
        .map((id) => id.trim())
        .filter((id) => id.length > 0),
    );
  }

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<{ user?: { userId?: string } }>();
    const userId = req.user?.userId;

    if (!userId || !this.adminIds.has(userId)) {
      throw new ForbiddenException('管理者のみアクセス可能です');
    }

    return true;
  }
}

