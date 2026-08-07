import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { AuthRequest } from '../middleware/authMiddleware';

export const createOrder = async (req: AuthRequest, res: Response): Promise<any> => {
  const { bookingId, items, totalAmount } = req.body;
  try {
    if (bookingId) {
      const booking = await prisma.booking.findUnique({ where: { id: Number(bookingId) } });
      if (!booking || booking.userId !== req.user.id) {
        return res.status(403).json({ message: 'Invalid booking ID' });
      }
    }

    const orderItemsData = items.map((item: any) => ({
      menuId: item.menuId,
      quantity: item.quantity,
      price: item.price
    }));

    const order = await prisma.order.create({
      data: {
        userId: req.user.id,
        bookingId: bookingId ? Number(bookingId) : null,
        totalAmount: Number(totalAmount),
        items: {
          create: orderItemsData
        }
      },
      include: {
        items: true
      }
    });

    res.status(201).json(order);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getBookingOrders = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const bookingId = Number(req.params.bookingId);
    const booking = await prisma.booking.findUnique({ where: { id: bookingId } });

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Verify ownership or admin privileges
    if (booking.userId !== req.user.id && req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({ message: 'Not authorized to view orders for this booking' });
    }

    const orders = await prisma.order.findMany({
      where: { bookingId },
      include: {
        items: {
          include: { menuItem: true }
        }
      }
    });
    res.json(orders);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getAllOrders = async (req: Request, res: Response): Promise<void> => {
  try {
    const orders = await prisma.order.findMany({
      include: {
        user: { select: { name: true } },
        booking: { select: { tableId: true } },
        items: {
          include: { menuItem: true }
        }
      }
    });
    res.json(orders);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updateOrderStatus = async (req: Request, res: Response): Promise<void> => {
  const { status, paymentStatus } = req.body;
  try {
    const order = await prisma.order.findUnique({ where: { id: Number(req.params.id) } });
    if (order) {
      const updatedOrder = await prisma.order.update({
        where: { id: Number(req.params.id) },
        data: {
          status: status || order.status,
          paymentStatus: paymentStatus || order.paymentStatus
        }
      });
      res.json(updatedOrder);
    } else {
      res.status(404).json({ message: 'Order not found' });
    }
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
