import { Module } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { HistoryController } from './history.controller';
import { HistoryService } from './history.service';

@Module({ controllers: [HistoryController], providers: [HistoryService, JwtAuthGuard] })
export class HistoryModule {}
