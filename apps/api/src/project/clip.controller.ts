import { Controller, Delete, Get, Param, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';

@Controller('clips')
@UseGuards(JwtAuthGuard)
export class ClipController {
  constructor(private readonly prisma: PrismaService, private readonly storage: StorageService) {}
  @Delete(':id')
  async remove(@Req() request: Request & { user: AuthenticatedUser }, @Param('id') id: string) {
    const clip = await this.prisma.clip.findFirst({ where: { id, userId: request.user.id } });
    if (!clip) return { error: 'Clip not found' };
    await Promise.all([
      clip.videoKey ? this.storage.delete(request.user.id, 'clips', clip.videoKey) : Promise.resolve(),
      clip.subtitleKey ? this.storage.delete(request.user.id, 'subtitles', clip.subtitleKey) : Promise.resolve(),
      clip.thumbnailKey ? this.storage.delete(request.user.id, 'thumbnails', clip.thumbnailKey) : Promise.resolve(),
    ]);
    await this.prisma.clip.delete({ where: { id } });
    return { deleted: true };
  }

  @Get(':id/download')
  async download(@Req() request: Request & { user: AuthenticatedUser }, @Param('id') id: string) {
    const clip = await this.prisma.clip.findFirst({ where: { id, userId: request.user.id } });
    if (!clip || !clip.videoKey) return { error: 'Clip not ready' };
    return { url: await this.storage.previewUrl(request.user.id, 'clips', clip.videoKey), expiresIn: 3600, filename: `${clip.id}.mp4` };
  }

  @Get(':id/preview')
  async preview(@Req() request: Request & { user: AuthenticatedUser }, @Param('id') id: string) {
    const clip = await this.prisma.clip.findFirst({ where: { id, userId: request.user.id } });
    if (!clip || !clip.videoKey) return { error: 'Clip not ready' };
    return { url: await this.storage.previewUrl(request.user.id, 'clips', clip.videoKey), expiresIn: 3600 };
  }
}
