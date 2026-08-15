import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';

@Controller('clips')
@UseGuards(JwtAuthGuard)
export class SubtitleController {
  constructor(private readonly prisma: PrismaService, private readonly storage: StorageService) {}
  @Get(':id/subtitle')
  async get(@Req() request: Request & { user: AuthenticatedUser }, @Param('id') id: string) {
    const clip = await this.prisma.clip.findFirst({ where: { id, userId: request.user.id } });
    if (!clip || !clip.subtitleKey) return { error: 'Subtitle not ready' };
    return { url: await this.storage.preview(request.user.id, 'subtitles', clip.subtitleKey), expiresIn: 3600 };
  }
}
