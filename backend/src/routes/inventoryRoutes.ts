import express from 'express';
import { getInventory, updateInventory, seedInventory } from '../controllers/inventoryController';
import { protect, admin } from '../middleware/authMiddleware';

const router = express.Router();

router.route('/')
  .get(protect, admin, getInventory);

router.post('/seed', protect, admin, seedInventory);
router.put('/:id', protect, admin, updateInventory);

export default router;
