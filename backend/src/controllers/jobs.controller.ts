import { Request, Response } from 'express';
import { jobsService } from '../services/jobs.service';
import { AppError } from '../utils/AppError';
import { getJobsQuerySchema } from '../middleware/schemas/job.schemas';
import type { CreateJobInput, UpdateJobInput } from '../middleware/schemas/job.schemas';

// GET /api/v1/jobs
export async function getJobs(req: Request, res: Response): Promise<void> {
  const parsed = getJobsQuerySchema.safeParse(req.query);

  if (!parsed.success) {
    const errors = parsed.error.flatten().fieldErrors;
    res.status(400).json({ success: false, error: 'Invalid query parameters', errors });
    return;
  }

  const result = await jobsService.findAll(parsed.data);

  res.status(200).json({ success: true, ...result });
}

// GET /api/v1/jobs/:id
export async function getJobById(req: Request, res: Response): Promise<void> {
  const job = await jobsService.findById(req.params.id);
  res.status(200).json({ success: true, data: job });
}

// POST /api/v1/jobs
export async function createJob(req: Request, res: Response): Promise<void> {
  const body = req.body as CreateJobInput;
  const job = await jobsService.create(body);
  res.status(201).json({ success: true, data: job });
}

// PATCH /api/v1/jobs/:id
export async function updateJob(req: Request, res: Response): Promise<void> {
  const body = req.body as UpdateJobInput;
  const job = await jobsService.update(req.params.id, body);
  res.status(200).json({ success: true, data: job });
}

// PATCH /api/v1/jobs/:id/duplicate
export async function markDuplicate(req: Request, res: Response): Promise<void> {
  const { isDuplicate } = req.body as { isDuplicate: unknown };

  if (typeof isDuplicate !== 'boolean') {
    throw AppError.badRequest('isDuplicate must be a boolean');
  }

  const job = await jobsService.markDuplicate(req.params.id, isDuplicate);
  res.status(200).json({ success: true, data: job });
}

// DELETE /api/v1/jobs/:id
export async function deleteJob(req: Request, res: Response): Promise<void> {
  await jobsService.delete(req.params.id);
  res.status(200).json({ success: true, message: 'Job deleted' });
}
