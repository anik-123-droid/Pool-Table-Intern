import { Request, Response } from 'express';
import prisma from '../utils/prisma';

export const getInventory = async (req: Request, res: Response): Promise<void> => {
  try {
    const inventory = await prisma.inventoryItem.findMany();
    res.json(inventory);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updateInventory = async (req: Request, res: Response): Promise<any> => {
  const { id } = req.params;
  const { quantity, minThreshold } = req.body;

  try {
    const item = await prisma.inventoryItem.findUnique({ where: { id: Number(id) } });
    if (!item) return res.status(404).json({ message: 'Item not found' });

    const updatedItem = await prisma.inventoryItem.update({
      where: { id: Number(id) },
      data: {
        quantity: quantity !== undefined ? Number(quantity) : item.quantity,
        minThreshold: minThreshold !== undefined ? Number(minThreshold) : item.minThreshold
      }
    });
    
    res.json(updatedItem);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const seedInventory = async (req: Request, res: Response): Promise<void> => {
  try {
    const count = await prisma.inventoryItem.count();
    if (count === 0) {
      await prisma.inventoryItem.createMany({
        data: [
          { name: 'Professional Cues', quantity: 20, minThreshold: 5, unit: 'pcs' },
          { name: 'Standard Chalks', quantity: 50, minThreshold: 10, unit: 'pcs' },
          { name: 'Premium Ball Sets', quantity: 15, minThreshold: 3, unit: 'sets' },
          { name: 'Table Brush', quantity: 5, minThreshold: 2, unit: 'pcs' },
        ]
      });
      res.json({ message: 'Inventory seeded' });
    } else {
      res.json({ message: 'Inventory already exists' });
    }
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
