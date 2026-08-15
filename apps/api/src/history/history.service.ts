import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class HistoryService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string, page = 1, limit = 20, search?: string) {
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(50, Math.max(1, limit));
    const where = { userId, ...(search?.trim() ? { title: { contains: search.trim(), mode: 'insensitive' as const } } : {}) };
    const [projects, total] = await this.prisma.$transaction([
      this.prisma.project.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (safePage - 1) * safeLimit, take: safeLimit, include: { _count: { select: { clips: true } } } }),
      this.prisma.project.count({ where }),
    ]);
    return { projects, meta: { page: safePage, limit: safeLimit, total, totalPages: Math.ceil(total / safeLimit) } };
  }
}
