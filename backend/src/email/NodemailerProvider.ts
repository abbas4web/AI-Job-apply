import nodemailer, { type Transporter } from 'nodemailer';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import type {
  IEmailProvider,
  SendEmailOptions,
  SendEmailResult,
} from './IEmailProvider';

// ─────────────────────────────────────────────────────────────
// NodemailerProvider
//
// All SMTP credentials come exclusively from env vars — never
// hardcoded, never logged.  The transporter is created lazily
// on the first send() call so startup does not require SMTP
// to be reachable.
// ─────────────────────────────────────────────────────────────

export class NodemailerProvider implements IEmailProvider {
  private transporter: Transporter | null = null;

  // ── Provider readiness ────────────────────────────────────

  isConfigured(): boolean {
    return !!(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASSWORD && env.SMTP_FROM);
  }

  // ── Lazy transporter factory ──────────────────────────────
  // Built once and reused.  Credentials are read from env —
  // they are never stored as class properties or logged.

  private getTransporter(): Transporter {
    if (this.transporter) return this.transporter;

    this.transporter = nodemailer.createTransport({
      host:   env.SMTP_HOST,
      port:   env.SMTP_PORT,
      secure: env.SMTP_SECURE,   // true = TLS on connect (port 465)
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASSWORD, // never logged
      },
      // Fail fast rather than hanging indefinitely
      connectionTimeout: 10_000,
      greetingTimeout:   5_000,
      socketTimeout:     30_000,
    });

    return this.transporter;
  }

  // ── Send ──────────────────────────────────────────────────

  async send(options: SendEmailOptions): Promise<SendEmailResult> {
    const transporter = this.getTransporter();

    logger.debug(
      `[NodemailerProvider] sending to=${options.to} ` +
      `subject="${options.subject}" ` +
      `attachments=${options.attachments?.length ?? 0}`,
    );

    const info = await transporter.sendMail({
      from:        env.SMTP_FROM,
      to:          options.to,
      subject:     options.subject,
      text:        options.text,
      html:        options.html,
      attachments: options.attachments?.map((a) => ({
        filename:    a.filename,
        content:     a.content,
        contentType: a.contentType,
      })),
    });

    logger.debug(
      `[NodemailerProvider] accepted — messageId=${info.messageId}`,
    );

    return { providerMsgId: info.messageId ?? '' };
  }
}

// ── Singleton ─────────────────────────────────────────────────
// One instance per process — shared by EmailService.
// Tests can replace this binding with a mock provider.

export const nodemailerProvider = new NodemailerProvider();
