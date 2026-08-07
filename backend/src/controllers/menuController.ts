import { Request, Response } from 'express';
import prisma from '../utils/prisma';

export const getMenuItems = async (req: Request, res: Response): Promise<void> => {
  try {
    const items = await prisma.menuItem.findMany({ where: { isAvailable: true } });
    res.json(items);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const createMenuItem = async (req: Request, res: Response): Promise<void> => {
  const { name, price, category, image, description } = req.body;
  try {
    const item = await prisma.menuItem.create({
      data: {
        name,
        price: Number(price),
        category: category || 'Snack',
        image: image || '',
        description: description || ''
      }
    });
    res.status(201).json(item);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const seedMenu = async (req: Request, res: Response): Promise<any> => {
  const items = [
    { name: 'Neon Burger', price: 150, category: 'Snack', description: 'Double patty with secret neon sauce', image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500' },
    { name: 'Crispy Fries', price: 80, category: 'Snack', description: 'Sea salt and peri-peri seasoning', image: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=500' },
    { name: 'Electric Blue Soda', price: 60, category: 'Drink', description: 'Sparkling blueberry and lime', image: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=500' },
    { name: 'Cyber Coffee', price: 120, category: 'Drink', description: 'Cold brew with vanilla foam', image: 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=500' },
    { name: 'Club Sandwich', price: 180, category: 'Snack', description: 'Classic 3-layer club with chicken', image: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=500' }
  ];

  try {
    const existing = await prisma.menuItem.count();
    if (existing > 0) return res.json({ message: 'Menu already seeded' });
    
    await prisma.menuItem.createMany({ data: items });
    res.json({ message: 'Menu seeded successfully' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
