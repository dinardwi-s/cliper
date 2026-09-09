import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { MonitorController } from './monitor.controller';
import { MonitorService } from './monitor.service';

@Module({
  controllers: [HealthController, MonitorController],
  providers: [MonitorService],
})
export class HealthModule {}
