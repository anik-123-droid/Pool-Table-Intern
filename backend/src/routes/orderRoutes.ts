import express from 'express';
import { createOrder, getBookingOrders, getAllOrders, updateOrderStatus } from '../controllers/orderController';
import { protect, admin } from '../middleware/authMiddleware';

const router = express.Router();

router.route('/')
  .post(protect, createOrder)
  .get(protect, admin, getAllOrders);

router.get('/booking/:bookingId', protect, getBookingOrders);
router.put('/:id/status', protect, admin, updateOrderStatus);

export default router;
