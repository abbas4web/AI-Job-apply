import { Router } from 'express';
import healthRoutes      from './health.routes';
import authRoutes        from './auth.routes';
import jobRoutes         from './jobs.routes';
import applicationRoutes from './applications.routes';
import resumeRoutes      from './resumes.routes';
import aiRoutes          from './ai.routes';
import ingestionRoutes   from './ingestion.routes';
import settingsRoutes    from './settings.routes';
import dashboardRoutes   from './dashboard.routes';

const router = Router();

router.use('/health',       healthRoutes);
router.use('/auth',         authRoutes);
router.use('/jobs',         jobRoutes);
router.use('/applications', applicationRoutes);
router.use('/resumes',      resumeRoutes);
router.use('/ai',           aiRoutes);
router.use('/ingestion',    ingestionRoutes);
router.use('/settings',     settingsRoutes);
router.use('/dashboard',    dashboardRoutes);

export default router;
