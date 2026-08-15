import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ProjectStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { YoutubeDownloaderService } from '../youtube/youtube-downloader.service';
import { QueueService } from '../queue/queue.service';

@Injectable()
export class ProjectService {
  constructor(private readonly prisma: PrismaService, private readonly youtube: YoutubeDownloaderService, private readonly queues: QueueService) {}

  async create(userId: string, dto: CreateProjectDto) {
    const youtubeVideoId = this.extractVideoId(dto.youtubeUrl);
    const existing = await this.prisma.project.findFirst({ where: { userId, youtubeVideoId } });
    if (existing) return existing;
    const metadata = await this.youtube.validate(dto.youtubeUrl);

    const project = await this.prisma.project.create({
      data: {
        userId,
        youtubeUrl: dto.youtubeUrl,
        youtubeVideoId,
        status: ProjectStatus.pending,
        title: metadata.title,
        durationSeconds: metadata.durationSeconds,
        thumbnailUrl: metadata.thumbnailUrl,
        metadata: { uploader: metadata.uploader, webpageUrl: metadata.webpageUrl },
      },
    });
    await this.queues.enqueueDownload(project.id, userId, dto.youtubeUrl);
    return project;
  }

  async findAll(userId: string) {
    return this.prisma.project.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { clips: true } } },
    });
  }

  async findOne(userId: string, id: string) {
    const project = await this.prisma.project.findFirst({
      where: { id, userId },
      include: { _count: { select: { clips: true } } },
    });
    if (!project) throw new NotFoundException('Project not found');
    return project;
  }

  async rename(userId: string, id: string, title: string) {
    await this.findOne(userId, id);
    return this.prisma.project.update({ where: { id }, data: { title: title.trim() } });
  }

  async remove(userId: string, id: string): Promise<void> {
    await this.findOne(userId, id);
    await this.prisma.project.delete({ where: { id } });
  }

  private extractVideoId(rawUrl: string): string {
    let url: URL;
    try {
      url = new URL(rawUrl);
    } catch {
      throw new BadRequestException('Invalid YouTube URL');
    }

    const hostname = url.hostname.toLowerCase().replace(/^www\./, '');
    if (hostname === 'youtu.be') {
      const id = url.pathname.slice(1);
      if (this.isValidId(id)) return id;
    }
    if (hostname === 'youtube.com' || hostname === 'm.youtube.com') {
      const queryId = url.searchParams.get('v');
      if (queryId && this.isValidId(queryId)) return queryId;
      const parts = url.pathname.split('/').filter(Boolean);
      const candidate = parts[1];
      if ((parts[0] === 'shorts' || parts[0] === 'embed') && candidate && this.isValidId(candidate)) return candidate;
    }
    throw new BadRequestException('Invalid YouTube URL');
  }

  private isValidId(value: string): boolean {
    return /^[A-Za-z0-9_-]{11}$/.test(value);
  }
}
