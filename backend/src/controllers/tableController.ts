import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { emitTableUpdate } from '../utils/socket';

export const getTables = async (req: Request, res: Response): Promise<void> => {
  try {
    const tables = await prisma.poolTable.findMany();
    res.json(tables);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getTablesWithAvailability = async (req: Request, res: Response): Promise<any> => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  const { time } = req.query;
  try {
    let tables;
    let existingBookings = [];

    const checkTime = time ? new Date(time as string) : new Date();
    const checkEndTime = time ? new Date(checkTime.getTime() + 60 * 60 * 1000) : new Date(checkTime.getTime() + 1000);

    const dayStart = new Date(checkTime);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(checkTime);
    dayEnd.setHours(23, 59, 59, 999);

    let waitlistCount = 0;
    let dayBookings: any[] = [];

    [tables, existingBookings, dayBookings, waitlistCount] = await Promise.all([
      prisma.poolTable.findMany(),
      prisma.booking.findMany({
        where: {
          status: 'confirmed',
          startTime: { lt: checkEndTime },
          endTime: { gt: checkTime }
        }
      }),
      prisma.booking.findMany({
        where: {
          status: { in: ['confirmed', 'completed'] },
          startTime: { lt: dayEnd },
          endTime: { gt: dayStart }
        },
        select: {
          id: true,
          tableId: true,
          startTime: true,
          endTime: true,
          status: true
        },
        orderBy: {
          startTime: 'asc'
        }
      }),
      req.query.summary === 'true' ? prisma.waitlistEntry.count({ where: { status: 'waiting' } }) : Promise.resolve(0)
    ]);

    const bookedTableIds = existingBookings.map((b: any) => b.tableId);

    const tablesWithAvailability = tables.map((table: any) => {
      let status = table.status;
      if (status !== 'maintenance' && bookedTableIds.includes(table.id)) {
        status = 'occupied';
      }
      const tableUpcoming = dayBookings.filter((b: any) => b.tableId === table.id);
      return { ...table, status, upcomingBookings: tableUpcoming };
    });

    if (req.query.summary === 'true') {
      const availableCount = tablesWithAvailability.filter((t: any) => t.status === 'active' || t.status === 'available').length;
      const occupiedCount = tablesWithAvailability.filter((t: any) => t.status === 'occupied').length;
      const maintenanceCount = tablesWithAvailability.filter((t: any) => t.status === 'maintenance' || t.status === 'maintenance_scheduled').length;
      const prices = tablesWithAvailability.map((t: any) => t.basePricePerHour || 0);

      const summary = {
        totalTables: tablesWithAvailability.length,
        availableCount,
        occupiedCount,
        maintenanceCount,
        waitlistCount,
        minPrice: prices.length > 0 ? Math.min(...prices) : 0,
        maxPrice: prices.length > 0 ? Math.max(...prices) : 0,
      };
      return res.json({ tables: tablesWithAvailability, summary });
    }

    res.json(tablesWithAvailability);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getTableById = async (req: Request, res: Response): Promise<void> => {
  try {
    const table = await prisma.poolTable.findUnique({ where: { id: Number(req.params.id) } });
    if (table) {
      res.json(table);
    } else {
      res.status(404).json({ message: 'Table not found' });
    }
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const createTable = async (req: Request, res: Response): Promise<any> => {
  const { tableNumber, size, basePricePerHour, positionX, positionY, rotation, color } = req.body as { tableNumber: string, size: string, basePricePerHour: number, positionX?: number, positionY?: number, rotation?: number, color?: string };
  try {
    const tableExists = await prisma.poolTable.findUnique({ where: { tableNumber: String(tableNumber) } });
    if (tableExists) {
      return res.status(400).json({ message: 'Table number already exists' });
    }
    const table = await prisma.poolTable.create({
      data: {
        tableNumber,
        size,
        basePricePerHour: Number(basePricePerHour),
        positionX: positionX ? Number(positionX) : 0,
        positionY: positionY ? Number(positionY) : 0,
        rotation: rotation ? Number(rotation) : 0,
        color: color || 'blue'
      }
    });
    emitTableUpdate();
    res.status(201).json(table);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updateTable = async (req: Request, res: Response): Promise<any> => {
  const { tableNumber, size, basePricePerHour, status, positionX, positionY, rotation, color } = req.body as { tableNumber?: string, size?: string, basePricePerHour?: number, status?: string, positionX?: number, positionY?: number, rotation?: number, color?: string };
  try {
    const tableId = Number(req.params.id);
    if (isNaN(tableId)) {
      res.status(400).json({ message: 'Invalid table ID' });
      return;
    }

    const table = await prisma.poolTable.findUnique({ where: { id: tableId } });
    if (table) {
      const updatedTable = await prisma.poolTable.update({
        where: { id: tableId },
        data: {
          tableNumber: tableNumber ? String(tableNumber) : table.tableNumber,
          size: size || table.size,
          basePricePerHour: basePricePerHour !== undefined ? Number(basePricePerHour) : table.basePricePerHour,
          status: status || table.status,
          color: color !== undefined ? color : table.color,
          positionX: positionX !== undefined ? Number(positionX) : table.positionX,
          positionY: positionY !== undefined ? Number(positionY) : table.positionY,
          rotation: rotation !== undefined ? Number(rotation) : table.rotation
        }
      });
      emitTableUpdate();
      res.json(updatedTable);
    } else {
      res.status(404).json({ message: 'Table not found' });
    }
  } catch (error: any) {
    console.error('Update Table Error:', error);
    res.status(500).json({ message: error.message });
  }
};

export const deleteTable = async (req: Request, res: Response): Promise<void> => {
  try {
    const table = await prisma.poolTable.findUnique({ where: { id: Number(req.params.id) } });
    if (table) {
      await prisma.poolTable.delete({ where: { id: Number(req.params.id) } });
      emitTableUpdate();
      res.json({ message: 'Table removed' });
    } else {
      res.status(404).json({ message: 'Table not found' });
    }
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const handleMaintenance = async (req: Request, res: Response): Promise<any> => {
  const { type } = req.body;
  try {
    const table = await prisma.poolTable.findUnique({ where: { id: Number(req.params.id) } });
    if (!table) return res.status(404).json({ message: 'Table not found' });

    if (type === 'active') {
      const updated = await prisma.poolTable.update({
        where: { id: table.id },
        data: { status: 'active' }
      });
      
      // Restore any halted bookings back to confirmed
      await prisma.booking.updateMany({
        where: {
          tableId: table.id,
          status: 'halted'
        },
        data: { status: 'confirmed' }
      });
      
      emitTableUpdate();
      return res.json(updated);
    }

    const now = new Date();

    if (type === 'emergency') {
      const updated = await prisma.poolTable.update({
        where: { id: table.id },
        data: { status: 'maintenance' }
      });
      
      // Halt all active and future confirmed bookings
      await prisma.booking.updateMany({
        where: {
          tableId: table.id,
          status: 'confirmed',
          endTime: { gt: now }
        },
        data: { status: 'halted' }
      });
      
      emitTableUpdate();
      return res.json(updated);
    }

    if (type === 'scheduled') {
      const futureBookings = await prisma.booking.findMany({
        where: {
          tableId: table.id,
          status: 'confirmed',
          endTime: { gt: now }
        }
      });

      const newStatus = futureBookings.length > 0 ? 'maintenance_scheduled' : 'maintenance';
      const updated = await prisma.poolTable.update({
        where: { id: table.id },
        data: { status: newStatus }
      });
      
      emitTableUpdate();
      return res.json(updated);
    }

    res.status(400).json({ message: 'Invalid maintenance type' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const bulkUpdateLayout = async (req: Request, res: Response): Promise<any> => {
  const { tables } = req.body as { tables: any[] };
  if (!Array.isArray(tables)) {
    return res.status(400).json({ message: 'Invalid tables array' });
  }

  try {
    const updatePromises = tables.map(t =>
      prisma.poolTable.update({
        where: { id: Number(t.id) },
        data: {
          positionX: Number(t.positionX),
          positionY: Number(t.positionY),
          rotation: Number(t.rotation),
          color: t.color || 'green',
          status: t.status || 'active',
          size: t.size || '9ft',
          basePricePerHour: Number(t.basePricePerHour || 200),
        }
      })
    );
    await prisma.$transaction(updatePromises);
    emitTableUpdate();
    res.json({ message: 'Layout updated successfully' });
  } catch (error: any) {
    console.error('Bulk Update Layout Error:', error);
    res.status(500).json({ message: error.message });
  }
};
