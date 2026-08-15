import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';

@Controller('health')
export class HealthController {
  @Get()
  getHealth() {
    return { status: 'ok', service: 'api', timestamp: new Date().toISOString() };
  }

  @Get('protected')
  @UseGuards(JwtAuthGuard)
  getProtected(@Req() request: Request & { user: AuthenticatedUser }) {
    return { authenticated: true, user: request.user };
  }
}
