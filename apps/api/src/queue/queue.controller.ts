import { Controller, Get, NotFoundException, Param, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { QueueService } from './queue.service';

@Controller('queue')
@UseGuards(JwtAuthGuard)
export class QueueController {
  constructor(private readonly queues: QueueService, private readonly prisma: PrismaService) {}

  @Get('projects/:id')
  async status(@Req() request: Request & { user: AuthenticatedUser }, @Param('id') id: string) {
    const project = await this.prisma.project.findFirst({ where: { id, userId: request.user.id }, select: { id: true } });
    if (!project) throw new NotFoundException('Project not found');
    return this.queues.getDownloadStatus(id);
  }
}
