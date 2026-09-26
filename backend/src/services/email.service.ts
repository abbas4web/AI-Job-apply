import { prisma } from '../config/database';
import { AppError } from '../utils/AppError';
import { logger } from '../utils/logger';
import { nodemailerProvider } from '../email/NodemailerProvider';
import type { IEmailProvider } from '../email/IEmailProvider';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export interface SendApplicationEmailInput {
  userId:         string;
  applicationId:  string;
  recipientEmail: string;
  jobTitle:       string;
  company:        string;
  /** ID of the resume whose raw content is the PDF attachment */
  resumeId:       string;
  /** Pre-generated cover letter — subject becomes the email subject */
  coverLetter:    { subject: string; body: string };
  /** BullMQ job ID for log correlation — optional */
  queueJobId?:    string;
}

export interface SendApplicationEmailResult {
  emailLogId:    string;
  providerMsgId: string;
}

// ─────────────────────────────────────────────────────────────
// EmailService
//
// Responsibilities:
//   1. Validate that all required data exists and belongs to the user.
//   2. Fetch the resume content and encode it as a PDF attachment.
//   3. Compose the email from the cover letter.
//   4. Send via the injected IEmailProvider.
//   5. Record every attempt (success or failure) in EmailLog.
//
// The provider is injected so tests can pass a mock without
// touching SMTP credentials.
// ─────────────────────────────────────────────────────────────

export class EmailService {
  constructor(private readonly provider: IEmailProvider = nodemailerProvider) {}

  // ── Send application email ────────────────────────────────

  async sendApplicationEmail(
    input: SendApplicationEmailInput,
  ): Promise<SendApplicationEmailResult> {
    const {
      userId,
      applicationId,
      recipientEmail,
      jobTitle,
      company,
      resumeId,
      coverLetter,
      queueJobId,
    } = input;

    // ── 1. Guard: provider must be configured ─────────────
    if (!this.provider.isConfigured()) {
      throw new AppError(
        'Email provider is not configured. ' +
        'Set SMTP_HOST, SMTP_USER, SMTP_PASSWORD, and SMTP_FROM in your environment.',
        503,
      );
    }

    // ── 2. Verify application ownership ───────────────────
    const application = await prisma.application.findFirst({
      where:  { id: applicationId, userId },
      select: { id: true, status: true },
    });

    if (!application) {
      throw AppError.notFound('Application not found');
    }

    // ── 3. Fetch resume content (ownership enforced) ───────
    const resume = await prisma.resume.findFirst({
      where:  { id: resumeId, userId },
      select: { id: true, name: true, content: true },
    });

    if (!resume) {
      throw AppError.notFound('Resume not found');
    }

    if (!resume.content?.trim()) {
      throw AppError.badRequest('Resume has no content to attach');
    }

    // ── 4. Create a PENDING log row ────────────────────────
    // Created before the send attempt so a crash mid-send is
    // still recorded as PENDING rather than silently lost.
    const log = await prisma.emailLog.create({
      data: {
        userId,
        applicationId,
        status:         'PENDING',
        recipientEmail,
        subject:        coverLetter.subject,
        queueJobId:     queueJobId ?? null,
      },
    });

    logger.info(
      `[email] sending application email — ` +
      `logId=${log.id} applicationId=${applicationId} to=${recipientEmail} ` +
      `job="${jobTitle}" at "${company}"`,
    );

    // ── 5. Encode resume text as a plain-text attachment ───
    // The resume is stored as extracted plain text (from pdf-parse).
    // We re-encode it to a Buffer and label it as text/plain.
    // A future improvement could store the original PDF binary.
    const attachmentBuffer = Buffer.from(resume.content, 'utf8');
    const safeFilename     = `${resume.name.replace(/[^a-z0-9_\-. ]/gi, '_')}.txt`;

    // ── 6. Compose and send ────────────────────────────────
    try {
      const emailResult = await this.provider.send({
        to:      recipientEmail,
        subject: coverLetter.subject,
        text:    this.buildPlainTextBody(coverLetter.body, jobTitle, company),
        html:    this.buildHtmlBody(coverLetter.body, jobTitle, company),
        attachments: [
          {
            filename:    safeFilename,
            content:     attachmentBuffer,
            contentType: 'text/plain',
          },
        ],
      });

      // ── 7a. Mark SENT ──────────────────────────────────
      await prisma.emailLog.update({
        where: { id: log.id },
        data: {
          status:        'SENT',
          providerMsgId: emailResult.providerMsgId,
          sentAt:        new Date(),
        },
      });

      logger.info(
        `[email] sent — logId=${log.id} msgId=${emailResult.providerMsgId}`,
      );

      return { emailLogId: log.id, providerMsgId: emailResult.providerMsgId };
    } catch (err) {
      // ── 7b. Mark FAILED ────────────────────────────────
      const errorMessage = err instanceof Error ? err.message : String(err);

      await prisma.emailLog.update({
        where: { id: log.id },
        data: {
          status:       'FAILED',
          errorMessage,
        },
      });

      logger.error(
        `[email] failed — logId=${log.id} applicationId=${applicationId} ` +
        `error=${errorMessage}`,
      );

      // Re-throw so BullMQ can retry with back-off
      throw err;
    }
  }

  // ── Composition helpers ───────────────────────────────────

  private buildPlainTextBody(
    coverLetterBody: string,
    jobTitle:        string,
    company:         string,
  ): string {
    return [
      `Application for ${jobTitle} at ${company}`,
      '',
      coverLetterBody,
      '',
      '---',
      'Sent via AI Job Apply',
    ].join('\n');
  }

  private buildHtmlBody(
    coverLetterBody: string,
    jobTitle:        string,
    company:         string,
  ): string {
    // Escape < > & to prevent XSS, convert newlines to <br>
    const escape = (s: string) =>
      s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    const bodyHtml = escape(coverLetterBody)
      .split('\n')
      .map((line) => (line.trim() === '' ? '<br>' : `<p>${line}</p>`))
      .join('\n');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Application for ${escape(jobTitle)} at ${escape(company)}</title>
  <style>
    body  { font-family: Georgia, serif; max-width: 680px; margin: 40px auto; color: #222; line-height: 1.7; }
    h2    { font-size: 1.1rem; color: #444; margin-bottom: 24px; }
    p     { margin: 0 0 16px; }
    footer{ margin-top: 40px; font-size: 0.8rem; color: #888; border-top: 1px solid #ddd; padding-top: 12px; }
  </style>
</head>
<body>
  <h2>Application for ${escape(jobTitle)} at ${escape(company)}</h2>
  ${bodyHtml}
  <footer>Sent via AI Job Apply</footer>
</body>
</html>`;
  }
}

export const emailService = new EmailService();
