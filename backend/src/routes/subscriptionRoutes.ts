import express from 'express';
import { createSubscription, getMySubscriptions, getAllSubscriptions, updateSubscriptionStatus } from '../controllers/subscriptionController';
import { protect, admin } from '../middleware/authMiddleware';

const router = express.Router();

router.route('/')
  .post(protect, createSubscription)
  .get(protect, admin, getAllSubscriptions);

router.get('/my', protect, getMySubscriptions);
router.put('/:id/status', protect, admin, updateSubscriptionStatus);

export default router;
