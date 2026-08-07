import express from 'express';
import { getMyNotifications, markAsRead, markAllAsRead } from '../controllers/notificationController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

router.route('/')
  .get(protect, getMyNotifications);

router.put('/mark-all-read', protect, markAllAsRead);
router.put('/:id/read', protect, markAsRead);

export default router;
