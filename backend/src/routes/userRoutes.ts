import express, { RequestHandler } from 'express';
import { toggleOpponentStatus, getOpponents, getLeaderboard, getUserStats } from '../controllers/userController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

router.put('/opponent-status', protect as RequestHandler, toggleOpponentStatus as RequestHandler);
router.get('/opponents', protect as RequestHandler, getOpponents as RequestHandler);
router.get('/leaderboard', getLeaderboard as RequestHandler);
router.get('/stats', protect as RequestHandler, getUserStats as RequestHandler);

export default router;
