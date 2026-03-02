import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class CompleteXRegistrationDto {
  @IsString()
  @IsNotEmpty({ message: 'Xトークンが必要です' })
  xToken: string;

  @IsEmail({}, { message: '有効なメールアドレスを入力してください' })
  email: string;
}
