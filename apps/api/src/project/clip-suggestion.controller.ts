import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';

@Controller('projects')
@UseGuards(JwtAuthGuard)
export class ClipSuggestionController {
  constructor(private readonly prisma: PrismaService) {}
  @Get(':id/clips')
  async list(@Req() request: Request & { user: AuthenticatedUser }, @Param('id') id: string) {
    const project = await this.prisma.project.findFirst({ where: { id, userId: request.user.id }, select: { id: true } });
    if (!project) return { error: 'Project not found' };
    return this.prisma.clip.findMany({ where: { projectId: id, userId: request.user.id }, orderBy: { engagementScore: 'desc' } });
  }
}
