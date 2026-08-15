import { Body, Controller, Post, Req, Res, UseGuards } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';

const accessCookie = 'access_token';
const refreshCookie = 'refresh_token';
const cookieOptions = { httpOnly: true, sameSite: 'strict' as const, secure: process.env.NODE_ENV === 'production' };

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) response: Response) {
    const result = await this.auth.register(dto);
    this.setCookies(response, result.tokens.accessToken, result.tokens.refreshToken);
    return { user: result.user };
  }

  @Post('login')
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) response: Response) {
    const result = await this.auth.login(dto);
    this.setCookies(response, result.tokens.accessToken, result.tokens.refreshToken);
    return { user: result.user };
  }

  @Post('refresh')
  async refresh(
    @Body() dto: RefreshTokenDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const token = dto.refreshToken || request.cookies?.[refreshCookie];
    const tokens = await this.auth.refresh(token);
    this.setCookies(response, tokens.accessToken, tokens.refreshToken);
    return { ok: true };
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  async logout(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    await this.auth.logout(request.cookies?.[refreshCookie]);
    response.clearCookie(accessCookie, cookieOptions);
    response.clearCookie(refreshCookie, { ...cookieOptions, path: '/api/auth/refresh' });
    return { ok: true };
  }

  private setCookies(response: Response, accessToken: string, refreshToken: string): void {
    response.cookie(accessCookie, accessToken, { ...cookieOptions, maxAge: 15 * 60 * 1000 });
    response.cookie(refreshCookie, refreshToken, {
      ...cookieOptions,
      path: '/api/auth/refresh',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  }
}
