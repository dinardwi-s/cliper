import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { HistoryService } from './history.service';

@Controller('history')
@UseGuards(JwtAuthGuard)
export class HistoryController {
  constructor(private readonly history: HistoryService) {}
  @Get()
  list(@Req() request: Request & { user: AuthenticatedUser }, @Query('page') page?: string, @Query('limit') limit?: string, @Query('search') search?: string) {
    return this.history.list(request.user.id, Number(page ?? 1), Number(limit ?? 20), search);
  }
}
