import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { Request, Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exception');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    const status = exception instanceof HttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const responseBody = exception instanceof HttpException
      ? exception.getResponse()
      : { message: 'Internal server error' };

    const error = typeof responseBody === 'string'
      ? { message: responseBody }
      : (responseBody as Record<string, unknown>);

    const payload = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: req.url,
      ...error,
    };

    if (status >= 500) {
      this.logger.error(`${req.method} ${req.url} - ${status}`, exception instanceof Error ? exception.stack : undefined);
    }

    res.status(status).json(payload);
  }
}
