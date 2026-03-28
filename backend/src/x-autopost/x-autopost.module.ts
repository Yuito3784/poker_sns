import { Module } from '@nestjs/common';
import { XAutopostController } from './x-autopost.controller';
import { XAutopostService } from './x-autopost.service';
import { PrismaService } from '../prisma.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [XAutopostController],
  providers: [XAutopostService, PrismaService],
})
export class XAutopostModule {}
