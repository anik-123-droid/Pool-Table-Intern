import express from 'express';
import { joinWaitlist, leaveWaitlist, getWaitlistStatus } from '../controllers/waitlistController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

router.post('/join', protect, joinWaitlist);
router.post('/leave', protect, leaveWaitlist);
router.get('/status', protect, getWaitlistStatus);

export default router;
