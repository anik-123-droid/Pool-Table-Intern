import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { AuthRequest } from '../middleware/authMiddleware';
import { emitTableUpdate } from '../utils/socket';

const calculateTier = (hours: number): string => {
  if (hours >= 50) return 'Platinum';
  if (hours >= 10) return 'Gold';
  return 'Member';
};

const calculatePrice = (basePrice: number, startTime: Date, durationHours: number): number => {
  const start = new Date(startTime);
  const day = start.getDay(); // 0 is Sunday, 6 is Saturday
  const hour = start.getHours();

  let isWeekendOrEvening = false;
  if (day === 0 || day === 6) isWeekendOrEvening = true; // Weekend
  if (day === 5 && hour >= 17) isWeekendOrEvening = true; // Friday evening
  
  const multiplier = isWeekendOrEvening ? 1.5 : 1.0;
  return basePrice * durationHours * multiplier;
};

export const createBooking = async (req: AuthRequest, res: Response): Promise<any> => {
  const { tableId, startTime, durationHours, equipment, useSubscription } = req.body as { tableId: number | string, startTime: string | Date, durationHours: number, equipment?: any[], useSubscription?: boolean };

  try {
    const start = new Date(startTime);
    const end = new Date(start.getTime() + durationHours * 60 * 60 * 1000);

    const [table, existingBookings] = await Promise.all([
      prisma.poolTable.findUnique({ where: { id: Number(tableId) } }),
      prisma.booking.findMany({
        where: {
          tableId: Number(tableId),
          status: { in: ['confirmed', 'completed'] },
        }
      })
    ]);

    if (!table) return res.status(404).json({ message: 'Table not found' });
    if (table.status === 'maintenance' || table.status === 'maintenance_scheduled') {
      return res.status(400).json({ message: 'Table is under maintenance' });
    }

    const BUFFER_MS = 15 * 60 * 1000;
    const conflictingBooking = existingBookings.find((booking: any) => {
      const bStart = new Date(booking.startTime).getTime();
      const bEnd = new Date(booking.endTime).getTime();
      const bStartWithBuffer = bStart - BUFFER_MS;
      const bEndWithBuffer = bEnd + BUFFER_MS;
      return (start.getTime() < bEndWithBuffer && end.getTime() > bStartWithBuffer);
    });

    if (conflictingBooking) {
      const cStart = new Date(conflictingBooking.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const cEnd = new Date(conflictingBooking.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      return res.status(400).json({ 
        message: `Time slot conflicts with existing booking (${cStart} - ${cEnd}). Please select a shorter duration.` 
      });
    }

    let totalAmount = 0;
    if (useSubscription) {
      const sub = await prisma.subscription.findFirst({
        where: { userId: req.user.id, status: 'active' }
      });
      if (!sub || sub.remainingHours < durationHours) {
        return res.status(400).json({ message: 'Insufficient subscription hours' });
      }
      await prisma.subscription.update({
        where: { id: sub.id },
        data: { remainingHours: sub.remainingHours - durationHours }
      });
      const equipmentAmount = (equipment || []).reduce((sum: number, item: any) => sum + (item.price || 0), 0);
      totalAmount = equipmentAmount + 10; 
    } else {
      const baseAmount = calculatePrice(table.basePricePerHour, start, durationHours);
      const equipmentAmount = (equipment || []).reduce((sum: number, item: any) => sum + (item.price || 0), 0);
      totalAmount = baseAmount + equipmentAmount + 10;
    }

    const equipmentData = (equipment || []).map((e: any) => ({
      name: e.name,
      price: e.price
    }));

    const booking = await prisma.booking.create({
      data: {
        userId: req.user.id,
        tableId: Number(tableId),
        startTime: start,
        endTime: end,
        durationHours,
        totalAmount,
        equipment: {
          create: equipmentData
        }
      },
      include: {
        equipment: true
      }
    });

    emitTableUpdate();
    res.status(201).json(booking);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getMyBookings = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const bookings = await prisma.booking.findMany({
      where: { userId: req.user.id },
      include: {
        table: {
          select: { tableNumber: true, size: true }
        },
        equipment: true
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(bookings);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getAllBookings = async (req: Request, res: Response): Promise<any> => {
  try {
    const bookings = await prisma.booking.findMany({
      include: {
        user: {
          select: { name: true, email: true, phone: true }
        },
        table: {
          select: { tableNumber: true, size: true }
        },
        equipment: true
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(bookings);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updateBookingStatus = async (req: Request, res: Response): Promise<any> => {
  const { status } = req.body;
  try {
    const booking = await prisma.booking.findUnique({ where: { id: Number(req.params.id) } });
    if (booking) {
      const oldStatus = booking.status;
      
      const updatedBooking = await prisma.booking.update({
        where: { id: Number(req.params.id) },
        data: { status }
      });

      if (status === 'completed' && oldStatus !== 'completed') {
        const user = await prisma.user.findUnique({ where: { id: booking.userId } });
        if (user) {
          const newTotalHours = user.totalHoursPlayed + booking.durationHours;
          await prisma.user.update({
            where: { id: user.id },
            data: {
              totalHoursPlayed: newTotalHours,
              loyaltyTier: calculateTier(newTotalHours)
            }
          });
        }
      }

      emitTableUpdate();
      res.json(updatedBooking);
    } else {
      res.status(404).json({ message: 'Booking not found' });
    }
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getBookingById = async (req: Request, res: Response): Promise<any> => {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: Number(req.params.id) },
      include: {
        table: {
          select: { tableNumber: true, size: true, basePricePerHour: true }
        },
        user: {
          select: { name: true, role: true, phone: true }
        },
        equipment: true
      }
    });
    
    if (booking) {
      if (booking.userId !== (req as AuthRequest).user.id && (req as AuthRequest).user.role !== 'admin' && (req as AuthRequest).user.role !== 'superadmin') {
        return res.status(403).json({ message: 'Not authorized to view this booking' });
      }
      res.json(booking);
    } else {
      res.status(404).json({ message: 'Booking not found' });
    }
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const cancelBooking = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: Number(req.params.id) }
    });

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    if (booking.userId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to cancel this booking' });
    }

    const now = new Date();
    const startTime = new Date(booking.startTime);
    const diffMins = (startTime.getTime() - now.getTime()) / (1000 * 60);

    if (diffMins <= 30) {
      return res.status(400).json({ message: 'Cannot cancel booking less than 30 minutes before start time' });
    }

    const updatedBooking = await prisma.booking.update({
      where: { id: booking.id },
      data: { status: 'cancelled' }
    });

    emitTableUpdate();
    res.json(updatedBooking);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const parseSmartBooking = async (req: AuthRequest, res: Response): Promise<any> => {
  const { text } = req.body;
  
  if (!text) return res.status(400).json({ message: 'Text input is required' });

  try {
    const input = text.toLowerCase();
    
    // IST timezone logic
    const IST_OFFSET = 5.5 * 60 * 60 * 1000;
    const nowUTC = new Date();
    const nowIST = new Date(nowUTC.getTime() + IST_OFFSET);
    
    // Language detection
    const hinglishKeywords = ['aaj', 'kal', 'parso', 'baje', 'ghante', 'ghanta', 'raat', 'rat', 'sham', 'subah', 'dopahar', 'liye', 'ko'];
    const isHinglish = hinglishKeywords.some(kw => input.includes(kw));

    const formatTimeIST = (date: Date) => {
      return date.toLocaleString('en-US', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' });
    };

    let durationHours = 2; // Default 2 hours
    
    // Parse duration (English & Hinglish)
    const durationMatch = input.match(/(\d+)\s*(hour|hr|ghante|ghanta|min|minute)/);
    if (durationMatch) {
      const val = parseInt(durationMatch[1]);
      if (durationMatch[2].startsWith('min')) {
        durationHours = val / 60;
      } else {
        durationHours = val;
      }
    }

    // Parse table number
    let requestedTableNumber = null;
    const tableMatch = input.match(/table\s*(\d+)/i);
    if (tableMatch) {
      requestedTableNumber = tableMatch[1];
    }

    // Base Date in IST
    const baseDateIST = new Date(nowIST.getTime());
    if (input.includes('tomorrow') || input.includes('kal')) {
      baseDateIST.setUTCDate(baseDateIST.getUTCDate() + 1);
    } else if (input.includes('day after tomorrow') || input.includes('parso')) {
      baseDateIST.setUTCDate(baseDateIST.getUTCDate() + 2);
    }

    // Parse time
    let hours = nowIST.getUTCHours() + 1; // Default next hour
    let minutes = 0;

    const timeMatch = input.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm|baje)?/);
    if (timeMatch) {
      hours = parseInt(timeMatch[1]);
      minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
      const period = timeMatch[3] || '';

      const isPM = period === 'pm' || input.includes('raat') || input.includes('rat') || input.includes('sham') || input.includes('dopahar');
      const isAM = period === 'am' || input.includes('subah');

      if (isPM && hours < 12) hours += 12;
      if (isAM && hours === 12) hours = 0;
    } else if (input.includes('tonight') || input.includes('aaj raat') || input.includes('aaj rat')) {
      hours = 20; // Default 8 PM
    }

    // Construct precise IST Date
    const y = baseDateIST.getUTCFullYear();
    const m = String(baseDateIST.getUTCMonth() + 1).padStart(2, '0');
    const d = String(baseDateIST.getUTCDate()).padStart(2, '0');
    let h = String(hours).padStart(2, '0');
    const minStr = String(minutes).padStart(2, '0');

    let targetDate = new Date(`${y}-${m}-${d}T${h}:${minStr}:00+05:30`);

    // If target date is in the past, adjust to next valid time
    if (targetDate < new Date() && !input.includes('tomorrow') && !input.includes('kal')) {
      if (hours < 12 && !input.includes('am') && !input.includes('subah')) {
         hours += 12;
         h = String(hours).padStart(2, '0');
         targetDate = new Date(`${y}-${m}-${d}T${h}:${minStr}:00+05:30`);
      }
    }

    if (targetDate < new Date()) {
      return res.status(400).json({ 
        message: "Time is in the past. Try something like 'aaj raat 8 baje' or 'tomorrow at 9 PM'." 
      });
    }

    const endTargetDate = new Date(targetDate.getTime() + durationHours * 60 * 60 * 1000);

    // Fetch all tables and today's bookings for fast overlap checking
    const allTables = await prisma.poolTable.findMany({
      where: { status: 'active' },
      orderBy: { tableNumber: 'asc' }
    });

    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0,0,0,0);
    const endOfDay = new Date(targetDate);
    endOfDay.setDate(endOfDay.getDate() + 1); // Check next day too for late night bookings

    const relevantBookings = await prisma.booking.findMany({
      where: {
        startTime: { gte: startOfDay, lte: endOfDay },
        status: { in: ['confirmed', 'completed'] },
      }
    });

    const isSlotAvailable = (tableId: number, start: Date, end: Date) => {
      return !relevantBookings.some((booking: any) => {
        if (booking.tableId !== tableId) return false;
        const bStart = new Date(booking.startTime);
        const bEndWithBuffer = new Date(new Date(booking.endTime).getTime() + 15 * 60 * 1000); // 15 min buffer
        return (start < bEndWithBuffer && end > bStart);
      });
    };

    let availableTable = null;

    let tablesToCheck = allTables;
    if (requestedTableNumber) {
      const tNumString = requestedTableNumber.padStart(2, '0'); // '01', '02'
      tablesToCheck = allTables.filter(t => t.tableNumber === tNumString || t.tableNumber === requestedTableNumber);
      if (tablesToCheck.length === 0) {
        return res.status(404).json({ message: `Table ${requestedTableNumber} not found.` });
      }
    }

    // Check requested time
    for (const table of tablesToCheck) {
      if (isSlotAvailable(table.id, targetDate, endTargetDate)) {
        availableTable = table;
        break;
      }
    }

    // Smart Suggestion Logic if requested time is booked
    if (!availableTable) {
      // If user requested a specific table, find out exactly when it is booked until
      if (requestedTableNumber && tablesToCheck.length > 0) {
        const tableId = tablesToCheck[0].id;
        
        // Find the conflicting booking
        const conflictingBooking = relevantBookings.find((booking: any) => {
          if (booking.tableId !== tableId) return false;
          const bStart = new Date(booking.startTime);
          const bEndWithBuffer = new Date(new Date(booking.endTime).getTime() + 15 * 60 * 1000);
          return (targetDate < bEndWithBuffer && endTargetDate > bStart);
        });

        if (conflictingBooking) {
          const endTime = new Date(conflictingBooking.endTime);
          const timeStr = formatTimeIST(endTime);
          const msg = isHinglish 
            ? `Table ${tablesToCheck[0].tableNumber} pe already booking hai ${timeStr} baje tak. Aap uske baad book kar sakte hain!`
            : `Table ${tablesToCheck[0].tableNumber} is booked until ${timeStr}. You can book it after that!`;
          return res.status(400).json({ message: msg });
        }
      }

      let alternativeTable = null;
      let alternativeDate = null;
      
      // Look forward and backward (1, 2, 3 hours later, then 1, 2 hours earlier)
      const offsets = [1, 2, 3, 4, -1, -2]; 
      
      for (const offset of offsets) {
        const altStart = new Date(targetDate.getTime() + offset * 60 * 60 * 1000);
        if (altStart < new Date()) continue; // Don't suggest past time
        
        const altEnd = new Date(altStart.getTime() + durationHours * 60 * 60 * 1000);

        for (const table of allTables) {
          if (isSlotAvailable(table.id, altStart, altEnd)) {
            alternativeTable = table;
            alternativeDate = altStart;
            break;
          }
        }
        if (alternativeTable) break;
      }

      if (alternativeTable && alternativeDate) {
        const timeStr = formatTimeIST(alternativeDate);
        const msg = isHinglish
          ? `Us time par sabhi tables booked hain. Par Table ${alternativeTable.tableNumber}, ${timeStr} baje khali hai. Try writing: "Book at ${timeStr}"`
          : `All tables are booked at that time. But Table ${alternativeTable.tableNumber} is available at ${timeStr}. Try writing: "Book at ${timeStr}"`;
        return res.status(400).json({ message: msg });
      } else {
        const msg = isHinglish
          ? "Sorry, aaj ke liye sabhi tables full hain. Please try tomorrow!"
          : "Sorry, all tables are fully booked around that time. Please try another day!";
        return res.status(404).json({ message: msg });
      }
    }

    const baseAmount = calculatePrice(availableTable.basePricePerHour, targetDate, durationHours);
    const totalAmount = baseAmount + 10; // plus platform fee

    const successMsg = isHinglish
      ? `Mene aapke liye Table ${availableTable.tableNumber} dhundh liya hai.`
      : `I found Table ${availableTable.tableNumber} for you.`;

    res.json({
      message: successMsg,
      proposal: {
        tableId: availableTable.id,
        tableNumber: availableTable.tableNumber,
        startTime: targetDate,
        durationHours: durationHours,
        totalAmount: totalAmount
      }
    });

  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
