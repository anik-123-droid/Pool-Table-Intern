import express from 'express';
import { createBooking, getMyBookings, getAllBookings, updateBookingStatus, getBookingById, cancelBooking, parseSmartBooking } from '../controllers/bookingController';
import { protect, admin } from '../middleware/authMiddleware';
import { bookingLimiter } from '../middleware/rateLimiters';

const router = express.Router();

router.route('/')
  .post(protect, bookingLimiter, createBooking)
  .get(protect, admin, getAllBookings);

router.get('/mybookings', protect, getMyBookings);
router.post('/smart-parse', protect, parseSmartBooking);

router.post('/:id/cancel', protect, cancelBooking);

router.route('/:id')
  .get(protect, getBookingById)
  .put(protect, admin, updateBookingStatus);

export default router;
