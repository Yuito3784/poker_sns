import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { WebhookNotifierService } from './webhook-notifier.service';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  constructor(private readonly webhookNotifier: WebhookNotifierService) {}

  async catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status: number;
    let message: string;
    let errorName: string;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      message =
        typeof exceptionResponse === 'string'
          ? exceptionResponse
          : (exceptionResponse as Record<string, unknown>).message
            ? String((exceptionResponse as Record<string, unknown>).message)
            : exception.message;
      errorName = exception.name;
    } else if (exception instanceof Error) {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = exception.message;
      errorName = exception.name;
    } else {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'Unknown error occurred';
      errorName = 'UnknownError';
    }

    // Log all errors
    this.logger.error(
      `${request.method} ${request.url} → ${status} ${errorName}: ${message}`,
    );

    // Send webhook notification for server errors (5xx) only
    if (status >= 500) {
      const stack =
        exception instanceof Error ? exception.stack : undefined;
      // Fire and forget - don't block the response
      this.webhookNotifier
        .notifyError(
          errorName,
          `${request.method} ${request.url} → ${message}`,
          request.url,
          stack,
        )
        .catch(() => {
          /* swallow notification errors */
        });
    }

    response.status(status).json({
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
