import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { AuthRequest } from '../middleware/authMiddleware';

export const createTournament = async (req: Request, res: Response): Promise<void> => {
  const { name, description, date, fees, prizeMoney } = req.body;

  try {
    const tournament = await prisma.tournament.create({
      data: {
        name,
        description,
        date: new Date(date),
        fees: Number(fees),
        prizeMoney: Number(prizeMoney),
      },
    });

    const users = await prisma.user.findMany({ where: { role: 'user' } });
    const notifications = users.map(user => ({
      userId: user.id,
      title: 'New Tournament!',
      message: `A new tournament "${name}" has been announced with a prize of INR ${prizeMoney}. Join now!`,
    }));

    if (notifications.length > 0) {
      await prisma.notification.createMany({
        data: notifications,
      });
    }

    res.status(201).json(tournament);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getTournaments = async (req: Request, res: Response): Promise<void> => {
  try {
    const tournaments = await prisma.tournament.findMany({
      include: {
        participants: {
          select: { name: true, email: true, avatar: true, rating: true }
        }
      },
      orderBy: { date: 'asc' }
    });
    res.json(tournaments);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const joinTournament = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const tournament = await prisma.tournament.findUnique({
      where: { id: Number(req.params.id) },
      include: { participants: true }
    });

    if (!tournament) return res.status(404).json({ message: 'Tournament not found' });

    if (tournament.participants.some(p => p.id === req.user.id)) {
      return res.status(400).json({ message: 'Already joined this tournament' });
    }

    await prisma.tournament.update({
      where: { id: tournament.id },
      data: {
        participants: {
          connect: { id: req.user.id }
        }
      }
    });

    res.json({ message: 'Joined successfully' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteTournament = async (req: Request, res: Response): Promise<void> => {
  try {
    const tournament = await prisma.tournament.findUnique({ where: { id: Number(req.params.id) } });
    if (tournament) {
      await prisma.tournament.delete({ where: { id: Number(req.params.id) } });
      res.json({ message: 'Tournament removed' });
    } else {
      res.status(404).json({ message: 'Tournament not found' });
    }
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
