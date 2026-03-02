import { IsEmail, IsNotEmpty, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @IsEmail({}, { message: '有効なメールアドレスを入力してください' })
  email: string;

  @IsString()
  @MinLength(8, { message: 'パスワードは8文字以上で入力してください' })
  @MaxLength(100)
  password: string;

  @IsString()
  @IsNotEmpty({ message: '名前を入力してください' })
  @MaxLength(50)
  name: string;

  @IsString()
  @IsNotEmpty({ message: 'ユーザー名を入力してください' })
  @MinLength(3, { message: 'ユーザー名は3文字以上で入力してください' })
  @MaxLength(30)
  @Matches(/^[a-zA-Z0-9_]+$/, { message: 'ユーザー名は英数字とアンダースコアのみ使用できます' })
  username: string;
}
