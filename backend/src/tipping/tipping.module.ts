import { Module } from '@nestjs/common';
import { TippingController } from './tipping.controller';
import { TippingService } from './tipping.service';
import { PrismaService } from '../prisma.service';

@Module({
  controllers: [TippingController],
  providers: [TippingService, PrismaService],
})
export class TippingModule {}
