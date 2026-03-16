import { IsString, IsOptional, MaxLength, MinLength, Matches } from 'class-validator';

export class UpdateProfileDto {
  @IsString()
  @IsOptional()
  @MaxLength(50)
  name?: string;

  @IsString()
  @IsOptional()
  @MinLength(3, { message: 'ユーザー名は3文字以上にしてください' })
  @MaxLength(20, { message: 'ユーザー名は20文字以内にしてください' })
  @Matches(/^[a-zA-Z0-9_]+$/, {
    message: 'ユーザー名は英数字とアンダースコアのみ使用できます',
  })
  username?: string;

  @IsString()
  @IsOptional()
  @MaxLength(300)
  bio?: string;
}
