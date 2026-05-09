import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Unexpected error';
    let details: unknown;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const payload = exception.getResponse();

      if (typeof payload === 'string') {
        message = payload;
      } else if (typeof payload === 'object' && payload !== null) {
        const typedPayload = payload as Record<string, unknown>;
        message =
          (typedPayload.message as string | string[]) ?? exception.message;
        details = typedPayload;
      }
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      status = HttpStatus.BAD_REQUEST;
      message = exception.message;
      details = {
        code: exception.code,
        meta: exception.meta,
      };
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    this.logger.error(
      JSON.stringify({
        status,
        method: request.method,
        path: request.url,
        message,
      }),
    );

    response.status(status).json({
      statusCode: status,
      message,
      details: process.env.NODE_ENV === 'production' ? undefined : details,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}
