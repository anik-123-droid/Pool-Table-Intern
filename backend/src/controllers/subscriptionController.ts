import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { AuthRequest } from '../middleware/authMiddleware';

export const createSubscription = async (req: AuthRequest, res: Response): Promise<void> => {
  const { type, totalHours, price, mobileNumber } = req.body;
  try {
    const expiryDate = new Date();
    if (type === 'weekly') {
      expiryDate.setDate(expiryDate.getDate() + 7);
    } else if (type === 'monthly') {
      expiryDate.setMonth(expiryDate.getMonth() + 1);
    }

    const subscription = await prisma.subscription.create({
      data: {
        userId: req.user.id,
        type,
        totalHours: Number(totalHours),
        remainingHours: Number(totalHours),
        price: Number(price),
        mobileNumber,
        expiryDate
      }
    });

    res.status(201).json(subscription);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getMySubscriptions = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const subscriptions = await prisma.subscription.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' }
    });
    res.json(subscriptions);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getAllSubscriptions = async (req: Request, res: Response): Promise<void> => {
  try {
    const subscriptions = await prisma.subscription.findMany({
      include: {
        user: { select: { name: true, email: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(subscriptions);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updateSubscriptionStatus = async (req: Request, res: Response): Promise<void> => {
  const { status } = req.body;
  try {
    const subscription = await prisma.subscription.findUnique({ where: { id: Number(req.params.id) } });
    if (subscription) {
      const updatedSubscription = await prisma.subscription.update({
        where: { id: subscription.id },
        data: { status }
      });
      res.json(updatedSubscription);
    } else {
      res.status(404).json({ message: 'Subscription not found' });
    }
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
