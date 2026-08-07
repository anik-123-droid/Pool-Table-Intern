import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { AuthRequest } from '../middleware/authMiddleware';

export const toggleOpponentStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (user) {
      const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: { isLookingForOpponent: !user.isLookingForOpponent }
      });
      res.json({ isLookingForOpponent: updatedUser.isLookingForOpponent });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getOpponents = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const opponents = await prisma.user.findMany({
      where: {
        isLookingForOpponent: true,
        id: { not: req.user.id }
      },
      select: { name: true, avatar: true, rating: true, wins: true, losses: true }
    });
    res.json(opponents);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getLeaderboard = async (req: Request, res: Response): Promise<void> => {
  try {
    const leaderboard = await prisma.user.findMany({
      orderBy: [
        { rating: 'desc' },
        { wins: 'desc' }
      ],
      take: 10,
      select: { name: true, avatar: true, rating: true, wins: true, losses: true }
    });
    res.json(leaderboard);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getUserStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { totalHoursPlayed: true, loyaltyTier: true, wins: true, losses: true, rating: true }
    });
    
    if (user) {
      let nextTier = 'Max';
      let progress = 100;
      let target = user.totalHoursPlayed;

      if (user.totalHoursPlayed < 10) {
        nextTier = 'Gold';
        target = 10;
        progress = (user.totalHoursPlayed / 10) * 100;
      } else if (user.totalHoursPlayed < 50) {
        nextTier = 'Platinum';
        target = 50;
        progress = ((user.totalHoursPlayed - 10) / 40) * 100;
      }

      res.json({
        ...user,
        nextTier,
        progress,
        targetHours: target
      });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
