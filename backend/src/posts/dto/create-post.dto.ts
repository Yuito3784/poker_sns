import { IsNotEmpty, IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

export class CreatePostDto {
  @IsString()
  @IsNotEmpty({ message: '投稿内容を入力してください' })
  @MaxLength(1000, { message: '投稿は1000文字以内で入力してください' })
  content: string;

  @IsString()
  @IsUrl({}, { message: '有効なURLを入力してください' })
  @IsOptional()
  imageUrl?: string;

  @IsString()
  @IsOptional()
  parentPostId?: string; // 引用ポスト用
}
