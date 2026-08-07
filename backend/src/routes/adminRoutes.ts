import express from 'express';
import { getDashboardStats } from '../controllers/adminController';
import { protect, admin } from '../middleware/authMiddleware';

const router = express.Router();

router.get('/dashboard', protect, admin, getDashboardStats);

export default router;
