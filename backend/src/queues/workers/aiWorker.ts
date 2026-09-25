import { Worker, Job } from 'bullmq';
import { redis } from '../../config/redis';
import { QUEUE_NAMES, QueueJobType } from '@ai-job-apply/shared';

// TODO: Import and call actual AI service handlers here.
// import { handleGenerateCoverLetter } from '../../services/ai/coverLetter';
// import { handleTailorResume } from '../../services/ai/resumeTailor';

async function processAiJob(job: Job): Promise<void> {
  console.log(`Processing AI job: ${job.name} (id: ${job.id})`);

  switch (job.name as QueueJobType) {
    case QueueJobType.GENERATE_COVER_LETTER:
      // await handleGenerateCoverLetter(job.data);
      break;

    case QueueJobType.TAILOR_RESUME:
      // await handleTailorResume(job.data);
      break;

    default:
      throw new Error(`Unknown AI job type: ${job.name}`);
  }
}

export const aiWorker = new Worker(QUEUE_NAMES.AI_TASKS, processAiJob, {
  connection: redis,
  concurrency: 2,
});

aiWorker.on('completed', (job) => {
  console.log(`✅ AI job completed: ${job.name} (id: ${job.id})`);
});

aiWorker.on('failed', (job, err) => {
  console.error(`❌ AI job failed: ${job?.name} (id: ${job?.id})`, err);
});
