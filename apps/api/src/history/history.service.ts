import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../cache/cache.service';

@Injectable()
export class HistoryService {
  constructor(private readonly prisma: PrismaService, private readonly cache: CacheService) {}

  async list(userId: string, page = 1, limit = 20, search?: string) {
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(50, Math.max(1, limit));
    const cacheKey = `history:${userId}:${safePage}:${safeLimit}:${search || 'none'}`;

    const cached = await this.cache.get<any>(cacheKey);
    if (cached) return cached;

    const where = { userId, ...(search?.trim() ? { title: { contains: search.trim(), mode: 'insensitive' as const } } : {}) };
    const [projects, total] = await this.prisma.$transaction([
      this.prisma.project.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (safePage - 1) * safeLimit, take: safeLimit, include: { _count: { select: { clips: true } } } }),
      this.prisma.project.count({ where }),
    ]);
    
    const result = { projects, meta: { page: safePage, limit: safeLimit, total, totalPages: Math.ceil(total / safeLimit) } };
    await this.cache.set(cacheKey, result, 15); // Cache for 15 seconds
    return result;
  }
}
