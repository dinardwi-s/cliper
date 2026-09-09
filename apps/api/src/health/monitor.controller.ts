import { Controller, Get } from '@nestjs/common';
import { MonitorService } from './monitor.service';

@Controller('health')
export class MonitorController {
  constructor(private readonly monitor: MonitorService) {}
  @Get('monitor')
  monitorHealth() { return this.monitor.summary(); }
}
