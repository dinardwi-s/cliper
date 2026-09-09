import { Injectable } from '@nestjs/common';
import { CacheService } from '../cache/cache.service';

@Injectable()
export class MonitorService {
  constructor(private readonly cache: CacheService) {}

  async summary(): Promise<Record<string, unknown>> {
    const cacheOk = await this.pingCache();
    return { timestamp: new Date().toISOString(), cache: { status: cacheOk ? 'ok' : 'error' } };
  }

  private async pingCache(): Promise<boolean> {
    try {
      await this.cache.set('monitor:ping', '1', 5);
      await this.cache.get('monitor:ping');
      return true;
    } catch {
      return false;
    }
  }
}
