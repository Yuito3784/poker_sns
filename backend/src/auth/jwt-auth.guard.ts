import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from './public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  async canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      // Try to authenticate optionally (populate user if token exists)
      const request = context.switchToHttp().getRequest();
      if (request.headers.authorization) {
        try {
          return (await super.canActivate(context)) as boolean;
        } catch {
          return true;
        }
      }
      return true;
    }
    return super.canActivate(context) as boolean;
  }
}
