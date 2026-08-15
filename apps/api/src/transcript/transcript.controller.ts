import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';

@Controller('projects')
@UseGuards(JwtAuthGuard)
export class TranscriptController {
  constructor(private readonly prisma: PrismaService) {}

  @Get(':id/transcript')
  async get(@Req() request: Request & { user: AuthenticatedUser }, @Param('id') id: string) {
    const project = await this.prisma.project.findFirst({ where: { id, userId: request.user.id }, select: { id: true, language: true, status: true } });
    if (!project) return { error: 'Project not found' };
    const segments = await this.prisma.transcriptSegment.findMany({ where: { projectId: id }, orderBy: { segmentIndex: 'asc' } });
    return { projectId: project.id, language: project.language, status: project.status, segments };
  }
}
