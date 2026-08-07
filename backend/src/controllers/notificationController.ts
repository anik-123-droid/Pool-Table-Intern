import { Response } from 'express';
import prisma from '../utils/prisma';
import { AuthRequest } from '../middleware/authMiddleware';
import { processWaitlistQueue } from './waitlistController';

export const getMyNotifications = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await processWaitlistQueue();
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' }
    });
    res.json(notifications);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const markAsRead = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const notification = await prisma.notification.findUnique({ where: { id: Number(req.params.id) } });
    if (notification && notification.userId === req.user.id) {
      await prisma.notification.update({
        where: { id: notification.id },
        data: { isRead: true }
      });
      res.json({ message: 'Marked as read' });
    } else {
      res.status(404).json({ message: 'Notification not found' });
    }
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const markAllAsRead = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user.id, isRead: false },
      data: { isRead: true }
    });
    res.json({ message: 'All notifications marked as read' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
