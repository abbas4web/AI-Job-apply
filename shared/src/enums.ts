// ─────────────────────────────────────────────────────────────
// Shared Enums
// ─────────────────────────────────────────────────────────────

export enum ApplicationStatus {
  SAVED          = 'SAVED',
  MATCHED        = 'MATCHED',
  READY_TO_APPLY = 'READY_TO_APPLY',
  APPLIED        = 'APPLIED',
  INTERVIEW      = 'INTERVIEW',
  OFFER          = 'OFFER',
  REJECTED       = 'REJECTED',
}

export enum JobSource {
  LINKEDIN = 'LINKEDIN',
  INDEED = 'INDEED',
  GLASSDOOR = 'GLASSDOOR',
  COMPANY_SITE = 'COMPANY_SITE',
  REFERRAL = 'REFERRAL',
  OTHER = 'OTHER',
}

export enum ScrapingStatus {
  STARTED = 'STARTED',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
}

export enum QueueJobType {
  // Legacy / existing
  SCRAPE_JOBS            = 'SCRAPE_JOBS',
  GENERATE_COVER_LETTER  = 'GENERATE_COVER_LETTER',
  TAILOR_RESUME          = 'TAILOR_RESUME',
  SUBMIT_APPLICATION     = 'SUBMIT_APPLICATION',
  SEND_FOLLOW_UP         = 'SEND_FOLLOW_UP',

  // job-processing queue
  PROCESS_JOB            = 'PROCESS_JOB',
  DEDUPLICATE_JOB        = 'DEDUPLICATE_JOB',

  // ai-matching queue
  MATCH_JOB              = 'MATCH_JOB',

  // email-processing queue
  SEND_APPLICATION_EMAIL = 'SEND_APPLICATION_EMAIL',
  SEND_MATCH_DIGEST      = 'SEND_MATCH_DIGEST',
}

export enum UserRole {
  USER = 'USER',
  ADMIN = 'ADMIN',
}
