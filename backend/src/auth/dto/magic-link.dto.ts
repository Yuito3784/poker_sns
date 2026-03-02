import { IsEmail } from 'class-validator';

export class MagicLinkDto {
  @IsEmail({}, { message: '有効なメールアドレスを入力してください' })
  email: string;
}
