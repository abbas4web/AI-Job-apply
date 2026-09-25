import { Request, Response } from 'express';
import { resumesService } from '../services/resumes.service';
import { handleUpload } from '../middleware/upload';
import { AppError } from '../utils/AppError';
import type { AuthRequest } from '../middleware/auth';
import type { UploadResumeInput, UpdateResumeInput } from '../middleware/schemas/resume.schemas';
import { uploadResumeSchema } from '../middleware/schemas/resume.schemas';

// GET /api/v1/resumes
export async function getResumes(req: Request, res: Response): Promise<void> {
  const { userId } = req as AuthRequest;
  const resumes = await resumesService.findAll(userId);

  res.status(200).json({ success: true, data: resumes });
}

// GET /api/v1/resumes/:id
export async function getResumeById(req: Request, res: Response): Promise<void> {
  const { userId } = req as AuthRequest;
  const resume = await resumesService.findById(req.params.id, userId);

  res.status(200).json({ success: true, data: resume });
}

// POST /api/v1/resumes  (multipart/form-data)
export async function uploadResume(req: Request, res: Response): Promise<void> {
  // Run multer — parses the multipart body and attaches req.file
  await handleUpload(req, res);

  // Validate the file was provided
  if (!req.file) {
    throw AppError.badRequest('No file uploaded. Send a PDF in the "resume" field.');
  }

  // Validate form fields (name, isDefault)
  const parsed = uploadResumeSchema.safeParse(req.body);
  if (!parsed.success) {
    throw AppError.badRequest(
      parsed.error.flatten().fieldErrors.name?.[0] ?? 'Invalid request body'
    );
  }

  const { userId } = req as AuthRequest;
  const body = parsed.data as UploadResumeInput;

  const resume = await resumesService.create(userId, {
    name: body.name,
    isDefault: body.isDefault,
    fileBuffer: req.file.buffer,
    originalFilename: req.file.originalname,
  });

  res.status(201).json({ success: true, data: resume });
}

// PATCH /api/v1/resumes/:id
export async function updateResume(req: Request, res: Response): Promise<void> {
  const { userId } = req as AuthRequest;
  const body = req.body as UpdateResumeInput;

  const resume = await resumesService.update(req.params.id, userId, body);

  res.status(200).json({ success: true, data: resume });
}

// DELETE /api/v1/resumes/:id
export async function deleteResume(req: Request, res: Response): Promise<void> {
  const { userId } = req as AuthRequest;

  await resumesService.delete(req.params.id, userId);

  res.status(200).json({ success: true, message: 'Resume deleted' });
}
