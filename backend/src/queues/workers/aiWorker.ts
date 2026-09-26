/**
 * @deprecated
 *
 * This file is superseded by the workers introduced in this PR:
 *   - aiMatchingWorker.ts   — handles MATCH_JOB (ai-matching queue)
 *   - jobProcessingWorker.ts — handles PROCESS_JOB / DEDUPLICATE_JOB
 *   - emailWorker.ts        — handles SEND_APPLICATION_EMAIL / SEND_MATCH_DIGEST
 *
 * All three are started by src/workers.ts.
 * This file is kept only to avoid breaking any existing imports
 * and will be removed in a follow-up cleanup.
 */

export {};
