import { Injectable, Logger } from '@nestjs/common';

interface WebhookPayload {
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  timestamp: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class WebhookNotifierService {
  private readonly logger = new Logger(WebhookNotifierService.name);
  private readonly webhookUrl: string | undefined;
  private readonly serviceName: string;

  constructor() {
    this.webhookUrl = process.env.ERROR_WEBHOOK_URL;
    this.serviceName = process.env.SERVICE_NAME || 'poker-sns-backend';
  }

  async notifyError(
    errorName: string,
    errorMessage: string,
    context?: string,
    stack?: string,
  ): Promise<void> {
    const payload: WebhookPayload = {
      title: `[${this.serviceName}] ${errorName}`,
      message: errorMessage,
      severity: 'error',
      timestamp: new Date().toISOString(),
      metadata: {
        context: context || 'unknown',
        stack: stack ? stack.substring(0, 500) : undefined,
        environment: process.env.NODE_ENV || 'development',
      },
    };

    await this.send(payload);
  }

  async notifyCritical(
    title: string,
    message: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    const payload: WebhookPayload = {
      title: `[CRITICAL] [${this.serviceName}] ${title}`,
      message,
      severity: 'critical',
      timestamp: new Date().toISOString(),
      metadata: {
        ...metadata,
        environment: process.env.NODE_ENV || 'development',
      },
    };

    await this.send(payload);
  }

  async notifyInfo(
    title: string,
    message: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    const payload: WebhookPayload = {
      title: `[${this.serviceName}] ${title}`,
      message,
      severity: 'info',
      timestamp: new Date().toISOString(),
      metadata,
    };

    await this.send(payload);
  }

  private async send(payload: WebhookPayload): Promise<void> {
    if (!this.webhookUrl) {
      this.logger.warn(
        `No ERROR_WEBHOOK_URL configured. Would have sent: [${payload.severity}] ${payload.title}`,
      );
      return;
    }

    try {
      // Detect webhook type and format accordingly
      const body = this.webhookUrl.includes('discord.com')
        ? this.formatDiscord(payload)
        : this.webhookUrl.includes('hooks.slack.com')
          ? this.formatSlack(payload)
          : JSON.stringify(payload);

      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        this.logger.error(
          `Webhook delivery failed: ${response.status} ${response.statusText}`,
        );
      }
    } catch (err) {
      // Never let notification failure crash the app
      this.logger.error(`Webhook send failed: ${(err as Error).message}`);
    }
  }

  private formatSlack(payload: WebhookPayload): string {
    const icon =
      payload.severity === 'critical'
        ? ':rotating_light:'
        : payload.severity === 'error'
          ? ':x:'
          : payload.severity === 'warning'
            ? ':warning:'
            : ':information_source:';

    return JSON.stringify({
      text: `${icon} *${payload.title}*\n${payload.message}\n_${payload.timestamp}_`,
      attachments: payload.metadata
        ? [
            {
              color:
                payload.severity === 'critical'
                  ? '#ff0000'
                  : payload.severity === 'error'
                    ? '#cc0000'
                    : '#c9a84c',
              fields: Object.entries(payload.metadata)
                .filter(([, v]) => v !== undefined)
                .map(([k, v]) => ({
                  title: k,
                  value: String(v).substring(0, 200),
                  short: String(v).length < 50,
                })),
            },
          ]
        : undefined,
    });
  }

  private formatDiscord(payload: WebhookPayload): string {
    const color =
      payload.severity === 'critical'
        ? 0xff0000
        : payload.severity === 'error'
          ? 0xcc0000
          : payload.severity === 'warning'
            ? 0xc9a84c
            : 0x00cc00;

    return JSON.stringify({
      embeds: [
        {
          title: payload.title,
          description: payload.message.substring(0, 2000),
          color,
          timestamp: payload.timestamp,
          fields: payload.metadata
            ? Object.entries(payload.metadata)
                .filter(([, v]) => v !== undefined)
                .slice(0, 10)
                .map(([k, v]) => ({
                  name: k,
                  value: String(v).substring(0, 200),
                  inline: String(v).length < 50,
                }))
            : undefined,
        },
      ],
    });
  }
}
