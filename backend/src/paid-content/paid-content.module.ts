import { Module } from '@nestjs/common';
import { PaidContentController } from './paid-content.controller';
import { PaidContentService } from './paid-content.service';
import { PrismaService } from '../prisma.service';

@Module({
  controllers: [PaidContentController],
  providers: [PaidContentService, PrismaService],
})
export class PaidContentModule {}
