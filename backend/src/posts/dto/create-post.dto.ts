import { Transform } from 'class-transformer';
import { IsBoolean, IsNotEmpty, IsOptional, IsString, Matches, MaxLength, ValidateIf } from 'class-validator';

export class CreatePostDto {
  @IsString()
  // 画像が無い場合だけ本文必須（画像だけ投稿を許可）
  @ValidateIf((o) => !o.imageUrl)
  @IsNotEmpty({ message: '投稿内容を入力してください' })
  @MaxLength(1000, { message: '投稿は1000文字以内で入力してください' })
  content: string;

  @Transform(({ value }) => {
    if (value === undefined || value === null) return undefined;
    if (typeof value !== 'string') return value;
    const t = value.trim();
    return t === '' ? undefined : t;
  })
  @IsOptional()
  @IsString()
  // 現在フロントは `/uploads/posts/<filename>` または https の絶対URLを渡す
  @Matches(/^(https?:\/\/.+|\/uploads\/posts\/.+)$/, {
    message:
      '添付画像のパスまたはURLの形式が正しくありません。画像をアップロードし直すか、https:// で始まる画像URLを指定してください。',
  })
  imageUrl?: string;

  @IsString()
  @IsOptional()
  parentPostId?: string; // 引用ポスト用

  @IsBoolean()
  @IsOptional()
  isPremiumOnly?: boolean;
}
