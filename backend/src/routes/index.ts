import { Router } from 'express';
import healthRoutes from './health.routes';
import authRoutes from './auth.routes';
import jobRoutes from './jobs.routes';
import applicationRoutes from './applications.routes';
import resumeRoutes from './resumes.routes';

const router = Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/jobs', jobRoutes);
router.use('/applications', applicationRoutes);
router.use('/resumes', resumeRoutes);

export default router;
