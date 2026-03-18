import { IsBoolean, IsNotEmpty, IsOptional, IsString, Matches, MaxLength, ValidateIf } from 'class-validator';

export class CreatePostDto {
  @IsString()
  // 画像が無い場合だけ本文必須（画像だけ投稿を許可）
  @ValidateIf((o) => !o.imageUrl)
  @IsNotEmpty({ message: '投稿内容を入力してください' })
  @MaxLength(1000, { message: '投稿は1000文字以内で入力してください' })
  content: string;

  @IsString()
  @IsOptional()
  // 現在フロントは `/uploads/posts/<filename>` という相対パスを渡すため、URLとして厳密検証しない
  @Matches(/^(https?:\/\/.+|\/uploads\/posts\/.+)$/, {
    message: '有効なURLを入力してください',
  })
  imageUrl?: string;

  @IsString()
  @IsOptional()
  parentPostId?: string; // 引用ポスト用

  @IsBoolean()
  @IsOptional()
  isPremiumOnly?: boolean;
}
