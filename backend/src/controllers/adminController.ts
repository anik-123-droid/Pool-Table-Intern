import { Request, Response } from 'express';
import prisma from '../utils/prisma';

export const getDashboardStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const dailyBookings = await prisma.booking.findMany({
      where: {
        startTime: { gte: today, lt: tomorrow },
        status: { in: ['confirmed', 'completed'] }
      }
    });

    const dailyRevenue = dailyBookings.reduce((sum, booking) => sum + booking.totalAmount, 0);

    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthlyBookings = await prisma.booking.findMany({
      where: {
        startTime: { gte: startOfMonth },
        status: { in: ['confirmed', 'completed'] }
      }
    });
    const monthlyRevenue = monthlyBookings.reduce((sum, booking) => sum + booking.totalAmount, 0);

    const now = new Date();
    const liveBookingsCount = await prisma.booking.count({
      where: {
        startTime: { lte: now },
        endTime: { gt: now },
        status: 'confirmed'
      }
    });

    const tableStats = await prisma.booking.groupBy({
      by: ['tableId'],
      where: { status: { in: ['confirmed', 'completed'] } },
      _count: { tableId: true },
      orderBy: { _count: { tableId: 'desc' } },
      take: 1
    });

    let mostPopularTable = 'N/A';
    if (tableStats.length > 0) {
      const table = await prisma.poolTable.findUnique({ where: { id: tableStats[0].tableId } });
      if (table) mostPopularTable = table.tableNumber;
    }

    const todayBookingsData = await prisma.booking.findMany({
      where: { startTime: { gte: today, lt: tomorrow } },
      include: {
        user: { select: { name: true } },
        table: { select: { tableNumber: true } }
      }
    });

    res.json({
      dailyRevenue,
      monthlyRevenue,
      mostPopularTable,
      todayBookingsCount: dailyBookings.length,
      liveBookingsCount,
      todayBookings: todayBookingsData
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
