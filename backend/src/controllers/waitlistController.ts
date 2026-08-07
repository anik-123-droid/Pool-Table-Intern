import { Response } from 'express';
import prisma from '../utils/prisma';
import { AuthRequest } from '../middleware/authMiddleware';

export const joinWaitlist = async (req: AuthRequest, res: Response): Promise<any> => {
  const { tableType } = req.body;
  try {
    const existing = await prisma.waitlistEntry.findFirst({
      where: { userId: req.user.id, status: 'waiting' }
    });
    if (existing) {
      return res.status(400).json({ message: 'You are already on the waitlist' });
    }

    const waitlistEntry = await prisma.waitlistEntry.create({
      data: {
        userId: req.user.id,
        tableType: tableType || 'Any'
      }
    });

    // Estimate available time logic
    const now = new Date();
    const tables = await prisma.poolTable.findMany({
      where: { status: 'active' },
      include: {
        bookings: {
          where: {
            status: 'confirmed',
            endTime: { gte: now }
          },
          orderBy: { endTime: 'asc' }
        }
      }
    });

    let matchingTables = tables;
    if (tableType && tableType !== 'Any') {
      const sizeKeyword = tableType.toLowerCase().replace(/ standard| junior| tournament/gi, '').trim();
      matchingTables = tables.filter(t => t.size.toLowerCase().includes(sizeKeyword));
    }

    let notificationMsg = `You have successfully joined the waitlist for a ${tableType === 'Any' ? 'pool' : tableType} table.`;
    if (matchingTables.length > 0) {
      // Check if any table is currently free
      const hasFreeTable = matchingTables.some(t => {
        const activeBooking = t.bookings.find(b => b.startTime <= now && b.endTime >= now);
        return !activeBooking;
      });

      if (hasFreeTable) {
        notificationMsg = `You have successfully joined the waitlist for a ${tableType === 'Any' ? 'pool' : tableType} table. The table is currently empty, you can book it now.`;
      } else {
        let earliestEndTime: any = null;
        matchingTables.forEach(t => {
          const activeBooking = t.bookings.find(b => b.startTime <= now && b.endTime >= now);
          if (activeBooking) {
            if (!earliestEndTime || activeBooking.endTime < earliestEndTime) {
              earliestEndTime = activeBooking.endTime;
            }
          }
        });
        
        if (earliestEndTime) {
          notificationMsg = `You have successfully joined the waitlist for a ${tableType === 'Any' ? 'pool' : tableType} table. Expected availability: starting around ${new Date(earliestEndTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}.`;
        }
      }
    }

    await prisma.notification.create({
      data: {
        userId: req.user.id,
        title: "Waitlist Joined",
        message: notificationMsg,
        type: "info"
      }
    });

    res.status(201).json(waitlistEntry);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const leaveWaitlist = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const entry = await prisma.waitlistEntry.findFirst({
      where: { userId: req.user.id, status: 'waiting' }
    });
    
    if (entry) {
      await prisma.waitlistEntry.update({
        where: { id: entry.id },
        data: { status: 'expired' }
      });
    }
    
    res.json({ message: 'Left waitlist successfully' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const processWaitlistQueue = async (): Promise<void> => {
  try {
    const now = new Date();
    // Find free active tables (no current booking)
    const tables = await prisma.poolTable.findMany({
      where: { status: 'active' },
      include: {
        bookings: {
          where: {
            status: 'confirmed',
            startTime: { lte: now },
            endTime: { gte: now }
          }
        }
      }
    });

    const freeTables = tables.filter(t => t.bookings.length === 0);
    
    if (freeTables.length > 0) {
      const waitingEntries = await prisma.waitlistEntry.findMany({
        where: { status: 'waiting' },
        orderBy: { createdAt: 'asc' }
      });

      // Keep track of assigned tables
      const assignedTableIds = new Set<number>();

      for (const entry of waitingEntries) {
        // Find a matching free table
        const matchingTable = freeTables.find(t => {
          if (assignedTableIds.has(t.id)) return false;
          if (entry.tableType === 'Any' || !entry.tableType) return true;
          return t.size.toLowerCase().includes(entry.tableType.toLowerCase().replace(/ standard| junior| tournament/gi, '').trim());
        });

        if (matchingTable) {
          assignedTableIds.add(matchingTable.id);

          await prisma.waitlistEntry.update({
            where: { id: entry.id },
            data: { status: 'notified', notifiedAt: new Date() }
          });

          await prisma.notification.create({
            data: {
              userId: entry.userId,
              title: "Table Available!",
              message: `${matchingTable.size} table #${matchingTable.tableNumber} is now available for you. Please proceed to the lounge.`,
              type: "success"
            }
          });
        }
      }
    }
  } catch (error) {
    console.error("Error processing waitlist:", error);
  }
};

export const getWaitlistStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Process queue before returning status
    await processWaitlistQueue();

    const entry = await prisma.waitlistEntry.findFirst({
      where: { userId: req.user.id, status: 'waiting' }
    });
    
    const totalWaiting = await prisma.waitlistEntry.count({
      where: { status: 'waiting' }
    });
    
    let position = 0;
    if (entry) {
      position = await prisma.waitlistEntry.count({
        where: { 
          status: 'waiting',
          createdAt: { lt: entry.createdAt }
        }
      }) + 1;
    }

    res.json({ 
      isOnWaitlist: !!entry, 
      position, 
      totalWaiting,
      entry 
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
