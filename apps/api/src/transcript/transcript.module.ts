import { Module } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TranscriptController } from './transcript.controller';

@Module({ controllers: [TranscriptController], providers: [JwtAuthGuard] })
export class TranscriptModule {}
