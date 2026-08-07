import express from 'express';
import { getMenuItems, createMenuItem, seedMenu } from '../controllers/menuController';
import { protect, admin } from '../middleware/authMiddleware';

const router = express.Router();

router.route('/')
  .get(getMenuItems)
  .post(protect, admin, createMenuItem);

router.post('/seed', protect, admin, seedMenu);

export default router;
