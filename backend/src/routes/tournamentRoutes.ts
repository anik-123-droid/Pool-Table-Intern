import express from 'express';
import { createTournament, getTournaments, joinTournament, deleteTournament } from '../controllers/tournamentController';
import { protect, admin } from '../middleware/authMiddleware';

const router = express.Router();

router.route('/')
  .get(getTournaments)
  .post(protect, admin, createTournament);

router.post('/:id/join', protect, joinTournament);
router.delete('/:id', protect, admin, deleteTournament);

export default router;
