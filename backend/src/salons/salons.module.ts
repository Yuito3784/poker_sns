import { Module } from '@nestjs/common';
import { SalonsController } from './salons.controller';
import { SalonsService } from './salons.service';
import { PrismaService } from '../prisma.service';

@Module({
  controllers: [SalonsController],
  providers: [SalonsService, PrismaService],
})
export class SalonsModule {}
