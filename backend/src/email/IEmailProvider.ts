// ─────────────────────────────────────────────────────────────
// IEmailProvider — provider-agnostic email contract.
//
// EmailService depends only on this interface so the underlying
// transport (Nodemailer / Resend / SendGrid / SES …) can be
// swapped without touching any business logic.
// ─────────────────────────────────────────────────────────────

export interface Attachment {
  /** Display filename shown in the email client */
  filename: string;
  /** Raw file content */
  content:  Buffer;
  /** MIME type, e.g. "application/pdf" */
  contentType: string;
}

export interface SendEmailOptions {
  to:          string;
  subject:     string;
  /** Plain-text fallback body */
  text:        string;
  /** Optional HTML body — if omitted the provider uses `text` */
  html?:       string;
  attachments?: Attachment[];
}

export interface SendEmailResult {
  /** Opaque message ID returned by the provider (SMTP messageId, etc.) */
  providerMsgId: string;
}

export interface IEmailProvider {
  /**
   * Send a single email.
   * Resolves with provider metadata on success.
   * Rejects with a descriptive Error on failure — the caller handles retries.
   */
  send(options: SendEmailOptions): Promise<SendEmailResult>;

  /**
   * Returns true if the provider is configured and ready to send.
   * EmailService calls this before attempting a send and throws a
   * clear error when false, rather than letting Nodemailer fail
   * with a cryptic SMTP connection error.
   */
  isConfigured(): boolean;
}
